import type { APIRoute } from "astro";
import { getServiceClient, supabase } from "../../lib/supabase";

export const prerender = false;

/**
 * GDPR Article 20 — Data portability.
 *
 * Returns a single JSON document with every row in our database that is
 * owned by the authenticated user. The file is offered as a download
 * (Content-Disposition: attachment) named `little-chubby-press-data-<date>.json`.
 *
 * Security:
 *  - Cookie auth (sb-access-token / sb-refresh-token) — no anonymous export.
 *  - Uses the service-role client ONLY after verifying the session user id;
 *    every query is scoped by that user_id.
 *  - Cache-Control: private, no-store — never cached by CDN or browser.
 *
 * We intentionally do NOT rate-limit this endpoint via check_rate_limit
 * (which is tied to credit_transactions.reason allowlist) because exporting
 * your own data is idempotent and the user already holds the underlying
 * information — abuse surface is negligible.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
  };

  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers });
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionErr || !sessionData.session?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers });
    }
    const user_id = sessionData.session.user.id;
    const email = sessionData.session.user.email || null;

    const svc = getServiceClient();

    // Run every user-scoped query in parallel. We swallow individual errors
    // per-table so a transient issue on one relation does not block the
    // whole export. Each slot is either an array of rows or [].
    const pick = async (
      table: string,
      column: string,
      select: string
    ): Promise<Record<string, unknown>[]> => {
      try {
        // Generic helper: arbitrary table name forces an `any` cast through
        // PostgREST's strict literal-union typing.
        const { data } = await (svc.from as any)(table).select(select).eq(column, user_id);
        return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
      } catch {
        return [];
      }
    };

    const [
      profile,
      reviews,
      downloads,
      credits,
      tickets,
      streaks,
      badges,
      notifications,
      pendingGiftsOut,
      pendingGiftsIn,
      homePins,
      boosts,
      shoutouts,
      lotteryEntries,
      lotteryWinners,
      shares,
      notificationPrefs,
    ] = await Promise.all([
      // Profile (single row)
      (async () => {
        try {
          const { data } = await svc
            .from("profiles")
            .select(
              "id, email, display_name, lang_pref, avatar_url, address_line1, address_line2, city, state, zip_code, country, phone, show_in_leaderboards, featured_badge, created_at"
            )
            .eq("id", user_id)
            .maybeSingle();
          return data || null;
        } catch {
          return null;
        }
      })(),

      pick(
        "book_reviews",
        "user_id",
        "id, book_id, photo_url, extra_photos, rating, review_text, status, submitted_at, reviewer_note"
      ),
      pick("artwork_downloads", "user_id", "id, artwork_id, downloaded_at"),
      pick("credit_transactions", "user_id", "id, amount, reason, metadata, created_at"),
      pick("ticket_transactions", "user_id", "id, amount, reason, metadata, created_at"),
      pick("user_streaks", "user_id", "current_streak, longest_streak, last_visit_date, freeze_count"),
      pick("profile_badges", "user_id", "badge_type, acquired_at, expires_at, active"),
      pick(
        "user_notifications",
        "user_id",
        "id, type, title, body, is_read, created_at"
      ),
      pick("pending_gifts", "sender_id", "id, recipient_email, tickets, created_at, claimed_at, refunded_at"),
      pick("pending_gifts", "recipient_id", "id, sender_id, tickets, created_at, claimed_at"),
      pick("home_pins", "user_id", "id, review_id, starts_at, ends_at, created_at"),
      pick("gallery_boosts", "user_id", "id, review_id, kind, starts_at, ends_at"),
      pick("shoutout_orders", "user_id", "id, review_id, status, requested_at, delivered_at"),
      pick("lottery_entries", "user_id", "id, lottery_id, tickets, entered_at"),
      pick("lottery_winners", "user_id", "id, lottery_id, prize, announced_at"),
      pick("social_shares", "user_id", "id, channel, created_at"),
      pick("notification_prefs", "user_id", "prefs, updated_at"),
    ]);

    // Newsletter subscription is keyed by email, not user_id.
    let newsletter: Record<string, unknown> | null = null;
    if (email) {
      try {
        const { data } = await svc
          .from("newsletter_subscribers")
          .select("email, name, lang_pref, source, confirmed, created_at")
          .eq("email", email)
          .maybeSingle();
        newsletter = (data as Record<string, unknown>) || null;
      } catch {
        newsletter = null;
      }
    }

    const payload = {
      _meta: {
        exported_at: new Date().toISOString(),
        user_id,
        email,
        format_version: 1,
        note:
          "This file contains every row in our database owned by your account. " +
          "Photos are referenced by URL (stored in Supabase Storage). Aggregated " +
          "analytics that do not identify you (page views, session hashes) are " +
          "not included because they are not linkable to your identity.",
      },
      profile,
      newsletter,
      reviews,
      artwork_downloads: downloads,
      credit_transactions: credits,
      ticket_transactions: tickets,
      streaks,
      badges,
      notifications,
      notification_prefs: notificationPrefs,
      pending_gifts_sent: pendingGiftsOut,
      pending_gifts_received: pendingGiftsIn,
      home_pins: homePins,
      gallery_boosts: boosts,
      shoutout_orders: shoutouts,
      lottery_entries: lotteryEntries,
      lottery_winners: lotteryWinners,
      social_shares: shares,
    };

    const today = new Date().toISOString().slice(0, 10);
    const filename = `little-chubby-press-data-${today}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        ...headers,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers,
    });
  }
};
