import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    // 1. Authenticate from httpOnly cookies (not client input)
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

    // 2. Parse body
    const body = await request.json();
    const { platform, shared_url } = body;

    if (!platform || !shared_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers,
      });
    }

    // Validate platform
    const validPlatforms = ["whatsapp", "facebook", "bluesky", "copy-link"];
    if (!validPlatforms.includes(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    // Insert the share record (unique constraint prevents duplicates per day/platform/url)
    const { error } = await svc.from("social_shares").insert({
      user_id,
      platform,
      shared_url,
    });

    if (error) {
      // Unique violation means already shared today — that's fine
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true, credited: false }), {
          status: 200, headers,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers,
      });
    }

    // Read count AFTER the insert to eliminate race window
    const { data: sharesToday } = await svc.rpc("get_shares_today", {
      p_user_id: user_id,
    });
    const todayCount = typeof sharesToday === "number" ? sharesToday : 0;

    // Grant +1 credit if under daily cap (3/day)
    let credited = false;
    if (todayCount < 3) {
      const { error: crErr } = await svc.from("credit_transactions").insert({
        user_id,
        amount: 1,
        reason: "share",
      });
      if (!crErr) credited = true;
    }

    // Get updated balance
    const { data: balance } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });

    return new Response(
      JSON.stringify({ ok: true, credited, balance: balance ?? 0 }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers,
    });
  }
};
