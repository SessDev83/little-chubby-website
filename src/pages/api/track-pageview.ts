import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";
import { recordAnalyticsIdentity } from "../../lib/analytics-identity";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function cleanText(value: unknown, max = 300): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}

function cleanPath(value: unknown): string | null {
  const path = cleanText(value, 1000);
  if (!path || !path.startsWith("/") || path.startsWith("/admin")) return null;
  return path;
}

function cleanCountry(value: string | null): string | null {
  const country = cleanText(value, 8)?.toUpperCase() || null;
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}

function firstHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const value = cleanText(headers.get(name), 64);
    if (value) return value;
  }
  return null;
}

function cleanLocalDate(value: unknown): string | null {
  const date = cleanText(value, 10);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanIdentityId(value: unknown): string | null {
  const text = cleanText(value, 180);
  return text && /^[a-z0-9:_-]+$/i.test(text) ? text : null;
}

function isBot(headers: Headers): boolean {
  const ua = headers.get("user-agent") || "";
  return /bot|crawler|spider|preview|lighthouse|pagespeed/i.test(ua);
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (isBot(request.headers)) {
    return new Response(JSON.stringify({ ok: true, skipped: "bot" }), { status: 202, headers: JSON_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: JSON_HEADERS });
  }

  const path = cleanPath(body.path);
  if (!path) {
    return new Response(JSON.stringify({ ok: true, skipped: "invalid_path" }), { status: 202, headers: JSON_HEADERS });
  }

  const headerCountry = cleanCountry(firstHeader(request.headers, [
    "x-vercel-ip-country",
    "x-country-code",
    "cf-ipcountry",
  ]));

  const authUser = locals.user ? { id: locals.user.id, email: locals.user.email } : null;

  const sessionId = cleanIdentityId(body.session_id);
  const anonymousId = cleanIdentityId(body.anonymous_id);
  const visitorHash = cleanText(body.visitor_hash, 160);

  const payload = {
    path,
    referrer: cleanText(body.referrer, 1000),
    visitor_hash: visitorHash,
    user_id: authUser?.id || null,
    session_id: sessionId,
    anonymous_id: anonymousId,
    country: headerCountry,
    utm_source: cleanText(body.utm_source, 120),
    utm_medium: cleanText(body.utm_medium, 120),
    utm_campaign: cleanText(body.utm_campaign, 180),
    utm_content: cleanText(body.utm_content, 180),
    landing_page: cleanText(body.landing_page, 1000),
    timezone: cleanText(body.timezone, 80),
    local_date: cleanLocalDate(body.local_date),
    local_hour: cleanNumber(body.local_hour, 0, 23),
    local_weekday: cleanNumber(body.local_weekday, 0, 6),
  };

  const sc = getServiceClient() as any;
  const { error } = await sc.from("pageviews").insert(payload);
  if (!error) {
    if (authUser) {
      await recordAnalyticsIdentity(sc, {
        userId: authUser.id,
        email: authUser.email,
        anonymousId,
        sessionId,
        visitorHash,
        linkReason: "pageview",
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 201, headers: JSON_HEADERS });
  }

  if (/user_id|session_id|anonymous_id|timezone|local_date|local_hour|local_weekday|schema cache|column/i.test(error.message || "")) {
    const legacyPayload = {
      path: payload.path,
      referrer: payload.referrer,
      visitor_hash: payload.visitor_hash,
      country: payload.country,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      landing_page: payload.landing_page,
    };
    const retry = await sc.from("pageviews").insert(legacyPayload);
    if (!retry.error) {
      if (authUser) {
        await recordAnalyticsIdentity(sc, {
          userId: authUser.id,
          email: authUser.email,
          anonymousId,
          sessionId,
          visitorHash,
          linkReason: "pageview_legacy",
        });
      }
      return new Response(JSON.stringify({ ok: true, fallback: true }), { status: 201, headers: JSON_HEADERS });
    }
  }

  return new Response(JSON.stringify({ error: "insert_failed" }), { status: 500, headers: JSON_HEADERS });
};
