import { buildFunnelCommandCenter, buildTrafficQualitySummary, pct } from "./admin-kpis.mjs";

function count(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function trend(currentValue, previousValue) {
  const current = count(currentValue);
  const previous = count(previousValue);
  const delta = current - previous;
  if (!previous && !current) return { delta, label: "flat", tone: "flat" };
  if (!previous) return { delta, label: `+${current.toLocaleString()} new`, tone: "up" };
  const change = delta / previous;
  const sign = delta > 0 ? "+" : "";
  return {
    delta,
    label: `${sign}${delta.toLocaleString()} (${sign}${(change * 100).toFixed(1)}%)`,
    tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

function metric(key, label, currentValue, previousValue) {
  return {
    key,
    label,
    value: count(currentValue),
    valueLabel: count(currentValue).toLocaleString(),
    previousValue: count(previousValue),
    trend: trend(currentValue, previousValue),
  };
}

function health(key, label, status, detail, evidence = "") {
  return { key, label, status, detail, evidence };
}

function finding(area, tone, title, detail, evidence = "") {
  return { area, tone, title, detail, evidence };
}

function qualifiedSource(rows = []) {
  return rows.find((row) => row.meaningfulActions > 0 && !["direct", "internal", "local", "preview"].includes(row.category))
    || rows.find((row) => row.meaningfulActions > 0)
    || rows[0]
    || null;
}

function buildRecommendedAction({ current, funnel, trafficQuality, risks, opportunities }) {
  if (!count(current.totalPageviews) && !count(current.totalEvents)) {
    return {
      severity: "red",
      area: "Data health",
      action: "Confirm tracking delivery before reading growth or funnel movement.",
      reason: "No pageviews or conversion events are present in the selected window.",
    };
  }

  if (count(current.downloadBlocked) > 0) {
    return {
      severity: "yellow",
      area: "Activation",
      action: "Review blocked downloads and lead-magnet reliability before adding acquisition pressure.",
      reason: `${current.downloadBlocked.toLocaleString()} blocked download event(s) appeared in this window.`,
    };
  }

  if (funnel.topLeak && funnel.topLeak.fromCount >= 10 && funnel.topLeak.conversion < 0.15) {
    return {
      severity: "yellow",
      area: "Funnel",
      action: `Inspect the ${funnel.topLeak.from} to ${funnel.topLeak.to} step and adjust the next CTA only after reviewing the source/landing split.`,
      reason: `Current conversion is ${funnel.topLeak.conversionLabel}.`,
    };
  }

  const source = qualifiedSource(trafficQuality.sourceQualityRows);
  if (source?.meaningfulActions > 0) {
    return {
      severity: "green",
      area: "Growth",
      action: `Protect and repeat the best qualified source: ${source.label}.`,
      reason: `${source.meaningfulActions.toLocaleString()} meaningful action(s), ${pct(source.activations, source.pageviews)} activation rate, ${pct(source.amazonClicks, Math.max(source.bookIntent, 1))} Amazon click-through from book intent.`,
    };
  }

  if (count(current.bookIntent) > 0) {
    return {
      severity: "green",
      area: "Books",
      action: "Review book-intent paths and choose one internal link or trust improvement for the strongest title.",
      reason: `${current.bookIntent.toLocaleString()} book-intent event(s) appeared in this window.`,
    };
  }

  return {
    severity: risks.length ? "yellow" : opportunities.length ? "green" : "neutral",
    area: "Baseline",
    action: "Keep collecting baseline data and avoid changing multiple funnel surfaces at once.",
    reason: "The selected window does not yet show a stronger single action than measurement continuity.",
  };
}

/**
 * @param {{ current?: Record<string, any>, previous?: Record<string, any>, funnel?: Record<string, any>, trafficQuality?: Record<string, any> }} options
 * @returns {Record<string, any>}
 */
export function buildAdminIntelligenceBrief(options = {}) {
  const current = options.current || {};
  const previous = options.previous || {};
  const events = current.events || [];
  const pageviews = current.pageviews || [];
  const funnel = options.funnel || buildFunnelCommandCenter({ events, pageviews, summary: current });
  const trafficQuality = options.trafficQuality || buildTrafficQualitySummary({ events, pageviews });

  const metrics = [
    metric("pageviews", "Pageviews", current.totalPageviews, previous.totalPageviews),
    metric("visitors", "Unique visitors", current.uniqueVisitors, previous.uniqueVisitors),
    metric("leads", "Leads", current.leadEvents, previous.leadEvents),
    metric("activations", "Activations", current.downloadSuccess, previous.downloadSuccess),
    metric("bookIntent", "Book intent", current.bookIntent, previous.bookIntent),
    metric("amazonClicks", "Amazon clicks", current.amazonClicks, previous.amazonClicks),
    metric("returnEvents", "Return events", current.returnEvents, previous.returnEvents),
  ];

  const sampleSizeWarning = count(current.totalPageviews) < 50 || count(current.totalEvents) < 10;
  const source = qualifiedSource(trafficQuality.sourceQualityRows);
  const landing = trafficQuality.landingQualityRows?.[0] || null;

  const risks = [];
  if (!count(current.totalPageviews) && !count(current.totalEvents)) {
    risks.push(finding("Data", "red", "No current tracking signal", "No pageviews or conversion events were found in this window.", "pageviews + conversion_events"));
  }
  if (sampleSizeWarning && (count(current.totalPageviews) || count(current.totalEvents))) {
    risks.push(finding("Data", "yellow", "Small sample window", "Treat recommendations as directional until the sample grows.", `${count(current.totalPageviews)} pageviews, ${count(current.totalEvents)} events`));
  }
  if (count(current.downloadBlocked) > 0) {
    risks.push(finding("Activation", "yellow", "Blocked downloads detected", "Lead magnet or eligibility friction may be stopping first value.", `${current.downloadBlocked.toLocaleString()} blocked`));
  }
  if (funnel.topLeak) {
    risks.push(finding("Funnel", "yellow", `${funnel.topLeak.from} to ${funnel.topLeak.to} leak`, `${funnel.topLeak.lost.toLocaleString()} user/action(s) did not move to the next stage.`, funnel.topLeak.conversionLabel));
  }

  const opportunities = [];
  if (source) {
    opportunities.push(finding("Growth", "green", `Best qualified source: ${source.label}`, `${source.meaningfulActions.toLocaleString()} meaningful action(s) from ${source.pageviews.toLocaleString()} pageview(s).`, `${pct(source.activations, source.pageviews)} activation`));
  }
  if (landing) {
    opportunities.push(finding("Landing", "green", `Strongest landing path: ${landing.label}`, `${landing.meaningfulActions.toLocaleString()} meaningful action(s), ${landing.qualityScore.toLocaleString()} quality score.`, `${pct(landing.amazonClicks, Math.max(landing.bookIntent, 1))} Amazon from book intent`));
  }
  if (count(current.amazonClicks) > 0) {
    opportunities.push(finding("Books", "green", "Amazon intent present", `${current.amazonClicks.toLocaleString()} Amazon click(s) from ${current.bookIntent.toLocaleString()} book-intent event(s).`, pct(current.amazonClicks, Math.max(current.bookIntent, 1))));
  }
  if (count(current.communityEvents) > 0) {
    opportunities.push(finding("Community", "green", "Community actions present", `${current.communityEvents.toLocaleString()} community event(s) appeared in the window.`, "reviews/share/art/reaction"));
  }

  const healthRows = [
    health("data", "Data freshness", risks.some((row) => row.area === "Data" && row.tone === "red") ? "red" : sampleSizeWarning ? "yellow" : "green", sampleSizeWarning ? "Small but readable sample" : "Readable current window", `${count(current.totalPageviews)} pageviews / ${count(current.totalEvents)} events`),
    health("funnel", "Funnel movement", funnel.topLeak ? "yellow" : "green", funnel.topLeak ? `${funnel.topLeak.from} -> ${funnel.topLeak.to} is the top leak` : "No leak dominant enough to flag", funnel.topLeak?.conversionLabel || "-"),
    health("growth", "Qualified source", source?.meaningfulActions > 0 ? "green" : "yellow", source ? source.label : "No qualified source yet", source ? `${source.meaningfulActions.toLocaleString()} action(s)` : "-"),
    health("book", "Book intent", count(current.bookIntent) > 0 ? "green" : "yellow", count(current.bookIntent) > 0 ? "Book path is active" : "No book-intent signal in this window", `${count(current.amazonClicks)} Amazon click(s)`),
  ];

  const recommendedAction = buildRecommendedAction({ current, funnel, trafficQuality, risks, opportunities });
  const executiveLines = [
    `${count(current.totalPageviews).toLocaleString()} pageviews and ${count(current.totalEvents).toLocaleString()} events in the current ${current.label || "window"}.`,
    funnel.topLeak ? `Top funnel leak: ${funnel.topLeak.from} -> ${funnel.topLeak.to} (${funnel.topLeak.conversionLabel}).` : "No dominant funnel leak in this window.",
    source ? `Best source signal: ${source.label} with ${source.meaningfulActions.toLocaleString()} meaningful action(s).` : "No qualified source signal yet.",
  ];

  return {
    periodLabel: current.label || "selected window",
    generatedAtIso: current.generatedAtIso || new Date().toISOString(),
    sampleSizeWarning,
    metrics,
    healthRows,
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
    recommendedAction,
    executiveLines,
  };
}