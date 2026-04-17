#!/usr/bin/env node
/**
 * Daily Analytics Email Report
 * Queries yesterday's pageview data from Supabase, fetches social media
 * stats from Bluesky (public API), and sends a summary email via Resend.
 *
 * Usage:  node scripts/daily-analytics-email.mjs [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *   ANALYTICS_EMAIL (recipient)
 *
 * Optional env vars (for social media stats):
 *   BLUESKY_HANDLE (e.g. "littlechubbypress.bsky.social")
 *   META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID
 */

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || "littlechubbypress.bsky.social";
const SITE_URL = "https://www.littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!RESEND_API_KEY && !DRY_RUN) {
  console.error("Missing RESEND_API_KEY (use --dry-run to preview)");
  process.exit(1);
}

// ─── Date helpers ──────────────────────────────────────────────────────────
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  });
}

// ─── Query Supabase ────────────────────────────────────────────────────────
async function query(table, selectParams) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${selectParams}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    },
  });
  const count = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
  const data = await res.json();
  return { data, count };
}

async function fetchAnalytics(date) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const range = `created_at=gte.${dayStart}&created_at=lte.${dayEnd}`;

  // Total pageviews
  const { count: totalPageviews } = await query(
    "pageviews",
    `select=id&${range}`
  );

  // All rows for aggregation
  const { data: rows } = await query(
    "pageviews",
    `select=path,referrer,visitor_hash,country&${range}&limit=10000`
  );

  // Unique visitors
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_hash)).size;

  // Top pages
  const pageCounts = {};
  for (const r of rows) {
    pageCounts[r.path] = (pageCounts[r.path] || 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top referrers
  const refCounts = {};
  for (const r of rows) {
    if (r.referrer) {
      let ref;
      try { ref = new URL(r.referrer).hostname; } catch { ref = r.referrer; }
      if (!ref.includes("littlechubbypress")) {
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      }
    }
  }
  const topReferrers = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top countries
  const countryCounts = {};
  for (const r of rows) {
    if (r.country) {
      countryCounts[r.country] = (countryCounts[r.country] || 0) + 1;
    }
  }
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { totalPageviews, uniqueVisitors, topPages, topReferrers, topCountries };
}

// ─── Week-over-week comparison ─────────────────────────────────────────────
async function fetchWeekAgoStats(date) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  const weekAgo = d.toISOString().slice(0, 10);
  const dayStart = `${weekAgo}T00:00:00.000Z`;
  const dayEnd = `${weekAgo}T23:59:59.999Z`;
  const range = `created_at=gte.${dayStart}&created_at=lte.${dayEnd}`;

  const { count: totalPageviews } = await query("pageviews", `select=id&${range}`);
  const { data: rows } = await query("pageviews", `select=visitor_hash&${range}&limit=10000`);
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_hash)).size;
  return { totalPageviews, uniqueVisitors };
}

function changeLabel(current, previous) {
  if (previous === 0) return current > 0 ? " 🟢 new!" : "";
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return ` 🟢 +${pct}%`;
  if (pct < 0) return ` 🔴 ${pct}%`;
  return " ➖ same";
}

// ─── UTM source breakdown ──────────────────────────────────────────────────
function parseUtmSources(rows) {
  const utmCounts = {};
  for (const r of rows) {
    if (!r.referrer) continue;
    try {
      const url = new URL(r.referrer);
      const source = url.searchParams.get("utm_source");
      const campaign = url.searchParams.get("utm_campaign");
      if (source) {
        const key = campaign ? `${source} / ${campaign}` : source;
        utmCounts[key] = (utmCounts[key] || 0) + 1;
      }
    } catch {}
  }
  return Object.entries(utmCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

// ─── User & Newsletter stats ───────────────────────────────────────────────
async function fetchUserStats(date) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const range = `created_at=gte.${dayStart}&created_at=lte.${dayEnd}`;

  // New registered users yesterday (via Supabase auth admin API)
  let newUsers = 0;
  let totalUsers = 0;
  try {
    // List users from auth.users via admin API
    const usersRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const users = usersData.users || usersData || [];
      totalUsers = users.length;
      for (const u of users) {
        const created = u.created_at?.slice(0, 10);
        if (created === date) newUsers++;
      }
    }
  } catch (e) {
    console.log(`  ⚠️  Auth users fetch error: ${e.message}`);
  }

  // Newsletter subscribers yesterday
  const { count: newSubs } = await query(
    "newsletter_subscribers",
    `select=id&${range}`
  );

  // Total newsletter subscribers
  const { count: totalSubs } = await query(
    "newsletter_subscribers",
    `select=id`
  );

  // Confirmed newsletter subscribers
  const { count: confirmedSubs } = await query(
    "newsletter_subscribers",
    `select=id&confirmed=eq.true`
  );

  return { newUsers, totalUsers, newSubs, totalSubs, confirmedSubs };
}

// ─── Social media stats (Bluesky public API, no auth needed) ───────────────
async function fetchBlueskyStats() {
  try {
    // Profile stats
    const profileRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${BLUESKY_HANDLE}`
    );
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    // Recent posts (last 20)
    const feedRes = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${BLUESKY_HANDLE}&limit=20`
    );
    const feedData = feedRes.ok ? await feedRes.json() : { feed: [] };

    // Calculate engagement from recent posts
    let totalLikes = 0, totalReposts = 0, totalReplies = 0, postsYesterday = 0;
    const yesterdayStr = yesterday();
    for (const item of feedData.feed || []) {
      const post = item.post;
      const postDate = post.indexedAt?.slice(0, 10);
      if (postDate === yesterdayStr) {
        postsYesterday++;
      }
      totalLikes += post.likeCount || 0;
      totalReposts += post.repostCount || 0;
      totalReplies += post.replyCount || 0;
    }

    return {
      followers: profile.followersCount || 0,
      following: profile.followsCount || 0,
      posts: profile.postsCount || 0,
      postsYesterday,
      recentLikes: totalLikes,
      recentReposts: totalReposts,
      recentReplies: totalReplies,
    };
  } catch (e) {
    console.log(`  ⚠️  Bluesky stats unavailable: ${e.message}`);
    return null;
  }
}

// ─── Meta (Facebook + Instagram) stats ─────────────────────────────────────
async function fetchMetaStats() {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igId = process.env.META_IG_USER_ID;
  if (!token || !pageId) return null;

  try {
    const GRAPH = "https://graph.facebook.com/v25.0";

    // Facebook Page stats
    const fbRes = await fetch(
      `${GRAPH}/${pageId}?fields=name,fan_count,followers_count&access_token=${token}`
    );
    if (!fbRes.ok) { console.log(`  ⚠️  Facebook API error: ${fbRes.status}`); return null; }
    const fb = await fbRes.json();

    // Recent Facebook posts engagement
    const fbPostsRes = await fetch(
      `${GRAPH}/${pageId}/posts?fields=created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${token}`
    );
    let fbPostsYesterday = 0, fbLikes = 0, fbComments = 0, fbShares = 0;
    if (fbPostsRes.ok) {
      const fbPosts = await fbPostsRes.json();
      const yesterdayStr = yesterday();
      for (const post of fbPosts.data || []) {
        if (post.created_time?.slice(0, 10) === yesterdayStr) fbPostsYesterday++;
        fbLikes += post.likes?.summary?.total_count || 0;
        fbComments += post.comments?.summary?.total_count || 0;
        fbShares += post.shares?.count || 0;
      }
    }

    // Instagram stats (optional)
    let ig = null;
    if (igId) {
      const igRes = await fetch(
        `${GRAPH}/${igId}?fields=username,followers_count,media_count&access_token=${token}`
      );
      if (igRes.ok) {
        const igData = await igRes.json();
        // Recent IG media engagement
        const igMediaRes = await fetch(
          `${GRAPH}/${igId}/media?fields=timestamp,like_count,comments_count&limit=10&access_token=${token}`
        );
        let igLikes = 0, igComments = 0, igPostsYesterday = 0;
        if (igMediaRes.ok) {
          const igMedia = await igMediaRes.json();
          const yesterdayStr = yesterday();
          for (const m of igMedia.data || []) {
            if (m.timestamp?.slice(0, 10) === yesterdayStr) igPostsYesterday++;
            igLikes += m.like_count || 0;
            igComments += m.comments_count || 0;
          }
        }
        ig = {
          username: igData.username,
          followers: igData.followers_count || 0,
          mediaCount: igData.media_count || 0,
          postsYesterday: igPostsYesterday,
          recentLikes: igLikes,
          recentComments: igComments,
        };
      }
    }

    return {
      facebook: {
        name: fb.name,
        followers: fb.followers_count || fb.fan_count || 0,
        postsYesterday: fbPostsYesterday,
        recentLikes: fbLikes,
        recentComments: fbComments,
        recentShares: fbShares,
      },
      instagram: ig,
    };
  } catch (e) {
    console.log(`  ⚠️  Meta stats unavailable: ${e.message}`);
    return null;
  }
}

// ─── Build email ───────────────────────────────────────────────────────────
function buildEmailHtml(date, stats, weekAgo, bluesky, utmSources, meta, userStats) {
  const fmtDate = formatDate(date);
  const tableRow = (label, value) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td>` +
    `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${value}</td></tr>`;

  const listRows = (entries) =>
    entries.length === 0
      ? `<tr><td style="padding:6px 12px;color:#999" colspan="2">No data yet</td></tr>`
      : entries
          .map(
            ([name, count]) =>
              `<tr><td style="padding:4px 12px;font-size:14px">${escapeHtml(name)}</td>` +
              `<td style="padding:4px 12px;text-align:right;font-size:14px">${count}</td></tr>`
          )
          .join("");

  const sectionHeader = (emoji, title) =>
    `<h3 style="font-size:15px;color:#6b4c3b;margin:16px 0 8px">${emoji} ${title}</h3>`;

  // Week-over-week labels
  const visitorChange = weekAgo ? changeLabel(stats.uniqueVisitors, weekAgo.uniqueVisitors) : "";
  const viewChange = weekAgo ? changeLabel(stats.totalPageviews, weekAgo.totalPageviews) : "";

  // Bluesky section
  let blueskySection = "";
  if (bluesky) {
    blueskySection = `
    ${sectionHeader("🦋", "Bluesky")}
    <table style="width:100%;border-collapse:collapse">
      ${tableRow("Followers", bluesky.followers)}
      ${tableRow("Posts Yesterday", bluesky.postsYesterday)}
      ${tableRow("Recent Likes (last 20 posts)", bluesky.recentLikes)}
      ${tableRow("Recent Reposts", bluesky.recentReposts)}
      ${tableRow("Recent Replies", bluesky.recentReplies)}
    </table>`;
  }

  // UTM sources section
  let utmSection = "";
  if (utmSources && utmSources.length > 0) {
    utmSection = `
    ${sectionHeader("🎯", "Traffic from Social Posts (UTM)")}
    <table style="width:100%;border-collapse:collapse">
      ${listRows(utmSources)}
    </table>`;
  }

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f7f3;padding:20px">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

  <div style="background:#6b4c3b;padding:20px 24px;color:#fff">
    <h1 style="margin:0;font-size:20px">📊 Daily Analytics</h1>
    <p style="margin:4px 0 0;opacity:.85;font-size:14px">${fmtDate}</p>
  </div>

  <div style="padding:20px 24px">
    ${sectionHeader("🌐", "Website")}
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${tableRow("👥 Unique Visitors", `${stats.uniqueVisitors}${visitorChange}`)}
      ${tableRow("📄 Page Views", `${stats.totalPageviews}${viewChange}`)}
    </table>

    ${userStats ? `
    ${sectionHeader("👤", "Users & Newsletter")}
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${tableRow("🆕 New Registrations", userStats.newUsers)}
      ${tableRow("👥 Total Registered Users", userStats.totalUsers)}
      ${tableRow("📬 New Newsletter Subs", userStats.newSubs)}
      ${tableRow("📧 Total Newsletter Subs", `${userStats.confirmedSubs} confirmed / ${userStats.totalSubs} total`)}
    </table>` : ""}

    ${sectionHeader("🏆", "Top Pages")}
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topPages)}
    </table>

    ${sectionHeader("🔗", "Top Referrers")}
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topReferrers)}
    </table>

    ${stats.topCountries.length > 0 ? `
    ${sectionHeader("🌍", "Countries / Regions")}
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topCountries)}
    </table>` : ""}

    ${utmSection}
    ${blueskySection}

    ${meta?.facebook ? `
    ${sectionHeader("📘", "Facebook — " + escapeHtml(meta.facebook.name))}
    <table style="width:100%;border-collapse:collapse">
      ${tableRow("Followers", meta.facebook.followers)}
      ${tableRow("Posts Yesterday", meta.facebook.postsYesterday)}
      ${tableRow("Recent Likes (last 10 posts)", meta.facebook.recentLikes)}
      ${tableRow("Recent Comments", meta.facebook.recentComments)}
      ${tableRow("Recent Shares", meta.facebook.recentShares)}
    </table>` : ""}

    ${meta?.instagram ? `
    ${sectionHeader("📷", "Instagram — @" + escapeHtml(meta.instagram.username))}
    <table style="width:100%;border-collapse:collapse">
      ${tableRow("Followers", meta.instagram.followers)}
      ${tableRow("Total Posts", meta.instagram.mediaCount)}
      ${tableRow("Posts Yesterday", meta.instagram.postsYesterday)}
      ${tableRow("Recent Likes (last 10 posts)", meta.instagram.recentLikes)}
      ${tableRow("Recent Comments", meta.instagram.recentComments)}
    </table>` : ""}

    <p style="text-align:center;margin:24px 0 8px">
      <a href="https://vercel.com/sessdev83s-projects/little-chubby-website/analytics"
         style="display:inline-block;background:#6b4c3b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">
        View Full Dashboard →
      </a>
    </p>
  </div>

  <div style="padding:12px 24px;background:#f6f1e7;text-align:center;font-size:12px;color:#999">
    Little Chubby Press · ${SITE_URL}
  </div>
</div>
</body></html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Send email via Resend ─────────────────────────────────────────────────
async function getSenderAddress() {
  // Check if littlechubbypress.com is verified on Resend
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    const data = await res.json();
    const domain = (data.data || []).find((d) => d.name === "littlechubbypress.com");
    if (domain && domain.status === "verified") {
      return "Little Chubby Press <analytics@littlechubbypress.com>";
    }
  } catch {}
  // Fallback to Resend's shared domain
  return "Little Chubby Press <onboarding@resend.dev>";
}

async function sendEmail(subject, html) {
  const from = await getSenderAddress();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [ANALYTICS_EMAIL],
      reply_to: ANALYTICS_EMAIL,
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:${ANALYTICS_EMAIL}?subject=unsubscribe>`,
        "X-Entity-Ref-ID": `analytics-${Date.now()}`,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  console.log(`✅ Email sent (id: ${data.id})`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
const date = yesterday();
console.log(`📊 Fetching analytics for ${date}...\n`);

const stats = await fetchAnalytics(date);

console.log(`  Unique visitors: ${stats.uniqueVisitors}`);
console.log(`  Page views:      ${stats.totalPageviews}`);
console.log(`  Top pages:       ${stats.topPages.length}`);
console.log(`  Referrers:       ${stats.topReferrers.length}`);
console.log(`  Countries:       ${stats.topCountries.length}`);

// Week-over-week comparison
console.log(`\n📈 Fetching week-ago comparison...`);
const weekAgo = await fetchWeekAgoStats(date);
console.log(`  Week ago:        ${weekAgo.uniqueVisitors} visitors, ${weekAgo.totalPageviews} views`);

// UTM source breakdown
const { data: allRows } = await query(
  "pageviews",
  `select=referrer&created_at=gte.${date}T00:00:00.000Z&created_at=lte.${date}T23:59:59.999Z&referrer=not.is.null&limit=10000`
);
const utmSources = parseUtmSources(allRows);
if (utmSources.length > 0) {
  console.log(`  UTM sources:     ${utmSources.length}`);
}

// Social media stats
console.log(`\n👤 Fetching user & newsletter stats...`);
const userStats = await fetchUserStats(date);
console.log(`  New users:       ${userStats.newUsers}`);
console.log(`  Total users:     ${userStats.totalUsers}`);
console.log(`  New newsletter:  ${userStats.newSubs}`);
console.log(`  Total newsletter: ${userStats.confirmedSubs} confirmed / ${userStats.totalSubs} total`);

console.log(`\n🦋 Fetching Bluesky stats...`);
const bluesky = await fetchBlueskyStats();
if (bluesky) {
  console.log(`  Followers:       ${bluesky.followers}`);
  console.log(`  Posts yesterday:  ${bluesky.postsYesterday}`);
  console.log(`  Recent likes:    ${bluesky.recentLikes}`);
}

console.log(`\n📘 Fetching Meta (Facebook/Instagram) stats...`);
const meta = await fetchMetaStats();
if (meta?.facebook) {
  console.log(`  FB Followers:    ${meta.facebook.followers}`);
  console.log(`  FB Posts yest:   ${meta.facebook.postsYesterday}`);
  console.log(`  FB Recent likes: ${meta.facebook.recentLikes}`);
}
if (meta?.instagram) {
  console.log(`  IG Followers:    ${meta.instagram.followers}`);
  console.log(`  IG Posts yest:   ${meta.instagram.postsYesterday}`);
  console.log(`  IG Recent likes: ${meta.instagram.recentLikes}`);
}

const subject = `📊 ${formatDate(date)} — ${stats.uniqueVisitors} visitors, ${stats.totalPageviews} views, ${userStats.newUsers} new users`;
const html = buildEmailHtml(date, stats, weekAgo, bluesky, utmSources, meta, userStats);

if (DRY_RUN) {
  console.log(`\n--- DRY RUN ---`);
  console.log(`To: ${ANALYTICS_EMAIL}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML length: ${html.length} chars`);
  console.log(`\nTop pages:`);
  for (const [page, count] of stats.topPages) {
    console.log(`  ${count.toString().padStart(4)}  ${page}`);
  }
  if (bluesky) {
    console.log(`\nBluesky: ${bluesky.followers} followers, ${bluesky.recentLikes} recent likes`);
  }
  // Save HTML preview to temp file
  const { writeFileSync } = await import("fs");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const previewPath = join(dirname(fileURLToPath(import.meta.url)), "..", "analytics-preview.html");
  writeFileSync(previewPath, html, "utf-8");
  console.log(`\n📄 HTML preview saved to: ${previewPath}`);
} else {
  await sendEmail(subject, html);
}
