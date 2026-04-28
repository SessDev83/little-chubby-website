import { adminTimeZoneSummary } from "./admin-time.mjs";

const AREA_MAP = Object.freeze({
  Data: { phases: ["Phase 1", "Phase 13"], decisions: ["MEA-01", "MEA-02", "AGT-09"], packages: ["P5-01", "P5-02", "P5-ADM-10", "P5-ADM-11"] },
  Activation: { phases: ["Phase 1", "Phase 5", "Phase 13"], decisions: ["MEA-01", "EML-01"], packages: ["P5-09", "P5-12", "P5-ADM-03"] },
  Funnel: { phases: ["Phase 1", "Phase 13"], decisions: ["MEA-02", "ADM-03"], packages: ["P5-ADM-03", "P5-ADM-10"] },
  Growth: { phases: ["Phase 6"], decisions: ["GRW-01", "GRW-06"], packages: ["P5-GRW-01", "P5-GRW-02", "P6-01"] },
  Landing: { phases: ["Phase 6", "Phase 10"], decisions: ["GRW-04", "GRW-06"], packages: ["P5-GRW-01", "P5-GRW-02", "P5-19"] },
  Books: { phases: ["Phase 4"], decisions: ["INC-01", "INC-06"], packages: ["P5-06", "P5-17", "P5-20"] },
  Community: { phases: ["Phase 12"], decisions: ["COM-01", "COM-07"], packages: ["P5-COM-01", "P5-COM-02"] },
  Baseline: { phases: ["Phase 10", "Phase 13"], decisions: ["ADM-04", "AGT-09"], packages: ["P5-ADM-10", "P5-ADM-11"] },
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function addMapped(set, values = []) {
  for (const value of values) set.add(value);
}

function formatDate(iso) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function isoWeek(date) {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((normalized.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: normalized.getUTCFullYear(), week };
}

function entryIdFor(iso) {
  const date = iso ? new Date(iso) : new Date();
  const { year, week } = isoWeek(Number.isNaN(date.getTime()) ? new Date() : date);
  return `WIL-${year}-W${String(week).padStart(2, "0")}`;
}

function dataQuality(brief) {
  if (asArray(brief.healthRows).some((row) => row.status === "red")) return "red";
  if (brief.sampleSizeWarning || asArray(brief.healthRows).some((row) => row.status === "yellow")) return "yellow";
  return "green";
}

function confidence(brief) {
  const quality = dataQuality(brief);
  if (quality === "red") return "low";
  if (brief.sampleSizeWarning || quality === "yellow") return "low-to-medium";
  return "medium";
}

function topMetric(metrics, key) {
  return asArray(metrics).find((item) => item.key === key)?.valueLabel || "0";
}

function topSource(trafficQuality) {
  const rows = asArray(trafficQuality?.sourceQualityRows);
  const row = rows.find((item) => item.meaningfulActions > 0) || rows[0];
  return row ? `${row.label} (${Number(row.pageviews || 0).toLocaleString()} pageviews)` : "-";
}

function topLanding(trafficQuality) {
  const rows = asArray(trafficQuality?.landingQualityRows);
  const row = rows.find((item) => item.meaningfulActions > 0) || rows[0];
  return row ? `${row.label} (${Number(row.meaningfulActions || 0).toLocaleString()} actions)` : "-";
}

function mappedAreas(brief) {
  const phases = new Set(["Phase 7", "Phase 13"]);
  const decisions = new Set(["ADM-04", "ADM-06", "AGT-09"]);
  const packages = new Set(["P5-ADM-10", "P5-ADM-11"]);
  const areas = [brief.recommendedAction?.area, ...asArray(brief.risks).map((row) => row.area), ...asArray(brief.opportunities).map((row) => row.area)];

  for (const area of areas) {
    const mapping = AREA_MAP[area] || AREA_MAP.Baseline;
    addMapped(phases, mapping.phases);
    addMapped(decisions, mapping.decisions);
    addMapped(packages, mapping.packages);
  }

  return { phases: [...phases], decisions: [...decisions], packages: [...packages] };
}

function changedLines(metrics) {
  return asArray(metrics)
    .filter((item) => item.trend?.tone && item.trend.tone !== "flat")
    .slice(0, 4)
    .map((item) => `${item.label}: ${item.trend.label}`);
}

/**
 * @param {{ brief?: Record<string, any>, current?: Record<string, any>, previous?: Record<string, any>, trafficQuality?: Record<string, any>, generatedAtIso?: string }} options
 * @returns {Record<string, any>}
 */
export function buildLearningLedgerEntry(options = {}) {
  const brief = options.brief || {};
  const current = options.current || {};
  const generatedAtIso = options.generatedAtIso || brief.generatedAtIso || new Date().toISOString();
  const mapping = mappedAreas(brief);
  const changes = changedLines(brief.metrics);
  const risks = asArray(brief.risks);
  const opportunities = asArray(brief.opportunities);

  return {
    entryId: entryIdFor(generatedAtIso),
    periodCovered: `${current.label || brief.periodLabel || "selected window"} ending ${formatDate(generatedAtIso)}`,
    reportReceivedDate: formatDate(generatedAtIso),
    reportSources: ["Admin Intelligence Brief", "conversion_events", "pageviews", "Traffic Quality Summary"],
    timezone: `UTC event timestamps; admin display locked to ${adminTimeZoneSummary(new Date(generatedAtIso))}`,
    dataQuality: dataQuality(brief),
    confidence: confidence(brief),
    topMetrics: [
      ["Pageviews", topMetric(brief.metrics, "pageviews")],
      ["Unique visitors", topMetric(brief.metrics, "visitors")],
      ["Leads", topMetric(brief.metrics, "leads")],
      ["Registrations", Number(current.registerSuccess || 0).toLocaleString()],
      ["Downloads", topMetric(brief.metrics, "activations")],
      ["Engagement", Number(current.engagedEvents || 0).toLocaleString()],
      ["Amazon clicks", topMetric(brief.metrics, "amazonClicks")],
      ["Top traffic source", topSource(options.trafficQuality)],
      ["Top landing path", topLanding(options.trafficQuality)],
    ],
    whatHappened: asArray(brief.executiveLines),
    whatChanged: changes.length ? changes : ["No major movement from the comparison window."],
    whatRepeated: ["Repeat evidence requires at least 2-4 saved ledger entries before package priority changes."],
    whatIsNewOrSurprising: opportunities.slice(0, 2).map((row) => `${row.title}: ${row.detail}`),
    dataQualityIssues: risks.filter((row) => row.area === "Data").map((row) => `${row.title}: ${row.detail}`),
    hypotheses: [...risks, ...opportunities].slice(0, 5).map((row) => `${row.area}: ${row.title}`),
    recommendedExperiment: brief.recommendedAction?.action || "Keep collecting baseline data before changing the roadmap.",
    ownerDecisionNeeded: brief.recommendedAction?.severity === "red" ? "Review data health before approving new experiments." : "Approve, edit, defer, or reject the recommended next action.",
    nextReviewDate: "Next weekly review, then monthly synthesis after four saved entries.",
    affectedPhases: mapping.phases,
    affectedDecisions: mapping.decisions,
    affectedPackages: mapping.packages,
  };
}

function bulletList(items) {
  const rows = asArray(items).filter(Boolean);
  return rows.length ? rows.map((item) => `- ${item}`).join("\n") : "- None";
}

function metricTable(metrics) {
  return asArray(metrics).map(([label, value]) => `| ${label} | ${value} |`).join("\n");
}

export function renderLearningLedgerMarkdown(entry) {
  return `## ${entry.entryId} Weekly Intelligence\n\n**Entry ID:** \`${entry.entryId}\`  \n**Period covered:** ${entry.periodCovered}  \n**Report received date:** ${entry.reportReceivedDate}  \n**Report sources:** ${asArray(entry.reportSources).join(", ")}  \n**Timezone:** ${entry.timezone}  \n**Data quality:** ${entry.dataQuality}  \n**Confidence:** ${entry.confidence}\n\n### Top Metrics\n\n| Metric | Value |\n|---|---:|\n${metricTable(entry.topMetrics)}\n\n### What Happened\n\n${bulletList(entry.whatHappened)}\n\n### What Changed\n\n${bulletList(entry.whatChanged)}\n\n### What Repeated From Previous Periods\n\n${bulletList(entry.whatRepeated)}\n\n### What Is New Or Surprising\n\n${bulletList(entry.whatIsNewOrSurprising)}\n\n### Data Quality Issues\n\n${bulletList(entry.dataQualityIssues)}\n\n### Hypotheses\n\n${bulletList(entry.hypotheses)}\n\n### Recommended Experiment\n\n${entry.recommendedExperiment}\n\n### Affected Phases\n\n${bulletList(entry.affectedPhases)}\n\n### Affected Decisions\n\n${bulletList(entry.affectedDecisions.map((decision) => `\`${decision}\``))}\n\n### Affected Packages\n\n${bulletList(entry.affectedPackages.map((pkg) => `\`${pkg}\``))}\n\n### Owner Decision Needed\n\n${entry.ownerDecisionNeeded}\n\n### Next Review Date\n\n${entry.nextReviewDate}\n`;
}