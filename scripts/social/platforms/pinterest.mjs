/**
 * Pinterest (v5) connector.
 * Publishes Pins to our own boards using an OAuth Bearer token.
 *
 * Required env vars:
 *   PINTEREST_ACCESS_TOKEN   — OAuth access token (scopes: pins:write, boards:read)
 *   PINTEREST_REFRESH_TOKEN  — (optional) refresh token, used to auto-refresh
 *   PINTEREST_APP_ID         — (for refresh) client id
 *   PINTEREST_APP_SECRET     — (for refresh) client secret
 *
 * Board mapping is read from scripts/social/.pinterest-boards.json
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = resolve(__dirname, "..");
const ROOT = resolve(__dirname, "../../..");
const BOARDS_PATH = resolve(SOCIAL_DIR, ".pinterest-boards.json");
const ENV_PATH = resolve(ROOT, ".env");

const API = process.env.PINTEREST_SANDBOX === "true"
  ? "https://api-sandbox.pinterest.com/v5"
  : "https://api.pinterest.com/v5";

// ─── Board lookup ────────────────────────────────────────────
let _boardsCache = null;
function loadBoards() {
  if (_boardsCache) return _boardsCache;
  if (!existsSync(BOARDS_PATH)) {
    throw new Error(`Pinterest boards file missing: ${BOARDS_PATH}. Run pinterest-list-boards.mjs first.`);
  }
  _boardsCache = JSON.parse(readFileSync(BOARDS_PATH, "utf-8"));
  return _boardsCache;
}

export function getBoardForType(postType) {
  const boards = loadBoards();
  const map = boards.contentTypeMap || {};
  const match = map[postType];
  if (match) return match;
  // Fallback: first board in the list
  const firstId = Object.keys(boards.boards || {})[0];
  if (firstId) return { id: firstId, name: boards.boards[firstId] };
  throw new Error(`No Pinterest board mapped for type "${postType}" and no fallback available.`);
}

// ─── Token auto-refresh ──────────────────────────────────────
async function refreshAccessToken() {
  const refreshToken = process.env.PINTEREST_REFRESH_TOKEN;
  const appId = process.env.PINTEREST_APP_ID;
  const appSecret = process.env.PINTEREST_APP_SECRET;
  if (!refreshToken || !appId || !appSecret) {
    throw new Error("Cannot refresh Pinterest token: missing PINTEREST_REFRESH_TOKEN / APP_ID / APP_SECRET");
  }

  const basic = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Pinterest token refresh failed (${res.status}): ${body}`);
  const tokens = JSON.parse(body);

  // Persist new token to .env (local runs); in CI the old token keeps working until expiry.
  if (existsSync(ENV_PATH)) {
    try {
      let content = readFileSync(ENV_PATH, "utf-8");
      const upsert = (k, v) => {
        const re = new RegExp(`^${k}=.*$`, "m");
        if (re.test(content)) content = content.replace(re, `${k}=${v}`);
        else content += `\n${k}=${v}\n`;
      };
      upsert("PINTEREST_ACCESS_TOKEN", tokens.access_token);
      if (tokens.expires_in) {
        upsert("PINTEREST_ACCESS_TOKEN_EXPIRES_AT", String(Math.floor(Date.now() / 1000) + Number(tokens.expires_in)));
      }
      writeFileSync(ENV_PATH, content);
    } catch {
      // Non-fatal — in CI the .env file may not be writable.
    }
  }

  process.env.PINTEREST_ACCESS_TOKEN = tokens.access_token;
  return tokens.access_token;
}

async function authFetch(path, init = {}, { retried = false } = {}) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) throw new Error("Missing PINTEREST_ACCESS_TOKEN");

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  // Auto-refresh on 401 once
  if (res.status === 401 && !retried) {
    try {
      await refreshAccessToken();
      return authFetch(path, init, { retried: true });
    } catch {
      // fall through to throw with original 401
    }
  }

  return res;
}

// ─── Create Pin ──────────────────────────────────────────────
/**
 * Publish a Pin.
 *
 * @param {object} params
 * @param {string} params.boardId        — target board ID
 * @param {string} params.title          — max 100 chars
 * @param {string} params.description    — max 500 chars
 * @param {string} params.link           — destination URL (with UTM)
 * @param {string} [params.altText]      — accessibility text (max 500 chars)
 * @param {string} [params.imageUrl]     — public HTTPS URL of the image
 * @param {Buffer} [params.imageBuffer]  — image bytes (will be sent as base64)
 * @param {string} [params.imageMime]    — "image/png" | "image/jpeg" (default: image/png)
 * @returns {{ id: string, url: string }}
 */
export async function createPin({
  boardId,
  title,
  description,
  link,
  altText,
  imageUrl,
  imageBuffer,
  imageMime = "image/png",
}) {
  if (!boardId) throw new Error("createPin: boardId is required");
  if (!imageUrl && !imageBuffer) throw new Error("createPin: imageUrl or imageBuffer is required");

  // Pinterest limits
  const safeTitle = (title || "").slice(0, 100);
  const safeDesc  = (description || "").slice(0, 500);
  const safeAlt   = (altText || safeTitle).slice(0, 500);

  const media_source = imageBuffer
    ? {
        source_type: "image_base64",
        content_type: imageMime,
        data: imageBuffer.toString("base64"),
      }
    : {
        source_type: "image_url",
        url: imageUrl,
      };

  const payload = {
    board_id: boardId,
    title: safeTitle,
    description: safeDesc,
    alt_text: safeAlt,
    media_source,
  };
  if (link) payload.link = link;

  const res = await authFetch("/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Pinterest createPin failed (${res.status}): ${body}`);
  }
  let pin;
  try {
    pin = JSON.parse(body);
  } catch (err) {
    // Log the first 200 chars of the body to help diagnose parser issues
    const preview = body.slice(0, 300).replace(/\s+/g, " ");
    throw new Error(`Pinterest createPin: could not parse response (${err.message}). Body preview: ${preview}`);
  }
  return {
    id: pin.id,
    url: `https://www.pinterest.com/pin/${pin.id}/`,
    raw: pin,
  };
}

/**
 * Lightweight health check — verify the token works and return the account handle.
 */
export async function checkPinterestStatus() {
  const res = await authFetch("/user_account");
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, error: body };
  }
  const acct = await res.json();
  return { ok: true, username: acct.username, type: acct.account_type };
}
