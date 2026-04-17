import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const { user_id, platform, shared_url } = body;

    if (!user_id || !platform || !shared_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers,
      });
    }

    // Validate platform
    const validPlatforms = ["whatsapp", "facebook", "copy-link"];
    if (!validPlatforms.includes(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers,
      });
    }

    const supabase = getServiceClient();

    // Upsert the share (unique per user/platform/url/day already enforced by DB)
    const { error } = await supabase.from("social_shares").insert({
      user_id,
      platform,
      shared_url,
    });

    if (error) {
      // Unique violation means already shared today — that's fine
      if (error.code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          status: 200,
          headers,
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers,
    });
  }
};
