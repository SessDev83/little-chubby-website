import type { APIRoute } from "astro";
import { supabase, getServiceClient } from "../../lib/supabase";

export const prerender = false;

const REWARD = 1;
const MAX_SHARES_PER_DAY = 3;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ cookies, request }) => {
  const access = cookies.get("sb-access-token")?.value;
  const refresh = cookies.get("sb-refresh-token")?.value;
  if (!access || !refresh) {
    return new Response(JSON.stringify({ credited: false }), { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
  if (authErr || !user) {
    return new Response(JSON.stringify({ credited: false }), { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ credited: false, error: "Invalid JSON" }), { status: 400 });
  }

  const reviewId = body.review_id;
  if (!reviewId || !UUID_RE.test(reviewId)) {
    return new Response(JSON.stringify({ credited: false, error: "Invalid review_id" }), { status: 400 });
  }

  const sc = getServiceClient();

  // Rate limit: max 3 shares per day (UTC-based).
  // NOTE: uses manual count instead of check_rate_limit RPC because the RPC
  // enforces a 1-hour window; this endpoint needs daily semantics. Both approaches
  // read from credit_transactions, so they stay consistent. See master doc I-C.4.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await sc
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("reason", "share")
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= MAX_SHARES_PER_DAY) {
    return new Response(JSON.stringify({ credited: false, limit: true }), { status: 200 });
  }

  // Atomic insert — unique constraint (user_id, reason, ref_id) prevents duplicates
  // If the row already exists the insert fails with 23505, no race window.
  const { error: insertErr } = await sc.from("credit_transactions").insert({
    user_id: user.id,
    amount: REWARD,
    reason: "share",
    ref_id: reviewId,
  });

  if (insertErr) {
    // Unique-violation = already credited for this review
    if (insertErr.code === "23505") {
      return new Response(JSON.stringify({ credited: false, duplicate: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ credited: false, error: "Insert failed" }), { status: 500 });
  }

  // Get new balance via RPC
  const { data: bal } = await sc.rpc("get_user_credits", { uid: user.id });
  const balance = typeof bal === "number" ? bal : 0;

  return new Response(JSON.stringify({ credited: true, balance }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
