import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";
import { notifyDownload } from "../../lib/notifications";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    // 1. Authenticate from httpOnly cookies (not client input)
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers,
      });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers,
      });
    }

    const user_id = sessionData.session.user.id;

    // 2. Parse request body
    const body = await request.json();
    const { artwork_id } = body;

    if (!artwork_id) {
      return new Response(JSON.stringify({ error: "Missing artwork_id" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    // ── Rate limit: max 20 downloads per hour ──
    const { data: underLimit } = await svc.rpc("check_rate_limit", {
      p_user_id: user_id,
      p_action: "download",
      p_max_per_hour: 20,
    });
    if (underLimit === false) {
      return new Response(
        JSON.stringify({ error: "rate_limited" }),
        { status: 429, headers }
      );
    }

    // 3. Look up artwork from DB (server-authoritative image_path + cost)
    const { data: artwork } = await svc
      .from("free_artworks")
      .select("id, title_en, peanut_cost, image_path")
      .eq("id", artwork_id)
      .maybeSingle();

    if (!artwork) {
      return new Response(JSON.stringify({ error: "Artwork not found" }), {
        status: 404, headers,
      });
    }

    const cost = artwork.peanut_cost ?? 1;

    // 4. Atomic purchase: balance check + download record + credit deduction
    const { data: result, error: rpcErr } = await svc.rpc("purchase_download", {
      p_user_id: user_id,
      p_artwork_id: artwork_id,
      p_cost: cost,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers,
      });
    }

    const res = result as { success: boolean; error?: string; balance?: number; cost?: number };

    if (!res.success) {
      const statusMap: Record<string, number> = { insufficient_credits: 403 };
      return new Response(
        JSON.stringify({ error: res.error, balance: res.balance, cost: res.cost }),
        { status: statusMap[res.error || ""] || 400, headers }
      );
    }

    // 5. Generate signed download URL using server-authoritative image_path
    const { data: signedData, error: signErr } = await svc.storage
      .from("free-artworks")
      .createSignedUrl(artwork.image_path, 3600);

    if (signErr || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not generate download URL" }),
        { status: 500, headers }
      );
    }

    // 6. Notify admin (non-blocking)
    const userEmail = sessionData.session.user.email || "unknown";
    notifyDownload(userEmail, artwork.title_en || artwork_id, res.balance ?? 0);

    return new Response(
      JSON.stringify({
        ok: true,
        signedUrl: signedData.signedUrl,
        balance: res.balance,
      }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers,
    });
  }
};
