import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";
import { notifyAdminCronError } from "../../../lib/notifications";
import { pingHeartbeat } from "../../../lib/monitoring";

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

  try {
    const svc = getServiceClient();
    const { error } = await svc.rpc("refresh_monthly_leaderboard");
    if (error) throw new Error(error.message);
    await pingHeartbeat("refresh-leaderboard");
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdminCronError("refresh-leaderboard", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
};
