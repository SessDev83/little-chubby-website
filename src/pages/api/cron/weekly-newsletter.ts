import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getServiceClient } from "../../../lib/supabase";
import { books } from "../../../data/books";

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE = (
  import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com"
).replace(/\/+$/, "");
const LOGO = `${SITE}/images/brand/logo-lockup.png`;

// ── Helpers ──────────────────────────────────────────

function weekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(
    ((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7,
  );
}

// ── Content picker ───────────────────────────────────

interface ContentPick {
  tip: { title: string; summary: string; slug: string } | null;
  funBit: {
    title: string;
    summary: string;
    slug: string;
    isFunFact: boolean;
  } | null;
}

async function pickContent(): Promise<Record<string, ContentPick>> {
  const allPosts = await getCollection("blog");
  const result: Record<string, ContentPick> = {};

  for (const lang of ["en", "es"] as const) {
    const langPosts = allPosts.filter((p) => p.data.lang === lang);
    const articles = langPosts
      .filter((p) => p.data.category === "article")
      .sort((a, b) => b.data.date.localeCompare(a.data.date));
    const funFacts = langPosts.filter((p) => p.data.category === "fun-fact");
    const jokes = langPosts.filter((p) => p.data.category === "joke");

    const week = weekNumber();
    const tip = articles.length ? articles[week % articles.length] : null;

    // Alternate fun-fact / joke each week
    const useFunFact = week % 2 === 0;
    const funPool = useFunFact ? funFacts : jokes;
    const fallback = useFunFact ? jokes : funFacts;
    const funPick = funPool.length
      ? funPool[week % funPool.length]
      : fallback.length
        ? fallback[week % fallback.length]
        : null;

    result[lang] = {
      tip: tip
        ? {
            title: tip.data.title,
            summary: tip.data.summary,
            slug: tip.id.replace(/^(en|es)\//, ""),
          }
        : null,
      funBit: funPick
        ? {
            title: funPick.data.title,
            summary: funPick.data.summary,
            slug: funPick.id.replace(/^(en|es)\//, ""),
            isFunFact: funPick.data.category === "fun-fact",
          }
        : null,
    };
  }

  return result;
}

// ── Email builder ────────────────────────────────────

function buildEmail(
  lang: string,
  name: string,
  content: ContentPick,
  unsubscribeUrl: string,
) {
  const isEs = lang === "es";
  const greeting = name
    ? isEs
      ? `¡Hola ${name}!`
      : `Hi ${name}!`
    : isEs
      ? "¡Hola!"
      : "Hi there!";

  const book = books[books.length - 1];
  const bookTitle =
    book?.title[lang as "es" | "en"] || book?.title.en || "";

  const subject = isEs
    ? "🌈 Tu resumen semanal — Little Chubby Press"
    : "🌈 Your weekly roundup — Little Chubby Press";

  // ── Tip section ──
  const tipHtml = content.tip
    ? `<div style="margin-bottom:1.2rem;">
        <p style="margin:0 0 0.3rem;font-size:0.8rem;color:#5c9650;font-weight:700;text-transform:uppercase;">
          💡 ${isEs ? "Tip de la Semana" : "Tip of the Week"}
        </p>
        <h2 style="margin:0 0 0.4rem;font-size:1.05rem;color:#2f261f;">
          <a href="${SITE}/${lang}/blog/${content.tip.slug}/" style="color:#2f261f;text-decoration:none;">${content.tip.title}</a>
        </h2>
        <p style="margin:0;font-size:0.88rem;color:#4b4239;line-height:1.5;">${content.tip.summary}</p>
        <a href="${SITE}/${lang}/blog/${content.tip.slug}/" style="display:inline-block;margin-top:0.5rem;font-size:0.84rem;color:#1f4f86;font-weight:600;text-decoration:none;">
          ${isEs ? "Leer más →" : "Read more →"}
        </a>
      </div>`
    : "";

  // ── Fun fact / joke ──
  const funHtml = content.funBit
    ? `<div style="margin-bottom:1.2rem;padding:1rem;background:#fffaf2;border-radius:8px;">
        <p style="margin:0 0 0.3rem;font-size:0.8rem;color:#d9825f;font-weight:700;text-transform:uppercase;">
          ${
            content.funBit.isFunFact
              ? `🧠 ${isEs ? "¿Sabías que...?" : "Did you know?"}`
              : `😄 ${isEs ? "Para Reír" : "Just for Fun"}`
          }
        </p>
        <p style="margin:0;font-size:0.92rem;color:#4b4239;line-height:1.5;font-style:italic;">${content.funBit.summary}</p>
        <a href="${SITE}/${lang}/blog/${content.funBit.slug}/" style="display:inline-block;margin-top:0.4rem;font-size:0.82rem;color:#1f4f86;text-decoration:none;">
          ${isEs ? "Leer completo →" : "Read full post →"}
        </a>
      </div>`
    : "";

  // ── Coloring corner ──
  const coloringHtml = `
    <div style="text-align:center;padding:0.8rem 1rem;background:#eaf6f0;border-radius:8px;margin-bottom:1.2rem;">
      <p style="margin:0 0 0.4rem;font-size:0.92rem;color:#2f261f;">
        🎨 ${
          isEs
            ? "Nuevas imágenes gratis para colorear en familia"
            : "New free coloring pages for the whole family"
        }
      </p>
      <a href="${SITE}/${lang}/coloring-corner/" style="display:inline-block;background:#5c9650;color:#fff;font-weight:600;padding:0.45rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.85rem;">
        ${isEs ? "Ver Rincón de Colorear" : "Visit the Coloring Corner"}
      </a>
    </div>`;

  // ── Book (soft mention) ──
  const bookHtml = book
    ? `<div style="margin-bottom:1.2rem;padding:0.8rem;background:#fffaf2;border-radius:8px;">
        <table style="width:100%;border:0;border-spacing:0;"><tr>
          <td style="width:70px;vertical-align:top;padding-right:10px;">
            <img src="${SITE}${book.coverSrc}" alt="${bookTitle}" width="60" style="border-radius:5px;display:block;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0 0 0.2rem;font-size:0.8rem;color:#d3a442;font-weight:600;">
              📚 ${isEs ? "Te puede gustar" : "You might like"}
            </p>
            <p style="margin:0 0 0.3rem;font-size:0.95rem;color:#2f261f;font-weight:600;">${bookTitle}</p>
            <a href="${book.amazonUrl}" style="font-size:0.82rem;color:#1f4f86;text-decoration:none;">
              ${isEs ? "Ver en Amazon →" : "See on Amazon →"}
            </a>
          </td>
        </tr></table>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#d3a442;padding:1.5rem 2rem;text-align:center;">
      <a href="${SITE}" style="text-decoration:none;">
        <img src="${LOGO}" alt="Little Chubby Press" width="180" style="display:block;margin:0 auto;" />
      </a>
    </div>
    <div style="padding:1.8rem 2rem;">
      <h2 style="color:#6b4c3b;margin:0 0 0.6rem;font-size:1.15rem;">${greeting}</h2>
      <p style="color:#4b4239;font-size:0.9rem;line-height:1.6;margin:0 0 1.2rem;">
        ${
          isEs
            ? "Aquí va un breve resumen de lo que preparamos esta semana para ti y tu familia. Sin prisas, disfruta cuando quieras. 🌿"
            : "Here's a little roundup of what we prepared this week for you and your family. No rush — enjoy whenever you like. 🌿"
        }
      </p>
      ${tipHtml}
      ${funHtml}
      ${coloringHtml}
      ${bookHtml}
      <p style="color:#999;font-size:0.82rem;line-height:1.5;margin:1rem 0 0;text-align:center;">
        ${isEs ? "Que tengas una bonita semana. 💛" : "Have a lovely week. 💛"}
      </p>
    </div>
    <div style="background:#fffaf2;padding:1rem 2rem;text-align:center;font-size:0.78rem;color:#4b4239;border-top:1px solid #e8e0d4;">
      <p style="margin:0;">Little Chubby Press &bull; <a href="${SITE}" style="color:#1f4f86;">littlechubbypress.com</a></p>
      <p style="margin:0.5rem 0 0;font-size:0.72rem;">
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

// ── Main cron handler ────────────────────────────────
// ?preview=es  or  ?preview=en  → returns the HTML without sending
// Normal call (from Vercel cron) → sends to all confirmed subscribers

export const GET: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };
  const url = new URL(request.url);
  const previewLang = url.searchParams.get("preview"); // "es" | "en" | null

  // Auth: skip for preview (preview only returns HTML, never sends)
  if (!previewLang) {
    const cronSecret = import.meta.env.CRON_SECRET;
    if (cronSecret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
  }

  // ── PREVIEW MODE ──
  if (previewLang) {
    const lang = previewLang === "es" ? "es" : "en";
    const contentByLang = await pickContent();
    const content = contentByLang[lang] || contentByLang.en;
    const { html } = buildEmail(
      lang,
      lang === "es" ? "Familia" : "Friend",
      content,
      "#unsubscribe-preview",
    );
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── SEND MODE ──
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers },
    );
  }

  try {
    const svc = getServiceClient();

    const { data: subscribers, error: subErr } = await svc
      .from("newsletter_subscribers")
      .select("email, name, lang_pref, confirm_token")
      .eq("confirmed", true);

    if (subErr) throw subErr;
    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: "no confirmed subscribers" }),
        { status: 200, headers },
      );
    }

    const contentByLang = await pickContent();

    const payloads: {
      from: string;
      to: string[];
      subject: string;
      html: string;
    }[] = [];

    for (const sub of subscribers) {
      const lang = sub.lang_pref === "es" ? "es" : "en";
      const content = contentByLang[lang] || contentByLang.en;
      const unsubscribeUrl = `${SITE}/api/unsubscribe/?token=${encodeURIComponent(sub.confirm_token)}`;
      const { subject, html } = buildEmail(
        lang,
        sub.name || "",
        content,
        unsubscribeUrl,
      );
      payloads.push({ from: FROM, to: [sub.email], subject, html });
    }

    // Send via Resend batch (max 100 per request)
    let totalSent = 0;
    for (let i = 0; i < payloads.length; i += 100) {
      const batch = payloads.slice(i, i + 100);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend batch ${res.status}: ${errText}`);
      }

      totalSent += batch.length;
    }

    return new Response(
      JSON.stringify({ ok: true, sent: totalSent }),
      { status: 200, headers },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers },
    );
  }
};
