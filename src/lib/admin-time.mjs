// Owner reporting timezone is intentionally fixed for admin and agent scheduling.
export const ADMIN_OWNER_TIME_ZONE = "America/New_York";
export const ADMIN_OWNER_TIME_ZONE_LABEL = "Owner ET";

const ADMIN_TIME_LOCALE = "en-US";
const formatterCache = new Map();

function validDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatter(options = {}) {
  const key = JSON.stringify(options);
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(ADMIN_TIME_LOCALE, options));
  }
  return formatterCache.get(key);
}

function formatDate(value, options = {}) {
  const date = validDate(value);
  if (!date) return "-";
  try {
    return formatter({ timeZone: ADMIN_OWNER_TIME_ZONE, ...options }).format(date);
  } catch {
    return "-";
  }
}

export function formatAdminDateTime(iso) {
  return formatDate(iso, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatAdminDateTimeWithZone(iso) {
  return formatDate(iso, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function formatAdminShortDateTime(iso) {
  return formatDate(iso, { month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" });
}

export function formatAdminTime(iso) {
  return formatDate(iso, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function formatTimeInZone(iso, timeZone, options = {}) {
  const date = validDate(iso);
  const zone = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "";
  if (!date || !zone) return "";
  try {
    return formatter({ timeZone: zone, ...options }).format(date);
  } catch {
    return "";
  }
}

export function formatVisitorDateTime(iso, timeZone) {
  return formatTimeInZone(iso, timeZone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function getTimeZoneParts(iso, timeZone = ADMIN_OWNER_TIME_ZONE) {
  const date = validDate(iso);
  if (!date) return null;
  try {
    const parts = formatter({
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const value = (type) => parts.find((part) => part.type === type)?.value || "";
    const hour = Number(value("hour"));
    return {
      year: value("year"),
      month: value("month"),
      day: value("day"),
      weekday: value("weekday"),
      hour: Number.isInteger(hour) ? hour % 24 : null,
    };
  } catch {
    return null;
  }
}

export function formatAdminDateKey(iso) {
  const parts = getTimeZoneParts(iso);
  if (!parts?.year || !parts?.month || !parts?.day) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatAdminDateLabel(dateKey) {
  const text = String(dateKey || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return text || "-";
  return `${match[2]}/${match[3]}`;
}

export function formatAdminHourLabel(hour) {
  const number = Number(hour);
  if (!Number.isInteger(number) || number < 0 || number > 23) return "-";
  return `${String(number).padStart(2, "0")}:00`;
}

export function adminTimeZoneSummary(date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat(ADMIN_TIME_LOCALE, {
      timeZone: ADMIN_OWNER_TIME_ZONE,
      timeZoneName: "shortOffset",
    }).formatToParts(date).find((item) => item.type === "timeZoneName")?.value;
    const offset = part ? part.replace(/^GMT/, "UTC") : "";
    return offset ? `${ADMIN_OWNER_TIME_ZONE} · ${offset}` : ADMIN_OWNER_TIME_ZONE;
  } catch {
    return ADMIN_OWNER_TIME_ZONE;
  }
}