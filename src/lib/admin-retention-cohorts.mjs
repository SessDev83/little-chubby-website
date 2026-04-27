import { pct, sourceForEvent, stageLabelForEvent } from "./admin-kpis.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_VALUE_EVENTS = new Set([
  "download_success",
  "first_peanut_earned",
  "peanut_earned",
  "newsletter_confirmed",
  "amazon_click",
  "review_submitted",
  "art_upload_submitted",
]);

function timeValue(iso) {
  const value = Date.parse(iso || "");
  return Number.isFinite(value) ? value : 0;
}

function eventUserId(event) {
  const value = event?.props?.user_id || event?.user_id || "";
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function cohortWeek(iso) {
  const date = new Date(iso || "");
  if (Number.isNaN(date.getTime())) return "unknown";
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((normalized.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${normalized.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function inDayWindow(eventTime, startTime, targetDay) {
  const delta = eventTime - startTime;
  return delta >= targetDay * DAY_MS && delta < (targetDay + 1) * DAY_MS;
}

function isFirstValue(event) {
  return FIRST_VALUE_EVENTS.has(event?.event_name);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function makeBucket(label) {
  return {
    label,
    registered: 0,
    eligibleD1: 0,
    retainedD1: 0,
    eligibleD7: 0,
    retainedD7: 0,
    eligibleD30: 0,
    retainedD30: 0,
    activated: 0,
    secondSession: 0,
    firstValues: new Map(),
    sources: new Map(),
    stages: new Map(),
  };
}

function finalizeBucket(bucket) {
  return {
    ...bucket,
    firstValues: undefined,
    sources: undefined,
    stages: undefined,
    d1Rate: pct(bucket.retainedD1, bucket.eligibleD1),
    d7Rate: pct(bucket.retainedD7, bucket.eligibleD7),
    d30Rate: pct(bucket.retainedD30, bucket.eligibleD30),
    activationRate: pct(bucket.activated, bucket.registered),
    secondSessionRate: pct(bucket.secondSession, bucket.registered),
    topFirstValue: topEntry(bucket.firstValues),
    topSource: topEntry(bucket.sources),
    topStage: topEntry(bucket.stages),
  };
}

function getBucket(map, key) {
  const label = key || "unknown";
  if (!map.has(label)) map.set(label, makeBucket(label));
  return map.get(label);
}

/**
 * @param {{ profiles?: any[], events?: any[], now?: Date }} options
 * @returns {Record<string, any>}
 */
export function buildRetentionCohorts(options = {}) {
  const { profiles = [], events = [], now = new Date() } = options;
  const nowTime = now.getTime();
  const eventsByUser = new Map();

  for (const event of events) {
    const userId = eventUserId(event);
    if (!userId) continue;
    if (!eventsByUser.has(userId)) eventsByUser.set(userId, []);
    eventsByUser.get(userId).push(event);
  }

  for (const rows of eventsByUser.values()) {
    rows.sort((a, b) => timeValue(a.created_at) - timeValue(b.created_at));
  }

  const cohorts = new Map();
  const sources = new Map();
  const firstValues = new Map();
  const stages = new Map();
  const summary = makeBucket("summary");
  const recentUsers = [];

  for (const profile of profiles) {
    const registeredAt = timeValue(profile.created_at);
    if (!profile.id || !registeredAt) continue;
    const userEvents = eventsByUser.get(profile.id) || [];
    const postSignupEvents = userEvents.filter((event) => timeValue(event.created_at) >= registeredAt);
    const firstEvent = postSignupEvents[0] || null;
    const firstValue = postSignupEvents.find(isFirstValue) || null;
    const hasActivation = postSignupEvents.some((event) => event.event_name === "download_success" || event.event_name === "first_peanut_earned");
    const hasSecondSession = postSignupEvents.some((event) => event.event_name === "return_session" || timeValue(event.created_at) >= registeredAt + DAY_MS);
    const hasD1 = postSignupEvents.some((event) => inDayWindow(timeValue(event.created_at), registeredAt, 1));
    const hasD7 = postSignupEvents.some((event) => inDayWindow(timeValue(event.created_at), registeredAt, 7));
    const hasD30 = postSignupEvents.some((event) => inDayWindow(timeValue(event.created_at), registeredAt, 30));
    const userRows = [summary, getBucket(cohorts, cohortWeek(profile.created_at)), getBucket(sources, firstEvent ? sourceForEvent(firstEvent) : "unknown")];

    for (const bucket of userRows) {
      bucket.registered += 1;
      if (nowTime - registeredAt >= DAY_MS) bucket.eligibleD1 += 1;
      if (nowTime - registeredAt >= 7 * DAY_MS) bucket.eligibleD7 += 1;
      if (nowTime - registeredAt >= 30 * DAY_MS) bucket.eligibleD30 += 1;
      if (hasD1) bucket.retainedD1 += 1;
      if (hasD7) bucket.retainedD7 += 1;
      if (hasD30) bucket.retainedD30 += 1;
      if (hasActivation) bucket.activated += 1;
      if (hasSecondSession) bucket.secondSession += 1;
      if (firstValue) bump(bucket.firstValues, firstValue.event_name);
      if (firstEvent) {
        bump(bucket.sources, sourceForEvent(firstEvent));
        bump(bucket.stages, stageLabelForEvent(firstEvent));
      }
    }

    if (firstValue) bump(firstValues, firstValue.event_name);
    if (firstEvent) bump(stages, stageLabelForEvent(firstEvent));

    recentUsers.push({
      registeredAt: profile.created_at,
      lang: profile.lang_pref || "unknown",
      firstValue: firstValue?.event_name || "-",
      firstStage: firstEvent ? stageLabelForEvent(firstEvent) : "-",
      firstSource: firstEvent ? sourceForEvent(firstEvent) : "unknown",
      activated: hasActivation,
      secondSession: hasSecondSession,
      d1: hasD1,
      d7: hasD7,
      d30: hasD30,
    });
  }

  const cohortRows = [...cohorts.values()].map(finalizeBucket).sort((a, b) => b.label.localeCompare(a.label)).slice(0, 14);
  const sourceRows = [...sources.values()].map(finalizeBucket).sort((a, b) => b.registered - a.registered).slice(0, 12);

  return {
    summary: finalizeBucket(summary),
    cohortRows,
    sourceRows,
    firstValueRows: [...firstValues.entries()].map(([eventName, count]) => ({ eventName, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    stageRows: [...stages.entries()].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    recentUsers: recentUsers.sort((a, b) => timeValue(b.registeredAt) - timeValue(a.registeredAt)).slice(0, 25),
  };
}