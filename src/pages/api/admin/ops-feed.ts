import type { APIRoute } from "astro";
import { supabase, getServiceClient, isAdmin } from "../../../lib/supabase";
import { buildOpsFeed, formatOpsFeedTime } from "../../../lib/admin-ops-feed.mjs";
import { resolveAdminRange } from "../../../lib/admin-kpis.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

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

  const range = resolveAdminRange(url.searchParams.get("range") || "24h");
  const sc = getServiceClient();
  const [{ data: eventRows }, { data: pageviewRows }] = await Promise.all([
    (sc as any)
      .from("conversion_events")
      .select("id,event_name,path,visitor_hash,props,lang,created_at")
      .gte("created_at", range.sinceIso)
      .order("created_at", { ascending: false })
      .limit(80),
    sc
      .from("pageviews")
      .select("id,path,visitor_hash,utm_source,utm_medium,referrer,created_at")
      .gte("created_at", range.sinceIso)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const feed = buildOpsFeed({ events: eventRows ?? [], pageviews: pageviewRows ?? [], limit: 50 });
  const items = feed.items.map((item: any) => ({
    ...item,
    timeLabel: formatOpsFeedTime(item.at),
  }));

  return new Response(JSON.stringify({ items, stats: feed.stats, generatedAt: new Date().toISOString() }), { status: 200, headers });
};