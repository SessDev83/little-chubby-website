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

async function sendToUser(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
  } catch {
    // Non-blocking
  }
}

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
