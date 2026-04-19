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

    const svc = getServiceClient();

    const { data, error } = await svc.from("newsletter_subscribers").insert({
      email: email.trim().toLowerCase(),
      name: (name || "").trim(),
      source: source || "popup",
      lang_pref: lang_pref || "en",
      confirmed: false,
    }).select("confirm_token").single();

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "").trim();
    const lang = lang_pref || "en";

    if (error) {
      // 23505 = unique violation (already subscribed)
      if (error.code === "23505") {
        // If not yet confirmed, re-send confirmation in current language
        const { data: existing } = await svc
          .from("newsletter_subscribers")
          .select("confirm_token, confirmed")
          .eq("email", cleanEmail)
          .single();

        if (existing && !existing.confirmed) {
          // Update lang_pref & reset reminder counter so they restart the drip
          await svc
            .from("newsletter_subscribers")
            .update({ lang_pref: lang, reminder_count: 0, last_reminder_at: null })
            .eq("email", cleanEmail);

          sendConfirmationEmail(cleanEmail, cleanName, existing.confirm_token, lang);
        }

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

    // Send confirmation email to the subscriber (in their language)
    sendConfirmationEmail(cleanEmail, cleanName, data.confirm_token, lang);

    // Send admin notification (non-blocking)
    notifyNewSubscriber(cleanEmail, cleanName, source || "popup", lang);

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
