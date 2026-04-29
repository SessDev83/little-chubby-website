import { eventProp, stageLabelForEvent, sourceForEvent } from "./admin-kpis.mjs";

const STAGE_RANK = Object.freeze({
  Lead: 1,
  Registered: 2,
  Activated: 3,
  Engaged: 4,
  Community: 5,
  "Book Intent": 6,
  "Amazon Click": 7,
  Return: 8,
});

const BOOK_CATEGORY_HINTS = Object.freeze([
  [/(animal|easy-animals|dinosaur|farm|nature)/i, "Animals & nature"],
  [/(space|astronaut|blast-off)/i, "Space"],
  [/(machine|airplane|truck|mighty)/i, "Machines"],
  [/(emotion|feelings)/i, "Emotions"],
  [/(pizza|sweet|food|drink)/i, "Food & treats"],
  [/(easter|holiday)/i, "Seasonal"],
  [/(alphabet|learning|school)/i, "Learning"],
  [/(awesome-girls|awesome-boys|cozy-kids)/i, "Kids favorites"],
]);

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newestDate(values) {
  return values
    .map(validDate)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function oldestDate(values) {
  return values
    .map(validDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

function eventLabel(event) {
  return event?.event_name || event?.type || "activity";
}

function pathParts(path = "") {
  const clean = String(path || "").split(/[?#]/)[0];
  const parts = clean.split("/").filter(Boolean);
  const lang = parts[0] === "en" || parts[0] === "es" ? parts[0] : "";
  const offset = lang ? 1 : 0;
  return { clean, lang, section: parts[offset] || "home", id: parts[offset + 1] || "" };
}

function titleize(value = "") {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function pathLabel(path = "") {
  const { clean, section, id } = pathParts(path);
  if (!clean || clean === "/") return "Visited home";
  if (section === "books" && id) return `Viewed book: ${titleize(id)}`;
  if (section === "blog" && id) return `Read blog: ${titleize(id)}`;
  if (section === "coloring-corner" && id) return `Viewed artwork: ${titleize(id)}`;
  if (section === "coloring-corner") return "Browsed coloring corner";
  if (section === "newsletter") return "Viewed newsletter page";
  if (section === "lottery") return "Viewed lottery";
  if (section === "profile") return "Opened profile";
  return `Viewed ${titleize(section || clean)}`;
}

function contentSignalFromPath(path = "") {
  const { section, id, clean } = pathParts(path);
  if (section === "books" && id) return { type: "book", id, label: titleize(id) };
  if (section === "blog" && id) return { type: "blog", id, label: titleize(id) };
  if (section === "coloring-corner" && id) return { type: "artwork", id, label: titleize(id) };
  if (section === "coloring-corner") return { type: "section", id: "coloring-corner", label: "Coloring corner" };
  if (clean === "/" || section === "home") return { type: "page", id: "home", label: "Home" };
  return section ? { type: "page", id: section, label: titleize(section) } : null;
}

function categoryForSignal(signal) {
  const text = `${signal?.id || ""} ${signal?.label || ""}`;
  for (const [pattern, category] of BOOK_CATEGORY_HINTS) {
    if (pattern.test(text)) return category;
  }
  if (signal?.type === "blog") return "Learning content";
  if (signal?.type === "artwork") return "Coloring pages";
  return signal?.label || "General";
}

function bump(map, key, amount = 1) {
  const label = String(key || "").trim();
  if (!label) return;
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntries(map, limit = 4) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function pickHighestStage(stages) {
  return [...stages].sort((a, b) => (STAGE_RANK[b] || 0) - (STAGE_RANK[a] || 0))[0] || "Registered";
}

function retentionStatus(lastActionAt, now = new Date()) {
  if (!lastActionAt) return { label: "Unknown", tone: "quiet" };
  const days = Math.floor((now.getTime() - lastActionAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 7) return { label: "Active", tone: "good", daysSinceAction: days };
  if (days <= 30) return { label: "Recent", tone: "good", daysSinceAction: days };
  if (days <= 90) return { label: "Cooling", tone: "warn", daysSinceAction: days };
  return { label: "Dormant", tone: "danger", daysSinceAction: days };
}

function pushTimeline(timeline, item) {
  const date = validDate(item.at);
  if (!date) return;
  timeline.push({ ...item, at: date.toISOString() });
}

function sourceFromPageview(pageview) {
  return pageview?.utm_source || pageview?.referrer || "direct";
}

function segmentFromSignals({ downloads, reviews, credits, tickets, badges, lotteryEntries, conversionEvents, pageviews, topCategories }) {
  const scores = new Map();
  const add = (name, amount) => bump(scores, name, amount);

  if (downloads.length) add("Free-Only Downloader", downloads.length * 2);
  if (reviews.length) add("Community Creator", reviews.length * 3);
  if (lotteryEntries.length || tickets.length || credits.some((row) => /lottery|ticket|giveaway/i.test(row.reason || ""))) add("Giveaway Participant", 3);
  if (badges.length || credits.some((row) => /badge|boost|highlight|pin/i.test(row.reason || ""))) add("Community Creator", 2);
  if (conversionEvents.some((event) => event?.event_name === "amazon_click")) add("Gift Shopper", 3);
  if (conversionEvents.some((event) => /book_page_viewed|sample_viewed|sample_cta_click/.test(event?.event_name || ""))) add("Parent/Caregiver", 2);
  if (topCategories.some((item) => /Learning|Emotions/i.test(item.label))) add("Educator/Homeschool", 2);
  if (topCategories.some((item) => /Adult|Chic|Style/i.test(item.label))) add("Adult Colorist", 2);

  const langs = new Set([
    ...conversionEvents.map((event) => event?.lang).filter(Boolean),
    ...pageviews.map((pageview) => pathParts(pageview?.path || "").lang).filter(Boolean),
  ]);
  if (langs.has("en") && langs.has("es")) add("Bilingual Family", 3);

  if (!scores.size && (pageviews.length || conversionEvents.length)) add("Parent/Caregiver", 1);
  const ranked = topEntries(scores, 3);
  const primarySegment = ranked[0]?.label || "Unknown";
  const confidence = (ranked[0]?.count || 0) >= 5 ? "High" : (ranked[0]?.count || 0) >= 2 ? "Medium" : "Low";
  return { primarySegment, confidence, segments: ranked };
}

function buildFrictionFlags({ newsletterSub, downloads, reviews, conversionEvents, pageviews }) {
  const flags = [];
  const hasBookIntent = conversionEvents.some((event) => /book_page_viewed|sample_viewed|sample_cta_click|amazon_click/.test(event?.event_name || "")) || pageviews.some((pageview) => pathParts(pageview?.path || "").section === "books");
  const hasAmazonClick = conversionEvents.some((event) => event?.event_name === "amazon_click");
  if (!newsletterSub) flags.push("Not on newsletter yet");
  else if (!newsletterSub.confirmed) flags.push("Newsletter pending");
  if (hasBookIntent && !hasAmazonClick) flags.push("Book interest without Amazon click");
  if (downloads.length && !reviews.length) flags.push("Downloads without review yet");
  if (!downloads.length && hasBookIntent) flags.push("Interest before first download");
  if (!flags.length) flags.push("No obvious friction");
  return flags.slice(0, 4);
}

export function formatUserJourneyTime(iso) {
  const date = validDate(iso);
  if (!date) return "-";
  return date.toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function buildAdminUserJourney(options = {}) {
  const {
    profile = {},
    newsletterSub = null,
    reviews = [],
    credits = [],
    tickets = [],
    badges = [],
    lotteryEntries = [],
    downloads = [],
    conversionEvents = [],
    pageviews = [],
    analyticsIdentities = [],
    now = new Date(),
  } = options;

  const stages = ["Registered"];
  if (newsletterSub) stages.push("Lead");
  if (downloads.length || credits.some((row) => row.reason === "download")) stages.push("Activated");
  if (credits.length || tickets.length || lotteryEntries.length || badges.length) stages.push("Engaged");
  if (reviews.length) stages.push("Community");
  for (const event of conversionEvents) {
    const stage = stageLabelForEvent(event);
    if (STAGE_RANK[stage]) stages.push(stage);
  }
  if (pageviews.length) stages.push("Visit");
  const lifecycleStage = profile.suspended ? "Suspended" : pickHighestStage(stages);

  const timeline = [];
  pushTimeline(timeline, { at: profile.created_at, type: "profile", label: "Registered", detail: profile.email || profile.display_name || "Profile created" });
  if (newsletterSub) {
    pushTimeline(timeline, {
      at: newsletterSub.created_at,
      type: "newsletter",
      label: newsletterSub.confirmed ? "Newsletter confirmed" : "Newsletter pending",
      detail: newsletterSub.source || "newsletter",
    });
  }
  for (const row of downloads) pushTimeline(timeline, { at: row.downloaded_at, type: "download", label: "Artwork download", detail: row.artwork_id });
  for (const row of reviews) pushTimeline(timeline, { at: row.submitted_at, type: "review", label: `Review ${row.status || "submitted"}`, detail: row.book_id });
  for (const row of credits) pushTimeline(timeline, { at: row.created_at, type: "peanuts", label: `${row.amount >= 0 ? "+" : ""}${row.amount} peanuts`, detail: row.reason || row.ref_id || "credit" });
  for (const row of tickets) pushTimeline(timeline, { at: row.created_at, type: "tickets", label: `${row.amount >= 0 ? "+" : ""}${row.amount} tickets`, detail: row.reason || row.ref_id || "ticket" });
  for (const row of lotteryEntries) pushTimeline(timeline, { at: row.purchased_at, type: "lottery", label: `${row.entry_count || 0} lottery entries`, detail: row.month });
  for (const row of badges) pushTimeline(timeline, { at: row.purchased_at, type: "badge", label: row.active ? "Badge active" : "Badge inactive", detail: row.badge_type });
  for (const pageview of pageviews) {
    pushTimeline(timeline, {
      at: pageview.created_at,
      type: "pageview",
      label: pathLabel(pageview.path),
      detail: sourceFromPageview(pageview),
      timezone: pageview.timezone,
    });
  }
  for (const event of conversionEvents) {
    pushTimeline(timeline, {
      at: event.created_at,
      type: "event",
      label: eventLabel(event),
      detail: event.path || sourceForEvent(event),
      stage: stageLabelForEvent(event),
    });
  }
  timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const categoryScores = new Map();
  const contentScores = new Map();
  const sourceScores = new Map();
  for (const pageview of pageviews) {
    const signal = contentSignalFromPath(pageview?.path || "");
    if (signal) {
      bump(contentScores, `${signal.type}: ${signal.label}`);
      bump(categoryScores, categoryForSignal(signal));
    }
    bump(sourceScores, sourceFromPageview(pageview));
  }
  for (const event of conversionEvents) {
    const signal = eventProp(event, "book_id")
      ? { type: "book", id: eventProp(event, "book_id"), label: titleize(eventProp(event, "book_id")) }
      : eventProp(event, "artwork_id")
        ? { type: "artwork", id: eventProp(event, "artwork_id"), label: titleize(eventProp(event, "artwork_id")) }
        : contentSignalFromPath(event?.path || "");
    if (signal) {
      bump(contentScores, `${signal.type}: ${signal.label}`, event?.event_name === "amazon_click" ? 3 : 2);
      bump(categoryScores, categoryForSignal(signal), event?.event_name === "download_completed" ? 3 : 2);
    }
    bump(sourceScores, sourceForEvent(event));
  }

  const topInterests = topEntries(categoryScores, 4);
  const topContent = topEntries(contentScores, 5);
  const topSources = topEntries(sourceScores, 4);
  const segment = segmentFromSignals({ downloads, reviews, credits, tickets, badges, lotteryEntries, conversionEvents, pageviews, topCategories: topInterests });

  const firstValueAt = oldestDate([
    ...downloads.map((row) => row.downloaded_at),
    ...reviews.map((row) => row.submitted_at),
    ...credits.map((row) => row.created_at),
    newsletterSub?.created_at,
    profile.created_at,
  ]);
  const lastActionAt = newestDate(timeline.map((row) => row.at));
  const lastSeenAt = newestDate([
    ...pageviews.map((row) => row.created_at),
    ...conversionEvents.map((row) => row.created_at),
    ...analyticsIdentities.map((row) => row.last_seen_at),
  ]) || lastActionAt;
  const firstConversionEvent = [...conversionEvents].sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""))[0] || null;
  const firstPageview = [...pageviews].sort((a, b) => Date.parse(a.created_at || "") - Date.parse(b.created_at || ""))[0] || null;
  const acquisitionSource = firstConversionEvent ? sourceForEvent(firstConversionEvent) : firstPageview ? sourceFromPageview(firstPageview) : newsletterSub?.source || "registered";
  const acquisitionLanding = firstConversionEvent?.props?.landing_page || firstConversionEvent?.path || firstPageview?.landing_page || firstPageview?.path || "-";
  const retention = profile.suspended ? { label: "Suspended", tone: "danger" } : retentionStatus(lastActionAt, now);
  const frictionFlags = buildFrictionFlags({ newsletterSub, downloads, reviews, conversionEvents, pageviews });

  const nextBestAction = profile.suspended
    ? "Review suspension"
    : !newsletterSub
      ? "Invite newsletter"
      : !newsletterSub.confirmed
        ? "Resend confirmation"
        : !downloads.length
          ? "Encourage first download"
          : !reviews.length
            ? "Invite review"
            : conversionEvents.some((event) => /book_page_viewed|sample_viewed/.test(event?.event_name || "")) && !conversionEvents.some((event) => event?.event_name === "amazon_click")
              ? "Nudge book/Amazon path"
              : "Maintain relationship";

  const lastUseful = timeline.find((item) => item.type !== "pageview") || timeline[0] || null;
  const interestText = topInterests.length ? topInterests.map((item) => item.label).join(", ") : "not enough signal yet";
  const agentSummary = `${segment.primarySegment} (${segment.confidence.toLowerCase()} confidence). Interests: ${interestText}. Last useful action: ${lastUseful?.label || "none yet"}. Next: ${nextBestAction}.`;

  return {
    lifecycleStage,
    primarySegment: segment.primarySegment,
    segmentConfidence: segment.confidence,
    segmentCandidates: segment.segments,
    acquisitionSource,
    acquisitionLanding,
    firstValueAt: firstValueAt?.toISOString() || null,
    lastActionAt: lastActionAt?.toISOString() || null,
    lastSeenAt: lastSeenAt?.toISOString() || null,
    retention,
    nextBestAction,
    topInterests,
    topContent,
    topSources,
    frictionFlags,
    agentSummary,
    linkedIdentityCount: analyticsIdentities.length,
    timeline: timeline.slice(0, 30),
    counts: {
      pageviews: pageviews.length,
      reviews: reviews.length,
      downloads: downloads.length,
      credits: credits.length,
      tickets: tickets.length,
      badges: badges.length,
      lotteryEntries: lotteryEntries.length,
      conversionEvents: conversionEvents.length,
      linkedIdentities: analyticsIdentities.length,
    },
  };
}
