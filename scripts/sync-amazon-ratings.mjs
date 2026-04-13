#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// sync-amazon-ratings.mjs — Fetch Amazon ratings via DataForSEO ASIN API
// and update src/data/books.ts with live ratingValue / ratingCount.
//
// Usage:
//   node scripts/sync-amazon-ratings.mjs              # update books.ts
//   node scripts/sync-amazon-ratings.mjs --dry-run    # preview only
//
// Env vars (from .env or environment):
//   DATAFORSEO_LOGIN      — DataForSEO account email
//   DATAFORSEO_PASSWORD   — DataForSEO API password
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

// ─── Load .env ──────────────────────────────────────────────────────────────
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ─── Config ─────────────────────────────────────────────────────────────────
const DFS_LOGIN = process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD;
const DRY_RUN = process.argv.includes("--dry-run");
const BOOKS_PATH = resolve(ROOT, "src/data/books.ts");

const API_BASE = "https://api.dataforseo.com/v3";
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const MAX_POLL_ATTEMPTS = 30;    // 5 minutes max wait

if (!DFS_LOGIN || !DFS_PASSWORD) {
  console.error("❌ DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required.");
  console.error("   Set them in .env or as environment variables.");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${DFS_LOGIN}:${DFS_PASSWORD}`).toString("base64");

// ─── Extract ASINs from books.ts ────────────────────────────────────────────
const extractAsins = () => {
  const src = readFileSync(BOOKS_PATH, "utf-8");
  const asins = [];
  const re = /id:\s*"([^"]+)"[\s\S]*?amazonUrl:\s*"https:\/\/www\.amazon\.com\/dp\/([A-Z0-9]{10})"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    asins.push({ bookId: m[1], asin: m[2] });
  }
  return asins;
};

// ─── DataForSEO API helpers ─────────────────────────────────────────────────
const apiPost = async (endpoint, body) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${endpoint} → ${res.status} ${res.statusText}`);
  return res.json();
};

const apiGet = async (endpoint) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`API GET ${endpoint} → ${res.status} ${res.statusText}`);
  return res.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Post tasks ─────────────────────────────────────────────────────────────
const postAsinTasks = async (asins) => {
  const tasks = asins.map(({ asin, bookId }) => ({
    asin,
    location_code: 2840,        // United States
    language_code: "en_US",
    priority: 2,                // priority queue (~1 min)
    tag: bookId,
  }));

  console.log(`📡 Posting ${tasks.length} ASIN tasks to DataForSEO (priority queue)...`);
  const data = await apiPost("/merchant/amazon/asin/task_post", tasks);

  if (data.status_code !== 20000) {
    throw new Error(`Task post failed: ${data.status_message}`);
  }

  const taskIds = data.tasks
    .filter((t) => t.status_code === 20100)
    .map((t) => ({ id: t.id, tag: t.data?.tag }));

  console.log(`   ✅ ${taskIds.length}/${tasks.length} tasks accepted (cost: $${data.cost?.toFixed(4) ?? "?"})`);
  return taskIds;
};

// ─── Poll for results ───────────────────────────────────────────────────────
const pollResults = async (taskIds) => {
  const results = new Map(); // bookId → { ratingValue, ratingCount }
  const pending = new Set(taskIds.map((t) => t.id));
  const tagById = Object.fromEntries(taskIds.map((t) => [t.id, t.tag]));

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS && pending.size > 0; attempt++) {
    console.log(`   ⏳ Poll ${attempt}/${MAX_POLL_ATTEMPTS} — ${pending.size} tasks pending...`);

    for (const taskId of [...pending]) {
      try {
        const data = await apiGet(`/merchant/amazon/asin/task_get/advanced/${taskId}`);
        const task = data.tasks?.[0];
        if (!task) continue;

        const code = task.status_code;
        const bookId = tagById[taskId];

        // Still processing (40601 = Task Handed, 40602 = In Queue)
        if (code === 40601 || code === 40602 || code === 20100) continue;

        // Completed successfully
        if (code === 20000 && task.result) {
          pending.delete(taskId);
          const item = task.result?.[0]?.items?.[0];

          if (DRY_RUN && item) {
            console.log(`   🔍 ${bookId} rating data:`, JSON.stringify(item.rating ?? "none"));
          }

          if (item?.rating) {
            const value = parseFloat(item.rating.value);
            const count = item.rating.votes_count ?? 0;
            if (!isNaN(value) && count > 0) {
              results.set(bookId, {
                ratingValue: Math.round(value * 10) / 10,
                ratingCount: count,
              });
              console.log(`   📖 ${bookId}: ⭐ ${value} (${count} reviews)`);
            } else {
              console.log(`   📖 ${bookId}: no reviews yet`);
            }
          } else {
            console.log(`   📖 ${bookId}: no rating data`);
          }
          continue;
        }

        // Actual error
        if (code >= 40000) {
          pending.delete(taskId);
          console.log(`   ⚠️  ${bookId}: task error ${code} — ${task.status_message}`);
        }
      } catch (err) {
        // Network hiccup, retry on next poll
      }
    }

    if (pending.size > 0) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  if (pending.size > 0) {
    console.warn(`   ⚠️  ${pending.size} tasks timed out`);
  }

  return results;
};

// ─── Update books.ts ────────────────────────────────────────────────────────
const updateBooksFile = (ratings) => {
  let src = readFileSync(BOOKS_PATH, "utf-8");
  let updated = 0;

  for (const [bookId, { ratingValue, ratingCount }] of ratings) {
    // Pattern: find the book block by its id, then update or insert ratingValue/ratingCount
    // We look for the `pages: <number>` line of each book as anchor point
    const bookBlockRe = new RegExp(
      `(id:\\s*"${bookId}"[\\s\\S]*?)(pages:\\s*\\d+)(,?\\s*\\n)(\\s*ratingValue:\\s*[\\d.]+,\\s*\\n\\s*ratingCount:\\s*\\d+)?`,
    );

    const match = src.match(bookBlockRe);
    if (!match) {
      console.warn(`   ⚠️  Could not find book block for "${bookId}" in books.ts`);
      continue;
    }

    const pagesLine = match[2];
    const trailingComma = match[3];
    const existingRating = match[4] || "";

    const newRatingBlock = `,\n    ratingValue: ${ratingValue},\n    ratingCount: ${ratingCount}`;

    if (existingRating) {
      // Replace existing rating lines
      src = src.replace(
        match[0],
        `${match[1]}${pagesLine}${newRatingBlock}\n`
      );
    } else {
      // Insert rating after pages line
      src = src.replace(
        match[0],
        `${match[1]}${pagesLine}${newRatingBlock}\n`
      );
    }
    updated++;
  }

  return { src, updated };
};

// ─── Main ───────────────────────────────────────────────────────────────────
const run = async () => {
  console.log("🔄 Amazon Rating Sync via DataForSEO\n");

  const asins = extractAsins();
  console.log(`📚 Found ${asins.length} books in books.ts:`);
  for (const { bookId, asin } of asins) {
    console.log(`   • ${bookId} → ${asin}`);
  }
  console.log();

  const taskIds = await postAsinTasks(asins);
  if (!taskIds.length) {
    console.error("❌ No tasks were accepted. Check your DataForSEO credentials.");
    process.exit(1);
  }

  console.log("\n⏳ Waiting for results (priority queue — typically ~1 min)...\n");
  const ratings = await pollResults(taskIds);

  console.log(`\n📊 Results: ${ratings.size}/${asins.length} books have ratings\n`);

  if (ratings.size === 0) {
    console.log("ℹ️  No ratings found — books.ts unchanged.");
    return;
  }

  if (DRY_RUN) {
    console.log("🏁 DRY RUN — would update books.ts with:");
    for (const [bookId, { ratingValue, ratingCount }] of ratings) {
      console.log(`   ${bookId}: ratingValue=${ratingValue}, ratingCount=${ratingCount}`);
    }
    return;
  }

  const { src, updated } = updateBooksFile(ratings);
  writeFileSync(BOOKS_PATH, src, "utf-8");
  console.log(`✅ Updated ${updated} book(s) in books.ts`);
};

run().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
