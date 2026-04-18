import type { APIRoute } from "astro";
import { supabase, getServiceClient } from "../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const headers = { "Content-Type": "application/json" };
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ reviews: [] }), { status: 401, headers });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (authErr || !user) {
    return new Response(JSON.stringify({ reviews: [] }), { status: 401, headers });
  }

  const sc = getServiceClient();
  const { data: reviews } = await sc
    .from("book_reviews")
    .select("id, book_id, rating, status")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  return new Response(JSON.stringify({ reviews: reviews ?? [] }), {
    status: 200,
    headers,
  });
};
