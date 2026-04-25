import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    autoRefreshToken: false,
    persistSession: false,
  },
});

let _serviceClient: SupabaseClient<Database> | null = null;

export function getServiceClient() {
  if (!_serviceClient) {
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    _serviceClient = createClient<Database>(supabaseUrl, serviceKey);
  }
  return _serviceClient;
}

/**
 * Emergency admin allowlist. Read from the `ADMIN_EMAILS` env var
 * (comma-separated). The brand mailbox is always included as a safe
 * default. Personal operator emails MUST be configured via environment,
 * never committed to this repo.
 */
const ADMIN_EMAILS_ENV = (import.meta.env.ADMIN_EMAILS as string | undefined) ?? "";
export const ADMIN_EMAILS = Array.from(
  new Set(
    [
      "hello@littlechubbypress.com",
      ...ADMIN_EMAILS_ENV.split(",").map((e) => e.trim().toLowerCase()),
    ].filter(Boolean),
  ),
);

/**
 * Check admin access.
 *
 * Policy (decided 24 abr 2026, docs-internal/implementation-packages/P1-05):
 * 1. DB `profiles.is_admin` is the single source of truth.
 * 2. `ADMIN_EMAILS` env var is an **emergency fallback only** — it grants
 *    access **exclusively** when the DB query throws (timeout, connection
 *    refused, etc.). If the DB returns a valid response with `is_admin=false`,
 *    that is respected; the env var is NOT consulted.
 * 3. If the DB returns a row with `is_admin=true`, grant access immediately.
 * 4. If the DB returns no row, deny access.
 *
 * This ensures that revoking admin in DB is always effective, while still
 * keeping a break-glass path if Supabase is unreachable.
 */
export async function isAdmin(user: { id: string; email?: string }): Promise<boolean> {
  try {
    const sc = getServiceClient();
    const { data, error } = await sc
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    // DB responded cleanly — its answer is authoritative.
    if (!error) {
      return data?.is_admin === true;
    }

    // DB responded with an error code that is NOT a connectivity failure
    // (e.g. row-not-found PGRST116). Treat as "not admin", do NOT fallback.
    // Only real infrastructure failures fall through to the catch block below.
    if (error.code && error.code !== "PGRST116") {
      // Log but don't fallback — this is a real query error, not DB down.
      console.warn("[isAdmin] DB query error (no fallback):", error.code, error.message);
      return false;
    }

    // Row not found (PGRST116): user has no profile row. Deny.
    return false;
  } catch (err) {
    // Real infrastructure failure (network, timeout, client init). Activate
    // emergency fallback. Logged loudly so Sentry/monitoring catches this.
    console.error(
      "[isAdmin] DB unreachable, falling back to ADMIN_EMAILS allowlist:",
      err instanceof Error ? err.message : err,
    );
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error(
        "[isAdmin] Emergency fallback GRANTED access to:",
        user.email.toLowerCase(),
      );
      return true;
    }
    return false;
  }
}
