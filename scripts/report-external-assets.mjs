import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const booksHtmlPath = path.join(projectRoot, "dist", "es", "books", "index.html");

const extractExternalUrls = (html) => {
  const urls = new Set();
  const regex = /(src|href)=["']([^"']+)["']/gi;
  let match = regex.exec(html);

  while (match) {
    const value = match[2].trim();
    if (value.startsWith("https://")) {
      urls.add(value);
    }
    match = regex.exec(html);
  }

  return [...urls];
};

const getSizeFromHead = async (url) => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return { ok: false, status: response.status, length: 0 };
    }

    const length = Number.parseInt(response.headers.get("content-length") || "0", 10);
    return {
      ok: true,
      status: response.status,
      length: Number.isFinite(length) ? length : 0,
      type: response.headers.get("content-type") || ""
    };
  } catch {
    return { ok: false, status: 0, length: 0 };
  }
};

const getFontsPayload = async (cssUrl) => {
  try {
    const cssResponse = await fetch(cssUrl, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });

    if (!cssResponse.ok) {
      return {
        cssBytes: 0,
        fontBytes: 0,
        fontFileCount: 0,
        fontUrls: []
      };
    }

    const cssText = await cssResponse.text();
    const cssBytes = Buffer.byteLength(cssText, "utf8");
    const fontUrls = [...new Set((cssText.match(/https:\/\/fonts\.gstatic\.com\/[^)\"\s]+/g) || []))];

    let fontBytes = 0;
    for (const url of fontUrls) {
      const info = await getSizeFromHead(url);
      fontBytes += info.length;
    }

    return {
      cssBytes,
      fontBytes,
      fontFileCount: fontUrls.length,
      fontUrls
    };
  } catch {
    return {
      cssBytes: 0,
      fontBytes: 0,
      fontFileCount: 0,
      fontUrls: []
    };
  }
};

const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const main = async () => {
  const html = await fs.readFile(booksHtmlPath, "utf8");
  const allExternal = extractExternalUrls(html);

  const coverUrls = allExternal.filter((url) => url.includes("images-na.ssl-images-amazon.com/images/P/"));
  const fontUrls = allExternal.filter((url) => url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com"));
  const googleStylesheetUrls = allExternal.filter((url) => url.includes("fonts.googleapis.com/css"));

  let coverTotal = 0;
  const coverRows = [];

  for (const url of coverUrls) {
    const info = await getSizeFromHead(url);
    coverRows.push({ url, ...info });
    coverTotal += info.length;
  }

  let fontHeadTotal = 0;
  const fontRows = [];

  for (const url of fontUrls) {
    const info = await getSizeFromHead(url);
    fontRows.push({ url, ...info });
    fontHeadTotal += info.length;
  }

  let fontCssTotal = 0;
  let fontWoffTotal = 0;
  let fontFileCount = 0;
  const fontPayloadRows = [];

  for (const cssUrl of googleStylesheetUrls) {
    const payload = await getFontsPayload(cssUrl);
    fontCssTotal += payload.cssBytes;
    fontWoffTotal += payload.fontBytes;
    fontFileCount += payload.fontFileCount;
    fontPayloadRows.push({
      cssUrl,
      cssBytes: payload.cssBytes,
      fontBytes: payload.fontBytes,
      fontFileCount: payload.fontFileCount,
      fontUrls: payload.fontUrls
    });
  }

  console.log("EXTERNAL ASSET REPORT (/es/books)");
  console.log(`- external URLs found: ${allExternal.length}`);
  console.log(`- amazon cover URLs: ${coverUrls.length}`);
  console.log(`- font URLs: ${fontUrls.length}`);
  console.log(`- amazon covers total (head content-length): ${formatKB(coverTotal)}`);
  console.log(`- fonts total (head content-length): ${formatKB(fontHeadTotal)}`);
  console.log(`- fonts CSS payload (real): ${formatKB(fontCssTotal)}`);
  console.log(`- fonts WOFF payload (real): ${formatKB(fontWoffTotal)} across ${fontFileCount} files`);

  const outputPath = path.join(projectRoot, "dist", "external-asset-report.json");
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        page: "/es/books/",
        allExternal,
        coverRows,
        fontRows,
        fontPayloadRows,
        totals: {
          coverTotal,
          fontHeadTotal,
          fontCssTotal,
          fontWoffTotal,
          fontFileCount
        }
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`- detailed JSON: ${path.relative(projectRoot, outputPath).replace(/\\/g, "/")}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
