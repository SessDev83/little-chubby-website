import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { user_id, artwork_id, image_path } = body;

    if (!user_id || !artwork_id || !image_path) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers,
      });
    }

    const supabase = getServiceClient();

    // 1. Verify user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers,
      });
    }

    // 2. Check credit balance server-side
    const { data: balanceData } = await supabase.rpc("get_user_credits", {
      p_user_id: user_id,
    });

    const balance = typeof balanceData === "number" ? balanceData : 0;

    if (balance <= 0) {
      return new Response(
        JSON.stringify({ error: "no_credits", balance }),
        { status: 403, headers }
      );
    }

    // 3. Record the download
    const { error: dlErr } = await supabase
      .from("artwork_downloads")
      .insert({ user_id, artwork_id });

    if (dlErr) {
      return new Response(JSON.stringify({ error: dlErr.message }), {
        status: 500, headers,
      });
    }

    // 4. Deduct 1 credit
    const { error: crErr } = await supabase
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

    // 5. Generate signed download URL (1 hour)
    const { data: signedData, error: signErr } = await supabase.storage
      .from("free-artworks")
      .createSignedUrl(image_path, 3600);

    if (signErr || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not generate download URL" }),
        { status: 500, headers }
      );
    }

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
