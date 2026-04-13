import { defineMiddleware } from "astro:middleware";
import { supabase } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  // Default: no user
  context.locals.user = null;

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
  return next();
});
