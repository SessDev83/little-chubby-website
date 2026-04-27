import { classifyAdminSource, eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";

const FIRST_VALUE_EVENTS = new Set(["download_success", "newsletter_confirmed", "register_submit_success", "first_peanut_earned", "peanut_earned", "book_page_viewed", "sample_viewed"]);
const LEAD_EVENTS = new Set(["lead_magnet_submit_success", "newsletter_inline_submit_success", "newsletter_confirmed"]);
const ACTIVATION_EVENTS = new Set(["download_success", "first_peanut_earned"]);
const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalize(value) {
  return String(value || "unknown").trim().toLowerCase() || "unknown";
}

function inferContentType(...values) {
  const text = values.map((value) => String(value || "").toLowerCase()).join(" ");
  if (/book|amazon|kdp/.test(text)) return "book_promo";
  if (/coloring|download|free|printable|resource/.test(text)) return "free_resource";
  if (/parent|caregiver|family|routine|tip/.test(text)) return "parenting_tip";
  if (/review|community|gallery|art|share/.test(text)) return "community_proof";
  if (/giveaway|lottery|ticket/.test(text)) return "giveaway";
  if (/blog|story|behind/.test(text)) return "editorial";
  return "unknown";
}

function ensurePlatform(map, platform) {
  const key = normalize(platform);
  if (!map.has(key)) {
    map.set(key, {
      platform: key,
      posts: 0,
      reach: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      pageviews: 0,
      visitors: new Set(),
      events: 0,
      firstValue: 0,
      leads: 0,
      activations: 0,
      returns: 0,
      bookIntent: 0,
      amazonClicks: 0,
      contentTypes: new Map(),
      campaigns: new Map(),
      creatives: new Map(),
    });
  }
  return map.get(key);
}

function ensureContent(map, contentType) {
  const key = normalize(contentType);
  if (!map.has(key)) {
    map.set(key, {
      contentType: key,
      posts: 0,
      reach: 0,
      clicks: 0,
      engagement: 0,
      pageviews: 0,
      events: 0,
      firstValue: 0,
      leads: 0,
      activations: 0,
      returns: 0,
      bookIntent: 0,
      amazonClicks: 0,
      platforms: new Map(),
    });
  }
  return map.get(key);
}

function ensureCreative(map, source, campaign, content) {
  const key = `${normalize(source)}|${normalize(campaign)}|${normalize(content)}`;
  if (!map.has(key)) {
    map.set(key, {
      key,
      source: normalize(source),
      campaign: campaign || "-",
      content: content || "-",
      contentType: inferContentType(campaign, content),
      pageviews: 0,
      visitors: new Set(),
      events: 0,
      firstValue: 0,
      leads: 0,
      activations: 0,
      returns: 0,
      bookIntent: 0,
      amazonClicks: 0,
    });
  }
  return map.get(key);
}

function bump(map, key, amount = 1) {
  const label = normalize(key);
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || "-";
}

function eventSource(event) {
  const source = sourceForEvent(event);
  if (source && source !== "unknown") return source;
  return classifyAdminSource({ referrer: event?.referrer || "", utm_source: eventProp(event, "utm_source"), utm_medium: eventProp(event, "utm_medium") }).label;
}

function applyOutcome(row, name) {
  row.events += 1;
  if (FIRST_VALUE_EVENTS.has(name)) row.firstValue += 1;
  if (LEAD_EVENTS.has(name)) row.leads += 1;
  if (ACTIVATION_EVENTS.has(name)) row.activations += 1;
  if (name === "return_session") row.returns += 1;
  if (BOOK_EVENTS.has(name)) row.bookIntent += 1;
  if (name === "amazon_click") row.amazonClicks += 1;
}

function priorityFor(row) {
  if (row.score >= 18 && row.actionRateValue >= 0.05) return "Test next";
  if (row.score >= 6 || row.actionRateValue >= 0.02) return "Watch";
  return "Hold";
}

function recommendation(row) {
  if (row.priority === "Test next") return "Use as one measured social hypothesis";
  if (row.bookIntent > 0 && row.amazonClicks === 0) return "Improve book handoff before more promotion";
  if (row.pageviews > 0 && row.firstValue === 0) return "Sharpen the first-value CTA";
  if (row.priority === "Watch") return "Keep collecting outcome signal";
  return "Do not increase cadence";
}

function finalizePlatform(row) {
  const engagement = row.likes + row.comments + row.shares;
  const meaningfulActions = row.firstValue + row.leads + row.activations + row.returns + row.bookIntent + row.amazonClicks;
  const score = (row.activations * 3) + (row.returns * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + row.leads + row.firstValue + Math.min(row.clicks, 20);
  const actionRateValue = row.pageviews ? meaningfulActions / row.pageviews : 0;
  const finalized = {
    ...row,
    visitors: undefined,
    contentTypes: undefined,
    campaigns: undefined,
    creatives: undefined,
    engagement,
    uniqueVisitors: row.visitors.size,
    meaningfulActions,
    score,
    actionRateValue,
    clickRate: pct(row.clicks, Math.max(row.reach, 1)),
    engagementRate: pct(engagement, Math.max(row.reach, 1)),
    actionRate: pct(meaningfulActions, row.pageviews),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    topContentType: topEntry(row.contentTypes),
    topCampaign: topEntry(row.campaigns),
    topCreative: topEntry(row.creatives),
  };
  finalized.priority = priorityFor(finalized);
  finalized.recommendedAction = recommendation(finalized);
  return finalized;
}

function finalizeContent(row) {
  const meaningfulActions = row.firstValue + row.leads + row.activations + row.returns + row.bookIntent + row.amazonClicks;
  const score = (row.activations * 3) + (row.returns * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + row.leads + row.firstValue + Math.min(row.clicks, 20);
  const finalized = {
    ...row,
    platforms: undefined,
    meaningfulActions,
    score,
    clickRate: pct(row.clicks, Math.max(row.reach, 1)),
    actionRate: pct(meaningfulActions, row.pageviews),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    topPlatform: topEntry(row.platforms),
  };
  finalized.priority = priorityFor({ ...finalized, actionRateValue: row.pageviews ? meaningfulActions / row.pageviews : 0 });
  finalized.recommendedAction = recommendation(finalized);
  return finalized;
}

function finalizeCreative(row) {
  const meaningfulActions = row.firstValue + row.leads + row.activations + row.returns + row.bookIntent + row.amazonClicks;
  const score = (row.activations * 3) + (row.returns * 3) + (row.amazonClicks * 4) + (row.bookIntent * 2) + row.leads + row.firstValue;
  const finalized = {
    ...row,
    visitors: undefined,
    uniqueVisitors: row.visitors.size,
    meaningfulActions,
    score,
    actionRate: pct(meaningfulActions, row.pageviews),
    amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
  };
  finalized.priority = priorityFor({ ...finalized, actionRateValue: row.pageviews ? meaningfulActions / row.pageviews : 0 });
  finalized.recommendedAction = recommendation(finalized);
  return finalized;
}

function packetFromPlatform(row, sampleSizeWarning) {
  return {
    agent_name: "Social Distribution Agent",
    severity: row.priority === "Test next" ? "green" : row.priority === "Watch" ? "yellow" : "neutral",
    area: "Social",
    metric: row.platform,
    finding: `${row.platform} produced ${row.meaningfulActions.toLocaleString()} site outcome(s) from ${row.pageviews.toLocaleString()} tagged pageview(s).`,
    evidence: ["social_feedback.platformRows", "channel_scorecard"],
    confidence: sampleSizeWarning ? "medium" : "high",
    sample_size_warning: sampleSizeWarning,
    recommended_action: row.recommendedAction,
    requires_owner_decision: true,
    blocked_by: sampleSizeWarning ? ["small_sample"] : [],
  };
}

/**
 * @param {{ contentPerformance?: any[], pageviews?: any[], events?: any[], channelScorecard?: Record<string, any>, trafficQuality?: Record<string, any> }} options
 * @returns {Record<string, any>}
 */
export function buildSocialFeedbackLoop(options = {}) {
  const { contentPerformance = [], pageviews = [], events = [], channelScorecard = {}, trafficQuality = {} } = options;
  const platformMap = new Map();
  const contentMap = new Map();
  const creativeMap = new Map();

  for (const post of contentPerformance) {
    const platform = normalize(post?.platform);
    const contentType = normalize(post?.post_type || inferContentType(post?.content_url));
    const platformRow = ensurePlatform(platformMap, platform);
    const contentRow = ensureContent(contentMap, contentType);
    const reach = count(post?.reach || post?.impressions || 0);
    const clicks = count(post?.clicks);
    const likes = count(post?.likes);
    const comments = count(post?.comments);
    const shares = count(post?.shares);
    platformRow.posts += 1;
    platformRow.reach += reach;
    platformRow.clicks += clicks;
    platformRow.likes += likes;
    platformRow.comments += comments;
    platformRow.shares += shares;
    bump(platformRow.contentTypes, contentType);

    contentRow.posts += 1;
    contentRow.reach += reach;
    contentRow.clicks += clicks;
    contentRow.engagement += likes + comments + shares;
    bump(contentRow.platforms, platform);
  }

  for (const pageview of pageviews) {
    const source = pageview?.utm_source || classifyAdminSource(pageview).label;
    const campaign = pageview?.utm_campaign || "";
    const content = pageview?.utm_content || "";
    const contentType = inferContentType(campaign, content, pageview?.path);
    const platformRow = ensurePlatform(platformMap, source);
    const contentRow = ensureContent(contentMap, contentType);
    const creativeRow = ensureCreative(creativeMap, source, campaign, content);
    platformRow.pageviews += 1;
    contentRow.pageviews += 1;
    creativeRow.pageviews += 1;
    if (pageview?.visitor_hash) {
      platformRow.visitors.add(pageview.visitor_hash);
      creativeRow.visitors.add(pageview.visitor_hash);
    }
    bump(platformRow.campaigns, campaign || "unknown");
    bump(platformRow.creatives, content || "unknown");
  }

  for (const event of events) {
    const name = event?.event_name || "";
    const source = eventSource(event);
    const campaign = eventProp(event, "utm_campaign");
    const content = eventProp(event, "utm_content");
    const contentType = inferContentType(campaign, content, event?.path);
    const platformRow = ensurePlatform(platformMap, source);
    const contentRow = ensureContent(contentMap, contentType);
    const creativeRow = ensureCreative(creativeMap, source, campaign, content);
    applyOutcome(platformRow, name);
    applyOutcome(contentRow, name);
    applyOutcome(creativeRow, name);
  }

  const platformRows = [...platformMap.values()].map(finalizePlatform).sort((left, right) => right.score - left.score || right.meaningfulActions - left.meaningfulActions || right.clicks - left.clicks);
  const contentRows = [...contentMap.values()].map(finalizeContent).sort((left, right) => right.score - left.score || right.meaningfulActions - left.meaningfulActions || right.clicks - left.clicks);
  const creativeRows = [...creativeMap.values()].map(finalizeCreative).sort((left, right) => right.score - left.score || right.meaningfulActions - left.meaningfulActions || right.pageviews - left.pageviews).slice(0, 16);
  const testRows = [...platformRows.filter((row) => row.priority === "Test next"), ...contentRows.filter((row) => row.priority === "Test next")].slice(0, 8);
  const sampleSizeWarning = pageviews.length < 50 || events.length < 10;
  const topPlatform = platformRows[0]?.platform || channelScorecard?.summary?.topChannel || "-";
  const topContentType = contentRows[0]?.contentType || "-";
  return {
    summary: {
      platforms: platformRows.length,
      contentTypes: contentRows.length,
      taggedPageviews: pageviews.filter((row) => row?.utm_source).length,
      totalPosts: contentPerformance.length,
      totalClicks: contentPerformance.reduce((sum, row) => sum + count(row?.clicks), 0),
      totalMeaningfulActions: platformRows.reduce((sum, row) => sum + row.meaningfulActions, 0),
      testCandidates: testRows.length,
      topPlatform,
      topContentType,
      trafficTopSource: trafficQuality?.sourceQualityRows?.[0]?.label || "-",
    },
    platformRows,
    contentRows,
    creativeRows,
    testRows,
    packetRows: platformRows.slice(0, 4).map((item) => packetFromPlatform(item, sampleSizeWarning)),
    guardrails: [
      "This report does not schedule, publish, or change social cadence.",
      "Use site outcomes, not likes alone, to choose the next measured social hypothesis.",
      "Book promotion should stay capped unless book intent and Amazon handoff improve.",
      "Owner approval is required before platform focus, cadence, or campaign mix changes.",
    ],
    note: "P6-05 feeds site outcomes back into social selection as a read-only recommendation layer.",
  };
}