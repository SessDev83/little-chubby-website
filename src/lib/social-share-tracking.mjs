import {
  DEFAULT_SITE_URL,
  buildSocialCampaign,
  buildUtmContent,
  buildUtmUrl,
  isOwnedSiteUrl,
  normalizeUtmValue,
} from "./campaign-utm.mjs";

export const USER_SHARE_CAMPAIGN = buildSocialCampaign("user-share");

const PLATFORM_ALIASES = Object.freeze({
  bsky: "bluesky",
  bluesky: "bluesky",
  bs: "bluesky",
  fb: "facebook",
  facebook: "facebook",
  wa: "whatsapp",
  whatsapp: "whatsapp",
  copy: "copy-link",
  "copy-link": "copy-link",
  instagram: "instagram",
  ig: "instagram",
  "instagram-bio": "instagram-bio",
  pinterest: "pinterest",
});

const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "igshid",
  "mc_cid",
  "mc_eid",
]);

export function normalizeSharePlatform(platform = "social") {
  const normalized = normalizeUtmValue(platform, "social");
  return PLATFORM_ALIASES[normalized] || normalized;
}

export function buildShareUtmContent({ platform = "social", lang = "en", contentType = "share", contentId, title, date } = {}) {
  const source = normalizeSharePlatform(platform);
  const creativeId = [contentType, contentId || title || "item"].filter(Boolean).join("-");
  return buildUtmContent({
    type: "user-share",
    source,
    lang,
    creativeId,
    date,
  });
}

/**
 * @param {string} url
 * @param {{ platform?: string, lang?: string, contentType?: string, contentId?: string | null, title?: string | null, siteUrl?: string }} [options]
 */
export function buildTrackedShareUrl(url, { platform = "social", lang = "en", contentType = "share", contentId, title, siteUrl = DEFAULT_SITE_URL } = {}) {
  const source = normalizeSharePlatform(platform);
  const content = buildShareUtmContent({ platform: source, lang, contentType, contentId, title });
  return buildUtmUrl(url, {
    source,
    medium: "social",
    campaign: USER_SHARE_CAMPAIGN,
    content,
    siteUrl,
  });
}

function isTrackingQueryParam(key) {
  const normalized = String(key || "").toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_QUERY_PARAMS.has(normalized);
}

function normalizeSharePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  if (pathname.endsWith("/")) return pathname;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return pathname;
  return `${pathname}/`;
}

export function canonicalSharedUrl(value, { siteUrl = DEFAULT_SITE_URL } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let parsed;
  try {
    parsed = new URL(raw, siteUrl);
  } catch {
    return raw.slice(0, 2000);
  }

  if (!isOwnedSiteUrl(parsed.toString(), siteUrl)) return raw.slice(0, 2000);

  const site = new URL(siteUrl);
  parsed.protocol = site.protocol;
  parsed.hostname = site.hostname;
  parsed.port = site.port;
  parsed.pathname = normalizeSharePathname(parsed.pathname);
  parsed.hash = "";

  for (const key of [...parsed.searchParams.keys()]) {
    if (isTrackingQueryParam(key)) parsed.searchParams.delete(key);
  }

  return parsed.toString();
}

export function sharedUrlHadTracking(value, { siteUrl = DEFAULT_SITE_URL } = {}) {
  try {
    const parsed = new URL(String(value || ""), siteUrl);
    return [...parsed.searchParams.keys()].some(isTrackingQueryParam);
  } catch {
    return false;
  }
}