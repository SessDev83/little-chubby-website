import type { APIRoute } from "astro";
import { getServiceClient } from "../../../lib/supabase";
import { sendReminderEmail } from "../../../lib/notifications";

export const prerender = false;

/**
 * Daily cron: send reminders to unconfirmed newsletter subscribers.
 *
 * Schedule:
 *   reminder 1 → 2 days after signup
 *   reminder 2 → 5 days after signup
 *   reminder 3 → 10 days after signup
 *   auto-delete → 20 days after signup (no confirmation)
 *
 * All emails are sent in the subscriber's preferred language.
 */

const REMINDER_SCHEDULE = [
  { reminderNumber: 1, minDays: 2 },
  { reminderNumber: 2, minDays: 5 },
  { reminderNumber: 3, minDays: 10 },
];
const CLEANUP_DAYS = 20;

export const GET: APIRoute = async ({ request }) => {
  const headers = { "Content-Type": "application/json" };

  // ── Verify cron secret ─────────────────────────────
  const cronSecret = import.meta.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const svc = getServiceClient();
  const now = new Date();

  try {
    // ── 1. Auto-delete unconfirmed subscribers older than CLEANUP_DAYS ──
    const cleanupDate = new Date(now);
    cleanupDate.setDate(cleanupDate.getDate() - CLEANUP_DAYS);

    const { data: stale } = await svc
      .from("newsletter_subscribers")
      .select("id, email")
      .eq("confirmed", false)
      .lt("created_at", cleanupDate.toISOString());

    let deleted = 0;
    if (stale && stale.length > 0) {
      const ids = stale.map((s) => s.id);
      const { error: delErr } = await svc
        .from("newsletter_subscribers")
        .delete()
        .in("id", ids);
      if (!delErr) deleted = ids.length;
    }

    // ── 2. Send reminders to unconfirmed subscribers ─────────────────
    const { data: unconfirmed } = await svc
      .from("newsletter_subscribers")
      .select("id, email, name, confirm_token, lang_pref, created_at, reminder_count, last_reminder_at")
      .eq("confirmed", false)
      .lt("reminder_count", 3)
      .order("created_at", { ascending: true });

    let sent = 0;

    if (unconfirmed) {
      for (const sub of unconfirmed) {
        const createdAt = new Date(sub.created_at);
        const daysSinceSignup = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const nextReminder = (sub.reminder_count || 0) + 1;

        // Find the schedule entry for the next reminder
        const schedule = REMINDER_SCHEDULE.find((s) => s.reminderNumber === nextReminder);
        if (!schedule) continue;

        // Check if enough days have passed
        if (daysSinceSignup < schedule.minDays) continue;

        // Don't send more than one reminder per day per subscriber
        if (sub.last_reminder_at) {
          const lastSent = new Date(sub.last_reminder_at);
          const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 20) continue;
        }

        // Send the reminder in the subscriber's language
        const sent_ok = await sendReminderEmail(
          sub.email,
          sub.name || "",
          sub.confirm_token,
          sub.lang_pref || "en",
          nextReminder
        );

        // Only increment reminder_count if the email was actually delivered
        if (sent_ok) {
          await svc
            .from("newsletter_subscribers")
            .update({ reminder_count: nextReminder, last_reminder_at: now.toISOString() })
            .eq("id", sub.id);

          sent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, reminders_sent: sent, stale_deleted: deleted }),
      { status: 200, headers }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers }
    );
  }
};
