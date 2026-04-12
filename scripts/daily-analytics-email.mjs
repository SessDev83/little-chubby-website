#!/usr/bin/env node
/**
 * Daily Analytics Email Report
 * Queries yesterday's pageview data from Supabase and sends a
 * summary email via Resend to the site admin.
 *
 * Usage:  node scripts/daily-analytics-email.mjs [--dry-run]
 *
 * Required env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *   ANALYTICS_EMAIL (recipient)
 */

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANALYTICS_EMAIL = process.env.ANALYTICS_EMAIL || "ivan.c4u@gmail.com";
const SITE_URL = "https://www.littlechubbypress.com";
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!RESEND_API_KEY && !DRY_RUN) {
  console.error("Missing RESEND_API_KEY (use --dry-run to preview)");
  process.exit(1);
}

// ─── Date helpers ──────────────────────────────────────────────────────────
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  });
}

// ─── Query Supabase ────────────────────────────────────────────────────────
async function query(table, selectParams) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${selectParams}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    },
  });
  const count = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
  const data = await res.json();
  return { data, count };
}

async function fetchAnalytics(date) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const range = `created_at=gte.${dayStart}&created_at=lte.${dayEnd}`;

  // Total pageviews
  const { count: totalPageviews } = await query(
    "pageviews",
    `select=id&${range}`
  );

  // All rows for aggregation
  const { data: rows } = await query(
    "pageviews",
    `select=path,referrer,visitor_hash,country&${range}&limit=10000`
  );

  // Unique visitors
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_hash)).size;

  // Top pages
  const pageCounts = {};
  for (const r of rows) {
    pageCounts[r.path] = (pageCounts[r.path] || 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top referrers
  const refCounts = {};
  for (const r of rows) {
    if (r.referrer) {
      let ref;
      try { ref = new URL(r.referrer).hostname; } catch { ref = r.referrer; }
      if (!ref.includes("littlechubbypress")) {
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      }
    }
  }
  const topReferrers = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top countries
  const countryCounts = {};
  for (const r of rows) {
    if (r.country) {
      countryCounts[r.country] = (countryCounts[r.country] || 0) + 1;
    }
  }
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { totalPageviews, uniqueVisitors, topPages, topReferrers, topCountries };
}

// ─── Build email ───────────────────────────────────────────────────────────
function buildEmailHtml(date, stats) {
  const fmtDate = formatDate(date);
  const tableRow = (label, value) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td>` +
    `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${value}</td></tr>`;

  const listRows = (entries) =>
    entries.length === 0
      ? `<tr><td style="padding:6px 12px;color:#999" colspan="2">No data yet</td></tr>`
      : entries
          .map(
            ([name, count]) =>
              `<tr><td style="padding:4px 12px;font-size:14px">${escapeHtml(name)}</td>` +
              `<td style="padding:4px 12px;text-align:right;font-size:14px">${count}</td></tr>`
          )
          .join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f7f3;padding:20px">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

  <div style="background:#6b4c3b;padding:20px 24px;color:#fff">
    <h1 style="margin:0;font-size:20px">📊 Daily Analytics</h1>
    <p style="margin:4px 0 0;opacity:.85;font-size:14px">${fmtDate}</p>
  </div>

  <div style="padding:20px 24px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${tableRow("👥 Unique Visitors", stats.uniqueVisitors)}
      ${tableRow("📄 Page Views", stats.totalPageviews)}
    </table>

    <h3 style="font-size:15px;color:#6b4c3b;margin:16px 0 8px">🏆 Top Pages</h3>
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topPages)}
    </table>

    <h3 style="font-size:15px;color:#6b4c3b;margin:16px 0 8px">🔗 Top Referrers</h3>
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topReferrers)}
    </table>

    ${stats.topCountries.length > 0 ? `
    <h3 style="font-size:15px;color:#6b4c3b;margin:16px 0 8px">🌍 Countries</h3>
    <table style="width:100%;border-collapse:collapse">
      ${listRows(stats.topCountries)}
    </table>` : ""}

    <p style="text-align:center;margin:24px 0 8px">
      <a href="https://vercel.com/sessdev83s-projects/little-chubby-website/analytics"
         style="display:inline-block;background:#6b4c3b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">
        View Full Dashboard →
      </a>
    </p>
  </div>

  <div style="padding:12px 24px;background:#f6f1e7;text-align:center;font-size:12px;color:#999">
    Little Chubby Press · ${SITE_URL}
  </div>
</div>
</body></html>`;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Send email via Resend ─────────────────────────────────────────────────
async function sendEmail(subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Little Chubby Press <analytics@littlechubbypress.com>",
      to: [ANALYTICS_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  console.log(`✅ Email sent (id: ${data.id})`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
const date = yesterday();
console.log(`📊 Fetching analytics for ${date}...\n`);

const stats = await fetchAnalytics(date);

console.log(`  Unique visitors: ${stats.uniqueVisitors}`);
console.log(`  Page views:      ${stats.totalPageviews}`);
console.log(`  Top pages:       ${stats.topPages.length}`);
console.log(`  Referrers:       ${stats.topReferrers.length}`);
console.log(`  Countries:       ${stats.topCountries.length}`);

const subject = `📊 ${formatDate(date)} — ${stats.uniqueVisitors} visitors, ${stats.totalPageviews} views`;
const html = buildEmailHtml(date, stats);

if (DRY_RUN) {
  console.log(`\n--- DRY RUN ---`);
  console.log(`To: ${ANALYTICS_EMAIL}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML length: ${html.length} chars`);
  console.log(`\nTop pages:`);
  for (const [page, count] of stats.topPages) {
    console.log(`  ${count.toString().padStart(4)}  ${page}`);
  }
} else {
  await sendEmail(subject, html);
}
