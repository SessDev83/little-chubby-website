import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const defaults = {
  queuePath: path.join(projectRoot, "scripts", "book-covers.queue.json"),
  outputDir: path.join(projectRoot, "public", "images", "books"),
  size: 600,
  quality: 82,
  format: "webp",
  fit: "contain",
  background: "#fffdf8"
};

const args = process.argv.slice(2);

const readArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const parseIntArg = (name, fallback) => {
  const value = readArg(name);
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const options = {
  queuePath: readArg("--queue") ? path.resolve(projectRoot, readArg("--queue")) : defaults.queuePath,
  outputDir: readArg("--output") ? path.resolve(projectRoot, readArg("--output")) : defaults.outputDir,
  size: parseIntArg("--size", defaults.size),
  quality: parseIntArg("--quality", defaults.quality),
  format: (readArg("--format") || defaults.format).toLowerCase(),
  fit: (readArg("--fit") || defaults.fit).toLowerCase(),
  background: readArg("--bg") || defaults.background,
  id: readArg("--id"),
  source: readArg("--source")
};

if (!["webp", "jpeg", "jpg", "png", "avif"].includes(options.format)) {
  console.error("Formato no soportado. Usa webp, jpeg, jpg, png o avif.");
  process.exit(1);
}

if (!["contain", "cover", "fill", "inside", "outside"].includes(options.fit)) {
  console.error("Fit no soportado. Usa contain, cover, fill, inside u outside.");
  process.exit(1);
}

const normalizeId = (value) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const getJobs = async () => {
  if (options.id || options.source) {
    if (!options.id || !options.source) {
      console.error("Para modo individual debes pasar --id y --source.");
      process.exit(1);
    }

    return [{
      id: normalizeId(options.id),
      source: options.source
    }];
  }

  const rawQueue = await fs.readFile(options.queuePath, "utf8");
  const parsed = JSON.parse(rawQueue);

  if (!Array.isArray(parsed)) {
    console.error("El archivo de cola debe ser un arreglo JSON.");
    process.exit(1);
  }

  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") {
      console.error("Entrada invalida en cola.");
      process.exit(1);
    }

    if (!entry.id || !entry.source) {
      console.error("Cada entrada debe incluir id y source.");
      process.exit(1);
    }

    return {
      id: normalizeId(String(entry.id)),
      source: String(entry.source)
    };
  });
};

const loadBuffer = async (source) => {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`No se pudo descargar imagen: ${source} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const absolutePath = path.isAbsolute(source) ? source : path.resolve(projectRoot, source);
  return fs.readFile(absolutePath);
};

const extension = options.format === "jpg" ? "jpg" : options.format;

const writeImage = async ({ id, source }) => {
  const buffer = await loadBuffer(source);
  const outputPath = path.join(options.outputDir, `${id}.${extension}`);

  const resized = sharp(buffer)
    .rotate()
    .resize(options.size, options.size, {
      fit: options.fit,
      background: options.background
    });

  if (options.format === "webp") {
    await resized.webp({ quality: options.quality }).toFile(outputPath);
  } else if (options.format === "jpeg" || options.format === "jpg") {
    await resized.jpeg({ quality: options.quality, mozjpeg: true }).toFile(outputPath);
  } else if (options.format === "png") {
    await resized.png({ compressionLevel: 9 }).toFile(outputPath);
  } else if (options.format === "avif") {
    await resized.avif({ quality: Math.max(30, Math.min(80, options.quality)) }).toFile(outputPath);
  }

  const relativeOutput = path.relative(projectRoot, outputPath).replace(/\\/g, "/");
  console.log(`OK  ${id} -> ${relativeOutput}`);
  console.log(`    coverSrc recomendado: /images/books/${id}.${extension}`);
};

const main = async () => {
  const jobs = await getJobs();

  if (!jobs.length) {
    console.log("No hay portadas para procesar.");
    return;
  }

  await fs.mkdir(options.outputDir, { recursive: true });

  console.log(`Procesando ${jobs.length} portada(s) a ${options.size}x${options.size}, formato ${extension}...`);

  for (const job of jobs) {
    await writeImage(job);
  }

  console.log("Listo. Puedes ejecutar npm run build para validar.");
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
