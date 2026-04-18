#!/usr/bin/env node
/**
 * Send test notification emails for ALL notification types.
 * Usage: node scripts/test-notifications.mjs
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY env var");
  process.exit(1);
}

const ts = new Date().toISOString().replace("T", " ").slice(0, 16);

function card(emoji, title, rows) {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0 6px 12px;font-weight:600">${value}</td></tr>`
    )
    .join("");
  return `
  <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:460px;margin:0 auto;padding:24px;background:#f9f7f3;border-radius:12px;border:1px solid #e8e0d4">
    <h2 style="color:#6b4c3b;margin:0 0 16px;font-size:18px">${emoji} ${title}</h2>
    <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
    <p style="margin:16px 0 0;font-size:12px;color:#e74c3c;text-align:center">⚠️ TEST — not a real event</p>
    <hr style="border:none;border-top:1px solid #e8e0d4;margin:16px 0 8px" />
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">Little Chubby Press &middot; ${ts} UTC</p>
  </div>`;
}

async function send(subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Little Chubby Press <noreply@littlechubbypress.com>",
      to: [ANALYTICS_EMAIL],
      subject,
      html,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

const tests = [
  {
    label: "New User Registration",
    subject: "🎉 New User Registered: maria@example.com (TEST)",
    html: card("🎉", "New User Registered", [
      ["Email", "maria@example.com"],
      ["Language", "es"],
      ["Total Users", "42"],
    ]),
  },
  {
    label: "New Newsletter Subscriber",
    subject: "📬 New Subscriber: sarah@example.com (TEST)",
    html: card("📬", "New Newsletter Subscriber", [
      ["Email", "sarah@example.com"],
      ["Name", "Sarah Johnson"],
      ["Source", "popup"],
      ["Language", "en"],
      ["Total Subscribers", "128"],
    ]),
  },
  {
    label: "Subscriber Confirmed",
    subject: "✅ Subscriber Confirmed: sarah@example.com (TEST)",
    html: card("✅", "Subscriber Confirmed", [
      ["Email", "sarah@example.com"],
      ["Confirmed Total", "97"],
    ]),
  },
  {
    label: "New Book Review",
    subject: "📖 New Review (★★★★★): Magical Creatures (TEST)",
    html: card("📖", "New Book Review", [
      ["User", "maria@example.com"],
      ["Book", "Magical Creatures"],
      ["Rating", "★★★★★"],
      ["Review", "My daughter absolutely loved coloring these unicorns! The pages are thick and the designs are perfect for her age."],
      ["Total Reviews", "15"],
    ]),
  },
  {
    label: "Review Updated",
    subject: "✏️ Review Updated (★★★★☆): Chic Styles (TEST)",
    html: card("✏️", "Review Updated", [
      ["User", "anna@example.com"],
      ["Book", "Chic Styles"],
      ["New Rating", "★★★★☆"],
    ]),
  },
  {
    label: "Artwork Downloaded",
    subject: "🎨 Artwork Downloaded: Cute Dragon (TEST)",
    html: card("🎨", "Artwork Downloaded", [
      ["User", "maria@example.com"],
      ["Artwork", "Cute Dragon"],
      ["Credits Left", "4"],
      ["Total Downloads", "231"],
    ]),
  },
  {
    label: "Lottery Prize Claimed",
    subject: "🏆 Prize Claimed by maria@example.com (TEST)",
    html: card("🏆", "Lottery Prize Claimed", [
      ["User", "maria@example.com"],
      ["Book Chosen", "Magical Creatures"],
      ["Ship To", "María García"],
      ["Address", "123 Calle Ejemplo, Madrid, Spain 28001"],
    ]),
  },
];

console.log(`\n📧 Sending ${tests.length} test notifications to ${ANALYTICS_EMAIL}...\n`);

for (const t of tests) {
  const r = await send(t.subject, t.html);
  console.log(r.ok ? `  ✅ ${t.label} (id: ${r.data.id})` : `  ❌ ${t.label}: ${JSON.stringify(r.data)}`);
}

console.log(`\n✅ Done! Check your inbox at: ${ANALYTICS_EMAIL}\n`);
