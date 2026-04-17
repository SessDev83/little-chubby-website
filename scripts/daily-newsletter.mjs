#!/usr/bin/env node
/**
 * Daily Newsletter Email
 * Builds a rich branded email per subscriber language with:
 *   - Random fun fact + joke
 *   - Latest blog article
 *   - Featured / newest book with cover + Amazon link
 *   - Direct links: blog, coloring corner, books, social
 * Sends via Resend batch API.
 *
 * Usage:
 *   node scripts/daily-newsletter.mjs [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 *
 * Runs best as a daily cron job (e.g. Vercel Cron or GitHub Actions).
 */

import fs from "node:fs";
import path from "node:path";

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE_URL = "https://www.littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!RESEND_API_KEY && !DRY_RUN) {
  console.error("Missing RESEND_API_KEY (use --dry-run to preview)");
  process.exit(1);
}

// ─── Blog reader ───────────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const get = (name) => {
    const r = fm.match(new RegExp(`^${name}:\\s*"?(.+?)"?\\s*$`, "m"));
    return r ? r[1].trim() : "";
  };
  return {
    title: get("title"),
    summary: get("summary"),
    date: get("date"),
    category: get("category") || "article",
    image: get("image"),
    bookId: get("bookId"),
  };
}

function readBlogPosts(lang, category) {
  const dir = path.resolve(import.meta.dirname, "..", "src", "content", "blog", lang);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const fm = parseFrontmatter(raw);
      if (!fm) return null;
      if (category && fm.category !== category) return null;
      return { slug: f.replace(/\.md$/, ""), ...fm, lang };
    })
    .filter(Boolean);
}

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function getLatestPost(posts) {
  return posts.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// ─── Book reader (static TS file) ──────────────────────────────────────────
function getNewestBook() {
  const booksFile = path.resolve(import.meta.dirname, "..", "src", "data", "books.ts");
  const raw = fs.readFileSync(booksFile, "utf-8");
  // Extract last book block — each starts with { id: "..."
  const blocks = [...raw.matchAll(/\{\s*\n\s*id:\s*"([^"]+)"/g)];
  if (!blocks.length) return null;
  const lastId = blocks[blocks.length - 1][1];

  // Extract fields for that book block
  const bookRegex = new RegExp(
    `\\{\\s*\\n\\s*id:\\s*"${lastId}"[\\s\\S]*?(?=\\n  \\},|\\n  \\}\\n)`,
  );
  const bm = raw.match(bookRegex);
  if (!bm) return null;
  const block = bm[0];

  const extractLocalized = (field) => {
    const r = block.match(new RegExp(`${field}:\\s*\\{[^}]*es:\\s*"([^"]*)"[^}]*en:\\s*"([^"]*)"`, "s"));
    if (!r) {
      const r2 = block.match(new RegExp(`${field}:\\s*\\{[^}]*en:\\s*"([^"]*)"[^}]*es:\\s*"([^"]*)"`, "s"));
      return r2 ? { en: r2[1], es: r2[2] } : { en: "", es: "" };
    }
    return { es: r[1], en: r[2] };
  };
  const coverMatch = block.match(/coverSrc:\s*"([^"]+)"/);
  const amazonMatch = block.match(/amazonUrl:\s*"([^"]+)"/);

  return {
    id: lastId,
    title: extractLocalized("title"),
    subtitle: extractLocalized("subtitle"),
    coverSrc: coverMatch ? coverMatch[1] : "",
    amazonUrl: amazonMatch ? amazonMatch[1] : "",
  };
}

// ─── Supabase helpers ──────────────────────────────────────────────────────
async function getConfirmedSubscribers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/newsletter_subscribers?confirmed=eq.true&select=id,email,name,lang_pref`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Fetch subscribers failed: ${res.status}`);
  return res.json();
}

// ─── Email template ────────────────────────────────────────────────────────
function buildEmail(lang, { funFact, joke, latestArticle, book, unsubscribeUrl }) {
  const isEs = lang === "es";
  const subject = isEs
    ? "🌈 Tu dosis diaria de Little Chubby Press"
    : "🌈 Your daily dose of Little Chubby Press";

  // Helpers to build each section safely
  const section = (post, color, label, icon) => {
    if (!post) return "";
    const url = `${SITE_URL}/${lang}/blog/${post.slug}/`;
    return `
      <div style="margin-bottom:1.5rem;padding:1rem;background:#fffaf2;border-radius:8px;border-left:4px solid ${color};">
        <p style="margin:0 0 0.3rem;font-size:0.85rem;color:${color};font-weight:700;text-transform:uppercase;">
          ${icon} ${label}
        </p>
        <h2 style="margin:0 0 0.5rem;font-size:1.1rem;color:#2f261f;">
          <a href="${url}" style="color:#2f261f;text-decoration:none;">${post.title}</a>
        </h2>
        <p style="margin:0;font-size:0.88rem;color:#4b4239;line-height:1.5;">${post.summary || ""}</p>
        <a href="${url}" style="display:inline-block;margin-top:0.6rem;font-size:0.85rem;color:#1f4f86;font-weight:600;">
          ${isEs ? "Leer más →" : "Read more →"}
        </a>
      </div>`;
  };

  // --- Latest article ---
  const articleSection = section(
    latestArticle,
    "#1f4f86",
    isEs ? "Último artículo" : "Latest Post",
    "📝",
  );

  // --- Fun Fact ---
  const funFactSection = section(
    funFact,
    "#5c9650",
    isEs ? "Dato Curioso" : "Fun Fact",
    "🧠",
  );

  // --- Joke ---
  const jokeSection = section(
    joke,
    "#d9825f",
    isEs ? "Chiste del Día" : "Joke of the Day",
    "😂",
  );

  // --- Featured book ---
  const bookTitle = book ? (book.title[lang] || book.title.en) : "";
  const bookSubtitle = book ? (book.subtitle[lang] || book.subtitle.en) : "";
  const bookSection = book
    ? `
      <div style="margin-bottom:1.5rem;padding:1rem;background:#fffaf2;border-radius:8px;border-left:4px solid #d3a442;">
        <p style="margin:0 0 0.3rem;font-size:0.85rem;color:#d3a442;font-weight:700;text-transform:uppercase;">
          📚 ${isEs ? "Nuestro último libro" : "Our Latest Book"}
        </p>
        <table style="width:100%;border:0;border-spacing:0;"><tr>
          <td style="width:90px;vertical-align:top;padding-right:12px;">
            <img src="${SITE_URL}${book.coverSrc}" alt="${bookTitle}" width="80" style="border-radius:6px;display:block;" />
          </td>
          <td style="vertical-align:top;">
            <h2 style="margin:0 0 0.3rem;font-size:1.1rem;color:#2f261f;">${bookTitle}</h2>
            <p style="margin:0 0 0.6rem;font-size:0.85rem;color:#4b4239;line-height:1.4;">${bookSubtitle}</p>
            <a href="${book.amazonUrl}" style="display:inline-block;background:#d3a442;color:#fff;font-weight:700;padding:0.45rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.85rem;">
              ${isEs ? "Ver en Amazon" : "View on Amazon"}
            </a>
          </td>
        </tr></table>
      </div>`
    : "";

  // --- Quick links ---
  const coloringUrl = `${SITE_URL}/${lang}/coloring-corner/`;
  const blogUrl = `${SITE_URL}/${lang}/blog/`;
  const booksUrl = `${SITE_URL}/${lang}/books/`;
  const linkStyle = "display:inline-block;margin:0.25rem 0.3rem;padding:0.4rem 1rem;background:#f6f1e7;color:#754624;border-radius:6px;text-decoration:none;font-size:0.82rem;font-weight:600;";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="max-width:560px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#d3a442;padding:1.5rem 2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:700;">
        🌈 Little Chubby Press
      </h1>
      <p style="margin:0.4rem 0 0;color:#fff;font-size:0.95rem;opacity:0.9;">
        ${isEs ? "Tu dosis diaria de diversión" : "Your daily dose of fun"}
      </p>
    </div>

    <div style="padding:1.5rem 2rem;">

      ${articleSection}
      ${funFactSection}
      ${jokeSection}
      ${bookSection}

      <!-- Coloring Corner CTA -->
      <div style="text-align:center;padding:1rem;background:#eaf6f0;border-radius:8px;margin-bottom:1.2rem;">
        <p style="margin:0 0 0.6rem;font-size:1rem;color:#2f261f;font-weight:600;">
          🎨 ${isEs ? "¡Descarga imágenes gratis para colorear!" : "Download free coloring pages!"}
        </p>
        <a href="${coloringUrl}" style="display:inline-block;background:#5c9650;color:#fff;font-weight:700;padding:0.55rem 1.5rem;border-radius:8px;text-decoration:none;font-size:0.9rem;">
          ${isEs ? "Ir al Rincón de Colorear" : "Visit the Coloring Corner"}
        </a>
      </div>

      <!-- Quick links -->
      <div style="text-align:center;padding:0.8rem 0;">
        <p style="margin:0 0 0.4rem;font-size:0.85rem;color:#4b4239;font-weight:600;">
          ${isEs ? "Explora más:" : "Explore more:"}
        </p>
        <a href="${blogUrl}" style="${linkStyle}">📝 Blog</a>
        <a href="${booksUrl}" style="${linkStyle}">📚 ${isEs ? "Libros" : "Books"}</a>
        <a href="${coloringUrl}" style="${linkStyle}">🎨 Coloring Corner</a>
      </div>

      <!-- Social links -->
      <div style="text-align:center;padding:0.6rem 0 0.2rem;">
        <p style="margin:0 0 0.4rem;font-size:0.8rem;color:#999;">
          ${isEs ? "Síguenos:" : "Follow us:"}
        </p>
        <a href="https://www.instagram.com/LittleChubbyPress" style="margin:0 0.4rem;color:#1f4f86;text-decoration:none;font-size:0.85rem;">Instagram</a>
        <span style="color:#ccc;">|</span>
        <a href="https://www.facebook.com/profile.php?id=61572034373766" style="margin:0 0.4rem;color:#1f4f86;text-decoration:none;font-size:0.85rem;">Facebook</a>
        <span style="color:#ccc;">|</span>
        <a href="https://bsky.app/profile/littlechubbypress.bsky.social" style="margin:0 0.4rem;color:#1f4f86;text-decoration:none;font-size:0.85rem;">Bluesky</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#fffaf2;padding:1rem 2rem;text-align:center;font-size:0.78rem;color:#4b4239;">
      <p style="margin:0 0 0.5rem;">
        Little Chubby Press &bull; <a href="${SITE_URL}" style="color:#1f4f86;">littlechubbypress.com</a>
      </p>
      <p style="margin:0;">
        <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">
          ${isEs ? "Cancelar suscripción" : "Unsubscribe"}
        </a>
      </p>
    </div>

  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Send via Resend batch ─────────────────────────────────────────────────
async function sendBatch(emails) {
  const batches = [];
  for (let i = 0; i < emails.length; i += 100) {
    batches.push(emails.slice(i, i + 100));
  }

  let totalSent = 0;
  for (const batch of batches) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend batch error ${res.status}: ${err}`);
    }
    const data = await res.json();
    totalSent += Array.isArray(data.data) ? data.data.length : batch.length;
  }
  return totalSent;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no emails\n" : "📧 Sending daily newsletter...\n");

  // Read book info (static)
  const book = getNewestBook();
  if (book) console.log(`  📚 Featured book: ${book.id}`);

  // Prepare content per language
  const content = {};
  for (const lang of ["en", "es"]) {
    const funFacts = readBlogPosts(lang, "fun-fact");
    const jokes = readBlogPosts(lang, "joke");
    const articles = readBlogPosts(lang, "article");

    content[lang] = {
      funFact: pickRandom(funFacts),
      joke: pickRandom(jokes),
      latestArticle: getLatestPost(articles),
    };
    console.log(`  [${lang}] articles: ${articles.length}, fun-facts: ${funFacts.length}, jokes: ${jokes.length}`);
  }

  // Get confirmed subscribers
  const subscribers = await getConfirmedSubscribers();
  console.log(`\n📬 Confirmed subscribers: ${subscribers.length}\n`);

  if (subscribers.length === 0) {
    console.log("No confirmed subscribers. Nothing to send.");
    return;
  }

  const emailPayloads = [];
  for (const sub of subscribers) {
    const lang = sub.lang_pref === "es" ? "es" : "en";
    const { funFact, joke, latestArticle } = content[lang];
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe/?token=${sub.id}`;
    const { subject, html } = buildEmail(lang, {
      funFact, joke, latestArticle, book, unsubscribeUrl,
    });

    if (DRY_RUN) {
      console.log(`  📧 ${sub.email} (${lang}) — ${subject}`);
      continue;
    }

    emailPayloads.push({
      from: FROM_EMAIL,
      to: [sub.email],
      subject,
      html,
    });
  }

  if (DRY_RUN) {
    console.log(`\n🔍 Would send ${subscribers.length} emails.`);
    return;
  }

  const sent = await sendBatch(emailPayloads);
  console.log(`✅ Sent ${sent} newsletter emails.`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
