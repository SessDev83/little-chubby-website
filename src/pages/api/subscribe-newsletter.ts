import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getServiceClient } from "../../lib/supabase";
import { notifyNewSubscriber, sendConfirmationEmail } from "../../lib/notifications";

export const prerender = false;

// Rate-limit constants. Pkg P4-A6.
//   - Per-IP: 5 new subscriptions / hour. Stops bot bursts from a single host.
//   - Global: 500 new subscriptions / hour. Circuit-breaker only; high enough
//     that a legitimate viral spike (Pinterest pin trending) is not throttled.
const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 500;
const WINDOW_MS = 60 * 60 * 1000;

function getClientIpHash(request: Request, clientAddress: string | null): string | null {
  // Vercel forwards real client IP via x-forwarded-for; first entry is origin.
  const xff = request.headers.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0].trim() : "") || clientAddress || "";
  if (!ip) return null;
  // Salt with the service-role key so the hash cannot be rainbow-table'd from
  // a leaked db dump alone. Never stored or transmitted in plain.
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "lcp-fallback-salt";
  return createHash("sha256").update(ip + "|" + salt).digest("hex").slice(0, 32);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const svc = getServiceClient();
    const ipHash = getClientIpHash(request, clientAddress ?? null);
    const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();

    // ── Per-IP throttle (only when we could derive an IP hash) ──
    if (ipHash) {
      const { count: ipCount } = await svc
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", sinceIso);
      if ((ipCount ?? 0) >= PER_IP_LIMIT) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers,
        });
      }
    }

    // ── Global circuit-breaker (raised from 30 → 500) ──
    const { count: globalCount } = await svc
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sinceIso);

    if ((globalCount ?? 0) >= GLOBAL_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers,
      });
    }

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

    const { data, error } = await svc.from("newsletter_subscribers").insert({
      email: cleanEmail,
      name: cleanName,
      source: source || "popup",
      lang_pref: lang,
      confirmed: false,
      ip_hash: ipHash,
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
              name: cleanName || undefined,
              lang_pref: lang,
              reminder_count: 0,
              last_reminder_at: null,
              created_at: new Date().toISOString(),
            })
            .eq("email", cleanEmail);

          const emailSent = await sendConfirmationEmail(cleanEmail, cleanName, existing.confirm_token!, lang);
          if (!emailSent) {
            return new Response(JSON.stringify({ error: "Failed to send confirmation email" }), {
              status: 502,
              headers,
            });
          }
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
    const emailSent = await sendConfirmationEmail(cleanEmail, cleanName, data.confirm_token!, lang);
    if (!emailSent) {
      return new Response(JSON.stringify({ error: "Failed to send confirmation email" }), {
        status: 502,
        headers,
      });
    }

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
