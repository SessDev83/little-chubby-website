import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const ENTRY_COST = 3;

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
    const { quantity } = body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1 || qty > 20) {
      return new Response(
        JSON.stringify({ error: "Quantity must be between 1 and 20" }),
        { status: 400, headers }
      );
    }

    const totalCost = ENTRY_COST * qty;
    const svc = getServiceClient();

    // ── Guard: active giveaway ──
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: giveawayConfig } = await svc
      .from("lottery_config")
      .select("is_active")
      .eq("month", month)
      .maybeSingle();

    if (!giveawayConfig?.is_active) {
      return new Response(
        JSON.stringify({ error: "no_active_giveaway" }),
        { status: 403, headers }
      );
    }

    // ── Guard: newsletter subscription ──
    const { data: { user: authUser } } = await svc.auth.admin.getUserById(user_id);
    const userEmail = authUser?.email?.toLowerCase();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "no_email" }),
        { status: 403, headers }
      );
    }

    const { data: sub } = await svc
      .from("newsletter_subscribers")
      .select("confirmed")
      .eq("email", userEmail)
      .maybeSingle();

    if (!sub?.confirmed) {
      return new Response(
        JSON.stringify({ error: "newsletter_required" }),
        { status: 403, headers }
      );
    }

    // Check balance
    const { data: balanceData } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });
    const balance = typeof balanceData === "number" ? balanceData : 0;

    if (balance < totalCost) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits", balance, cost: totalCost }),
        { status: 403, headers }
      );
    }

    // Insert lottery entry
    const { data: entry, error: entryErr } = await svc
      .from("lottery_entries")
      .insert({
        user_id,
        month,
        entry_count: qty,
      })
      .select("id")
      .single();

    if (entryErr) {
      return new Response(JSON.stringify({ error: entryErr.message }), {
        status: 500, headers,
      });
    }

    // Deduct credits
    const { error: crErr } = await svc.from("credit_transactions").insert({
      user_id,
      amount: -totalCost,
      reason: "lottery_entry",
      ref_id: entry.id,
    });

    if (crErr) {
      return new Response(JSON.stringify({ error: crErr.message }), {
        status: 500, headers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        entries_added: qty,
        month,
        balance: balance - totalCost,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
