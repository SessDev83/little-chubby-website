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
    const range = url.searchParams.get("range") || "30d"; // 30d | 90d | all
    const wantsCsv = url.searchParams.get("format") === "csv";
    const offset = (page - 1) * PAGE_SIZE;

    // Compute range start
    const rangeStart: string | null = (() => {
      if (range === "all") return null;
      const d = new Date();
      const days = range === "90d" ? 90 : 30;
      d.setUTCDate(d.getUTCDate() - days);
      return d.toISOString();
    })();

    // ── CSV export (all transactions in selected range, no pagination) ──
    if (wantsCsv) {
      const lang = (url.searchParams.get("lang") || "en").toLowerCase() === "es" ? "es" : "en";
      const reasonLabels: Record<string, { es: string; en: string }> = {
        review:           { es: "Resena aprobada",          en: "Approved review" },
        share:            { es: "Compartido",               en: "Shared link" },
        download:         { es: "Descarga de ilustracion",  en: "Artwork download" },
        admin:            { es: "Ajuste administrativo",    en: "Admin adjustment" },
        giveaway:         { es: "Entrada sorteo",           en: "Giveaway entry" },
        badge:            { es: "Compra de insignia",       en: "Badge purchase" },
        boost:            { es: "Boost de resena",          en: "Review boost" },
        lottery_entry:    { es: "Boleto del sorteo",        en: "Lottery ticket" },
        ticket_purchase:  { es: "Compra de boleto",         en: "Ticket purchase" },
        top_earner_bonus: { es: "Bonus top del mes",        en: "Top earner bonus" },
      };
      const typeLabel = {
        earned: lang === "es" ? "Ganado" : "Earned",
        spent:  lang === "es" ? "Gastado" : "Spent",
      };
      const headers = lang === "es"
        ? ["Fecha", "Hora", "Tipo", "Motivo", "Cacahuetes", "Referencia"]
        : ["Date", "Time", "Type", "Reason", "Peanuts", "Reference"];

      let csvQuery = svc
        .from("credit_transactions")
        .select("amount, reason, ref_id, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });
      if (rangeStart) csvQuery = csvQuery.gte("created_at", rangeStart);
      const { data: csvRows } = await csvQuery;

      // Proper CSV escaping (wrap in quotes if contains comma/quote/newline; double inner quotes)
      const esc = (v: string) => {
        const s = String(v ?? "");
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const fmtDate = (iso: string) => {
        const d = new Date(iso);
        // YYYY-MM-DD (sortable, locale-neutral)
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const fmtTime = (iso: string) => {
        const d = new Date(iso);
        const h = String(d.getUTCHours()).padStart(2, "0");
        const mi = String(d.getUTCMinutes()).padStart(2, "0");
        return `${h}:${mi}`;
      };

      const lines: string[] = [];
      // Excel/Calc hint: use comma as separator regardless of locale
      lines.push("sep=,");
      lines.push(headers.map(esc).join(","));
      let net = 0;
      let earned = 0;
      let spent = 0;
      (csvRows || []).forEach((r: any) => {
        const amt = Number(r.amount || 0);
        net += amt;
        if (amt > 0) earned += amt; else spent += amt;
        const reasonKey = String(r.reason || "");
        const reasonPretty = reasonLabels[reasonKey]?.[lang] || reasonKey;
        const sign = amt > 0 ? "+" : "";
        lines.push([
          fmtDate(r.created_at),
          fmtTime(r.created_at),
          amt >= 0 ? typeLabel.earned : typeLabel.spent,
          reasonPretty,
          `${sign}${amt}`,
          r.ref_id || "",
        ].map(esc).join(","));
      });

      // Blank row then totals for easy reading
      lines.push("");
      const totalsLabel = lang === "es" ? "TOTALES" : "TOTALS";
      const earnedLbl = lang === "es" ? "Ganado"  : "Earned";
      const spentLbl  = lang === "es" ? "Gastado" : "Spent";
      const netLbl    = lang === "es" ? "Neto"    : "Net";
      lines.push([esc(totalsLabel), "", "", esc(earnedLbl), `+${earned}`, ""].join(","));
      lines.push(["", "", "", esc(spentLbl),  `${spent}`, ""].map(esc).join(","));
      lines.push(["", "", "", esc(netLbl),    `${net >= 0 ? "+" : ""}${net}`, ""].join(","));

      // UTF-8 BOM so Excel detects encoding (accents render correctly)
      const body = "\uFEFF" + lines.join("\r\n");
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="peanuts-history-${range}.csv"`,
        },
      });
    }

    // Build main paginated query (scoped to selected range)
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
    if (rangeStart) query = query.gte("created_at", rangeStart);

    const { data: transactions, count, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers,
      });
    }

    // Get current balance (RPC first, fall back to summing transactions)
    let balance = 0;
    const { data: balanceData, error: balanceErr } = await svc.rpc("get_user_credits", {
      p_user_id: user_id,
    });
    if (!balanceErr && typeof balanceData === "number") {
      balance = balanceData;
    } else {
      const { data: allTx } = await svc
        .from("credit_transactions")
        .select("amount")
        .eq("user_id", user_id);
      balance = (allTx || []).reduce((s, r) => s + (r.amount || 0), 0);
    }

    // ── Summary by reason within selected range (for card A) ──
    let summaryQuery = svc
      .from("credit_transactions")
      .select("amount, reason")
      .eq("user_id", user_id);
    if (rangeStart) summaryQuery = summaryQuery.gte("created_at", rangeStart);
    const { data: summaryRows } = await summaryQuery;
    const summaryMap: Record<string, { count: number; net: number }> = {};
    let rangeNet = 0;
    (summaryRows || []).forEach((r: any) => {
      const key = r.reason || "other";
      if (!summaryMap[key]) summaryMap[key] = { count: 0, net: 0 };
      summaryMap[key].count += 1;
      summaryMap[key].net += r.amount || 0;
      rangeNet += r.amount || 0;
    });
    const summary = Object.entries(summaryMap)
      .map(([reason, v]) => ({ reason, count: v.count, net: v.net }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

    // Lifetime totals (unchanged, kept for balance-hero stats)
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
        range,
        rangeNet,
        summary,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500, headers,
    });
  }
};
