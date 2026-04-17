import type { APIRoute } from "astro";
import { getServiceClient } from "../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || "https://www.littlechubbypress.com";

  if (!token) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/en/` },
    });
  }

  const supabase = getServiceClient();

  // token = subscriber id
  const { data: subscriber, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, lang_pref")
    .eq("id", token)
    .maybeSingle();

  if (error || !subscriber) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/en/?msg=invalid-token` },
    });
  }

  const lang = subscriber.lang_pref || "en";

  // Delete the subscriber (hard unsubscribe) 
  const { error: delErr } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .eq("id", subscriber.id);

  if (delErr) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/${lang}/?msg=error` },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: `${siteUrl}/${lang}/?msg=unsubscribed` },
  });
};
