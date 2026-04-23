import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const prerender = false;

/**
 * Parental consent confirmation — called from the soft banner shown to
 * legacy users whose profiles.parent_consent_at is NULL.
 *
 * POST (no body required).
 *  - Cookie auth: only the user can confirm for themselves.
 *  - Calls RPC public.confirm_parental_consent() which stamps now() on
 *    profiles.parent_consent_at (idempotent via coalesce).
 *
 * We intentionally do NOT rate-limit via check_rate_limit — one action per
 * user and the RPC itself is guarded by auth.uid().
 */
export const POST: APIRoute = async ({ cookies }) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
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

    // Call the RPC with the user-scoped client so auth.uid() resolves inside
    // the SECURITY DEFINER function. The service-role client would make
    // auth.uid() return NULL and the RPC would raise 'unauthorized'.
    const { error: rpcErr } = await supabase.rpc("confirm_parental_consent");
    if (rpcErr) {
      console.error("[confirm-parental-consent] rpc failed:", rpcErr);
      return new Response(
        JSON.stringify({ error: "save_failed" }),
        { status: 500, headers }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err: any) {
    console.error("[confirm-parental-consent] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "unexpected" }),
      { status: 500, headers }
    );
  }
};
