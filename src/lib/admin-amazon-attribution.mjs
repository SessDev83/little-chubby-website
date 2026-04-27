import { eventProp, pct, sourceForEvent } from "./admin-kpis.mjs";

const BOOK_EVENTS = new Set(["book_page_viewed", "sample_viewed", "sample_cta_click", "amazon_click"]);

function asinFromUrl(url) {
  const match = String(url || "").match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : "";
}

function titleFor(book) {
  return book?.title?.en || book?.title?.es || book?.id || "Unknown book";
}

function buildBookRegistry(books = []) {
  const byId = new Map();
  const byAsin = new Map();
  for (const book of books) {
    const asin = asinFromUrl(book.amazonUrl);
    const row = { id: book.id, title: titleFor(book), asin, amazonUrl: book.amazonUrl || "" };
    if (book.id) byId.set(book.id, row);
    if (asin) byAsin.set(asin, row);
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
      bookViews: 0,
      sampleViews: 0,
      sampleClicks: 0,
      amazonClicks: 0,
      sources: new Map(),
      languages: new Map(),
      content: new Map(),
    });
  }
  return map.get(id);
}

function bump(map, key, amount = 1) {
  const label = key || "unknown";
  map.set(label, (map.get(label) || 0) + amount);
}

function topEntry(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
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

function finalizeBook(row) {
  const bookIntent = row.bookViews + row.sampleViews + row.sampleClicks;
  return {
    ...row,
    sources: undefined,
    languages: undefined,
    content: undefined,
    bookIntent,
    amazonRate: pct(row.amazonClicks, Math.max(bookIntent, 1)),
    sampleToAmazonRate: pct(row.amazonClicks, Math.max(row.sampleViews + row.sampleClicks, 1)),
    topSource: topEntry(row.sources),
    topLang: topEntry(row.languages),
    topContent: topEntry(row.content),
  };
}

function sourceBucket(map, source) {
  const key = source || "unknown";
  if (!map.has(key)) map.set(key, { source: key, bookIntent: 0, amazonClicks: 0, books: new Map() });
  return map.get(key);
}

function contentBucket(map, contentId) {
  const key = contentId || "unknown";
  if (!map.has(key)) map.set(key, { contentId: key, amazonClicks: 0, asins: new Map(), sources: new Map() });
  return map.get(key);
}

/**
 * @param {{ events?: any[], books?: any[] }} options
 * @returns {Record<string, any>}
 */
export function buildAmazonAttribution(options = {}) {
  const { events = [], books = [] } = options;
  const registry = buildBookRegistry(books);
  const bookMap = new Map();
  const sourceMap = new Map();
  const contentMap = new Map();
  let bookViews = 0;
  let sampleViews = 0;
  let sampleClicks = 0;
  let amazonClicks = 0;

  for (const event of events) {
    const name = event?.event_name || "";
    if (!BOOK_EVENTS.has(name)) continue;
    const book = bookFromEvent(event, registry);
    const row = ensureBook(bookMap, book.id, book);
    const source = sourceForEvent(event);
    const lang = event.lang || "unknown";
    const contentId = eventProp(event, "content_id");

    if (name === "book_page_viewed") {
      row.bookViews += 1;
      bookViews += 1;
    }
    if (name === "sample_viewed") {
      row.sampleViews += 1;
      sampleViews += 1;
    }
    if (name === "sample_cta_click") {
      row.sampleClicks += 1;
      sampleClicks += 1;
    }
    if (name === "amazon_click") {
      row.amazonClicks += 1;
      amazonClicks += 1;
      if (contentId) {
        const content = contentBucket(contentMap, contentId);
        content.amazonClicks += 1;
        bump(content.asins, row.asin || row.id);
        bump(content.sources, source);
      }
    }

    bump(row.sources, source);
    bump(row.languages, lang);
    if (contentId) bump(row.content, contentId);

    const sourceRow = sourceBucket(sourceMap, source);
    if (name === "amazon_click") sourceRow.amazonClicks += 1;
    else sourceRow.bookIntent += 1;
    bump(sourceRow.books, row.id);
  }

  const bookRows = [...bookMap.values()]
    .map(finalizeBook)
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent || a.title.localeCompare(b.title));
  const sourceRows = [...sourceMap.values()]
    .map((row) => ({ ...row, books: undefined, topBook: topEntry(row.books), amazonRate: pct(row.amazonClicks, Math.max(row.bookIntent, 1)) }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks || b.bookIntent - a.bookIntent);
  const contentRows = [...contentMap.values()]
    .map((row) => ({ ...row, asins: undefined, sources: undefined, topAsin: topEntry(row.asins), topSource: topEntry(row.sources) }))
    .sort((a, b) => b.amazonClicks - a.amazonClicks)
    .slice(0, 20);

  return {
    summary: {
      bookViews,
      sampleViews,
      sampleClicks,
      amazonClicks,
      bookIntent: bookViews + sampleViews + sampleClicks,
      amazonRate: pct(amazonClicks, Math.max(bookViews + sampleViews + sampleClicks, 1)),
      trackedBooks: bookRows.filter((row) => row.id !== "unknown").length,
    },
    bookRows,
    sourceRows,
    contentRows,
    note: "Amazon clicks are buyer-intent signals only. This report does not claim confirmed sales attribution.",
  };
}