#!/usr/bin/env node
/**
 * Social Metrics Collector — Agent Layer 1
 *
 * Collects engagement metrics from all social platforms and stores them
 * in the Supabase `social_metrics` table for trend analysis.
 *
 * Usage:  node scripts/agents/collect-social-metrics.mjs [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars (metrics come from whichever platforms are configured):
 *   BLUESKY_HANDLE
 *   META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ─── Load .env ─────────────────────────────────────────────────────────────
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || "littlechubbypress.bsky.social";
const GRAPH_API = "https://graph.facebook.com/v21.0";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Supabase insert helper ────────────────────────────────────────────────

async function insertMetric(row) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would insert: ${row.platform}/${row.metric_type}`, JSON.stringify(row.value).slice(0, 120));
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/social_metrics`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase insert failed (${res.status}): ${body}`);
  }
}

async function insertSnapshot(row) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Snapshot: ${row.platform}/${row.post_id.slice(0, 40)} — ${row.likes}L ${row.comments}C ${row.shares}S`);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/engagement_snapshots`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.text();
    console.log(`  ⚠️  Snapshot insert failed (${res.status}): ${body.slice(0, 100)}`);
  }
}

// ─── Bluesky collector (public API, no auth) ───────────────────────────────

async function collectBluesky() {
  console.log("\n🦋 Collecting Bluesky metrics...");

  try {
    // Profile stats
    const profileRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(BLUESKY_HANDLE)}`
    );
    if (!profileRes.ok) {
      console.log(`  ⚠️  Profile fetch failed: ${profileRes.status}`);
      return;
    }
    const profile = await profileRes.json();

    await insertMetric({
      platform: "bluesky",
      metric_type: "profile_stats",
      value: {
        followers: profile.followersCount || 0,
        following: profile.followsCount || 0,
        posts: profile.postsCount || 0,
      },
    });
    console.log(`  ✅ Profile: ${profile.followersCount} followers, ${profile.postsCount} posts`);

    // Recent posts engagement (last 50)
    const feedRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(BLUESKY_HANDLE)}&limit=50`
    );
    if (!feedRes.ok) {
      console.log(`  ⚠️  Feed fetch failed: ${feedRes.status}`);
      return;
    }
    const feedData = await feedRes.json();

    let totalLikes = 0, totalReposts = 0, totalReplies = 0;
    const postMetrics = [];

    for (const item of feedData.feed || []) {
      const post = item.post;
      const likes = post.likeCount || 0;
      const reposts = post.repostCount || 0;
      const replies = post.replyCount || 0;
      totalLikes += likes;
      totalReposts += reposts;
      totalReplies += replies;

      // Store per-post metrics for top performers
      postMetrics.push({
        uri: post.uri,
        text: post.record?.text?.slice(0, 100) || "",
        likes,
        reposts,
        replies,
        indexedAt: post.indexedAt,
      });
    }

    // Sort by total engagement and keep top 10
    postMetrics.sort((a, b) => (b.likes + b.reposts + b.replies) - (a.likes + a.reposts + a.replies));

    await insertMetric({
      platform: "bluesky",
      metric_type: "post_engagement",
      value: {
        posts_analyzed: feedData.feed?.length || 0,
        total_likes: totalLikes,
        total_reposts: totalReposts,
        total_replies: totalReplies,
        avg_engagement: feedData.feed?.length
          ? ((totalLikes + totalReposts + totalReplies) / feedData.feed.length).toFixed(1)
          : 0,
        top_posts: postMetrics.slice(0, 10),
      },
    });

    console.log(`  ✅ Engagement: ${totalLikes} likes, ${totalReposts} reposts, ${totalReplies} replies across ${feedData.feed?.length || 0} posts`);

    // Save per-post engagement snapshots for growth tracking
    let snapCount = 0;
    for (const item of feedData.feed || []) {
      const post = item.post;
      await insertSnapshot({
        platform: "bluesky",
        post_id: post.uri,
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        shares: post.repostCount || 0,
        followers: profile.followersCount || 0,
      });
      snapCount++;
    }
    console.log(`  📸 ${snapCount} engagement snapshots saved`);
  } catch (err) {
    console.error(`  ❌ Bluesky error: ${err.message}`);
  }
}

// ─── Facebook collector ────────────────────────────────────────────────────

async function collectFacebook() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) {
    console.log("\n📘 Facebook: skipped (no credentials)");
    return;
  }

  console.log("\n📘 Collecting Facebook metrics...");

  try {
    // Page-level stats
    const pageRes = await fetch(
      `${GRAPH_API}/${encodeURIComponent(pageId)}?fields=id,name,fan_count,followers_count&access_token=${encodeURIComponent(token)}`
    );
    if (!pageRes.ok) {
      const body = await pageRes.text();
      console.log(`  ⚠️  Page fetch failed: ${pageRes.status} — ${body.slice(0, 200)}`);
      return;
    }
    const page = await pageRes.json();

    await insertMetric({
      platform: "facebook",
      metric_type: "profile_stats",
      value: {
        page_name: page.name,
        fans: page.fan_count || 0,
        followers: page.followers_count || 0,
      },
    });
    console.log(`  ✅ Page: ${page.followers_count || 0} followers, ${page.fan_count || 0} fans`);

    // Recent posts engagement
    const postsRes = await fetch(
      `${GRAPH_API}/${encodeURIComponent(pageId)}/published_posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=25&access_token=${encodeURIComponent(token)}`
    );
    if (!postsRes.ok) {
      console.log(`  ⚠️  Posts fetch failed: ${postsRes.status}`);
      return;
    }
    const postsData = await postsRes.json();
    const posts = postsData.data || [];

    let totalLikes = 0, totalComments = 0, totalShares = 0;
    const postMetrics = [];

    for (const post of posts) {
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      totalLikes += likes;
      totalComments += comments;
      totalShares += shares;

      postMetrics.push({
        id: post.id,
        text: (post.message || "").slice(0, 100),
        likes,
        comments,
        shares,
        created_time: post.created_time,
      });
    }

    postMetrics.sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares));

    await insertMetric({
      platform: "facebook",
      metric_type: "post_engagement",
      value: {
        posts_analyzed: posts.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        avg_engagement: posts.length
          ? ((totalLikes + totalComments + totalShares) / posts.length).toFixed(1)
          : 0,
        top_posts: postMetrics.slice(0, 10),
      },
    });

    console.log(`  ✅ Engagement: ${totalLikes} likes, ${totalComments} comments, ${totalShares} shares across ${posts.length} posts`);

    // Save per-post engagement snapshots
    let snapCount = 0;
    for (const post of posts) {
      await insertSnapshot({
        platform: "facebook",
        post_id: post.id,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
        followers: page.followers_count || 0,
      });
      snapCount++;
    }
    console.log(`  📸 ${snapCount} engagement snapshots saved`);
  } catch (err) {
    console.error(`  ❌ Facebook error: ${err.message}`);
  }
}

// ─── Instagram collector ───────────────────────────────────────────────────

async function collectInstagram() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igUserId = process.env.META_IG_USER_ID;
  if (!token || !igUserId) {
    console.log("\n📸 Instagram: skipped (no credentials)");
    return;
  }

  console.log("\n📸 Collecting Instagram metrics...");

  try {
    // Profile stats
    const profileRes = await fetch(
      `${GRAPH_API}/${encodeURIComponent(igUserId)}?fields=id,username,followers_count,media_count&access_token=${encodeURIComponent(token)}`
    );
    if (!profileRes.ok) {
      console.log(`  ⚠️  Profile fetch failed: ${profileRes.status}`);
      return;
    }
    const profile = await profileRes.json();

    await insertMetric({
      platform: "instagram",
      metric_type: "profile_stats",
      value: {
        username: profile.username,
        followers: profile.followers_count || 0,
        media_count: profile.media_count || 0,
      },
    });
    console.log(`  ✅ Profile: ${profile.followers_count || 0} followers, ${profile.media_count || 0} media`);

    // Recent media engagement
    const mediaRes = await fetch(
      `${GRAPH_API}/${encodeURIComponent(igUserId)}/media?fields=id,caption,timestamp,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}`
    );
    if (!mediaRes.ok) {
      console.log(`  ⚠️  Media fetch failed: ${mediaRes.status}`);
      return;
    }
    const mediaData = await mediaRes.json();
    const media = mediaData.data || [];

    let totalLikes = 0, totalComments = 0;
    const mediaMetrics = [];

    for (const item of media) {
      const likes = item.like_count || 0;
      const comments = item.comments_count || 0;
      totalLikes += likes;
      totalComments += comments;

      mediaMetrics.push({
        id: item.id,
        text: (item.caption || "").slice(0, 100),
        likes,
        comments,
        timestamp: item.timestamp,
      });
    }

    mediaMetrics.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));

    await insertMetric({
      platform: "instagram",
      metric_type: "post_engagement",
      value: {
        posts_analyzed: media.length,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_engagement: media.length
          ? ((totalLikes + totalComments) / media.length).toFixed(1)
          : 0,
        top_posts: mediaMetrics.slice(0, 10),
      },
    });

    console.log(`  ✅ Engagement: ${totalLikes} likes, ${totalComments} comments across ${media.length} media`);

    // Save per-post engagement snapshots
    let snapCount = 0;
    for (const item of media) {
      await insertSnapshot({
        platform: "instagram",
        post_id: item.id,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        shares: 0,
        followers: profile.followers_count || 0,
      });
      snapCount++;
    }
    console.log(`  📸 ${snapCount} engagement snapshots saved`);
  } catch (err) {
    console.error(`  ❌ Instagram error: ${err.message}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🤖 Agent: Social Metrics Collector");
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  await collectBluesky();
  await collectFacebook();
  await collectInstagram();

  console.log("\n✨ Social metrics collection complete.\n");
}

main().catch((err) => {
  console.error(`\n❌ Fatal: ${err.message}\n`);
  process.exit(1);
});
