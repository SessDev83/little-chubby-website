import { classifyAdminSource, formatKpiTime, landingPathForEvent, shortText, sourceForEvent, stageLabelForEvent } from "./admin-kpis.mjs";

function timeValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function humanizeEventName(name) {
  return String(name || "event").replace(/_/g, " ");
}

function visitorLabel(visitorHash) {
  if (!visitorHash) return "-";
  return shortText(String(visitorHash), 12);
}

function toneForEvent(name) {
  const eventName = String(name || "");
  if (/error|blocked|failed|denied/.test(eventName)) return "warn";
  if (/success|confirmed|approved|download|amazon_click|register_submit_success/.test(eventName)) return "good";
  if (/attempt|submit|click|viewed|sample/.test(eventName)) return "neutral";
  return "quiet";
}

function priorityForEvent(name) {
  const eventName = String(name || "");
  if (/error|blocked|failed|denied/.test(eventName)) return 90;
  if (/amazon_click|register_submit_success|newsletter_confirmed|download_success/.test(eventName)) return 80;
  if (/book_page|sample|lead|share|lottery|review/.test(eventName)) return 60;
  return 40;
}

function eventItem(event, index = 0) {
  const eventName = event.event_name || "event";
  const source = sourceForEvent(event);
  const stage = stageLabelForEvent(event);
  return {
    id: `event-${event.id || event.created_at || index}`,
    kind: "event",
    tone: toneForEvent(eventName),
    priority: priorityForEvent(eventName),
    at: event.created_at || null,
    title: humanizeEventName(eventName),
    stage,
    source,
    lang: event.lang || "-",
    path: event.path || landingPathForEvent(event),
    visitor: visitorLabel(event.visitor_hash),
  };
}

function pageviewItem(row, index = 0) {
  const source = classifyAdminSource(row);
  return {
    id: `visit-${row.id || row.created_at || index}`,
    kind: "visit",
    tone: "quiet",
    priority: 10,
    at: row.created_at || null,
    title: "page visit",
    stage: "Visit",
    source: source.label,
    lang: String(row.path || "").match(/^\/(en|es)(\/|$)/)?.[1] || "-",
    path: row.path || "/",
    visitor: visitorLabel(row.visitor_hash),
  };
}

export function formatOpsFeedTime(iso) {
  return formatKpiTime(iso);
}

/**
 * @param {{ events?: any[], pageviews?: any[], limit?: number }} options
 * @returns {{ items: any[], stats: Record<string, number> }}
 */
export function buildOpsFeed(options = {}) {
  const { events = [], pageviews = [], limit = 50 } = options;
  const eventItems = events.map(eventItem);
  const visitItems = pageviews.map(pageviewItem);
  const items = [...eventItems, ...visitItems]
    .sort((a, b) => timeValue(b.at) - timeValue(a.at) || b.priority - a.priority)
    .slice(0, limit);
  const stats = {
    total: items.length,
    events: eventItems.length,
    visits: visitItems.length,
    warnings: eventItems.filter((item) => item.tone === "warn").length,
    highValue: eventItems.filter((item) => item.priority >= 80 && item.tone !== "warn").length,
  };
  return { items, stats };
}