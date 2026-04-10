import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, "dist");

const toPosix = (value) => value.replace(/\\/g, "/");

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

const getFirstMatch = (regex, text) => {
  const match = text.match(regex);
  return match ? match[1].trim() : "";
};

const countMatches = (regex, text) => {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

const main = async () => {
  const files = await walk(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith("index.html"));

  const rows = [];
  const issues = [];

  for (const htmlFile of htmlFiles) {
    const html = await fs.readFile(htmlFile, "utf8");
    const page = `/${toPosix(path.relative(distRoot, htmlFile)).replace(/index\.html$/, "")}`;

    const title = getFirstMatch(/<title>([^<]*)<\/title>/i, html);
    const description = getFirstMatch(/<meta\s+name=["']description["']\s+content="([^"]*)"/i, html);
    const canonical = getFirstMatch(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i, html);

    const h1Count = countMatches(/<h1\b/gi, html);
    const imgTags = html.match(/<img\b[^>]*>/gi) || [];

    let missingAlt = 0;
    let emptyAlt = 0;

    for (const imgTag of imgTags) {
      const altMatch = imgTag.match(/\salt=["']([^"']*)["']/i);
      if (!altMatch) {
        missingAlt += 1;
      } else if (!altMatch[1].trim()) {
        emptyAlt += 1;
      }
    }

    rows.push({
      page,
      titleLength: title.length,
      descriptionLength: description.length,
      h1Count,
      imageCount: imgTags.length,
      missingAlt,
      emptyAlt,
      hasCanonical: Boolean(canonical),
      hasOgTitle: /<meta\s+property=["']og:title["']/i.test(html),
      hasOgDescription: /<meta\s+property=["']og:description["']/i.test(html),
      hasTwitterCard: /<meta\s+name=["']twitter:card["']/i.test(html)
    });

    if (!title) {
      issues.push(`${page} -> missing <title>`);
    }
    if (!description) {
      issues.push(`${page} -> missing meta description`);
    }
    if (description.length > 160) {
      issues.push(`${page} -> meta description too long (${description.length})`);
    }
    if (description.length > 0 && description.length < 70) {
      issues.push(`${page} -> meta description too short (${description.length})`);
    }
    if (h1Count !== 1) {
      issues.push(`${page} -> expected 1 h1, found ${h1Count}`);
    }
    if (!canonical) {
      issues.push(`${page} -> missing canonical`);
    }
    if (missingAlt > 0) {
      issues.push(`${page} -> ${missingAlt} image(s) missing alt`);
    }
    if (emptyAlt > 0) {
      issues.push(`${page} -> ${emptyAlt} image(s) with empty alt`);
    }
  }

  const outputPath = path.join(distRoot, "seo-audit-report.json");
  await fs.writeFile(outputPath, JSON.stringify({ rows, issues }, null, 2), "utf8");

  console.log("SEO AUDIT SUMMARY");
  console.log(`- pages analyzed: ${rows.length}`);
  console.log(`- issues found: ${issues.length}`);

  if (issues.length) {
    console.log("\nTop issues:");
    for (const issue of issues.slice(0, 20)) {
      console.log(`- ${issue}`);
    }
  } else {
    console.log("- no blocking SEO issues detected by this audit");
  }

  console.log(`\nDetailed JSON: ${toPosix(path.relative(projectRoot, outputPath))}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
