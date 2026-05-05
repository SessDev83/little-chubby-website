import { normalizeAnalyticsEvents } from "./analytics-event-contract.mjs";

const PLATFORM_LABELS = Object.freeze({
  bluesky: "Bluesky",
  facebook: "Facebook",
  instagram: "Instagram",
  "instagram-bio": "Instagram bio",
  whatsapp: "WhatsApp",
  pinterest: "Pinterest",
  "copy-link": "Copy link",
});

function eventProp(event, key) {
  const value = event?.props?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function normalizeSocialPlatform(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (/^(bsky|bluesky)$/.test(raw) || raw.includes("bsky")) return "bluesky";
  if (/^(fb|facebook)$/.test(raw) || raw.includes("facebook") || raw === "l.facebook.com" || raw === "lm.facebook.com") return "facebook";
  if (/^(ig|instagram)$/.test(raw) || raw.includes("instagram")) return raw.includes("bio") ? "instagram-bio" : "instagram";
  if (/^(wa|whatsapp)$/.test(raw) || raw.includes("whatsapp") || raw.includes("wa.me")) return "whatsapp";
  if (raw.includes("pinterest")) return "pinterest";
  if (raw === "copy" || raw === "copy-link") return "copy-link";
  return "";
}

function referrerHost(referrer) {
  if (!referrer) return "";
  try {
    const parsed = new URL(String(referrer).includes("://") ? String(referrer) : `https://${referrer}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function ensurePlatform(map, platform) {
  const key = platform || "unknown";
  if (!map.has(key)) {
    map.set(key, {
      platform: key,
      label: PLATFORM_LABELS[key] || key,
      shareClicks: 0,
      shareClaims: 0,
      utmPageviews: 0,
      referrerPageviews: 0,
      totalInbound: 0,
      landings: new Map(),
    });
  }
  return map.get(key);
}

function bumpLanding(row, landing) {
  const key = landing || "/";
  row.landings.set(key, (row.landings.get(key) || 0) + 1);
}

function topLanding(row) {
  return [...row.landings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "-";
}

function pct(value, total) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * @param {{ pageviews?: any[], events?: any[], shares?: any[] }} [options]
 */
export function buildSocialAttributionSummary({ pageviews = [], events = [], shares = [] } = {}) {
  const normalizedEvents = normalizeAnalyticsEvents(events);
  const useShareRowsForClaims = Array.isArray(shares) && shares.length > 0;
  const platforms = new Map();
  let directOrUnknownPageviews = 0;
  let internalPageviews = 0;

  for (const event of normalizedEvents) {
    const name = event?.event_name || "";
    if (name !== "share_click" && name !== "share_completed") continue;
    const platform = normalizeSocialPlatform(eventProp(event, "platform") || eventProp(event, "share_platform"));
    if (!platform) continue;
    const row = ensurePlatform(platforms, platform);
    if (name === "share_click") row.shareClicks += 1;
    if (name === "share_completed" && !useShareRowsForClaims) row.shareClaims += 1;
  }

  for (const share of shares) {
    const platform = normalizeSocialPlatform(share?.platform);
    if (!platform) continue;
    ensurePlatform(platforms, platform).shareClaims += 1;
  }

  for (const pageview of pageviews) {
    const utmPlatform = normalizeSocialPlatform(pageview?.utm_source);
    if (utmPlatform) {
      const row = ensurePlatform(platforms, utmPlatform);
      row.utmPageviews += 1;
      row.totalInbound += 1;
      bumpLanding(row, pageview?.landing_page || pageview?.path || "/");
      continue;
    }

    const host = referrerHost(pageview?.referrer);
    const refPlatform = normalizeSocialPlatform(host);
    if (refPlatform) {
      const row = ensurePlatform(platforms, refPlatform);
      row.referrerPageviews += 1;
      row.totalInbound += 1;
      bumpLanding(row, pageview?.landing_page || pageview?.path || "/");
      continue;
    }

    if (!host) directOrUnknownPageviews += 1;
    else if (/littlechubbypress\.com|localhost|127\.0\.0\.1|vercel/i.test(host)) internalPageviews += 1;
  }

  const platformRows = [...platforms.values()]
    .map((row) => ({
      ...row,
      landings: undefined,
      topLanding: topLanding(row),
      inboundPerClaim: row.shareClaims ? (row.totalInbound / row.shareClaims).toFixed(2) : "-",
      trackedShareRate: pct(row.utmPageviews, Math.max(row.totalInbound, 1)),
    }))
    .sort((a, b) => b.totalInbound - a.totalInbound || b.shareClicks - a.shareClicks || a.label.localeCompare(b.label));

  const totals = {
    shareClicks: platformRows.reduce((sum, row) => sum + row.shareClicks, 0),
    shareClaims: platformRows.reduce((sum, row) => sum + row.shareClaims, 0),
    utmPageviews: platformRows.reduce((sum, row) => sum + row.utmPageviews, 0),
    referrerPageviews: platformRows.reduce((sum, row) => sum + row.referrerPageviews, 0),
    totalInbound: platformRows.reduce((sum, row) => sum + row.totalInbound, 0),
    directOrUnknownPageviews,
    internalPageviews,
  };

  const phaseRows = [
    { phase: "1. Share intent", count: totals.shareClicks, detail: "Clicks on in-app share buttons" },
    { phase: "2. Share claimed", count: totals.shareClaims, detail: "Peanut-eligible share confirmations" },
    { phase: "3. Confirmed return", count: totals.utmPageviews, detail: "Inbound pageviews with social UTMs" },
    { phase: "4. Referrer-only return", count: totals.referrerPageviews, detail: "Inbound social referrer without UTMs" },
    { phase: "5. Still unassigned", count: totals.directOrUnknownPageviews, detail: "No UTM and no referrer in this window" },
  ];

  return { totals, phaseRows, platformRows };
}