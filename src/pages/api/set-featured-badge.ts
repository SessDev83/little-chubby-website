import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

// Phase F — visibility loop.
// POST /api/set-featured-badge
// Body: { badge_type: string | null }
// Auth: cookie session.
// Behavior: RPC set_featured_badge validates the badge is owned + active
// before writing profiles.featured_badge. null/empty clears it.

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const body = await request.json().catch(() => ({}));
    const raw = body?.badge_type;
    const badge_type: string | null =
      raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")
        ? null
        : String(raw).trim().slice(0, 64);

    const svc = getServiceClient();

    // Rate limit: reuse 'badge' bucket (same cosmetic action family).
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "badge",
      p_max_per_hour: 20,
    });
    if (underLimit === false) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers });
    }

    // SQL function treats empty string the same as NULL → clears the featured badge.
    const { data: result, error: rpcErr } = await svc.rpc("set_featured_badge", {
      p_user_id: user_id,
      p_badge_type: badge_type ?? "",
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers });
    }

    const res = result as { success: boolean; error?: string; featured_badge?: string | null };
    if (!res?.success) {
      const statusMap: Record<string, number> = {
        not_owned: 403,
        invalid_badge: 400,
      };
      return new Response(
        JSON.stringify({ error: res?.error || "unknown" }),
        { status: statusMap[res?.error || ""] || 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true, featured_badge: res.featured_badge ?? null }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers });
  }
};
