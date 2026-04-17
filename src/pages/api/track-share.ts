import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { user_id, platform, shared_url } = body;

    if (!user_id || !platform || !shared_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers,
      });
    }

    // Validate platform
    const validPlatforms = ["whatsapp", "facebook", "bluesky", "copy-link"];
    if (!validPlatforms.includes(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers,
      });
    }

    const supabase = getServiceClient();

    // Check how many share credits were already granted today (max 3)
    const { data: sharesToday } = await supabase.rpc("get_shares_today", {
      p_user_id: user_id,
    });
    const todayCount = typeof sharesToday === "number" ? sharesToday : 0;

    // Insert the share record (unique constraint prevents duplicates per day/platform/url)
    const { error } = await supabase.from("social_shares").insert({
      user_id,
      platform,
      shared_url,
    });

    if (error) {
      // Unique violation means already shared today — that's fine
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true, credited: false }), {
          status: 200,
          headers,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }

    // Grant +1 credit if under daily cap (3/day)
    let credited = false;
    if (todayCount < 3) {
      const { error: crErr } = await supabase.from("credit_transactions").insert({
        user_id,
        amount: 1,
        reason: "share",
      });
      if (!crErr) credited = true;
    }

    // Get updated balance
    const { data: balance } = await supabase.rpc("get_user_credits", {
      p_user_id: user_id,
    });

    return new Response(
      JSON.stringify({ ok: true, credited, balance: balance ?? 0 }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers,
    });
  }
};
