import { pct } from "./admin-kpis.mjs";
import { normalizeAnalyticsEvents } from "./analytics-event-contract.mjs";

const COMMUNITY_EVENTS = new Set(["review_submitted", "review_approved", "art_upload_submitted", "art_approved", "reaction_received", "share_completed"]);
const ECONOMY_EVENTS = new Set(["first_peanut_earned", "peanut_earned", "shop_purchase_completed", "ticket_purchased_with_peanuts", "lottery_entered"]);
const RETURN_EVENTS = new Set(["return_session"]);

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function prefValue(profile, key) {
  const prefs = profile?.notification_prefs || profile?.notificationPrefs || {};
  if (prefs?.[key] === true) return "on";
  if (prefs?.[key] === false) return "off";
  return "unknown";
}

function buildPreferenceRows(profiles = []) {
  const keys = ["community", "giveaway", "shop"];
  return keys.map((key) => {
    const row = { key, on: 0, off: 0, unknown: 0, total: profiles.length };
    for (const profile of profiles) row[prefValue(profile, key)] += 1;
    return {
      ...row,
      optInRate: pct(row.on, Math.max(row.total, 1)),
      status: row.total === 0 || row.unknown >= row.on + row.off ? "Blocked" : row.on > 0 ? "Readable" : "Watch",
    };
  });
}

function buildEventRows(events = []) {
  const map = new Map();
  for (const event of events) {
    const name = event?.event_name || "unknown";
    const row = map.get(name) || { eventName: name, count: 0, category: "other" };
    row.count += 1;
    if (COMMUNITY_EVENTS.has(name)) row.category = "community";
    else if (ECONOMY_EVENTS.has(name)) row.category = "economy";
    else if (RETURN_EVENTS.has(name)) row.category = "return";
    map.set(name, row);
  }
  return [...map.values()].sort((left, right) => right.count - left.count || left.eventName.localeCompare(right.eventName)).slice(0, 16);
}

function health(key, label, status, detail, evidence) {
  return { key, label, status, detail, evidence };
}

function focus(priority, area, title, finding, evidence, recommendedAction, blockedBy = []) {
  return { priority, area, title, finding, evidence, recommendedAction, blockedBy, requiresOwnerDecision: true };
}

function packetFromFocus(row, sampleSizeWarning) {
  return {
    agent_name: "Community Engagement Agent",
    severity: row.priority === "High" ? "yellow" : row.priority === "Medium" ? "green" : "neutral",
    area: row.area,
    metric: row.title,
    finding: row.finding,
    evidence: [row.evidence],
    confidence: sampleSizeWarning ? "medium" : "high",
    sample_size_warning: sampleSizeWarning,
    recommended_action: row.recommendedAction,
    requires_owner_decision: true,
    blocked_by: row.blockedBy,
  };
}

function buildHealthRows({ retention, economy, audienceSignals, preferenceRows, eventRows }) {
  const communityPrefs = preferenceRows.find((row) => row.key === "community") || { status: "Blocked", on: 0, total: 0, optInRate: "0.0%" };
  const communityEvents = eventRows.filter((row) => row.category === "community").reduce((sum, row) => sum + row.count, 0);
  return [
    health(
      "preferences",
      "Preference readiness",
      communityPrefs.status,
      communityPrefs.status === "Readable" ? "Community preference signal is readable" : "Do not recommend nudges until preferences are confirmed",
      `${communityPrefs.on.toLocaleString()} opted in / ${communityPrefs.total.toLocaleString()} profiles`,
    ),
    health(
      "retention",
      "Retention base",
      count(retention?.summary?.registered) > 0 ? "Watch" : "Blocked",
      count(retention?.summary?.registered) > 0 ? "Registered cohorts can be reviewed" : "No registered cohort base in this window",
      `${retention?.summary?.d7Rate || "0.0%"} D7 retention`,
    ),
    health(
      "economy",
      "Economy activity",
      count(economy?.summary?.usersTracked) > 0 ? "Watch" : "Blocked",
      count(economy?.summary?.dormantUsers) > 0 ? "Dormant balances need owner review" : "No dominant dormant balance signal",
      `${count(economy?.summary?.usersTracked).toLocaleString()} wallets / ${count(economy?.summary?.dormantUsers).toLocaleString()} dormant`,
    ),
    health(
      "community",
      "Community signal",
      communityEvents > 0 ? "Watch" : "Baseline",
      communityEvents > 0 ? "Community actions exist but remain review-only" : "No community action strong enough for a suggestion",
      `${communityEvents.toLocaleString()} community event(s)`,
    ),
    health(
      "audience",
      "Audience confidence",
      count(audienceSignals?.summary?.actors) > 0 ? "Watch" : "Blocked",
      audienceSignals?.summary?.topSegment ? `Top segment: ${audienceSignals.summary.topSegment}` : "No audience signal yet",
      `${count(audienceSignals?.summary?.actors).toLocaleString()} actor(s)`,
    ),
  ];
}

function buildFocusRows({ retention, economy, audienceSignals, preferenceRows, eventRows }) {
  const rows = [];
  const communityPrefs = preferenceRows.find((row) => row.key === "community") || { status: "Blocked", unknown: 0, total: 0 };
  const preferenceBlocked = communityPrefs.status === "Blocked";
  const blockedByPrefs = preferenceBlocked ? ["notification_preferences"] : [];
  if (preferenceBlocked) {
    rows.push(focus(
      "High",
      "Preferences",
      "Community opt-in gate",
      `${count(communityPrefs.unknown).toLocaleString()} profile(s) lack a readable community notification preference state.`,
      "profiles.notification_prefs",
      "Keep community suggestions internal until preference and approval rules are confirmed.",
      ["notification_preferences", "owner_approval"],
    ));
  }

  if (count(economy?.summary?.dormantUsers) > 0) {
    rows.push(focus(
      "Medium",
      "Economy",
      "Dormant balances",
      `${count(economy.summary.dormantUsers).toLocaleString()} wallet(s) hold dormant Peanuts totaling ${count(economy.summary.dormantPeanuts).toLocaleString()}.`,
      "economy.summary",
      "Draft a non-user-facing hypothesis for why balances go dormant before any re-engagement idea.",
      blockedByPrefs,
    ));
  }

  if (count(retention?.summary?.retainedD7) > 0 || count(retention?.summary?.secondSession) > 0) {
    rows.push(focus(
      "Medium",
      "Retention",
      "Returning users",
      `${count(retention?.summary?.retainedD7).toLocaleString()} D7 retained and ${count(retention?.summary?.secondSession).toLocaleString()} second-session user(s).`,
      "retention.summary",
      "Look for common first-value or economy paths before suggesting a milestone moment.",
      blockedByPrefs,
    ));
  }

  const communityEvents = eventRows.filter((row) => row.category === "community");
  if (communityEvents.length) {
    rows.push(focus(
      "Low",
      "Community",
      communityEvents[0].eventName,
      `${communityEvents[0].count.toLocaleString()} ${communityEvents[0].eventName} event(s) appeared in the window.`,
      "conversion_events.community",
      "Keep monitoring community actions until moderation and notification rules are approved.",
      blockedByPrefs,
    ));
  }

  if (audienceSignals?.summary?.topSegment && audienceSignals.summary.topSegment !== "Unknown") {
    rows.push(focus(
      "Low",
      "Audience",
      audienceSignals.summary.topSegment,
      `${audienceSignals.summary.topSegment} is the current top audience signal.`,
      "audience_signals.summary",
      "Use this as context only; do not personalize nudges without explicit preference approval.",
      blockedByPrefs,
    ));
  }

  return rows.slice(0, 8);
}

/**
 * @param {{ profiles?: any[], events?: any[], retention?: Record<string, any>, economy?: Record<string, any>, audienceSignals?: Record<string, any> }} options
 * @returns {Record<string, any>}
 */
export function buildCommunityEngagementAgentReport(options = {}) {
  const { profiles = [], retention = {}, economy = {}, audienceSignals = {} } = options;
  const events = normalizeAnalyticsEvents(options.events || []);
  const preferenceRows = buildPreferenceRows(profiles);
  const eventRows = buildEventRows(events);
  const healthRows = buildHealthRows({ retention, economy, audienceSignals, preferenceRows, eventRows });
  const focusRows = buildFocusRows({ retention, economy, audienceSignals, preferenceRows, eventRows });
  const sampleSizeWarning = profiles.length < 30 || events.length < 10;
  const blocked = healthRows.some((row) => row.status === "Blocked") || focusRows.some((row) => row.blockedBy.length > 0);
  const status = blocked ? "Blocked" : focusRows.length ? "Review" : "Baseline";
  const packetRows = focusRows.map((row) => packetFromFocus(row, sampleSizeWarning));
  return {
    summary: {
      status,
      profiles: profiles.length,
      focusItems: focusRows.length,
      communityOptInRate: preferenceRows.find((row) => row.key === "community")?.optInRate || "0.0%",
      communityEvents: eventRows.filter((row) => row.category === "community").reduce((sum, row) => sum + row.count, 0),
      dormantUsers: count(economy?.summary?.dormantUsers),
      retainedD7: count(retention?.summary?.retainedD7),
      topSegment: audienceSignals?.summary?.topSegment || "-",
      ownerDecisionRequired: focusRows.length > 0,
      sampleSizeWarning,
    },
    healthRows,
    preferenceRows,
    eventRows,
    focusRows,
    packetRows,
    guardrails: [
      "This report does not send notifications, emails, rewards, or in-app nudges.",
      "Preference readiness is a blocker, not a workaround target.",
      "Owner approval is required before user-facing community or retention actions.",
      "Do not target sensitive segments or private user behavior from this aggregate report.",
    ],
    note: "P6-06 identifies community and retention opportunities for owner review only. It does not trigger engagement actions.",
  };
}