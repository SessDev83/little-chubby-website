import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const noCacheHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
};

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: noCacheHeaders,
      });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: noCacheHeaders,
      });
    }

    const user_id = sessionData.session.user.id;
    const svc = getServiceClient();

    const { data, error } = await svc.rpc("touch_streak", { p_user_id: user_id });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: noCacheHeaders,
      });
    }

    return new Response(JSON.stringify(data ?? {}), {
      status: 200, headers: noCacheHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500, headers: noCacheHeaders,
    });
  }
};

// Allow GET for convenience (same behavior)
export const GET = POST;
