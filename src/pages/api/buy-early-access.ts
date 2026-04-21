import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

/**
 * POST /api/buy-early-access
 *
 * Body: { book_id: string }
 *
 * Unlocks a book 7 days before its public release_at for 20 peanuts.
 * Window, cost, and already-owned are enforced inside purchase_early_access
 * (master plan D.3 / D-R2). Client cost is ignored.
 */
const EARLY_ACCESS_COST = 20;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-cache, max-age=0" };

  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers });
    }
    const user_id = sessionData.session.user.id;

    const body = await request.json().catch(() => ({}));
    const book_id = typeof body?.book_id === "string" ? body.book_id.trim() : "";
    if (!/^[a-z0-9-]{1,64}$/.test(book_id)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers });
    }

    const svc = getServiceClient();

    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "badge",
      p_max_per_hour: 5,
    });
    if (underLimit === false) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    }

    const { data: result, error: rpcErr } = await svc.rpc("purchase_early_access", {
      p_user_id: user_id,
      p_book_id: book_id,
      p_cost: EARLY_ACCESS_COST,
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = result as {
      success: boolean;
      error?: string;
      book_id?: string;
      balance?: number;
    };
    if (!res?.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        already_owned: 409,
        book_not_found: 404,
        early_access_closed: 410,
        invalid_input: 400,
        invalid_cost: 400,
      };
      return new Response(
        JSON.stringify({ error: res?.error || "unknown", balance: res?.balance }),
        { status: statusMap[res?.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, book_id: res.book_id, balance: res.balance }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers });
  }
};
