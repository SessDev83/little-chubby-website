import assert from "node:assert/strict";

import {
  buildFunnelCommandCenter,
  buildAdminKpiSummary,
  buildTrafficQualitySummary,
  classifyAdminSource,
  fallbackFunnelStage,
  resolveAdminRange,
} from "../../src/lib/admin-kpis.mjs";
import { buildAgentKpiInputContract } from "../../src/lib/admin-agent-contract.mjs";
import {
  canonicalEventName,
  buildEventContractHealth,
  EVENT_CONTRACT_VERSION,
} from "../../src/lib/analytics-event-contract.mjs";
import { buildAudienceSignalModel } from "../../src/lib/admin-audience-signals.mjs";
import { buildAmazonAttribution } from "../../src/lib/admin-amazon-attribution.mjs";
import { buildBookScorecard } from "../../src/lib/admin-book-scorecard.mjs";
import { buildChannelScorecard } from "../../src/lib/admin-channel-scorecard.mjs";
import { buildCommunityEngagementAgentReport } from "../../src/lib/admin-community-agent.mjs";
import { buildConversionFunnelAgentReport } from "../../src/lib/admin-conversion-agent.mjs";
import { buildEconomyHealth } from "../../src/lib/admin-economy-health.mjs";
import { buildFirstValueAnalysis } from "../../src/lib/admin-first-value-analysis.mjs";
import { buildAdminIntelligenceBrief } from "../../src/lib/admin-intelligence-brief.mjs";
import { buildLearningLedgerEntry, renderLearningLedgerMarkdown } from "../../src/lib/admin-learning-ledger.mjs";
import { buildLanguageMarketReport } from "../../src/lib/admin-language-market.mjs";
import { buildOpsFeed } from "../../src/lib/admin-ops-feed.mjs";
import { buildRetentionCohorts } from "../../src/lib/admin-retention-cohorts.mjs";
import { buildResilienceReport } from "../../src/lib/admin-resilience-report.mjs";
import { buildSocialFeedbackLoop } from "../../src/lib/admin-social-feedback.mjs";
import { buildAdminUserJourney } from "../../src/lib/admin-user-journey.mjs";

const fixedNow = new Date("2026-04-27T12:00:00.000Z");
const range = resolveAdminRange("30d", fixedNow);
assert.equal(range.rangeKey, "30d");
assert.equal(range.days, 30);
assert.equal(range.sinceIso, "2026-03-28T12:00:00.000Z");
assert.equal(resolveAdminRange("bad", fixedNow).rangeKey, "7d");

assert.equal(fallbackFunnelStage("newsletter_confirmed"), "lead");
assert.equal(fallbackFunnelStage("download_success"), "activated");
assert.equal(fallbackFunnelStage("download_completed"), "activated");
assert.equal(fallbackFunnelStage("share_click"), "engaged");
assert.equal(fallbackFunnelStage("amazon_click"), "amazon_click");
assert.equal(canonicalEventName("register_submit_success"), "register_completed");
assert.equal(canonicalEventName("download_success"), "download_completed");

assert.deepEqual(classifyAdminSource({ utm_medium: "social", utm_source: "facebook" }), {
  category: "social",
  detail: "facebook",
  label: "facebook",
});
assert.deepEqual(classifyAdminSource({ referrer: "https://www.littlechubbypress.com/en/" }), {
  category: "internal",
  detail: "littlechubbypress.com",
  label: "internal",
});
assert.deepEqual(classifyAdminSource({ referrer: "https://www.google.com/search?q=coloring" }), {
  category: "organic",
  detail: "google.com",
  label: "google.com",
});

const summary = buildAdminKpiSummary({
  pageviews: [
    { visitor_hash: "a" },
    { visitor_hash: "b" },
    { visitor_hash: "a" },
  ],
  events: [
    { event_name: "newsletter_confirmed", props: { utm_source: "facebook" } },
    { event_name: "register_submit_success", props: { source: "direct" } },
    { event_name: "download_success", props: { funnel_stage: "activated", source: "direct" } },
    { event_name: "book_page_viewed", props: { book_id: "abc", source: "newsletter" } },
    { event_name: "sample_viewed", props: { book_id: "abc", source: "newsletter" } },
    { event_name: "amazon_click", props: { asin: "B000", source: "newsletter" } },
  ],
});

assert.equal(summary.totalPageviews, 3);
assert.equal(summary.uniqueVisitors, 2);
assert.equal(summary.leadEvents, 1);
assert.equal(summary.registerSuccess, 1);
assert.equal(summary.downloadSuccess, 1);
assert.equal(summary.eventContractHealth.contractVersion, EVENT_CONTRACT_VERSION);
assert.equal(summary.bookIntent, 3);
assert.equal(summary.amazonClicks, 1);
assert.equal(summary.funnelRows.find((row) => row.stage === "Amazon Click")?.rateFromPrior, "33.3%");
assert.equal(summary.bookRows[0].book, "abc");

const commandCenter = buildFunnelCommandCenter({
  pageviews: [
    { path: "/en/coloring-corner/", visitor_hash: "a", utm_medium: "social", utm_source: "facebook" },
    { path: "/es/blog/", visitor_hash: "b", referrer: "https://www.google.com/search?q=coloring" },
  ],
  events: [
    { event_name: "newsletter_confirmed", path: "/en/coloring-corner/", lang: "en", props: { source: "facebook", landing_page: "/en/coloring-corner/" } },
    { event_name: "download_success", path: "/en/coloring-corner/", lang: "en", props: { source: "facebook", landing_page: "/en/coloring-corner/" } },
  ],
});

assert.equal(commandCenter.stageRows.find((row) => row.stage === "Visit")?.topSource, "facebook");
assert.equal(commandCenter.stageRows.find((row) => row.stage === "Lead")?.topLandingPage, "/en/coloring-corner/");
assert.equal(commandCenter.sourceStageRows[0].deepestStage, "Activated");
assert.equal(commandCenter.topLeak?.from, "Lead");

const trafficQuality = buildTrafficQualitySummary({
  pageviews: [
    { path: "/en/coloring-corner/", landing_page: "/en/coloring-corner/", visitor_hash: "a", utm_medium: "social", utm_source: "facebook", utm_campaign: "sprint-free-coloring", utm_content: "dino-20260427-f-en" },
    { path: "/en/books/abc/", landing_page: "/en/books/", visitor_hash: "b", referrer: "https://www.google.com/search?q=book" },
  ],
  events: [
    { event_name: "newsletter_confirmed", path: "/en/coloring-corner/", props: { source: "facebook", landing_page: "/en/coloring-corner/", utm_source: "facebook", utm_campaign: "sprint-free-coloring", utm_content: "dino-20260427-f-en" } },
    { event_name: "download_success", path: "/en/coloring-corner/", props: { source: "facebook", landing_page: "/en/coloring-corner/", utm_source: "facebook", utm_campaign: "sprint-free-coloring", utm_content: "dino-20260427-f-en" } },
    { event_name: "amazon_click", path: "/en/books/abc/", props: { source: "google.com", landing_page: "/en/books/" } },
  ],
});

const facebookQuality = trafficQuality.sourceQualityRows.find((row) => row.label === "facebook");
assert.equal(facebookQuality?.meaningfulActions, 2);
assert.equal(facebookQuality?.activations, 1);
assert.equal(trafficQuality.landingQualityRows.find((row) => row.label === "/en/coloring-corner/")?.meaningfulActions, 2);
assert.equal(trafficQuality.utmQualityRows[0].label, "dino-20260427-f-en");
assert.equal(trafficQuality.utmQualityRows[0].actionRate, 2);

const eventContractHealth = buildEventContractHealth({
  now: fixedNow,
  events: [
    { event_name: "download_success", event_id: "evt_1", path: "/en/coloring-corner/dino/", lang: "en", created_at: "2026-04-27T11:55:00.000Z", props: { session_id: "sess_1", anonymous_id: "anon_1", source: "facebook" } },
    { event_name: "register_completed", event_id: "evt_1", path: "/en/register/", lang: "en", created_at: "2026-04-27T11:56:00.000Z", props: { session_id: "sess_1", anonymous_id: "anon_1", source: "facebook" } },
    { event_name: "surprise_unknown", path: "/", created_at: "2026-04-27T11:57:00.000Z", props: {} },
  ],
});
assert.equal(eventContractHealth.metrics.duplicateEventIds, 1);
assert.equal(eventContractHealth.metrics.missingEventIds, 1);
assert.equal(eventContractHealth.unknownEventNames[0].eventName, "surprise_unknown");

const serverConfirmedHealth = buildEventContractHealth({
  now: fixedNow,
  events: [
    { event_name: "shop_purchase_completed", event_id: "srv_1", path: "/en/peanuts/", lang: "en", created_at: "2026-04-27T11:58:00.000Z", props: { capture: "server", server_confirmed: true, user_id: "user-a", source: "internal" } },
    { event_name: "newsletter_confirmed", event_id: "srv_2", visitor_hash: "lead-hash", path: "/en/welcome/", lang: "en", created_at: "2026-04-27T11:59:00.000Z", props: { capture: "server", server_confirmed: true, source: "double_opt_in" } },
  ],
});
assert.equal(serverConfirmedHealth.metrics.missingSessionIds, 0);
assert.equal(serverConfirmedHealth.metrics.missingAnonymousIds, 0);

const journey = buildAdminUserJourney({
  now: fixedNow,
  profile: { email: "test@example.com", created_at: "2026-04-01T00:00:00.000Z", suspended: false },
  newsletterSub: { confirmed: true, source: "lead-magnet", created_at: "2026-04-02T00:00:00.000Z" },
  downloads: [{ artwork_id: "dino", downloaded_at: "2026-04-03T00:00:00.000Z" }],
  reviews: [{ book_id: "abc", status: "approved", submitted_at: "2026-04-20T00:00:00.000Z" }],
  credits: [{ amount: 5, reason: "review", created_at: "2026-04-20T00:00:00.000Z" }],
  tickets: [],
  badges: [],
  lotteryEntries: [],
  conversionEvents: [{ event_name: "amazon_click", path: "/en/books/abc/", created_at: "2026-04-21T00:00:00.000Z", props: { source: "newsletter", landing_page: "/en/books/" } }],
});

assert.equal(journey.lifecycleStage, "Amazon Click");
assert.equal(journey.acquisitionSource, "newsletter");
assert.equal(journey.retention.label, "Active");
assert.equal(journey.nextBestAction, "Maintain relationship");
assert.equal(journey.timeline[0].label, "amazon_click");

const opsFeed = buildOpsFeed({
  events: [
    { id: 1, event_name: "download_success", path: "/en/coloring-corner/dino/", visitor_hash: "abcdef1234567890", lang: "en", created_at: "2026-04-27T11:00:00.000Z", props: { source: "facebook" } },
    { id: 2, event_name: "download_blocked", path: "/en/coloring-corner/dino/", visitor_hash: "warning-user", lang: "en", created_at: "2026-04-27T11:05:00.000Z", props: { source: "direct" } },
  ],
  pageviews: [
    { id: 1, path: "/en/", visitor_hash: "visitor-a", utm_medium: "social", utm_source: "facebook", created_at: "2026-04-27T10:59:00.000Z" },
  ],
  limit: 3,
});

assert.equal(opsFeed.items[0].title, "download blocked");
assert.equal(opsFeed.items[0].tone, "warn");
assert.equal(opsFeed.stats.warnings, 1);
assert.equal(opsFeed.stats.highValue, 1);

const currentKpis = buildAdminKpiSummary({
  events: [
    { event_name: "download_blocked", path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-27T11:05:00.000Z", props: { source: "facebook" } },
    { event_name: "book_page_viewed", path: "/en/books/awesome-girls/", visitor_hash: "visitor-b", lang: "en", created_at: "2026-04-27T11:06:00.000Z", props: { source: "facebook", book_id: "awesome-girls" } },
  ],
  pageviews: [
    { path: "/en/", landing_page: "/en/", visitor_hash: "visitor-a", utm_source: "facebook", utm_medium: "social", created_at: "2026-04-27T11:00:00.000Z" },
    { path: "/en/books/awesome-girls/", landing_page: "/en/", visitor_hash: "visitor-b", utm_source: "facebook", utm_medium: "social", created_at: "2026-04-27T11:01:00.000Z" },
  ],
});
const previousKpis = buildAdminKpiSummary({ events: [], pageviews: [] });
const brief = buildAdminIntelligenceBrief({
  current: { ...currentKpis, events: [], pageviews: [], label: "24 hours" },
  previous: previousKpis,
});

assert.equal(brief.recommendedAction.area, "Activation");
assert.equal(brief.risks.some((row) => row.title === "Blocked downloads detected"), true);
assert.equal(brief.metrics.some((row) => row.key === "bookIntent" && row.value === 1), true);

const ledgerEntry = buildLearningLedgerEntry({
  brief,
  current: { ...currentKpis, label: "24 hours" },
  previous: previousKpis,
  generatedAtIso: "2026-04-27T12:00:00.000Z",
});
const ledgerMarkdown = renderLearningLedgerMarkdown(ledgerEntry);

assert.equal(ledgerEntry.entryId, "WIL-2026-W18");
assert.equal(ledgerEntry.affectedPackages.includes("P5-ADM-11"), true);
assert.equal(ledgerMarkdown.includes("### Recommended Experiment"), true);
assert.equal(ledgerMarkdown.includes("P5-ADM-11"), true);

const retention = buildRetentionCohorts({
  now: new Date("2026-04-20T00:00:00.000Z"),
  profiles: [
    { id: "user-a", created_at: "2026-04-01T10:00:00.000Z", lang_pref: "en" },
    { id: "user-b", created_at: "2026-04-10T10:00:00.000Z", lang_pref: "es" },
  ],
  events: [
    { event_name: "register_submit_success", created_at: "2026-04-01T10:05:00.000Z", path: "/en/register/", props: { user_id: "user-a", source: "facebook" } },
    { event_name: "download_success", created_at: "2026-04-02T12:00:00.000Z", path: "/en/coloring-corner/dino/", props: { user_id: "user-a", source: "facebook" } },
    { event_name: "return_session", created_at: "2026-04-08T10:30:00.000Z", path: "/en/", props: { user_id: "user-a", source: "direct" } },
    { event_name: "newsletter_confirmed", created_at: "2026-04-10T11:00:00.000Z", path: "/es/newsletter/", props: { user_id: "user-b", source: "direct" } },
  ],
});

assert.equal(retention.summary.registered, 2);
assert.equal(retention.summary.retainedD1, 1);
assert.equal(retention.summary.retainedD7, 1);
assert.equal(retention.summary.activated, 1);
assert.equal(retention.summary.secondSession, 1);
assert.equal(retention.firstValueRows[0].eventName, "download_completed");

const economy = buildEconomyHealth({
  now: new Date("2026-04-20T00:00:00.000Z"),
  credits: [
    { user_id: "user-a", amount: 10, reason: "download", created_at: "2026-03-01T00:00:00.000Z" },
    { user_id: "user-a", amount: 5, reason: "share", created_at: "2026-03-02T00:00:00.000Z" },
    { user_id: "user-a", amount: -10, reason: "boost", created_at: "2026-03-03T00:00:00.000Z" },
    { user_id: "user-a", amount: -5, reason: "ticket_purchase", created_at: "2026-03-04T00:00:00.000Z" },
    { user_id: "user-b", amount: 20, reason: "review", created_at: "2026-01-01T00:00:00.000Z" },
  ],
  tickets: [{ user_id: "user-a", amount: 1, reason: "entry", created_at: "2026-03-04T00:00:00.000Z" }],
  downloads: [{ user_id: "user-a" }],
  boosts: [{ user_id: "user-a" }],
});

assert.equal(economy.summary.totalEarned, 35);
assert.equal(economy.summary.totalSpent, 15);
assert.equal(economy.summary.repeatEarners, 1);
assert.equal(economy.summary.repeatSpenders, 1);
assert.equal(economy.summary.dormantUsers, 1);
assert.equal(economy.reasonRows.some((row) => row.reason === "download" && row.earned === 10), true);

const amazon = buildAmazonAttribution({
  books: [{ id: "awesome-girls", title: { en: "Awesome Girls" }, amazonUrl: "https://www.amazon.com/dp/B0TEST1234" }],
  events: [
    { event_name: "book_page_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_cta_click", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "amazon_click", lang: "en", path: "/en/blog/test/", props: { asin: "B0TEST1234", content_id: "blog-test", source: "newsletter" } },
  ],
});

assert.equal(amazon.summary.bookIntent, 3);
assert.equal(amazon.summary.amazonClicks, 1);
assert.equal(amazon.bookRows[0].id, "awesome-girls");
assert.equal(amazon.bookRows[0].amazonRate, "33.3%");
assert.equal(amazon.contentRows[0].contentId, "blog-test");

const bookScorecard = buildBookScorecard({
  books: [{ id: "awesome-girls", title: { en: "Awesome Girls" }, amazonUrl: "https://www.amazon.com/dp/B0TEST1234", ageRange: { en: "Ages 4-8" }, pages: 90 }],
  events: [
    { event_name: "book_page_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_cta_click", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "amazon_click", lang: "en", path: "/en/blog/test/", props: { asin: "B0TEST1234", source: "newsletter" } },
  ],
  reviews: [
    { book_id: "awesome-girls", status: "approved", rating: 5, featured: true },
    { book_id: "awesome-girls", status: "pending", rating: 4, featured: false },
  ],
});

assert.equal(bookScorecard.summary.catalogBooks, 1);
assert.equal(bookScorecard.summary.bookIntent, 3);
assert.equal(bookScorecard.summary.amazonClicks, 1);
assert.equal(bookScorecard.summary.ratingLabel, "5.0");
assert.equal(bookScorecard.scoreRows[0].id, "awesome-girls");
assert.equal(bookScorecard.scoreRows[0].amazonRate, "33.3%");
assert.equal(bookScorecard.scoreRows[0].recommendedAction, "Moderate pending reviews");
assert.equal(bookScorecard.languageRows[0].amazonRate, "33.3%");

const resilience = buildResilienceReport({
  books: [{ id: "awesome-girls", title: { en: "Awesome Girls" }, amazonUrl: "https://www.amazon.com/dp/B0TEST1234", ageRange: { en: "Ages 4-8" }, pages: 90 }],
  pageviews: [
    { path: "/en/", visitor_hash: "visitor-a" },
    { path: "/en/books/awesome-girls/", visitor_hash: "visitor-b", referrer: "https://www.google.com/search?q=book" },
  ],
  subscribers: [
    { confirmed: true, source: "lead-magnet" },
    { confirmed: false, source: "lead-magnet" },
  ],
  profiles: [{ id: "user-a", created_at: "2026-04-01T00:00:00.000Z" }],
  reviews: [
    { book_id: "awesome-girls", status: "approved", rating: 5, featured: true },
    { book_id: "awesome-girls", status: "pending", rating: 4, featured: false },
  ],
  events: [
    { event_name: "book_page_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_viewed", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "sample_cta_click", lang: "en", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "facebook" } },
    { event_name: "amazon_click", lang: "en", path: "/en/blog/test/", props: { asin: "B0TEST1234", source: "newsletter" } },
    { event_name: "download_success", visitor_hash: "visitor-a", props: { user_id: "user-a", source: "newsletter" } },
    { event_name: "download_success", visitor_hash: "visitor-a", props: { user_id: "user-a", source: "newsletter" } },
    { event_name: "review_submitted", visitor_hash: "visitor-a", props: { user_id: "user-a", source: "direct" } },
  ],
});

assert.equal(resilience.summary.confirmedSubscribers, 1);
assert.equal(resilience.summary.bookIntent, 3);
assert.equal(resilience.summary.amazonClicks, 1);
assert.equal(resilience.summary.repeatDownloaders, 1);
assert.equal(resilience.areaRows.length, 6);
assert.equal(resilience.metricRows.some((row) => row.metric === "Book intent to Amazon" && row.value === "33.3%"), true);
assert.equal(resilience.riskRows.some((row) => row.title === "KDP correlation remains manual"), true);

const audienceSignals = buildAudienceSignalModel({
  pageviews: [
    { path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", utm_source: "facebook" },
    { path: "/en/books/awesome-girls/", visitor_hash: "visitor-b", referrer: "https://www.google.com/search?q=book" },
    { path: "/en/", visitor_hash: "visitor-c" },
    { path: "/es/", visitor_hash: "visitor-c" },
  ],
  events: [
    { event_name: "download_success", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-20T12:00:00.000Z", path: "/en/coloring-corner/dino/", props: { source: "facebook" } },
    { event_name: "download_success", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-21T12:00:00.000Z", path: "/en/coloring-corner/cat/", props: { source: "facebook" } },
    { event_name: "return_session", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-22T12:00:00.000Z", path: "/en/", props: { source: "newsletter" } },
    { event_name: "book_page_viewed", visitor_hash: "visitor-b", lang: "en", created_at: "2026-04-22T12:00:00.000Z", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
    { event_name: "amazon_click", visitor_hash: "visitor-b", lang: "en", created_at: "2026-04-22T12:05:00.000Z", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
  ],
});

assert.equal(audienceSignals.summary.actors, 3);
assert.equal(audienceSignals.summary.topSegment, "Gift Shopper");
assert.equal(audienceSignals.summary.firstValueActors, 2);
assert.equal(audienceSignals.segmentRows.find((row) => row.segment === "Parent/Caregiver")?.stages.Activated, 1);
assert.equal(audienceSignals.segmentRows.find((row) => row.segment === "Bilingual Family")?.confidenceLabel, "Medium");
assert.equal(audienceSignals.sourceRows.some((row) => row.segment === "Gift Shopper" && row.amazonClicks === 1), true);

const firstValue = buildFirstValueAnalysis({
  pageviews: [
    { path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", utm_source: "facebook" },
    { path: "/en/books/awesome-girls/", visitor_hash: "visitor-b", referrer: "https://www.google.com/search?q=book" },
  ],
  events: [
    { event_name: "download_success", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-20T12:00:00.000Z", path: "/en/coloring-corner/dino/", props: { source: "facebook" } },
    { event_name: "return_session", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-21T12:00:00.000Z", path: "/en/", props: { source: "newsletter" } },
    { event_name: "book_page_viewed", visitor_hash: "visitor-a", lang: "en", created_at: "2026-04-22T12:00:00.000Z", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "newsletter" } },
    { event_name: "book_page_viewed", visitor_hash: "visitor-b", lang: "en", created_at: "2026-04-20T12:00:00.000Z", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
    { event_name: "amazon_click", visitor_hash: "visitor-b", lang: "en", created_at: "2026-04-20T12:05:00.000Z", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
  ],
});

assert.equal(firstValue.summary.actorsWithFirstValue, 2);
assert.equal(firstValue.summary.topFirstValue, "download_completed");
assert.equal(firstValue.summary.bestBookAction, "book_page_viewed");
assert.equal(firstValue.firstValueRows.find((row) => row.firstValue === "download_completed")?.returnRate, "100.0%");
assert.equal(firstValue.firstValueRows.find((row) => row.firstValue === "book_page_viewed")?.amazonRate, "100.0%");

const channelScorecard = buildChannelScorecard({
  pageviews: [
    { path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", utm_source: "facebook", utm_medium: "social" },
    { path: "/en/books/awesome-girls/", visitor_hash: "visitor-b", referrer: "https://www.google.com/search?q=book" },
  ],
  events: [
    { event_name: "download_success", visitor_hash: "visitor-a", path: "/en/coloring-corner/dino/", props: { source: "facebook", utm_medium: "social" } },
    { event_name: "newsletter_confirmed", visitor_hash: "visitor-a", path: "/en/newsletter/", props: { source: "facebook", utm_medium: "social" } },
    { event_name: "return_session", visitor_hash: "visitor-a", path: "/en/", props: { source: "newsletter" } },
    { event_name: "book_page_viewed", visitor_hash: "visitor-b", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
    { event_name: "amazon_click", visitor_hash: "visitor-b", path: "/en/books/awesome-girls/", props: { book_id: "awesome-girls", source: "google.com" } },
  ],
});

assert.equal(channelScorecard.summary.channels, 3);
assert.equal(channelScorecard.channelRows.find((row) => row.channel === "facebook")?.activations, 1);
assert.equal(channelScorecard.channelRows.find((row) => row.channel === "google.com")?.amazonClicks, 1);
assert.equal(channelScorecard.familyRows.some((row) => row.category === "social" && row.meaningfulActions === 4), true);

const socialFeedback = buildSocialFeedbackLoop({
  contentPerformance: [
    { post_type: "free_resource", platform: "facebook", clicks: 12, reach: 100, likes: 8, comments: 2, shares: 1 },
    { post_type: "book_promo", platform: "instagram", clicks: 0, reach: 100, likes: 3, comments: 0, shares: 0 },
  ],
  pageviews: [
    { path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", utm_source: "facebook", utm_medium: "social", utm_campaign: "sprint_free_coloring", utm_content: "free_resource_01" },
    { path: "/en/coloring-corner/cat/", visitor_hash: "visitor-b", utm_source: "facebook", utm_medium: "social", utm_campaign: "sprint_free_coloring", utm_content: "free_resource_01" },
    { path: "/en/books/awesome-girls/", visitor_hash: "visitor-c", utm_source: "instagram", utm_medium: "social", utm_campaign: "book_promo", utm_content: "book_01" },
  ],
  events: [
    { event_name: "download_success", visitor_hash: "visitor-a", path: "/en/coloring-corner/dino/", props: { source: "facebook", utm_campaign: "sprint_free_coloring", utm_content: "free_resource_01" } },
    { event_name: "newsletter_confirmed", visitor_hash: "visitor-b", path: "/en/newsletter/", props: { source: "facebook", utm_campaign: "sprint_free_coloring", utm_content: "free_resource_01" } },
  ],
  channelScorecard,
  trafficQuality,
});

assert.equal(socialFeedback.summary.topPlatform, "facebook");
assert.equal(socialFeedback.platformRows.find((row) => row.platform === "facebook")?.priority, "Test next");
assert.equal(socialFeedback.contentRows.find((row) => row.contentType === "free_resource")?.meaningfulActions, 4);
assert.equal(socialFeedback.guardrails.some((item) => item.includes("does not schedule")), true);

const languageMarket = buildLanguageMarketReport({
  pageviews: [
    { path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a" },
    { path: "/es/books/awesome-girls/", visitor_hash: "visitor-b" },
  ],
  events: [
    { event_name: "download_success", visitor_hash: "visitor-a", lang: "en", path: "/en/coloring-corner/dino/" },
    { event_name: "book_page_viewed", visitor_hash: "visitor-b", lang: "es", path: "/es/books/awesome-girls/" },
    { event_name: "amazon_click", visitor_hash: "visitor-b", lang: "es", path: "/es/books/awesome-girls/" },
  ],
  subscribers: [
    { confirmed: true, lang_pref: "en" },
    { confirmed: true, lang_pref: "es" },
    { confirmed: false, lang_pref: "es" },
  ],
  profiles: [{ id: "user-a", lang_pref: "en" }],
});

assert.equal(languageMarket.languageRows.find((row) => row.lang === "en")?.confirmedSubscribers, 1);
assert.equal(languageMarket.languageRows.find((row) => row.lang === "es")?.amazonClicks, 1);
assert.equal(languageMarket.languageRows.find((row) => row.lang === "es")?.amazonRate, "50.0%");
assert.equal(languageMarket.futureLanguageRows.every((row) => row.status === "Blocked"), true);

const agentContract = buildAgentKpiInputContract({
  range,
  current: {
    ...currentKpis,
    label: "30 days",
    generatedAtIso: "2026-04-27T12:00:00.000Z",
    events: [{ event_name: "download_success", lang: "en", path: "/en/coloring-corner/dino/", props: { utm_source: "facebook" } }],
    pageviews: [{ path: "/en/coloring-corner/dino/", visitor_hash: "visitor-a", utm_source: "facebook", utm_campaign: "spring", utm_content: "dino" }],
  },
  previous: previousKpis,
  funnel: commandCenter,
  trafficQuality,
  brief,
  audienceSignals,
  firstValue,
  channelScorecard,
  languageMarket,
  amazonAttribution: amazon,
  bookScorecard,
  retention,
  economy,
  resilience,
});

assert.equal(agentContract.contractVersion, "agent_kpi_input_v1");
assert.equal(agentContract.privacy.pii, "excluded");
assert.equal(agentContract.reportRows.find((row) => row.key === "language_market")?.status, "Ready");
assert.equal(agentContract.agentRows.find((row) => row.agent === "Orchestrator Agent")?.readiness, "Ready");
assert.equal(agentContract.recommendationPackets.some((packet) => packet.requires_owner_decision === true), true);

const conversionAgent = buildConversionFunnelAgentReport({
  contract: agentContract,
  funnel: commandCenter,
  trafficQuality,
  firstValue,
  channelScorecard,
  languageMarket,
  amazonAttribution: amazon,
  bookScorecard,
});

assert.equal(conversionAgent.summary.ownerDecisionRequired, true);
assert.equal(conversionAgent.packetRows[0].agent_name, "Conversion Funnel Agent");
assert.equal(conversionAgent.bookPathRows.find((row) => row.id === "awesome-girls")?.amazonClicks, 1);
assert.equal(conversionAgent.guardrails.some((item) => item.includes("not an autonomous AI run")), true);

const communityAgent = buildCommunityEngagementAgentReport({
  profiles: [
    { id: "user-a", notification_prefs: { community: true, giveaway: true, shop: false } },
    { id: "user-b", notification_prefs: {} },
  ],
  events: [
    { event_name: "review_submitted" },
    { event_name: "return_session" },
  ],
  retention,
  economy,
  audienceSignals,
});

assert.equal(communityAgent.summary.status, "Blocked");
assert.equal(communityAgent.preferenceRows.find((row) => row.key === "community")?.optInRate, "50.0%");
assert.equal(communityAgent.packetRows.some((packet) => packet.requires_owner_decision === true), true);
assert.equal(communityAgent.guardrails.some((item) => item.includes("does not send notifications")), true);

console.log("Admin KPI layer OK");