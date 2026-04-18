import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const BADGE_COST = 15;
const VALID_TYPES = ["frame_gold", "frame_silver", "top_reviewer", "star_parent"];

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

    // Check balance
    const { data: balanceData } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });
    const balance = typeof balanceData === "number" ? balanceData : 0;

    if (balance < BADGE_COST) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits", balance, cost: BADGE_COST }),
        { status: 403, headers }
      );
    }

    // Check if user already owns this active badge
    const { data: existing } = await svc
      .from("profile_badges")
      .select("id")
      .eq("user_id", user_id)
      .eq("badge_type", badge_type)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "already_owned", badge_type }),
        { status: 409, headers }
      );
    }

    // Insert badge
    const { data: badge, error: badgeErr } = await svc
      .from("profile_badges")
      .insert({ user_id, badge_type })
      .select("id")
      .single();

    if (badgeErr) {
      return new Response(JSON.stringify({ error: badgeErr.message }), {
        status: 500, headers,
      });
    }

    // Deduct credits
    const { error: crErr } = await svc.from("credit_transactions").insert({
      user_id,
      amount: -BADGE_COST,
      reason: "badge",
      ref_id: badge.id,
    });

    if (crErr) {
      return new Response(JSON.stringify({ error: crErr.message }), {
        status: 500, headers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        badge_id: badge.id,
        balance: balance - BADGE_COST,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
