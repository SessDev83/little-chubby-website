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
  lang: string
): Promise<void> {
  const isEs = lang === "es";
  const subject = isEs
    ? "🏆 ¡Felicidades! ¡Ganaste el sorteo mensual!"
    : "🏆 Congratulations! You won the monthly giveaway!";
  const html = card(
    "🏆",
    isEs ? "¡Ganaste el Sorteo!" : "You Won the Giveaway!",
    [
      [isEs ? "Plazo para reclamar" : "Claim deadline", claimDeadline],
    ],
    isEs
      ? "Inicia sesión y reclama tu premio en littlechubbypress.com"
      : "Log in and claim your prize at littlechubbypress.com"
  );
  await sendToUser(userEmail, subject, html);
}
