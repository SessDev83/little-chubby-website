#!/usr/bin/env node

/**
 * One-off script to fetch and optionally edit the last post on Facebook.
 * Instagram does not support post editing via the Graph API.
 * Bluesky does not support post editing — must delete + re-post.
 *
 * Usage:
 *   node scripts/social/fix-last-post.mjs              # Preview latest post
 *   node scripts/social/fix-last-post.mjs --fix         # Apply correction to Facebook
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPagePosts } from "./platforms/meta.mjs";
import { getIGMedia } from "./platforms/meta.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// Load .env
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

const GRAPH_API = "https://graph.facebook.com/v21.0";
const doFix = process.argv.includes("--fix");

async function editFacebookPost(postId, newMessage) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Missing META_PAGE_ACCESS_TOKEN");

  const params = new URLSearchParams({
    message: newMessage,
    access_token: token,
  });

  const res = await fetch(`${GRAPH_API}/${encodeURIComponent(postId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook edit failed (${res.status}): ${body}`);
  }
  return res.json();
}

function fixMessage(original) {
  // For this specific post, do a precise replacement
  let fixed = original;

  // The specific sentence from the published post
  fixed = fixed.replace(
    "Write a book review with a photo, get 5 Peanuts. Then spend them on free coloring page downloads (just 1 Peanut each!), extra lottery tickets, or fun profile badges.",
    "Write a book review with a photo, get 5 🎟️ Tickets for the monthly giveaway! Then spend your Peanuts on free coloring page downloads (just 1 Peanut each!), extra lottery tickets, or fun profile badges."
  );

  // Generic fallbacks for other patterns
  fixed = fixed.replace(/Submit a book review\s*=\s*\+5 Peanuts/gi,
    "Submit a book review = +5 🎟️ Tickets for the giveaway");
  fixed = fixed.replace(/review\s*=\s*\+5 Peanuts/gi,
    "review = +5 🎟️ Tickets for the giveaway");
  fixed = fixed.replace(/get 5 Peanuts/gi, "get 5 🎟️ Tickets for the monthly giveaway");

  // ES patterns
  fixed = fixed.replace(/(?:Subir|Sube) una rese[ñn]a\s*=\s*\+5 Peanuts/gi,
    "Sube una reseña = +5 🎟️ boletos para el sorteo");
  fixed = fixed.replace(/gana(?:s|r)?\s*5 Peanuts/gi,
    "gana 5 🎟️ boletos para el sorteo");

  return fixed;
}

async function main() {
  console.log("🔍 Fetching latest Facebook posts...\n");

  try {
    const result = await getPagePosts(3);
    if (!result.data || result.data.length === 0) {
      console.log("No posts found.");
      return;
    }

    for (const post of result.data) {
      const msg = post.message || "(no text)";
      const needsFix = /5 Peanuts/i.test(msg) && /review|reseña|resena/i.test(msg);

      console.log(`📝 Post ID: ${post.id}`);
      console.log(`📅 Date: ${post.created_time}`);
      console.log(`🔗 ${post.permalink_url || "no permalink"}`);
      console.log(`📄 Message:\n${msg}\n`);

      if (needsFix) {
        const fixed = fixMessage(msg);
        console.log("⚠️  THIS POST NEEDS FIXING!");
        console.log(`✏️  Fixed message:\n${fixed}\n`);

        if (doFix) {
          console.log("🔧 Applying fix...");
          const editResult = await editFacebookPost(post.id, fixed);
          console.log("✅ Facebook post updated!", editResult);
        } else {
          console.log("💡 Run with --fix to apply the correction.\n");
        }
      } else {
        console.log("✅ This post looks correct.\n");
      }
      console.log("─".repeat(60));
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  // Also check Instagram
  console.log("\n\n📸 Checking Instagram...\n");
  try {
    const igResult = await getIGMedia(3);
    if (!igResult.data || igResult.data.length === 0) {
      console.log("No Instagram posts found.");
    } else {
      for (const media of igResult.data) {
        const caption = media.caption || "(no caption)";
        const needsFix = /5 Peanuts/i.test(caption) && /review|rese/i.test(caption);
        console.log(`📝 Media ID: ${media.id}`);
        console.log(`📅 Date: ${media.timestamp}`);
        console.log(`📄 Caption: ${caption.substring(0, 200)}\n`);
        if (needsFix) {
          console.log("⚠️  THIS POST HAS INCORRECT INFO! Instagram does not support API editing.");
          console.log("   👉 Please edit manually in the Instagram app.\n");
        } else {
          console.log("✅ This post looks correct.\n");
        }
        console.log("─".repeat(60));
      }
    }
  } catch (err) {
    console.error("❌ Instagram Error:", err.message);
  }
}

main();
