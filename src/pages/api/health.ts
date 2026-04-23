import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

/**
 * Liveness + readiness probe for external uptime monitors (Better Stack).
 *
 * - 200: app is serving SSR and Supabase is reachable.
 * - 503: Supabase unreachable or service role key misconfigured.
 *
 * Intentionally unauthenticated: monitoring providers do not send Bearer
 * headers. Response is minimal and does not leak internal state.
 */
export const GET: APIRoute = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0",
  };

  const started = Date.now();
  try {
    const svc = getServiceClient();
    // Lightweight round-trip: count(*) on a tiny system table.
    // `profiles` always exists and is indexed by id.
    const { error } = await svc
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) throw new Error(`supabase: ${error.message}`);

    return new Response(
      JSON.stringify({ ok: true, db_ms: Date.now() - started }),
      { status: 200, headers },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: message, db_ms: Date.now() - started }),
      { status: 503, headers },
    );
  }
};
