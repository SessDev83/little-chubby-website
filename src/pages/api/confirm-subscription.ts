import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";
import { notifySubscriberConfirmed } from "../../lib/notifications";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");
  const lang = url.searchParams.get("lang") || "en";
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com";

  if (!token) {
    return new Response(null, { status: 302, headers: { Location: `${siteUrl}/${lang}/` } });
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

  // Confirm the subscriber
  const { error: updateErr } = await supabase
    .from("newsletter_subscribers")
    .update({ confirmed: true })
    .eq("id", subscriber.id);

  if (updateErr) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/${lang}/?msg=error` },
    });
  }

  // Notify admin (non-blocking)
  notifySubscriberConfirmed(subscriber.email || "unknown");

  return new Response(null, {
    status: 302,
    headers: { Location: `${siteUrl}/${lang}/?msg=subscribed` },
  });
};
