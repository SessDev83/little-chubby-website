import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const WIDTH = 800;
const HEIGHT = 800;
const QUALITY = 80;

/** Map of raw source files → output names, grouped by book */
const samples = [
  {
    bookId: "awesome-girls",
    srcDir: path.join(projectRoot, "Raw awesome girls revie muestra"),
    outDir: path.join(projectRoot, "public", "images", "gallery", "awesome-girls"),
    files: [
      { src: "20260417_233954.jpg", out: "cover.webp" },
      { src: "20260417_234005.jpg", out: "interior-1.webp" },
      { src: "20260417_234018.jpg", out: "interior-2.webp" },
    ],
  },
];

async function processBook(book) {
  await fs.mkdir(book.outDir, { recursive: true });
  console.log(`\n📚 ${book.bookId}`);

  for (const file of book.files) {
    const input = path.join(book.srcDir, file.src);
    const output = path.join(book.outDir, file.out);

    try {
      await fs.access(input);
    } catch {
      console.error(`  ✗ Source not found: ${file.src}`);
      continue;
    }

    const info = await sharp(input)
      .rotate()  // auto-rotate based on EXIF orientation
      .resize({ width: WIDTH, height: HEIGHT, fit: "cover", position: "centre" })
      .webp({ quality: QUALITY })
      .toFile(output);

    const sizeKB = (info.size / 1024).toFixed(1);
    console.log(`  ✓ ${file.out}  ${info.width}×${info.height}  ${sizeKB} KB`);
  }
}

(async () => {
  console.log("🖼️  Preparing gallery sample images…");
  for (const book of samples) {
    await processBook(book);
  }
  console.log("\n✅ Done!");
})();
