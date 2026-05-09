#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { manuscriptSampleBooks } from "./manuscript-samples.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const LOGO_PATH = path.join(projectRoot, "public", "images", "brand", "logo-mark-transparent.png");
const TEMP_ROOT = path.join(projectRoot, "scripts", "temp-manuscripts", ".rendered-samples");
const LOGO_WIDTH_RATIO_DEFAULT = 1.04;
const LOGO_OPACITY_DEFAULT = 0.12;
const TEXT_OPACITY_DEFAULT = 0.22;
const WEBP_QUALITY = 82;
const WATERMARK_TEXT_DEFAULT = "PROPERTY OF LITTLE CHUBBY PRESS";
const VALID_WATERMARKS = new Set(["none", "logo", "text"]);
const VALID_WATERMARK_THEMES = new Set(["mono"]);
const WATERMARK_THEME_DEFAULT = "mono";
const LOOK_INSIDE_DEFAULTS = Object.freeze({
  count: 5,
  minSpacing: 6,
  outputSize: 800,
  renderZoom: 1.25,
  watermark: "logo",
  watermarkOpacity: 0.18,
  watermarkWidthRatio: 1.04,
});

const logoCache = new Map();

function parseArgs(argv) {
  const args = {
    book: "all",
    deleteSource: false,
    clean: false,
    lookInsideOnly: false,
    python: process.env.PYTHON || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--book") {
      args.book = argv[++index] || "";
    } else if (arg === "--delete-source") {
      args.deleteSource = true;
    } else if (arg === "--clean") {
      args.clean = true;
    } else if (arg === "--look-inside-only") {
      args.lookInsideOnly = true;
    } else if (arg === "--python") {
      args.python = argv[++index] || "";
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!args.book) {
    throw new Error("Missing value for --book.");
  }

  return args;
}

function printHelp() {
  console.log(`Usage: npm run books:samples -- --book awesome-boys [--clean] [--delete-source]

Creates watermarked WebP manuscript sample images from private source files.
Also builds Look Inside preview pages from manuscript PDFs when lookInside config is present.

Options:
  --book <slug>       Book config slug, or all. Default: all
  --clean             Remove existing .webp outputs for the selected book before writing
  --look-inside-only  Build only Look Inside preview pages (skip manuscript sample outputs)
  --delete-source     Delete each source PDF after all outputs succeed
  --python <path>     Python executable with PyMuPDF installed

Private PDF sources belong under scripts/temp-manuscripts/, which is gitignored.`);
}

function relPath(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

function resolveProjectPath(value) {
  return path.isAbsolute(value) ? value : path.join(projectRoot, value);
}

function publicSrc(outputFile) {
  return "/" + relPath(outputFile).replace(/^public\//, "");
}

function coercePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function coerceOpacity(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, parsed));
}

function normalizeWatermark(value) {
  if (typeof value !== "string") {
    return "logo";
  }
  return VALID_WATERMARKS.has(value) ? value : "logo";
}

function normalizeWatermarkTheme(value, context = "") {
  if (typeof value !== "string" || value.trim().length === 0) {
    return WATERMARK_THEME_DEFAULT;
  }

  if (!VALID_WATERMARK_THEMES.has(value)) {
    const contextSuffix = context ? ` in ${context}` : "";
    throw new Error(`Invalid watermarkTheme \"${value}\"${contextSuffix}. Allowed values: mono.`);
  }

  return value;
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getPythonExecutable(configuredPython) {
  const venvPython = path.join(
    projectRoot,
    ".venv",
    process.platform === "win32" ? "Scripts\\python.exe" : "bin/python",
  );
  const candidates = [configuredPython, venvPython, "python", "py"].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "python" || candidate === "py" || await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Python executable not found. Create .venv and install scripts/requirements-manuscript-samples.txt.",
  );
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} exited with code ${code}\n${stdout}${stderr}`));
      }
    });
  });
}

async function getLogoWithOpacity(targetWidthPx, opacity, watermarkTheme = WATERMARK_THEME_DEFAULT) {
  const width = Math.max(1, Math.round(targetWidthPx));
  const normalizedOpacity = coerceOpacity(opacity, LOGO_OPACITY_DEFAULT);
  const theme = normalizeWatermarkTheme(watermarkTheme);
  const cacheKey = `${width}:${normalizedOpacity.toFixed(4)}:${theme}`;
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey);
  }

  const result = await sharp(LOGO_PATH)
    .resize({ width, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = result.data;
  const info = result.info;
  const channels = info.channels;
  const alphaChannelIndex = channels - 1;

  for (let pixel = 0; pixel < data.length; pixel += channels) {
    if (theme === "mono" && channels >= 3) {
      const red = data[pixel];
      const green = data[pixel + 1];
      const blue = data[pixel + 2];
      const luminance = Math.round((0.2126 * red) + (0.7152 * green) + (0.0722 * blue));
      data[pixel] = luminance;
      data[pixel + 1] = luminance;
      data[pixel + 2] = luminance;
    }

    data[pixel + alphaChannelIndex] = Math.round(data[pixel + alphaChannelIndex] * normalizedOpacity);
  }

  const logo = await sharp(data, { raw: info }).png().toBuffer();
  logoCache.set(cacheKey, logo);
  return logo;
}

async function getTextWatermarkOverlay({ width, height, text, opacity }) {
  const normalizedOpacity = coerceOpacity(opacity, TEXT_OPACITY_DEFAULT);
  const diagonalColor = `rgba(44, 36, 31, ${normalizedOpacity})`;
  const lineColor = `rgba(44, 36, 31, ${Math.min(normalizedOpacity + 0.07, 0.36)})`;
  const safeText = escapeSvgText(text || WATERMARK_TEXT_DEFAULT);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <text x="50%" y="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="${lineColor}">${safeText}</text>
      <g transform="translate(${width / 2} ${height / 2}) rotate(-28)">
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.055)}" font-weight="800" letter-spacing="5" fill="${diagonalColor}">${safeText}</text>
      </g>
      <text x="50%" y="${height - 16}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="4" fill="${lineColor}">${safeText}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function renderPdfPages({ python, pdfPath, tasks, renderZoom, tempDir }) {
  if (tasks.length === 0) {
    return;
  }

  await fs.mkdir(tempDir, { recursive: true });
  const taskFile = path.join(tempDir, "render-tasks.json");
  await fs.writeFile(taskFile, JSON.stringify(tasks, null, 2));

  const code = String.raw`
import json
import sys

try:
    import fitz
except ImportError as exc:
    raise SystemExit("PyMuPDF is required. Install it with: pip install -r scripts/requirements-manuscript-samples.txt") from exc

pdf_path, task_path, zoom_value = sys.argv[1], sys.argv[2], float(sys.argv[3])
document = fitz.open(pdf_path)
matrix = fitz.Matrix(zoom_value, zoom_value)

with open(task_path, "r", encoding="utf-8") as handle:
    render_tasks = json.load(handle)

for task in render_tasks:
    page_number = int(task["page"])
    if page_number < 1 or page_number > document.page_count:
        raise SystemExit(f"Page {page_number} is outside the PDF page range 1-{document.page_count}")

    page = document.load_page(page_number - 1)
    clip = None
    panel = task.get("panel")
    if panel:
        rect = page.rect
        side = rect.height
        if side > rect.width:
            raise SystemExit(f"Cannot extract {panel} panel from page {page_number}: page is taller than it is wide")
        if panel == "front":
            clip = fitz.Rect(rect.width - side, 0, rect.width, side)
        elif panel == "back":
            clip = fitz.Rect(0, 0, side, side)
        else:
            raise SystemExit(f"Unsupported panel value: {panel}")

    pixmap = page.get_pixmap(matrix=matrix, clip=clip, alpha=False, colorspace=fitz.csRGB)
    pixmap.save(task["tempInput"])
`;

  await runProcess(python, ["-c", code, pdfPath, taskFile, String(renderZoom)]);
}

async function getPdfPageCount({ python, pdfPath }) {
  const code = String.raw`
import fitz
import sys

document = fitz.open(sys.argv[1])
print(document.page_count)
`;

  const { stdout } = await runProcess(python, ["-c", code, pdfPath]);
  const matches = String(stdout).match(/\d+/g) || [];
  const parsed = Number.parseInt(matches.at(-1) || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Could not determine page count for ${relPath(pdfPath)}`);
  }
  return parsed;
}

async function cleanWebpOutputs(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webp"))
      .map((entry) => fs.rm(path.join(outputDir, entry.name), { force: true })),
  );
}

async function scoreInteriorPage(inputFile) {
  const sampleSize = 240;
  const threshold = 242;
  const { data, info } = await sharp(inputFile)
    .rotate()
    .resize({
      width: sampleSize,
      height: sampleSize,
      fit: "contain",
      background: "#ffffff",
    })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const total = width * height;

  const centerLeft = Math.floor(width * 0.2);
  const centerRight = Math.ceil(width * 0.8);
  const centerTop = Math.floor(height * 0.2);
  const centerBottom = Math.ceil(height * 0.8);
  const centerTotal = Math.max(1, (centerRight - centerLeft) * (centerBottom - centerTop));

  let darkPixels = 0;
  let centerDarkPixels = 0;
  let gradientSum = 0;
  let gradientCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const value = data[index];
      const isDark = value < threshold;
      if (isDark) {
        darkPixels += 1;
        if (x >= centerLeft && x < centerRight && y >= centerTop && y < centerBottom) {
          centerDarkPixels += 1;
        }
      }

      if (x + 1 < width) {
        gradientSum += Math.abs(value - data[index + 1]);
        gradientCount += 1;
      }
      if (y + 1 < height) {
        gradientSum += Math.abs(value - data[index + width]);
        gradientCount += 1;
      }
    }
  }

  const inkRatio = darkPixels / total;
  const centerInkRatio = centerDarkPixels / centerTotal;
  const gradientRatio = gradientCount > 0 ? gradientSum / (gradientCount * 255) : 0;

  const idealInk = 0.09;
  const inkScore = Math.max(0, 1 - Math.abs(inkRatio - idealInk) / 0.09);
  const centerScore = Math.max(0, Math.min(1, centerInkRatio / 0.11));
  const edgeScore = Math.max(0, Math.min(1, gradientRatio / 0.16));
  const densityPenalty = inkRatio < 0.015 || inkRatio > 0.24 ? 0.5 : 1;

  return {
    score: (inkScore * 0.6 + centerScore * 0.25 + edgeScore * 0.15) * densityPenalty,
    inkRatio,
    centerInkRatio,
    gradientRatio,
  };
}

function selectBestInteriorPages(candidates, count, minSpacing) {
  const ranked = [...candidates]
    .sort((a, b) => b.score - a.score || a.page - b.page);

  const selected = [];
  for (const candidate of ranked) {
    if (selected.length >= count) break;
    const respectsSpacing = selected.every((entry) => Math.abs(entry.page - candidate.page) >= minSpacing);
    if (respectsSpacing) {
      selected.push(candidate);
    }
  }

  if (selected.length < count) {
    for (const candidate of ranked) {
      if (selected.length >= count) break;
      if (!selected.some((entry) => entry.page === candidate.page)) {
        selected.push(candidate);
      }
    }
  }

  return selected
    .slice(0, count)
    .sort((a, b) => a.page - b.page);
}

async function processLookInside(book, args, python, tempDir, bookWatermarkTheme) {
  if (!book.lookInside) {
    return [];
  }

  const lookInsideConfig = typeof book.lookInside === "object" ? book.lookInside : {};
  const lookInside = { ...LOOK_INSIDE_DEFAULTS, ...lookInsideConfig };
  const lookInsideWatermarkTheme = normalizeWatermarkTheme(
    lookInside.watermarkTheme ?? bookWatermarkTheme,
    `lookInside config for ${book.slug}`,
  );
  const sourcePdf = resolveProjectPath(lookInside.sourcePdf || book.sourcePdf);
  if (!sourcePdf || !await fileExists(sourcePdf)) {
    throw new Error(`Missing Look Inside source PDF for ${book.slug}: ${lookInside.sourcePdf || book.sourcePdf}`);
  }

  const outputDir = resolveProjectPath(lookInside.outputDir);
  const outputSize = coercePositiveNumber(lookInside.outputSize, LOOK_INSIDE_DEFAULTS.outputSize);
  const count = Math.max(1, Math.min(20, Number.parseInt(String(lookInside.count), 10) || LOOK_INSIDE_DEFAULTS.count));
  const minSpacing = Math.max(1, Number.parseInt(String(lookInside.minSpacing), 10) || LOOK_INSIDE_DEFAULTS.minSpacing);
  const scoringRenderZoom = coercePositiveNumber(lookInside.renderZoom, LOOK_INSIDE_DEFAULTS.renderZoom);

  const pageCount = await getPdfPageCount({ python, pdfPath: sourcePdf });
  const rangeStart = Math.max(1, Number.parseInt(String(lookInside.pageRange?.start ?? 1), 10) || 1);
  const rangeEnd = Math.min(pageCount, Number.parseInt(String(lookInside.pageRange?.end ?? pageCount), 10) || pageCount);

  if (rangeStart > rangeEnd) {
    throw new Error(`Invalid Look Inside pageRange for ${book.slug}: start(${rangeStart}) > end(${rangeEnd})`);
  }

  const lookInsideTempDir = path.join(tempDir, "look-inside");
  await fs.mkdir(lookInsideTempDir, { recursive: true });

  const scoreTasks = [];
  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    scoreTasks.push({
      page,
      tempInput: path.join(lookInsideTempDir, `candidate-${String(page).padStart(3, "0")}.png`),
    });
  }

  await renderPdfPages({
    python,
    pdfPath: sourcePdf,
    tasks: scoreTasks,
    renderZoom: scoringRenderZoom,
    tempDir: lookInsideTempDir,
  });

  const scoredPages = [];
  for (const task of scoreTasks) {
    const metrics = await scoreInteriorPage(task.tempInput);
    scoredPages.push({ page: task.page, inputFile: task.tempInput, ...metrics });
  }

  const selected = selectBestInteriorPages(scoredPages, count, minSpacing);
  if (selected.length === 0) {
    throw new Error(`Could not select Look Inside pages for ${book.slug}`);
  }

  if (args.clean) {
    await cleanWebpOutputs(outputDir);
  }

  const manifest = [];
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const outputFile = path.join(outputDir, `${String(index + 1).padStart(2, "0")}.webp`);
    const info = await writeOutputWebp({
      inputFile: item.inputFile,
      outputFile,
      outputSize,
      watermark: lookInside.watermark || "logo",
      watermarkText: lookInside.watermarkText,
      watermarkWidthRatio: lookInside.watermarkWidthRatio,
      watermarkOpacity: lookInside.watermarkOpacity,
      watermarkTheme: lookInsideWatermarkTheme,
    });

    manifest.push({ output: publicSrc(outputFile), page: item.page, score: item.score.toFixed(3) });
    console.log(`  LOOK ${path.basename(outputFile)} <- page ${item.page}  score=${item.score.toFixed(3)}  ${info.width}x${info.height}`);
  }

  await fs.rm(lookInsideTempDir, { recursive: true, force: true });
  return manifest;
}

async function writeOutputWebp({ inputFile, outputFile, outputSize, watermark, watermarkText, watermarkWidthRatio, watermarkOpacity, watermarkTheme }) {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  const baseBuffer = await sharp(inputFile)
    .rotate()
    .resize({
      width: outputSize,
      height: outputSize,
      fit: "contain",
      background: "#ffffff",
    })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();

  const watermarkMode = normalizeWatermark(watermark);
  const overlays = [];

  if (watermarkMode === "logo") {
    const ratio = coercePositiveNumber(watermarkWidthRatio, LOGO_WIDTH_RATIO_DEFAULT);
    const opacity = coerceOpacity(watermarkOpacity, LOGO_OPACITY_DEFAULT);
    const logoWidth = Math.min(outputSize, outputSize * ratio);
    const logo = await getLogoWithOpacity(logoWidth, opacity, watermarkTheme);
    overlays.push({ input: logo, gravity: "center" });
  }

  if (watermarkMode === "text") {
    const overlay = await getTextWatermarkOverlay({
      width: outputSize,
      height: outputSize,
      text: watermarkText || WATERMARK_TEXT_DEFAULT,
      opacity: coerceOpacity(watermarkOpacity, TEXT_OPACITY_DEFAULT),
    });
    overlays.push({ input: overlay, gravity: "center" });
  }

  const writer = sharp(baseBuffer);
  if (overlays.length > 0) {
    writer.composite(overlays);
  }

  const info = await writer.webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(outputFile);

  return info;
}

async function processBook(book, args, python) {
  const outputDir = resolveProjectPath(book.outputDir);
  const outputSize = book.outputSize ?? 1400;
  const renderZoom = book.renderZoom ?? 2.35;
  const tempDir = path.join(TEMP_ROOT, book.slug);
  const bookWatermarkTheme = normalizeWatermarkTheme(book.watermarkTheme, `book ${book.slug}`);

  if (args.clean && !args.lookInsideOnly) {
    await cleanWebpOutputs(outputDir);
  }

  const pdfTaskGroups = new Map();
  const usedSourcePdfs = new Set();
  const planned = [];

  function sourcePdfForAsset(asset) {
    const configuredSource = asset.sourcePdf || (asset.type === "pdf-panel" ? book.coverPdf : book.sourcePdf);
    return configuredSource ? resolveProjectPath(configuredSource) : "";
  }

  function queuePdfTask(pdfPath, task) {
    if (!pdfTaskGroups.has(pdfPath)) {
      pdfTaskGroups.set(pdfPath, []);
    }
    pdfTaskGroups.get(pdfPath).push(task);
    usedSourcePdfs.add(pdfPath);
  }

  if (!args.lookInsideOnly) {
    for (const asset of book.assets) {
      const outputFile = path.join(outputDir, asset.output);
      if (asset.type === "pdf-page" || asset.type === "pdf-panel") {
        const pdfPath = sourcePdfForAsset(asset);
        if (!pdfPath || !await fileExists(pdfPath)) {
          throw new Error(`Missing source PDF for ${book.slug}: ${asset.sourcePdf || (asset.type === "pdf-panel" ? book.coverPdf : book.sourcePdf)}`);
        }
        const tempInput = path.join(tempDir, asset.output.replace(/\.webp$/i, ".png"));
        queuePdfTask(pdfPath, { page: asset.page, panel: asset.panel, tempInput });
        planned.push({ ...asset, inputFile: tempInput, outputFile });
      } else if (asset.type === "image") {
        const inputFile = resolveProjectPath(asset.source);
        if (!await fileExists(inputFile)) {
          throw new Error(`Missing source image for ${book.slug}: ${asset.source}`);
        }
        planned.push({ ...asset, inputFile, outputFile });
      } else {
        throw new Error(`Unsupported asset type for ${book.slug}: ${asset.type}`);
      }
    }
  }

  for (const [pdfPath, tasks] of pdfTaskGroups) {
    await renderPdfPages({ python, pdfPath, tasks, renderZoom, tempDir });
  }

  console.log(`\n${book.slug}`);
  const manifest = [];
  if (!args.lookInsideOnly) {
    for (const asset of planned) {
      const info = await writeOutputWebp({
        inputFile: asset.inputFile,
        outputFile: asset.outputFile,
        outputSize,
        watermark: asset.watermark,
        watermarkText: asset.watermarkText,
        watermarkWidthRatio: asset.watermarkWidthRatio,
        watermarkOpacity: asset.watermarkOpacity,
        watermarkTheme: normalizeWatermarkTheme(asset.watermarkTheme ?? bookWatermarkTheme, `asset ${asset.output} in ${book.slug}`),
      });
      manifest.push({ output: publicSrc(asset.outputFile), page: asset.page ?? null });
      console.log(`  OK ${path.basename(asset.outputFile)} ${info.width}x${info.height} ${(info.size / 1024).toFixed(1)} KB`);
    }
  }

  const lookInsideManifest = await processLookInside(book, args, python, tempDir, bookWatermarkTheme);

  if (lookInsideManifest.length > 0) {
    console.log("  look-inside paths:");
    for (const item of lookInsideManifest) {
      console.log(`    ${item.output}  (PDF page ${item.page}, score ${item.score})`);
    }
  }

  await fs.rm(tempDir, { recursive: true, force: true });

  if (args.deleteSource) {
    for (const pdfPath of usedSourcePdfs) {
      await fs.rm(pdfPath, { force: true });
      console.log(`  deleted ${relPath(pdfPath)}`);
    }
  }

  if (manifest.length > 0) {
    console.log("  sample paths:");
    for (const item of manifest) {
      console.log(`    ${item.output}${item.page ? `  (PDF page ${item.page})` : ""}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.access(LOGO_PATH).catch(() => {
    throw new Error("Missing logo file: public/images/brand/logo-mark-transparent.png");
  });

  const selectedBooks = args.book === "all"
    ? manuscriptSampleBooks
    : manuscriptSampleBooks.filter((book) => book.slug === args.book);

  if (selectedBooks.length === 0) {
    throw new Error(`No manuscript sample config found for: ${args.book}`);
  }

  const needsPdf = selectedBooks.some((book) =>
    book.assets.some((asset) => asset.type === "pdf-page" || asset.type === "pdf-panel") || Boolean(book.lookInside),
  );
  const python = needsPdf ? await getPythonExecutable(args.python) : "";

  for (const book of selectedBooks) {
    await processBook(book, args, python);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});