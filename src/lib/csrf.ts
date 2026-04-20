/**
 * CSRF protection via Origin header validation.
 *
 * sameSite:"lax" cookies already block most cross-origin POST attacks,
 * but Origin validation adds defence-in-depth against edge cases
 * (top-level navigation POSTs, older browsers, etc.).
 */

const SITE_URL =
  import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com";

/**
 * Validates that the request's Origin header matches one of the allowed
 * origins.  Returns `true` when the origin is valid, `false` otherwise.
 *
 * Allowed origins:
 *  - The configured PUBLIC_SITE_URL (with and without "www.")
 *  - The request's own origin (covers localhost / Vercel preview deploys)
 */
export function validateOrigin(
  request: Request,
  requestUrl: URL,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const siteOrigin = new URL(SITE_URL).origin;

  const allowed = new Set([
    siteOrigin,
    "https://www.littlechubbypress.com",
    "https://littlechubbypress.com",
    requestUrl.origin, // localhost in dev, preview deploys on Vercel
  ]);

  return allowed.has(origin);
}
