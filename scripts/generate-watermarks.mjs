#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const INPUT_DIR = path.join(projectRoot, "scripts", "temp-inputs");
const LOGO_PATH = path.join(projectRoot, "public", "images", "brand", "logo-mark-transparent.png");
const OUTPUT_DIR = path.join(projectRoot, "public", "look-inside");

const LOGO_WIDTH_RATIO = 0.4;
const LOGO_OPACITY = 0.5;
const WEBP_QUALITY = 82;

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".avif",
]);

const logoCache = new Map();

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function outputPathFromInput(inputFile) {
  const rel = path.relative(INPUT_DIR, inputFile);
  const parsed = path.parse(rel);
  return path.join(OUTPUT_DIR, parsed.dir, parsed.name + ".webp");
}

async function getLogoWithOpacity(targetWidthPx) {
  const width = Math.max(1, Math.round(targetWidthPx));
  if (logoCache.has(width)) {
    return logoCache.get(width);
  }

  const result = await sharp(LOGO_PATH)
    .resize({ width, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = result.data;
  const info = result.info;

  const alphaChannelIndex = info.channels - 1;
  for (let i = alphaChannelIndex; i < data.length; i += info.channels) {
    data[i] = Math.round(data[i] * LOGO_OPACITY);
  }

  const logoBuffer = await sharp(data, { raw: info }).png().toBuffer();
  logoCache.set(width, logoBuffer);
  return logoBuffer;
}

async function processImage(inputFile) {
  const outputFile = outputPathFromInput(inputFile);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  const base = sharp(inputFile).rotate();
  const metadata = await base.metadata();

  if (!metadata.width) {
    throw new Error(
      "No width metadata for " + toPosixPath(path.relative(projectRoot, inputFile)),
    );
  }

  const logoWidth = metadata.width * LOGO_WIDTH_RATIO;
  const logoOverlay = await getLogoWithOpacity(logoWidth);

  await base
    .composite([{ input: logoOverlay, gravity: "center" }])
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(outputFile);

  return {
    input: toPosixPath(path.relative(projectRoot, inputFile)),
    output: toPosixPath(path.relative(projectRoot, outputFile)),
  };
}

async function main() {
  await fs.access(INPUT_DIR).catch(() => {
    throw new Error("Missing input folder: scripts/temp-inputs/");
  });

  await fs.access(LOGO_PATH).catch(() => {
    throw new Error("Missing logo file: public/images/brand/logo-mark-transparent.png");
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allFiles = await walkFiles(INPUT_DIR);
  const sourceImages = allFiles.filter((file) =>
    SUPPORTED_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );

  if (sourceImages.length === 0) {
    console.log("No source images found in scripts/temp-inputs/. Nothing to do.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const inputFile of sourceImages) {
    try {
      const result = await processImage(inputFile);
      success += 1;
      console.log("OK  " + result.input + " -> " + result.output);
    } catch (error) {
      failed += 1;
      const relInput = toPosixPath(path.relative(projectRoot, inputFile));
      const message = error instanceof Error ? error.message : String(error);
      console.error("FAIL " + relInput + ": " + message);
    }
  }

  console.log(
    "Done. processed=" +
      sourceImages.length +
      " success=" +
      success +
      " failed=" +
      failed,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
