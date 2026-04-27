import { stageLabelForEvent, sourceForEvent } from "./admin-kpis.mjs";

const STAGE_RANK = Object.freeze({
  Lead: 1,
  Registered: 2,
  Activated: 3,
  Engaged: 4,
  Community: 5,
  "Book Intent": 6,
  "Amazon Click": 7,
  Return: 8,
});

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newestDate(values) {
  return values
    .map(validDate)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function oldestDate(values) {
  return values
    .map(validDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

function eventLabel(event) {
  return event?.event_name || event?.type || "activity";
}

function pickHighestStage(stages) {
  return stages.sort((a, b) => (STAGE_RANK[b] || 0) - (STAGE_RANK[a] || 0))[0] || "Registered";
}

function retentionStatus(lastActionAt, now = new Date()) {
  if (!lastActionAt) return { label: "Unknown", tone: "quiet" };
  const days = Math.floor((now.getTime() - lastActionAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 7) return { label: "Active", tone: "good", daysSinceAction: days };
  if (days <= 30) return { label: "Recent", tone: "good", daysSinceAction: days };
  if (days <= 90) return { label: "Cooling", tone: "warn", daysSinceAction: days };
  return { label: "Dormant", tone: "danger", daysSinceAction: days };
}

function pushTimeline(timeline, item) {
  const date = validDate(item.at);
  if (!date) return;
  timeline.push({ ...item, at: date.toISOString() });
}

export function formatUserJourneyTime(iso) {
  const date = validDate(iso);
  if (!date) return "-";
  return date.toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function buildAdminUserJourney(options = {}) {
  const {
    profile = {},
    newsletterSub = null,
    reviews = [],
    credits = [],
    tickets = [],
    badges = [],
    lotteryEntries = [],
    downloads = [],
    conversionEvents = [],
    now = new Date(),
  } = options;

  const stages = ["Registered"];
  if (newsletterSub) stages.push("Lead");
  if (downloads.length || credits.some((row) => row.reason === "download")) stages.push("Activated");
  if (credits.length || tickets.length || lotteryEntries.length || badges.length) stages.push("Engaged");
  if (reviews.length) stages.push("Community");
  for (const event of conversionEvents) {
    const stage = stageLabelForEvent(event);
    if (STAGE_RANK[stage]) stages.push(stage);
  }
  const lifecycleStage = profile.suspended ? "Suspended" : pickHighestStage(stages);

  const timeline = [];
  pushTimeline(timeline, { at: profile.created_at, type: "profile", label: "Registered", detail: profile.email || profile.display_name || "Profile created" });
  if (newsletterSub) {
    pushTimeline(timeline, {
      at: newsletterSub.created_at,
      type: "newsletter",
      label: newsletterSub.confirmed ? "Newsletter confirmed" : "Newsletter pending",
      detail: newsletterSub.source || "newsletter",
    });
  }
  for (const row of downloads) pushTimeline(timeline, { at: row.downloaded_at, type: "download", label: "Artwork download", detail: row.artwork_id });
  for (const row of reviews) pushTimeline(timeline, { at: row.submitted_at, type: "review", label: `Review ${row.status || "submitted"}`, detail: row.book_id });
  for (const row of credits) pushTimeline(timeline, { at: row.created_at, type: "peanuts", label: `${row.amount >= 0 ? "+" : ""}${row.amount} peanuts`, detail: row.reason || row.ref_id || "credit" });
  for (const row of tickets) pushTimeline(timeline, { at: row.created_at, type: "tickets", label: `${row.amount >= 0 ? "+" : ""}${row.amount} tickets`, detail: row.reason || row.ref_id || "ticket" });
  for (const row of lotteryEntries) pushTimeline(timeline, { at: row.purchased_at, type: "lottery", label: `${row.entry_count || 0} lottery entries`, detail: row.month });
  for (const row of badges) pushTimeline(timeline, { at: row.purchased_at, type: "badge", label: row.active ? "Badge active" : "Badge inactive", detail: row.badge_type });
  for (const event of conversionEvents) {
    pushTimeline(timeline, {
      at: event.created_at,
      type: "event",
      label: eventLabel(event),
      detail: event.path || sourceForEvent(event),
      stage: stageLabelForEvent(event),
    });
  }
  timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const firstValueAt = oldestDate([
    ...downloads.map((row) => row.downloaded_at),
    ...reviews.map((row) => row.submitted_at),
    ...credits.map((row) => row.created_at),
    newsletterSub?.created_at,
    profile.created_at,
  ]);
  const lastActionAt = newestDate(timeline.map((row) => row.at));
  const firstConversionEvent = [...conversionEvents].sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""))[0] || null;
  const acquisitionSource = firstConversionEvent ? sourceForEvent(firstConversionEvent) : newsletterSub?.source || "registered";
  const acquisitionLanding = firstConversionEvent?.props?.landing_page || firstConversionEvent?.path || "-";
  const retention = profile.suspended ? { label: "Suspended", tone: "danger" } : retentionStatus(lastActionAt, now);

  const nextBestAction = profile.suspended
    ? "Review suspension"
    : !newsletterSub
      ? "Invite newsletter"
      : !downloads.length
        ? "Encourage first download"
        : !reviews.length
          ? "Invite review"
          : "Maintain relationship";

  return {
    lifecycleStage,
    acquisitionSource,
    acquisitionLanding,
    firstValueAt: firstValueAt?.toISOString() || null,
    lastActionAt: lastActionAt?.toISOString() || null,
    retention,
    nextBestAction,
    timeline: timeline.slice(0, 30),
    counts: {
      reviews: reviews.length,
      downloads: downloads.length,
      credits: credits.length,
      tickets: tickets.length,
      badges: badges.length,
      lotteryEntries: lotteryEntries.length,
      conversionEvents: conversionEvents.length,
    },
  };
}