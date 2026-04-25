#!/usr/bin/env node
/**
 * Generates self-hosted 1200×630 Open Graph images for each book in
 * src/data/books.ts, output at public/images/books/og/<book-id>.webp.
 *
 * Composition:
 *   - Background: warm brand color (#fffaf2) — matches site palette.
 *   - Left: book cover image (self-hosted under /public/images/books/<id>.jpg)
 *     resized to 500×650.
 *   - Right: book title (truncated to 60 chars) + "Little Chubby Press" brand mark.
 *
 * Idempotent: skips generation if the output already exists and is newer than
 * the source cover. Use `--force` to regenerate everything.
 *
 * Usage:
 *   node scripts/generate-book-og-images.mjs           # incremental
 *   node scripts/generate-book-og-images.mjs --force   # regenerate all
 *   node scripts/generate-book-og-images.mjs --id=magical-creatures  # one book
 *
 * Output: one .webp per book at public/images/books/og/<id>.webp.
 *
 * Requires: sharp (production dep).
 *
 * Master Doc IV-H.2 — Self-hosted OG image per book.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const BOOKS_TS = path.join(ROOT, "src/data/books.ts");
const COVERS_DIR = path.join(ROOT, "public/images/books");
const OUT_DIR = path.join(ROOT, "public/images/books/og");

const FORCE = process.argv.includes("--force");
const ID_FILTER = process.argv.find((a) => a.startsWith("--id="))?.slice(5);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Parse books.ts lightweight (same approach as scripts/daily-newsletter.mjs).
const raw = fs.readFileSync(BOOKS_TS, "utf-8");
const idMatches = [...raw.matchAll(/\{\s*\n\s*id:\s*"([^"]+)"/g)];

const books = idMatches.map((m) => {
  const id = m[1];
  const blockRx = new RegExp(
    `\\{\\s*\\n\\s*id:\\s*"${id}"[\\s\\S]*?(?=\\n  \\},|\\n  \\}\\n)`,
  );
  const block = raw.match(blockRx)?.[0] ?? "";
  const titleRx = /title:\s*\{[^}]*en:\s*"([^"]*)"/s;
  const coverRx = /coverSrc:\s*"([^"]+)"/;
  return {
    id,
    title: block.match(titleRx)?.[1] ?? id,
    coverSrc: block.match(coverRx)?.[1] ?? "",
  };
});

let generated = 0;
let skipped = 0;
let warned = 0;

for (const b of books) {
  if (ID_FILTER && b.id !== ID_FILTER) continue;

  const outPath = path.join(OUT_DIR, `${b.id}.webp`);

  // Source cover: prefer self-hosted /public/images/books/<id>.{jpg,webp,png}.
  const localCoverCandidates = [
    path.join(COVERS_DIR, `${b.id}.jpg`),
    path.join(COVERS_DIR, `${b.id}.webp`),
    path.join(COVERS_DIR, `${b.id}.png`),
  ];
  const srcCover = localCoverCandidates.find((p) => fs.existsSync(p));
  if (!srcCover) {
    console.warn(`⚠ ${b.id}: no self-hosted cover found in ${COVERS_DIR}. Skipping OG image.`);
    warned++;
    continue;
  }

  // Incremental: skip if out exists and is newer than source.
  if (!FORCE && fs.existsSync(outPath)) {
    const srcMtime = fs.statSync(srcCover).mtimeMs;
    const outMtime = fs.statSync(outPath).mtimeMs;
    if (outMtime >= srcMtime) {
      console.log(`• ${b.id}: up-to-date, skipping.`);
      skipped++;
      continue;
    }
  }

  // Compose the OG image.
  const coverBuf = await sharp(srcCover)
    .resize(500, 650, { fit: "cover", position: "centre" })
    .toBuffer();

  const titleTrim = b.title.length > 60 ? b.title.slice(0, 57) + "…" : b.title;
  const svgTitle = `
    <svg width="560" height="630" xmlns="http://www.w3.org/2000/svg">
      <foreignObject x="0" y="180" width="560" height="300">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: Georgia, serif; font-size: 54px; font-weight: 700;
          color: #3a2e24; line-height: 1.15;
          word-wrap: break-word;">
          ${escapeXml(titleTrim)}
        </div>
      </foreignObject>
      <text x="0" y="560" font-family="Georgia, serif" font-size="28" fill="#6b6258" font-style="italic">Little Chubby Press</text>
    </svg>`;

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 255, g: 250, b: 242, alpha: 1 }, // #fffaf2
    },
  })
    .composite([
      { input: coverBuf, left: 60, top: 50 },
      { input: Buffer.from(svgTitle), left: 580, top: 0 },
    ])
    .webp({ quality: 85 })
    .toFile(outPath);

  console.log(`✓ ${b.id}: generated ${path.relative(ROOT, outPath)}`);
  generated++;
}

console.log(
  `\nDone. generated=${generated} skipped=${skipped} warned=${warned} total=${books.length}`,
);

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
