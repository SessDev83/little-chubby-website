#!/usr/bin/env node
/**
 * List all Pinterest boards and capture their IDs.
 *
 * Usage:
 *   node scripts/social/pinterest-list-boards.mjs
 *
 * Writes: scripts/social/.pinterest-boards.json
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ENV_PATH = resolve(ROOT, ".env");
const OUT_PATH = resolve(__dirname, ".pinterest-boards.json");

// ── Load .env ──────────────────────────────────────────
const envRaw = readFileSync(ENV_PATH, "utf-8");
for (const line of envRaw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  const v = t.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const token = process.env.PINTEREST_ACCESS_TOKEN;
if (!token || token.startsWith("pega")) {
  console.error("❌ PINTEREST_ACCESS_TOKEN missing or placeholder. Run pinterest-oauth.mjs first.");
  process.exit(1);
}

const API = "https://api.pinterest.com/v5";

async function listBoards() {
  const res = await fetch(`${API}/boards?page_size=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Pinterest API error (${res.status}): ${body}`);
  }
  return JSON.parse(body);
}

async function getUserAccount() {
  const res = await fetch(`${API}/user_account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Content-type → board matcher ────────────────────────
// Maps the existing social post types to the most appropriate board.
function matchBoard(boardName) {
  const n = boardName.toLowerCase();
  if (/free|printable|coloring page/.test(n)) return "free-coloring";
  if (/book|press|little chubby/.test(n))      return "book-promo";
  if (/tip|parent|guide/.test(n))              return "parenting-tip";
  if (/family|together|creative time|ideas/.test(n)) return "engagement";
  if (/screen.?free|activit/.test(n))          return "fun-fact";
  return null;
}

async function main() {
  const account = await getUserAccount();
  if (account) {
    console.log(`\n👤 Connected as: @${account.username} (${account.account_type})`);
    console.log(`   Name: ${account.business_name ?? account.first_name ?? ""}\n`);
  }

  const { items = [] } = await listBoards();
  if (items.length === 0) {
    console.log("⚠️  No boards found. Create some on Pinterest first.");
    process.exit(0);
  }

  console.log(`📋 Found ${items.length} board(s):\n`);

  const mapping = {};
  for (const b of items) {
    const matched = matchBoard(b.name);
    const tag = matched ? `  → ${matched}` : "  (no auto-match)";
    console.log(`   • ${b.name}`);
    console.log(`     id: ${b.id}  privacy: ${b.privacy}${tag}`);
    if (matched) mapping[matched] = { id: b.id, name: b.name };
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    username: account?.username ?? null,
    boards: items.map((b) => ({ id: b.id, name: b.name, privacy: b.privacy })),
    contentTypeMap: mapping,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✅ Saved to ${OUT_PATH.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);

  console.log("\n🧭 Content-type → board mapping:");
  const allTypes = [
    "free-coloring",
    "book-promo",
    "parenting-tip",
    "engagement",
    "fun-fact",
  ];
  for (const t of allTypes) {
    const m = mapping[t];
    console.log(`   ${t.padEnd(16)} → ${m ? m.name : "❌ NO MATCH — will need manual mapping"}`);
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
