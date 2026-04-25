// Shared Sentry scrubbers used by both client and server configs.
// P1-08: keeps tokens/JWTs out of breadcrumbs (event.breadcrumbs[i].data.url
// bypasses the request.query_string scrub on the main event).

// Sensitive query-string parameters that must never reach Sentry, even inside
// breadcrumb URLs.
const SENSITIVE_QS_KEYS = [
  "token",
  "access_token",
  "refresh_token",
  "magic",
  "code",
  "password",
  "otp",
  "api_key",
];

function stripSensitiveQs(urlish: string): string {
  try {
    const u = new URL(urlish, "https://x");
    for (const k of SENSITIVE_QS_KEYS) {
      if (u.searchParams.has(k)) u.searchParams.set(k, "[redacted]");
    }
    if (urlish.startsWith("http")) return u.toString();
    return u.pathname + (u.search || "") + (u.hash || "");
  } catch {
    return urlish;
  }
}

export function scrubBreadcrumb(bc: any): any {
  if (!bc) return bc;
  // fetch/xhr: URL lives in bc.data.url; request body must be dropped.
  if (bc.category === "fetch" || bc.category === "xhr") {
    if (typeof bc.data?.url === "string") {
      bc.data.url = stripSensitiveQs(bc.data.url);
    }
    if (bc.data) {
      delete bc.data.request_body;
      delete bc.data.response_body;
    }
  }
  // navigation: from/to are URLs.
  if (bc.category === "navigation") {
    if (typeof bc.data?.from === "string") bc.data.from = stripSensitiveQs(bc.data.from);
    if (typeof bc.data?.to === "string") bc.data.to = stripSensitiveQs(bc.data.to);
  }
  // console: best-effort JWT redaction in pasted strings.
  if (bc.category === "console" && typeof bc.message === "string") {
    bc.message = bc.message.replace(
      /\beyJ[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g,
      "[jwt-redacted]"
    );
  }
  return bc;
}

export function scrubEvent(event: any): any {
  if (event?.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
    delete event.request.headers["x-forwarded-for"];
  }

  if (event?.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
  }

  if (event?.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  // Double-pass: instrumentation may have buffered breadcrumbs before
  // beforeBreadcrumb ran. Re-scrub the final array.
  if (Array.isArray(event?.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  }

  return event;
}
