import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const BOOST_COST = 10;
const BOOST_DURATION_DAYS = 7;
const VALID_TYPES = ["pin_7d", "gold_border"];

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
    const { review_id, boost_type } = body;

    if (!review_id || !boost_type || !VALID_TYPES.includes(boost_type)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    // ── Rate limit: max 5 boosts per hour ──
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "boost",
      p_max_per_hour: 5,
    });
    if (underLimit === false) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
      );
    }

    // Verify the review belongs to this user and is approved
    const { data: review } = await svc
      .from("book_reviews")
      .select("id, user_id, status")
      .eq("id", review_id)
      .single();

    if (!review || review.user_id !== user_id) {
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404, headers,
      });
    }

    if (review.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Only approved reviews can be boosted" }),
        { status: 400, headers }
      );
    }

    // ── Atomic purchase: check active boost + balance + insert + deduct ──
    const { data: result, error: rpcErr } = await svc.rpc("purchase_boost", {
      p_user_id: user_id,
      p_review_id: review_id,
      p_boost_type: boost_type,
      p_cost: BOOST_COST,
      p_duration_days: BOOST_DURATION_DAYS,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as { success: boolean; error?: string; balance?: number; cost?: number; boost_id?: string; expires_at?: string; extended?: boolean };

    if (!res.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        boost_active: 409,
      };
      return new Response(
        JSON.stringify({ error: res.error, balance: res.balance, cost: res.cost }),
        { status: statusMap[res.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        boost_id: res.boost_id,
        expires_at: res.expires_at,
        balance: res.balance,
        extended: !!res.extended,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
