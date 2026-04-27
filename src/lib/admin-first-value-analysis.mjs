import { classifyAdminSource, eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_VALUE_EVENTS = new Set([
  "download_success",
  "newsletter_confirmed",
  "register_submit_success",
  "first_peanut_earned",
  "peanut_earned",
  "book_page_viewed",
  "sample_viewed",
  "lottery_entered",
  "review_submitted",
]);

const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);
const COMMUNITY_EVENTS = new Set(["review_submitted", "review_approved", "art_upload_submitted", "art_approved", "reaction_received", "share_credit_success"]);
const ECONOMY_EVENTS = new Set(["first_peanut_earned", "peanut_earned", "shop_purchase_completed", "ticket_purchase", "ticket_purchased"]);
const LEAD_EVENTS = new Set(["lead_magnet_submit_success", "newsletter_inline_submit_success", "newsletter_confirmed"]);

function timeValue(iso) {
  const value = Date.parse(iso || "");
  return Number.isFinite(value) ? value : 0;
}

function actorId(row) {
  return eventProp(row, "user_id") || row?.visitor_hash || "";
}

function ensureActor(map, id) {
  if (!id) return null;
  if (!map.has(id)) map.set(id, { id, events: [], pageviews: [], sources: new Map(), landings: new Map() });
  return map.get(id);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "-";
}

function ensureBucket(map, firstValue) {
  const label = firstValue || "unknown";
  if (!map.has(label)) {
    map.set(label, {
      firstValue: label,
      actors: 0,
      returned: 0,
      secondSession: 0,
      activated: 0,
      leads: 0,
      registrations: 0,
      economy: 0,
      community: 0,
      bookIntent: 0,
      amazonClicks: 0,
      sources: new Map(),
      landings: new Map(),
      followups: new Map(),
    });
  }
  return map.get(label);
}

function sourceFromActor(actor, firstEvent) {
  const fromEvent = sourceForEvent(firstEvent);
  if (fromEvent && fromEvent !== "unknown") return fromEvent;
  return topEntry(actor.sources);
}

function landingFromActor(actor, firstEvent) {
  return eventProp(firstEvent, "landing_page") || firstEvent?.path || topEntry(actor.landings);
}

function rowScore(row) {
  return (row.returned * 3) + (row.secondSession * 3) + (row.bookIntent * 2) + (row.amazonClicks * 4) + (row.community * 3) + row.activated + row.leads + row.registrations;
}

function recommendation(row) {
  if (row.actors < 10) return "Collect more sample";
  if (row.returned === 0 && row.secondSession === 0) return "Add a clearer next step";
  if (row.bookIntent > 0 && row.amazonClicks === 0) return "Strengthen book-to-Amazon path";
  if (row.community > row.bookIntent) return "Protect community follow-up";
  return "Monitor and compare weekly";
}

function finalizeBucket(row) {
  const score = rowScore(row);
  return {
    ...row,
    sources: undefined,
    landings: undefined,
    followups: undefined,
    returnRate: pct(row.returned, row.actors),
    secondSessionRate: pct(row.secondSession, row.actors),
    activationRate: pct(row.activated, row.actors),
    bookIntentRate: pct(row.bookIntent, row.actors),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    communityRate: pct(row.community, row.actors),
    topSource: topEntry(row.sources),
    topLanding: topEntry(row.landings),
    topFollowup: topEntry(row.followups),
    score,
    recommendation: recommendation(row),
    sampleWarning: row.actors < 30 ? "Small sample" : "Stable sample",
  };
}

function buildSourceRows(actorResults) {
  const map = new Map();
  for (const actor of actorResults) {
    const key = `${actor.source}::${actor.firstValue}`;
    const row = map.get(key) || { source: actor.source, firstValue: actor.firstValue, actors: 0, returned: 0, bookIntent: 0, amazonClicks: 0 };
    row.actors += 1;
    if (actor.returned) row.returned += 1;
    if (actor.bookIntent) row.bookIntent += 1;
    if (actor.amazonClicks) row.amazonClicks += 1;
    map.set(key, row);
  }
  return [...map.values()]
    .map((row) => ({ ...row, returnRate: pct(row.returned, row.actors), bookIntentRate: pct(row.bookIntent, row.actors) }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.returned - a.returned || b.actors - a.actors)
    .slice(0, 16);
}

/**
 * @param {{ events?: any[], pageviews?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildFirstValueAnalysis(options = {}) {
  const { events = [], pageviews = [] } = options;
  const actorMap = new Map();

  for (const pageview of pageviews) {
    const actor = ensureActor(actorMap, pageview?.visitor_hash || "");
    if (!actor) continue;
    actor.pageviews.push(pageview);
    const source = classifyAdminSource(pageview).label;
    bump(actor.sources, source);
    bump(actor.landings, pageview?.landing_page || pageview?.path || "/");
  }

  for (const event of events) {
    const actor = ensureActor(actorMap, actorId(event));
    if (!actor) continue;
    actor.events.push(event);
    bump(actor.sources, sourceForEvent(event));
    bump(actor.landings, eventProp(event, "landing_page") || event?.path || "/");
  }

  const buckets = new Map();
  const actorResults = [];

  for (const actor of actorMap.values()) {
    const sortedEvents = actor.events.slice().sort((a, b) => timeValue(a.created_at) - timeValue(b.created_at));
    const firstEvent = sortedEvents.find((event) => FIRST_VALUE_EVENTS.has(event?.event_name));
    if (!firstEvent) continue;
    const firstTime = timeValue(firstEvent.created_at);
    const after = sortedEvents.filter((event) => timeValue(event.created_at) >= firstTime);
    const firstValue = firstEvent.event_name;
    const source = sourceFromActor(actor, firstEvent);
    const landing = landingFromActor(actor, firstEvent);
    const returned = after.some((event) => event.event_name === "return_session" || timeValue(event.created_at) >= firstTime + DAY_MS);
    const secondSession = after.some((event) => event.event_name === "return_session" || timeValue(event.created_at) >= firstTime + DAY_MS);
    const activated = after.some((event) => event.event_name === "download_success" || event.event_name === "first_peanut_earned");
    const leads = after.some((event) => LEAD_EVENTS.has(event.event_name));
    const registrations = after.some((event) => event.event_name === "register_submit_success");
    const economy = after.some((event) => ECONOMY_EVENTS.has(event.event_name));
    const community = after.some((event) => COMMUNITY_EVENTS.has(event.event_name));
    const bookIntent = after.some((event) => BOOK_EVENTS.has(event.event_name));
    const amazonClicks = after.some((event) => event.event_name === "amazon_click");
    const followup = after.find((event) => event !== firstEvent)?.event_name || "-";

    const bucket = ensureBucket(buckets, firstValue);
    bucket.actors += 1;
    if (returned) bucket.returned += 1;
    if (secondSession) bucket.secondSession += 1;
    if (activated) bucket.activated += 1;
    if (leads) bucket.leads += 1;
    if (registrations) bucket.registrations += 1;
    if (economy) bucket.economy += 1;
    if (community) bucket.community += 1;
    if (bookIntent) bucket.bookIntent += 1;
    if (amazonClicks) bucket.amazonClicks += 1;
    bump(bucket.sources, source);
    bump(bucket.landings, landing);
    bump(bucket.followups, followup);

    actorResults.push({ id: actor.id, firstValue, source, landing, returned, secondSession, activated, leads, registrations, economy, community, bookIntent, amazonClicks, followup });
  }

  const firstValueRows = [...buckets.values()].map(finalizeBucket).sort((a, b) => b.score - a.score || b.actors - a.actors || a.firstValue.localeCompare(b.firstValue));
  const actorsWithFirstValue = actorResults.length;
  const bestReturnAction = firstValueRows.slice().sort((a, b) => b.returned - a.returned || b.actors - a.actors)[0]?.firstValue || "-";
  const bestBookAction = firstValueRows.slice().sort((a, b) => b.bookIntent - a.bookIntent || b.amazonClicks - a.amazonClicks || b.actors - a.actors)[0]?.firstValue || "-";
  const bestCommunityAction = firstValueRows.slice().sort((a, b) => b.community - a.community || b.actors - a.actors)[0]?.firstValue || "-";

  return {
    summary: {
      actorsWithFirstValue,
      firstValueTypes: firstValueRows.length,
      topFirstValue: firstValueRows[0]?.firstValue || "-",
      bestReturnAction,
      bestBookAction,
      bestCommunityAction,
      returnedActors: actorResults.filter((actor) => actor.returned).length,
      bookIntentActors: actorResults.filter((actor) => actor.bookIntent).length,
      amazonClickActors: actorResults.filter((actor) => actor.amazonClicks).length,
      communityActors: actorResults.filter((actor) => actor.community).length,
      sampleWarning: actorsWithFirstValue < 30 ? "Small sample: use directionally only" : "Stable enough for trend review",
    },
    firstValueRows,
    sourceRows: buildSourceRows(actorResults),
    actorRows: actorResults
      .sort((a, b) => Number(b.amazonClicks) - Number(a.amazonClicks) || Number(b.bookIntent) - Number(a.bookIntent) || Number(b.returned) - Number(a.returned))
      .slice(0, 20),
    note: "First value analysis is aggregate and directional. It measures what happened after the first useful action without changing onboarding, email, or personalization behavior.",
  };
}