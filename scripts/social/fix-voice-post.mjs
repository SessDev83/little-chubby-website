#!/usr/bin/env node

/**
 * One-off: fix the voice + accuracy issues in the latest Facebook share-earn post.
 * Run without args to preview, with --fix to apply.
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

const GRAPH_API = "https://graph.facebook.com/v21.0";
const token = process.env.META_PAGE_ACCESS_TOKEN;
const pageId = process.env.META_PAGE_ID;
const doFix = process.argv.includes("--fix");

// The corrected post text — fixes both voice and accuracy
const CORRECTED_TEXT = `Here's how our free rewards system works 🥜

It's like a treasure hunt for parents! We built two ways to earn on our site:

Share a gallery review link or coloring page link with friends → earn 1 Peanut per share. Then use Peanuts to download free coloring pages (just 1 Peanut each!), buy extra lottery tickets, or unlock fun profile badges.

Submit a book review with photos → earn 5 🎟️ Tickets for the monthly giveaway. We give away free books every month!

The more you spread the word, the more free stuff you unlock.

https://www.littlechubbypress.com/en/peanuts

#PeanutsRewards #ColoringFun #FreeColoring #LittleChubbyPress`;

async function getLatestPost() {
  const params = new URLSearchParams({
    fields: "id,message,created_time,permalink_url",
    limit: "3",
    access_token: token,
  });
  const res = await fetch(`${GRAPH_API}/${encodeURIComponent(pageId)}/published_posts?${params}`);
  if (!res.ok) throw new Error(`Fetch failed: ${await res.text()}`);
  return res.json();
}

async function editPost(postId, newMessage) {
  const params = new URLSearchParams({ message: newMessage, access_token: token });
  const res = await fetch(`${GRAPH_API}/${encodeURIComponent(postId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Edit failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("Fetching latest Facebook posts...\n");
  const result = await getLatestPost();

  for (const post of result.data) {
    const msg = post.message || "";
    // Find the share-earn post by content
    const isTarget = msg.includes("treasure hunt") && msg.includes("Peanut");
    
    console.log(`Post ID: ${post.id}`);
    console.log(`Date: ${post.created_time}`);
    console.log(`Link: ${post.permalink_url}`);
    console.log(`Match: ${isTarget ? "TARGET" : "skip"}`);
    console.log(`Text: ${msg.substring(0, 100)}...`);
    console.log("---");

    if (isTarget) {
      console.log("\nCURRENT text:");
      console.log(msg);
      console.log("\nCORRECTED text:");
      console.log(CORRECTED_TEXT);

      if (doFix) {
        console.log("\nApplying fix...");
        const r = await editPost(post.id, CORRECTED_TEXT);
        console.log("Done!", r);
      } else {
        console.log("\nRun with --fix to apply.");
      }
    }
  }
}

main().catch(e => console.error("Error:", e.message));
