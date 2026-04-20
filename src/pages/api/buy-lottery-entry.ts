import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const ENTRY_COST = 3;
const MAX_PER_REQUEST = 20;

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
    if (!qty || qty < 1 || qty > MAX_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `Quantity must be between 1 and ${MAX_PER_REQUEST}` }),
        { status: 400, headers }
      );
    }

    const svc = getServiceClient();

    // ── Rate limit: max 10 purchases per hour ──
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "lottery_entry",
      p_max_per_hour: 10,
    });
    if (underLimit === false) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
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

    // ── Atomic purchase (prevents double-spend race condition) ──
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: result, error: rpcErr } = await svc.rpc("buy_lottery_entry", {
      p_user_id: user_id,
      p_month: month,
      p_quantity: qty,
      p_cost_per_entry: ENTRY_COST,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as { success: boolean; error?: string; balance?: number; cost?: number; entries_added?: number };

    if (!res.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        draw_already_done: 403,
      };
      return new Response(
        JSON.stringify({ error: res.error, balance: res.balance, cost: res.cost }),
        { status: statusMap[res.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        entries_added: res.entries_added,
        month,
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
