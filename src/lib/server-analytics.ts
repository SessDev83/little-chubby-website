import { createHash, randomUUID } from "node:crypto";
import {
  EVENT_CONTRACT_VERSION,
  canonicalEventName,
  eventFunnelStage,
} from "./analytics-event-contract.mjs";
import { recordAnalyticsIdentity } from "./analytics-identity";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ServerAnalyticsProps = Record<string, JsonValue | undefined>;

type ServerAnalyticsOptions = {
  eventName: string;
  request?: Request;
  userId?: string | null;
  path?: string | null;
  lang?: string | null;
  visitorHash?: string | null;
  props?: ServerAnalyticsProps;
  timeoutMs?: number;
};

type AnalyticsInsertResult = {
  error?: { message?: string } | null;
};

const SCHEMA_FALLBACK_RE = /event_id|occurred_at|schema cache|column/i;
const SENSITIVE_PROP_NAME_RE = /(^|_)(email|phone|ip|ip_address|child|transcript|review_text|raw_text|message|full_url|shared_url|token|secret)(_|$)/i;
const DEFAULT_TIMEOUT_MS = 1500;

export function buildAnalyticsVisitorHash(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "lcp-fallback-salt";
  return createHash("sha256").update(`analytics|${normalized}|${salt}`).digest("hex").slice(0, 32);
}

function isSensitivePropName(key: string) {
  return SENSITIVE_PROP_NAME_RE.test(key);
}

function cleanValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(cleanValue).filter((item) => item !== undefined) as JsonValue[];
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitivePropName(key)) continue;
      const clean = cleanValue(child);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return undefined;
}

function cleanProps(props: ServerAnalyticsProps = {}) {
  const out: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isSensitivePropName(key)) continue;
    const clean = cleanValue(value);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

function pathFromRequest(request?: Request) {
  if (!request) return "";
  try {
    return new URL(request.url).pathname || "";
  } catch {
    return "";
  }
}

function cleanPath(value: string) {
  const text = value.trim();
  if (!text) return "";
  try {
    return new URL(text).pathname || "";
  } catch {
    return text.startsWith("/") ? text.split(/[?#]/)[0] : "";
  }
}

function searchParamsFromRequest(request?: Request) {
  if (!request) return new URLSearchParams();
  try {
    return new URL(request.url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function langFromPath(path: string) {
  const match = path.match(/^\/(en|es)(\/|$)/);
  return match?.[1] || null;
}

function shortHeader(request: Request | undefined, name: string) {
  const value = request?.headers.get(name)?.trim() || "";
  return value ? value.slice(0, 500) : "";
}

function rawReferrer(request?: Request) {
  return shortHeader(request, "referer") || shortHeader(request, "referrer");
}

function normalizedHost(value: string) {
  return value.replace(/^www\./, "").toLowerCase();
}

function sameOriginReferrerPath(request?: Request) {
  const value = rawReferrer(request);
  if (!request || !value) return "";
  try {
    const requestHost = normalizedHost(new URL(request.url).hostname);
    const referrerUrl = new URL(value);
    if (normalizedHost(referrerUrl.hostname) !== requestHost) return "";
    return referrerUrl.pathname || "";
  } catch {
    return "";
  }
}

function langFromReferrer(request?: Request) {
  const path = sameOriginReferrerPath(request);
  return path ? langFromPath(path) : null;
}

function safeReferrer(request?: Request) {
  const value = rawReferrer(request);
  if (!value) return "";
  try {
    return normalizedHost(new URL(value).hostname).slice(0, 500);
  } catch {
    return value.split(/[?#]/)[0].slice(0, 500);
  }
}

function normalizedTimeoutMs(timeoutMs: number | undefined) {
  if (!Number.isFinite(timeoutMs)) return DEFAULT_TIMEOUT_MS;
  return Math.max(250, Math.min(5000, Number(timeoutMs)));
}

async function withAnalyticsTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, controller?: AbortController) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guardedOperation = Promise.resolve(operation).catch((error) => ({ analyticsThrown: error }));
  const timeout = new Promise<{ analyticsTimedOut: true }>((resolve) => {
    timer = setTimeout(() => {
      controller?.abort();
      resolve({ analyticsTimedOut: true });
    }, timeoutMs);
  });
  const result = await Promise.race([guardedOperation, timeout]);
  if (timer) clearTimeout(timer);
  if (result && typeof result === "object" && "analyticsThrown" in result) throw result.analyticsThrown;
  return result as T | { analyticsTimedOut: true };
}

function isAnalyticsTimeout(result: unknown): result is { analyticsTimedOut: true } {
  return !!result && typeof result === "object" && "analyticsTimedOut" in result;
}

function withAbortSignal(operation: any, controller: AbortController) {
  return typeof operation?.abortSignal === "function" ? operation.abortSignal(controller.signal) : operation;
}

export function buildServerAnalyticsEventPayload(options: ServerAnalyticsOptions) {
  const originalName = String(options.eventName || "").trim();
  const eventName = canonicalEventName(originalName);
  const occurredAt = new Date().toISOString();
  const requestPath = pathFromRequest(options.request);
  const internalReferrerPath = sameOriginReferrerPath(options.request);
  const explicitPath = cleanPath(options.path || shortHeader(options.request, "x-lcp-path"));
  const path = explicitPath || (requestPath.startsWith("/api/") ? internalReferrerPath : "") || requestPath;
  const lang = options.lang || langFromPath(path) || langFromReferrer(options.request);
  const params = searchParamsFromRequest(options.request);
  const eventId = `srv_${randomUUID()}`;
  const referrer = safeReferrer(options.request);
  const requestSource = params.get("utm_source") || shortHeader(options.request, "x-lcp-source") || (referrer ? (internalReferrerPath ? "internal" : referrer) : "");
  const sessionId = shortHeader(options.request, "x-lcp-session-id");
  const anonymousId = shortHeader(options.request, "x-lcp-anonymous-id");
  const visitorHashHeader = shortHeader(options.request, "x-lcp-visitor-hash");
  const optionProps = cleanProps(options.props || {});
  const optionSource = typeof optionProps.source === "string" ? optionProps.source : "";
  const props = cleanProps({
    ...optionProps,
    event_contract_version: EVENT_CONTRACT_VERSION,
    event_id: eventId,
    occurred_at: occurredAt,
    capture: "server",
    server_confirmed: true,
    legacy_event_name: originalName && originalName !== eventName ? originalName : undefined,
    user_id: options.userId || undefined,
    session_id: sessionId || undefined,
    anonymous_id: anonymousId || undefined,
    path: path || undefined,
    endpoint_path: requestPath && requestPath !== path ? requestPath : undefined,
    lang: lang || undefined,
    source: optionSource || requestSource || undefined,
    referrer: referrer || undefined,
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    funnel_stage: eventFunnelStage(eventName),
  });

  return {
    event_id: eventId,
    event_name: eventName,
    occurred_at: occurredAt,
    path: path || null,
    visitor_hash: options.visitorHash || visitorHashHeader || null,
    props,
    lang,
  };
}

export async function trackServerConversionEvent(serviceClient: any, options: ServerAnalyticsOptions) {
  let payload: ReturnType<typeof buildServerAnalyticsEventPayload> | undefined;
  try {
    payload = buildServerAnalyticsEventPayload(options);
    const timeoutMs = normalizedTimeoutMs(options.timeoutMs);
    const insertController = new AbortController();
    const insertOperation = withAbortSignal(serviceClient.from("conversion_events").insert(payload), insertController);
    const result = await withAnalyticsTimeout(insertOperation, timeoutMs, insertController);
    if (isAnalyticsTimeout(result)) {
      console.warn(`[server-analytics] insert timed out after ${timeoutMs}ms`);
      return { ok: false, eventId: payload.event_id, timedOut: true };
    }

    const { error } = result as AnalyticsInsertResult;
    if (!error) {
      await recordAnalyticsIdentity(serviceClient, {
        userId: options.userId,
        anonymousId: payload.props?.anonymous_id as string | undefined,
        sessionId: payload.props?.session_id as string | undefined,
        visitorHash: payload.visitor_hash,
        linkReason: payload.event_name,
        seenAt: payload.occurred_at,
      });
      return { ok: true, eventId: payload.event_id };
    }

    if (SCHEMA_FALLBACK_RE.test(error.message || "")) {
      const fallback = { ...payload };
      delete (fallback as Partial<typeof payload>).event_id;
      delete (fallback as Partial<typeof payload>).occurred_at;
      const fallbackController = new AbortController();
      const fallbackOperation = withAbortSignal(serviceClient.from("conversion_events").insert(fallback), fallbackController);
      const fallbackResult = await withAnalyticsTimeout(fallbackOperation, timeoutMs, fallbackController);
      if (isAnalyticsTimeout(fallbackResult)) {
        console.warn(`[server-analytics] fallback insert timed out after ${timeoutMs}ms`);
        return { ok: false, eventId: payload.event_id, timedOut: true };
      }
      const fallbackInsertResult = fallbackResult as AnalyticsInsertResult;
      if (!fallbackInsertResult.error) {
        await recordAnalyticsIdentity(serviceClient, {
          userId: options.userId,
          anonymousId: payload.props?.anonymous_id as string | undefined,
          sessionId: payload.props?.session_id as string | undefined,
          visitorHash: payload.visitor_hash,
          linkReason: payload.event_name,
          seenAt: payload.occurred_at,
        });
        return { ok: true, eventId: payload.event_id, fallback: true };
      }
      console.warn("[server-analytics] fallback insert failed:", fallbackInsertResult.error.message);
      return { ok: false, error: fallbackInsertResult.error.message };
    }

    console.warn("[server-analytics] insert failed:", error.message);
    return { ok: false, error: error.message };
  } catch (error) {
    console.warn("[server-analytics] unexpected failure:", error instanceof Error ? error.message : error);
    return { ok: false, eventId: payload?.event_id, error: error instanceof Error ? error.message : "unknown" };
  }
}
