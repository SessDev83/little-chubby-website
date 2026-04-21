#!/usr/bin/env node
/**
 * Gallery reciprocity — playbook §13.2
 *
 * Detects newly-approved real reviews (via `reviews_awaiting_thanks`
 * view, migration 030) and generates public thank-you copy ready for
 * an operator to post. Marks `thanked_at` to prevent re-processing.
 *
 * Dry-run by default — safe to run any time. Pass --post to mark rows.
 *
 * Usage:
 *   node scripts/social/gallery-reciprocity.mjs           # preview only
 *   node scripts/social/gallery-reciprocity.mjs --post    # mark as thanked
 *
 * Env:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
const SITE = "https://littlechubby.com";
const DRY_RUN = !process.argv.includes("--post");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function supabaseGET(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.error(`Supabase GET failed (${res.status}): ${await res.text()}`);
    return [];
  }
  return res.json();
}

async function supabasePATCH(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Supabase PATCH failed (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}

function buildThankYouCopy(review) {
  const name = (review.reviewer_name || "a new friend").split(" ")[0];
  const stars = "⭐".repeat(Math.max(1, Math.min(5, review.rating || 5)));
  const snippet = (review.review_text || "").slice(0, 120).replace(/\s+/g, " ").trim();
  const bookLink = `${SITE}/en/gallery?review=${review.id}`;

  return {
    bluesky: [
      `Huge thank-you to ${name} for the ${stars} review of our book!`,
      snippet ? `"${snippet}${review.review_text && review.review_text.length > 120 ? "…" : ""}"` : "",
      `Want to share yours? → ${bookLink}`,
    ].filter(Boolean).join("\n"),
    instagram_story: [
      `🥜 Thank you ${name}!`,
      `${stars}`,
      snippet ? `"${snippet}…"` : "Your review made our week",
      `Tap to see more → link in bio`,
    ].join("\n"),
    facebook: [
      `A little thank-you note 💛`,
      ``,
      `${name} just left us a ${stars} review — the kind of message that keeps two parents drawing coloring pages at midnight.`,
      snippet ? `\n"${snippet}${review.review_text && review.review_text.length > 120 ? "…" : ""}"\n` : "",
      `If our books are part of your family too, share a photo review at ${SITE}/en/gallery — we feature every single one 💛`,
    ].join("\n"),
  };
}

async function main() {
  console.log(`🎁 Gallery Reciprocity ${DRY_RUN ? "(DRY-RUN)" : "(MARKING AS THANKED)"}\n`);

  const queue = await supabaseGET("reviews_awaiting_thanks?select=*");
  if (!queue.length) {
    console.log("✨ No reviews awaiting a thank-you. Queue is empty.");
    return;
  }

  console.log(`Found ${queue.length} review(s) needing a thank-you.\n`);

  for (const review of queue) {
    const copy = buildThankYouCopy(review);
    const sep = "─".repeat(70);
    console.log(`\n${sep}`);
    console.log(`📝 Review ${review.id} — ${review.reviewer_name || "anonymous"} (${review.rating}⭐)`);
    console.log(`   Book: ${review.book_id} | Submitted: ${review.submitted_at?.slice(0, 10)}`);
    console.log(sep);
    console.log(`\n▶ BLUESKY\n${copy.bluesky}\n`);
    console.log(`▶ INSTAGRAM STORY\n${copy.instagram_story}\n`);
    console.log(`▶ FACEBOOK\n${copy.facebook}\n`);

    if (!DRY_RUN) {
      const ok = await supabasePATCH(`book_reviews?id=eq.${review.id}`, {
        thanked_at: new Date().toISOString(),
        thanked_channels: ["bluesky", "instagram", "facebook"],
      });
      console.log(ok ? `  ✅ Marked as thanked.` : `  ❌ Failed to mark.`);
    }
  }

  console.log(`\n${DRY_RUN ? "ℹ  Dry-run. Re-run with --post to mark reviews as thanked once you've published." : "✅ Done."}`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
