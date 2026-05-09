#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const VALID_EXTS = new Set([".webp", ".png", ".jpg", ".jpeg", ".avif"]);

const defaults = {
  mode: "auto",
  count: 5,
  bucket: "generated-images",
  maxScan: 20000,
  forgeRoot: "../COLORING FORGE APP",
  outputDir: "scripts/temp-inputs",
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const options = {
  mode: asString(args.mode, defaults.mode).toLowerCase(),
  count: asInt(args.count, defaults.count),
  bucket: asString(args.bucket, defaults.bucket),
  maxScan: asInt(args["max-scan"], defaults.maxScan),
  forgeRoot: asString(args["forge-root"], defaults.forgeRoot),
  outputDir: asString(args.output, defaults.outputDir),
  sourceDir: asOptionalString(args["source-dir"]),
  conceptId: asOptionalString(args["concept-id"] || args.book || args.concept),
  userId: asOptionalString(args["user-id"] || args.user),
  prefix: normalizePrefix(asOptionalString(args.prefix)),
  includeAplus: Boolean(args["include-aplus"]),
};

if (!["auto", "local", "r2"].includes(options.mode)) {
  fail('Invalid --mode. Use "auto", "local", or "r2".');
}
if (options.count < 1 || options.count > 50) {
  fail("--count must be between 1 and 50.");
}
if (options.maxScan < 1000) {
  fail("--max-scan must be at least 1000.");
}

const forgeRoot = path.resolve(projectRoot, options.forgeRoot);
const outputDir = path.resolve(projectRoot, options.outputDir);

const localCandidates = buildLocalCandidates(forgeRoot, options.sourceDir);

await fs.mkdir(outputDir, { recursive: true });

const selected =
  options.mode === "local"
    ? await extractFromLocal(localCandidates, outputDir, options)
    : options.mode === "r2"
      ? await extractFromR2(forgeRoot, outputDir, options)
      : await extractAuto(forgeRoot, localCandidates, outputDir, options);

if (selected.length === 0) {
  fail("No pages were extracted.");
}

console.log(`Done. Extracted ${selected.length} image(s) to ${toPosix(path.relative(projectRoot, outputDir))}`);

async function extractAuto(forgeRootPath, localDirs, outDir, opts) {
  const localResult = await tryLocal(localDirs, outDir, opts);
  if (localResult.length > 0) return localResult;
  return extractFromR2(forgeRootPath, outDir, opts);
}

async function extractFromLocal(localDirs, outDir, opts) {
  const localResult = await tryLocal(localDirs, outDir, opts, true);
  if (localResult.length === 0) {
    fail("No local interior images were found. Use --source-dir or switch to --mode r2.");
  }
  return localResult;
}

async function tryLocal(localDirs, outDir, opts, strict = false) {
  const existingDirs = localDirs.filter((dir) => existsSync(dir));
  if (existingDirs.length === 0) {
    if (strict) {
      console.log("Local mode: no candidate source directories exist.");
    }
    return [];
  }

  let files = [];
  for (const dir of existingDirs) {
    const listed = await collectImages(dir);
    files.push(...listed);
  }

  files = unique(files);

  if (opts.conceptId) {
    const conceptToken = opts.conceptId.toLowerCase();
    const conceptScoped = files.filter((f) => toPosix(f).toLowerCase().includes(conceptToken));
    if (conceptScoped.length > 0) files = conceptScoped;
  }

  files.sort((a, b) => naturalPageCompare(path.basename(a), path.basename(b)) || a.localeCompare(b));
  const picked = files.slice(0, opts.count);

  if (picked.length === 0) return [];

  const outputs = [];
  for (let i = 0; i < picked.length; i++) {
    const src = picked[i];
    const ext = normalizedImageExt(path.extname(src)) || ".png";
    const outName = `poc-local-${String(i + 1).padStart(2, "0")}${ext}`;
    const dest = path.join(outDir, outName);
    await fs.copyFile(src, dest);
    outputs.push(dest);
    console.log(`LOCAL  ${toPosix(src)} -> ${toPosix(path.relative(projectRoot, dest))}`);
  }

  return outputs;
}

async function extractFromR2(forgeRootPath, outDir, opts) {
  if (!existsSync(forgeRootPath)) {
    fail(`Forge path not found: ${forgeRootPath}`);
  }

  const accountId = cleanEnv(process.env.R2_ACCOUNT_ID);
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    fail("Missing R2 credentials in process.env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).");
  }

  const aws = await loadAwsSdk(forgeRootPath);
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = aws;
  if (!S3Client || !ListObjectsV2Command || !GetObjectCommand) {
    fail("Could not load @aws-sdk/client-s3 classes.");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const objects = await findR2Objects({
    s3,
    ListObjectsV2Command,
    bucket: resolveBucket(opts.bucket),
    prefix: opts.prefix,
    conceptId: opts.conceptId,
    userId: opts.userId,
    maxScan: opts.maxScan,
  });

  const images = objects
    .filter((obj) => !!obj.Key)
    .filter((obj) => isImageKey(obj.Key))
    .filter((obj) => opts.includeAplus || !isAplusKey(obj.Key));

  if (images.length === 0) {
    fail("No matching image objects found in R2 for the provided criteria.");
  }

  images.sort((a, b) => {
    const aName = path.basename(a.Key || "");
    const bName = path.basename(b.Key || "");
    const byPage = naturalPageCompare(aName, bName);
    if (byPage !== 0) return byPage;
    return (a.Key || "").localeCompare(b.Key || "");
  });

  const picked = images.slice(0, opts.count);
  const outputs = [];

  for (let i = 0; i < picked.length; i++) {
    const obj = picked[i];
    const key = obj.Key;
    if (!key) continue;

    const response = await s3.send(new GetObjectCommand({ Bucket: resolveBucket(opts.bucket), Key: key }));
    const buffer = await bodyToBuffer(response.Body);
    const ext = normalizedImageExt(path.extname(key)) || extFromContentType(response.ContentType) || ".png";
    const outName = `poc-r2-${String(i + 1).padStart(2, "0")}${ext}`;
    const dest = path.join(outDir, outName);

    await fs.writeFile(dest, buffer);
    outputs.push(dest);

    console.log(`R2     ${resolveBucket(opts.bucket)}/${key} -> ${toPosix(path.relative(projectRoot, dest))}`);
  }

  return outputs;
}

async function findR2Objects(params) {
  const { s3, ListObjectsV2Command, bucket, prefix, conceptId, userId, maxScan } = params;

  let effectivePrefix = "";
  if (prefix) {
    effectivePrefix = prefix;
  } else if (userId && conceptId) {
    effectivePrefix = `${stripSlashes(userId)}/${stripSlashes(conceptId)}/`;
  } else if (userId) {
    effectivePrefix = `${stripSlashes(userId)}/`;
  }

  if (!effectivePrefix && !conceptId) {
    fail("R2 mode requires --prefix or --concept-id (optionally with --user-id).");
  }

  let continuationToken;
  let scanned = 0;
  const matches = [];

  while (true) {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: effectivePrefix || undefined,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));

    const entries = response.Contents || [];
    scanned += entries.length;

    for (const entry of entries) {
      if (!entry.Key) continue;
      if (conceptId && !entry.Key.includes(`/${stripSlashes(conceptId)}/`)) {
        continue;
      }
      matches.push(entry);
    }

    if (!response.IsTruncated) break;
    if (scanned >= maxScan) break;
    continuationToken = response.NextContinuationToken;
    if (!continuationToken) break;
  }

  console.log(`R2 scan complete: scanned=${scanned} matched=${matches.length}`);
  return matches;
}

async function collectImages(rootDir) {
  const list = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && normalizedImageExt(path.extname(entry.name))) {
        list.push(full);
      }
    }
  }

  return list;
}

async function loadAwsSdk(forgeRootPath) {
  try {
    return await import("@aws-sdk/client-s3");
  } catch {
    const pkgPath = path.join(forgeRootPath, "package.json");
    const req = createRequire(pkgPath);
    return req("@aws-sdk/client-s3");
  }
}

async function bodyToBuffer(body) {
  if (!body) throw new Error("R2 returned empty body.");

  if (Buffer.isBuffer(body)) return body;

  if (typeof body.transformToByteArray === "function") {
    const arr = await body.transformToByteArray();
    return Buffer.from(arr);
  }

  if (typeof body.transformToWebStream === "function") {
    const web = body.transformToWebStream();
    return readableToBuffer(Readable.fromWeb(web));
  }

  if (body instanceof Readable) {
    return readableToBuffer(body);
  }

  if (typeof body[Symbol.asyncIterator] === "function") {
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported stream type from R2 GetObject response.");
}

async function readableToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildLocalCandidates(forgeRootPath, sourceDirArg) {
  if (sourceDirArg) {
    return [resolveExternalPath(forgeRootPath, sourceDirArg)];
  }

  return [
    path.join(forgeRootPath, "exports", "interiors"),
    path.join(forgeRootPath, "output", "interiors"),
    path.join(forgeRootPath, "tmp", "interiors"),
    path.join(forgeRootPath, ".tmp", "interiors"),
    path.join(forgeRootPath, "public", "interiors"),
    path.join(forgeRootPath, "public", "images", "interiors"),
    path.join(forgeRootPath, "downloads", "interiors"),
  ];
}

function resolveExternalPath(forgeRootPath, input) {
  if (path.isAbsolute(input)) return input;
  return path.resolve(forgeRootPath, input);
}

function isImageKey(key) {
  return Boolean(normalizedImageExt(path.extname(key)));
}

function isAplusKey(key) {
  return String(key || "").toLowerCase().includes("/aplus/");
}

function normalizedImageExt(ext) {
  const clean = (ext || "").toLowerCase();
  return VALID_EXTS.has(clean) ? clean : "";
}

function naturalPageCompare(a, b) {
  const aNum = extractPageNumber(a);
  const bNum = extractPageNumber(b);
  if (aNum !== null && bNum !== null) return aNum - bNum;
  if (aNum !== null) return -1;
  if (bNum !== null) return 1;
  return 0;
}

function extractPageNumber(name) {
  const checks = [
    /(page|pg|p)[-_\s]?(\d{1,4})/i,
    /(\d{1,4})/,
  ];
  for (const rx of checks) {
    const match = name.match(rx);
    if (match) {
      const num = Number.parseInt(match[match.length - 1], 10);
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

function extFromContentType(contentType) {
  const value = String(contentType || "").toLowerCase();
  if (value.includes("webp")) return ".webp";
  if (value.includes("png")) return ".png";
  if (value.includes("jpeg") || value.includes("jpg")) return ".jpg";
  if (value.includes("avif")) return ".avif";
  return "";
}

function cleanEnv(value) {
  if (!value) return "";
  return String(value).replace(/\\n/g, "").replace(/\r|\n/g, "").trim();
}

function resolveBucket(cliValue) {
  const envValue = cleanEnv(process.env.R2_BUCKET);
  return cleanEnv(cliValue) || envValue || defaults.bucket;
}

function normalizePrefix(value) {
  if (!value) return "";
  return stripSlashes(value) + "/";
}

function stripSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "").trim();
}

function toPosix(value) {
  return String(value).replace(/\\/g, "/");
}

function unique(items) {
  return [...new Set(items)];
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const body = part.slice(2);
    if (body.includes("=")) {
      const idx = body.indexOf("=");
      out[body.slice(0, idx)] = body.slice(idx + 1);
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[body] = true;
      continue;
    }
    out[body] = next;
    i += 1;
  }
  return out;
}

function asString(value, fallback) {
  return value === undefined || value === null || value === true ? fallback : String(value);
}

function asOptionalString(value) {
  if (value === undefined || value === null || value === true) return "";
  const text = String(value).trim();
  return text;
}

function asInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`
PoC extractor for COLORING FORGE APP -> scripts/temp-inputs

Usage:
  node scripts/poc-extract-pages.mjs [options]

Options:
  --mode auto|local|r2          Extraction mode (default: auto)
  --count 5                     Number of images to extract (default: 5)
  --forge-root "../COLORING FORGE APP"
                                Path to external app root
  --output "scripts/temp-inputs"
                                Destination folder in this repo

Local mode options:
  --source-dir <path>           Explicit local image folder inside/outside forge app

R2 mode options:
  --bucket generated-images     R2 bucket name (default: generated-images or env R2_BUCKET)
  --concept-id <id>             Concept/book ID in Coloring Forge
  --user-id <uuid>              User ID; builds prefix userId/conceptId/
  --prefix <userId/conceptId/>  Explicit R2 key prefix (overrides user/concept)
  --include-aplus               Include A+ assets (excluded by default)
  --max-scan 20000              Max R2 objects to scan when listing

Required env vars for R2 mode:
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET (optional)

Examples:
  node scripts/poc-extract-pages.mjs --mode local --source-dir "exports/interiors/my-book"
  node scripts/poc-extract-pages.mjs --mode r2 --concept-id 123e4567-e89b-12d3-a456-426614174000 --user-id 9f8c6a...
  node scripts/poc-extract-pages.mjs --mode r2 --prefix "9f8c6a.../123e4567-e89b-12d3-a456-426614174000/"
  node scripts/poc-extract-pages.mjs --mode auto --concept-id 123e4567-e89b-12d3-a456-426614174000
`);
}
