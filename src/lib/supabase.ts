import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getServiceClient() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey);
}

/** Hardcoded fallback — always grants access to these emails */
export const ADMIN_EMAILS = [
  "ivan.c4u@gmail.com",
  "hello@littlechubbypress.com",
];

/** Check admin access: DB is_admin flag OR hardcoded email list */
export async function isAdmin(user: { id: string; email?: string }): Promise<boolean> {
  // Fast path: hardcoded list
  if (user.email && ADMIN_EMAILS.includes(user.email)) return true;
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
