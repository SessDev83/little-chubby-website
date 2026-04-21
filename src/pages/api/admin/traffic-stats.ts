import type { APIRoute } from "astro";
import { supabase, getServiceClient, isAdmin } from "../../../lib/supabase";

export const prerender = false;

/**
 * Lightweight stats endpoint for the admin traffic dashboard auto-refresh.
 * Returns only the KPI numbers (~200 bytes). Only callable by admins.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

  // ── Auth ──
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }
  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error || !data.session?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }
  const authUser = { id: data.session.user.id, email: data.session.user.email };
  if (!(await isAdmin(authUser))) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
  }

  // ── Range ──
  const range = (url.searchParams.get("range") || "7d").toLowerCase();
  const daysMap: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[range] ?? 7;
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const todayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const sc = getServiceClient();
  const [{ count: totalPageviews }, { data: uniqueRows }, { count: todayCount }] = await Promise.all([
    sc.from("pageviews").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
    sc.from("pageviews").select("visitor_hash").gte("created_at", sinceIso).limit(5000),
    sc.from("pageviews").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
  ]);

  const uniqueVisitors = new Set((uniqueRows ?? []).map((r: any) => r.visitor_hash).filter(Boolean)).size;

  return new Response(
    JSON.stringify({
      totalPageviews: totalPageviews ?? 0,
      uniqueVisitors,
      todayCount: todayCount ?? 0,
      generatedAt: new Date().toISOString(),
    }),
    { status: 200, headers },
  );
};
