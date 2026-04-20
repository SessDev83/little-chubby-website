import rss from "@astrojs/rss";
import { siteConfig } from "../data/site";
import { getCollection } from "astro:content";

export async function GET() {
  const posts = await getCollection("blog", (entry) => entry.data.lang === "es");
  const sorted = posts.sort((a, b) => b.data.date.localeCompare(a.data.date));

  return rss({
    title: "Little Chubby Press Blog (Español)",
    description: siteConfig.shortBio.es,
    site: siteConfig.siteUrl,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: new Date(`${post.data.date}T00:00:00`),
      description: post.data.summary,
      link: `/es/blog/${post.id.replace(/^es\//, "")}/`,
      categories: post.data.tags || [],
    })),
    customData: `<language>es</language>`,
  });
}
