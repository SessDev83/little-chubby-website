import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";
import { supabase } from "../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const headers = { "Content-Type": "application/json" };

  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ user: null }), { status: 200, headers });
  }

  // Verify session via Supabase auth
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session?.user) {
    return new Response(JSON.stringify({ user: null }), { status: 200, headers });
  }

  const userId = data.session.user.id;

  // Get credit balance + ticket balance + profile display name
  const svc = getServiceClient();
  const [{ data: balance }, { data: tickets }, { data: profile }] = await Promise.all([
    svc.rpc("get_user_credits", { p_user_id: userId }),
    svc.rpc("get_user_tickets", { p_user_id: userId }),
    svc.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);

  const displayName = profile && typeof profile.display_name === "string"
    ? profile.display_name.trim()
    : "";

  return new Response(
    JSON.stringify({
      user: {
        id: userId,
        email: data.session.user.email ?? null,
        display_name: displayName || null,
      },
      balance: typeof balance === "number" ? balance : 0,
      tickets: typeof tickets === "number" ? tickets : 0,
    }),
    { status: 200, headers }
  );
};
