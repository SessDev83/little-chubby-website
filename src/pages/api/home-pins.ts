import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

// Public endpoint: returns the currently active home pins (E.2).
// No auth required — anything returned here is meant to be shown on /.
// Cached at the edge for 60s since it changes rarely (3-day pins).
export const GET: APIRoute = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  };

  try {
    const svc = getServiceClient();

    // Active pins, newest-expiring first so we cycle newest content.
    const { data: pins, error: pinsErr } = await svc
      .from("home_pins")
      .select("id, review_id, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(8);

    if (pinsErr || !pins || pins.length === 0) {
      return new Response(JSON.stringify({ pins: [] }), { status: 200, headers });
    }

    const reviewIds = pins.map((p) => p.review_id);

    const { data: reviews, error: revErr } = await svc
      .from("book_reviews")
      .select("id, user_id, book_id, rating, review_text, photo_url")
      .in("id", reviewIds)
      .eq("status", "approved");

    if (revErr || !reviews) {
      return new Response(JSON.stringify({ pins: [] }), { status: 200, headers });
    }

    const userIds = Array.from(new Set(reviews.map((r) => r.user_id)));

    const { data: profiles } = await svc
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>(
      (profiles || []).map((p) => [p.id as string, { display_name: p.display_name, avatar_url: p.avatar_url }])
    );
    const reviewMap = new Map<string, (typeof reviews)[number]>(reviews.map((r) => [r.id as string, r]));

    const hydrated = pins
      .map((p) => {
        const r = reviewMap.get(p.review_id as string);
        if (!r) return null;
        const profile = profileMap.get(r.user_id as string);
        return {
          pin_id: p.id,
          review_id: r.id,
          book_id: r.book_id,
          rating: r.rating,
          review_text: (r.review_text || "").slice(0, 240),
          photo_url: r.photo_url,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          expires_at: p.expires_at,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ pins: hydrated }), { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ pins: [], error: err?.message || "Server error" }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};
