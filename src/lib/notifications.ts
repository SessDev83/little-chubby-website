/**
 * Centralized email notification system for Little Chubby Press.
 * All admin notifications go through this module.
 */
import * as Sentry from "@sentry/astro";
import { getServiceClient } from "./supabase";
import { getPublicSiteUrl } from "./site-url";

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = import.meta.env.ANALYTICS_EMAIL || "hello@littlechubbypress.com";
const FROM = "Little Chubby Press <hello@littlechubbypress.com>";

// ── HTML escape helper (prevents XSS in emails) ─────

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Plain-text-style HTML (avoids Gmail Promotions tab) ──

function card(_emoji: string, title: string, rows: [string, string | { raw: string }][], footer?: string): string {
  const lines = rows.map(([label, value]) => {
    const safeVal = typeof value === "object" && "raw" in value ? value.raw : escapeHtml(String(value));
    return `<b>${escapeHtml(label)}:</b> ${safeVal}`;
  }).join("<br>");
  const footerLine = footer ? `<br><span style="color:#999;font-size:12px">${footer}</span>` : "";
  return `<p><b>${title}</b></p><p>${lines}</p>${footerLine}<br><span style="color:#aaa;font-size:11px">${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC</span>`;
}

// ── Send helper ──────────────────────────────────────

async function send(subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[notifications] RESEND_API_KEY not set — skipping:", subject);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [ANALYTICS_EMAIL], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[notifications] Resend ${res.status}: ${body} — subject: ${subject}`);
    }
  } catch (err) {
    console.error("[notifications] send failed:", err, "— subject:", subject);
  }
}

// ── Send to subscriber ───────────────────────────────

const FROM_USER = "Little Chubby Press <hello@littlechubbypress.com>";
const SITE_URL = getPublicSiteUrl();
const LOGO_URL = `${SITE_URL}/images/brand/logo-lockup.png`;

type UserEmailOptions = {
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export async function sendToUser(
  to: string,
  subject: string,
  html: string,
  options: UserEmailOptions = {},
): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const payload: Record<string, unknown> = {
      from: FROM_USER,
      to: [to],
      subject,
      html,
      reply_to: options.replyTo || "hello@littlechubbypress.com",
    };
    if (options.text) payload.text = options.text.trim();
    if (options.tags?.length) payload.tags = options.tags;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Notification preferences gate (E.4) ──────────────
// Kinds: "giveaway" (gifted tickets), "community" (shoutout/pin),
//        "shop" (drops, early access). Winner, account & security
//        emails are transactional and bypass this check.
// Returns true when pref is missing (forward-compatible) or explicitly on.
export async function canSendEmail(
  userId: string,
  kind: "giveaway" | "community" | "shop",
): Promise<boolean> {
  try {
    const svc = getServiceClient();
    const { data, error } = await svc.rpc("can_send_email", {
      p_user_id: userId,
      p_kind: kind,
    });
    if (error) {
      console.error("[notifications] can_send_email RPC error:", error.message);
      return true; // fail-open: do not block on RPC errors
    }
    // RPC returns boolean; Supabase wraps in value — coerce safely.
    if (typeof data === "boolean") return data;
    return true;
  } catch (err) {
    console.error("[notifications] canSendEmail threw:", err);
    return true; // fail-open
  }
}

// Convenience: gate + send. Use for non-transactional user emails.
export async function sendToUserIfAllowed(
  userId: string,
  kind: "giveaway" | "community" | "shop",
  to: string,
  subject: string,
  html: string,
): Promise<{ sent: boolean; reason?: "opted_out" | "send_failed" }> {
  const allowed = await canSendEmail(userId, kind);
  if (!allowed) return { sent: false, reason: "opted_out" };
  const ok = await sendToUser(to, subject, html);
  return ok ? { sent: true } : { sent: false, reason: "send_failed" };
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

function transactionalEmail(lang: string, preheader: string, bodyContent: string): string {
  const isEs = lang === "es";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f6f1e7;margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e7;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background:#ffffff;border:1px solid #eadfcd;border-radius:8px;overflow:hidden;border-collapse:separate;">
          <tr>
            <td align="center" style="background:#fffaf2;border-bottom:1px solid #eadfcd;padding:20px 24px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Little Chubby Press" width="176" style="display:block;margin:0 auto;border:0;max-width:176px;height:auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 24px 22px;color:#3f3329;font-size:15px;line-height:1.58;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="background:#fffaf2;border-top:1px solid #eadfcd;padding:15px 24px;text-align:center;color:#6b4c3b;font-size:12px;line-height:1.5;">
              <p style="margin:0 0 4px;font-weight:700;color:#6b4c3b;">Little Chubby Press</p>
              <p style="margin:0;"><a href="${SITE_URL}" style="color:#1f4f86;text-decoration:underline;">${escapeHtml(new URL(SITE_URL).hostname.replace(/^www\./, ""))}</a></p>
              <p style="margin:8px 0 0;color:#8b7d6c;">${isEs ? "Email transaccional enviado por una acción en tu cuenta." : "Transactional email sent because of an account action."}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:22px 0 20px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:#5c9650;color:#ffffff;font-weight:700;padding:12px 22px;border-radius:7px;text-decoration:none;font-size:15px;line-height:1.2;">${escapeHtml(label)}</a>
  </div>`;
}

function ticketWord(quantity: number) {
  return quantity === 1 ? "ticket" : "tickets";
}

function ticketCount(quantity: number) {
  return `${quantity} ${ticketWord(quantity)}`;
}

function emailDateLabel(value: string | Date, lang: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function giftSummary(senderDisplay: string, quantity: number, lang: string): string {
  const isEs = lang === "es";
  return `<div style="border:1px solid #eadfcd;border-left:4px solid #d3a442;border-radius:7px;padding:16px 18px;margin:18px 0;background:#fffaf2;">
    <p style="margin:0 0 8px;color:#6b4c3b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${isEs ? "Tickets enviados" : "Tickets sent"}</p>
    <p style="margin:0;color:#2f261f;font-size:30px;line-height:1.1;font-weight:800;">${escapeHtml(ticketCount(quantity))}</p>
    <p style="margin:8px 0 0;color:#6b4c3b;font-size:14px;">${isEs ? "De parte de" : "From"}: <b>${escapeHtml(senderDisplay)}</b></p>
  </div>`;
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
    // Generic helper accepts arbitrary table names; cast through `any` because
    // PostgREST typing requires literal table-name unions.
    let query = (svc.from as any)(table).select("id", { count: "exact", head: true });
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
  const moderationUrl = `${SITE_URL}/admin/lottery/`;
  await send(
    `📖 New Review (${stars}): ${bookTitle}`,
    card("📖", "New Book Review", [
      ["User", userEmail],
      ["Book", bookTitle],
      ["Rating", stars],
      ["Review", reviewText.slice(0, 200) || "—"],
      ["Total Reviews", String(totalReviews)],
      ["Moderate", { raw: `<a href="${moderationUrl}" style="color:#1f4f86;font-weight:700">Open moderation queue</a>` }],
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
  const moderationUrl = `${SITE_URL}/admin/lottery/`;
  await send(
    `✏️ Review Updated (${stars}): ${bookTitle}`,
    card("✏️", "Review Updated", [
      ["User", userEmail],
      ["Book", bookTitle],
      ["New Rating", stars],
      ["Moderate", { raw: `<a href="${moderationUrl}" style="color:#1f4f86;font-weight:700">Open moderation queue</a>` }],
    ])
  );
}

// ── User-facing email notifications ──────────────────

/** Notify user their review was approved */
export async function emailUserReviewApproved(
  userEmail: string,
  bookTitle: string,
  lang: string,
  reviewerNote?: string
): Promise<void> {
  const isEs = lang === "es";
  const subject = isEs
    ? `🎉 ¡Tu review de "${bookTitle}" fue aprobada!`
    : `🎉 Your review of "${bookTitle}" was approved!`;
  const rows: [string, string | { raw: string }][] = [
    [isEs ? "Libro" : "Book", bookTitle],
    [isEs ? "Tickets ganados" : "Tickets earned", "5 🎟️"],
  ];
  if (reviewerNote?.trim()) {
    rows.push([isEs ? "Mensaje del equipo" : "Team message", reviewerNote.trim()]);
  }
  const html = card(
    "🎉",
    isEs ? "¡Review Aprobada!" : "Review Approved!",
    rows,
    isEs
      ? "¡Usa tus Tickets en el Sorteo mensual! Visita littlechubbypress.com"
      : "Use your Tickets in the monthly Giveaway! Visit littlechubbypress.com"
  );
  await sendToUser(userEmail, subject, html);
}

/** Notify user their review was rejected and include reviewer note */
export async function emailUserReviewRejected(
  userEmail: string,
  bookTitle: string,
  lang: string,
  reviewerNote: string
): Promise<void> {
  const isEs = lang === "es";
  const subject = isEs
    ? `⚠️ Tu review de "${bookTitle}" necesita cambios`
    : `⚠️ Your review of "${bookTitle}" needs changes`;
  const html = card(
    "⚠️",
    isEs ? "Tu review fue rechazada" : "Your review was rejected",
    [
      [isEs ? "Libro" : "Book", bookTitle],
      [isEs ? "Mensaje del revisor" : "Reviewer message", reviewerNote],
    ],
    isEs
      ? "Puedes editar tu review, subir nuevas fotos y volver a enviarla desde tu panel."
      : "You can edit your review, upload new photos, and resubmit it from your account."
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
  const rows: [string, string | { raw: string }][] = [];
  if (prizeBookTitle) {
    rows.push([isEs ? "Premio" : "Prize", `📖 ${prizeBookTitle}`]);
  }
  rows.push(
    [isEs ? "Plazo para reclamar" : "Claim deadline", claimDeadline],
    [isEs ? "Qué hacer" : "What to do", isEs
      ? "Inicia sesión, elige tu libro y envía tu nombre completo y dirección de envío"
      : "Log in, choose your book and submit your full name and shipping address"],
    [isEs ? "Reclama aquí" : "Claim here", { raw: `<a href="${claimUrl}" style="color:#6b4c3b;font-weight:700">${escapeHtml(claimUrl)}</a>` }],
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

/** Notify a user that someone gifted them lottery tickets */
export async function emailUserGiftReceived(
  recipientEmail: string,
  senderDisplay: string,
  quantity: number,
  lang: string
): Promise<void> {
  const isEs = lang === "es";
  const lotteryUrl = `https://littlechubbypress.com/${lang}/lottery/`;
  const subject = isEs
    ? `${senderDisplay} te envió ${ticketCount(quantity)} de Little Chubby Press`
    : `${senderDisplay} sent you ${ticketCount(quantity)} on Little Chubby Press`;
  const preheader = isEs
    ? "Los tickets ya están en tu cuenta. Entra al sorteo mensual cuando quieras."
    : "The tickets are already in your account. You can enter the monthly draw anytime.";
  const body = `
    <h1 style="margin:0 0 12px;color:#6b4c3b;font-size:21px;line-height:1.25;">${isEs ? "Tienes tickets nuevos" : "You have new tickets"}</h1>
    <p style="margin:0 0 14px;color:#4b4239;">${isEs
      ? `${escapeHtml(senderDisplay)} te envió tickets para el sorteo mensual de libros de Little Chubby Press.`
      : `${escapeHtml(senderDisplay)} sent you tickets for the Little Chubby Press monthly book draw.`}</p>
    ${giftSummary(senderDisplay, quantity, lang)}
    <p style="margin:0 0 12px;color:#4b4239;">${isEs
      ? "Ya están acreditados en tu cuenta. Inicia sesión y elige cuántos quieres usar para participar este mes."
      : "They are already credited to your account. Log in and choose how many you want to use for this month's entry."}</p>
    ${emailButton(lotteryUrl, isEs ? "Ver mis tickets" : "View my tickets")}
    <p style="margin:16px 0 0;color:#8b7d6c;font-size:13px;">${isEs
      ? "Si no esperabas este email, no tienes que hacer nada. Tus datos de pago nunca se solicitan para reclamar tickets."
      : "If you were not expecting this email, no action is needed. Payment details are never requested to use tickets."}</p>`;
  const html = transactionalEmail(lang, preheader, body);
  const text = isEs
    ? `${senderDisplay} te envió ${ticketCount(quantity)} de Little Chubby Press. Los tickets ya están en tu cuenta. Verlos: ${lotteryUrl}`
    : `${senderDisplay} sent you ${ticketCount(quantity)} on Little Chubby Press. The tickets are already in your account. View them: ${lotteryUrl}`;
  await sendToUser(recipientEmail, subject, html, {
    text,
    tags: [{ name: "category", value: "gift_ticket_received" }],
  });
}

/** Invite a non-registered recipient to create an account and claim gifted tickets */
export async function emailUserGiftInvite(
  recipientEmail: string,
  senderDisplay: string,
  quantity: number,
  lang: string,
  expiresAt: string | Date
): Promise<void> {
  const isEs = lang === "es";
  const signupUrl = `https://littlechubbypress.com/${lang}/register/?email=${encodeURIComponent(recipientEmail)}`;
  const expDate = new Date(expiresAt);
  const expLabel = emailDateLabel(expiresAt, lang);
  const bonusDeadline = Number.isNaN(expDate.getTime())
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : new Date(expDate.getTime() - 23 * 24 * 60 * 60 * 1000);
  const bonusLabel = emailDateLabel(bonusDeadline, lang);

  const subject = isEs
    ? `${senderDisplay} te envió ${ticketCount(quantity)} de Little Chubby Press`
    : `${senderDisplay} sent you ${ticketCount(quantity)} on Little Chubby Press`;
  const preheader = isEs
    ? "Crea tu cuenta con este mismo email para que los tickets se acrediten automáticamente."
    : "Create your account with this same email so the tickets are credited automatically.";
  const body = `
    <h1 style="margin:0 0 12px;color:#6b4c3b;font-size:21px;line-height:1.25;">${isEs ? "Tienes tickets esperando" : "You have tickets waiting"}</h1>
    <p style="margin:0 0 14px;color:#4b4239;">${isEs
      ? `${escapeHtml(senderDisplay)} te envió tickets para el sorteo mensual de libros de Little Chubby Press.`
      : `${escapeHtml(senderDisplay)} sent you tickets for the Little Chubby Press monthly book draw.`}</p>
    ${giftSummary(senderDisplay, quantity, lang)}
    <p style="margin:0 0 12px;color:#4b4239;">${isEs
      ? "Para recibirlos, crea tu cuenta usando este mismo email. Los tickets se acreditan automaticamente al terminar el registro."
      : "To receive them, create your account using this same email. The tickets are credited automatically when registration is complete."}</p>
    ${emailButton(signupUrl, isEs ? "Crear cuenta" : "Create account")}
    <div style="background:#f3f8f0;border:1px solid #d9ead3;border-radius:7px;padding:14px 16px;margin:18px 0;color:#3f3329;">
      <p style="margin:0 0 6px;font-weight:700;color:#4c7a3f;">${isEs ? "Nota para quien te invitó" : "Note for the sender"}</p>
      <p style="margin:0;font-size:14px;line-height:1.55;">${isEs
        ? `Si creas tu cuenta antes del ${bonusLabel}, ${escapeHtml(senderDisplay)} también recibe ${ticketCount(quantity)} como crédito de agradecimiento. Tus tickets no cambian.`
        : `If you create your account before ${bonusLabel}, ${escapeHtml(senderDisplay)} also receives ${ticketCount(quantity)} as a thank-you credit. Your tickets stay the same.`}</p>
    </div>
    <p style="margin:0 0 8px;color:#4b4239;font-size:14px;">${isEs
      ? `Esta invitación vence el ${expLabel}. Si no se reclama, los tickets regresan al remitente.`
      : `This invitation expires on ${expLabel}. If it is not claimed, the tickets return to the sender.`}</p>
    <p style="margin:16px 0 0;color:#8b7d6c;font-size:13px;">${isEs
      ? "Little Chubby Press nunca te pedirá datos de pago para recibir estos tickets."
      : "Little Chubby Press will never ask for payment details to receive these tickets."}</p>`;
  const html = transactionalEmail(lang, preheader, body);
  const text = isEs
    ? `${senderDisplay} te envió ${ticketCount(quantity)} de Little Chubby Press. Crea tu cuenta con este mismo email para recibirlos: ${signupUrl}. La invitación vence el ${expLabel}.`
    : `${senderDisplay} sent you ${ticketCount(quantity)} on Little Chubby Press. Create your account with this same email to receive them: ${signupUrl}. The invitation expires on ${expLabel}.`;
  await sendToUser(recipientEmail, subject, html, {
    text,
    tags: [{ name: "category", value: "gift_ticket_invite" }],
  });
}

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

  const rows: [string, string | { raw: string }][] = [
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
  Sentry.withScope((scope) => {
    scope.setTag("surface", "cron");
    scope.setTag("cron_job", job);
    scope.setLevel("error");
    scope.setContext("cron", {
      job,
      error: errorMsg.slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    Sentry.captureException(new Error(`[cron:${job}] ${errorMsg.slice(0, 500)}`));
  });

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
  const list = claims.map(c => `${escapeHtml(c.email)} (${escapeHtml(c.month)}, expired ${escapeHtml(c.deadline)})`).join("<br/>");
  await send(
    `⏰ ${claims.length} Unclaimed Prize(s) Expired`,
    card("⏰", "Unclaimed Prizes Expired", [
      ["Count", String(claims.length)],
      ["Details", { raw: list }],
    ], "These winners did not submit shipping info in time. Consider re-drawing or carrying the prize forward.")
  );
}

/**
 * GDPR Art. 17 signal: notify admin that a user deleted their own account.
 *
 * IMPORTANT: The user and all their rows are already deleted by the time this
 * runs (RPC public.delete_user_account cascaded). We intentionally store NO
 * PII in the outbound email — only a SHA-256 prefix of the email and user_id,
 * which lets the operator correlate repeated events from the same user
 * without retaining identifiable data (which would contradict Art. 17).
 *
 * This is fire-and-forget: failure to email must never block the delete
 * response to the (now ex-)user.
 */
export async function notifyAdminAccountDeleted(
  emailHash: string,
  userIdHash: string,
  context: { deletedAt: string; lang?: string | null }
): Promise<void> {
  try {
    await send(
      `🗑️ Account deleted (GDPR Art. 17)`,
      card("🗑️", "Account Deletion Completed", [
        ["Email hash (SHA-256/12)", emailHash],
        ["User ID hash (SHA-256/12)", userIdHash],
        ["Language pref", context.lang || "unknown"],
        ["Deleted at (UTC)", context.deletedAt],
      ], "Record of Processing (GDPR Art. 30): user invoked right to erasure. All rows cascaded from auth.users. No PII retained in this notification.")
    );
  } catch (err) {
    // Absolutely must not bubble — the user's delete already succeeded.
    console.error("[notifyAdminAccountDeleted] send failed:", err);
  }
}
