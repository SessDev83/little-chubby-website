#!/usr/bin/env node
/**
 * generate-mini-book.mjs
 * Generates a branded PDF mini coloring book from selected Free Images.
 *
 * Usage:
 *   node scripts/generate-mini-book.mjs
 *   node scripts/generate-mini-book.mjs --output public/downloads/mini-coloring-book.pdf
 *
 * Requires: pdf-lib, sharp (devDeps)
 */

import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const FREE_IMAGES = path.join(ROOT, "Free Images");
const DEFAULT_OUTPUT = path.join(ROOT, "public", "downloads", "mini-coloring-book.pdf");

// ── 10 curated images covering all categories ──────────────
const SELECTED_IMAGES = [
  { file: "Animal & Nature Togheter/Image1.png", label: "Animals & Nature" },
  { file: "Astronauts-space/Image1.png",          label: "Space Adventures" },
  { file: "Dinausor/Image1.png",                   label: "Dinosaurs" },
  { file: "Food & Drink togheter/Image1.png",     label: "Food & Drinks" },
  { file: "Jobs/Image1.png",                       label: "Dream Jobs" },
  { file: "Kids Favorites (Toys, Fun & Fantasy)/Image1.png", label: "Toys & Fantasy" },
  { file: "Machine & Site/Image1.png",             label: "Machines" },
  { file: "Mini Scenes/Image1.png",                label: "Mini Scenes" },
  { file: "Animal & Nature Togheter/Image2.png",  label: "Nature Friends" },
  { file: "Astronauts-space/Image2.png",           label: "Blast Off!" },
];

// Brand colors
const GOLD    = rgb(211 / 255, 164 / 255, 66 / 255);   // #d3a442
const BROWN   = rgb(117 / 255, 70 / 255, 36 / 255);    // #754624
const CREAM   = rgb(246 / 255, 241 / 255, 231 / 255);   // #f6f1e7
const INK     = rgb(47 / 255, 38 / 255, 31 / 255);     // #2f261f

// US Letter in points (612 x 792)
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36; // 0.5 inch

async function embedImage(pdfDoc, filePath) {
  const buf = await sharp(filePath)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return pdfDoc.embedPng(buf);
}

async function main() {
  const outputArg = process.argv.find((a) => a.startsWith("--output="));
  const outputPath = outputArg ? outputArg.split("=")[1] : DEFAULT_OUTPUT;

  console.log("📖 Generating Little Chubby Press Mini Coloring Book...\n");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Mini Coloring Book — Little Chubby Press");
  pdfDoc.setAuthor("Little Chubby Press");
  pdfDoc.setSubject("Free coloring pages for kids");
  pdfDoc.setCreator("Little Chubby Press");

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── COVER PAGE ─────────────────────────────────────
  const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Background
  cover.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: CREAM,
  });

  // Gold accent bar at top
  cover.drawRectangle({
    x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80,
    color: GOLD,
  });

  // Try to embed logo
  const logoPath = path.join(ROOT, "public", "images", "brand", "logo-mark.png");
  if (fs.existsSync(logoPath)) {
    const logoBuf = await sharp(logoPath).resize(120, 120, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const logoImg = await pdfDoc.embedPng(logoBuf);
    cover.drawImage(logoImg, {
      x: (PAGE_W - 120) / 2,
      y: PAGE_H - 240,
      width: 120,
      height: 120,
    });
  }

  // Title
  const title1 = "Mini Coloring Book";
  const t1w = fontBold.widthOfTextAtSize(title1, 36);
  cover.drawText(title1, {
    x: (PAGE_W - t1w) / 2,
    y: PAGE_H - 300,
    size: 36,
    font: fontBold,
    color: BROWN,
  });

  // Subtitle
  const subtitle = "10 Free Coloring Pages for Your Little Ones!";
  const stw = fontRegular.widthOfTextAtSize(subtitle, 16);
  cover.drawText(subtitle, {
    x: (PAGE_W - stw) / 2,
    y: PAGE_H - 340,
    size: 16,
    font: fontRegular,
    color: INK,
  });

  // Spanish subtitle
  const subtitleEs = "10 Láminas para Colorear Gratis para tus Peques!";
  const stew = fontRegular.widthOfTextAtSize(subtitleEs, 14);
  cover.drawText(subtitleEs, {
    x: (PAGE_W - stew) / 2,
    y: PAGE_H - 365,
    size: 14,
    font: fontRegular,
    color: INK,
  });

  // Brand name
  const brand = "Little Chubby Press";
  const bw = fontBold.widthOfTextAtSize(brand, 20);
  cover.drawText(brand, {
    x: (PAGE_W - bw) / 2,
    y: PAGE_H - 430,
    size: 20,
    font: fontBold,
    color: GOLD,
  });

  // Tagline
  const tagline = "Coloring books created by kids, for kids";
  const tw = fontRegular.widthOfTextAtSize(tagline, 12);
  cover.drawText(tagline, {
    x: (PAGE_W - tw) / 2,
    y: PAGE_H - 455,
    size: 12,
    font: fontRegular,
    color: INK,
  });

  // Website URL at bottom
  const url = "www.littlechubbypress.com";
  const uw = fontRegular.widthOfTextAtSize(url, 11);
  cover.drawText(url, {
    x: (PAGE_W - uw) / 2,
    y: MARGIN + 10,
    size: 11,
    font: fontRegular,
    color: GOLD,
  });

  // ── COLORING PAGES ─────────────────────────────────
  for (let i = 0; i < SELECTED_IMAGES.length; i++) {
    const { file, label } = SELECTED_IMAGES[i];
    const filePath = path.join(FREE_IMAGES, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Skipping (not found): ${file}`);
      continue;
    }

    console.log(`  📄 Page ${i + 1}: ${label} — ${file}`);

    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    // White background
    page.drawRectangle({
      x: 0, y: 0, width: PAGE_W, height: PAGE_H,
      color: rgb(1, 1, 1),
    });

    // Embed the coloring image
    const img = await embedImage(pdfDoc, filePath);
    const imgDims = img.scaleToFit(PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2 - 50);

    page.drawImage(img, {
      x: (PAGE_W - imgDims.width) / 2,
      y: (PAGE_H - imgDims.height) / 2 + 15,
      width: imgDims.width,
      height: imgDims.height,
    });

    // Page number and label at bottom
    const pageNum = `${i + 1} / ${SELECTED_IMAGES.length}`;
    const pnw = fontRegular.widthOfTextAtSize(pageNum, 9);
    page.drawText(pageNum, {
      x: PAGE_W - MARGIN - pnw,
      y: MARGIN - 5,
      size: 9,
      font: fontRegular,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Label at bottom-left
    page.drawText(label, {
      x: MARGIN,
      y: MARGIN - 5,
      size: 9,
      font: fontRegular,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Tiny brand at bottom-center
    const miniB = "littlechubbypress.com";
    const mbw = fontRegular.widthOfTextAtSize(miniB, 7);
    page.drawText(miniB, {
      x: (PAGE_W - mbw) / 2,
      y: MARGIN - 5,
      size: 7,
      font: fontRegular,
      color: rgb(0.8, 0.8, 0.8),
    });
  }

  // ── BACK COVER ─────────────────────────────────────
  const back = pdfDoc.addPage([PAGE_W, PAGE_H]);

  back.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: CREAM,
  });

  // Gold bar at bottom
  back.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: 80,
    color: GOLD,
  });

  // Thank you message
  const thanks = "Thank You for Coloring With Us!";
  const thankW = fontBold.widthOfTextAtSize(thanks, 26);
  back.drawText(thanks, {
    x: (PAGE_W - thankW) / 2,
    y: PAGE_H - 200,
    size: 26,
    font: fontBold,
    color: BROWN,
  });

  const thanksEs = "¡Gracias por Colorear Con Nosotros!";
  const thankEsW = fontBold.widthOfTextAtSize(thanksEs, 22);
  back.drawText(thanksEs, {
    x: (PAGE_W - thankEsW) / 2,
    y: PAGE_H - 240,
    size: 22,
    font: fontBold,
    color: BROWN,
  });

  // CTA lines
  const cta = [
    "Want more coloring pages? Visit our Coloring Corner!",
    "¿Quieres más láminas? ¡Visita nuestro Rincón para Colorear!",
    "",
    "www.littlechubbypress.com/en/coloring-corner/",
    "",
    "Subscribe to our newsletter for daily fun facts & jokes",
    "Suscríbete al newsletter para datos curiosos y chistes diarios",
    "",
    "Follow us on Instagram, Facebook & Bluesky",
    "@LittleChubbyPress",
  ];

  let cy = PAGE_H - 310;
  for (const line of cta) {
    const sz = line.startsWith("www.") || line.startsWith("@") ? 13 : 12;
    const f = line.startsWith("www.") || line.startsWith("@") ? fontBold : fontRegular;
    const c = line.startsWith("www.") || line.startsWith("@") ? GOLD : INK;
    const lw = f.widthOfTextAtSize(line, sz);
    if (line) {
      back.drawText(line, {
        x: (PAGE_W - lw) / 2,
        y: cy,
        size: sz,
        font: f,
        color: c,
      });
    }
    cy -= 22;
  }

  // Save
  const pdfBytes = await pdfDoc.save();
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, pdfBytes);

  const sizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Mini coloring book generated: ${outputPath}`);
  console.log(`   Pages: ${pdfDoc.getPageCount()} (cover + ${SELECTED_IMAGES.length} coloring pages + back cover)`);
  console.log(`   Size: ${sizeMB} MB`);
}

main().catch((err) => {
  console.error("❌ Error generating mini book:", err);
  process.exit(1);
});
