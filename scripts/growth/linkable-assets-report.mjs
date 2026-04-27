#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeLinkableAssetPerformance, formatPercent } from "../../src/lib/linkable-assets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const envPath = resolve(ROOT, ".env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAYS = Math.max(1, parseInt(argValue("--days", "30"), 10) || 30);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sinceIso = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

async function query(table, params) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} query failed (${response.status}): ${body}`);
  }
  return response.json();
}

async function fetchAll(table, select) {
  const rows = [];
  let offset = 0;
  while (true) {
    const page = await query(table, `${select}&created_at=gte.${sinceIso}&order=created_at.desc&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

const [pageviews, events] = await Promise.all([
  fetchAll("pageviews", "select=path,referrer,visitor_hash,utm_source,utm_medium,created_at"),
  fetchAll("conversion_events", "select=event_name,path,visitor_hash,props,created_at"),
]);

const summaries = summarizeLinkableAssetPerformance(pageviews, events);

console.log("Linkable Asset Pilot Report");
console.log(`Window: last ${DAYS} days`);
console.log(`Rows: ${pageviews.length} pageviews, ${events.length} conversion events`);
console.log("");

for (const asset of summaries) {
  console.log(`${asset.title} (${asset.id})`);
  console.log(`  Routes: ${asset.routes.join(", ")}`);
  console.log(`  PV: ${asset.pageviews} | UV: ${asset.uniqueVisitors} | organic/referral: ${asset.qualifiedPageviews} (${formatPercent(asset.qualifiedShare)})`);
  console.log(`  Actions: ${asset.actionEvents} (${formatPercent(asset.actionRate)}) | downloads: ${asset.downloads} | leads: ${asset.leads} | book intent: ${asset.bookIntent} | amazon: ${asset.amazonClicks}`);
  if (asset.referralHosts.length) {
    console.log(`  Top organic/referral hosts: ${asset.referralHosts.map((host) => `${host.host}:${host.count}`).join(", ")}`);
  }
  console.log(`  Guardrail: ${asset.outreachGuardrails[0]}`);
  console.log("");
}