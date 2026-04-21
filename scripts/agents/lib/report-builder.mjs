/**
 * Report Builder — shared logic for weekly & monthly analytics reports.
 *
 * Given a date window, queries Supabase for pageviews, content_performance,
 * social_metrics, newsletter_subscribers and produces a structured report
 * payload that is stored in either weekly_reports or monthly_reports.
 *
 * Design:
 *   - Pure data functions, no side effects (caller writes to Supabase)
 *   - Stable shape so downstream agents (smart-selector) can read it reliably
 *   - Per-post attribution uses utm_content when available (migration 031)
 */

const SITE_HOST = "littlechubbypress.com";

export async function queryTable(SUPABASE_URL, SUPABASE_KEY, table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchAllPageviews(env, startISO, endISO) {
  const rows = [];
  let offset = 0;
  while (true) {
    const page = await queryTable(
      env.SUPABASE_URL,
      env.SUPABASE_KEY,
      "pageviews",
      `select=path,referrer,visitor_hash,country,utm_source,utm_medium,utm_campaign,utm_content,created_at&created_at=gte.${startISO}&created_at=lte.${endISO}&order=created_at.asc&limit=1000&offset=${offset}`
    );
    if (!page.length) break;
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

function classifySource(row) {
  if (row.utm_source) {
    const s = row.utm_source.toLowerCase();
    const m = (row.utm_medium || "").toLowerCase();
    if (m === "email" || s === "newsletter") return { category: "email", detail: s };
    if (["bluesky", "facebook", "instagram", "pinterest", "twitter", "x", "tiktok", "reddit", "linkedin"].includes(s))
      return { category: "social", detail: s };
    if (m === "social") return { category: "social", detail: s };
    return { category: "referral", detail: s };
  }
  if (!row.referrer) return { category: "direct", detail: "(none)" };
  let h;
  try { h = new URL(row.referrer).hostname.replace(/^www\./, ""); }
  catch { return { category: "referral", detail: row.referrer }; }
  if (h.includes(SITE_HOST)) return { category: "internal", detail: h };
  if (/google|bing|duckduckgo|yahoo|yandex|ecosia|brave/.test(h)) return { category: "organic", detail: h };
  if (/bsky|bluesky/.test(h)) return { category: "social", detail: "bluesky" };
  if (/facebook|fb\./.test(h)) return { category: "social", detail: "facebook" };
  if (/instagram/.test(h)) return { category: "social", detail: "instagram" };
  if (/pinterest/.test(h)) return { category: "social", detail: "pinterest" };
  if (/t\.co|twitter|x\.com/.test(h)) return { category: "social", detail: "twitter/x" };
  if (/reddit/.test(h)) return { category: "social", detail: "reddit" };
  return { category: "referral", detail: h };
}

/**
 * Build a structured report payload for the given [startISO, endISO] window.
 * @returns {Promise<object>} shape matches weekly_reports / monthly_reports columns.
 */
export async function buildReport(env, startISO, endISO) {
  const pageviews = await fetchAllPageviews(env, startISO, endISO);
  const contentPerf = await queryTable(
    env.SUPABASE_URL, env.SUPABASE_KEY,
    "content_performance",
    `select=*&posted_at=gte.${startISO}&posted_at=lte.${endISO}&limit=500`
  );
  const socialMetrics = await queryTable(
    env.SUPABASE_URL, env.SUPABASE_KEY,
    "social_metrics",
    `select=platform,metric_type,value,collected_at&metric_type=in.(profile_stats,followers)&collected_at=gte.${startISO}&collected_at=lte.${endISO}&order=collected_at.asc&limit=1000`
  );
  const subs = await queryTable(
    env.SUPABASE_URL, env.SUPABASE_KEY,
    "newsletter_subscribers",
    `select=id,created_at&created_at=gte.${startISO}&created_at=lte.${endISO}&limit=1000`
  );

  // ── Pageview KPIs ──────────────────────────────────────────────────────
  const uniqueVisitors = new Set(pageviews.map((r) => r.visitor_hash)).size;

  const sourceCounts = {};
  for (const r of pageviews) {
    const c = classifySource(r);
    const key = `${c.category}/${c.detail}`;
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  }
  const sourceBreakdown = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, pv]) => {
      const [category, detail] = key.split("/");
      return { category, detail, pageviews: pv, pct: +((pv / Math.max(1, pageviews.length)) * 100).toFixed(1) };
    });

  // ── Blog performance with top source per post ─────────────────────────
  const blogBySource = {};
  for (const r of pageviews) {
    if (!r.path.includes("/blog/") || r.path.endsWith("/blog/")) continue;
    if (!blogBySource[r.path]) blogBySource[r.path] = { total: 0, sources: {} };
    blogBySource[r.path].total++;
    const c = classifySource(r);
    const k = `${c.category}/${c.detail}`;
    blogBySource[r.path].sources[k] = (blogBySource[r.path].sources[k] || 0) + 1;
  }
  const blogPerformance = Object.entries(blogBySource)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .map(([path, { total, sources }]) => {
      const [topSource] = Object.entries(sources).sort((a, b) => b[1] - a[1]);
      return { path, pageviews: total, top_source: topSource?.[0] || null };
    });

  // ── UTM attribution (per creative-id) ─────────────────────────────────
  const utmAgg = {};
  for (const r of pageviews) {
    if (!r.utm_source) continue;
    const key = `${r.utm_source}|${r.utm_campaign || ""}|${r.utm_content || ""}`;
    if (!utmAgg[key]) {
      utmAgg[key] = {
        utm_source: r.utm_source, utm_campaign: r.utm_campaign || null,
        utm_content: r.utm_content || null, clicks: 0, unique_clicks: new Set(),
      };
    }
    utmAgg[key].clicks++;
    utmAgg[key].unique_clicks.add(r.visitor_hash);
  }
  const utmAttribution = Object.values(utmAgg)
    .map((u) => ({ ...u, unique_clicks: u.unique_clicks.size }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 30);

  // ── Content performance — top/worst, by type, by hour ─────────────────
  const postsScored = contentPerf.map((p) => {
    const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
    const reach = p.reach || 0;
    const impr = p.impressions || reach || 0;
    const ctr = impr > 0 ? (p.clicks || 0) / impr : 0;
    return {
      post_id: p.post_id,
      platform: p.platform,
      post_type: p.post_type,
      posted_at: p.posted_at,
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      clicks: p.clicks || 0,
      reach,
      impressions: impr,
      engagement: eng,
      ctr: +ctr.toFixed(4),
      utm_content: (p.content_url || "").match(/utm_content=([^&]+)/)?.[1] || null,
    };
  });

  const topPosts = [...postsScored]
    .sort((a, b) => (b.clicks - a.clicks) || (b.engagement - a.engagement))
    .slice(0, 10);

  const worstPosts = postsScored
    .filter((p) => p.engagement === 0 && p.clicks === 0 && (p.reach > 0 || Date.parse(p.posted_at) < Date.now() - 48 * 3600 * 1000))
    .slice(0, 10)
    .map((p) => ({ post_id: p.post_id, platform: p.platform, post_type: p.post_type, reason: "no engagement after 48h" }));

  // Aggregate by post_type
  const byType = {};
  for (const p of postsScored) {
    const k = p.post_type || "unknown";
    if (!byType[k]) byType[k] = { post_type: k, post_count: 0, total_clicks: 0, total_engagement: 0, ctr_sum: 0, ctr_n: 0 };
    byType[k].post_count++;
    byType[k].total_clicks += p.clicks;
    byType[k].total_engagement += p.engagement;
    if (p.impressions > 0) { byType[k].ctr_sum += p.ctr; byType[k].ctr_n++; }
  }
  const bestPostTypes = Object.values(byType)
    .map((t) => ({
      post_type: t.post_type,
      post_count: t.post_count,
      total_clicks: t.total_clicks,
      total_engagement: t.total_engagement,
      avg_ctr: t.ctr_n > 0 ? +(t.ctr_sum / t.ctr_n).toFixed(4) : 0,
    }))
    .sort((a, b) => b.total_clicks - a.total_clicks || b.total_engagement - a.total_engagement)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  // Best posting hours (UTC)
  const hourAgg = {};
  for (const p of postsScored) {
    if (!p.posted_at) continue;
    const h = new Date(p.posted_at).getUTCHours();
    if (!hourAgg[h]) hourAgg[h] = { hour: h, post_count: 0, total_engagement: 0 };
    hourAgg[h].post_count++;
    hourAgg[h].total_engagement += p.engagement;
  }
  const bestPostingHours = Object.values(hourAgg)
    .map((h) => ({ ...h, avg_engagement: +(h.total_engagement / Math.max(1, h.post_count)).toFixed(2) }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement);

  // ── Follower deltas per platform ──────────────────────────────────────
  const byPlat = {};
  for (const s of socialMetrics) {
    if (!byPlat[s.platform]) byPlat[s.platform] = [];
    byPlat[s.platform].push(s);
  }
  const followerDeltas = {};
  for (const [plat, arr] of Object.entries(byPlat)) {
    arr.sort((a, b) => a.collected_at.localeCompare(b.collected_at));
    const pick = (v) => v?.followers ?? v?.followers_count ?? v?.fans ?? v?.count ?? null;
    const first = pick(arr[0]?.value);
    const last = pick(arr[arr.length - 1]?.value);
    if (typeof first === "number" && typeof last === "number") {
      followerDeltas[plat] = { first, last, delta: last - first };
    }
  }

  // ── Aggregate totals ──────────────────────────────────────────────────
  const totalClicks = postsScored.reduce((a, p) => a + p.clicks, 0);
  const totalEngagement = postsScored.reduce((a, p) => a + p.engagement, 0);

  return {
    total_pageviews: pageviews.length,
    unique_visitors: uniqueVisitors,
    total_posts: postsScored.length,
    total_clicks: totalClicks,
    total_engagement: totalEngagement,
    new_subscribers: subs.length,
    follower_deltas: followerDeltas,
    top_posts: topPosts,
    worst_posts: worstPosts,
    best_post_types: bestPostTypes,
    best_posting_hours: bestPostingHours,
    source_breakdown: sourceBreakdown,
    blog_performance: blogPerformance,
    utm_attribution: utmAttribution,
  };
}

/**
 * Heuristic recommendations — derived from the report, platform-neutral,
 * cheap to compute (no AI call needed). The weekly/monthly agents may
 * append AI-generated recommendations on top.
 */
export function deriveRecommendations(report) {
  const recs = [];

  if (report.best_post_types.length >= 2) {
    const winner = report.best_post_types[0];
    const loser = report.best_post_types[report.best_post_types.length - 1];
    if (winner.post_type !== loser.post_type && winner.total_clicks > loser.total_clicks * 2) {
      recs.push({
        action: `Increase ${winner.post_type} posting frequency (top performer: ${winner.total_clicks} clicks across ${winner.post_count} posts)`,
        priority: "high",
        reasoning: `${winner.post_type} outperformed ${loser.post_type} by ${(winner.total_clicks / Math.max(1, loser.total_clicks)).toFixed(1)}×`,
      });
    }
  }

  if (report.best_posting_hours.length > 0) {
    const best = report.best_posting_hours[0];
    if (best.post_count >= 2) {
      recs.push({
        action: `Shift more posts to ${best.hour}:00 UTC slot (avg engagement ${best.avg_engagement})`,
        priority: "medium",
        reasoning: `Highest avg engagement across ${best.post_count} posts in that hour`,
      });
    }
  }

  const socialPct = report.source_breakdown
    .filter((s) => s.category === "social")
    .reduce((a, s) => a + s.pct, 0);
  const organicPct = report.source_breakdown
    .filter((s) => s.category === "organic")
    .reduce((a, s) => a + s.pct, 0);
  if (socialPct > 50 && organicPct < 5) {
    recs.push({
      action: "Critical: invest in SEO (blog content + backlinks). Organic search < 5% of traffic while social > 50% = platform-risk concentration.",
      priority: "high",
      reasoning: `Social ${socialPct.toFixed(1)}% vs organic ${organicPct.toFixed(1)}%`,
    });
  }

  if (report.worst_posts.length >= 5) {
    const byPlatform = {};
    for (const w of report.worst_posts) byPlatform[w.platform] = (byPlatform[w.platform] || 0) + 1;
    const [topLoser] = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);
    if (topLoser && topLoser[1] >= 3) {
      recs.push({
        action: `Review ${topLoser[0]} strategy — ${topLoser[1]} posts with zero engagement in window`,
        priority: "medium",
        reasoning: "Possible bad timing, wrong audience, or template fatigue",
      });
    }
  }

  if (report.top_posts.length > 0 && report.total_clicks === 0) {
    recs.push({
      action: "Verify UTM tracking end-to-end. No clicks attributed despite posts published.",
      priority: "high",
      reasoning: "Either tracker is broken or posts are not tagged correctly",
    });
  }

  return recs;
}

/**
 * Render the report as a clean plaintext summary for console + email body.
 */
export function renderReportText(label, startISO, endISO, report, recs) {
  const lines = [];
  lines.push("═".repeat(72));
  lines.push(`  ${label}`);
  lines.push(`  ${startISO.slice(0, 10)} → ${endISO.slice(0, 10)}`);
  lines.push("═".repeat(72));
  lines.push("");
  lines.push(`📊 Pageviews:       ${report.total_pageviews}`);
  lines.push(`👥 Unique visitors: ${report.unique_visitors}`);
  lines.push(`📱 Posts published: ${report.total_posts}`);
  lines.push(`🖱️  Clicks:          ${report.total_clicks}`);
  lines.push(`❤️  Engagement:      ${report.total_engagement} (likes+comments+shares)`);
  lines.push(`📧 New subs:        ${report.new_subscribers}`);
  lines.push("");
  lines.push("── Follower growth ──");
  for (const [plat, d] of Object.entries(report.follower_deltas)) {
    const sign = d.delta >= 0 ? "+" : "";
    lines.push(`   ${plat.padEnd(12)} ${d.first} → ${d.last}  (${sign}${d.delta})`);
  }
  lines.push("");
  lines.push("── Traffic sources ──");
  for (const s of report.source_breakdown.slice(0, 10)) {
    lines.push(`   ${(s.category + "/" + s.detail).padEnd(30)} ${String(s.pageviews).padStart(4)}  (${s.pct}%)`);
  }
  lines.push("");
  lines.push("── Best post types ──");
  for (const t of report.best_post_types.slice(0, 8)) {
    lines.push(`   #${t.rank} ${t.post_type.padEnd(18)} ${t.post_count}p · ${t.total_clicks}clk · ${t.total_engagement}eng · ctr=${t.avg_ctr}`);
  }
  lines.push("");
  lines.push("── Top posts (by clicks then engagement) ──");
  for (const p of report.top_posts.slice(0, 8)) {
    lines.push(`   ${(p.posted_at || "").slice(0, 16)} │ ${p.platform.padEnd(10)} │ ${(p.post_type || "").padEnd(16)} │ clk=${p.clicks} eng=${p.engagement} ctr=${p.ctr}`);
  }
  lines.push("");
  lines.push("── Top blog posts ──");
  for (const b of report.blog_performance.slice(0, 10)) {
    lines.push(`   ${String(b.pageviews).padStart(4)}  ${b.path}  [top: ${b.top_source}]`);
  }
  lines.push("");
  lines.push("── UTM attribution (top creative-ids) ──");
  for (const u of report.utm_attribution.slice(0, 10)) {
    lines.push(`   ${u.utm_source.padEnd(12)} ${(u.utm_campaign || "").padEnd(22)} ${(u.utm_content || "").padEnd(40)} ${u.clicks}clk (${u.unique_clicks}uq)`);
  }
  lines.push("");
  lines.push("── Recommendations ──");
  for (const r of recs) {
    lines.push(`   [${r.priority.toUpperCase()}] ${r.action}`);
    lines.push(`        reason: ${r.reasoning}`);
  }
  lines.push("");
  lines.push("═".repeat(72));
  return lines.join("\n");
}

/**
 * Render HTML version (used for email body).
 */
export function renderReportHtml(label, startISO, endISO, report, recs) {
  const pct = (v, t) => t > 0 ? ((v / t) * 100).toFixed(1) + "%" : "0%";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const row = (cells) => `<tr>${cells.map((c) => `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px">${c}</td>`).join("")}</tr>`;
  const h2 = (t) => `<h2 style="font-size:16px;margin:22px 0 6px;color:#2a3d66">${esc(t)}</h2>`;

  const deltaStr = Object.entries(report.follower_deltas)
    .map(([p, d]) => `${esc(p)}: ${d.first}→${d.last} <b>(${d.delta >= 0 ? "+" : ""}${d.delta})</b>`)
    .join(" · ");

  const sourceRows = report.source_breakdown.slice(0, 10)
    .map((s) => row([esc(`${s.category}/${s.detail}`), s.pageviews, s.pct + "%"])).join("");

  const typeRows = report.best_post_types.slice(0, 8)
    .map((t) => row([`#${t.rank} ${esc(t.post_type)}`, t.post_count, t.total_clicks, t.total_engagement, t.avg_ctr])).join("");

  const topRows = report.top_posts.slice(0, 8).map((p) => row([
    esc((p.posted_at || "").slice(0, 16)), esc(p.platform), esc(p.post_type), p.clicks, p.engagement, p.ctr,
  ])).join("");

  const blogRows = report.blog_performance.slice(0, 10).map((b) => row([b.pageviews, esc(b.path), esc(b.top_source)])).join("");

  const utmRows = report.utm_attribution.slice(0, 10).map((u) => row([
    esc(u.utm_source), esc(u.utm_campaign || ""), esc(u.utm_content || ""), u.clicks, u.unique_clicks,
  ])).join("");

  const recRows = recs.map((r) =>
    `<div style="margin:8px 0;padding:10px;background:${r.priority === "high" ? "#fff3cd" : "#e7f1ff"};border-left:4px solid ${r.priority === "high" ? "#f0ad4e" : "#4a6fa5"};border-radius:4px">
      <b>[${esc(r.priority.toUpperCase())}]</b> ${esc(r.action)}<br/>
      <span style="font-size:12px;color:#555">${esc(r.reasoning)}</span>
    </div>`).join("");

  return `<!doctype html><html><body style="font-family:-apple-system,sans-serif;max-width:780px;margin:0 auto;padding:24px;color:#222">
    <h1 style="font-size:22px;color:#2a3d66;margin:0 0 4px">${esc(label)}</h1>
    <p style="color:#888;margin:0 0 20px">${esc(startISO.slice(0, 10))} → ${esc(endISO.slice(0, 10))}</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0">
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">PAGEVIEWS</div><div style="font-size:24px;font-weight:700">${report.total_pageviews}</div></div>
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">UNIQUE VISITORS</div><div style="font-size:24px;font-weight:700">${report.unique_visitors}</div></div>
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">CLICKS (UTM)</div><div style="font-size:24px;font-weight:700">${report.total_clicks}</div></div>
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">POSTS</div><div style="font-size:24px;font-weight:700">${report.total_posts}</div></div>
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">ENGAGEMENT</div><div style="font-size:24px;font-weight:700">${report.total_engagement}</div></div>
      <div style="background:#f5f7fa;padding:14px;border-radius:6px"><div style="color:#888;font-size:12px">NEW SUBS</div><div style="font-size:24px;font-weight:700">${report.new_subscribers}</div></div>
    </div>
    <p style="font-size:13px;color:#555"><b>Follower growth:</b> ${deltaStr || "—"}</p>

    ${h2("Traffic sources")}
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f3f7"><th style="padding:6px 10px;text-align:left;font-size:12px">Source</th><th style="padding:6px 10px;text-align:right;font-size:12px">PV</th><th style="padding:6px 10px;text-align:right;font-size:12px">%</th></tr></thead><tbody>${sourceRows}</tbody></table>

    ${h2("Best-performing post types")}
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f3f7"><th style="padding:6px 10px;text-align:left;font-size:12px">Type</th><th style="padding:6px 10px;text-align:right;font-size:12px">Posts</th><th style="padding:6px 10px;text-align:right;font-size:12px">Clicks</th><th style="padding:6px 10px;text-align:right;font-size:12px">Eng.</th><th style="padding:6px 10px;text-align:right;font-size:12px">CTR</th></tr></thead><tbody>${typeRows}</tbody></table>

    ${h2("Top posts")}
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f3f7"><th style="padding:6px 10px;text-align:left;font-size:12px">When</th><th style="padding:6px 10px;text-align:left;font-size:12px">Platform</th><th style="padding:6px 10px;text-align:left;font-size:12px">Type</th><th style="padding:6px 10px;text-align:right;font-size:12px">Clicks</th><th style="padding:6px 10px;text-align:right;font-size:12px">Eng.</th><th style="padding:6px 10px;text-align:right;font-size:12px">CTR</th></tr></thead><tbody>${topRows}</tbody></table>

    ${h2("Top blog pages")}
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f3f7"><th style="padding:6px 10px;text-align:right;font-size:12px">PV</th><th style="padding:6px 10px;text-align:left;font-size:12px">Path</th><th style="padding:6px 10px;text-align:left;font-size:12px">Top source</th></tr></thead><tbody>${blogRows}</tbody></table>

    ${h2("UTM attribution (per creative-id)")}
    <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f3f7"><th style="padding:6px 10px;text-align:left;font-size:12px">Source</th><th style="padding:6px 10px;text-align:left;font-size:12px">Campaign</th><th style="padding:6px 10px;text-align:left;font-size:12px">Content</th><th style="padding:6px 10px;text-align:right;font-size:12px">Clicks</th><th style="padding:6px 10px;text-align:right;font-size:12px">Uniq</th></tr></thead><tbody>${utmRows || row(["—", "", "", "0", "0"])}</tbody></table>

    ${h2("Recommendations")}
    ${recRows || '<p style="color:#888">No recommendations generated.</p>'}
  </body></html>`;
}
