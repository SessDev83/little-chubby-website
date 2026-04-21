import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";

export const prerender = false;

/**
 * Monthly cron (1st of each month): award +10 🥜 and a
 * 'top_earner_YYYY_MM' badge to the previous month's top 5
 * opted-in earners. Protected by Bearer CRON_SECRET.
 */
export const GET: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  const cronSecret = import.meta.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), { status: 500, headers });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const svc = getServiceClient();
  const { data, error } = await svc.rpc("award_monthly_top_earners");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ ok: true, result: data }), { status: 200, headers });
};
