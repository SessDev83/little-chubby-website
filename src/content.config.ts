import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/[!_]*.md", base: "./src/content/blog" }),
  schema: z.object({
    postId: z.string(),
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z.string(),
    lang: z.enum(["es", "en"]),
    category: z.enum(["article", "fun-fact", "joke", "coloring-corner"]).default("article"),
    articleCategory: z.enum(["focus-calm", "learning", "creativity", "activities", "guides"]).optional(),
    bookId: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    seoCluster: z
      .enum([
        "emotional-regulation",
        "screen-free-travel",
        "developmental-learning",
        "parent-wellbeing",
        "routines-early-education",
        "slow-parenting-nostalgia",
      ])
      .optional(),
    searchIntent: z.enum(["informational", "commercial", "transactional", "navigational", "lifestyle"]).optional(),
    contentRole: z.enum(["pillar", "spoke", "support"]).optional(),
    pillarId: z.string().optional(),
    primaryKeyword: z
      .object({
        en: z.string(),
        es: z.string(),
      })
      .optional(),
  }),
});

export const collections = { blog };
