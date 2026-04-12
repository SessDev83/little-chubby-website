#!/usr/bin/env node
/**
 * Check Vercel Analytics & Speed Insights status.
 * Usage: node scripts/enable-vercel-analytics.mjs
 *
 * Note: Enabling/disabling these features must be done in the Vercel Dashboard.
 * The REST API does not expose a public endpoint for toggling them.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ─── Find the Vercel CLI auth token ────────────────────────────────────────
function findToken() {
  const home = homedir();
  const candidates = [
    join(home, "AppData", "Roaming", "com.vercel.cli", "Data", "auth.json"),
    join(home, "AppData", "Roaming", "com.vercel.cli", "auth.json"),
    join(home, "AppData", "Local", "com.vercel.cli", "auth.json"),
    join(home, ".local", "share", "com.vercel.cli", "auth.json"),
    join(home, ".config", "com.vercel.cli", "auth.json"),
    join(home, ".vercel", "auth.json"),
  ];

  for (const p of candidates) {
    try {
      const data = JSON.parse(readFileSync(p, "utf-8"));
      if (data.token) return data.token;
    } catch {}
  }

  return process.env.VERCEL_TOKEN || null;
}

// ─── Read project config ───────────────────────────────────────────────────
const projectConfig = JSON.parse(readFileSync(".vercel/project.json", "utf-8"));
const projectId = projectConfig.projectId;
const teamId = projectConfig.orgId;

const token = findToken();
if (!token) {
  console.log("No Vercel auth token found.");
  console.log("Enable features in the dashboard:");
  console.log("  Analytics:      https://vercel.com/sessdev83s-projects/little-chubby-website/analytics");
  console.log("  Speed Insights: https://vercel.com/sessdev83s-projects/little-chubby-website/speed-insights");
  process.exit(1);
}

// ─── Check status ──────────────────────────────────────────────────────────
const res = await fetch(
  `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
if (!res.ok) {
  console.error(`API error: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const project = await res.json();
const wa = project.webAnalytics?.enabledAt;
const si = project.speedInsights?.enabledAt;

console.log(`Project: ${project.name}`);
console.log(`Web Analytics:  ${wa ? "ENABLED (since " + new Date(wa).toISOString() + ")" : "DISABLED"}`);
console.log(`Speed Insights: ${si ? "ENABLED (since " + new Date(si).toISOString() + ")" : "DISABLED"}`);

if (!wa || !si) {
  console.log("\nTo enable missing features, visit the Vercel Dashboard:");
  if (!wa) console.log("  https://vercel.com/sessdev83s-projects/little-chubby-website/analytics");
  if (!si) console.log("  https://vercel.com/sessdev83s-projects/little-chubby-website/speed-insights");
  process.exit(1);
}

console.log("\nAll analytics features are active.");
