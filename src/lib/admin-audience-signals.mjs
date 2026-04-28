import { ADMIN_FUNNEL_STAGES, eventProp, langFromPath, sourceForEvent, stageLabelForEvent } from "./admin-kpis.mjs";
import { normalizeAnalyticsEvents } from "./analytics-event-contract.mjs";

export const AUDIENCE_SEGMENTS = Object.freeze([
  "Parent/Caregiver",
  "Bilingual Family",
  "Adult Colorist",
  "Educator/Homeschool",
  "Gift Shopper",
  "Community Creator",
  "Giveaway Participant",
  "Free-Only Downloader",
  "Unknown",
]);

const FIRST_VALUE_EVENTS = new Set(["download_completed", "first_peanut_earned", "newsletter_confirmed", "register_completed", "book_page_viewed", "sample_viewed"]);
const COMMUNITY_EVENTS = new Set(["review_submitted", "review_approved", "art_upload_submitted", "art_approved", "reaction_received", "share_completed"]);
const LOTTERY_EVENTS = new Set(["lottery_viewed", "lottery_entered"]);
const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);
const ADULT_BOOK_HINTS = new Set(["chic-styles", "style-time-machine"]);

const SEGMENT_NEXT_ACTION = Object.freeze({
  "Parent/Caregiver": "Improve first download to newsletter or account path",
  "Bilingual Family": "Compare EN/ES continuity and email return",
  "Adult Colorist": "Watch detailed-book and community proof behavior",
  "Educator/Homeschool": "Validate repeat weekday resource depth",
  "Gift Shopper": "Strengthen samples, reviews, and Amazon path clarity",
  "Community Creator": "Protect moderation and recognition loops",
  "Giveaway Participant": "Keep lottery return behavior healthy and clear",
  "Free-Only Downloader": "Offer a gentle next step after first value",
  Unknown: "Wait for more than one useful signal",
});

function actorId(row) {
  return eventProp(row, "user_id") || row?.visitor_hash || "";
}

function emptyActor(id) {
  return {
    id,
    actions: 0,
    pageviews: 0,
    events: 0,
    downloads: 0,
    weekdayDownloads: 0,
    leads: 0,
    registrations: 0,
    returns: 0,
    bookIntent: 0,
    amazonClicks: 0,
    communityEvents: 0,
    lotteryEvents: 0,
    firstValueAction: "-",
    firstValueAt: "",
    stages: new Set(["Visit"]),
    sources: new Map(),
    languages: new Set(),
    scores: new Map(),
  };
}

function ensureActor(map, id) {
  if (!id) return null;
  if (!map.has(id)) map.set(id, emptyActor(id));
  return map.get(id);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function addScore(actor, segment, amount) {
  actor.scores.set(segment, (actor.scores.get(segment) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "-";
}

function stageRank(stage) {
  const index = ADMIN_FUNNEL_STAGES.indexOf(stage);
  return index < 0 ? -1 : index;
}

function highestStage(stages) {
  return [...stages].sort((a, b) => stageRank(b) - stageRank(a))[0] || "Visit";
}

function confidenceFor(actor, topScore) {
  if (!topScore) return "Unknown";
  if (actor.actions < 2) return "Low";
  if (topScore >= 7 && actor.actions >= 4) return "High";
  if (topScore >= 4) return "Medium";
  return "Low";
}

function sourceFromPageview(row) {
  return row?.utm_source || row?.referrer || "direct";
}

function eventSource(event) {
  return sourceForEvent(event) || eventProp(event, "medium") || "unknown";
}

function addPathSignals(actor, path = "") {
  const text = String(path || "").toLowerCase();
  if (!text) return;
  if (text.includes("/es/")) addScore(actor, "Bilingual Family", 1);
  if (text.includes("coloring-corner") || text.includes("download")) addScore(actor, "Parent/Caregiver", 1);
  if (/school|classroom|teacher|homeschool|alphabet|worksheet|printable/.test(text)) addScore(actor, "Educator/Homeschool", 2);
  if (text.includes("/books/")) addScore(actor, "Gift Shopper", 1);
  if (/gallery|profile|badge|review|art-wall/.test(text)) addScore(actor, "Community Creator", 1);
  if (text.includes("lottery")) addScore(actor, "Giveaway Participant", 2);
  if (/fashion|style|chic|adult|teen/.test(text)) addScore(actor, "Adult Colorist", 1);
}

function addBookSignals(actor, event) {
  const bookId = eventProp(event, "book_id");
  addScore(actor, "Gift Shopper", event?.event_name === "amazon_click" ? 4 : 2);
  if (ADULT_BOOK_HINTS.has(bookId)) addScore(actor, "Adult Colorist", 2);
}

function setFirstValue(actor, event) {
  if (!FIRST_VALUE_EVENTS.has(event?.event_name)) return;
  const at = event?.created_at || "";
  if (!actor.firstValueAt || (at && at < actor.firstValueAt)) {
    actor.firstValueAt = at;
    actor.firstValueAction = event.event_name;
  }
}

function finalizeActor(actor) {
  if (actor.languages.size > 1) addScore(actor, "Bilingual Family", 4);
  if (actor.downloads >= 3) addScore(actor, "Educator/Homeschool", 3);
  if (actor.weekdayDownloads >= 2) addScore(actor, "Educator/Homeschool", 2);
  if (actor.downloads > 0 && actor.leads === 0 && actor.registrations === 0 && actor.returns === 0 && actor.bookIntent === 0 && actor.communityEvents === 0) {
    addScore(actor, "Free-Only Downloader", 2 + actor.downloads);
  }

  const ranked = [...actor.scores.entries()].sort((a, b) => b[1] - a[1] || AUDIENCE_SEGMENTS.indexOf(a[0]) - AUDIENCE_SEGMENTS.indexOf(b[0]));
  const [primarySegment = "Unknown", topScore = 0] = ranked[0] || [];
  const secondarySegment = ranked[1]?.[0] || "-";
  const confidence = confidenceFor(actor, topScore);
  return {
    id: actor.id,
    primarySegment,
    secondarySegment,
    confidence,
    topScore,
    firstValueAction: actor.firstValueAction,
    currentFunnelStage: highestStage(actor.stages),
    highestFunnelStage: highestStage(actor.stages),
    topSource: topEntry(actor.sources),
    languages: [...actor.languages].sort().join("/") || "unknown",
    actions: actor.actions,
    pageviews: actor.pageviews,
    events: actor.events,
    downloads: actor.downloads,
    bookIntent: actor.bookIntent,
    amazonClicks: actor.amazonClicks,
    communityEvents: actor.communityEvents,
    returns: actor.returns,
    stages: actor.stages,
    sources: actor.sources,
  };
}

function ensureSegment(map, segment) {
  if (!map.has(segment)) {
    map.set(segment, {
      segment,
      actors: 0,
      confidence: { Unknown: 0, Low: 0, Medium: 0, High: 0 },
      stages: Object.fromEntries(ADMIN_FUNNEL_STAGES.map((stage) => [stage, 0])),
      firstValues: new Map(),
      sources: new Map(),
      bookIntent: 0,
      amazonClicks: 0,
      communityEvents: 0,
      returnEvents: 0,
      totalActions: 0,
    });
  }
  return map.get(segment);
}

function finalizeSegmentRows(map) {
  return [...map.values()]
    .map((row) => ({
      ...row,
      firstValues: undefined,
      sources: undefined,
      confidenceLabel: row.confidence.High > 0 ? "High" : row.confidence.Medium > 0 ? "Medium" : row.confidence.Low > 0 ? "Low" : "Unknown",
      topFirstValue: topEntry(row.firstValues),
      topSource: topEntry(row.sources),
      nextAction: SEGMENT_NEXT_ACTION[row.segment] || SEGMENT_NEXT_ACTION.Unknown,
      sampleWarning: row.actors < 30 ? "Small sample" : "Stable sample",
    }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.communityEvents - a.communityEvents || b.actors - a.actors);
}

function buildSourceRows(actors) {
  const map = new Map();
  for (const actor of actors) {
    const source = actor.topSource || "unknown";
    const key = `${source}::${actor.primarySegment}`;
    const row = map.get(key) || { source, segment: actor.primarySegment, actors: 0, bookIntent: 0, amazonClicks: 0, activations: 0 };
    row.actors += 1;
    row.bookIntent += actor.bookIntent;
    row.amazonClicks += actor.amazonClicks;
    if (actor.stages.has("Activated")) row.activations += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.activations - a.activations || b.actors - a.actors).slice(0, 16);
}

/**
 * @param {{ events?: any[], pageviews?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildAudienceSignalModel(options = {}) {
  const { pageviews = [] } = options;
  const events = normalizeAnalyticsEvents(options.events || []);
  const actorMap = new Map();

  for (const pageview of pageviews) {
    const actor = ensureActor(actorMap, pageview?.visitor_hash || "");
    if (!actor) continue;
    actor.actions += 1;
    actor.pageviews += 1;
    actor.stages.add("Visit");
    const source = sourceFromPageview(pageview);
    bump(actor.sources, source);
    const lang = langFromPath(pageview?.path || "");
    if (lang !== "unknown") actor.languages.add(lang);
    addPathSignals(actor, pageview?.path || "");
  }

  for (const event of events) {
    const actor = ensureActor(actorMap, actorId(event));
    if (!actor) continue;
    const name = event?.event_name || "";
    actor.actions += 1;
    actor.events += 1;
    actor.stages.add(stageLabelForEvent(event));
    const source = eventSource(event);
    bump(actor.sources, source);
    const lang = event?.lang || langFromPath(event?.path || "");
    if (lang !== "unknown") actor.languages.add(lang);
    addPathSignals(actor, event?.path || "");
    setFirstValue(actor, event);

    if (/lead_magnet|newsletter/.test(name)) actor.leads += 1;
    if (name === "register_completed") actor.registrations += 1;
    if (name === "download_completed") {
      actor.downloads += 1;
      addScore(actor, "Parent/Caregiver", 2);
      const day = event?.created_at ? new Date(event.created_at).getUTCDay() : -1;
      if (day >= 1 && day <= 5) actor.weekdayDownloads += 1;
    }
    if (BOOK_EVENTS.has(name)) {
      actor.bookIntent += 1;
      addBookSignals(actor, event);
    }
    if (name === "amazon_click") actor.amazonClicks += 1;
    if (COMMUNITY_EVENTS.has(name)) {
      actor.communityEvents += 1;
      addScore(actor, "Community Creator", 3);
    }
    if (LOTTERY_EVENTS.has(name)) {
      actor.lotteryEvents += 1;
      addScore(actor, "Giveaway Participant", 3);
    }
    if (/peanut|shop_purchase/.test(name)) addScore(actor, "Giveaway Participant", 1);
    if (name === "return_session") actor.returns += 1;
  }

  const actors = [...actorMap.values()].map(finalizeActor);
  const segmentMap = new Map();
  let highConfidenceActors = 0;
  let firstValueActors = 0;
  let returningActors = 0;

  for (const actor of actors) {
    const row = ensureSegment(segmentMap, actor.primarySegment);
    row.actors += 1;
    row.confidence[actor.confidence] += 1;
    for (const stage of actor.stages) row.stages[stage] = (row.stages[stage] || 0) + 1;
    bump(row.firstValues, actor.firstValueAction);
    bump(row.sources, actor.topSource);
    row.bookIntent += actor.bookIntent;
    row.amazonClicks += actor.amazonClicks;
    row.communityEvents += actor.communityEvents;
    row.returnEvents += actor.returns;
    row.totalActions += actor.actions;
    if (actor.confidence === "High") highConfidenceActors += 1;
    if (actor.firstValueAction !== "-") firstValueActors += 1;
    if (actor.returns > 0) returningActors += 1;
  }

  const segmentRows = finalizeSegmentRows(segmentMap);
  const topSegment = segmentRows[0]?.segment || "Unknown";
  return {
    summary: {
      actors: actors.length,
      topSegment,
      highConfidenceActors,
      firstValueActors,
      returningActors,
      bookIntentActors: actors.filter((actor) => actor.bookIntent > 0).length,
      amazonClickActors: actors.filter((actor) => actor.amazonClicks > 0).length,
      sampleWarning: actors.length < 30 ? "Small sample: use directionally only" : "Sample size is large enough for trend review",
    },
    segmentRows,
    sourceRows: buildSourceRows(actors),
    actorRows: actors
      .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.communityEvents - a.communityEvents || b.actions - a.actions)
      .slice(0, 20),
    note: "Audience segments are soft operational hypotheses. This model does not write profile fields, expose labels publicly, or infer sensitive attributes.",
  };
}