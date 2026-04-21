import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

/**
 * POST /api/buy-drop
 *
 * Purchase a limited-time shop drop badge.
 * Body: { drop_id: string }
 *
 * Server-side validation (master plan D-R2):
 *   - Authenticated (cookie session).
 *   - Rate-limited via check_rate_limit('badge').
 *   - Active window + cost + already-owned are enforced inside
 *     the purchase_drop() RPC. Client-provided cost is ignored.
 *   - Response has Cache-Control: private, no-cache.
 */
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
    const drop_id = typeof body?.drop_id === "string" ? body.drop_id.trim() : "";
    if (!/^[a-z0-9_]{1,64}$/.test(drop_id)) {
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

    const { data: result, error: rpcErr } = await svc.rpc("purchase_drop", {
      p_user_id: user_id,
      p_drop_id: drop_id,
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = result as {
      success: boolean;
      error?: string;
      badge_type?: string;
      balance?: number;
    };
    if (!res?.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        already_owned: 409,
        drop_not_found: 404,
        drop_inactive: 410,
        invalid_input: 400,
      };
      return new Response(
        JSON.stringify({ error: res?.error || "unknown", balance: res?.balance }),
        { status: statusMap[res?.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, badge_type: res.badge_type, balance: res.balance }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers });
  }
};
