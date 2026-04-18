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

    // 2. Parse request body (only need artwork_id and image_path)
    const body = await request.json();
    const { artwork_id, image_path } = body;

    if (!artwork_id || !image_path) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers,
      });
    }

    const svc = getServiceClient();

    // 3. Check credit balance server-side
    const { data: balanceData } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });

    const balance = typeof balanceData === "number" ? balanceData : 0;

    if (balance <= 0) {
      return new Response(
        JSON.stringify({ error: "no_credits", balance }),
        { status: 403, headers }
      );
    }

    // 4. Record the download
    const { error: dlErr } = await svc
      .from("artwork_downloads")
      .insert({ user_id, artwork_id });

    if (dlErr) {
      return new Response(JSON.stringify({ error: dlErr.message }), {
        status: 500, headers,
      });
    }

    // 5. Deduct 1 credit
    const { error: crErr } = await svc
      .from("credit_transactions")
      .insert({
        user_id,
        amount: -1,
        reason: "download",
        ref_id: artwork_id,
      });

    if (crErr) {
      return new Response(JSON.stringify({ error: crErr.message }), {
        status: 500, headers,
      });
    }

    // 6. Generate signed download URL (1 hour)
    const { data: signedData, error: signErr } = await svc.storage
      .from("free-artworks")
      .createSignedUrl(image_path, 3600);

    if (signErr || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not generate download URL" }),
        { status: 500, headers }
      );
    }

    // 7. Notify admin (non-blocking)
    const userEmail = sessionData.session.user.email || "unknown";
    const { data: artworkRow } = await svc
      .from("free_artworks")
      .select("title_en")
      .eq("id", artwork_id)
      .maybeSingle();
    notifyDownload(userEmail, artworkRow?.title_en || artwork_id, balance - 1);

    return new Response(
      JSON.stringify({
        ok: true,
        signedUrl: signedData.signedUrl,
        balance: balance - 1,
      }),
      { status: 200, headers }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers,
    });
  }
};
