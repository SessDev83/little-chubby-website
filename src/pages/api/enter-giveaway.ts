import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

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
    const { quantity, month } = body;

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1 || qty > MAX_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `Quantity must be between 1 and ${MAX_PER_REQUEST}` }),
        { status: 400, headers }
      );
    }

    // Use server-side current month (don't trust client)
    const currentMonth = new Date().toISOString().slice(0, 7);
    // If client sends a month, validate it matches current — prevents stale tabs
    if (month && month !== currentMonth) {
      return new Response(
        JSON.stringify({ error: "month_mismatch", expected: currentMonth }),
        { status: 400, headers }
      );
    }

    const svc = getServiceClient();

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

    // ── Rate limit: max 10 entries per hour ──
    // Note: check_rate_limit uses credit_transactions which doesn't track
    // giveaway entries, so we check lottery_entries directly.
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentEntries } = await svc
      .from("lottery_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("purchased_at", oneHourAgo);

    if ((recentEntries ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
      );
    }

    // ── Atomic: deduct tickets → create lottery_entries ──
    const { data: result, error: rpcErr } = await svc.rpc("enter_giveaway", {
      p_user_id: user_id,
      p_month: currentMonth,
      p_quantity: qty,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as {
      success: boolean;
      error?: string;
      ticket_balance?: number;
      entries_added?: number;
      entry_id?: string;
    };

    if (!res.success) {
      const statusMap: Record<string, number> = {
        insufficient_tickets: 403,
        draw_already_done: 403,
      };
      return new Response(
        JSON.stringify({ error: res.error, ticket_balance: res.ticket_balance }),
        { status: statusMap[res.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        entries_added: res.entries_added,
        month: currentMonth,
        ticket_balance: res.ticket_balance,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
