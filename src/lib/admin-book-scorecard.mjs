import { eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";

const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);

function asinFromUrl(url) {
  const match = String(url || "").match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : "";
}

function titleFor(book) {
  return book?.title?.en || book?.title?.es || book?.id || "Unknown book";
}

function bookBase(book) {
  return {
    id: book.id,
    title: titleFor(book),
    asin: asinFromUrl(book.amazonUrl),
    amazonUrl: book.amazonUrl || "",
    ageRange: book.ageRange?.en || book.ageRange?.es || "-",
    pages: book.pages || 0,
  };
}

function buildRegistry(books = []) {
  const byId = new Map();
  const byAsin = new Map();
  for (const book of books) {
    const row = bookBase(book);
    if (row.id) byId.set(row.id, row);
    if (row.asin) byAsin.set(row.asin, row);
  }
  return { byId, byAsin };
}

function ensureBook(map, key, defaults = {}) {
  const id = key || "unknown";
  if (!map.has(id)) {
    map.set(id, {
      id,
      title: defaults.title || id,
      asin: defaults.asin || "",
      amazonUrl: defaults.amazonUrl || "",
      ageRange: defaults.ageRange || "-",
      pages: defaults.pages || 0,
      bookViews: 0,
      sampleViews: 0,
      sampleClicks: 0,
      amazonClicks: 0,
      totalReviews: 0,
      approvedReviews: 0,
      pendingReviews: 0,
      rejectedReviews: 0,
      featuredReviews: 0,
      ratingTotal: 0,
      sources: new Map(),
      languages: new Map(),
    });
  }
  return map.get(id);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "-";
}

function bookFromEvent(event, registry) {
  const bookId = eventProp(event, "book_id");
  const asin = eventProp(event, "asin").toUpperCase();
  if (bookId && registry.byId.has(bookId)) return registry.byId.get(bookId);
  if (asin && registry.byAsin.has(asin)) return registry.byAsin.get(asin);
  if (bookId) return { id: bookId, title: bookId, asin, amazonUrl: "" };
  if (asin) return { id: asin, title: asin, asin, amazonUrl: "" };
  return { id: "unknown", title: "Unknown book", asin: "", amazonUrl: "" };
}

function scorecardAction(row) {
  if (row.pendingReviews > 0) return "Moderate pending reviews";
  if (row.amazonClicks > 0 && row.approvedReviews === 0) return "Add trust proof";
  if (row.bookIntent > 0 && row.amazonClicks === 0) return "Review Amazon path";
  if (row.bookViews > 0 && row.sampleViews + row.sampleClicks === 0) return "Strengthen sample path";
  if (row.bookIntent === 0 && row.totalReviews === 0) return "No recent signal";
  return "Monitor";
}

function kdpSignal(row) {
  if (row.amazonClicks > 0) return "Compare in KDP by day/title";
  if (row.bookIntent > 0) return "Watch for Amazon click lift";
  return "No recent KDP correlation input";
}

function finalizeBook(row) {
  const bookIntent = row.bookViews + row.sampleViews + row.sampleClicks;
  const averageRating = row.approvedReviews > 0 ? row.ratingTotal / row.approvedReviews : 0;
  const score = (row.amazonClicks * 5) + (row.sampleClicks * 3) + (row.sampleViews * 2) + row.bookViews + row.approvedReviews + (row.featuredReviews * 2);
  return {
    ...row,
    sources: undefined,
    languages: undefined,
    bookIntent,
    averageRating,
    ratingLabel: averageRating ? averageRating.toFixed(1) : "-",
    amazonRate: pct(row.amazonClicks, Math.max(bookIntent, 1)),
    sampleRate: pct(row.sampleViews + row.sampleClicks, Math.max(row.bookViews, 1)),
    reviewApprovalRate: pct(row.approvedReviews, Math.max(row.totalReviews, 1)),
    topSource: topEntry(row.sources),
    topLang: topEntry(row.languages),
    score,
    recommendedAction: scorecardAction({ ...row, bookIntent }),
    kdpSignal: kdpSignal({ ...row, bookIntent }),
  };
}

function sourceBucket(map, source) {
  const key = source || "unknown";
  if (!map.has(key)) map.set(key, { source: key, bookIntent: 0, amazonClicks: 0, books: new Map() });
  return map.get(key);
}

function languageBucket(map, lang) {
  const key = lang || "unknown";
  if (!map.has(key)) map.set(key, { lang: key, bookIntent: 0, amazonClicks: 0, books: new Map() });
  return map.get(key);
}

function finalizeDimensionRows(map, labelKey) {
  return [...map.values()]
    .map((row) => ({
      ...row,
      books: undefined,
      topBook: topEntry(row.books),
      amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)),
    }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || String(a[labelKey]).localeCompare(String(b[labelKey])));
}

/**
 * @param {{ events?: any[], reviews?: any[], books?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildBookScorecard(options = {}) {
  const { events = [], reviews = [], books = [] } = options;
  const registry = buildRegistry(books);
  const bookMap = new Map();
  const sourceMap = new Map();
  const languageMap = new Map();

  for (const book of books) {
    const base = bookBase(book);
    ensureBook(bookMap, base.id, base);
  }

  for (const event of events) {
    const name = event?.event_name || "";
    if (!BOOK_EVENTS.has(name)) continue;
    const book = bookFromEvent(event, registry);
    const row = ensureBook(bookMap, book.id, book);
    const source = sourceForEvent(event);
    const lang = event.lang || "unknown";

    if (name === "book_page_viewed") row.bookViews += 1;
    if (name === "sample_viewed") row.sampleViews += 1;
    if (name === "sample_cta_click") row.sampleClicks += 1;
    if (name === "amazon_click") row.amazonClicks += 1;

    bump(row.sources, source);
    bump(row.languages, lang);

    const sourceRow = sourceBucket(sourceMap, source);
    const languageRow = languageBucket(languageMap, lang);
    if (name === "amazon_click") {
      sourceRow.amazonClicks += 1;
      languageRow.amazonClicks += 1;
    } else {
      sourceRow.bookIntent += 1;
      languageRow.bookIntent += 1;
    }
    bump(sourceRow.books, row.id);
    bump(languageRow.books, row.id);
  }

  for (const review of reviews) {
    const bookId = review?.book_id || "unknown";
    const defaults = registry.byId.get(bookId) || { id: bookId, title: bookId };
    const row = ensureBook(bookMap, bookId, defaults);
    const status = review?.status || "unknown";
    const rating = Number(review?.rating || 0);
    row.totalReviews += 1;
    if (status === "approved") {
      row.approvedReviews += 1;
      if (Number.isFinite(rating) && rating > 0) row.ratingTotal += rating;
    }
    if (status === "pending") row.pendingReviews += 1;
    if (status === "rejected") row.rejectedReviews += 1;
    if (review?.featured) row.featuredReviews += 1;
  }

  const scoreRows = [...bookMap.values()]
    .map(finalizeBook)
    .sort((a, b) => b.score - a.score || b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || a.title.localeCompare(b.title));
  const opportunityRows = scoreRows
    .filter((row) => row.recommendedAction !== "Monitor" && row.recommendedAction !== "No recent signal")
    .slice(0, 12);

  const totals = scoreRows.reduce((acc, row) => {
    acc.bookViews += row.bookViews;
    acc.sampleViews += row.sampleViews;
    acc.sampleClicks += row.sampleClicks;
    acc.amazonClicks += row.amazonClicks;
    acc.totalReviews += row.totalReviews;
    acc.approvedReviews += row.approvedReviews;
    acc.pendingReviews += row.pendingReviews;
    acc.ratingTotal += row.averageRating * row.approvedReviews;
    return acc;
  }, { bookViews: 0, sampleViews: 0, sampleClicks: 0, amazonClicks: 0, totalReviews: 0, approvedReviews: 0, pendingReviews: 0, ratingTotal: 0 });
  const bookIntent = totals.bookViews + totals.sampleViews + totals.sampleClicks;
  const averageRating = totals.approvedReviews > 0 ? totals.ratingTotal / totals.approvedReviews : 0;

  return {
    summary: {
      catalogBooks: books.length,
      activeBooks: scoreRows.filter((row) => row.bookIntent > 0 || row.amazonClicks > 0 || row.totalReviews > 0).length,
      bookViews: totals.bookViews,
      sampleViews: totals.sampleViews,
      sampleClicks: totals.sampleClicks,
      amazonClicks: totals.amazonClicks,
      bookIntent,
      amazonRate: pct(totals.amazonClicks, Math.max(bookIntent, 1)),
      totalReviews: totals.totalReviews,
      approvedReviews: totals.approvedReviews,
      pendingReviews: totals.pendingReviews,
      averageRating,
      ratingLabel: averageRating ? averageRating.toFixed(1) : "-",
    },
    scoreRows,
    opportunityRows,
    sourceRows: finalizeDimensionRows(sourceMap, "source"),
    languageRows: finalizeDimensionRows(languageMap, "lang"),
    note: "Amazon clicks are buyer-intent signals only. Confirmed KDP sales must be checked outside this report.",
  };
}