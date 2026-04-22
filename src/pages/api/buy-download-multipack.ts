import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const MULTIPACK_COST = 5;
const MULTIPACK_CREDITS = 3;

export const POST: APIRoute = async ({ request: _request, cookies }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-cache, max-age=0",
  };

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

    const svc = getServiceClient();

    // Reuse 'download' rate-limit bucket — same subsystem.
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "download",
      p_max_per_hour: 20,
    });
    if (underLimit === false) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    }

    const { data: result, error: rpcErr } = await svc.rpc("purchase_download_multipack", {
      p_user_id: user_id,
      p_cost: MULTIPACK_COST,
      p_credits: MULTIPACK_CREDITS,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = (result || {}) as {
      ok?: boolean;
      error?: string;
      credits?: number;
      balance?: number;
    };

    if (!res.ok) {
      const statusMap: Record<string, number> = {
        insufficient_credits: 403,
        invalid_cost: 400,
        invalid_credits: 400,
      };
      return new Response(JSON.stringify(res), {
        status: statusMap[res.error || ""] || 400,
        headers,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits: res.credits,
        balance: res.balance,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), { status: 500, headers });
  }
};
