import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");

const toPosix = (value) => value.replace(/\\/g, "/");

const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const getFileSize = async (absolutePath) => {
  const buffer = await fs.readFile(absolutePath);
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    br: brotliCompressSync(buffer).length
  };
};

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(absolute)));
    } else {
      results.push(absolute);
    }
  }
  return results;
};

const extractLocalAssets = (html) => {
  const assets = new Set();
  const regex = /(src|href)=["']([^"']+)["']/gi;
  let match = regex.exec(html);

  while (match) {
    const value = match[2].trim();
    if (value.startsWith("/") && !value.startsWith("//")) {
      assets.add(value);
    }
    match = regex.exec(html);
  }

  return [...assets];
};

const main = async () => {
  const allFiles = await walk(distRoot);
  const htmlFiles = allFiles
    .filter((absolute) => absolute.endsWith("index.html"))
    .sort((a, b) => toPosix(a).localeCompare(toPosix(b)));

  const rows = [];

  for (const htmlFile of htmlFiles) {
    const html = await fs.readFile(htmlFile, "utf8");
    const htmlBytes = Buffer.byteLength(html, "utf8");
    const htmlGzip = gzipSync(Buffer.from(html, "utf8"), { level: 9 }).length;
    const htmlBr = brotliCompressSync(Buffer.from(html, "utf8")).length;

    const assets = extractLocalAssets(html)
      .map((assetPath) => path.join(distRoot, assetPath.replace(/^\//, "")))
      .filter((absolute) => allFiles.includes(absolute));

    let assetRaw = 0;
    let assetGzip = 0;
    let assetBr = 0;

    for (const assetFile of assets) {
      const sizes = await getFileSize(assetFile);
      assetRaw += sizes.raw;
      assetGzip += sizes.gzip;
      assetBr += sizes.br;
    }

    const totalRaw = htmlBytes + assetRaw;
    const totalGzip = htmlGzip + assetGzip;
    const totalBr = htmlBr + assetBr;

    rows.push({
      page: `/${toPosix(path.relative(distRoot, htmlFile)).replace(/index\.html$/, "")}`,
      htmlRaw: htmlBytes,
      htmlGzip,
      htmlBr,
      assetRaw,
      assetGzip,
      assetBr,
      totalRaw,
      totalGzip,
      totalBr,
      assetCount: assets.length
    });
  }

  const byWeight = [...rows].sort((a, b) => b.totalRaw - a.totalRaw);

  console.log("PAGE WEIGHT REPORT (local assets only)");
  console.log("");
  console.log("Top pages by total raw bytes:");

  for (const row of byWeight.slice(0, 12)) {
    console.log(
      `${row.page.padEnd(58)} raw=${formatKB(row.totalRaw).padStart(10)} gzip=${formatKB(row.totalGzip).padStart(10)} br=${formatKB(row.totalBr).padStart(10)} assets=${String(row.assetCount).padStart(2)}`
    );
  }

  const summary = {
    pages: rows.length,
    heaviestRaw: byWeight[0],
    medianRaw: [...rows].sort((a, b) => a.totalRaw - b.totalRaw)[Math.floor(rows.length / 2)]
  };

  console.log("");
  console.log("Summary:");
  console.log(`- pages analyzed: ${summary.pages}`);
  console.log(`- heaviest page: ${summary.heaviestRaw.page} (${formatKB(summary.heaviestRaw.totalRaw)} raw)`);
  console.log(`- median page: ${summary.medianRaw.page} (${formatKB(summary.medianRaw.totalRaw)} raw)`);

  const outputPath = path.join(projectRoot, "dist", "page-weight-report.json");
  await fs.writeFile(outputPath, JSON.stringify(rows, null, 2), "utf8");
  console.log(`- detailed JSON: ${toPosix(path.relative(projectRoot, outputPath))}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
