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

/** Check admin access: DB is_admin flag OR hardcoded email list */
export async function isAdmin(user: { id: string; email?: string }): Promise<boolean> {
  // Fast path: env-backed allowlist (case-insensitive)
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  // DB check: profiles.is_admin
  try {
    const sc = getServiceClient();
    const { data } = await sc
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    return data?.is_admin === true;
  } catch {
    return false;
  }
}
