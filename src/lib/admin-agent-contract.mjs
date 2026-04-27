export const AGENT_KPI_CONTRACT_VERSION = "agent_kpi_input_v1";

const AGENT_DEFINITIONS = Object.freeze([
  {
    agent: "Admin Intelligence Agent",
    autonomy: "A0/A1",
    inputs: ["admin_kpis", "funnel", "traffic_quality", "intelligence_brief"],
    output: "Owner brief and data-quality flags",
    approval: "Owner approval before product, campaign, reward, or user-impacting changes",
  },
  {
    agent: "Conversion Funnel Agent",
    autonomy: "A0/A1",
    inputs: ["funnel", "book_scorecard", "amazon_attribution", "first_value"],
    output: "Funnel leak and book-path recommendations",
    approval: "Owner approval before monetization, attribution, or trust-copy changes",
  },
  {
    agent: "Content Agent",
    autonomy: "A0/A2",
    inputs: ["audience_signals", "first_value", "language_market", "book_scorecard"],
    output: "Topic briefs and content hypotheses",
    approval: "Owner approval before publishing strategic content",
  },
  {
    agent: "Social Distribution Agent",
    autonomy: "A0/A2",
    inputs: ["channel_scorecard", "traffic_quality", "language_market"],
    output: "Measured channel and creative recommendations",
    approval: "Owner approval before cadence changes or scheduled posts",
  },
  {
    agent: "Community Engagement Agent",
    autonomy: "A0/A1",
    inputs: ["retention", "economy", "audience_signals", "resilience"],
    output: "Community health and safe re-engagement suggestions",
    approval: "Owner approval before user-facing nudges, rewards, moderation, or notifications",
  },
  {
    agent: "Orchestrator Agent",
    autonomy: "A0/A1",
    inputs: ["intelligence_brief", "channel_scorecard", "language_market", "resilience"],
    output: "Weekly plan proposal with conflicts and blockers",
    approval: "Owner approval for every cross-channel plan or implementation package",
  },
]);

const REPORT_DEFINITIONS = Object.freeze([
  ["admin_kpis", "Admin KPI summary", "fetchAdminKpiWindow"],
  ["funnel", "Funnel Command Center", "buildFunnelCommandCenter"],
  ["traffic_quality", "Traffic Quality", "buildTrafficQualitySummary"],
  ["intelligence_brief", "Admin Intelligence Brief", "buildAdminIntelligenceBrief"],
  ["audience_signals", "Audience Signals", "buildAudienceSignalModel"],
  ["first_value", "First Value Analysis", "buildFirstValueAnalysis"],
  ["channel_scorecard", "Channel Scorecard", "buildChannelScorecard"],
  ["language_market", "Language Market", "buildLanguageMarketReport"],
  ["amazon_attribution", "Amazon Intent Attribution", "buildAmazonAttribution"],
  ["book_scorecard", "Book Scorecard", "buildBookScorecard"],
  ["retention", "Retention Cohorts", "buildRetentionCohorts"],
  ["economy", "Economy Health", "buildEconomyHealth"],
  ["resilience", "Resilience Metrics", "buildResilienceReport"],
]);

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function statusForCurrent(current) {
  const pageviews = count(current?.totalPageviews);
  const events = count(current?.totalEvents);
  if (!pageviews && !events) return "red";
  if (pageviews < 50 || events < 10) return "yellow";
  return "green";
}

function confidenceForCurrent(current) {
  const status = statusForCurrent(current);
  if (status === "green") return "high";
  if (status === "yellow") return "medium";
  return "low";
}

function loadedLimitWarning(current) {
  const loadedEvents = Array.isArray(current?.events) ? current.events.length : 0;
  const loadedPageviews = Array.isArray(current?.pageviews) ? current.pageviews.length : 0;
  return count(current?.totalEvents) > loadedEvents || count(current?.totalPageviews) > loadedPageviews;
}

function missingFields(current) {
  const fields = new Set();
  const pageviews = Array.isArray(current?.pageviews) ? current.pageviews : [];
  const events = Array.isArray(current?.events) ? current.events : [];
  if (pageviews.some((row) => row?.utm_source && !row?.utm_campaign)) fields.add("utm_campaign");
  if (pageviews.some((row) => row?.utm_source && !row?.utm_content)) fields.add("utm_content");
  if (events.some((row) => !row?.lang && !String(row?.path || "").match(/^\/(en|es)(\/|$)/))) fields.add("language");
  return [...fields];
}

function compactRows(rows = [], limit = 5) {
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
}

function summaryForReport(key, reports, current) {
  if (key === "admin_kpis") {
    return {
      totalPageviews: count(current?.totalPageviews),
      totalEvents: count(current?.totalEvents),
      uniqueVisitors: count(current?.uniqueVisitors),
      leadEvents: count(current?.leadEvents),
      activations: count(current?.downloadSuccess),
      bookIntent: count(current?.bookIntent),
      amazonClicks: count(current?.amazonClicks),
    };
  }
  const report = reports[key];
  return report?.summary || report?.stats || {};
}

function reportStatus(key, reports, current) {
  if (key === "admin_kpis") return current ? "Ready" : "Missing";
  return reports[key] ? "Ready" : "Missing";
}

function buildReportRows(reports, current) {
  return REPORT_DEFINITIONS.map(([key, label, source]) => ({
    key,
    label,
    source,
    status: reportStatus(key, reports, current),
    summary: summaryForReport(key, reports, current),
  }));
}

function buildAgentRows(reportRows) {
  const ready = new Set(reportRows.filter((row) => row.status === "Ready").map((row) => row.key));
  return AGENT_DEFINITIONS.map((row) => {
    const missing = row.inputs.filter((input) => !ready.has(input));
    return {
      ...row,
      readiness: missing.length ? "Partial" : "Ready",
      missingInputs: missing,
    };
  });
}

function buildRecommendationPackets({ brief, current, funnel, channelScorecard, languageMarket, resilience }) {
  const packets = [];
  const confidence = confidenceForCurrent(current);
  const sampleSizeWarning = statusForCurrent(current) !== "green";
  if (brief?.recommendedAction) {
    packets.push({
      agent_name: "Admin Intelligence Agent",
      severity: brief.recommendedAction.severity || "neutral",
      area: brief.recommendedAction.area || "Baseline",
      metric: "admin_intelligence_brief",
      finding: brief.recommendedAction.reason || "No stronger finding than baseline continuity.",
      evidence: ["intelligence_brief", "admin_kpis"],
      confidence,
      sample_size_warning: sampleSizeWarning,
      recommended_action: brief.recommendedAction.action,
      requires_owner_decision: true,
      blocked_by: sampleSizeWarning ? ["small_sample"] : [],
    });
  }
  if (funnel?.topLeak) {
    packets.push({
      agent_name: "Conversion Funnel Agent",
      severity: "yellow",
      area: "Funnel",
      metric: `${funnel.topLeak.from} to ${funnel.topLeak.to}`,
      finding: `${funnel.topLeak.lost.toLocaleString()} user/action(s) did not move to the next stage.`,
      evidence: ["funnel"],
      confidence,
      sample_size_warning: sampleSizeWarning,
      recommended_action: "Review the source, language, and landing split before proposing a funnel experiment.",
      requires_owner_decision: true,
      blocked_by: sampleSizeWarning ? ["small_sample"] : [],
    });
  }
  if (channelScorecard?.summary?.topChannel && channelScorecard.summary.topChannel !== "-") {
    packets.push({
      agent_name: "Social Distribution Agent",
      severity: "green",
      area: "Growth",
      metric: "top_channel",
      finding: `${channelScorecard.summary.topChannel} is the top qualified channel in this contract window.`,
      evidence: ["channel_scorecard", "traffic_quality"],
      confidence,
      sample_size_warning: sampleSizeWarning,
      recommended_action: "Use as a hypothesis for measured content selection, not automatic cadence change.",
      requires_owner_decision: true,
      blocked_by: [],
    });
  }
  if (languageMarket?.summary?.topLanguage && languageMarket.summary.topLanguage !== "-") {
    packets.push({
      agent_name: "Content Agent",
      severity: "green",
      area: "Language",
      metric: "top_language",
      finding: `${languageMarket.summary.topLanguage} is the strongest language-market signal in this window.`,
      evidence: ["language_market"],
      confidence,
      sample_size_warning: sampleSizeWarning,
      recommended_action: "Keep EN/ES parity analysis separate from future language expansion decisions.",
      requires_owner_decision: true,
      blocked_by: [],
    });
  }
  if (resilience?.riskRows?.length) {
    packets.push({
      agent_name: "Orchestrator Agent",
      severity: "yellow",
      area: "Resilience",
      metric: "risk_register",
      finding: resilience.riskRows[0].title || "Resilience risk needs owner review.",
      evidence: ["resilience"],
      confidence,
      sample_size_warning: sampleSizeWarning,
      recommended_action: resilience.riskRows[0].nextAction || "Review the risk before changing package priority.",
      requires_owner_decision: true,
      blocked_by: [],
    });
  }
  return packets.slice(0, 6);
}

/**
 * @param {{ range?: Record<string, any>, current?: Record<string, any>, previous?: Record<string, any>, funnel?: Record<string, any>, trafficQuality?: Record<string, any>, brief?: Record<string, any>, audienceSignals?: Record<string, any>, firstValue?: Record<string, any>, channelScorecard?: Record<string, any>, languageMarket?: Record<string, any>, amazonAttribution?: Record<string, any>, bookScorecard?: Record<string, any>, retention?: Record<string, any>, economy?: Record<string, any>, resilience?: Record<string, any>, generatedAtIso?: string }} options
 * @returns {Record<string, any>}
 */
export function buildAgentKpiInputContract(options = {}) {
  const current = options.current || {};
  const range = options.range || current;
  const reports = {
    funnel: options.funnel,
    traffic_quality: options.trafficQuality,
    intelligence_brief: options.brief,
    audience_signals: options.audienceSignals,
    first_value: options.firstValue,
    channel_scorecard: options.channelScorecard,
    language_market: options.languageMarket,
    amazon_attribution: options.amazonAttribution,
    book_scorecard: options.bookScorecard,
    retention: options.retention,
    economy: options.economy,
    resilience: options.resilience,
  };
  const status = statusForCurrent(current);
  const reportRows = buildReportRows(reports, current);
  const agentRows = buildAgentRows(reportRows);
  const generatedAtIso = options.generatedAtIso || range?.generatedAtIso || current?.generatedAtIso || new Date().toISOString();

  return {
    contractVersion: AGENT_KPI_CONTRACT_VERSION,
    generatedAtIso,
    status,
    period: {
      rangeKey: range?.rangeKey || "custom",
      label: range?.label || current?.label || "selected window",
      sinceIso: range?.sinceIso || current?.sinceIso || "",
      untilIso: generatedAtIso,
    },
    dataQuality: {
      status,
      confidence: confidenceForCurrent(current),
      sampleSizeWarning: status !== "green",
      loadedLimitWarning: loadedLimitWarning(current),
      metricDefinitionStatus: loadedLimitWarning(current) ? "partial" : "clear",
      missingFields: missingFields(current),
      evidence: `${count(current.totalPageviews).toLocaleString()} pageviews / ${count(current.totalEvents).toLocaleString()} events`,
    },
    privacy: {
      pii: "excluded",
      actorLevelRows: "not included",
      visitorHashes: "not included",
      amazonAttribution: "buyer_intent_only",
      automation: "disabled",
    },
    metrics: {
      pageviews: count(current.totalPageviews),
      uniqueVisitors: count(current.uniqueVisitors),
      events: count(current.totalEvents),
      leads: count(current.leadEvents),
      registrations: count(current.registerSuccess),
      activations: count(current.downloadSuccess),
      returnEvents: count(current.returnEvents),
      bookIntent: count(current.bookIntent),
      amazonClicks: count(current.amazonClicks),
    },
    reports: {
      funnel: { summary: summaryForReport("funnel", reports, current), topLeak: options.funnel?.topLeak || null, stageRows: compactRows(options.funnel?.stageRows, 9) },
      trafficQuality: { summary: summaryForReport("traffic_quality", reports, current), sourceRows: compactRows(options.trafficQuality?.sourceQualityRows), landingRows: compactRows(options.trafficQuality?.landingQualityRows) },
      intelligenceBrief: { summary: summaryForReport("intelligence_brief", reports, current), recommendedAction: options.brief?.recommendedAction || null, healthRows: compactRows(options.brief?.healthRows, 4) },
      audienceSignals: { summary: summaryForReport("audience_signals", reports, current), segmentRows: compactRows(options.audienceSignals?.segmentRows) },
      firstValue: { summary: summaryForReport("first_value", reports, current), firstValueRows: compactRows(options.firstValue?.firstValueRows) },
      channelScorecard: { summary: summaryForReport("channel_scorecard", reports, current), channelRows: compactRows(options.channelScorecard?.channelRows), familyRows: compactRows(options.channelScorecard?.familyRows) },
      languageMarket: { summary: summaryForReport("language_market", reports, current), languageRows: compactRows(options.languageMarket?.languageRows, 4), futureLanguageRows: compactRows(options.languageMarket?.futureLanguageRows, 4) },
      amazonAttribution: { summary: summaryForReport("amazon_attribution", reports, current), bookRows: compactRows(options.amazonAttribution?.bookRows), sourceRows: compactRows(options.amazonAttribution?.sourceRows) },
      bookScorecard: { summary: summaryForReport("book_scorecard", reports, current), scoreRows: compactRows(options.bookScorecard?.scoreRows), opportunityRows: compactRows(options.bookScorecard?.opportunityRows) },
      retention: { summary: summaryForReport("retention", reports, current), cohortRows: compactRows(options.retention?.cohortRows), sourceRows: compactRows(options.retention?.sourceRows) },
      economy: { summary: summaryForReport("economy", reports, current), signals: compactRows(options.economy?.signals), reasonRows: compactRows(options.economy?.reasonRows) },
      resilience: { summary: summaryForReport("resilience", reports, current), areaRows: compactRows(options.resilience?.areaRows), riskRows: compactRows(options.resilience?.riskRows) },
    },
    reportRows,
    agentRows,
    recommendationPackets: buildRecommendationPackets({ brief: options.brief, current, funnel: options.funnel, channelScorecard: options.channelScorecard, languageMarket: options.languageMarket, resilience: options.resilience }),
    guardrails: [
      "Read-only contract; no agent execution, scheduling, posting, email sending, reward changes, or moderation action.",
      "All recommendations require owner approval before changing public UX, users, campaigns, rewards, or packages.",
      "Amazon clicks are buyer-intent signals only and must not be presented as confirmed KDP sales.",
      "Small samples must stay directional and cannot trigger automated actions.",
      "Raw PII, private user detail, and visitor hashes are excluded from the contract output.",
    ],
    note: "P6-03 defines stable read-only KPI inputs for future agents. It does not run agents or grant autonomy.",
  };
}