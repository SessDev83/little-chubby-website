#!/usr/bin/env node
/**
 * upload-free-artworks.mjs
 * Reads images from Free Images/ folders, optimizes with sharp, uploads to
 * Supabase Storage bucket "free-artworks", and inserts metadata into the
 * free_artworks table.
 *
 * Usage:
 *   node scripts/upload-free-artworks.mjs
 *   node scripts/upload-free-artworks.mjs --dry-run
 *
 * Environment:
 *   SUPABASE_URL (or PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Requires: sharp (devDep), @supabase/supabase-js (dep)
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const FREE_IMAGES = path.join(ROOT, "Free Images");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Category mapping: folder name → slug ──────────────────
const CATEGORY_MAP = {
  "Animal & Nature Togheter": "animal-nature",
  "Astronauts-space": "space",
  "Basic elements": "basic",
  "Dinausor": "dinosaur",
  "Food & Drink togheter": "food-drink",
  "Jobs": "jobs",
  "Kids Favorites (Toys, Fun & Fantasy)": "kids-favorites",
  "Machine & Site": "machines",
  "Mini Scenes": "mini-scenes",
};

// ── Category display names ────────────────────────────────
const CATEGORY_TITLES = {
  "animal-nature": { es: "Animales y Naturaleza", en: "Animals & Nature" },
  "space": { es: "Espacio", en: "Space Adventures" },
  "basic": { es: "Elementos Basicos", en: "Basic Elements" },
  "dinosaur": { es: "Dinosaurios", en: "Dinosaurs" },
  "food-drink": { es: "Comida y Bebida", en: "Food & Drinks" },
  "jobs": { es: "Profesiones", en: "Dream Jobs" },
  "kids-favorites": { es: "Favoritos", en: "Kids Favorites" },
  "machines": { es: "Maquinas", en: "Machines" },
  "mini-scenes": { es: "Mini Escenas", en: "Mini Scenes" },
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    process.exit(1);
  }
  return createClient(url, key);
}

async function processImage(filePath, destPrefix) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const safeName = fileName.replace(/\s+/g, "-").toLowerCase();

  // Full size (1200px max, high quality PNG for coloring)
  const fullBuf = await sharp(filePath)
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .png({ quality: 90 })
    .toBuffer();

  // Thumbnail (400px, lower quality for gallery grid)
  const thumbBuf = await sharp(filePath)
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .png({ quality: 75 })
    .toBuffer();

  const fullPath = `${destPrefix}/${safeName}.png`;
  const thumbPath = `${destPrefix}/thumb-${safeName}.png`;

  return { fullBuf, thumbBuf, fullPath, thumbPath, safeName };
}

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no uploads\n" : "📤 Uploading free artworks to Supabase...\n");

  const supabase = DRY_RUN ? null : getSupabase();
  const folders = fs.readdirSync(FREE_IMAGES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalUploaded = 0;
  let totalSkipped = 0;
  let sortOrder = 0;

  for (const folder of folders) {
    const category = CATEGORY_MAP[folder];
    if (!category) {
      console.log(`  ⚠ Skipping unknown folder: ${folder}`);
      continue;
    }

    const titles = CATEGORY_TITLES[category] || { es: category, en: category };
    const folderPath = path.join(FREE_IMAGES, folder);
    const files = fs.readdirSync(folderPath)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort();

    console.log(`📁 ${folder} → ${category} (${files.length} images)`);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const baseName = path.basename(file, path.extname(file)).replace(/\s+/g, "-").toLowerCase();
      sortOrder++;

      try {
        const { fullBuf, thumbBuf, fullPath, thumbPath } = await processImage(filePath, category);

        if (DRY_RUN) {
          const fullKB = (fullBuf.length / 1024).toFixed(0);
          const thumbKB = (thumbBuf.length / 1024).toFixed(0);
          console.log(`  📄 ${file} → full: ${fullKB}KB, thumb: ${thumbKB}KB, path: ${fullPath}`);
          totalUploaded++;
          continue;
        }

        // Check if already exists in DB
        const { data: existing } = await supabase
          .from("free_artworks")
          .select("id")
          .eq("image_path", fullPath)
          .maybeSingle();

        if (existing) {
          console.log(`  ⏭ Already exists: ${fullPath}`);
          totalSkipped++;
          continue;
        }

        // Upload full image
        const { error: fullErr } = await supabase.storage
          .from("free-artworks")
          .upload(fullPath, fullBuf, { contentType: "image/png", upsert: true });
        if (fullErr) throw new Error(`Upload full failed: ${fullErr.message}`);

        // Upload thumbnail
        const { error: thumbErr } = await supabase.storage
          .from("free-artworks")
          .upload(thumbPath, thumbBuf, { contentType: "image/png", upsert: true });
        if (thumbErr) throw new Error(`Upload thumb failed: ${thumbErr.message}`);

        // Insert metadata
        const titleNum = baseName.replace(/[^0-9]/g, "") || String(sortOrder);
        const { error: dbErr } = await supabase
          .from("free_artworks")
          .insert({
            title_es: `${titles.es} #${titleNum}`,
            title_en: `${titles.en} #${titleNum}`,
            category,
            image_path: fullPath,
            thumbnail_path: thumbPath,
            active: true,
            sort_order: sortOrder,
          });
        if (dbErr) throw new Error(`DB insert failed: ${dbErr.message}`);

        console.log(`  ✅ ${file} → ${fullPath}`);
        totalUploaded++;
      } catch (err) {
        console.error(`  ❌ ${file}: ${err.message}`);
      }
    }
  }

  console.log(`\n${DRY_RUN ? "🔍 Would upload" : "✅ Uploaded"}: ${totalUploaded} images`);
  if (totalSkipped > 0) console.log(`⏭ Skipped (already exist): ${totalSkipped}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
