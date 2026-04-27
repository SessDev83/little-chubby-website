import { buildBookScorecard } from "./admin-book-scorecard.mjs";
import { classifyAdminSource, eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";

const COMMUNITY_EVENTS = new Set([
  "review_submitted",
  "review_approved",
  "lottery_entered",
  "share_credit_success",
  "art_upload_submitted",
  "art_approved",
  "reaction_received",
]);

const SUPPORT_EVENTS = new Set(["support_click", "voluntary_support_click", "kofi_click", "buy_me_a_coffee_click"]);
const BUNDLE_EVENTS = new Set(["bundle_interest", "printable_bundle_interest", "mini_book_interest", "digital_bundle_interest"]);

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row?.[key]).filter(Boolean)).size;
}

function sourceLooksOwned(source) {
  return /newsletter|email|owned/i.test(source || "");
}

function eventSource(event) {
  return sourceForEvent(event) || eventProp(event, "medium") || "unknown";
}

function eventActor(event) {
  return eventProp(event, "user_id") || event?.visitor_hash || "";
}

function repeatActors(events, eventName) {
  const counts = new Map();
  for (const event of events) {
    if (event?.event_name !== eventName) continue;
    const actor = eventActor(event);
    if (!actor) continue;
    counts.set(actor, (counts.get(actor) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function sourceMix(pageviews = []) {
  const rows = new Map();
  for (const pageview of pageviews) {
    const source = classifyAdminSource(pageview);
    const current = rows.get(source.category) || { category: source.category, pageviews: 0, labels: new Map() };
    current.pageviews += 1;
    current.labels.set(source.label, (current.labels.get(source.label) || 0) + 1);
    rows.set(source.category, current);
  }
  return [...rows.values()]
    .map((row) => ({
      category: row.category,
      pageviews: row.pageviews,
      topLabel: [...row.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || row.category,
    }))
    .sort((a, b) => b.pageviews - a.pageviews);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreStatus(score) {
  if (score >= 70) return "Strong";
  if (score >= 35) return "Healthy";
  return "Weak";
}

function area(key, label, score, evidence, nextAction) {
  const finalScore = clampScore(score);
  return { key, label, score: finalScore, status: scoreStatus(finalScore), evidence, nextAction };
}

function risk(severity, title, detail, action) {
  return { severity, title, detail, action };
}

/**
 * @param {{ events?: any[], pageviews?: any[], subscribers?: any[], profiles?: any[], reviews?: any[], books?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildResilienceReport(options = {}) {
  const { events = [], pageviews = [], subscribers = [], profiles = [], reviews = [], books = [] } = options;
  const bookScorecard = buildBookScorecard({ events, reviews, books });
  const confirmedSubscribers = countBy(subscribers, (row) => row?.confirmed === true);
  const pendingSubscribers = countBy(subscribers, (row) => row?.confirmed === false);
  const totalSubscribers = subscribers.length;
  const confirmedRate = totalSubscribers ? confirmedSubscribers / totalSubscribers : 0;
  const registeredUsers = profiles.length;
  const uniqueVisitors = uniqueCount(pageviews, "visitor_hash");
  const directPageviews = countBy(pageviews, (row) => classifyAdminSource(row).category === "direct");
  const organicPageviews = countBy(pageviews, (row) => classifyAdminSource(row).category === "organic");
  const ownedSourceEvents = countBy(events, (event) => sourceLooksOwned(eventSource(event)));
  const emailReturnEvents = countBy(events, (event) => sourceLooksOwned(eventSource(event)) && ["return_session", "download_success", "book_page_viewed", "amazon_click"].includes(event?.event_name));
  const repeatDownloaders = repeatActors(events, "download_success");
  const communityEvents = countBy(events, (event) => COMMUNITY_EVENTS.has(event?.event_name));
  const supportInterest = countBy(events, (event) => SUPPORT_EVENTS.has(event?.event_name));
  const bundleInterest = countBy(events, (event) => BUNDLE_EVENTS.has(event?.event_name));
  const bookIntent = bookScorecard.summary.bookIntent;
  const amazonClicks = bookScorecard.summary.amazonClicks;
  const amazonRateValue = bookIntent ? amazonClicks / bookIntent : 0;
  const sourceRows = sourceMix(pageviews);
  const diversifiedAmazonSources = new Set(events.filter((event) => event?.event_name === "amazon_click").map(eventSource)).size;
  const amazonBooks = bookScorecard.scoreRows.filter((row) => row.amazonClicks > 0).length;
  const booksMissingTrust = bookScorecard.scoreRows.filter((row) => row.amazonClicks > 0 && row.approvedReviews === 0);

  const audienceScore = (Math.min(confirmedSubscribers, 100) / 100) * 35
    + confirmedRate * 25
    + (Math.min(registeredUsers, 100) / 100) * 20
    + (emailReturnEvents > 0 ? Math.min(emailReturnEvents, 10) / 10 : 0) * 20;
  const catalogScore = (books.length ? (bookScorecard.summary.activeBooks / books.length) : 0) * 25
    + (bookIntent > 0 ? Math.min(bookIntent, 50) / 50 : 0) * 25
    + (amazonClicks > 0 ? Math.min(amazonClicks, 20) / 20 : 0) * 20
    + (bookScorecard.summary.approvedReviews > 0 ? Math.min(bookScorecard.summary.approvedReviews, 25) / 25 : 0) * 20
    + (bookScorecard.summary.averageRating >= 4.5 ? 10 : bookScorecard.summary.averageRating >= 4 ? 6 : 0);
  const analyticsScore = (events.length > 0 ? 25 : 0)
    + (pageviews.length > 0 ? 20 : 0)
    + (bookIntent > 0 ? 20 : 0)
    + (amazonClicks > 0 ? 20 : 0)
    + (diversifiedAmazonSources > 1 ? 15 : diversifiedAmazonSources === 1 ? 8 : 0);
  const dependencyScore = (confirmedSubscribers > 0 ? 20 : 0)
    + (registeredUsers > 0 ? 15 : 0)
    + (directPageviews + organicPageviews > 0 ? 15 : 0)
    + (amazonBooks > 1 ? 20 : amazonBooks === 1 ? 10 : 0)
    + (amazonRateValue > 0 && amazonRateValue < 0.65 ? 15 : amazonRateValue >= 0.65 ? 8 : 0)
    + (booksMissingTrust.length === 0 && amazonClicks > 0 ? 15 : 0);
  const communityScore = (communityEvents > 0 ? Math.min(communityEvents, 20) / 20 : 0) * 35
    + (bookScorecard.summary.approvedReviews > 0 ? Math.min(bookScorecard.summary.approvedReviews, 20) / 20 : 0) * 30
    + (repeatDownloaders > 0 ? Math.min(repeatDownloaders, 15) / 15 : 0) * 20
    + (emailReturnEvents > 0 ? 15 : 0);
  const optionScore = (repeatDownloaders > 0 ? Math.min(repeatDownloaders, 20) / 20 : 0) * 30
    + (emailReturnEvents > 0 ? Math.min(emailReturnEvents, 20) / 20 : 0) * 25
    + (communityEvents > 0 ? Math.min(communityEvents, 20) / 20 : 0) * 20
    + (supportInterest > 0 ? 15 : 0)
    + (bundleInterest > 0 ? 10 : 0);

  const areaRows = [
    area("audience", "Own Audience", audienceScore, `${confirmedSubscribers} confirmed subscribers, ${registeredUsers} registered users, ${ownedSourceEvents} owned-source events, ${emailReturnEvents} email-driven returns`, "Grow confirmed list and bring email users back to first value"),
    area("catalog", "Own Catalog Trust", catalogScore, `${bookScorecard.summary.activeBooks}/${books.length} active books, ${bookIntent} intent events, ${bookScorecard.summary.approvedReviews} approved reviews`, "Improve samples, reviews, and book-page trust before new commerce"),
    area("analytics", "Own Analytics", analyticsScore, `${events.length} events, ${pageviews.length} pageviews, ${amazonClicks} Amazon clicks`, "Keep comparing site-side intent with manual KDP outcomes"),
    area("dependency", "Amazon Dependency", dependencyScore, `${amazonBooks} books with Amazon clicks, ${diversifiedAmazonSources} Amazon-click sources`, "Keep Amazon primary while strengthening audience and catalog proof"),
    area("community", "Community Trust", communityScore, `${communityEvents} community events, ${repeatDownloaders} repeat downloaders`, "Build trust loops before support or bundle experiments"),
    area("options", "Future Option Signals", optionScore, `${supportInterest} support clicks, ${bundleInterest} bundle-interest events`, "Hold non-Amazon offers until demand signals are visible"),
  ];

  const resilienceScore = clampScore(areaRows.reduce((sum, row) => sum + row.score, 0) / Math.max(areaRows.length, 1));
  const riskRows = [];
  if (confirmedSubscribers < 25) riskRows.push(risk("High", "Owned audience is still thin", `${confirmedSubscribers} confirmed subscribers limits resilience outside Amazon.`, "Prioritize confirmation, lifecycle, and return behavior."));
  if (amazonClicks > 0 && booksMissingTrust.length > 0) riskRows.push(risk("Medium", "Amazon intent lacks site trust proof", `${booksMissingTrust.length} Amazon-clicked book(s) have no approved review in the window.`, "Add reviews, samples, FAQ, or trust content before stronger sales pushes."));
  if (amazonClicks > 0) riskRows.push(risk("Medium", "KDP correlation remains manual", `${amazonClicks} Amazon click(s) need external KDP comparison.`, "Review KDP by date/title before assuming sales impact."));
  if (supportInterest + bundleInterest === 0) riskRows.push(risk("Low", "No non-Amazon demand signal yet", "Support and bundle-interest events are absent in this window.", "Keep non-Amazon monetization exploratory."));
  if (riskRows.length === 0) riskRows.push(risk("Low", "No acute resilience risk detected", "Current reporting inputs do not show an immediate dependency spike.", "Continue monthly review."));

  const metricRows = [
    { metric: "Confirmed subscriber rate", value: pct(confirmedSubscribers, Math.max(totalSubscribers, 1)), detail: `${confirmedSubscribers} confirmed / ${pendingSubscribers} pending` },
    { metric: "Direct + organic traffic", value: (directPageviews + organicPageviews).toLocaleString(), detail: `${directPageviews} direct, ${organicPageviews} organic pageviews` },
    { metric: "Book intent to Amazon", value: pct(amazonClicks, Math.max(bookIntent, 1)), detail: `${bookIntent} intent events / ${amazonClicks} Amazon clicks` },
    { metric: "Repeat downloaders", value: repeatDownloaders.toLocaleString(), detail: "Same user/visitor with more than one download_success" },
    { metric: "Community participation", value: communityEvents.toLocaleString(), detail: "Reviews, lottery, share, art, or reaction events" },
    { metric: "Future option interest", value: (supportInterest + bundleInterest).toLocaleString(), detail: `${supportInterest} support / ${bundleInterest} bundle interest` },
  ];

  return {
    summary: {
      resilienceScore,
      status: scoreStatus(resilienceScore),
      confirmedSubscribers,
      totalSubscribers,
      registeredUsers,
      uniqueVisitors,
      bookIntent,
      amazonClicks,
      amazonRate: pct(amazonClicks, Math.max(bookIntent, 1)),
      repeatDownloaders,
      communityEvents,
      supportInterest,
      bundleInterest,
    },
    areaRows,
    metricRows,
    riskRows,
    sourceRows,
    bookRows: bookScorecard.scoreRows.slice(0, 8),
    note: "Resilience reporting preserves Amazon as the primary path. It does not enable support, bundles, affiliate links, checkout, or alternate fulfillment.",
  };
}