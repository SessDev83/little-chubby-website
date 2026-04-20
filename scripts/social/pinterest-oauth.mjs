#!/usr/bin/env node
/**
 * Pinterest OAuth flow — obtains an Access Token with write permissions.
 *
 * Flow:
 *   1. Starts a local HTTP server on port 8787
 *   2. Opens your browser to Pinterest's authorize page
 *   3. You click "Authorize" in Pinterest
 *   4. Pinterest redirects to http://localhost:8787/callback?code=...
 *   5. Script exchanges the code for an access_token + refresh_token
 *   6. Writes them to .env
 *
 * Requires in .env:
 *   PINTEREST_APP_ID
 *   PINTEREST_APP_SECRET
 *
 * Usage:
 *   node scripts/social/pinterest-oauth.mjs
 */

import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ENV_PATH = resolve(ROOT, ".env");

// ── Load .env ────────────────────────────────────────────
if (!existsSync(ENV_PATH)) {
  console.error("❌ .env file not found at:", ENV_PATH);
  process.exit(1);
}
const envRaw = readFileSync(ENV_PATH, "utf-8");
for (const line of envRaw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq).trim();
  const v = trimmed.slice(eq + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const APP_ID = process.env.PINTEREST_APP_ID;
const APP_SECRET = process.env.PINTEREST_APP_SECRET;

if (!APP_ID || !APP_SECRET) {
  console.error("❌ Missing PINTEREST_APP_ID or PINTEREST_APP_SECRET in .env");
  console.error("   Add these lines to your .env file first:");
  console.error("     PINTEREST_APP_ID=1563654");
  console.error("     PINTEREST_APP_SECRET=<your_secret>");
  process.exit(1);
}

// ── Config ───────────────────────────────────────────────
const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
  "user_accounts:read",
].join(",");
const STATE = crypto.randomBytes(16).toString("hex");

const AUTHORIZE_URL =
  `https://www.pinterest.com/oauth/?` +
  new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state: STATE,
  }).toString();

// ── Open browser (Windows / macOS / Linux) ───────────────
function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "win32" ? `start "" "${url}"` :
    platform === "darwin" ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd);
}

// ── Exchange code for token ──────────────────────────────
async function exchangeCodeForToken(code) {
  const basicAuth = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64");
  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }
  return JSON.parse(body);
}

// ── Write tokens to .env ─────────────────────────────────
function upsertEnvVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, `${key}=${value}`);
  // Append under a Pinterest header if not present
  const trimmed = content.endsWith("\n") ? content : content + "\n";
  return `${trimmed}${key}=${value}\n`;
}

function persistTokens({ access_token, refresh_token, expires_in, refresh_token_expires_in }) {
  let content = readFileSync(ENV_PATH, "utf-8");
  content = upsertEnvVar(content, "PINTEREST_ACCESS_TOKEN", access_token);
  if (refresh_token) {
    content = upsertEnvVar(content, "PINTEREST_REFRESH_TOKEN", refresh_token);
  }
  if (expires_in) {
    const expiresAt = Math.floor(Date.now() / 1000) + Number(expires_in);
    content = upsertEnvVar(content, "PINTEREST_ACCESS_TOKEN_EXPIRES_AT", String(expiresAt));
  }
  writeFileSync(ENV_PATH, content);
  console.log("✅ Tokens saved to .env");
  if (refresh_token_expires_in) {
    const days = Math.round(refresh_token_expires_in / 86400);
    console.log(`   Refresh token valid for ~${days} days`);
  }
}

// ── Server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>❌ Pinterest returned an error</h1><pre>${error}</pre>`);
    console.error("❌ Pinterest error:", error);
    server.close();
    process.exit(1);
  }

  if (!code || state !== STATE) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>❌ Invalid callback</h1>");
    console.error("❌ Invalid state or missing code");
    server.close();
    process.exit(1);
  }

  try {
    console.log("🔄 Exchanging code for token...");
    const tokens = await exchangeCodeForToken(code);
    persistTokens(tokens);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>Pinterest Connected</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             max-width:480px;margin:80px auto;padding:32px;text-align:center;
             background:#f6f1e7;color:#2f261f;border-radius:16px}
        h1{color:#754624}
        code{background:#fff;padding:4px 8px;border-radius:4px}
      </style>
      </head><body>
        <h1>✅ Pinterest connected!</h1>
        <p>Your access token has been saved to <code>.env</code>.</p>
        <p>You can close this window and return to your terminal.</p>
      </body></html>
    `);

    console.log("\n🎉 Done! Next: run");
    console.log("   node scripts/social/pinterest-list-boards.mjs\n");
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 500);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>❌ Token exchange failed</h1><pre>${err.message}</pre>`);
    console.error("❌", err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("🌲 Pinterest OAuth helper");
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log("\n🔗 Opening browser to Pinterest authorization page...");
  console.log("   If it doesn't open, paste this URL manually:\n");
  console.log(`   ${AUTHORIZE_URL}\n`);
  openBrowser(AUTHORIZE_URL);
});
