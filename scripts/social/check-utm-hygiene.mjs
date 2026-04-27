#!/usr/bin/env node

import {
  buildSocialCampaign,
  buildUtmContent,
  buildUtmUrl,
  inspectCampaignUtm,
} from "../../src/lib/campaign-utm.mjs";
import { injectUtms } from "./validate-post.mjs";

const FIXED_DATE = new Date("2026-04-27T12:00:00Z");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function urlParams(url) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

const campaign = buildSocialCampaign("Free Coloring");
assert(campaign === "sprint-free-coloring", `Unexpected campaign: ${campaign}`);

const content = buildUtmContent({
  type: "Free Coloring",
  source: "Facebook",
  lang: "en",
  creativeId: "Rainy Day Dinos",
  date: FIXED_DATE,
});
assert(content === "rainy-day-dinos-20260427-f-en", `Unexpected content id: ${content}`);

const tagged = buildUtmUrl("https://www.littlechubbypress.com/en/coloring-corner/?existing=1", {
  source: "Facebook",
  campaign,
  content,
});
const params = urlParams(tagged);
assert(params.existing === "1", "Existing query param was not preserved");
assert(params.utm_source === "facebook", "utm_source was not normalized");
assert(params.utm_medium === "social", "utm_medium should default to social");
assert(params.utm_campaign === "sprint-free-coloring", "utm_campaign mismatch");
assert(params.utm_content === "rainy-day-dinos-20260427-f-en", "utm_content mismatch");

const external = "https://www.amazon.com/dp/B000000000";
assert(buildUtmUrl(external, { source: "facebook", campaign, content }) === external, "External URLs must not be tagged");

const post = {
  concept: "Space travel quiet time",
  creativeId: "space-airplane-travel-quiet",
  platforms: {
    bluesky: {
      text: "Airplane trip coming up? Try https://www.littlechubbypress.com/en/coloring-corner/",
      hashtags: "#LittleChubbyPress #FreeColoring",
    },
    facebook: {
      text: "Grab the Space pages: https://www.littlechubbypress.com/en/coloring-corner/?utm_source=social&utm_campaign=old",
      hashtags: "#LittleChubbyPress #FreeColoring #KidsActivities",
    },
    instagram: {
      text: "Airplane quiet time sorted. Link in bio.",
      hashtags: "#LittleChubbyPress #FreeColoring #KidsActivities #ScreenFreeKids #Parenting",
    },
  },
};

injectUtms(post, { type: "free-coloring", lang: "en", date: FIXED_DATE });

const bskyUrl = post.platforms.bluesky.text.match(/https?:\/\/\S+/)[0];
const fbUrl = post.platforms.facebook.text.match(/https?:\/\/\S+/)[0];
const bskyInspection = inspectCampaignUtm(bskyUrl);
const fbInspection = inspectCampaignUtm(fbUrl);

assert(bskyInspection.ok, `Bluesky UTM failed: ${JSON.stringify(bskyInspection)}`);
assert(fbInspection.ok, `Facebook UTM failed: ${JSON.stringify(fbInspection)}`);
assert(bskyInspection.params.utm_source === "bluesky", "Bluesky source mismatch");
assert(fbInspection.params.utm_source === "facebook", "Facebook source mismatch");
assert(
  bskyInspection.params.utm_content === "space-airplane-travel-quiet-20260427-b-en",
  `Bluesky content mismatch: ${bskyInspection.params.utm_content}`
);
assert(
  fbInspection.params.utm_content === "space-airplane-travel-quiet-20260427-f-en",
  `Facebook content mismatch: ${fbInspection.params.utm_content}`
);
assert(!/https?:\/\//.test(post.platforms.instagram.text), "Instagram text should not gain a URL");

console.log("UTM hygiene OK");