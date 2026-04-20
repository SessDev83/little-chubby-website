import rss from "@astrojs/rss";
import { siteConfig } from "../data/site";
import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("blog", (entry) => entry.data.lang === "en");
  const sorted = posts.sort((a, b) => b.data.date.localeCompare(a.data.date));

  return rss({
    title: "Little Chubby Press Blog",
    description: siteConfig.shortBio.en,
    site: siteConfig.siteUrl,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: new Date(`${post.data.date}T00:00:00`),
      description: post.data.summary,
      link: `/en/blog/${post.id.replace(/^en\//, "")}/`,
      categories: post.data.tags || [],
    })),
    customData: `<language>en</language>`,
  });
}
