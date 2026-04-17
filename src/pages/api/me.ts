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

  // Get credit balance
  const svc = getServiceClient();
  const { data: balance } = await svc.rpc("get_user_credits", {
    p_user_id: userId,
  });

  return new Response(
    JSON.stringify({
      user: { id: userId },
      balance: typeof balance === "number" ? balance : 0,
    }),
    { status: 200, headers }
  );
};
