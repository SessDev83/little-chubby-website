import type { APIRoute } from "astro";
import { supabase, getServiceClient } from "../../lib/supabase";

export const prerender = false;

// GET  — fetch user's notifications + unread count
// PATCH — mark all as read
export const GET: APIRoute = async ({ cookies }) => {
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const sc = getServiceClient();

  // Get latest 20 notifications
  const { data: notifications } = await sc
    .from("user_notifications")
    .select("id, type, title_en, title_es, body_en, body_es, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Unread count
  const { count } = await sc
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return new Response(JSON.stringify({
    notifications: notifications ?? [],
    unreadCount: count ?? 0,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const sc = getServiceClient();

  if (body.action === "mark_all_read") {
    const { error: updateErr } = await sc
      .from("user_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
};
