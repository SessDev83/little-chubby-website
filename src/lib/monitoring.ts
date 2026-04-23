/**
 * External uptime / heartbeat helpers.
 *
 * Heartbeats are sent to Better Stack (or any compatible provider) so that
 * a *missing* cron run triggers an alert. This complements `notifyAdminCronError`
 * which only fires when a cron runs AND fails. If the scheduler never invokes
 * the cron at all (the April 1 2026 `monthly-draw` scenario), only a
 * heartbeat-based watchdog can detect it.
 *
 * Heartbeat URLs are injected per-job via env vars. Missing env var = silent
 * no-op (so preview/local builds don't ping production monitors).
 */

const HEARTBEAT_URLS: Record<string, string | undefined> = {
  "monthly-draw": import.meta.env.BETTERSTACK_HEARTBEAT_MONTHLY_DRAW,
  "weekly-newsletter": import.meta.env.BETTERSTACK_HEARTBEAT_WEEKLY_NEWSLETTER,
  "newsletter-reminders": import.meta.env.BETTERSTACK_HEARTBEAT_NEWSLETTER_REMINDERS,
  "award-top-earners": import.meta.env.BETTERSTACK_HEARTBEAT_AWARD_TOP_EARNERS,
  "refund-expired-gifts": import.meta.env.BETTERSTACK_HEARTBEAT_REFUND_EXPIRED_GIFTS,
  "refresh-leaderboard": import.meta.env.BETTERSTACK_HEARTBEAT_REFRESH_LEADERBOARD,
};

/**
 * Fire a heartbeat ping to the configured uptime monitor for this job.
 * Never throws — heartbeat failures must not break the cron.
 */
export async function pingHeartbeat(job: keyof typeof HEARTBEAT_URLS | string): Promise<void> {
  const url = HEARTBEAT_URLS[job];
  if (!url) return;
  try {
    // 3-second timeout so a dead monitor can't stall the cron
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetch(url, { method: "GET", signal: ctrl.signal });
    clearTimeout(t);
  } catch {
    // Deliberately swallow — the cron's own success/failure signal is
    // the source of truth. A failed ping only means the monitor missed
    // a heartbeat, which Better Stack will alert on separately.
  }
}
