import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const TICKET_COST = 3;   // peanuts per ticket
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
      p_action: "ticket_purchase",
      p_max_per_hour: 10,
    });
    if (underLimit === false) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
      );
    }

    // ── Atomic purchase: peanuts → tickets ──
    const { data: result, error: rpcErr } = await svc.rpc("buy_tickets", {
      p_user_id: user_id,
      p_quantity: qty,
      p_cost_per_ticket: TICKET_COST,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as {
      success: boolean;
      error?: string;
      peanut_balance?: number;
      ticket_balance?: number;
      tickets_added?: number;
      balance?: number;
      cost?: number;
    };

    if (!res.success) {
      return new Response(
        JSON.stringify({ error: res.error, balance: res.balance, cost: res.cost }),
        { status: 403, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tickets_added: res.tickets_added,
        balance: res.peanut_balance,
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
