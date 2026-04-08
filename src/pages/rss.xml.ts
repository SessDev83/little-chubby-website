import rss from "@astrojs/rss";
import { siteConfig } from "../data/site";
import { postsSorted } from "../data/posts";

export async function GET() {
  return rss({
    title: "Little Chubby Press Blog",
    description: siteConfig.shortBio.en,
    site: siteConfig.siteUrl,
    items: postsSorted.map((post) => ({
      title: post.title.en,
      pubDate: new Date(`${post.date}T00:00:00`),
      description: post.summary.en,
      link: `/en/blog/${post.slug.en}/`,
    })),
    customData: `<language>en</language>`,
  });
}
