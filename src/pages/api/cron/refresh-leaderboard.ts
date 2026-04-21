import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";

export const prerender = false;

/**
 * Daily cron: refresh the monthly_leaderboard materialized view.
 * Protected by Bearer CRON_SECRET header.
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
  const { error } = await svc.rpc("refresh_monthly_leaderboard");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
