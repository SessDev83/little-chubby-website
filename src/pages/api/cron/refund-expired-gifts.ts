import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";
import { notifyAdminCronError } from "../../../lib/notifications";
import { pingHeartbeat } from "../../../lib/monitoring";

export const prerender = false;

/**
 * Daily cron: refund pending gifts that have expired (30 days unclaimed).
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
    const { data, error } = await svc.rpc("refund_expired_pending_gifts");
    if (error) throw new Error(error.message);
    await pingHeartbeat("refund-expired-gifts");
    return new Response(JSON.stringify({ refunded_count: data ?? 0 }), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdminCronError("refund-expired-gifts", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
};
