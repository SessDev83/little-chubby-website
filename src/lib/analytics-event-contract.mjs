export const EVENT_CONTRACT_VERSION = "conversion_events_v1";

export const ANALYTICS_EVENT_GROUPS = Object.freeze({
  acquisition: Object.freeze(["session_started", "page_viewed", "utm_detected"]),
  leadCapture: Object.freeze(["lead_magnet_shown", "lead_magnet_submitted", "newsletter_submitted", "newsletter_confirmed"]),
  registration: Object.freeze(["register_started", "register_completed", "login_completed"]),
  activation: Object.freeze(["download_completed", "first_peanut_earned", "first_value_action_completed"]),
  economy: Object.freeze(["peanut_earned", "shop_purchase_started", "shop_purchase_completed"]),
  lottery: Object.freeze(["lottery_viewed", "lottery_entered", "ticket_purchased_with_peanuts"]),
  community: Object.freeze(["review_started", "review_submitted", "review_approved", "share_completed"]),
  books: Object.freeze(["book_page_viewed", "book_review_viewed", "sample_viewed", "amazon_click"]),
  retention: Object.freeze(["return_session", "second_session_action", "dormant_user_returned"]),
  email: Object.freeze(["email_sent", "email_opened", "email_clicked", "email_return_session"]),
  support: Object.freeze(["chat_opened", "chat_help_topic_selected"]),
  agents: Object.freeze(["agent_brief_generated", "agent_recommendation_accepted", "agent_recommendation_dismissed"]),
  futureCommunity: Object.freeze(["art_upload_started", "art_upload_submitted", "art_approved", "reaction_given", "reaction_received", "creator_returned_after_reaction"]),
});

export const ANALYTICS_OPERATIONAL_EVENT_NAMES = Object.freeze([
  "download_attempt",
  "download_blocked",
  "download_error",
  "download_link_clicked",
  "lead_magnet_submit_error",
  "login_view",
  "login_submit_attempt",
  "login_submit_error",
  "lottery_claim_attempt",
  "lottery_claim_error",
  "newsletter_inline_view",
  "newsletter_inline_submit_error",
  "register_submit_error",
  "sample_cta_click",
  "share_click",
  "share_credit_error",
]);

export const ANALYTICS_EVENT_NAMES = Object.freeze([
  ...new Set(Object.values(ANALYTICS_EVENT_GROUPS).flat()),
]);

export const EVENT_NAME_ALIASES = Object.freeze({
  download_success: "download_completed",
  lead_magnet_submit_success: "lead_magnet_submitted",
  login_submit_success: "login_completed",
  lottery_claim_success: "lottery_entered",
  lottery_view: "lottery_viewed",
  newsletter_inline_submit_success: "newsletter_submitted",
  register_submit_attempt: "register_started",
  register_submit_success: "register_completed",
  register_view: "register_started",
  share_credit_success: "share_completed",
  ticket_purchase: "ticket_purchased_with_peanuts",
  ticket_purchased: "ticket_purchased_with_peanuts",
});

export const REQUIRED_EVENT_PROPS = Object.freeze({
  all: Object.freeze(["event_id", "event_contract_version", "funnel_stage"]),
  browser: Object.freeze(["session_id", "anonymous_id", "path", "lang", "device_class"]),
  server: Object.freeze(["capture", "server_confirmed", "user_id, anonymous_id, or visitor_hash"]),
  acquisition: Object.freeze(["source", "landing_page"]),
  books: Object.freeze(["book_id"]),
  content: Object.freeze(["content_id"]),
});

export const ANALYTICS_PRIVACY_RULES = Object.freeze([
  "Do not store raw chat transcripts in conversion_events.",
  "Do not store email, phone, IP address, or child personal data in event props.",
  "Use user_id only for authenticated server-confirmed actions and admin reads.",
  "Treat amazon_click as buyer intent only, never as a confirmed sale.",
  "Keep agent inputs read-only until owner approval gates exist.",
]);

const KNOWN_EVENT_NAME_SET = new Set([...ANALYTICS_EVENT_NAMES, ...ANALYTICS_OPERATIONAL_EVENT_NAMES]);

function stringProp(event, key) {
  const value = event?.props?.[key] ?? event?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function booleanProp(event, key) {
  return event?.props?.[key] === true || event?.[key] === true;
}

function isServerConfirmedEvent(event) {
  return stringProp(event, "capture") === "server" || booleanProp(event, "server_confirmed");
}

function eventTimeMs(event) {
  const value = event?.occurred_at || event?.created_at;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : NaN;
}

function rate(count, total) {
  return total ? count / total : 0;
}

function statusFromRate(value, yellowAt, redAt) {
  if (value >= redAt) return "red";
  if (value >= yellowAt) return "yellow";
  return "green";
}

export function canonicalEventName(eventName) {
  const name = String(eventName || "").trim();
  return EVENT_NAME_ALIASES[name] || name;
}

export function isCanonicalEventName(eventName) {
  const name = String(eventName || "").trim();
  return ANALYTICS_EVENT_NAMES.includes(name);
}

export function isKnownEventName(eventName) {
  return KNOWN_EVENT_NAME_SET.has(canonicalEventName(eventName));
}

export function eventGroup(eventName) {
  const name = canonicalEventName(eventName);
  for (const [group, names] of Object.entries(ANALYTICS_EVENT_GROUPS)) {
    if (names.includes(name)) return group;
  }
  if (ANALYTICS_OPERATIONAL_EVENT_NAMES.includes(name)) return "operational";
  return "unknown";
}

export function eventFunnelStage(eventName) {
  const name = canonicalEventName(eventName);
  const group = eventGroup(name);
  if (group === "acquisition") return "visit";
  if (group === "leadCapture") return "lead";
  if (group === "registration") return "registered";
  if (group === "activation") return "activated";
  if (group === "economy" || group === "lottery") return "engaged";
  if (group === "community" || group === "futureCommunity") return "community";
  if (group === "books") return name === "amazon_click" ? "amazon_click" : "book_intent";
  if (group === "retention" || name === "email_return_session") return "return";
  if (name === "sample_cta_click") return "book_intent";
  if (/download_(attempt|blocked|error|link_clicked)/.test(name)) return "activated";
  if (/register_|login_/.test(name)) return "registered";
  if (/lead_magnet|newsletter/.test(name)) return "lead";
  if (/lottery|shop|peanut|ticket|share_click/.test(name)) return "engaged";
  if (/review|share_credit|art_|reaction/.test(name)) return "community";
  return "other";
}

export function normalizeAnalyticsEvent(event = {}) {
  const originalName = String(event?.event_name || "").trim();
  const eventName = canonicalEventName(originalName);
  const props = event?.props && typeof event.props === "object" ? { ...event.props } : {};
  if (originalName && originalName !== eventName && !props.legacy_event_name) props.legacy_event_name = originalName;
  if (!props.event_contract_version) props.event_contract_version = EVENT_CONTRACT_VERSION;
  if (!props.funnel_stage) props.funnel_stage = eventFunnelStage(eventName);
  return { ...event, event_name: eventName, props };
}

export function normalizeAnalyticsEvents(events = []) {
  return Array.isArray(events) ? events.map((event) => normalizeAnalyticsEvent(event)) : [];
}

export function eventIdForHealth(event) {
  return stringProp(event, "event_id");
}

export function buildEventContractHealth({ events = [], pageviews = [], now = new Date() } = {}) {
  const rawEvents = Array.isArray(events) ? events : [];
  const normalizedEvents = normalizeAnalyticsEvents(rawEvents);
  const totalEvents = normalizedEvents.length;
  const eventIds = new Map();
  let duplicateEventIds = 0;
  let missingEventIds = 0;
  let missingSessionIds = 0;
  let missingAnonymousIds = 0;
  let missingLanguages = 0;
  let missingSources = 0;
  let missingFunnelStages = 0;
  let internalNoise = 0;
  let testNoise = 0;
  let newestEventMs = NaN;
  const unknownEventNames = new Map();

  for (let index = 0; index < rawEvents.length; index += 1) {
    const rawEvent = rawEvents[index] || {};
    const event = normalizedEvents[index] || {};
    const serverConfirmed = isServerConfirmedEvent(event);
    const eventId = eventIdForHealth(event);
    if (!eventId) {
      missingEventIds += 1;
    } else {
      const count = eventIds.get(eventId) || 0;
      if (count > 0) duplicateEventIds += 1;
      eventIds.set(eventId, count + 1);
    }
    if (!serverConfirmed && !stringProp(event, "session_id")) missingSessionIds += 1;
    if (!stringProp(event, "anonymous_id") && !stringProp(event, "user_id") && !stringProp(event, "visitor_hash")) missingAnonymousIds += 1;
    if (!event?.lang && !String(event?.path || "").match(/^\/(en|es)(\/|$)/)) missingLanguages += 1;
    if (!stringProp(event, "source") && !stringProp(event, "utm_source")) missingSources += 1;
    if (!stringProp(event, "funnel_stage") || stringProp(event, "funnel_stage") === "other") missingFunnelStages += 1;
    if (String(event?.path || "").startsWith("/admin") || stringProp(event, "source") === "admin") internalNoise += 1;
    if (/test|debug|fixture/i.test(`${event?.event_name || ""} ${stringProp(event, "source")} ${stringProp(event, "utm_campaign")}`)) testNoise += 1;
    if (!isKnownEventName(rawEvent?.event_name)) {
      const name = String(rawEvent?.event_name || "unknown");
      unknownEventNames.set(name, (unknownEventNames.get(name) || 0) + 1);
    }
    const time = eventTimeMs(event);
    if (Number.isFinite(time) && (!Number.isFinite(newestEventMs) || time > newestEventMs)) newestEventMs = time;
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const freshnessMinutes = Number.isFinite(newestEventMs) && Number.isFinite(nowMs)
    ? Math.max(0, Math.round((nowMs - newestEventMs) / 60000))
    : null;
  const unknownSourcePageviews = Array.isArray(pageviews)
    ? pageviews.filter((row) => !row?.utm_source && !row?.referrer && !row?.landing_page).length
    : 0;
  const checks = [
    {
      key: "event_id_coverage",
      label: "Event ID coverage",
      status: statusFromRate(rate(missingEventIds, totalEvents), 0.01, 0.1),
      value: totalEvents ? 1 - rate(missingEventIds, totalEvents) : 0,
      detail: `${missingEventIds.toLocaleString()} event(s) missing event_id`,
    },
    {
      key: "duplicate_event_id_rate",
      label: "Duplicate event IDs",
      status: statusFromRate(rate(duplicateEventIds, totalEvents), 0.005, 0.02),
      value: rate(duplicateEventIds, totalEvents),
      detail: `${duplicateEventIds.toLocaleString()} duplicate event_id occurrence(s)`,
    },
    {
      key: "missing_session_rate",
      label: "Missing session IDs",
      status: statusFromRate(rate(missingSessionIds, totalEvents), 0.05, 0.2),
      value: rate(missingSessionIds, totalEvents),
      detail: `${missingSessionIds.toLocaleString()} event(s) missing session_id`,
    },
    {
      key: "missing_identity_rate",
      label: "Missing anonymous/user identity",
      status: statusFromRate(rate(missingAnonymousIds, totalEvents), 0.05, 0.2),
      value: rate(missingAnonymousIds, totalEvents),
      detail: `${missingAnonymousIds.toLocaleString()} event(s) missing anonymous_id or user_id`,
    },
    {
      key: "missing_language_rate",
      label: "Missing language",
      status: statusFromRate(rate(missingLanguages, totalEvents), 0.02, 0.1),
      value: rate(missingLanguages, totalEvents),
      detail: `${missingLanguages.toLocaleString()} event(s) missing lang/path language`,
    },
    {
      key: "missing_source_rate",
      label: "Missing source",
      status: statusFromRate(rate(missingSources, totalEvents), 0.1, 0.3),
      value: rate(missingSources, totalEvents),
      detail: `${missingSources.toLocaleString()} event(s) missing source/utm_source`,
    },
    {
      key: "unknown_event_names",
      label: "Unknown event names",
      status: unknownEventNames.size ? "yellow" : "green",
      value: unknownEventNames.size,
      detail: [...unknownEventNames.entries()].map(([name, count]) => `${name} (${count})`).join(", ") || "All event names are known",
    },
    {
      key: "event_freshness",
      label: "Event freshness",
      status: freshnessMinutes === null ? "yellow" : freshnessMinutes > 1440 ? "red" : freshnessMinutes > 180 ? "yellow" : "green",
      value: freshnessMinutes,
      detail: freshnessMinutes === null ? "No event timestamp available" : `Newest event is ${freshnessMinutes.toLocaleString()} minute(s) old`,
    },
  ];

  const status = checks.some((check) => check.status === "red")
    ? "red"
    : checks.some((check) => check.status === "yellow")
      ? "yellow"
      : "green";

  return {
    contractVersion: EVENT_CONTRACT_VERSION,
    status,
    totalEvents,
    totalPageviews: Array.isArray(pageviews) ? pageviews.length : 0,
    metrics: {
      missingEventIds,
      duplicateEventIds,
      missingSessionIds,
      missingAnonymousIds,
      missingLanguages,
      missingSources,
      missingFunnelStages,
      internalNoise,
      testNoise,
      unknownSourcePageviews,
      freshnessMinutes,
    },
    unknownEventNames: [...unknownEventNames.entries()].map(([eventName, count]) => ({ eventName, count })),
    checks,
    privacyRules: ANALYTICS_PRIVACY_RULES,
    requiredProps: REQUIRED_EVENT_PROPS,
  };
}
