#!/usr/bin/env node

/**
 * Catch-up batch poster — publishes missed posts to Facebook + Instagram
 * with a configurable delay between each post.
 *
 * Usage:
 *   node scripts/social/catch-up-batch.mjs
 *
 * Posts are published only to facebook and instagram (bluesky already has them).
 * Each post is spaced 30 minutes apart to avoid flooding.
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POST_SCRIPT = resolve(__dirname, "post.mjs");

const DELAY_MS = 30 * 60 * 1000; // 30 minutes

// Missed posts from the last 2 days (Apr 13–15) that didn't reach FB/IG
const QUEUE = [
  { type: "book-promo",    lang: "en", label: "Mon 13 AM — book-promo (EN)" },
  { type: "community",     lang: "es", label: "Mon 13 PM — community (ES)" },
  { type: "parenting-tip", lang: "en", label: "Tue 14 AM — parenting-tip (EN)" },
  { type: "engagement",    lang: "en", label: "Tue 14 PM — engagement (EN)" },
  { type: "blog-share",    lang: "es", label: "Wed 15 AM — blog-share (ES)" },
  { type: "fun-fact",      lang: "en", label: "Wed 15 PM — fun-fact (EN)" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function timestamp() {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

async function main() {
  console.log(`\n🚀 Catch-up Batch Poster — ${QUEUE.length} posts queued`);
  console.log(`   Delay between posts: ${DELAY_MS / 60000} minutes`);
  console.log(`   Platforms: facebook, instagram (bluesky skipped — already posted)\n`);

  for (let i = 0; i < QUEUE.length; i++) {
    const { type, lang, label } = QUEUE[i];
    const num = i + 1;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  [${num}/${QUEUE.length}] ${label}`);
    console.log(`  Started: ${timestamp()}`);
    console.log("═".repeat(60));

    // Post to Facebook
    try {
      console.log(`\n  📘 Posting to Facebook...`);
      execSync(
        `node "${POST_SCRIPT}" post --platform facebook --type ${type} --lang ${lang}`,
        { stdio: "inherit", timeout: 5 * 60 * 1000 }
      );
    } catch (err) {
      console.error(`  ❌ Facebook failed: ${err.message}`);
    }

    // Post to Instagram (separate run so different content/image can be generated)
    try {
      console.log(`\n  📸 Posting to Instagram...`);
      execSync(
        `node "${POST_SCRIPT}" post --platform instagram --type ${type} --lang ${lang}`,
        { stdio: "inherit", timeout: 5 * 60 * 1000 }
      );
    } catch (err) {
      console.error(`  ❌ Instagram failed: ${err.message}`);
    }

    console.log(`\n  ✅ Post ${num}/${QUEUE.length} complete at ${timestamp()}`);

    // Wait before next post (skip wait after last one)
    if (i < QUEUE.length - 1) {
      const nextTime = new Date(Date.now() + DELAY_MS).toLocaleString("en-US", {
        timeZone: "America/New_York",
        timeStyle: "medium",
      });
      console.log(`\n  ⏳ Waiting 30 minutes... Next post at ~${nextTime}`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  🎉 All ${QUEUE.length} catch-up posts published!`);
  console.log(`  Finished: ${timestamp()}`);
  console.log("═".repeat(60) + "\n");
}

main().catch((err) => {
  console.error(`\n❌ Batch failed: ${err.message}\n`);
  process.exit(1);
});
