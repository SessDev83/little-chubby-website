#!/usr/bin/env node
/**
 * Send test notification emails to verify the setup works.
 * Usage: node scripts/test-notifications.mjs
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY env var");
  process.exit(1);
}

const now = new Date().toISOString().replace("T", " ").slice(0, 19);

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

// Test 1: New user registration
console.log("📧 Sending test: New User Registration...");
const r1 = await send(
  "🎉 New User Registered: maria@example.com (TEST)",
  `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#f9f7f3;border-radius:12px">
    <h2 style="color:#6b4c3b;margin:0 0 12px">🎉 New User!</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0;font-weight:700">maria@example.com</td></tr>
      <tr><td style="padding:6px 0;color:#888">Language</td><td style="padding:6px 0">es</td></tr>
      <tr><td style="padding:6px 0;color:#888">Time</td><td style="padding:6px 0">${now} UTC</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#999;text-align:center">⚠️ This is a TEST notification</p>
  </div>`
);
console.log(r1.ok ? `  ✅ Sent (id: ${r1.data.id})` : `  ❌ ${JSON.stringify(r1.data)}`);

// Test 2: Newsletter subscriber
console.log("\n📧 Sending test: Newsletter Subscriber...");
const r2 = await send(
  "📬 New Newsletter Subscriber: sarah@example.com (TEST)",
  `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#f9f7f3;border-radius:12px">
    <h2 style="color:#6b4c3b;margin:0 0 12px">📬 New Subscriber!</h2>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0;font-weight:700">sarah@example.com</td></tr>
      <tr><td style="padding:6px 0;color:#888">Name</td><td style="padding:6px 0">Sarah Johnson</td></tr>
      <tr><td style="padding:6px 0;color:#888">Source</td><td style="padding:6px 0">popup</td></tr>
      <tr><td style="padding:6px 0;color:#888">Language</td><td style="padding:6px 0">en</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#999;text-align:center">⚠️ This is a TEST notification</p>
  </div>`
);
console.log(r2.ok ? `  ✅ Sent (id: ${r2.data.id})` : `  ❌ ${JSON.stringify(r2.data)}`);

console.log("\n✅ Done! Check your inbox at:", ANALYTICS_EMAIL);
