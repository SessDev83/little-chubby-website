import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const SHOUTOUT_COST = 30;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-cache, max-age=0",
  };

  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers });
    }

    const user_id = sessionData.session.user.id;
    const body = await request.json().catch(() => ({}));
    const review_id = typeof body?.review_id === "string" ? body.review_id : "";

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(review_id)) {
      return new Response(JSON.stringify({ error: "invalid_review_id" }), { status: 400, headers });
    }

    const svc = getServiceClient();

    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "boost",
      p_max_per_hour: 5,
    });
    if (underLimit === false) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    }

    const { data: result, error: rpcErr } = await svc.rpc("purchase_shoutout", {
      p_user_id: user_id,
      p_review_id: review_id,
      p_cost: SHOUTOUT_COST,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = (result || {}) as {
      ok?: boolean;
      error?: string;
      order_id?: string;
      cost?: number;
    };

    if (!res.ok) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        review_not_found: 404,
        not_review_owner: 403,
        active_shoutout_exists: 409,
        invalid_cost: 400,
      };
      return new Response(JSON.stringify(res), {
        status: statusMap[res.error || ""] || 400,
        headers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: res.order_id,
        cost: res.cost,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), { status: 500, headers });
  }
};
