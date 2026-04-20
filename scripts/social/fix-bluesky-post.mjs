#!/usr/bin/env node

/**
 * One-off: check recent Bluesky posts for incorrect economy info and delete+repost if needed.
 * Bluesky has no edit API — the only option is delete + re-post.
 *
 * Usage:
 *   node scripts/social/fix-bluesky-post.mjs              # Preview
 *   node scripts/social/fix-bluesky-post.mjs --fix         # Delete wrong post + re-post corrected
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// Load .env
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const SERVICE = "https://bsky.social";
const handle = process.env.BLUESKY_HANDLE;
const password = process.env.BLUESKY_PASSWORD;
const doFix = process.argv.includes("--fix");

async function auth() {
  const res = await fetch(`${SERVICE}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${await res.text()}`);
  return res.json();
}

async function getAuthorFeed(session, limit = 5) {
  const url = `${SERVICE}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(session.did)}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessJwt}` },
  });
  if (!res.ok) throw new Error(`Feed failed: ${await res.text()}`);
  return res.json();
}

async function deletePost(session, uri) {
  // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
  const parts = uri.split("/");
  const rkey = parts[parts.length - 1];
  const repo = session.did;

  const res = await fetch(`${SERVICE}/xrpc/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo,
      collection: "app.bsky.feed.post",
      rkey,
    }),
  });
  if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
  return true;
}

function fixText(original) {
  let fixed = original;
  fixed = fixed.replace(
    "Write a book review with a photo, get 5 Peanuts.",
    "Write a book review with a photo, get 5 Tickets for the monthly giveaway!"
  );
  fixed = fixed.replace(/review\s*=\s*\+5 Peanuts/gi, "review = +5 Tickets for the giveaway");
  fixed = fixed.replace(/get 5 Peanuts/gi, "get 5 Tickets for the monthly giveaway");
  fixed = fixed.replace(/\+5 Peanuts/gi, "+5 Tickets");
  // ES
  fixed = fixed.replace(/(?:Subir|Sube) una rese[ñn]a\s*=\s*\+5 Peanuts/gi, "Sube una reseña = +5 boletos para el sorteo");
  fixed = fixed.replace(/gana(?:s|r)?\s*5 Peanuts/gi, "gana 5 boletos para el sorteo");
  return fixed;
}

async function main() {
  console.log("Fetching Bluesky feed...\n");
  const session = await auth();
  const feed = await getAuthorFeed(session, 5);

  const posts = feed.feed || [];
  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  for (const item of posts) {
    const post = item.post;
    const text = post.record?.text || "";
    const needsFix = /5 Peanuts/i.test(text) && /review|rese/i.test(text);

    console.log(`URI: ${post.uri}`);
    console.log(`Date: ${post.record?.createdAt}`);
    console.log(`Text: ${text.substring(0, 200)}`);

    if (needsFix) {
      const fixed = fixText(text);
      console.log("\n⚠️  NEEDS FIX!");
      console.log(`Fixed text: ${fixed.substring(0, 200)}`);

      if (doFix) {
        console.log("Deleting old post...");
        await deletePost(session, post.uri);
        console.log("Old post deleted.");

        // Re-post with corrected text using the postToBluesky function
        const { postToBluesky } = await import("./platforms/bluesky.mjs");
        const result = await postToBluesky(fixed);
        console.log("New post created!", result.uri);
      } else {
        console.log("Run with --fix to delete and re-post.\n");
      }
    } else {
      console.log("✅ OK\n");
    }
    console.log("---");
  }
}

main().catch((e) => console.error("Error:", e.message));
