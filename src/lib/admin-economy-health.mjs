import { pct } from "./admin-kpis.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function timeValue(iso) {
  const value = Date.parse(iso || "");
  return Number.isFinite(value) ? value : 0;
}

function currency(value) {
  return Number(value || 0).toLocaleString();
}

function ensureUser(map, userId) {
  const key = userId || "unknown";
  if (!map.has(key)) {
    map.set(key, {
      userId: key,
      balance: 0,
      earned: 0,
      spent: 0,
      earnCount: 0,
      spendCount: 0,
      lastCreditAt: "",
    });
  }
  return map.get(key);
}

function ensureReason(map, reason) {
  const key = reason || "unknown";
  if (!map.has(key)) map.set(key, { reason: key, count: 0, earned: 0, spent: 0, net: 0, users: new Set() });
  return map.get(key);
}

function finalizeReason(row) {
  return {
    reason: row.reason,
    count: row.count,
    earned: row.earned,
    spent: row.spent,
    net: row.net,
    uniqueUsers: row.users.size,
  };
}

function buildSignals(summary) {
  const signals = [];
  if (summary.totalEarned === 0) {
    signals.push({ tone: "warn", label: "No earning flow", detail: "No positive Peanut transactions in the selected data." });
  }
  if (summary.totalEarned > 0 && summary.totalSpent === 0) {
    signals.push({ tone: "warn", label: "No spending flow", detail: "Users are earning Peanuts but not spending them yet." });
  }
  if (summary.dormantPeanuts > summary.totalPeanuts * 0.5 && summary.totalPeanuts > 0) {
    signals.push({ tone: "warn", label: "Dormant balances", detail: `${currency(summary.dormantPeanuts)} Peanuts sit with inactive holders.` });
  }
  if (summary.repeatSpenders > 0) {
    signals.push({ tone: "good", label: "Repeat spenders", detail: `${summary.repeatSpenders.toLocaleString()} user(s) spent Peanuts more than once.` });
  }
  if (summary.repeatEarners > 0) {
    signals.push({ tone: "good", label: "Repeat earners", detail: `${summary.repeatEarners.toLocaleString()} user(s) earned Peanuts more than once.` });
  }
  if (!signals.length) {
    signals.push({ tone: "quiet", label: "Baseline only", detail: "Economy activity is present but not strong enough for a clear signal." });
  }
  return signals;
}

/**
 * @param {{ credits?: any[], tickets?: any[], downloads?: any[], boosts?: any[], now?: Date, dormantDays?: number }} options
 * @returns {Record<string, any>}
 */
export function buildEconomyHealth(options = {}) {
  const { credits = [], tickets = [], downloads = [], boosts = [], now = new Date(), dormantDays = 30 } = options;
  const users = new Map();
  const reasons = new Map();
  let totalEarned = 0;
  let totalSpent = 0;
  let totalPeanuts = 0;

  for (const tx of credits) {
    const amount = Number(tx.amount || 0);
    const user = ensureUser(users, tx.user_id);
    const reason = ensureReason(reasons, tx.reason);
    user.balance += amount;
    totalPeanuts += amount;
    reason.count += 1;
    reason.net += amount;
    if (tx.user_id) reason.users.add(tx.user_id);
    if (timeValue(tx.created_at) > timeValue(user.lastCreditAt)) user.lastCreditAt = tx.created_at || "";

    if (amount > 0) {
      user.earned += amount;
      user.earnCount += 1;
      totalEarned += amount;
      reason.earned += amount;
    } else if (amount < 0) {
      const spent = Math.abs(amount);
      user.spent += spent;
      user.spendCount += 1;
      totalSpent += spent;
      reason.spent += spent;
    }
  }

  const nowTime = now.getTime();
  const userRows = [...users.values()];
  const earners = userRows.filter((row) => row.earned > 0).length;
  const spenders = userRows.filter((row) => row.spent > 0).length;
  const repeatEarners = userRows.filter((row) => row.earnCount >= 2).length;
  const repeatSpenders = userRows.filter((row) => row.spendCount >= 2).length;
  const dormantRows = userRows.filter((row) => row.balance > 0 && (!timeValue(row.lastCreditAt) || nowTime - timeValue(row.lastCreditAt) >= dormantDays * DAY_MS));
  const dormantPeanuts = dormantRows.reduce((sum, row) => sum + row.balance, 0);

  const ticketEarned = tickets.filter((tx) => Number(tx.amount || 0) > 0).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const ticketSpent = tickets.filter((tx) => Number(tx.amount || 0) < 0).reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const ticketUsers = new Set(tickets.map((tx) => tx.user_id).filter(Boolean)).size;

  const summary = {
    totalPeanuts,
    totalEarned,
    totalSpent,
    netFlow: totalEarned - totalSpent,
    usersTracked: userRows.length,
    earners,
    spenders,
    repeatEarners,
    repeatSpenders,
    dormantUsers: dormantRows.length,
    dormantPeanuts,
    spendToEarnRate: pct(totalSpent, totalEarned),
    spenderRate: pct(spenders, earners),
    repeatEarnRate: pct(repeatEarners, earners),
    repeatSpendRate: pct(repeatSpenders, spenders),
    downloads: downloads.length,
    boosts: boosts.length,
    ticketEarned,
    ticketSpent,
    ticketNet: ticketEarned - ticketSpent,
    ticketUsers,
  };

  return {
    summary,
    signals: buildSignals(summary),
    reasonRows: [...reasons.values()].map(finalizeReason).sort((a, b) => b.count - a.count || Math.abs(b.net) - Math.abs(a.net)).slice(0, 16),
    dormantRows: dormantRows.sort((a, b) => b.balance - a.balance).slice(0, 12).map((row) => ({ balance: row.balance, lastCreditAt: row.lastCreditAt, earnCount: row.earnCount, spendCount: row.spendCount })),
  };
}