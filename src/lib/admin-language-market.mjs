import { eventProp, langFromPath, pct } from "./admin-kpis.mjs";

const FIRST_VALUE_EVENTS = new Set(["download_success", "newsletter_confirmed", "register_submit_success", "first_peanut_earned", "peanut_earned", "book_page_viewed", "sample_viewed"]);
const LEAD_EVENTS = new Set(["lead_magnet_submit_success", "newsletter_inline_submit_success", "newsletter_confirmed"]);
const ACTIVATION_EVENTS = new Set(["download_success", "first_peanut_earned"]);
const COMMUNITY_EVENTS = new Set(["review_submitted", "review_approved", "art_upload_submitted", "art_approved", "reaction_received", "share_credit_success"]);
const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);

function normalizeLang(value) {
  const lang = String(value || "").toLowerCase();
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("es")) return "es";
  return "unknown";
}

function pageviewLang(row) {
  return normalizeLang(langFromPath(row?.path || ""));
}

function eventLang(event) {
  return normalizeLang(event?.lang || langFromPath(event?.path || "") || eventProp(event, "lang"));
}

function ensureLang(map, lang) {
  const key = normalizeLang(lang);
  if (!map.has(key)) {
    map.set(key, {
      lang: key,
      pageviews: 0,
      visitors: new Set(),
      events: 0,
      firstValue: 0,
      leads: 0,
      registrations: 0,
      activations: 0,
      returns: 0,
      community: 0,
      bookIntent: 0,
      amazonClicks: 0,
      confirmedSubscribers: 0,
      pendingSubscribers: 0,
      registeredProfiles: 0,
      landings: new Map(),
    });
  }
  return map.get(key);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "-";
}

function postureFor(row) {
  if (row.score >= 30 && row.activationRateValue >= 0.03 && row.confirmedSubscribers > 0) return "Core";
  if (row.score >= 12 || row.activationRateValue >= 0.02 || row.bookIntent > 0) return "Growth";
  if (row.pageviews > 0 || row.events > 0) return "Watch";
  return "Hold";
}

function recommendedAction(row) {
  if (row.lang === "unknown") return "Improve language attribution before decisions";
  if (row.posture === "Core") return "Keep parity and compare weekly quality";
  if (row.posture === "Growth") return "Run one language-specific hypothesis";
  if (row.posture === "Watch") return "Collect more activation and return data";
  return "Do not expand language scope";
}

function finalizeRow(row) {
  const uniqueVisitors = row.visitors.size;
  const meaningfulActions = row.firstValue + row.leads + row.registrations + row.activations + row.returns + row.community + row.bookIntent + row.amazonClicks;
  const score = (row.activations * 3) + (row.returns * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + (row.community * 2) + row.leads + row.registrations + row.confirmedSubscribers;
  const activationRateValue = row.pageviews ? row.activations / row.pageviews : 0;
  const finalized = {
    ...row,
    visitors: undefined,
    landings: undefined,
    uniqueVisitors,
    meaningfulActions,
    score,
    activationRateValue,
    actionRate: pct(meaningfulActions, row.pageviews),
    activationRate: pct(row.activations, Math.max(row.pageviews, 1)),
    returnRate: pct(row.returns, Math.max(uniqueVisitors, 1)),
    confirmRate: pct(row.confirmedSubscribers, row.confirmedSubscribers + row.pendingSubscribers),
    bookIntentRate: pct(row.bookIntent, Math.max(row.pageviews, 1)),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    topLanding: topEntry(row.landings),
  };
  finalized.posture = postureFor(finalized);
  finalized.recommendedAction = recommendedAction(finalized);
  return finalized;
}

/**
 * @param {{ events?: any[], pageviews?: any[], subscribers?: any[], profiles?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildLanguageMarketReport(options = {}) {
  const { events = [], pageviews = [], subscribers = [], profiles = [] } = options;
  const map = new Map();
  ensureLang(map, "en");
  ensureLang(map, "es");

  for (const pageview of pageviews) {
    const row = ensureLang(map, pageviewLang(pageview));
    row.pageviews += 1;
    if (pageview?.visitor_hash) row.visitors.add(pageview.visitor_hash);
    bump(row.landings, pageview?.landing_page || pageview?.path || "/");
  }

  for (const event of events) {
    const row = ensureLang(map, eventLang(event));
    const name = event?.event_name || "";
    row.events += 1;
    if (FIRST_VALUE_EVENTS.has(name)) row.firstValue += 1;
    if (LEAD_EVENTS.has(name)) row.leads += 1;
    if (name === "register_submit_success") row.registrations += 1;
    if (ACTIVATION_EVENTS.has(name)) row.activations += 1;
    if (name === "return_session") row.returns += 1;
    if (COMMUNITY_EVENTS.has(name)) row.community += 1;
    if (BOOK_EVENTS.has(name)) row.bookIntent += 1;
    if (name === "amazon_click") row.amazonClicks += 1;
    bump(row.landings, eventProp(event, "landing_page") || event?.path || "/");
  }

  for (const subscriber of subscribers) {
    const row = ensureLang(map, normalizeLang(subscriber?.lang_pref));
    if (subscriber?.confirmed === true) row.confirmedSubscribers += 1;
    else row.pendingSubscribers += 1;
  }

  for (const profile of profiles) {
    const row = ensureLang(map, normalizeLang(profile?.lang_pref));
    row.registeredProfiles += 1;
  }

  const languageRows = [...map.values()].map(finalizeRow).sort((a, b) => b.score - a.score || b.meaningfulActions - a.meaningfulActions || b.pageviews - a.pageviews);
  const coreRows = languageRows.filter((row) => row.posture === "Core");
  const growthRows = languageRows.filter((row) => row.posture === "Growth");
  return {
    summary: {
      languages: languageRows.length,
      coreLanguages: coreRows.length,
      growthLanguages: growthRows.length,
      topLanguage: languageRows[0]?.lang || "-",
      topPosture: languageRows[0]?.posture || "Hold",
      totalPageviews: pageviews.length,
      totalActions: languageRows.reduce((sum, row) => sum + row.meaningfulActions, 0),
      totalAmazonClicks: languageRows.reduce((sum, row) => sum + row.amazonClicks, 0),
    },
    languageRows,
    futureLanguageRows: [
      { lang: "pt-br", status: "Blocked", reason: "No dedicated demand, activation, retention, or KDP fit signal in this report" },
      { lang: "fr", status: "Blocked", reason: "No dedicated demand, activation, retention, or KDP fit signal in this report" },
      { lang: "it", status: "Blocked", reason: "No dedicated demand, activation, retention, or KDP fit signal in this report" },
    ],
    note: "Language market reporting compares EN/ES quality only. It does not add languages, generate translations, or change content parity rules.",
  };
}