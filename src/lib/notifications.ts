/**
 * Centralized email notification system for Little Chubby Press.
 * All admin notifications go through this module.
 */
import { getServiceClient } from "./supabase";

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = import.meta.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";
const FROM = "Little Chubby Press <noreply@littlechubbypress.com>";

// ── HTML template ────────────────────────────────────

function card(emoji: string, title: string, rows: [string, string][], footer?: string): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0 6px 12px;font-weight:600">${value}</td></tr>`
    )
    .join("");

  const footerHtml = footer
    ? `<p style="margin:16px 0 0;font-size:12px;color:#aaa">${footer}</p>`
    : "";

  return `
  <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:460px;margin:0 auto;padding:24px;background:#f9f7f3;border-radius:12px;border:1px solid #e8e0d4">
    <h2 style="color:#6b4c3b;margin:0 0 16px;font-size:18px">${emoji} ${title}</h2>
    <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
    ${footerHtml}
    <hr style="border:none;border-top:1px solid #e8e0d4;margin:16px 0 8px" />
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">
      Little Chubby Press &middot; ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC
    </p>
  </div>`;
}

// ── Send helper ──────────────────────────────────────

async function send(subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [ANALYTICS_EMAIL], subject, html }),
    });
  } catch {
    // Non-blocking — never fail the main operation
  }
}

// ── Send to subscriber ───────────────────────────────

const FROM_USER = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com").replace(/\/+$/, "");
const LOGO_URL = `${SITE_URL}/images/brand/logo-lockup.png`;

async function sendToUser(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_USER, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Subscriber email template ────────────────────────

function subscriberEmail(lang: string, bodyContent: string, confirmToken?: string): string {
  const isEs = lang === "es";
  const unsubscribeUrl = confirmToken
    ? `${SITE_URL}/api/unsubscribe/?token=${encodeURIComponent(confirmToken)}`
    : "";
  const unsubscribeLink = unsubscribeUrl
    ? `<p style="margin:0.5rem 0 0;font-size:0.72rem;"><a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">${isEs ? "Cancelar suscripción" : "Unsubscribe"}</a></p>`
    : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="max-width:520px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#d3a442;padding:1.5rem 2rem;text-align:center;">
      <a href="${SITE_URL}" style="text-decoration:none;">
        <img src="${LOGO_URL}" alt="Little Chubby Press" width="180" style="display:block;margin:0 auto;" />
      </a>
    </div>
    <div style="padding:2rem;">
      ${bodyContent}
    </div>
    <div style="background:#fffaf2;padding:1rem 2rem;text-align:center;font-size:0.78rem;color:#4b4239;border-top:1px solid #e8e0d4;">
      <p style="margin:0;">Little Chubby Press &bull; <a href="${SITE_URL}" style="color:#1f4f86;">littlechubbypress.com</a></p>
      ${unsubscribeLink}
    </div>
  </div>
</body>
</html>`;
}

function confirmButton(confirmUrl: string, lang: string): string {
  const label = lang === "es" ? "✅ Confirmar suscripción" : "✅ Confirm subscription";
  return `<div style="text-align:center;margin:1.5rem 0;">
    <a href="${confirmUrl}" style="display:inline-block;background:#5c9650;color:#fff;font-weight:700;padding:0.75rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;">${label}</a>
  </div>`;
}

function benefitsBox(lang: string): string {
  const isEs = lang === "es";
  return `<div style="background:#fffaf2;border-radius:8px;padding:1rem 1.2rem;margin:1.2rem 0;">
    <p style="color:#6b4c3b;font-size:0.9rem;font-weight:600;margin:0 0 0.5rem;">${isEs ? "¿Qué recibirás?" : "What you'll get:"}</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:3px 0;color:#4b4239;font-size:0.85rem;">🎨</td><td style="padding:3px 0 3px 8px;color:#4b4239;font-size:0.85rem;">${isEs ? "Tips de creatividad y colorear en familia" : "Creativity & family coloring tips"}</td></tr>
      <tr><td style="padding:3px 0;color:#4b4239;font-size:0.85rem;">📚</td><td style="padding:3px 0 3px 8px;color:#4b4239;font-size:0.85rem;">${isEs ? "Novedades y nuevos libros" : "New books & updates"}</td></tr>
      <tr><td style="padding:3px 0;color:#4b4239;font-size:0.85rem;">🎁</td><td style="padding:3px 0 3px 8px;color:#4b4239;font-size:0.85rem;">${isEs ? "Acceso al sorteo mensual y Peanuts 🥜" : "Monthly giveaway access & Peanuts 🥜"}</td></tr>
    </table>
    <p style="color:#999;font-size:0.8rem;margin:0.6rem 0 0;font-style:italic;">${isEs ? "Solo emails útiles. Sin spam. Cancelar en cualquier momento." : "Only useful emails. No spam. Unsubscribe anytime."}</p>
  </div>`;
}

// ── Count helpers ────────────────────────────────────

async function countRows(table: string, extra?: string): Promise<number> {
  try {
    const svc = getServiceClient();
    let query = svc.from(table).select("id", { count: "exact", head: true });
    if (extra === "confirmed") {
      query = query.eq("confirmed", true);
    }
    const { count } = await query;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── Public notification functions ────────────────────

/** New user registration (auth callback) */
export async function notifyNewUser(email: string, lang: string): Promise<void> {
  const totalUsers = await countRows("profiles");
  await send(
    `🎉 New User Registered: ${email}`,
    card("🎉", "New User Registered", [
      ["Email", email],
      ["Language", lang],
      ["Total Users", String(totalUsers)],
    ])
  );
}

/** New newsletter subscriber */
export async function notifyNewSubscriber(
  email: string,
  name: string,
  source: string,
  lang: string
): Promise<void> {
  const total = await countRows("newsletter_subscribers");
  await send(
    `📬 New Subscriber: ${email}`,
    card("📬", "New Newsletter Subscriber", [
      ["Email", email],
      ["Name", name || "—"],
      ["Source", source],
      ["Language", lang],
      ["Total Subscribers", String(total)],
    ])
  );
}

/** Newsletter subscriber confirmed (double opt-in) */
export async function notifySubscriberConfirmed(email: string): Promise<void> {
  const confirmed = await countRows("newsletter_subscribers", "confirmed");
  await send(
    `✅ Subscriber Confirmed: ${email}`,
    card("✅", "Subscriber Confirmed", [
      ["Email", email],
      ["Confirmed Total", String(confirmed)],
    ])
  );
}

// ── Subscriber-facing emails ─────────────────────────

/** Send double opt-in confirmation email (Day 0) */
export async function sendConfirmationEmail(
  email: string,
  name: string,
  confirmToken: string,
  lang: string
): Promise<boolean> {
  const isEs = lang === "es";
  const confirmUrl = `${SITE_URL}/api/confirm-subscription/?token=${encodeURIComponent(confirmToken)}&lang=${encodeURIComponent(lang)}`;
  const greeting = name
    ? (isEs ? `¡Hola ${name}!` : `Hi ${name}!`)
    : (isEs ? "¡Hola!" : "Hi there!");

  const subject = isEs
    ? "✉️ Confirma tu suscripción — Little Chubby Press"
    : "✉️ Confirm your subscription — Little Chubby Press";

  const body = `
    <h2 style="color:#6b4c3b;margin:0 0 0.8rem;font-size:1.2rem;">${greeting}</h2>
    <p style="color:#4b4239;font-size:0.95rem;line-height:1.6;margin:0 0 1rem;">
      ${isEs
        ? "Gracias por suscribirte a nuestro newsletter. Para completar tu registro, confirma tu email haciendo click en el botón:"
        : "Thanks for subscribing to our newsletter. To complete your registration, please confirm your email by clicking the button below:"}
    </p>
    ${confirmButton(confirmUrl, lang)}
    ${benefitsBox(lang)}
    <div style="background:#eaf6f0;border-radius:8px;padding:1rem 1.2rem;margin:1.2rem 0;text-align:center;">
      <p style="margin:0 0 0.4rem;font-size:0.85rem;color:#2f261f;">
        🎨 ${isEs ? "Tu mini libro de colorear gratis:" : "Your free mini coloring book:"}
      </p>
      <a href="${SITE_URL}/downloads/mini-coloring-book.pdf" style="display:inline-block;background:#5c9650;color:#fff;font-weight:600;padding:0.45rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.85rem;">
        ${isEs ? "Descargar PDF →" : "Download PDF →"}
      </a>
    </div>
    <p style="color:#aaa;font-size:0.78rem;line-height:1.5;margin:1.2rem 0 0;">
      ${isEs ? "Si no te suscribiste, puedes ignorar este email." : "If you didn't subscribe, you can safely ignore this email."}
    </p>`;

  return sendToUser(email, subject, subscriberEmail(lang, body, confirmToken));
}

/** Send reminder email for unconfirmed subscribers */
export async function sendReminderEmail(
  email: string,
  name: string,
  confirmToken: string,
  lang: string,
  reminderNumber: number
): Promise<boolean> {
  const isEs = lang === "es";
  const confirmUrl = `${SITE_URL}/api/confirm-subscription/?token=${encodeURIComponent(confirmToken)}&lang=${encodeURIComponent(lang)}`;
  const greeting = name
    ? (isEs ? `¡Hola ${name}!` : `Hi ${name}!`)
    : (isEs ? "¡Hola!" : "Hi there!");

  const copy: Record<number, { subject: { es: string; en: string }; heading: { es: string; en: string }; message: { es: string; en: string } }> = {
    1: {
      subject: {
        es: "🎨 ¡No te olvides de confirmar! — Little Chubby Press",
        en: "🎨 Don't forget to confirm! — Little Chubby Press",
      },
      heading: {
        es: "¡Te estamos esperando!",
        en: "We're waiting for you!",
      },
      message: {
        es: "Notamos que aún no confirmaste tu suscripción. Confirma ahora para recibir tips de creatividad, ideas para colorear en familia y novedades exclusivas.",
        en: "We noticed you haven't confirmed your subscription yet. Confirm now to receive creativity tips, family coloring ideas, and exclusive updates.",
      },
    },
    2: {
      subject: {
        es: "🎁 ¡No te pierdas el sorteo mensual! — Little Chubby Press",
        en: "🎁 Don't miss the monthly giveaway! — Little Chubby Press",
      },
      heading: {
        es: "¿Sabías que los suscriptores participan en sorteos?",
        en: "Did you know subscribers enter monthly giveaways?",
      },
      message: {
        es: "Los suscriptores confirmados pueden ganar Peanuts 🥜, participar en nuestro sorteo mensual y acceder a contenido exclusivo. Solo falta un click:",
        en: "Confirmed subscribers can earn Peanuts 🥜, enter our monthly giveaway, and access exclusive content. Just one click away:",
      },
    },
    3: {
      subject: {
        es: "⏳ Última oportunidad para confirmar — Little Chubby Press",
        en: "⏳ Last chance to confirm — Little Chubby Press",
      },
      heading: {
        es: "Último aviso",
        en: "Final reminder",
      },
      message: {
        es: "Este es nuestro último recordatorio. Si no confirmas en los próximos días, eliminaremos tu registro para mantener nuestra lista limpia. ¡Confirma ahora para no perderte nada!",
        en: "This is our final reminder. If you don't confirm in the next few days, we'll remove your registration to keep our list clean. Confirm now so you don't miss out!",
      },
    },
  };

  const r = copy[reminderNumber] || copy[3];
  const subject = r.subject[isEs ? "es" : "en"];

  const body = `
    <h2 style="color:#6b4c3b;margin:0 0 0.8rem;font-size:1.2rem;">${greeting}</h2>
    <h3 style="color:#d3a442;margin:0 0 0.8rem;font-size:1rem;">${r.heading[isEs ? "es" : "en"]}</h3>
    <p style="color:#4b4239;font-size:0.95rem;line-height:1.6;margin:0 0 1rem;">
      ${r.message[isEs ? "es" : "en"]}
    </p>
    ${confirmButton(confirmUrl, lang)}
    ${benefitsBox(lang)}
    <p style="color:#aaa;font-size:0.78rem;line-height:1.5;margin:1.2rem 0 0;">
      ${isEs ? "Si no te suscribiste, puedes ignorar este email." : "If you didn't subscribe, you can safely ignore this email."}
    </p>`;

  return sendToUser(email, subject, subscriberEmail(lang, body, confirmToken));
}

/** New book review submitted */
export async function notifyNewReview(
  userEmail: string,
  bookTitle: string,
  rating: number,
  reviewText: string
): Promise<void> {
  const totalReviews = await countRows("book_reviews");
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  await send(
    `📖 New Review (${stars}): ${bookTitle}`,
    card("📖", "New Book Review", [
      ["User", userEmail],
      ["Book", bookTitle],
      ["Rating", stars],
      ["Review", reviewText.slice(0, 200) || "—"],
      ["Total Reviews", String(totalReviews)],
    ])
  );
}

/** Artwork downloaded */
export async function notifyDownload(
  userEmail: string,
  artworkTitle: string,
  newBalance: number
): Promise<void> {
  const totalDownloads = await countRows("artwork_downloads");
  await send(
    `🎨 Artwork Downloaded: ${artworkTitle}`,
    card("🎨", "Artwork Downloaded", [
      ["User", userEmail],
      ["Artwork", artworkTitle],
      ["Credits Left", String(newBalance)],
      ["Total Downloads", String(totalDownloads)],
    ])
  );
}

/** Lottery prize claimed */
export async function notifyLotteryClaim(
  userEmail: string,
  bookChosen: string,
  shippingName: string,
  shippingAddress: string
): Promise<void> {
  await send(
    `🏆 Prize Claimed by ${userEmail}`,
    card("🏆", "Lottery Prize Claimed", [
      ["User", userEmail],
      ["Book Chosen", bookChosen],
      ["Ship To", shippingName],
      ["Address", shippingAddress],
    ])
  );
}

/** Review updated (re-submitted after edits) */
export async function notifyReviewUpdated(
  userEmail: string,
  bookTitle: string,
  rating: number
): Promise<void> {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  await send(
    `✏️ Review Updated (${stars}): ${bookTitle}`,
    card("✏️", "Review Updated", [
      ["User", userEmail],
      ["Book", bookTitle],
      ["New Rating", stars],
    ])
  );
}

// ── User-facing email notifications ──────────────────

/** Notify user their review was approved */
export async function emailUserReviewApproved(
  userEmail: string,
  bookTitle: string,
  lang: string
): Promise<void> {
  const isEs = lang === "es";
  const subject = isEs
    ? `🎉 ¡Tu review de "${bookTitle}" fue aprobada!`
    : `🎉 Your review of "${bookTitle}" was approved!`;
  const html = card(
    "🎉",
    isEs ? "¡Review Aprobada!" : "Review Approved!",
    [
      [isEs ? "Libro" : "Book", bookTitle],
      [isEs ? "Peanuts ganados" : "Peanuts earned", "5 🥜"],
    ],
    isEs
      ? "¡Puedes gastar tus Peanuts en la Tienda! Visita littlechubbypress.com"
      : "Spend your Peanuts in the Shop! Visit littlechubbypress.com"
  );
  await sendToUser(userEmail, subject, html);
}

/** Notify user they won the lottery */
export async function emailUserLotteryWin(
  userEmail: string,
  claimDeadline: string,
  lang: string,
  prizeBookTitle?: string
): Promise<void> {
  const isEs = lang === "es";
  const claimUrl = `https://littlechubbypress.com/${lang}/lottery/`;
  const subject = isEs
    ? "🏆 ¡Felicidades! ¡Ganaste el sorteo mensual!"
    : "🏆 Congratulations! You won the monthly giveaway!";
  const rows: [string, string][] = [];
  if (prizeBookTitle) {
    rows.push([isEs ? "Premio" : "Prize", `📖 ${prizeBookTitle}`]);
  }
  rows.push(
    [isEs ? "Plazo para reclamar" : "Claim deadline", claimDeadline],
    [isEs ? "Qué hacer" : "What to do", isEs
      ? "Inicia sesión, elige tu libro y envía tu nombre completo y dirección de envío"
      : "Log in, choose your book and submit your full name and shipping address"],
    [isEs ? "Reclama aquí" : "Claim here", `<a href="${claimUrl}" style="color:#6b4c3b;font-weight:700">${claimUrl}</a>`],
  );
  const html = card(
    "🏆",
    isEs ? "¡Ganaste el Sorteo!" : "You Won the Giveaway!",
    rows,
    isEs
      ? "⚠️ Si no reclamas antes de la fecha límite, el premio se pierde. Necesitamos tu nombre completo y dirección para enviar el libro."
      : "⚠️ If you don't claim before the deadline, the prize is forfeited. We need your full name and shipping address to send the book."
  );
  await sendToUser(userEmail, subject, html);
}

// ── Admin monthly draw report ────────────────────────

interface MonthlyDrawReport {
  month: string;
  prizeBook: string;
  hasRealWinners: boolean;
  winners: { name: string; email: string }[];
  eligibleUsers: number;
  totalTickets: number;
  totalRegistered: number;
  totalSubscribers: number;
  nextMonth: string;
  nextPrizeBook: string;
  nextDrawDate: string;
  summary: string;
}

/** Email admin with monthly giveaway draw results */
export async function notifyAdminMonthlyDraw(report: MonthlyDrawReport): Promise<void> {
  const winnersText = report.hasRealWinners
    ? report.winners.map(w => `${w.name} (${w.email})`).join(", ")
    : "None — no participants this month";

  const rows: [string, string][] = [
    ["Month", report.month],
    ["Prize Book", report.prizeBook],
    ["Eligible Users", String(report.eligibleUsers)],
    ["Total Tickets", String(report.totalTickets)],
    ["Winners", winnersText],
    ["─────", "─────"],
    ["Registered Users", String(report.totalRegistered)],
    ["Newsletter Subs", String(report.totalSubscribers)],
    ["─────", "─────"],
    ["Next Month", report.nextMonth],
    ["Next Prize", report.nextPrizeBook],
    ["Next Draw Date", report.nextDrawDate],
  ];

  if (report.hasRealWinners) {
    rows.push(
      ["─────", "─────"],
      ["⚠️ ACTION", "Winners must claim within 14 days. Check /admin/lottery/ for unclaimed prizes. You'll get a notification when they submit shipping info."],
    );
  }

  const emoji = report.hasRealWinners ? "🏆" : "📊";
  const title = report.hasRealWinners
    ? `Monthly Draw Complete — ${report.winners.length} Winner(s)!`
    : "Monthly Draw — No Participants";

  await send(
    `${emoji} Giveaway ${report.month}: ${report.summary}`,
    card(emoji, title, rows, report.summary)
  );
}

/** Notify admin that the cron job failed */
export async function notifyAdminCronError(job: string, errorMsg: string): Promise<void> {
  await send(
    `🚨 CRON FAILED: ${job}`,
    card("🚨", `Cron Job Failed: ${job}`, [
      ["Error", errorMsg.slice(0, 500)],
      ["Time", new Date().toISOString()],
    ], "Check Vercel logs for full stack trace.")
  );
}

/** Notify admin about expired unclaimed prizes */
export async function notifyAdminExpiredClaims(
  claims: { email: string; month: string; deadline: string }[]
): Promise<void> {
  const list = claims.map(c => `${c.email} (${c.month}, expired ${c.deadline})`).join("<br/>");
  await send(
    `⏰ ${claims.length} Unclaimed Prize(s) Expired`,
    card("⏰", "Unclaimed Prizes Expired", [
      ["Count", String(claims.length)],
      ["Details", list],
    ], "These winners did not submit shipping info in time. Consider re-drawing or carrying the prize forward.")
  );
}
