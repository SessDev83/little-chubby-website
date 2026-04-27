import { pct } from "./admin-kpis.mjs";

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function confidenceFromContract(contract) {
  return contract?.dataQuality?.confidence || "low";
}

function sampleWarningFromContract(contract) {
  return Boolean(contract?.dataQuality?.sampleSizeWarning || contract?.status === "yellow" || contract?.status === "red");
}

function row(priority, area, title, finding, evidence, recommendedAction, blockedBy = []) {
  return { priority, area, title, finding, evidence, recommendedAction, requiresOwnerDecision: true, blockedBy };
}

function packet({ severity, area, metric, finding, evidence, recommendedAction, confidence, sampleSizeWarning, blockedBy = [] }) {
  return {
    agent_name: "Conversion Funnel Agent",
    severity,
    area,
    metric,
    finding,
    evidence,
    confidence,
    sample_size_warning: sampleSizeWarning,
    recommended_action: recommendedAction,
    requires_owner_decision: true,
    blocked_by: blockedBy,
  };
}

function bookPathRows(bookScorecard) {
  const rows = Array.isArray(bookScorecard?.scoreRows) ? bookScorecard.scoreRows : [];
  return rows
    .filter((book) => count(book.bookIntent) > 0 || count(book.amazonClicks) > 0 || book.recommendedAction !== "No recent signal")
    .map((book) => ({
      id: book.id,
      title: book.title,
      bookIntent: count(book.bookIntent),
      amazonClicks: count(book.amazonClicks),
      amazonRate: book.amazonRate || pct(count(book.amazonClicks), Math.max(count(book.bookIntent), 1)),
      sampleRate: book.sampleRate || "0.0%",
      reviews: count(book.approvedReviews),
      pendingReviews: count(book.pendingReviews),
      topSource: book.topSource || "-",
      topLang: book.topLang || "-",
      recommendedAction: book.recommendedAction || "Monitor",
      score: count(book.score),
    }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.score - a.score)
    .slice(0, 12);
}

function sourcePathRows(amazonAttribution, trafficQuality) {
  const sourceRows = Array.isArray(amazonAttribution?.sourceRows) ? amazonAttribution.sourceRows : [];
  const trafficRows = Array.isArray(trafficQuality?.sourceQualityRows) ? trafficQuality.sourceQualityRows : [];
  const trafficMap = new Map(trafficRows.map((row) => [row.label, row]));
  return sourceRows
    .map((source) => {
      const traffic = trafficMap.get(source.source) || {};
      return {
        source: source.source,
        pageviews: count(traffic.pageviews),
        bookIntent: count(source.bookIntent),
        amazonClicks: count(source.amazonClicks),
        amazonRate: source.amazonRate || pct(count(source.amazonClicks), Math.max(count(source.bookIntent), 1)),
        topBook: source.topBook || "-",
        activationRate: traffic.pageviews ? pct(count(traffic.activations), count(traffic.pageviews)) : "0.0%",
        action: count(source.bookIntent) > 0 && count(source.amazonClicks) === 0 ? "Inspect book-to-Amazon path" : "Monitor",
      };
    })
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || b.pageviews - a.pageviews)
    .slice(0, 10);
}

function firstValueRows(firstValue) {
  const rows = Array.isArray(firstValue?.firstValueRows) ? firstValue.firstValueRows : [];
  return rows
    .map((item) => ({
      firstValue: item.firstValue,
      actors: count(item.actors),
      returnRate: item.returnRate || "0.0%",
      bookIntentRate: item.bookIntentRate || "0.0%",
      amazonRate: item.amazonRate || "0.0%",
      topSource: item.topSource || "-",
      topFollowup: item.topFollowup || "-",
      recommendation: item.recommendation || "Monitor",
      sampleWarning: item.sampleWarning || "Small sample",
      score: count(item.score),
    }))
    .sort((a, b) => b.score - a.score || b.actors - a.actors)
    .slice(0, 10);
}

function buildFocusRows({ contract, funnel, bookScorecard, amazonAttribution, firstValue, channelScorecard, languageMarket }) {
  const blockedBy = sampleWarningFromContract(contract) ? ["small_sample"] : [];
  const focus = [];

  if (funnel?.topLeak) {
    focus.push(row(
      "High",
      "Funnel",
      `${funnel.topLeak.from} to ${funnel.topLeak.to}`,
      `${funnel.topLeak.lost.toLocaleString()} user/action(s) did not move to the next stage; conversion is ${funnel.topLeak.conversionLabel}.`,
      "funnel.topLeak",
      "Review source, language, and landing split before proposing one funnel experiment.",
      blockedBy,
    ));
  }

  const weakestBook = (bookScorecard?.opportunityRows || []).find((book) => book.recommendedAction === "Review Amazon path" || book.recommendedAction === "Strengthen sample path")
    || (bookScorecard?.scoreRows || []).find((book) => count(book.bookIntent) > 0 && count(book.amazonClicks) === 0);
  if (weakestBook) {
    focus.push(row(
      "High",
      "Books",
      weakestBook.title || weakestBook.id,
      `${count(weakestBook.bookIntent).toLocaleString()} book-intent action(s) with ${count(weakestBook.amazonClicks).toLocaleString()} Amazon click(s).`,
      "book_scorecard.opportunityRows",
      weakestBook.recommendedAction === "Strengthen sample path" ? "Improve the sample path before increasing book traffic." : "Inspect the Amazon handoff before claiming a book-path win.",
      blockedBy,
    ));
  }

  const sourceGap = (amazonAttribution?.sourceRows || []).find((source) => count(source.bookIntent) > 0 && count(source.amazonClicks) === 0);
  if (sourceGap) {
    focus.push(row(
      "Medium",
      "Source to book",
      sourceGap.source,
      `${count(sourceGap.bookIntent).toLocaleString()} book-intent action(s) have not produced Amazon clicks from this source.`,
      "amazon_attribution.sourceRows",
      "Compare the source landing path with the book page and sample path before adding promotion.",
      blockedBy,
    ));
  }

  const firstValueGap = (firstValue?.firstValueRows || []).find((item) => count(item.bookIntent) > 0 && count(item.amazonClicks) === 0)
    || (firstValue?.firstValueRows || []).find((item) => item.recommendation === "Add a clearer next step");
  if (firstValueGap) {
    focus.push(row(
      "Medium",
      "First value",
      firstValueGap.firstValue,
      `${count(firstValueGap.actors).toLocaleString()} actor(s), ${firstValueGap.bookIntentRate || "0.0%"} book-intent rate, ${firstValueGap.amazonRate || "0.0%"} Amazon rate.`,
      "first_value.firstValueRows",
      "Map the next step after this first value before changing onboarding or email.",
      blockedBy,
    ));
  }

  if (channelScorecard?.summary?.topChannel && channelScorecard.summary.topChannel !== "-") {
    focus.push(row(
      "Medium",
      "Channel",
      channelScorecard.summary.topChannel,
      `Top channel priority is ${channelScorecard.summary.topPriority || "unknown"} with ${count(channelScorecard.summary.totalMeaningfulActions).toLocaleString()} meaningful action(s).`,
      "channel_scorecard.summary",
      "Treat the channel signal as routing evidence, not permission to change cadence automatically.",
      blockedBy,
    ));
  }

  if (languageMarket?.summary?.topLanguage && languageMarket.summary.topLanguage !== "-") {
    focus.push(row(
      "Low",
      "Language",
      languageMarket.summary.topLanguage,
      `Top language posture is ${languageMarket.summary.topPosture || "unknown"}.`,
      "language_market.summary",
      "Keep EN/ES path quality in view when recommending book or source experiments.",
      blockedBy,
    ));
  }

  return focus.slice(0, 8);
}

function packetsFromFocusRows(focusRows, contract) {
  const confidence = confidenceFromContract(contract);
  const sampleSizeWarning = sampleWarningFromContract(contract);
  return focusRows.map((focus) => packet({
    severity: focus.priority === "High" ? "yellow" : focus.priority === "Medium" ? "green" : "neutral",
    area: focus.area,
    metric: focus.title,
    finding: focus.finding,
    evidence: [focus.evidence],
    confidence,
    sampleSizeWarning,
    recommendedAction: focus.recommendedAction,
    blockedBy: focus.blockedBy,
  }));
}

/**
 * @param {{ contract?: Record<string, any>, funnel?: Record<string, any>, trafficQuality?: Record<string, any>, firstValue?: Record<string, any>, amazonAttribution?: Record<string, any>, bookScorecard?: Record<string, any>, channelScorecard?: Record<string, any>, languageMarket?: Record<string, any> }} options
 * @returns {Record<string, any>}
 */
export function buildConversionFunnelAgentReport(options = {}) {
  const focusRows = buildFocusRows(options);
  const packets = packetsFromFocusRows(focusRows, options.contract);
  const books = bookPathRows(options.bookScorecard);
  const sources = sourcePathRows(options.amazonAttribution, options.trafficQuality);
  const firstValues = firstValueRows(options.firstValue);
  const highPriority = focusRows.filter((item) => item.priority === "High").length;
  const bookIntent = count(options.bookScorecard?.summary?.bookIntent || options.amazonAttribution?.summary?.bookIntent);
  const amazonClicks = count(options.bookScorecard?.summary?.amazonClicks || options.amazonAttribution?.summary?.amazonClicks);
  const status = options.contract?.status === "red" ? "Blocked" : highPriority ? "Review" : focusRows.length ? "Watch" : "Baseline";

  return {
    summary: {
      status,
      focusItems: focusRows.length,
      highPriority,
      bookIntent,
      amazonClicks,
      amazonRate: pct(amazonClicks, Math.max(bookIntent, 1)),
      confidence: confidenceFromContract(options.contract),
      sampleSizeWarning: sampleWarningFromContract(options.contract),
      ownerDecisionRequired: focusRows.length > 0,
      topFocus: focusRows[0]?.title || "No dominant conversion focus",
    },
    focusRows,
    packetRows: packets,
    bookPathRows: books,
    sourcePathRows: sources,
    firstValueRows: firstValues,
    guardrails: [
      "This is deterministic analysis, not an autonomous AI run.",
      "Every recommendation remains owner-review only.",
      "Amazon clicks are buyer-intent signals only, not confirmed sales.",
      "Do not change public UX, email, social cadence, rewards, or moderation from this report alone.",
    ],
    note: "P6-04 reads the P6-03 KPI contract and produces owner-review conversion recommendations without executing agents or actions.",
  };
}