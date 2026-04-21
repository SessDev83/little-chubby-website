import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const BADGE_COSTS: Record<string, number> = {
  frame_gold: 15,
  frame_silver: 15,
  top_reviewer: 15,
  star_parent: 15,
  frame_animated: 20,
};
const VALID_TYPES = Object.keys(BADGE_COSTS);

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers,
      });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers,
      });
    }

    const user_id = sessionData.session.user.id;
    const body = await request.json();
    const { badge_type } = body;

    if (!badge_type || !VALID_TYPES.includes(badge_type)) {
      return new Response(JSON.stringify({ error: "Invalid badge type" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    // ── Rate limit: max 5 badge purchases per hour ──
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "badge",
      p_max_per_hour: 5,
    });
    if (underLimit === false) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
      );
    }

    // ── Atomic purchase: check ownership + balance + insert badge + deduct ──
    const { data: result, error: rpcErr } = await svc.rpc("purchase_badge", {
      p_user_id: user_id,
      p_badge_type: badge_type,
      p_cost: BADGE_COSTS[badge_type],
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as { success: boolean; error?: string; balance?: number; cost?: number; badge_id?: string };

    if (!res.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        already_owned: 409,
      };
      return new Response(
        JSON.stringify({ error: res.error, balance: res.balance, cost: res.cost }),
        { status: statusMap[res.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        badge_id: res.badge_id,
        balance: res.balance,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
