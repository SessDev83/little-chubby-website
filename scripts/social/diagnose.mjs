#!/usr/bin/env node

/**
 * Social Media Diagnostics — Little Chubby Press
 *
 * Checks the health of the Facebook and Instagram posting pipeline:
 *   1. Validates that required environment variables are set
 *   2. Tests whether the Meta access token is still valid (not expired)
 *   3. Fetches recent posts from the Facebook Page and Instagram account
 *   4. Highlights posts made today and flags missing / failed posts
 *   5. Prints a plain-language summary with actionable next steps
 *
 * Usage:
 *   node scripts/social/diagnose.mjs
 *   node scripts/social/diagnose.mjs --since 2026-04-10   # check from a specific date
 *   node scripts/social/diagnose.mjs --limit 20           # check the last N posts (default: 15)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTokenStatus, getPagePosts, getIGMedia } from "./platforms/meta.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ─── Load .env ────────────────────────────────────────────────────────────────

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

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { since: null, limit: 15 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--since" && args[i + 1]) opts.since = args[++i];
    if (args[i] === "--limit" && args[i + 1]) opts.limit = parseInt(args[++i], 10);
  }
  return opts;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isToday(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function isAfter(isoString, sinceDate) {
  if (!sinceDate) return true;
  return new Date(isoString) >= new Date(sinceDate);
}

function truncate(str, len = 120) {
  if (!str) return "(no caption)";
  const s = str.replace(/\n/g, " ").trim();
  return s.length > len ? s.slice(0, len) + "…" : s;
}

function hr(char = "─", width = 60) {
  return char.repeat(width);
}

// ─── Section printers ────────────────────────────────────────────────────────

function printSection(title) {
  console.log(`\n${hr("═")}`);
  console.log(`  ${title}`);
  console.log(hr("═"));
}

function printSubSection(title) {
  console.log(`\n${hr()}  `);
  console.log(`  ${title}`);
  console.log(hr());
}

// ─── Check environment variables ─────────────────────────────────────────────

function checkEnvVars() {
  printSection("1️⃣  ENVIRONMENT VARIABLES");

  const vars = {
    META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_IG_USER_ID: process.env.META_IG_USER_ID,
  };

  let allSet = true;
  for (const [key, val] of Object.entries(vars)) {
    if (val) {
      const masked = val.slice(0, 6) + "..." + val.slice(-4);
      console.log(`  ✅ ${key} = ${masked}`);
    } else {
      console.log(`  ❌ ${key} — NOT SET`);
      allSet = false;
    }
  }

  if (!allSet) {
    console.log(
      "\n  ⚠️  One or more required variables are missing.\n" +
      "     Add them to your repository secrets at:\n" +
      "     https://github.com/SessDev83/little-chubby-website/settings/secrets/actions"
    );
  }

  return allSet;
}

// ─── Token validity check ────────────────────────────────────────────────────

async function checkToken() {
  printSection("2️⃣  META ACCESS TOKEN STATUS");

  const status = await checkTokenStatus();

  if (status.valid) {
    console.log(`  ✅ Token is VALID`);
    if (status.pageName) console.log(`  📄 Page: ${status.pageName} (ID: ${status.pageId})`);
    return true;
  }

  console.log(`  ❌ Token is INVALID`);
  if (status.isExpired) {
    console.log(`  🕐 Expired at: ${status.expiredAt || "unknown"}`);
    console.log(`\n  HOW TO FIX THE EXPIRED TOKEN:`);
    console.log(`  ─────────────────────────────────────────────────────────`);
    console.log(`  Step 1 — Get a new short-lived User Access Token:`);
    console.log(`           https://developers.facebook.com/tools/explorer/`);
    console.log(`           Required permissions:`);
    console.log(`             • pages_manage_posts`);
    console.log(`             • pages_read_engagement`);
    console.log(`             • instagram_basic`);
    console.log(`             • instagram_content_publish`);
    console.log(`\n  Step 2 — Exchange for a long-lived token (60 days):`);
    console.log(`           GET https://graph.facebook.com/v21.0/oauth/access_token`);
    console.log(`             ?grant_type=fb_exchange_token`);
    console.log(`             &client_id=YOUR_APP_ID`);
    console.log(`             &client_secret=YOUR_APP_SECRET`);
    console.log(`             &fb_exchange_token=SHORT_LIVED_TOKEN`);
    console.log(`\n  Step 3 — Get the Page Access Token from the long-lived token:`);
    console.log(`           GET https://graph.facebook.com/v21.0/me/accounts`);
    console.log(`             ?access_token=LONG_LIVED_USER_TOKEN`);
    console.log(`\n  Step 4 — Update your GitHub secret:`);
    console.log(`           https://github.com/SessDev83/little-chubby-website/settings/secrets/actions`);
    console.log(`           Secret name: META_PAGE_ACCESS_TOKEN`);
  } else {
    console.log(`  ℹ️  Error: ${status.error}`);
  }

  return false;
}

// ─── Facebook posts ───────────────────────────────────────────────────────────

async function checkFacebookPosts(opts) {
  printSection("3️⃣  FACEBOOK — RECENT POSTS");

  if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_PAGE_ID) {
    console.log("  ⏭️  Skipped — credentials not set");
    return;
  }

  let posts;
  try {
    const result = await getPagePosts(opts.limit);
    posts = result.data || [];
  } catch (err) {
    console.log(`  ❌ Could not fetch posts: ${err.message}`);
    return;
  }

  if (posts.length === 0) {
    console.log("  ⚠️  No published posts found on this page.");
    return;
  }

  // Filter to --since date if provided
  const filtered = opts.since
    ? posts.filter((p) => isAfter(p.created_time, opts.since))
    : posts;

  const todayPosts = filtered.filter((p) => isToday(p.created_time));

  console.log(`\n  Found ${filtered.length} post(s) in range. Today: ${todayPosts.length}\n`);

  printSubSection("Today's posts");
  if (todayPosts.length === 0) {
    console.log("  ❌ No posts found on Facebook for today.");
    console.log("     Check the workflow run logs above for details.");
  } else {
    for (const p of todayPosts) {
      console.log(`  ✅ [${formatDate(p.created_time)}]`);
      console.log(`     ID: ${p.id}`);
      if (p.permalink_url) console.log(`     URL: ${p.permalink_url}`);
      console.log(`     "${truncate(p.message || p.story)}"`);
      console.log();
    }
  }

  if (filtered.length > todayPosts.length) {
    printSubSection(`Recent posts (last ${filtered.length})`);
    for (const p of filtered) {
      const marker = isToday(p.created_time) ? "📅" : "   ";
      console.log(`  ${marker} [${formatDate(p.created_time)}] "${truncate(p.message || p.story)}"`);
    }
  }
}

// ─── Instagram posts ──────────────────────────────────────────────────────────

async function checkInstagramPosts(opts) {
  printSection("4️⃣  INSTAGRAM — RECENT MEDIA");

  if (!process.env.META_PAGE_ACCESS_TOKEN || !process.env.META_IG_USER_ID) {
    console.log("  ⏭️  Skipped — META_IG_USER_ID not set");
    return;
  }

  let media;
  try {
    const result = await getIGMedia(opts.limit);
    media = result.data || [];
  } catch (err) {
    console.log(`  ❌ Could not fetch Instagram media: ${err.message}`);
    return;
  }

  if (media.length === 0) {
    console.log("  ⚠️  No media found on this Instagram account.");
    return;
  }

  const filtered = opts.since
    ? media.filter((m) => isAfter(m.timestamp, opts.since))
    : media;

  const todayMedia = filtered.filter((m) => isToday(m.timestamp));

  console.log(`\n  Found ${filtered.length} item(s) in range. Today: ${todayMedia.length}\n`);

  printSubSection("Today's posts");
  if (todayMedia.length === 0) {
    console.log("  ❌ No posts found on Instagram for today.");
    console.log("     Check the workflow run logs above for details.");
  } else {
    for (const m of todayMedia) {
      console.log(`  ✅ [${formatDate(m.timestamp)}]`);
      console.log(`     ID: ${m.id}  Type: ${m.media_type || "—"}`);
      if (m.permalink) console.log(`     URL: ${m.permalink}`);
      console.log(`     "${truncate(m.caption)}"`);
      console.log();
    }
  }

  if (filtered.length > todayMedia.length) {
    printSubSection(`Recent media (last ${filtered.length})`);
    for (const m of filtered) {
      const marker = isToday(m.timestamp) ? "📅" : "   ";
      console.log(`  ${marker} [${formatDate(m.timestamp)}] "${truncate(m.caption)}"`);
    }
  }
}

// ─── Workflow run summary ─────────────────────────────────────────────────────

function printWorkflowNote() {
  printSection("5️⃣  NOTES & NEXT STEPS");
  console.log(`
  Today's scheduled posts summary (UTC dates):
  ─────────────────────────────────────────────────────────────────────
  • 10:00 AM ET slot (14:00 UTC):  CANCELLED — Claude AI API was overloaded
    The AI generation retried twice but the 15-minute job timeout was reached
    before it could succeed. No post was published during this slot.

  • 4:00 PM ET slot (20:00 UTC):   PARTIAL — Bluesky ✅  Facebook ❌  Instagram ❌
    The Meta access token expired on April 12, 2026. Both Facebook and Instagram
    posts were rejected with:
      "Error validating access token: Session has expired on Sunday, 12-Apr-26"

  Action required:
  1. Renew the META_PAGE_ACCESS_TOKEN (see Section 2 above for exact steps).
  2. Update the secret at:
     https://github.com/SessDev83/little-chubby-website/settings/secrets/actions
  3. Re-run today's missed posts manually via:
     https://github.com/SessDev83/little-chubby-website/actions/workflows/social-post.yml
     → Click "Run workflow" → choose type and language → Run

  Useful links:
  • GitHub Secrets:  https://github.com/SessDev83/little-chubby-website/settings/secrets/actions
  • FB Token Tool:   https://developers.facebook.com/tools/explorer/
  • Meta Graph API:  https://developers.facebook.com/docs/graph-api/reference/page/published_posts/
`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  console.log("\n🔍 Little Chubby Press — Social Media Diagnostics");
  console.log(`   Running at: ${new Date().toUTCString()}`);
  console.log(`   Checking last ${opts.limit} posts${opts.since ? ` since ${opts.since}` : " (no date filter)"}`);

  const envsOk = checkEnvVars();
  if (!envsOk) {
    printWorkflowNote();
    process.exit(1);
  }

  const tokenOk = await checkToken();

  if (tokenOk) {
    await checkFacebookPosts(opts);
    await checkInstagramPosts(opts);
  } else {
    console.log(
      "\n  ⏭️  Skipping Facebook / Instagram post checks (token is invalid)."
    );
  }

  printWorkflowNote();

  if (!tokenOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});
