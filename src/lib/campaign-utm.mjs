export const DEFAULT_SITE_URL = "https://www.littlechubbypress.com";

const SOURCE_CODES = {
  bluesky: "b",
  facebook: "f",
  instagram: "i",
  pinterest: "p",
  newsletter: "n",
  "instagram-bio": "ib",
  bio: "bio",
};

function rootHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function normalizeUtmValue(value, fallback = "organic") {
  const raw = String(value || "").trim().toLowerCase();
  const ascii = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = ascii
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function buildSocialCampaign(type = "organic") {
  const base = normalizeUtmValue(type, "organic");
  return base.startsWith("sprint-") ? base : `sprint-${base}`;
}

export function formatUtmDate(date = new Date()) {
  return toDate(date).toISOString().slice(0, 10).replace(/-/g, "");
}

export function sourceCode(source = "social") {
  const normalized = normalizeUtmValue(source, "social");
  return SOURCE_CODES[normalized] || normalized.slice(0, 2) || "s";
}

/**
 * @param {{ type?: string, source?: string, lang?: string, creativeId?: string | null, date?: string | number | Date }} [options]
 */
export function buildUtmContent({ type = "organic", source = "social", lang = "en", creativeId, date = new Date() } = {}) {
  const suffix = `${formatUtmDate(date)}-${sourceCode(source)}-${normalizeUtmValue(lang, "xx").slice(0, 5)}`;
  const creative = normalizeUtmValue(creativeId || type, normalizeUtmValue(type, "organic"));
  const maxCreativeLength = Math.max(12, 96 - suffix.length - 1);
  return `${creative.slice(0, maxCreativeLength).replace(/-+$/g, "")}-${suffix}`;
}

export function isOwnedSiteUrl(url, siteUrl = DEFAULT_SITE_URL) {
  try {
    const parsed = new URL(url, siteUrl);
    const site = new URL(siteUrl);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const parsedRoot = rootHost(parsed.hostname);
    const siteRoot = rootHost(site.hostname);
    return parsedRoot === siteRoot || parsedRoot.endsWith(`.${siteRoot}`);
  } catch {
    return false;
  }
}

function defaultMediumForSource(source) {
  const normalized = normalizeUtmValue(source, "social");
  return normalized === "newsletter" || normalized.includes("email") ? "email" : "social";
}

/**
 * @param {string} url
 * @param {{ source?: string, medium?: string, campaign?: string, content?: string | null, siteUrl?: string }} [options]
 */
export function buildUtmUrl(url, { source = "social", medium, campaign = "organic", content, siteUrl = DEFAULT_SITE_URL } = {}) {
  const wasRelative = !/^[a-z][a-z0-9+.-]*:/i.test(String(url || ""));
  let parsed;
  try {
    parsed = new URL(url, siteUrl);
  } catch {
    return url;
  }

  if (!isOwnedSiteUrl(parsed.toString(), siteUrl)) return url;

  const normalizedSource = normalizeUtmValue(source, "social");
  parsed.searchParams.set("utm_source", normalizedSource);
  parsed.searchParams.set("utm_medium", normalizeUtmValue(medium || defaultMediumForSource(normalizedSource), "social"));
  parsed.searchParams.set("utm_campaign", normalizeUtmValue(campaign, "organic"));
  if (content) {
    const normalizedContent = normalizeUtmValue(content, "");
    if (normalizedContent) parsed.searchParams.set("utm_content", normalizedContent);
  }

  return wasRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
}

export function inspectCampaignUtm(url, { requireContent = true, siteUrl = DEFAULT_SITE_URL } = {}) {
  if (!isOwnedSiteUrl(url, siteUrl)) return { owned: false, ok: true, missing: [], invalid: [] };
  const parsed = new URL(url, siteUrl);
  const required = ["utm_source", "utm_medium", "utm_campaign"];
  if (requireContent) required.push("utm_content");

  const missing = required.filter((key) => !parsed.searchParams.get(key));
  const invalid = [];
  for (const key of required) {
    const value = parsed.searchParams.get(key);
    if (value && value !== normalizeUtmValue(value, "")) invalid.push(key);
  }

  return {
    owned: true,
    ok: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}