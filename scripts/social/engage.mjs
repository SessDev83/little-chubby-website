#!/usr/bin/env node

/**
 * Social Media Engagement CLI — Little Chubby Press
 *
 * Usage:
 *   node scripts/social/engage.mjs <command> [options]
 *
 * Commands:
 *   monitor              Check for new comments on all platforms and reply
 *   outreach             Find + engage with buyer-persona posts on Bluesky
 *
 * Options:
 *   --platform <name>    bluesky | facebook | instagram | all (default: all)
 *   --lang <lang>        en | es (default: en) — for outreach search queries
 *   --dry-run            Preview actions without actually posting
 *   --limit <n>          Max outreach engagements per run (default: 8)
 *
 * Examples:
 *   node scripts/social/engage.mjs monitor --platform all --dry-run
 *   node scripts/social/engage.mjs outreach --lang en --dry-run
 *   node scripts/social/engage.mjs monitor --platform bluesky
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReply, generateOutreachComment, isSafeToEngage } from "./ai-generate.mjs";
import { getNotifications, replyToPost, likePost, searchPosts } from "./platforms/bluesky.mjs";
import {
  getPagePosts, getPostComments, replyToFBComment,
  getIGMedia, getIGComments, replyToIGComment,
} from "./platforms/meta.mjs";
import { getOutreachPriorities } from "../agents/smart-selector.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const STATE_PATH = resolve(__dirname, ".engage-state.json");

// ─── Load .env file ────────────────────────────────────────────────────────

const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── State management ──────────────────────────────────────────────────────

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return {
      repliedComments: [],  // IDs of comments we already replied to
      engagedPosts: [],     // URIs of Bluesky posts we already engaged with
      engagedUsers: {},     // { did: lastEngagedISO } — weekly cooldown tracking
    };
  }
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  } catch {
    return { repliedComments: [], engagedPosts: [], engagedUsers: {} };
  }
}

function saveState(state) {
  // Cap arrays to prevent unbounded growth
  if (state.repliedComments.length > 500) {
    state.repliedComments = state.repliedComments.slice(-500);
  }
  if (state.engagedPosts.length > 200) {
    state.engagedPosts = state.engagedPosts.slice(-200);
  }
  // Prune user cooldowns older than 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [did, ts] of Object.entries(state.engagedUsers)) {
    if (new Date(ts).getTime() < weekAgo) delete state.engagedUsers[did];
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Parse CLI args ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || "monitor";

  const opts = {
    command,
    platform: "all",
    lang: "en",
    dryRun: false,
    limit: 8,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--platform": opts.platform = args[++i]; break;
      case "--lang": opts.lang = args[++i]; break;
      case "--dry-run": opts.dryRun = true; break;
      case "--limit": opts.limit = parseInt(args[++i], 10) || 8; break;
    }
  }
  return opts;
}

// ─── Monitor: Bluesky ──────────────────────────────────────────────────────

async function monitorBluesky(state, dryRun) {
  if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_PASSWORD) {
    console.log("  ⏭️  Bluesky: skipped (no credentials)");
    return 0;
  }

  console.log("  🦋 Checking Bluesky notifications...");
  const { notifications, did } = await getNotifications();

  // Filter out already-replied and own posts
  const pending = notifications.filter(
    (n) => !state.repliedComments.includes(n.uri) && n.author?.did !== did
  );

  if (pending.length === 0) {
    console.log("     No new comments to reply to.");
    return 0;
  }

  console.log(`     Found ${pending.length} new comment(s) to reply to.`);
  let replied = 0;

  for (const notif of pending) {
    const commentText = notif.record?.text || "";
    if (!commentText.trim()) continue;

    // Get the parent post context
    const parentText = notif.record?.reply?.parent?.uri ? "(thread reply)" : "(direct mention)";

    try {
      const reply = await generateReply(commentText, parentText, "bluesky");
      if (!reply) {
        console.log(`     ⚠️  Could not generate reply for: "${commentText.slice(0, 60)}..."`);
        continue;
      }

      console.log(`     💬 @${notif.author?.handle}: "${commentText.slice(0, 50)}..."`);
      console.log(`        → "${reply}"`);

      if (!dryRun) {
        // Determine root and parent for the reply
        const root = notif.record?.reply?.root || { uri: notif.uri, cid: notif.cid };
        const parent = { uri: notif.uri, cid: notif.cid };
        await replyToPost(reply, parent, root);
        state.repliedComments.push(notif.uri);
        console.log("        ✅ Replied!");
      } else {
        console.log("        🏃 DRY RUN — would reply");
      }
      replied++;
    } catch (err) {
      console.log(`     ❌ Error replying: ${err.message}`);
    }
  }

  return replied;
}

// ─── Monitor: Facebook ─────────────────────────────────────────────────────

async function monitorFacebook(state, dryRun) {
  if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_PAGE_ID) {
    console.log("  ⏭️  Facebook: skipped (no credentials)");
    return 0;
  }

  console.log("  📘 Checking Facebook comments...");
  const pageId = process.env.META_PAGE_ID;

  const { data: posts } = await getPagePosts(10);
  if (!posts?.length) {
    console.log("     No recent posts found.");
    return 0;
  }

  let replied = 0;

  for (const post of posts) {
    let commentsData;
    try {
      commentsData = await getPostComments(post.id, 25);
    } catch (err) {
      console.log(`     ⚠️  Could not fetch comments for post ${post.id}: ${err.message}`);
      continue;
    }

    const comments = (commentsData?.data || []).filter(
      (c) => c.from?.id !== pageId && !state.repliedComments.includes(c.id)
    );

    for (const comment of comments) {
      const commentText = comment.message || "";
      if (!commentText.trim()) continue;

      try {
        const reply = await generateReply(commentText, post.message || "", "facebook");
        if (!reply) continue;

        console.log(`     💬 ${comment.from?.name || "User"}: "${commentText.slice(0, 50)}..."`);
        console.log(`        → "${reply}"`);

        if (!dryRun) {
          await replyToFBComment(comment.id, reply);
          state.repliedComments.push(comment.id);
          console.log("        ✅ Replied!");
        } else {
          console.log("        🏃 DRY RUN — would reply");
        }
        replied++;
      } catch (err) {
        console.log(`     ❌ Error replying to FB comment: ${err.message}`);
      }
    }
  }

  if (replied === 0) console.log("     No new comments to reply to.");
  return replied;
}

// ─── Monitor: Instagram ────────────────────────────────────────────────────

async function monitorInstagram(state, dryRun) {
  if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_IG_USER_ID) {
    console.log("  ⏭️  Instagram: skipped (no credentials)");
    return 0;
  }

  console.log("  📸 Checking Instagram comments...");

  const { data: media } = await getIGMedia(10);
  if (!media?.length) {
    console.log("     No recent media found.");
    return 0;
  }

  let replied = 0;

  for (const item of media) {
    let commentsData;
    try {
      commentsData = await getIGComments(item.id, 25);
    } catch (err) {
      console.log(`     ⚠️  Could not fetch comments for media ${item.id}: ${err.message}`);
      continue;
    }

    const comments = (commentsData?.data || []).filter(
      (c) => !state.repliedComments.includes(c.id)
    );

    for (const comment of comments) {
      const commentText = comment.text || "";
      if (!commentText.trim()) continue;

      try {
        const reply = await generateReply(commentText, item.caption || "", "instagram");
        if (!reply) continue;

        console.log(`     💬 @${comment.username}: "${commentText.slice(0, 50)}..."`);
        console.log(`        → "${reply}"`);

        if (!dryRun) {
          await replyToIGComment(comment.id, reply);
          state.repliedComments.push(comment.id);
          console.log("        ✅ Replied!");
        } else {
          console.log("        🏃 DRY RUN — would reply");
        }
        replied++;
      } catch (err) {
        console.log(`     ❌ Error replying to IG comment: ${err.message}`);
      }
    }
  }

  if (replied === 0) console.log("     No new comments to reply to.");
  return replied;
}

// ─── Monitor command ───────────────────────────────────────────────────────

async function runMonitor(opts) {
  console.log(`\n🔔 Monitoring comments (${opts.platform})...\n`);
  const state = loadState();
  const platforms = opts.platform === "all"
    ? ["bluesky", "facebook", "instagram"]
    : [opts.platform];

  let totalReplied = 0;

  for (const p of platforms) {
    try {
      switch (p) {
        case "bluesky":
          totalReplied += await monitorBluesky(state, opts.dryRun);
          break;
        case "facebook":
          totalReplied += await monitorFacebook(state, opts.dryRun);
          break;
        case "instagram":
          totalReplied += await monitorInstagram(state, opts.dryRun);
          break;
      }
    } catch (err) {
      console.error(`  ❌ ${p} monitor error: ${err.message}`);
    }
  }

  if (!opts.dryRun) saveState(state);
  console.log(`\n✨ Monitor complete — ${totalReplied} replies ${opts.dryRun ? "(dry run)" : "sent"}.\n`);
}

// ─── Outreach command (Bluesky only) ───────────────────────────────────────

const SEARCH_QUERIES_EN = [
  "coloring books kids",
  "kids activities crafts",
  "creative play children",
  "parenting crafts activities",
  "homeschool activities art",
  "screen free kids",
  "toddler art coloring",
];

const SEARCH_QUERIES_ES = [
  "libros para colorear ninos",
  "actividades para ninos manualidades",
  "juego creativo ninos",
  "actividades sin pantallas",
  "arte infantil colorear",
  "homeschool actividades",
];

async function runOutreach(opts) {
  if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_PASSWORD) {
    console.log("\n⏭️  Outreach: skipped (no Bluesky credentials)\n");
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\n⏭️  Outreach: skipped (no ANTHROPIC_API_KEY for AI comments)\n");
    return;
  }

  console.log(`\n🔍 Bluesky outreach (${opts.lang}, max ${opts.limit} engagements)...\n`);
  const state = loadState();
  const baseQueries = opts.lang === "es" ? SEARCH_QUERIES_ES : SEARCH_QUERIES_EN;

  // Inject AI-recommended outreach topics if available
  let queries = [...baseQueries];
  try {
    const priorities = await getOutreachPriorities();
    if (priorities.length > 0) {
      console.log(`  🧠 Smart outreach: injecting ${priorities.length} AI-recommended topic(s)`);
      for (const p of priorities) console.log(`     🎯 ${p}`);
      console.log();
      // Add priority topics at the front so they get picked first
      queries = [...priorities, ...baseQueries];
    }
  } catch { /* smart context unavailable, use defaults */ }

  // Pick 2-3 random queries to search
  const shuffled = [...queries].sort(() => Math.random() - 0.5);
  const selectedQueries = shuffled.slice(0, 3);

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  let engagements = 0;

  for (const query of selectedQueries) {
    if (engagements >= opts.limit) break;

    console.log(`  🔎 Searching: "${query}"...`);
    let results;
    try {
      results = await searchPosts(query, 15);
    } catch (err) {
      console.log(`     ⚠️  Search failed: ${err.message}`);
      continue;
    }

    const posts = (results?.posts || []).filter((p) => {
      // Skip our own posts
      if (p.author?.handle === process.env.BLUESKY_HANDLE) return false;
      // Skip already-engaged posts
      if (state.engagedPosts.includes(p.uri)) return false;
      // Skip posts older than 24h
      const indexedAt = new Date(p.indexedAt || p.record?.createdAt).getTime();
      if (indexedAt < oneDayAgo) return false;
      // Skip users we engaged with in the last week
      const authorDid = p.author?.did;
      if (authorDid && state.engagedUsers[authorDid]) {
        if (new Date(state.engagedUsers[authorDid]).getTime() > oneWeekAgo) return false;
      }
      return true;
    });

    console.log(`     Found ${posts.length} eligible post(s).`);

    for (const post of posts) {
      if (engagements >= opts.limit) break;

      const postText = post.record?.text || "";
      if (!postText.trim() || postText.length < 20) continue;

      // Safety check
      try {
        const safe = await isSafeToEngage(postText);
        if (!safe) {
          console.log(`     ⚠️  Skipped (safety filter): "${postText.slice(0, 50)}..."`);
          continue;
        }
      } catch {
        continue;
      }

      // Generate comment
      let comment;
      try {
        comment = await generateOutreachComment(postText);
        if (!comment) continue;
      } catch (err) {
        console.log(`     ⚠️  Comment generation failed: ${err.message}`);
        continue;
      }

      console.log(`     📝 @${post.author?.handle}: "${postText.slice(0, 50)}..."`);
      console.log(`        👍 Like + 💬 "${comment}"`);

      if (!opts.dryRun) {
        try {
          // Like the post
          await likePost({ uri: post.uri, cid: post.cid });
          // Reply to the post
          const root = { uri: post.uri, cid: post.cid };
          await replyToPost(comment, root, root);

          state.engagedPosts.push(post.uri);
          if (post.author?.did) {
            state.engagedUsers[post.author.did] = new Date().toISOString();
          }
          console.log("        ✅ Engaged!");
        } catch (err) {
          console.log(`        ❌ Engagement failed: ${err.message}`);
        }
      } else {
        console.log("        🏃 DRY RUN — would like + comment");
      }

      engagements++;
    }
  }

  if (!opts.dryRun) saveState(state);
  console.log(`\n✨ Outreach complete — ${engagements} engagements ${opts.dryRun ? "(dry run)" : "sent"}.\n`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  console.log(`\n🎨 Little Chubby Press — Social Engagement Tool\n`);

  switch (opts.command) {
    case "monitor":
      await runMonitor(opts);
      break;
    case "outreach":
      await runOutreach(opts);
      break;
    default:
      console.log(`Unknown command: "${opts.command}". Use "monitor" or "outreach".`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
