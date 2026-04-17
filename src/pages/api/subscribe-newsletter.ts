import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = import.meta.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";

async function notifyAdmin(email: string, name: string, source: string, lang: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Little Chubby Press <noreply@littlechubbypress.com>",
        to: [ANALYTICS_EMAIL],
        subject: `📬 New Newsletter Subscriber: ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#f9f7f3;border-radius:12px">
            <h2 style="color:#6b4c3b;margin:0 0 12px">📬 New Subscriber!</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#888">Email</td><td style="padding:6px 0;font-weight:700">${email}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Name</td><td style="padding:6px 0">${name || "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Source</td><td style="padding:6px 0">${source}</td></tr>
              <tr><td style="padding:6px 0;color:#888">Language</td><td style="padding:6px 0">${lang}</td></tr>
            </table>
          </div>`,
      }),
    });
  } catch {
    // Non-blocking — don't fail the signup if notification fails
  }
}

export const POST: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { email, name, source, lang_pref } = body;

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers,
      });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers,
      });
    }

    const svc = getServiceClient();

    const { error } = await svc.from("newsletter_subscribers").insert({
      email: email.trim().toLowerCase(),
      name: (name || "").trim(),
      source: source || "popup",
      lang_pref: lang_pref || "en",
      confirmed: false,
    });

    if (error) {
      // 23505 = unique violation (already subscribed) — still OK
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true, existing: true }), {
          status: 200,
          headers,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }

    // Send admin notification (non-blocking)
    notifyAdmin(email, name || "", source || "popup", lang_pref || "en");

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers,
    });
  }
};
