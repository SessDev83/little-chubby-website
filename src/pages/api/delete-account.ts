import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";
import { notifyAdminAccountDeleted } from "../../lib/notifications";

export const prerender = false;

/**
 * SHA-256 hex of input, truncated to first 12 chars. Used to produce
 * non-reversible identifiers for post-deletion audit logs (GDPR-safe).
 */
async function shortHash(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

/**
 * GDPR Article 17 — Right to erasure (self-serve account deletion).
 *
 * POST JSON: { confirm: string }
 *  - `confirm` MUST equal the authenticated user's own email (case-insensitive).
 *
 * Flow:
 *  - Cookie auth (sb-access-token / sb-refresh-token) — only the user can
 *    delete their own account. No admin endpoint here.
 *  - Calls RPC public.delete_user_account(p_user_id, p_confirm) which runs
 *    SECURITY DEFINER, validates auth.uid() = p_user_id, and deletes from
 *    auth.users (cascades through profiles → all user-owned tables) plus
 *    newsletter_subscribers (email-keyed).
 *  - On success: clears sb-* cookies and returns { ok: true }.
 *
 * We intentionally do NOT rate-limit via check_rate_limit — a user can only
 * delete their own account once and the RPC itself is guarded by the
 * auth.uid() check.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
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
    const user_id = sessionData.session.user.id;
    const email = sessionData.session.user.email || "";

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers });
    }

    const confirm = typeof body?.confirm === "string" ? body.confirm.trim() : "";
    if (!confirm) {
      return new Response(JSON.stringify({ error: "confirm_required" }), { status: 400, headers });
    }
    if (confirm.toLowerCase() !== email.toLowerCase()) {
      return new Response(JSON.stringify({ error: "confirm_mismatch" }), { status: 400, headers });
    }

    // Capture lang_pref BEFORE the RPC cascades profiles. Non-critical —
    // if this query fails we still proceed (we only want lang for the
    // admin notification, not for the delete itself).
    let langPref: string | null = null;
    try {
      const svcRead = getServiceClient();
      const { data: profileRow } = await svcRead
        .from("profiles")
        .select("lang_pref")
        .eq("id", user_id)
        .maybeSingle();
      langPref = (profileRow?.lang_pref as string | null) ?? null;
    } catch {
      langPref = null;
    }

    const svc = getServiceClient();
    const { error: rpcErr } = await svc.rpc("delete_user_account", {
      p_user_id: user_id,
      p_confirm: confirm,
    });
    if (rpcErr) {
      console.error("[delete-account] rpc delete_user_account failed:", rpcErr);
      return new Response(
        JSON.stringify({ error: "delete_failed" }),
        { status: 500, headers }
      );
    }

    // Clear auth cookies so the browser stops being "logged in".
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("sb-logged-in", { path: "/" });

    // GDPR Art. 17 audit signal (fire-and-forget; hashes only, no PII).
    // MUST not block the response.
    const [emailHash, userIdHash] = await Promise.all([
      shortHash(email.toLowerCase()),
      shortHash(user_id),
    ]);
    void notifyAdminAccountDeleted(emailHash, userIdHash, {
      deletedAt: new Date().toISOString(),
      lang: langPref,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err: any) {
    console.error("[delete-account] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "unexpected" }),
      { status: 500, headers }
    );
  }
};
