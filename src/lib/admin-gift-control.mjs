export const ADMIN_GIFT_ROW_LIMIT = 500;

export const GIFT_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "claimed", label: "Activated" },
  { key: "expired", label: "Expired" },
  { key: "refunded", label: "Refunded" },
  { key: "direct", label: "Direct" },
];

export const GIFT_STATUS_META = {
  pending: { label: "Pending", tone: "yellow" },
  claimed: { label: "Activated", tone: "green" },
  expired: { label: "Expired", tone: "red" },
  refunded: { label: "Refunded", tone: "blue" },
  direct: { label: "Delivered", tone: "green" },
};

function validDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function safeCount(result) {
  return typeof result?.count === "number" ? result.count : 0;
}

function profileSummary(profile, fallbackId = "") {
  if (!profile) {
    return {
      id: fallbackId || "",
      label: fallbackId ? fallbackId.slice(0, 8) : "-",
      email: "",
      displayName: "",
      href: fallbackId ? `/admin/users/${fallbackId}/` : "",
    };
  }

  return {
    id: profile.id || fallbackId || "",
    label: profile.display_name || profile.email || fallbackId.slice(0, 8) || "-",
    email: profile.email || "",
    displayName: profile.display_name || "",
    href: profile.id ? `/admin/users/${profile.id}/` : "",
  };
}

export function pendingGiftStatus(row, now = new Date()) {
  if (row?.refunded_at) return "refunded";
  if (row?.claimed_at) return "claimed";
  const expiresAt = validDate(row?.expires_at);
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

async function fetchGiftProfiles(sc, profileIds) {
  const ids = [...profileIds].filter(Boolean);
  if (ids.length === 0) return new Map();

  const { data } = await sc
    .from("profiles")
    .select("id, email, display_name, lang_pref, created_at")
    .in("id", ids);

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function fetchGiftSummary(sc, now = new Date()) {
  const nowIso = now.toISOString();
  const [
    pendingTotalResult,
    pendingActiveResult,
    pendingClaimedResult,
    pendingRefundedResult,
    pendingExpiredResult,
    pendingBonusResult,
    directResult,
    pendingQuantityResult,
    directQuantityResult,
  ] = await Promise.all([
    sc.from("pending_gifts").select("*", { count: "exact", head: true }),
    sc.from("pending_gifts").select("*", { count: "exact", head: true }).is("claimed_at", null).is("refunded_at", null).gt("expires_at", nowIso),
    sc.from("pending_gifts").select("*", { count: "exact", head: true }).not("claimed_at", "is", null),
    sc.from("pending_gifts").select("*", { count: "exact", head: true }).not("refunded_at", "is", null),
    sc.from("pending_gifts").select("*", { count: "exact", head: true }).is("claimed_at", null).is("refunded_at", null).lte("expires_at", nowIso),
    sc.from("pending_gifts").select("*", { count: "exact", head: true }).not("referral_bonus_paid_at", "is", null),
    sc.from("ticket_transactions").select("*", { count: "exact", head: true }).eq("reason", "gift_sent"),
    sc.from("pending_gifts").select("quantity").limit(10000),
    sc.from("ticket_transactions").select("amount").eq("reason", "gift_sent").limit(10000),
  ]);

  const pendingQuantity = (pendingQuantityResult.data || []).reduce((sum, row) => sum + Math.max(0, Number(row.quantity || 0)), 0);
  const directQuantity = (directQuantityResult.data || []).reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);

  return {
    pendingTotal: safeCount(pendingTotalResult),
    pendingActive: safeCount(pendingActiveResult),
    pendingClaimed: safeCount(pendingClaimedResult),
    pendingRefunded: safeCount(pendingRefundedResult),
    pendingExpired: safeCount(pendingExpiredResult),
    pendingBonusPaid: safeCount(pendingBonusResult),
    directDelivered: safeCount(directResult),
    pendingQuantity,
    directQuantity,
    totalQuantity: pendingQuantity + directQuantity,
    totalGifts: safeCount(pendingTotalResult) + safeCount(directResult),
  };
}

export async function fetchAdminGiftControl(sc, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || ADMIN_GIFT_ROW_LIMIT), 1), 1000);
  const now = options.now instanceof Date ? options.now : new Date();

  const [summary, pendingResult, directResult] = await Promise.all([
    fetchGiftSummary(sc, now),
    sc
      .from("pending_gifts")
      .select("id, sender_id, recipient_email, quantity, created_at, expires_at, claimed_at, claimed_by, refunded_at, referral_bonus_paid_at, sender_tx_id")
      .order("created_at", { ascending: false })
      .limit(limit),
    sc
      .from("ticket_transactions")
      .select("id, user_id, amount, reason, ref_id, created_at")
      .eq("reason", "gift_sent")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const pendingRows = pendingResult.data || [];
  const directRows = directResult.data || [];
  const profileIds = new Set();

  for (const pendingRow of pendingRows) {
    if (pendingRow.sender_id) profileIds.add(pendingRow.sender_id);
    if (pendingRow.claimed_by) profileIds.add(pendingRow.claimed_by);
  }

  for (const directRow of directRows) {
    if (directRow.user_id) profileIds.add(directRow.user_id);
    if (directRow.ref_id) profileIds.add(directRow.ref_id);
  }

  const profiles = await fetchGiftProfiles(sc, profileIds);

  const pendingItems = pendingRows.map((pendingRow) => {
    const status = pendingGiftStatus(pendingRow, now);
    const sender = profileSummary(profiles.get(pendingRow.sender_id), pendingRow.sender_id);
    const claimedProfile = pendingRow.claimed_by ? profileSummary(profiles.get(pendingRow.claimed_by), pendingRow.claimed_by) : null;
    const statusMeta = GIFT_STATUS_META[status] || GIFT_STATUS_META.pending;
    return {
      id: `pending:${pendingRow.id}`,
      giftId: pendingRow.id,
      kind: "pending",
      status,
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
      sender,
      recipientEmail: pendingRow.recipient_email || "",
      recipient: claimedProfile || { id: "", label: pendingRow.recipient_email || "-", email: pendingRow.recipient_email || "", href: "" },
      quantity: Number(pendingRow.quantity || 0),
      sentAt: pendingRow.created_at,
      expiresAt: pendingRow.expires_at,
      claimedAt: pendingRow.claimed_at,
      refundedAt: pendingRow.refunded_at,
      bonusAt: pendingRow.referral_bonus_paid_at,
      transactionId: pendingRow.sender_tx_id,
      searchText: normalize([
        pendingRow.recipient_email,
        sender.label,
        sender.email,
        claimedProfile?.label,
        claimedProfile?.email,
        statusMeta.label,
      ].filter(Boolean).join(" ")),
    };
  });

  const directItems = directRows.map((directRow) => {
    const sender = profileSummary(profiles.get(directRow.user_id), directRow.user_id);
    const recipient = profileSummary(profiles.get(directRow.ref_id), directRow.ref_id || "");
    const statusMeta = GIFT_STATUS_META.direct;
    return {
      id: `direct:${directRow.id}`,
      giftId: directRow.id,
      kind: "direct",
      status: "direct",
      statusLabel: statusMeta.label,
      statusTone: statusMeta.tone,
      sender,
      recipientEmail: recipient.email || "",
      recipient,
      quantity: Math.abs(Number(directRow.amount || 0)),
      sentAt: directRow.created_at,
      expiresAt: null,
      claimedAt: directRow.created_at,
      refundedAt: null,
      bonusAt: null,
      transactionId: directRow.id,
      searchText: normalize([
        sender.label,
        sender.email,
        recipient.label,
        recipient.email,
        statusMeta.label,
      ].filter(Boolean).join(" ")),
    };
  });

  const rows = [...pendingItems, ...directItems].sort((firstRow, secondRow) => {
    const firstTime = validDate(firstRow.sentAt)?.getTime() || 0;
    const secondTime = validDate(secondRow.sentAt)?.getTime() || 0;
    return secondTime - firstTime;
  });

  return {
    rows,
    summary,
    errors: [pendingResult.error, directResult.error].filter(Boolean),
    loadedLimit: limit,
  };
}

export function filterAdminGiftRows(rows, options = {}) {
  const status = GIFT_FILTERS.some((filterItem) => filterItem.key === options.status) ? options.status : "all";
  const needle = normalize(options.search);

  return rows.filter((row) => {
    const statusMatch = status === "all" || row.status === status;
    const searchMatch = !needle || row.searchText.includes(needle) || normalize(row.giftId).includes(needle);
    return statusMatch && searchMatch;
  });
}

export function describeGiftDeadline(row, now = new Date()) {
  if (row.status === "direct") return "Direct account gift";
  if (row.refundedAt) return "Refunded";
  if (row.claimedAt) return row.bonusAt ? "Bonus paid" : "Activated";

  const expiresAt = validDate(row.expiresAt);
  if (!expiresAt) return "No expiry";
  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Expires today";
  return `${days}d left`;
}