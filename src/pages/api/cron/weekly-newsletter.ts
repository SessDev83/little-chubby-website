import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getServiceClient } from "../../../lib/supabase";
import { books, getMonthlyPrizeBook } from "../../../data/books";
import { notifyAdminCronError } from "../../../lib/notifications";
import { pingHeartbeat } from "../../../lib/monitoring";

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE = (
  import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com"
).replace(/\/+$/, "");
const LOGO = `${SITE}/images/brand/logo-lockup.png`;

function coverUrl(coverSrc: string): string {
  return coverSrc.startsWith("http") ? coverSrc : `${SITE}${coverSrc}`;
}

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

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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

  const subject = isEs
    ? "🌈 Tu resumen semanal — Little Chubby Press"
    : "🌈 Your weekly roundup — Little Chubby Press";

  // ── Giveaway data ──
  const month = currentMonth();
  const prizeBook = getMonthlyPrizeBook(month);
  const prizeTitle = prizeBook.title[lang as "es" | "en"] || prizeBook.title.en;
  const prizeCover = coverUrl(prizeBook.coverSrc);
  const daysLeft = daysLeftInMonth();
  const monthIdx = new Date().getMonth();
  const monthName = isEs ? MONTH_NAMES_ES[monthIdx] : MONTH_NAMES_EN[monthIdx];

  // ── Divider ──
  const divider = `<div style="border-top:1px solid #e8e0d4;margin:1.2rem 0;"></div>`;

  // ── 1. Tip section ──
  const tipHtml = content.tip
    ? `<div style="margin-bottom:0.6rem;">
        <table style="width:100%;border:0;border-spacing:0;"><tr>
          <td style="width:28px;vertical-align:top;padding-top:2px;">
            <span style="font-size:1.3rem;">💡</span>
          </td>
          <td>
            <p style="margin:0 0 0.2rem;font-size:0.75rem;color:#5c9650;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              ${isEs ? "Tip de la Semana" : "Tip of the Week"}
            </p>
            <h2 style="margin:0 0 0.35rem;font-size:1.02rem;color:#2f261f;">
              <a href="${SITE}/${lang}/blog/${content.tip.slug}/" style="color:#2f261f;text-decoration:none;">${content.tip.title}</a>
            </h2>
            <p style="margin:0;font-size:0.86rem;color:#4b4239;line-height:1.55;">${content.tip.summary}</p>
            <a href="${SITE}/${lang}/blog/${content.tip.slug}/" style="display:inline-block;margin-top:0.5rem;font-size:0.84rem;color:#1f4f86;font-weight:600;text-decoration:none;">
              ${isEs ? "Leer más →" : "Read more →"}
            </a>
          </td>
        </tr></table>
      </div>`
    : "";

  // ── 2. Fun fact / joke ──
  const funHtml = content.funBit
    ? `${divider}
      <div style="padding:1rem 1.1rem;background:linear-gradient(135deg,#fffaf2 0%,#fff5e6 100%);border-radius:10px;border-left:4px solid ${content.funBit.isFunFact ? "#d9825f" : "#d3a442"};">
        <table style="width:100%;border:0;border-spacing:0;"><tr>
          <td style="width:28px;vertical-align:top;padding-top:2px;">
            <span style="font-size:1.3rem;">${content.funBit.isFunFact ? "🧠" : "😄"}</span>
          </td>
          <td>
            <p style="margin:0 0 0.3rem;font-size:0.75rem;color:${content.funBit.isFunFact ? "#d9825f" : "#d3a442"};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              ${
                content.funBit.isFunFact
                  ? (isEs ? "¿Sabías que...?" : "Did you know?")
                  : (isEs ? "Para Reír" : "Just for Fun")
              }
            </p>
            <p style="margin:0;font-size:0.9rem;color:#4b4239;line-height:1.55;font-style:italic;">${content.funBit.summary}</p>
            <a href="${SITE}/${lang}/blog/${content.funBit.slug}/" style="display:inline-block;margin-top:0.45rem;font-size:0.82rem;color:#1f4f86;text-decoration:none;font-weight:600;">
              ${isEs ? "Leer completo →" : "Read full post →"}
            </a>
          </td>
        </tr></table>
      </div>`
    : "";

  // ── 3. Giveaway countdown ──
  const urgencyColor = daysLeft <= 7 ? "#c0392b" : "#d3a442";
  const urgencyText = daysLeft <= 7
    ? (isEs ? "¡Últimos días!" : "Last days!")
    : (isEs ? `Quedan ${daysLeft} días` : `${daysLeft} days left`);

  const giveawayHtml = `${divider}
    <div style="background:linear-gradient(135deg,#fdf6e3 0%,#fff9ed 100%);border-radius:12px;border:2px dashed #d3a442;padding:1.2rem;text-align:center;">
      <p style="margin:0 0 0.1rem;font-size:0.72rem;color:#d3a442;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
        🎁 ${isEs ? `Sorteo de ${monthName}` : `${monthName} Giveaway`}
      </p>
      <table style="width:100%;border:0;border-spacing:0;margin:0.8rem 0;"><tr>
        <td style="width:90px;vertical-align:top;padding-right:14px;text-align:center;">
          <img src="${prizeCover}" alt="${prizeTitle}" width="75" style="border-radius:6px;display:block;margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,0.12);" />
        </td>
        <td style="vertical-align:middle;text-align:left;">
          <p style="margin:0 0 0.15rem;font-size:0.78rem;color:#6b4c3b;font-weight:600;">
            ${isEs ? "Premio de este mes:" : "This month's prize:"}
          </p>
          <p style="margin:0 0 0.4rem;font-size:1rem;color:#2f261f;font-weight:700;">${prizeTitle}</p>
          <div style="display:inline-block;background:${urgencyColor};color:#fff;font-weight:700;padding:0.3rem 0.8rem;border-radius:20px;font-size:0.78rem;">
            ⏳ ${urgencyText}
          </div>
        </td>
      </tr></table>
      <a href="${SITE}/${lang}/lottery/" style="display:inline-block;background:#5c9650;color:#fff;font-weight:700;padding:0.55rem 1.8rem;border-radius:8px;text-decoration:none;font-size:0.9rem;margin-top:0.3rem;box-shadow:0 2px 6px rgba(92,150,80,0.3);">
        ${isEs ? "Participar gratis →" : "Enter for free →"}
      </a>
      <p style="margin:0.5rem 0 0;font-size:0.72rem;color:#999;">
        ${isEs ? "Compra un libro, sube tu foto y entra al sorteo" : "Buy a book, upload your photo, and enter the draw"}
      </p>
    </div>`;

  // ── 4. Coloring corner ──
  const coloringHtml = `${divider}
    <div style="text-align:center;padding:1rem 1.2rem;background:linear-gradient(135deg,#eaf6f0 0%,#e0f5e9 100%);border-radius:10px;">
      <table style="width:100%;border:0;border-spacing:0;"><tr>
        <td style="width:36px;vertical-align:middle;text-align:center;">
          <span style="font-size:1.8rem;">🎨</span>
        </td>
        <td style="vertical-align:middle;text-align:left;padding-left:8px;">
          <p style="margin:0 0 0.15rem;font-size:0.75rem;color:#5c9650;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
            ${isEs ? "Rincón de Colorear" : "Coloring Corner"}
          </p>
          <p style="margin:0;font-size:0.88rem;color:#2f261f;">
            ${isEs
              ? "Nuevas imágenes gratis para colorear en familia"
              : "New free coloring pages for the whole family"}
          </p>
        </td>
        <td style="width:130px;vertical-align:middle;text-align:right;">
          <a href="${SITE}/${lang}/coloring-corner/" style="display:inline-block;background:#5c9650;color:#fff;font-weight:600;padding:0.4rem 1rem;border-radius:6px;text-decoration:none;font-size:0.8rem;">
            ${isEs ? "Ver más →" : "Explore →"}
          </a>
        </td>
      </tr></table>
    </div>`;

  // ── 5. Book spotlight (soft mention — different book from giveaway) ──
  // Pick a random-ish book that's NOT the prize book
  const otherBooks = books.filter((b) => b.id !== prizeBook.id);
  const spotlightBook = otherBooks.length
    ? otherBooks[weekNumber() % otherBooks.length]
    : null;
  const spotlightTitle = spotlightBook?.title[lang as "es" | "en"] || spotlightBook?.title.en || "";
  const spotlightCover = spotlightBook ? coverUrl(spotlightBook.coverSrc) : "";

  const bookHtml = spotlightBook
    ? `${divider}
      <div style="padding:0.8rem 1rem;background:#fafafa;border-radius:10px;">
        <table style="width:100%;border:0;border-spacing:0;"><tr>
          <td style="width:65px;vertical-align:top;padding-right:12px;">
            <img src="${spotlightCover}" alt="${spotlightTitle}" width="55" style="border-radius:5px;display:block;box-shadow:0 1px 4px rgba(0,0,0,0.1);" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0 0 0.15rem;font-size:0.72rem;color:#d3a442;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              📚 ${isEs ? "Te puede gustar" : "You might like"}
            </p>
            <p style="margin:0 0 0.3rem;font-size:0.92rem;color:#2f261f;font-weight:600;">${spotlightTitle}</p>
            <a href="${spotlightBook.amazonUrl}" style="font-size:0.82rem;color:#1f4f86;text-decoration:none;font-weight:600;">
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

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#d3a442 0%,#c4913a 100%);padding:1.8rem 2rem;text-align:center;">
      <a href="${SITE}" style="text-decoration:none;">
        <img src="${LOGO}" alt="Little Chubby Press" width="160" style="display:block;margin:0 auto;" />
      </a>
      <p style="margin:0.6rem 0 0;font-size:0.78rem;color:rgba(255,255,255,0.85);font-weight:500;">
        ${isEs ? "Tu resumen semanal ✨" : "Your weekly roundup ✨"}
      </p>
    </div>

    <!-- Body -->
    <div style="padding:1.8rem 2rem;">
      <h2 style="color:#6b4c3b;margin:0 0 0.4rem;font-size:1.15rem;">${greeting}</h2>
      <p style="color:#4b4239;font-size:0.9rem;line-height:1.6;margin:0 0 1rem;">
        ${isEs
          ? "Aquí va un breve resumen de lo que preparamos esta semana para ti y tu familia. Sin prisas, disfruta cuando quieras. 🌿"
          : "Here's a little roundup of what we prepared this week for you and your family. No rush — enjoy whenever you like. 🌿"}
      </p>

      ${tipHtml}
      ${funHtml}
      ${giveawayHtml}
      ${coloringHtml}
      ${bookHtml}

      <p style="color:#999;font-size:0.82rem;line-height:1.5;margin:1.2rem 0 0;text-align:center;">
        ${isEs ? "Que tengas una bonita semana. 💛" : "Have a lovely week. 💛"}
      </p>
    </div>

    <!-- Footer -->
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
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), { status: 500, headers });
    }
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
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

    await pingHeartbeat("weekly-newsletter");
    return new Response(
      JSON.stringify({ ok: true, sent: totalSent }),
      { status: 200, headers },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdminCronError("weekly-newsletter", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers },
    );
  }
};
