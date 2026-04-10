#!/usr/bin/env node

/**
 * Make relay CLI.
 *
 * Generates a daily social payload from existing templates and sends it to a
 * Make.com webhook so Make handles Facebook/Instagram auth + publishing.
 *
 * Usage:
 *   node scripts/social/make.mjs --type book-promo --lang en
 *   node scripts/social/make.mjs --type engagement --lang es --dry-run
 *   node scripts/social/make.mjs --type blog-share --webhook https://hook...
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomUUID } from "node:crypto";
import { generatePost } from "./content-templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const DEFAULT_SITE_URL = "https://www.littlechubbypress.com";
const SUPPORTED_TYPES = new Set(["book-promo", "blog-share", "engagement", "community"]);
const SUPPORTED_LANGS = new Set(["en", "es"]);

loadDotEnv();

function loadDotEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;

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

function parseTsArrayExport(filePath, exportName) {
  const src = readFileSync(filePath, "utf-8");
  const startMatch = src.match(new RegExp(`export\\s+const\\s+${exportName}[^=]*=\\s*\\[`));
  if (!startMatch) {
    throw new Error(`Could not find ${exportName} array in ${filePath}`);
  }

  const startIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 0;
  let endIdx = startIdx;

  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === "[") {
      depth++;
    } else if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  let arrayStr = src.slice(startIdx, endIdx);
  // Remove references imported from other files to keep evaluation self-contained.
  arrayStr = arrayStr.replace(/books\.find\([^)]*\)/g, "undefined");
  return new Function(`return ${arrayStr}`)();
}

function loadBooks() {
  return parseTsArrayExport(resolve(ROOT, "src/data/books.ts"), "books");
}

function loadPosts() {
  return parseTsArrayExport(resolve(ROOT, "src/data/posts.ts"), "posts");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const positional = [];
  const opts = {
    type: "book-promo",
    lang: "en",
    book: null,
    webhookUrl: process.env.MAKE_WEBHOOK_URL || "",
    webhookSecret: process.env.MAKE_WEBHOOK_SECRET || "",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--type":
        opts.type = args[++i];
        break;
      case "--lang":
        opts.lang = args[++i];
        break;
      case "--book":
        opts.book = args[++i];
        break;
      case "--webhook":
        opts.webhookUrl = args[++i];
        break;
      case "--webhook-secret":
        opts.webhookSecret = args[++i];
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      default:
        if (args[i].startsWith("-")) {
          throw new Error(`Unknown option: ${args[i]}`);
        }
        positional.push(args[i]);
        break;
    }
  }

  // npm + PowerShell may strip option names and pass only values.
  if (positional[0] && opts.type === "book-promo") opts.type = positional[0];
  if (positional[1] && opts.lang === "en") opts.lang = positional[1];
  if (positional[2] && !opts.webhookUrl && /^https?:\/\//i.test(positional[2])) {
    opts.webhookUrl = positional[2];
  }

  if (!SUPPORTED_TYPES.has(opts.type)) {
    throw new Error(`Unsupported --type: ${opts.type}`);
  }
  if (!SUPPORTED_LANGS.has(opts.lang)) {
    throw new Error(`Unsupported --lang: ${opts.lang}`);
  }

  return opts;
}

function normalizeSiteUrl(siteUrl) {
  const cleaned = (siteUrl || "").trim().replace(/\/+$/, "");
  return cleaned || DEFAULT_SITE_URL;
}

function resolvePublicUrl(pathOrUrl, siteUrl) {
  if (!pathOrUrl) return `${siteUrl}/images/brand/og-cover.png`;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  if (pathOrUrl.startsWith("/")) return `${siteUrl}${pathOrUrl}`;
  return `${siteUrl}/${pathOrUrl.replace(/^\/+/, "")}`;
}

function buildSourceUrl(type, lang, data, siteUrl) {
  switch (type) {
    case "book-promo":
      return data?.amazonUrl || `${siteUrl}/${lang}/books/`;
    case "blog-share":
      if (data?.slug?.[lang]) return `${siteUrl}/${lang}/blog/${data.slug[lang]}/`;
      return `${siteUrl}/${lang}/blog/`;
    case "engagement":
      return `${siteUrl}/${lang}/books/`;
    case "community":
      return `${siteUrl}/${lang}/`;
    default:
      return `${siteUrl}/${lang}/`;
  }
}

function chooseData(type, bookId, books, posts) {
  if (type === "book-promo") {
    if (bookId) {
      const found = books.find((book) => book.id === bookId);
      if (!found) {
        const ids = books.map((book) => book.id).join(", ");
        throw new Error(`Book \"${bookId}\" not found. Available IDs: ${ids}`);
      }
      return found;
    }
    return books[Math.floor(Math.random() * books.length)];
  }

  if (type === "blog-share") {
    return posts[Math.floor(Math.random() * posts.length)];
  }

  return undefined;
}

function createPayload(opts, data, generatedPost, siteUrl) {
  const sourceUrl = buildSourceUrl(opts.type, opts.lang, data, siteUrl);
  const imagePath = data?.coverSrc || data?.image || "/images/brand/og-cover.png";
  const imageUrl = resolvePublicUrl(imagePath, siteUrl);
  const title = data?.title?.[opts.lang] || data?.title?.en || data?.title?.es || null;

  return {
    source: "little-chubby-website",
    requestId: randomUUID(),
    generatedAt: new Date().toISOString(),
    type: opts.type,
    lang: opts.lang,
    text: generatedPost.text,
    cta: generatedPost.cta,
    hashtags: generatedPost.hashtags,
    fullPost: generatedPost.fullPost,
    sourceUrl,
    imageUrl,
    metadata: {
      bookId: opts.type === "book-promo" ? data?.id || null : null,
      postId: opts.type === "blog-share" ? data?.id || null : null,
      title,
    },
    facebook: {
      message: generatedPost.fullPost,
      link: sourceUrl,
    },
    instagram: {
      caption: generatedPost.fullPost,
      imageUrl,
    },
  };
}

function isAllowedWebhookHost(hostname) {
  const allowedHostsEnv = (process.env.MAKE_WEBHOOK_ALLOWED_HOSTS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHostsEnv.length > 0) {
    return allowedHostsEnv.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  }

  return hostname === "make.com" || hostname.endsWith(".make.com");
}

function assertSecureWebhookUrl(webhookUrl) {
  let parsed;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error("Invalid MAKE_WEBHOOK_URL format.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("MAKE_WEBHOOK_URL must use HTTPS.");
  }

  if (!isAllowedWebhookHost(parsed.hostname.toLowerCase())) {
    throw new Error(
      "Webhook host is not allowed. Set MAKE_WEBHOOK_ALLOWED_HOSTS to override this protection."
    );
  }
}

async function sendToMake(webhookUrl, webhookSecret, payload) {
  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "little-chubby-website/1.0",
  };

  const unixTimestamp = Math.floor(Date.now() / 1000).toString();
  headers["X-Webhook-Timestamp"] = unixTimestamp;

  if (webhookSecret) {
    const signature = createHmac("sha256", webhookSecret)
      .update(`${unixTimestamp}.${body}`)
      .digest("hex");

    // Backward compatibility with existing Make filter setup.
    headers["X-Webhook-Secret"] = webhookSecret;
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body,
  });

  const bodyText = await res.text();
  if (!res.ok) {
    const safeBody = bodyText.replace(/\s+/g, " ").slice(0, 300);
    throw new Error(`Make webhook failed (${res.status}): ${safeBody}`);
  }

  return { status: res.status, bodyText };
}

async function main() {
  const opts = parseArgs();
  const siteUrl = normalizeSiteUrl(process.env.PUBLIC_SITE_URL);
  const books = loadBooks();
  const posts = loadPosts();

  const data = chooseData(opts.type, opts.book, books, posts);
  const generatedPost = generatePost(opts.type, opts.lang, data);
  const payload = createPayload(opts, data, generatedPost, siteUrl);

  if (opts.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!opts.webhookUrl) {
    throw new Error("Missing Make webhook URL. Set MAKE_WEBHOOK_URL or pass --webhook.");
  }

  assertSecureWebhookUrl(opts.webhookUrl);

  const result = await sendToMake(opts.webhookUrl, opts.webhookSecret, payload);
  console.log(`Posted payload to Make webhook (HTTP ${result.status}).`);
}

main().catch((err) => {
  console.error(`\nFatal error: ${err.message}\n`);
  process.exit(1);
});