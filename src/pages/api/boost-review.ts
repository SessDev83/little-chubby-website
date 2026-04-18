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

    // Check for existing active boost of same type
    const { data: existingBoost } = await svc
      .from("gallery_boosts")
      .select("id, expires_at")
      .eq("review_id", review_id)
      .eq("boost_type", boost_type)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingBoost) {
      return new Response(
        JSON.stringify({ error: "boost_active", expires_at: existingBoost.expires_at }),
        { status: 409, headers }
      );
    }

    // Check balance
    const { data: balanceData } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });
    const balance = typeof balanceData === "number" ? balanceData : 0;

    if (balance < BOOST_COST) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits", balance, cost: BOOST_COST }),
        { status: 403, headers }
      );
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + BOOST_DURATION_DAYS);

    // Insert boost
    const { data: boost, error: boostErr } = await svc
      .from("gallery_boosts")
      .insert({
        review_id,
        user_id,
        boost_type,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (boostErr) {
      return new Response(JSON.stringify({ error: boostErr.message }), {
        status: 500, headers,
      });
    }

    // Deduct credits
    const { error: crErr } = await svc.from("credit_transactions").insert({
      user_id,
      amount: -BOOST_COST,
      reason: "boost",
      ref_id: boost.id,
    });

    if (crErr) {
      return new Response(JSON.stringify({ error: crErr.message }), {
        status: 500, headers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        boost_id: boost.id,
        expires_at: expiresAt.toISOString(),
        balance: balance - BOOST_COST,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
