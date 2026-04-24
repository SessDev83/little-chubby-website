import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";
import { resolveMonthlyPrizeBook } from "../../../data/books";
import { emailUserLotteryWin, notifyAdminMonthlyDraw, notifyAdminCronError, notifyAdminExpiredClaims } from "../../../lib/notifications";
import { pingHeartbeat } from "../../../lib/monitoring";
import crypto from "node:crypto";

export const prerender = false;

/** Cryptographically secure random index (rejection sampling to avoid modulo bias) */
function secureRandomIndex(max: number): number {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do { crypto.getRandomValues(arr); } while (arr[0] >= limit);
  return arr[0] % max;
}

export const GET: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  // ── Verify cron secret ─────────────────────────────
  const cronSecret = import.meta.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), { status: 500, headers });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const svc = getServiceClient();

  try {
  const now = new Date();

  // Previous month = the giveaway that just ended
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Current month = new giveaway starting now
  const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Draw date for the current month = 1st of next month
  const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextDrawDate = nextFirst.toISOString().slice(0, 10);

  // Resolve prize books honoring optional admin override in lottery_config.prize_book_id.
  // Falls back to deterministic rotation via getMonthlyPrizeBook when override is null.
  const { data: prevOverride } = await svc
    .from("lottery_config")
    .select("prize_book_id")
    .eq("month", prevMonth)
    .maybeSingle();
  const { data: currOverride } = await svc
    .from("lottery_config")
    .select("prize_book_id")
    .eq("month", currMonth)
    .maybeSingle();
  const prizeBookPrev = resolveMonthlyPrizeBook(prevMonth, (prevOverride as any)?.prize_book_id ?? null);
  const prizeBookCurr = resolveMonthlyPrizeBook(currMonth, (currOverride as any)?.prize_book_id ?? null);

  // ── Step 1: Draw for previous month ────────────────
  const { data: existCheck } = await svc
    .from("lottery_winners")
    .select("id")
    .eq("month", prevMonth)
    .limit(1);

  let drawSummary = "";
  const drawnWinners: { name: string; email: string }[] = [];
  let eligibleCount = 0;
  let totalTickets = 0;
  let hasRealWinners = false;

  // Stats for admin email
  const { count: totalUsers } = await svc
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: totalSubscribers } = await svc
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .eq("confirmed", true);

  if (existCheck && existCheck.length > 0) {
    drawSummary = `Draw already completed for ${prevMonth}. Skipped.`;
  } else {
    // ── Gather ticket pool ───────────────────────────
    // LOTTERY-003: Draw pool comes EXCLUSIVELY from lottery_entries (user-invested
    // tickets). Review-approved tickets are granted via award_review_tickets RPC
    // (admin/reviews.astro) and MUST be spent by the user via enter_giveaway()
    // to count here. See master doc §III-D LOTTERY-003.
    const { data: paidEntries } = await svc
      .from("lottery_entries")
      .select("user_id, entry_count")
      .eq("month", prevMonth);

    const ticketMap = new Map<string, number>();
    for (const pe of paidEntries ?? []) {
      ticketMap.set(pe.user_id, (ticketMap.get(pe.user_id) || 0) + pe.entry_count);
    }

    // Get config for previous month
    const { data: prevConfig } = await svc
      .from("lottery_config")
      .select("*")
      .eq("month", prevMonth)
      .maybeSingle();

    const minReq = prevConfig?.min_purchases ?? 0;
    const eligible = [...ticketMap.entries()].filter(
      ([, tickets]) => tickets >= minReq * 5
    );
    eligibleCount = eligible.length;
    totalTickets = eligible.reduce((sum, [, t]) => sum + t, 0);

    if (eligible.length > 0) {
      // ── Real participants → draw real winners ──────
      hasRealWinners = true;
      const pctWinners = Math.ceil(
        eligible.length * ((prevConfig?.winner_pct ?? 1) / 100)
      );
      const numToDraw = Math.min(
        pctWinners,
        prevConfig?.max_winners ?? 3,
        eligible.length
      );

      // Build weighted pool
      const weightedPool: string[] = [];
      for (const [uid, tickets] of eligible) {
        for (let i = 0; i < tickets; i++) {
          weightedPool.push(uid);
        }
      }

      const winnerIds = new Set<string>();
      let attempts = 0;
      while (winnerIds.size < numToDraw && attempts < weightedPool.length * 10) {
        const idx = secureRandomIndex(weightedPool.length);
        winnerIds.add(weightedPool[idx]);
        attempts++;
      }

      const claimDeadline = new Date();
      claimDeadline.setDate(claimDeadline.getDate() + 14);

      for (const winnerId of winnerIds) {
        const { error } = await svc.from("lottery_winners").insert({
          user_id: winnerId,
          month: prevMonth,
          claim_deadline: claimDeadline.toISOString(),
        });

        if (!error) {
          const { data: profile } = await svc
            .from("profiles")
            .select("email, display_name, lang_pref")
            .eq("id", winnerId)
            .single();

          const { data: authUser } = await svc.auth.admin.getUserById(winnerId);
          const email = authUser?.user?.email || "unknown";
          const name = profile?.display_name || email;
          drawnWinners.push({ name, email });

          // Email winner
          if (authUser?.user?.email) {
            await emailUserLotteryWin(
              authUser.user.email,
              claimDeadline.toISOString().slice(0, 10),
              profile?.lang_pref || "en",
              prizeBookPrev.title[profile?.lang_pref === "es" ? "es" : "en"]
            );
          }

          // In-app notification
          await svc.rpc("notify_user", {
            p_user_id: winnerId,
            p_type: "lottery_win",
            p_title_en: "You Won the Monthly Giveaway! 🏆",
            p_title_es: "¡Ganaste el Sorteo Mensual! 🏆",
            p_body_en: `Claim your free book before ${claimDeadline.toISOString().slice(0, 10)}!`,
            p_body_es: `¡Reclama tu libro gratis antes del ${claimDeadline.toISOString().slice(0, 10)}!`,
          });
        }
      }

      // Audit trail
      await svc.from("lottery_draw_log").insert({
        month: prevMonth,
        config_snapshot: prevConfig ?? {},
        eligible_users: eligible.length,
        total_tickets: totalTickets,
        winners_drawn: drawnWinners.length,
        drawn_by: "cron-auto-draw",
      });

      drawSummary = `Drew ${drawnWinners.length} real winner(s) for ${prevMonth}`;
    } else {
      // ── No real participants → sample winner ───────
      hasRealWinners = false;
      drawSummary = `No participants for ${prevMonth}. Sample winner created.`;

      // Audit trail for empty month
      await svc.from("lottery_draw_log").insert({
        month: prevMonth,
        config_snapshot: prevConfig ?? {},
        eligible_users: 0,
        total_tickets: 0,
        winners_drawn: 0,
        drawn_by: "cron-auto-draw",
      });
    }
  }

  // ── Step 2: Auto-setup current month config ────────
  const { data: currConfig } = await svc
    .from("lottery_config")
    .select("month")
    .eq("month", currMonth)
    .maybeSingle();

  if (!currConfig) {
    await svc.from("lottery_config").insert({
      month: currMonth,
      max_winners: 3,
      winner_pct: 1,
      min_purchases: 0,
      is_active: true,
      draw_date: nextDrawDate,
      prize_description: "",
    });
  }

  // ── Step 3: Email admin summary ────────────────────
  await notifyAdminMonthlyDraw({
    month: prevMonth,
    prizeBook: prizeBookPrev.title.en,
    hasRealWinners,
    winners: drawnWinners,
    eligibleUsers: eligibleCount,
    totalTickets,
    totalRegistered: totalUsers ?? 0,
    totalSubscribers: totalSubscribers ?? 0,
    nextMonth: currMonth,
    nextPrizeBook: prizeBookCurr.title.en,
    nextDrawDate,
    summary: drawSummary,
  });

  // ── Step 4: Check for expired unclaimed prizes ───
  const { data: expiredClaims } = await svc
    .from("lottery_winners")
    .select("user_id, month, claim_deadline")
    .eq("claimed", false)
    .lt("claim_deadline", now.toISOString());

  if (expiredClaims && expiredClaims.length > 0) {
    const details: { email: string; month: string; deadline: string }[] = [];
    for (const ec of expiredClaims) {
      const { data: authUser } = await svc.auth.admin.getUserById(ec.user_id);
      details.push({
        email: authUser?.user?.email || "unknown",
        month: ec.month,
        deadline: ec.claim_deadline?.toString().slice(0, 10) || "?",
      });
    }
    await notifyAdminExpiredClaims(details);
  }

  await pingHeartbeat("monthly-draw");
  return new Response(
    JSON.stringify({ ok: true, month: prevMonth, summary: drawSummary }),
    { status: 200, headers }
  );

  } catch (err: any) {
    // Notify admin of cron failure
    await notifyAdminCronError("monthly-draw", err?.message || String(err));
    return new Response(
      JSON.stringify({ error: err?.message || "Cron failed" }),
      { status: 500, headers }
    );
  }
};
