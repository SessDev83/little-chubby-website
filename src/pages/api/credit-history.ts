import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

const PAGE_SIZE = 20;

export const GET: APIRoute = async ({ url, cookies }) => {
  const headers = { "Content-Type": "application/json" };

  try {
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
    const svc = getServiceClient();

    // Parse query params
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const filter = url.searchParams.get("filter") || "all"; // all | earned | spent
    const offset = (page - 1) * PAGE_SIZE;

    // Build query
    let query = svc
      .from("credit_transactions")
      .select("id, amount, reason, ref_id, created_at", { count: "exact" })
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (filter === "earned") {
      query = query.gt("amount", 0);
    } else if (filter === "spent") {
      query = query.lt("amount", 0);
    }

    const { data: transactions, count, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers,
      });
    }

    // Get current balance
    const { data: balanceData } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });
    const balance = typeof balanceData === "number" ? balanceData : 0;

    // Get summary stats
    const { data: earnedData } = await svc
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", user_id)
      .gt("amount", 0);

    const { data: spentData } = await svc
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", user_id)
      .lt("amount", 0);

    const totalEarned = (earnedData || []).reduce((s, r) => s + r.amount, 0);
    const totalSpent = Math.abs((spentData || []).reduce((s, r) => s + r.amount, 0));

    return new Response(
      JSON.stringify({
        balance,
        totalEarned,
        totalSpent,
        transactions: transactions || [],
        total: count || 0,
        page,
        pageSize: PAGE_SIZE,
        hasMore: (count || 0) > offset + PAGE_SIZE,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
