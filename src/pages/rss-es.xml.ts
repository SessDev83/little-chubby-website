import rss from "@astrojs/rss";
import { siteConfig } from "../data/site";
import { postsSorted } from "../data/posts";

export async function GET() {
  return rss({
    title: "Little Chubby Press Blog (Español)",
    description: siteConfig.shortBio.es,
    site: siteConfig.siteUrl,
    items: postsSorted.map((post) => ({
      title: post.title.es,
      pubDate: new Date(`${post.date}T00:00:00`),
      description: post.summary.es,
      link: `/es/blog/${post.slug.es}/`,
    })),
    customData: `<language>es</language>`,
  });
}
