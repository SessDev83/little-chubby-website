import { classifyGrowthSource } from "./linkable-assets.mjs";
import {
  buildEventContractHealth,
  eventFunnelStage,
  normalizeAnalyticsEvents,
} from "./analytics-event-contract.mjs";

export const ADMIN_KPI_RANGES = Object.freeze({ "24h": 1, "7d": 7, "30d": 30, "90d": 90 });

export const ADMIN_FUNNEL_STAGES = Object.freeze([
  "Visit",
  "Lead",
  "Registered",
  "Activated",
  "Engaged",
  "Community",
  "Book Intent",
  "Amazon Click",
  "Return",
]);

const FUNNEL_STAGE_ALIASES = Object.freeze({
  visit: "Visit",
  page_viewed: "Visit",
  lead: "Lead",
  registered: "Registered",
  register: "Registered",
  activated: "Activated",
  activation: "Activated",
  engaged: "Engaged",
  engagement: "Engaged",
  community: "Community",
  book_intent: "Book Intent",
  book: "Book Intent",
  amazon_click: "Amazon Click",
  amazon: "Amazon Click",
  return: "Return",
  returning: "Return",
});

const PAGEVIEW_LEGACY_TIMEZONE_REGIONS = new Set([
  "Africa",
  "America",
  "Antarctica",
  "Arctic",
  "Asia",
  "Atlantic",
  "Australia",
  "Europe",
  "Indian",
  "Pacific",
]);

const WEEKDAY_LABELS = Object.freeze(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

export function resolveAdminRange(rangeParam = "7d", now = new Date()) {
  const requested = String(rangeParam || "7d").toLowerCase();
  const rangeKey = Object.hasOwn(ADMIN_KPI_RANGES, requested) ? requested : "7d";
  const days = ADMIN_KPI_RANGES[rangeKey];
  const sinceIso = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return {
    rangeKey,
    days,
    sinceIso,
    generatedAtIso: now.toISOString(),
    label: days === 1 ? "24 hours" : `${days} days`,
  };
}

export function pct(value, total) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function eventProp(event, key) {
  const value = event?.props?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function fallbackFunnelStage(eventName) {
  return eventFunnelStage(eventName);
}

export function funnelStageForEvent(event) {
  return eventProp(event, "funnel_stage") || fallbackFunnelStage(event?.event_name);
}

export function sourceForEvent(event) {
  return eventProp(event, "utm_source") || eventProp(event, "source") || "unknown";
}

export function normalizeFunnelStage(value) {
  const text = String(value || "").trim();
  if (!text) return "Other";
  const key = text.toLowerCase().replace(/[\s-]+/g, "_");
  return FUNNEL_STAGE_ALIASES[key] || text;
}

export function stageLabelForEvent(event) {
  return normalizeFunnelStage(funnelStageForEvent(event));
}

export function langFromPath(path) {
  const match = String(path || "").match(/^\/(en|es)(\/|$)/);
  return match?.[1] || "unknown";
}

export function landingPathForEvent(event) {
  return eventProp(event, "landing_page") || event?.path || "/";
}

export function classifyAdminSource(row = {}) {
  const source = classifyGrowthSource(row);
  const detail = source.detail || source.category || "unknown";
  const label = source.category === "direct" ? "direct" : source.category === "internal" ? "internal" : detail;
  return { category: source.category, detail, label };
}

export function shortText(value, max = 46) {
  const text = value || "-";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

export function formatKpiTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function countRows(map, limit = 12) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)))
    .slice(0, limit);
}

function safeText(value, max = 80) {
  const text = String(value || "").trim();
  return text ? text.slice(0, max) : "";
}

export function pageviewGeoLabel(row = {}) {
  const raw = safeText(row.country, 40);
  if (!raw || raw === "??") return { label: "Unknown", quality: "unknown" };
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return { label: upper, quality: "country" };
  if (PAGEVIEW_LEGACY_TIMEZONE_REGIONS.has(raw)) return { label: `${raw} region`, quality: "legacy_timezone" };
  return { label: raw, quality: "coarse" };
}

export function buildPageviewGeoTimeSummary(pageviews = []) {
  const countryMap = new Map();
  const countryQuality = new Map();
  const timezoneMap = new Map();
  const hourMap = new Map();
  const weekdayMap = new Map();

  for (const row of pageviews) {
    const geo = pageviewGeoLabel(row);
    if (geo.label !== "Unknown") {
      countryMap.set(geo.label, (countryMap.get(geo.label) || 0) + 1);
      countryQuality.set(geo.label, geo.quality);
    }

    const timezone = safeText(row?.timezone, 80);
    if (timezone) timezoneMap.set(timezone, (timezoneMap.get(timezone) || 0) + 1);

    const hour = Number(row?.local_hour);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) hourMap.set(hour, (hourMap.get(hour) || 0) + 1);

    const weekday = Number(row?.local_weekday);
    if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);
  }

  const localHourRows = [...hourMap.entries()]
    .map(([hour, count]) => ({ hour, label: `${String(hour).padStart(2, "0")}:00`, count }))
    .sort((a, b) => b.count - a.count || a.hour - b.hour);
  const localWeekdayRows = [...weekdayMap.entries()]
    .map(([weekday, count]) => ({ weekday, label: WEEKDAY_LABELS[weekday] || String(weekday), count }))
    .sort((a, b) => b.count - a.count || a.weekday - b.weekday);
  const topCountries = countRows(countryMap).map((row) => ({ ...row, quality: countryQuality.get(row.label) || "unknown" }));

  return {
    topCountries,
    topTimezones: countRows(timezoneMap, 8),
    localHourRows,
    localWeekdayRows,
    peakLocalHour: localHourRows[0] || null,
    peakLocalWeekday: localWeekdayRows[0] || null,
    legacyCountryRows: topCountries.filter((row) => row.quality === "legacy_timezone"),
  };
}

function isLeadEvent(name) {
  return eventFunnelStage(name) === "lead";
}

function isActivationEvent(name) {
  return eventFunnelStage(name) === "activated";
}

function isBookIntentEvent(name) {
  return eventFunnelStage(name) === "book_intent" || eventFunnelStage(name) === "amazon_click";
}

function ensureQualityBucket(map, key, defaults = {}) {
  const bucketKey = key || "unknown";
  if (!map.has(bucketKey)) {
    map.set(bucketKey, {
      label: bucketKey,
      pageviews: 0,
      visitors: new Set(),
      leads: 0,
      registrations: 0,
      activations: 0,
      bookIntent: 0,
      amazonClicks: 0,
      events: 0,
      ...defaults,
    });
  }
  return map.get(bucketKey);
}

function finalizeQualityRows(map, limit = 12) {
  return [...map.values()]
    .map((row) => {
      const uniqueVisitors = row.visitors instanceof Set ? row.visitors.size : row.uniqueVisitors || 0;
      const meaningfulActions = row.leads + row.registrations + row.activations + row.bookIntent + row.amazonClicks;
      const qualityScore = (row.activations * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + row.leads + row.registrations;
      return {
        ...row,
        visitors: undefined,
        uniqueVisitors,
        meaningfulActions,
        qualityScore,
        actionRate: row.pageviews ? meaningfulActions / row.pageviews : 0,
        activationRate: row.pageviews ? row.activations / row.pageviews : 0,
        amazonRate: row.bookIntent ? row.amazonClicks / row.bookIntent : 0,
      };
    })
    .sort((a, b) => b.qualityScore - a.qualityScore || b.meaningfulActions - a.meaningfulActions || b.pageviews - a.pageviews)
    .slice(0, limit);
}

export function buildAdminKpiSummary({ events: rawEvents = [], pageviews = [], totalEventCount, totalPageviewCount } = {}) {
  const events = normalizeAnalyticsEvents(rawEvents);
  const totalEvents = totalEventCount ?? events.length;
  const totalPageviews = totalPageviewCount ?? pageviews.length;
  const uniqueVisitors = new Set(pageviews.map((row) => row.visitor_hash).filter(Boolean)).size;

  const eventCount = (name) => events.filter((event) => event.event_name === name).length;
  const leadEvents = eventCount("lead_magnet_submitted") + eventCount("newsletter_submitted") + eventCount("newsletter_confirmed");
  const registerSuccess = eventCount("register_completed");
  const downloadSuccess = eventCount("download_completed");
  const downloadBlocked = eventCount("download_blocked");
  const bookViews = eventCount("book_page_viewed");
  const sampleViews = eventCount("sample_viewed");
  const sampleClicks = eventCount("sample_cta_click");
  const amazonClicks = eventCount("amazon_click");
  const shareClicks = eventCount("share_click");
  const shareCredits = eventCount("share_completed");
  const engagedEvents = shareClicks
    + eventCount("lottery_viewed")
    + eventCount("lottery_entered")
    + eventCount("peanut_earned")
    + eventCount("shop_purchase_completed");
  const communityEvents = shareCredits
    + eventCount("review_submitted")
    + eventCount("review_approved")
    + eventCount("art_upload_submitted")
    + eventCount("art_approved")
    + eventCount("reaction_received");
  const returnEvents = eventCount("return_session");
  const bookIntent = bookViews + sampleViews + sampleClicks + amazonClicks;

  const funnelRows = [
    { stage: "Visit", count: totalPageviews, rateFromPrior: "-" },
    { stage: "Lead", count: leadEvents, rateFromPrior: pct(leadEvents, totalPageviews) },
    { stage: "Registered", count: registerSuccess, rateFromPrior: pct(registerSuccess, Math.max(leadEvents, 1)) },
    { stage: "Activated", count: downloadSuccess, rateFromPrior: pct(downloadSuccess, Math.max(registerSuccess || leadEvents, 1)) },
    { stage: "Engaged", count: engagedEvents, rateFromPrior: pct(engagedEvents, Math.max(downloadSuccess, 1)) },
    { stage: "Community", count: communityEvents, rateFromPrior: pct(communityEvents, Math.max(engagedEvents || downloadSuccess, 1)) },
    { stage: "Book Intent", count: bookIntent, rateFromPrior: pct(bookIntent, totalPageviews) },
    { stage: "Amazon Click", count: amazonClicks, rateFromPrior: pct(amazonClicks, Math.max(bookIntent, 1)) },
    { stage: "Return", count: returnEvents, rateFromPrior: pct(returnEvents, Math.max(totalPageviews, 1)) },
  ];

  const stageMap = new Map();
  for (const event of events) {
    const stage = stageLabelForEvent(event);
    stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);
  }
  const stageBreakdown = [...stageMap.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);

  const sourceMap = new Map();
  for (const event of events) {
    const source = sourceForEvent(event);
    const current = sourceMap.get(source) ?? { events: 0, activated: 0, amazon: 0, book: 0 };
    current.events += 1;
    if (event.event_name === "download_completed") current.activated += 1;
    if (event.event_name === "amazon_click") current.amazon += 1;
    if (event.event_name === "book_page_viewed") current.book += 1;
    sourceMap.set(source, current);
  }
  const sourceRows = [...sourceMap.entries()]
    .map(([source, values]) => ({ source, ...values }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 12);

  const bookMap = new Map();
  for (const event of events) {
    const bookId = eventProp(event, "book_id");
    const asin = eventProp(event, "asin");
    if (!bookId && !asin) continue;
    const key = bookId || asin;
    const current = bookMap.get(key) ?? { views: 0, samples: 0, amazon: 0, asins: new Set() };
    if (event.event_name === "book_page_viewed") current.views += 1;
    if (event.event_name === "sample_viewed" || event.event_name === "sample_cta_click") current.samples += 1;
    if (event.event_name === "amazon_click") current.amazon += 1;
    if (asin) current.asins.add(asin);
    bookMap.set(key, current);
  }
  const bookRows = [...bookMap.entries()]
    .map(([book, values]) => ({ book, ...values, asinList: [...values.asins].join(", ") || "-" }))
    .sort((a, b) => (b.amazon + b.views + b.samples) - (a.amazon + a.views + a.samples))
    .slice(0, 10);

  return {
    totalEvents,
    totalPageviews,
    uniqueVisitors,
    leadEvents,
    registerSuccess,
    downloadSuccess,
    downloadBlocked,
    bookViews,
    sampleViews,
    sampleClicks,
    amazonClicks,
    shareClicks,
    shareCredits,
    engagedEvents,
    communityEvents,
    returnEvents,
    bookIntent,
    funnelRows,
    stageBreakdown,
    sourceRows,
    bookRows,
    eventContractHealth: buildEventContractHealth({ events, pageviews }),
  };
}

function incrementBucket(map, key, stage, amount = 1) {
  const bucketKey = key || "unknown";
  const current = map.get(bucketKey) ?? new Map();
  current.set(stage, (current.get(stage) ?? 0) + amount);
  map.set(bucketKey, current);
}

function topFromStageDetails(details, stage, key) {
  const bucket = details.get(stage)?.[key];
  if (!bucket?.size) return "-";
  return [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
}

function rowsFromDimension(map, limit = 10) {
  return [...map.entries()]
    .map(([label, counts]) => {
      const stages = Object.fromEntries(ADMIN_FUNNEL_STAGES.map((stage) => [stage, counts.get(stage) ?? 0]));
      const total = Object.values(stages).reduce((sum, count) => sum + count, 0);
      const deepestStage = [...ADMIN_FUNNEL_STAGES].reverse().find((stage) => stages[stage] > 0) || "Visit";
      return { label, total, stages, deepestStage };
    })
    .sort((a, b) => b.total - a.total || ADMIN_FUNNEL_STAGES.indexOf(b.deepestStage) - ADMIN_FUNNEL_STAGES.indexOf(a.deepestStage))
    .slice(0, limit);
}

/**
 * @param {{ events?: any[], pageviews?: any[], summary?: Record<string, any> }} options
 * @returns {Record<string, any>}
 */
export function buildFunnelCommandCenter(options = {}) {
  const { pageviews = [], summary } = options;
  const events = normalizeAnalyticsEvents(options.events || []);
  const kpis = summary || buildAdminKpiSummary({ events, pageviews });
  const stageCounts = new Map(kpis.funnelRows.map((row) => [row.stage, row.count]));
  const stageDetails = new Map(ADMIN_FUNNEL_STAGES.map((stage) => [stage, { sources: new Map(), languages: new Map(), landingPages: new Map() }]));
  const sourceStageMap = new Map();
  const languageStageMap = new Map();
  const landingStageMap = new Map();

  for (const row of pageviews) {
    const stage = "Visit";
    const source = classifyAdminSource(row).label;
    const language = langFromPath(row.path);
    const landingPage = row.landing_page || row.path || "/";
    const details = stageDetails.get(stage);
    details.sources.set(source, (details.sources.get(source) ?? 0) + 1);
    details.languages.set(language, (details.languages.get(language) ?? 0) + 1);
    details.landingPages.set(landingPage, (details.landingPages.get(landingPage) ?? 0) + 1);
    incrementBucket(sourceStageMap, source, stage);
    incrementBucket(languageStageMap, language, stage);
    incrementBucket(landingStageMap, landingPage, stage);
  }

  for (const event of events) {
    const stage = stageLabelForEvent(event);
    if (!stageDetails.has(stage)) continue;
    const source = sourceForEvent(event);
    const language = event.lang || langFromPath(event.path);
    const landingPage = landingPathForEvent(event);
    const details = stageDetails.get(stage);
    details.sources.set(source, (details.sources.get(source) ?? 0) + 1);
    details.languages.set(language, (details.languages.get(language) ?? 0) + 1);
    details.landingPages.set(landingPage, (details.landingPages.get(landingPage) ?? 0) + 1);
    incrementBucket(sourceStageMap, source, stage);
    incrementBucket(languageStageMap, language, stage);
    incrementBucket(landingStageMap, landingPage, stage);
  }

  const stageRows = ADMIN_FUNNEL_STAGES.map((stage, index) => {
    const count = stageCounts.get(stage) ?? 0;
    const priorStage = ADMIN_FUNNEL_STAGES[index - 1];
    const priorCount = priorStage ? stageCounts.get(priorStage) ?? 0 : 0;
    const conversion = index === 0 ? null : priorCount ? count / priorCount : 0;
    return {
      stage,
      count,
      priorStage: priorStage || null,
      priorCount,
      conversion,
      conversionLabel: index === 0 ? "-" : pct(count, priorCount),
      topSource: topFromStageDetails(stageDetails, stage, "sources"),
      topLang: topFromStageDetails(stageDetails, stage, "languages"),
      topLandingPage: topFromStageDetails(stageDetails, stage, "landingPages"),
    };
  });

  const leakRows = stageRows
    .filter((row) => row.priorStage && row.priorCount > 0)
    .map((row) => ({
      from: row.priorStage,
      to: row.stage,
      fromCount: row.priorCount,
      toCount: row.count,
      lost: Math.max(0, row.priorCount - row.count),
      conversion: row.conversion ?? 0,
      conversionLabel: row.conversionLabel,
    }))
    .filter((row) => row.lost > 0)
    .sort((a, b) => a.conversion - b.conversion || b.lost - a.lost);

  return {
    ...kpis,
    stageRows,
    sourceStageRows: rowsFromDimension(sourceStageMap),
    languageStageRows: rowsFromDimension(languageStageMap, 6),
    landingStageRows: rowsFromDimension(landingStageMap),
    topLeak: leakRows[0] || null,
    leakRows,
  };
}

export async function fetchAdminKpiWindow(serviceClient, { rangeParam = "7d", now = new Date(), untilIso = "", limit = 5000 } = {}) {
  const range = resolveAdminRange(rangeParam, now);
  const baseEventSelect = "event_name,path,visitor_hash,props,lang,created_at";
  const eventSelect = `${baseEventSelect},event_id,occurred_at`;
  const basePageviewSelect = "path,landing_page,visitor_hash,utm_source,utm_medium,referrer,created_at";
  const pageviewSelect = `${basePageviewSelect},utm_campaign,utm_content,country,timezone,local_date,local_hour,local_weekday`;
  const buildEventsQuery = (selectColumns) => {
    let query = serviceClient
      .from("conversion_events")
      .select(selectColumns, { count: "exact" })
      .gte("created_at", range.sinceIso);
    if (untilIso) query = query.lte("created_at", untilIso);
    return query.order("created_at", { ascending: false }).limit(limit);
  };
  const buildPageviewsQuery = (selectColumns) => {
    let query = serviceClient
      .from("pageviews")
      .select(selectColumns, { count: "exact" })
      .gte("created_at", range.sinceIso);
    if (untilIso) query = query.lte("created_at", untilIso);
    return query.order("created_at", { ascending: false }).limit(limit);
  };

  const [
    eventResult,
    pageviewResult,
  ] = await Promise.all([
    buildEventsQuery(eventSelect),
    buildPageviewsQuery(pageviewSelect),
  ]);

  let eventRows = eventResult.data;
  let totalEventCount = eventResult.count;
  if (eventResult.error && /event_id|occurred_at|schema cache|column/i.test(eventResult.error.message || "")) {
    const fallbackResult = await buildEventsQuery(baseEventSelect);
    eventRows = fallbackResult.data;
    totalEventCount = fallbackResult.count;
  }

  let pageviewRows = pageviewResult.data;
  let totalPageviewCount = pageviewResult.count;
  if (pageviewResult.error && /country|timezone|local_date|local_hour|local_weekday|utm_campaign|utm_content|schema cache|column/i.test(pageviewResult.error.message || "")) {
    const fallbackResult = await buildPageviewsQuery(basePageviewSelect);
    pageviewRows = fallbackResult.data;
    totalPageviewCount = fallbackResult.count;
  }

  const events = eventRows ?? [];
  const normalizedEvents = normalizeAnalyticsEvents(events);
  const pageviews = pageviewRows ?? [];
  return {
    ...range,
    events: normalizedEvents,
    pageviews,
    ...buildAdminKpiSummary({ events: normalizedEvents, pageviews, totalEventCount, totalPageviewCount }),
  };
}

/**
 * @param {{ pageviews?: any[], events?: any[] }} options
 * @returns {{ sourceQualityRows: any[], landingQualityRows: any[], utmQualityRows: any[] }}
 */
export function buildTrafficQualitySummary(options = {}) {
  const { pageviews = [] } = options;
  const events = normalizeAnalyticsEvents(options.events || []);
  const sourceMap = new Map();
  const landingMap = new Map();
  const utmMap = new Map();

  for (const row of pageviews) {
    const source = classifyAdminSource(row);
    const sourceBucket = ensureQualityBucket(sourceMap, source.label, { category: source.category });
    sourceBucket.pageviews += 1;
    if (row.visitor_hash) sourceBucket.visitors.add(row.visitor_hash);

    const landing = row.landing_page || row.path || "/";
    const landingBucket = ensureQualityBucket(landingMap, landing);
    landingBucket.pageviews += 1;
    if (row.visitor_hash) landingBucket.visitors.add(row.visitor_hash);

    const utmKey = row.utm_content || (row.utm_source ? `${row.utm_source}/${row.utm_campaign || "-"}` : "");
    if (utmKey) {
      const utmBucket = ensureQualityBucket(utmMap, utmKey, {
        source: row.utm_source || "",
        campaign: row.utm_campaign || "",
      });
      utmBucket.pageviews += 1;
      if (row.visitor_hash) utmBucket.visitors.add(row.visitor_hash);
    }
  }

  for (const event of events) {
    const name = event.event_name || "";
    const source = sourceForEvent(event);
    const landing = landingPathForEvent(event);
    const utmContent = eventProp(event, "utm_content");
    const utmSource = eventProp(event, "utm_source");
    const utmCampaign = eventProp(event, "utm_campaign");
    const buckets = [ensureQualityBucket(sourceMap, source), ensureQualityBucket(landingMap, landing)];
    if (utmContent || utmSource) {
      buckets.push(ensureQualityBucket(utmMap, utmContent || `${utmSource}/${utmCampaign || "-"}`, { source: utmSource, campaign: utmCampaign }));
    }

    for (const bucket of buckets) {
      bucket.events += 1;
      if (isLeadEvent(name)) bucket.leads += 1;
      if (name === "register_completed") bucket.registrations += 1;
      if (isActivationEvent(name)) bucket.activations += 1;
      if (isBookIntentEvent(name)) bucket.bookIntent += 1;
      if (name === "amazon_click") bucket.amazonClicks += 1;
    }
  }

  return {
    sourceQualityRows: finalizeQualityRows(sourceMap, 12),
    landingQualityRows: finalizeQualityRows(landingMap, 12),
    utmQualityRows: finalizeQualityRows(utmMap, 12),
  };
}