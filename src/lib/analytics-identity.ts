import { createHash } from "node:crypto";

type AnalyticsIdentityOptions = {
  userId?: string | null;
  email?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  visitorHash?: string | null;
  linkReason?: string | null;
  seenAt?: string | null;
};

const ID_RE = /^[a-z0-9:_-]{1,180}$/i;

function cleanIdentityValue(value: string | null | undefined, max = 180) {
  const text = String(value || "").trim().slice(0, max);
  return text && ID_RE.test(text) ? text : null;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildAnalyticsEmailHash(email: string | null | undefined) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "lcp-fallback-salt";
  return sha256(`identity|${normalized}|${salt}`).slice(0, 64);
}

export async function recordAnalyticsIdentity(serviceClient: any, options: AnalyticsIdentityOptions = {}) {
  const userId = cleanIdentityValue(options.userId || null, 80);
  const emailHash = buildAnalyticsEmailHash(options.email);
  const anonymousId = cleanIdentityValue(options.anonymousId || null);
  const sessionId = cleanIdentityValue(options.sessionId || null);
  const visitorHash = cleanIdentityValue(options.visitorHash || null);
  const linkReason = cleanIdentityValue(options.linkReason || "activity", 80) || "activity";

  if (!userId && !emailHash) return { ok: false, skipped: "missing_identity" };
  if (!anonymousId && !sessionId && !visitorHash) return { ok: false, skipped: "missing_analytics_ids" };

  const seenAt = options.seenAt || new Date().toISOString();
  const identityKey = sha256([
    userId || "",
    emailHash || "",
    anonymousId || "",
    sessionId || "",
    visitorHash || "",
  ].join("|"));

  try {
    const { error } = await serviceClient.from("analytics_identities").upsert({
      identity_key: identityKey,
      user_id: userId,
      email_hash: emailHash,
      anonymous_id: anonymousId,
      session_id: sessionId,
      visitor_hash: visitorHash,
      link_reason: linkReason,
      linked_at: seenAt,
      last_seen_at: seenAt,
    }, { onConflict: "identity_key" });

    if (error) return { ok: false, error: error.message };
    return { ok: true, identityKey };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}
