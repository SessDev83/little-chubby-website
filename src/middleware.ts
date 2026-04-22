import { defineMiddleware } from "astro:middleware";
import { supabase, getServiceClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  // Default: no user
  context.locals.user = null;
  context.locals.parentConsentAt = null;

  const accessToken = context.cookies.get("sb-access-token")?.value;
  const refreshToken = context.cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return next();
  }

  // Try to restore / refresh the session
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    // Tokens are invalid and cannot be refreshed — clear cookies
    context.cookies.delete("sb-access-token", { path: "/" });
    context.cookies.delete("sb-refresh-token", { path: "/" });
    context.cookies.delete("sb-logged-in", { path: "/" });
    return next();
  }

  // If Supabase returned a fresh token pair, update the cookies
  if (data.session.access_token !== accessToken) {
    context.cookies.set("sb-access-token", data.session.access_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    context.cookies.set("sb-refresh-token", data.session.refresh_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    context.cookies.set("sb-logged-in", "1", {
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  context.locals.user = data.session.user;

  // ── Suspension check: block suspended users (pages AND APIs) ──
  const url = new URL(context.request.url);
  const isApiRoute = url.pathname.startsWith("/api/");
  const isAuthRoute = url.pathname.includes("/login") || url.pathname.includes("/logout") || url.pathname.includes("/auth/");
  const isCronRoute = url.pathname.startsWith("/api/cron/");
  if (!isAuthRoute && !isCronRoute) {
    try {
      const sc = getServiceClient();
      const { data: profile } = await sc
        .from("profiles")
        .select("suspended, parent_consent_at")
        .eq("id", data.session.user.id)
        .single();
      if (profile?.suspended) {
        context.cookies.delete("sb-access-token", { path: "/" });
        context.cookies.delete("sb-refresh-token", { path: "/" });
        context.cookies.delete("sb-logged-in", { path: "/" });
        context.locals.user = null;
        if (isApiRoute) {
          return new Response(JSON.stringify({ error: "Account suspended" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        return context.redirect("/es/login/");
      }
      context.locals.parentConsentAt = profile?.parent_consent_at ?? null;
    } catch { /* non-blocking: allow through if check fails */ }
  }

  const response = await next();

  // Prevent browser caching of SSR pages (especially reviews with inline scripts)
  if (url.pathname.includes("/reviews")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
});
