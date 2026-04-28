import { LINKABLE_ASSETS } from "../data/linkable-assets.mjs";

const SEARCH_HOSTS = /google|bing|duckduckgo|yahoo|yandex|ecosia|brave/i;
const SOCIAL_HOSTS = /bsky|bluesky|facebook|fb\.|instagram|pinterest|t\.co|twitter|x\.com|reddit|tiktok|youtube|youtu\.be|linkedin/i;
const EMAIL_HOSTS = /mail|gmail|outlook|yahoo\.com|resend/i;

function normalizePath(value) {
  if (!value) return "/";
  try {
    const parsed = new URL(String(value), "https://www.littlechubbypress.com");
    return parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  } catch {
    const path = String(value).split("?")[0] || "/";
    return path.endsWith("/") ? path : `${path}/`;
  }
}

function referrerHost(referrer) {
  if (!referrer) return "";
  const value = String(referrer).trim();
  if (!value) return "";
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isHostOrSubdomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function classifyGrowthSource(row = {}) {
  const utmMedium = String(row.utm_medium || "").toLowerCase();
  const utmSource = String(row.utm_source || "").toLowerCase();
  if (utmMedium === "organic") return { category: "organic", detail: utmSource || "utm" };
  if (utmMedium === "referral") return { category: "referral", detail: utmSource || "utm" };
  if (utmMedium === "email" || utmSource === "newsletter") return { category: "email", detail: utmSource || "newsletter" };
  if (utmMedium === "social") return { category: "social", detail: utmSource || "social" };

  const host = referrerHost(row.referrer);
  if (!host) return { category: "direct", detail: "(none)" };
  if (
    isHostOrSubdomain(host, "littlechubbypress.com") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "vercel.com" ||
    host.endsWith(".vercel.app")
  ) return { category: "internal", detail: host };
  if (SEARCH_HOSTS.test(host)) return { category: "organic", detail: host };
  if (SOCIAL_HOSTS.test(host)) return { category: "social", detail: host };
  if (EMAIL_HOSTS.test(host)) return { category: "email", detail: host };
  return { category: "referral", detail: host };
}

export function findLinkableAsset(path, assets = LINKABLE_ASSETS) {
  const normalized = normalizePath(path);
  return assets.find((asset) => asset.routes.some((route) => normalized.startsWith(normalizePath(route)))) || null;
}

function eventLandingPath(event) {
  const props = event?.props || {};
  return props.landing_page || event?.path || "";
}

export function summarizeLinkableAssetPerformance(pageviews = [], events = [], assets = LINKABLE_ASSETS) {
  const summaries = assets.map((asset) => ({
    ...asset,
    pageviews: 0,
    uniqueVisitors: new Set(),
    organicPageviews: 0,
    referralPageviews: 0,
    socialPageviews: 0,
    directPageviews: 0,
    internalPageviews: 0,
    actionEvents: 0,
    downloads: 0,
    leads: 0,
    bookIntent: 0,
    amazonClicks: 0,
    referralHosts: new Map(),
  }));
  const byId = new Map(summaries.map((asset) => [asset.id, asset]));

  for (const row of pageviews) {
    const asset = findLinkableAsset(row.path, assets);
    if (!asset) continue;
    const summary = byId.get(asset.id);
    const source = classifyGrowthSource(row);
    summary.pageviews += 1;
    if (row.visitor_hash) summary.uniqueVisitors.add(row.visitor_hash);
    if (source.category === "organic") summary.organicPageviews += 1;
    if (source.category === "referral") summary.referralPageviews += 1;
    if (source.category === "social") summary.socialPageviews += 1;
    if (source.category === "direct") summary.directPageviews += 1;
    if (source.category === "internal") summary.internalPageviews += 1;
    if (source.category === "organic" || source.category === "referral") {
      const key = source.detail || "unknown";
      summary.referralHosts.set(key, (summary.referralHosts.get(key) || 0) + 1);
    }
  }

  for (const event of events) {
    const asset = findLinkableAsset(eventLandingPath(event), assets);
    if (!asset) continue;
    const summary = byId.get(asset.id);
    const name = event.event_name || "";
    const isDownload = name === "download_success" || name === "download_completed";
    const isLead = /lead_magnet|newsletter|register_submit_success|register_completed/.test(name);
    const isBookIntent = /book_page|sample/.test(name);
    const isAmazonClick = name === "amazon_click";
    if (asset.primaryActions.includes(name) || isDownload || isLead || isBookIntent || isAmazonClick) summary.actionEvents += 1;
    if (isDownload) summary.downloads += 1;
    if (isLead) summary.leads += 1;
    if (isBookIntent) summary.bookIntent += 1;
    if (isAmazonClick) summary.amazonClicks += 1;
  }

  return summaries
    .map((summary) => {
      const qualifiedPageviews = summary.organicPageviews + summary.referralPageviews;
      return {
        ...summary,
        uniqueVisitors: summary.uniqueVisitors.size,
        qualifiedPageviews,
        qualifiedShare: summary.pageviews ? qualifiedPageviews / summary.pageviews : 0,
        actionRate: summary.pageviews ? summary.actionEvents / summary.pageviews : 0,
        referralHosts: [...summary.referralHosts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([host, count]) => ({ host, count })),
      };
    })
    .sort((a, b) => b.qualifiedPageviews - a.qualifiedPageviews || b.actionEvents - a.actionEvents || b.pageviews - a.pageviews);
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}