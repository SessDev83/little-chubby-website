import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const ACCENT_COST = 8;
const VALID_COLORS = ["gold", "coral", "teal", "violet", "rose", "sage"];

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
    const color = typeof body?.color === "string" ? body.color.trim().toLowerCase() : "";
    if (!VALID_COLORS.includes(color)) {
      return new Response(JSON.stringify({ error: "invalid_color" }), { status: 400, headers });
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

    const { data: result, error: rpcErr } = await svc.rpc("purchase_accent_color", {
      p_user_id: user_id,
      p_color: color,
      p_cost: ACCENT_COST,
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = result as { success: boolean; error?: string; color?: string; balance?: number };
    if (!res?.success) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        invalid_color: 400,
        invalid_cost: 400,
      };
      return new Response(
        JSON.stringify({ error: res?.error || "unknown", balance: res?.balance }),
        { status: statusMap[res?.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, color: res.color, balance: res.balance }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers });
  }
};
