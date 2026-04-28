import { classifyAdminSource, eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";
import { normalizeAnalyticsEvents } from "./analytics-event-contract.mjs";

const FIRST_VALUE_EVENTS = new Set(["download_completed", "newsletter_confirmed", "register_completed", "first_peanut_earned", "peanut_earned", "book_page_viewed", "sample_viewed"]);
const LEAD_EVENTS = new Set(["lead_magnet_submitted", "newsletter_submitted", "newsletter_confirmed"]);
const ACTIVATION_EVENTS = new Set(["download_completed", "first_peanut_earned"]);
const COMMUNITY_EVENTS = new Set(["review_submitted", "review_approved", "art_upload_submitted", "art_approved", "reaction_received", "share_completed"]);
const ECONOMY_EVENTS = new Set(["first_peanut_earned", "peanut_earned", "shop_purchase_completed", "ticket_purchased_with_peanuts", "lottery_entered"]);
const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);

const CHANNEL_ROLES = Object.freeze({
  organic: "Evergreen discovery",
  referral: "Qualified borrowed trust",
  social: "Audience testing and family/community reach",
  email: "Owned-audience return loop",
  direct: "Brand memory and loyalty",
  internal: "On-site routing quality",
  unknown: "Unclassified traffic",
});

function ensureChannel(map, label, category = "unknown") {
  const key = label || "unknown";
  if (!map.has(key)) {
    map.set(key, {
      channel: key,
      category,
      role: CHANNEL_ROLES[category] || CHANNEL_ROLES.unknown,
      pageviews: 0,
      visitors: new Set(),
      events: 0,
      firstValue: 0,
      leads: 0,
      registrations: 0,
      activations: 0,
      returns: 0,
      community: 0,
      economy: 0,
      bookIntent: 0,
      amazonClicks: 0,
      landings: new Map(),
      firstValues: new Map(),
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

function channelForEvent(event) {
  const source = sourceForEvent(event);
  if (!source || source === "unknown") return { label: "unknown", category: "unknown" };
  const medium = eventProp(event, "utm_medium");
  const normalized = source.toLowerCase();
  if (!medium) {
    if (/newsletter|email/.test(normalized)) return { label: source, category: "email" };
    if (/facebook|instagram|pinterest|bluesky|bsky|twitter|x\.com|tiktok|reddit/.test(normalized)) return { label: source, category: "social" };
    if (/google|bing|duckduckgo|yahoo|organic|search/.test(normalized)) return { label: source, category: "organic" };
    if (normalized === "direct") return { label: "direct", category: "direct" };
  }
  const classified = classifyAdminSource({ utm_source: source, utm_medium: medium });
  return { label: classified.label || source, category: classified.category || "unknown" };
}

function priorityFor(row) {
  if (row.score >= 25 && row.actionRateValue >= 0.05) return "Invest";
  if (row.score >= 8 || row.actionRateValue >= 0.02) return "Watch";
  return "Hold";
}

function recommendedAction(row) {
  if (row.priority === "Invest") return "Increase measured effort carefully";
  if (row.bookIntent > 0 && row.amazonClicks === 0) return "Improve book path before more traffic";
  if (row.pageviews > 0 && row.firstValue === 0) return "Repair first-value handoff";
  if (row.priority === "Watch") return "Keep testing with one clear hypothesis";
  return "Do not scale yet";
}

function finalizeChannel(row) {
  const uniqueVisitors = row.visitors.size;
  const meaningfulActions = row.firstValue + row.leads + row.registrations + row.activations + row.returns + row.community + row.economy + row.bookIntent + row.amazonClicks;
  const score = (row.activations * 3) + (row.returns * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + (row.community * 2) + row.economy + row.leads + row.registrations;
  const actionRateValue = row.pageviews ? meaningfulActions / row.pageviews : 0;
  const finalized = {
    ...row,
    visitors: undefined,
    landings: undefined,
    firstValues: undefined,
    uniqueVisitors,
    meaningfulActions,
    score,
    actionRateValue,
    actionRate: pct(meaningfulActions, row.pageviews),
    activationRate: pct(row.activations, Math.max(row.pageviews, 1)),
    returnRate: pct(row.returns, Math.max(uniqueVisitors, 1)),
    bookIntentRate: pct(row.bookIntent, Math.max(row.pageviews, 1)),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    topLanding: topEntry(row.landings),
    topFirstValue: topEntry(row.firstValues),
  };
  finalized.priority = priorityFor(finalized);
  finalized.recommendedAction = recommendedAction(finalized);
  return finalized;
}

function sourceFamilyRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.category || "unknown";
    const current = map.get(key) || { category: key, channels: 0, pageviews: 0, meaningfulActions: 0, score: 0, amazonClicks: 0, bookIntent: 0 };
    current.channels += 1;
    current.pageviews += row.pageviews;
    current.meaningfulActions += row.meaningfulActions;
    current.score += row.score;
    current.amazonClicks += row.amazonClicks;
    current.bookIntent += row.bookIntent;
    map.set(key, current);
  }
  return [...map.values()]
    .map((row) => ({ ...row, actionRate: pct(row.meaningfulActions, row.pageviews), amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)), role: CHANNEL_ROLES[row.category] || CHANNEL_ROLES.unknown }))
    .sort((a, b) => b.score - a.score || b.meaningfulActions - a.meaningfulActions || b.pageviews - a.pageviews);
}

/**
 * @param {{ events?: any[], pageviews?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildChannelScorecard(options = {}) {
  const { pageviews = [] } = options;
  const events = normalizeAnalyticsEvents(options.events || []);
  const channels = new Map();

  for (const pageview of pageviews) {
    const classified = classifyAdminSource(pageview);
    const row = ensureChannel(channels, classified.label, classified.category);
    row.pageviews += 1;
    if (pageview?.visitor_hash) row.visitors.add(pageview.visitor_hash);
    bump(row.landings, pageview?.landing_page || pageview?.path || "/");
  }

  for (const event of events) {
    const channel = channelForEvent(event);
    const row = ensureChannel(channels, channel.label, channel.category);
    const name = event?.event_name || "";
    row.events += 1;
    if (FIRST_VALUE_EVENTS.has(name)) {
      row.firstValue += 1;
      bump(row.firstValues, name);
    }
    if (LEAD_EVENTS.has(name)) row.leads += 1;
    if (name === "register_completed") row.registrations += 1;
    if (ACTIVATION_EVENTS.has(name)) row.activations += 1;
    if (name === "return_session") row.returns += 1;
    if (COMMUNITY_EVENTS.has(name)) row.community += 1;
    if (ECONOMY_EVENTS.has(name)) row.economy += 1;
    if (BOOK_EVENTS.has(name)) row.bookIntent += 1;
    if (name === "amazon_click") row.amazonClicks += 1;
    bump(row.landings, eventProp(event, "landing_page") || event?.path || "/");
  }

  const channelRows = [...channels.values()].map(finalizeChannel).sort((a, b) => b.score - a.score || b.meaningfulActions - a.meaningfulActions || b.pageviews - a.pageviews);
  const investRows = channelRows.filter((row) => row.priority === "Invest");
  const watchRows = channelRows.filter((row) => row.priority === "Watch");
  return {
    summary: {
      channels: channelRows.length,
      investChannels: investRows.length,
      watchChannels: watchRows.length,
      totalPageviews: pageviews.length,
      totalMeaningfulActions: channelRows.reduce((sum, row) => sum + row.meaningfulActions, 0),
      totalAmazonClicks: channelRows.reduce((sum, row) => sum + row.amazonClicks, 0),
      topChannel: channelRows[0]?.channel || "-",
      topPriority: channelRows[0]?.priority || "Hold",
    },
    channelRows,
    familyRows: sourceFamilyRows(channelRows),
    note: "Channel priority is directional. It should guide measured experiments, not automatic posting cadence or budget changes.",
  };
}