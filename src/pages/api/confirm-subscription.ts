import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";
import { notifySubscriberConfirmed } from "../../lib/notifications";
import { buildAnalyticsVisitorHash, trackServerConversionEvent } from "../../lib/server-analytics";
import { getPublicSiteUrl } from "../../lib/site-url";

export const prerender = false;

export const GET: APIRoute = async ({ url, request }) => {
  const token = url.searchParams.get("token");
  const rawLang = url.searchParams.get("lang") || "en";
  const lang = rawLang === "es" ? "es" : "en";
  const siteUrl = getPublicSiteUrl();

  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return new Response(null, { status: 302, headers: { Location: `${siteUrl}/${lang}/?msg=invalid-token` } });
  }

  const supabase = getServiceClient();

  // Find subscriber by confirm_token
  const { data: subscriber, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, confirmed")
    .eq("confirm_token", token)
    .maybeSingle();

  if (error || !subscriber) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/${lang}/?msg=invalid-token` },
    });
  }

  if (subscriber.confirmed) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/${lang}/?msg=already-confirmed` },
    });
  }

  // Confirm the subscriber and rotate token (old link can't unsubscribe)
  const { error: updateErr } = await supabase
    .from("newsletter_subscribers")
    .update({ confirmed: true, confirm_token: crypto.randomUUID() })
    .eq("id", subscriber.id);

  if (updateErr) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/${lang}/?msg=error` },
    });
  }

  // Notify admin
  await notifySubscriberConfirmed(subscriber.email || "unknown");

  await trackServerConversionEvent(supabase, {
    eventName: "newsletter_confirmed",
    request,
    path: `/${lang}/welcome/`,
    lang,
    visitorHash: buildAnalyticsVisitorHash(subscriber.email),
    props: {
      source: "double_opt_in",
    },
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `${siteUrl}/${lang}/welcome/` },
  });
};
