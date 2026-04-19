import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";
import { notifyNewSubscriber, sendConfirmationEmail } from "../../lib/notifications";

export const prerender = false;

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

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "").trim();
    const lang = lang_pref || "en";
    const svc = getServiceClient();

    const { data, error } = await svc.from("newsletter_subscribers").insert({
      email: cleanEmail,
      name: cleanName,
      source: source || "popup",
      lang_pref: lang,
      confirmed: false,
    }).select("confirm_token").single();

    if (error) {
      // 23505 = unique violation (already subscribed)
      if (error.code === "23505") {
        // Look up existing subscriber
        const { data: existing } = await svc
          .from("newsletter_subscribers")
          .select("confirm_token, confirmed")
          .eq("email", cleanEmail)
          .single();

        if (existing && !existing.confirmed) {
          // Update lang_pref, reset drip, AND reset created_at so Day 20 cleanup
          // counts from this re-subscribe moment, not the original signup
          await svc
            .from("newsletter_subscribers")
            .update({
              lang_pref: lang,
              reminder_count: 0,
              last_reminder_at: null,
              created_at: new Date().toISOString(),
            })
            .eq("email", cleanEmail);

          await sendConfirmationEmail(cleanEmail, cleanName, existing.confirm_token, lang);
          return new Response(JSON.stringify({ ok: true, existing: true, confirmed: false }), {
            status: 200,
            headers,
          });
        }

        // Already confirmed
        return new Response(JSON.stringify({ ok: true, existing: true, confirmed: true }), {
          status: 200,
          headers,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Insert succeeded but no data returned" }), {
        status: 500,
        headers,
      });
    }

    // Await confirmation email — must complete before serverless function exits
    await sendConfirmationEmail(cleanEmail, cleanName, data.confirm_token, lang);

    // Admin notification (awaited to prevent loss on Vercel)
    await notifyNewSubscriber(cleanEmail, cleanName, source || "popup", lang);

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
