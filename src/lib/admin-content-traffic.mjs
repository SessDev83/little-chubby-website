import { normalizeAnalyticsEvents } from "./analytics-event-contract.mjs";
import { classifyGrowthSource } from "./linkable-assets.mjs";

export const CONTENT_CATEGORY_LABELS = Object.freeze({
  article: "Articles",
  "fun-fact": "Fun facts",
  joke: "Jokes",
});

const ACTION_EVENT_NAMES = new Set([
  "newsletter_confirmed",
  "newsletter_submitted",
  "lead_magnet_submitted",
  "register_completed",
  "download_completed",
  "book_page_viewed",
  "sample_viewed",
  "sample_cta_click",
  "amazon_click",
]);

function normalizePath(value) {
  if (!value) return "/";
  try {
    const parsed = new URL(String(value), "https://www.littlechubbypress.com");
    return parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    const path = String(value).split("?")[0].split("#")[0] || "/";
    return path.endsWith("/") ? path : `${path}/`;
  }
}

function ensureBucket(map, key, seed = {}) {
  const normalizedKey = key || "unknown";
  if (!map.has(normalizedKey)) map.set(normalizedKey, { key: normalizedKey, ...seed });
  return map.get(normalizedKey);
}

function createContentStats(item) {
  return {
    item,
    pageviews: 0,
    organicPageviews: 0,
    referralPageviews: 0,
    socialPageviews: 0,
    emailPageviews: 0,
    directPageviews: 0,
    internalPageviews: 0,
    stalePathPageviews: 0,
    uniqueVisitors: new Set(),
    sources: new Map(),
    events: 0,
    leads: 0,
    registrations: 0,
    downloads: 0,
    bookIntent: 0,
    amazonClicks: 0,
    lastSeenAt: "",
  };
}

function eventMetricName(eventName) {
  if (/newsletter|lead_magnet/.test(eventName)) return "leads";
  if (eventName === "register_completed") return "registrations";
  if (eventName === "download_completed") return "downloads";
  if (/book_page|sample/.test(eventName)) return "bookIntent";
  if (eventName === "amazon_click") return "amazonClicks";
  return "events";
}

function buildIndexes(contentItems) {
  const statsById = new Map();
  const pathIndex = new Map();
  const slugIndex = new Map();

  for (const item of contentItems) {
    const stats = createContentStats(item);
    statsById.set(item.id, stats);
    pathIndex.set(normalizePath(item.path), { stats, stale: false });
    for (const alias of item.aliases || []) {
      pathIndex.set(normalizePath(alias), { stats, stale: true });
    }
    if (item.slug) slugIndex.set(item.slug, stats);
    if (item.postId) slugIndex.set(item.postId, stats);
  }

  return { statsById, pathIndex, slugIndex };
}

function matchEventToStats(event, pathIndex, slugIndex) {
  const candidatePaths = [event.path, event.props?.landing_page]
    .map((value) => normalizePath(value))
    .filter(Boolean);
  for (const path of [...new Set(candidatePaths)]) {
    const hit = pathIndex.get(path);
    if (hit) return hit.stats;
  }

  const contentId = event.props?.content_id || event.props?.post_id || "";
  return contentId ? slugIndex.get(contentId) || null : null;
}

function finalizedRow(stats) {
  const totalActions = stats.leads + stats.registrations + stats.downloads + stats.bookIntent + stats.amazonClicks;
  const qualifiedPageviews = stats.organicPageviews + stats.referralPageviews;
  const topSource = [...stats.sources.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "-";
  const growthScore =
    stats.organicPageviews * 2 +
    stats.referralPageviews * 1.25 +
    stats.socialPageviews * 0.5 +
    stats.emailPageviews * 0.75 +
    totalActions * 3 +
    stats.amazonClicks * 2 -
    stats.stalePathPageviews;

  return {
    ...stats,
    uniqueVisitors: stats.uniqueVisitors.size,
    totalActions,
    qualifiedPageviews,
    topSource,
    growthScore: Number(growthScore.toFixed(2)),
    organicShare: stats.pageviews ? stats.organicPageviews / stats.pageviews : 0,
    actionRate: stats.pageviews ? totalActions / stats.pageviews : 0,
  };
}

function rollupBy(rows, keyFn, seedFn = (key) => ({ key })) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const bucket = ensureBucket(map, key, {
      ...seedFn(key, row),
      contentCount: 0,
      pageviews: 0,
      organicPageviews: 0,
      referralPageviews: 0,
      totalActions: 0,
      amazonClicks: 0,
      growthScore: 0,
    });
    bucket.contentCount += 1;
    bucket.pageviews += row.pageviews;
    bucket.organicPageviews += row.organicPageviews;
    bucket.referralPageviews += row.referralPageviews;
    bucket.totalActions += row.totalActions;
    bucket.amazonClicks += row.amazonClicks;
    bucket.growthScore += row.growthScore;
  }
  return [...map.values()].sort((left, right) => right.organicPageviews - left.organicPageviews || right.growthScore - left.growthScore);
}

/**
 * @param {{ contentItems?: any[], pageviews?: any[], events?: any[] }} options
 */
export function buildContentTrafficReport({ contentItems = [], pageviews = [], events = [] } = {}) {
  const { statsById, pathIndex, slugIndex } = buildIndexes(contentItems);

  for (const pageview of pageviews) {
    const hit = pathIndex.get(normalizePath(pageview.path));
    if (!hit) continue;
    const stats = hit.stats;
    stats.pageviews += 1;
    if (pageview.visitor_hash) stats.uniqueVisitors.add(pageview.visitor_hash);
    if (hit.stale) stats.stalePathPageviews += 1;
    if (!stats.lastSeenAt || (pageview.created_at && pageview.created_at > stats.lastSeenAt)) stats.lastSeenAt = pageview.created_at;

    const source = classifyGrowthSource(pageview);
    const sourceLabel = source.category === "direct" ? "direct" : source.detail || source.category;
    stats.sources.set(sourceLabel, (stats.sources.get(sourceLabel) || 0) + 1);

    if (source.category === "organic") stats.organicPageviews += 1;
    else if (source.category === "referral") stats.referralPageviews += 1;
    else if (source.category === "social") stats.socialPageviews += 1;
    else if (source.category === "email") stats.emailPageviews += 1;
    else if (source.category === "internal") stats.internalPageviews += 1;
    else stats.directPageviews += 1;
  }

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = event.event_name || "";
    if (!ACTION_EVENT_NAMES.has(eventName) && !/newsletter|lead_magnet|book_page|sample/.test(eventName)) continue;
    const stats = matchEventToStats(event, pathIndex, slugIndex);
    if (!stats) continue;
    stats.events += 1;
    const metricName = eventMetricName(eventName);
    if (metricName !== "events") stats[metricName] += 1;
  }

  const rows = [...statsById.values()]
    .map(finalizedRow)
    .sort((left, right) =>
      right.organicPageviews - left.organicPageviews ||
      right.qualifiedPageviews - left.qualifiedPageviews ||
      right.growthScore - left.growthScore ||
      right.pageviews - left.pageviews ||
      right.item.date.localeCompare(left.item.date)
    );

  const activeRows = rows.filter((row) => row.pageviews > 0 || row.totalActions > 0);
  const totalOrganicPageviews = rows.reduce((sum, row) => sum + row.organicPageviews, 0);
  const totalQualifiedPageviews = rows.reduce((sum, row) => sum + row.qualifiedPageviews, 0);
  const totalContentPageviews = rows.reduce((sum, row) => sum + row.pageviews, 0);
  const totalActions = rows.reduce((sum, row) => sum + row.totalActions, 0);

  return {
    rows,
    activeRows,
    typeRows: rollupBy(rows, (row) => row.item.category, (key) => ({ label: CONTENT_CATEGORY_LABELS[key] || key })),
    languageRows: rollupBy(rows, (row) => row.item.lang, (key) => ({ label: key.toUpperCase() })),
    clusterRows: rollupBy(
      rows.filter((row) => row.item.category === "article"),
      (row) => row.item.seoCluster || "unclustered",
      (key) => ({ label: key })
    ).slice(0, 8),
    summary: {
      contentCount: rows.length,
      activeContentCount: activeRows.length,
      totalOrganicPageviews,
      totalQualifiedPageviews,
      totalContentPageviews,
      totalActions,
      topOrganic: rows.find((row) => row.organicPageviews > 0) || null,
    },
  };
}