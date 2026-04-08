const decodeHtml = (value) => {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
};

const normalizeSpace = (value) => value.replace(/\s+/g, " ").trim();

const extractAsin = (value) => {
  const match = value.match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
};

const extractByRegex = (text, regex) => {
  const match = text.match(regex);
  return match ? match[1] : null;
};

const getCanonicalUrl = (asin) => `https://www.amazon.com/dp/${asin}`;

const parseTitle = (html) => {
  const productTitle = extractByRegex(html, /<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i);
  if (productTitle) {
    return normalizeSpace(decodeHtml(productTitle));
  }

  const ogTitle = extractByRegex(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (ogTitle) {
    return normalizeSpace(decodeHtml(ogTitle));
  }

  const titleTag = extractByRegex(html, /<title>([\s\S]*?)<\/title>/i);
  if (titleTag) {
    return normalizeSpace(decodeHtml(titleTag.replace(/\s*-\s*Amazon\.com.*$/i, "")));
  }

  return null;
};

const parseImage = (html) => {
  const ogImage = extractByRegex(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImage && /m\.media-amazon\.com\/images\/I\//.test(ogImage)) {
    return ogImage;
  }

  const hiRes = extractByRegex(html, /"hiRes"\s*:\s*"([^"\n]*m\\.media-amazon\\.com[^"\n]*)"/i);
  if (hiRes) {
    return hiRes.replace(/\\\//g, "/");
  }

  const genericImage = extractByRegex(html, /(https:\/\/m\.media-amazon\.com\/images\/I\/[^"\s]+\.jpg)/i);
  return genericImage || null;
};

const urls = process.argv.slice(2);

if (!urls.length) {
  console.error("Pasa URLs de Amazon como argumentos.");
  process.exit(1);
}

const run = async () => {
  const results = [];

  for (const rawUrl of urls) {
    const asin = extractAsin(rawUrl);
    if (!asin) {
      results.push({ rawUrl, error: "ASIN not found" });
      continue;
    }

    const url = getCanonicalUrl(asin);

    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
          "accept-language": "en-US,en;q=0.9"
        }
      });

      const html = await response.text();
      const title = parseTitle(html);
      const image = parseImage(html);

      results.push({
        asin,
        url,
        title,
        image,
        ok: Boolean(title && image)
      });
    } catch (error) {
      results.push({ asin, url, error: String(error) });
    }
  }

  console.log(JSON.stringify(results, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
