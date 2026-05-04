# Fun-Fact Batches

This folder holds **bilingual (EN+ES) fun-fact batches** that feed
`scripts/import-fun-fact-batch.mjs`.

The goal: roll the website's fun-fact catalog from 60+ posts up past 500,
**organized by category and SEO-friendly**, in safe, reviewable packages.

## Why batches?

We don't dump 500 posts at once. Each batch:

- Is **kid-safe and family-friendly** (we rewrite all source data into
  Chubby-the-Elephant voice, never copy raw research).
- Is **bilingual by construction** — every fact has an EN and ES translation
  with a shared `postId` so language-switch links keep working.
- Is **SEO-balanced** — each batch fills weak categories first to grow the
  catalog evenly across the 10 fun-fact categories.
- Is **reviewable** — small enough to sanity-check titles/tags before merging.

## Categories

Defined in `src/data/funFactCategories.ts`:

| Slug                  | Tags it matches                                  |
| --------------------- | ------------------------------------------------ |
| `space`               | `space`                                          |
| `animals`             | `animals`, `pets`, `dinosaurs`                   |
| `body`                | `body`                                           |
| `earth`               | `earth`                                          |
| `ocean`               | `ocean`                                          |
| `food-plants`         | `food`, `plants`                                 |
| `machines-inventions` | `machines`, `inventions`, `construction`, `airplanes` |
| `colors-art`          | `colors`, `art`                                  |
| `history-language`    | `history`, `language`, `fantasy`, `dinosaurs`    |
| `world-records`       | `records`, `world-records`                       |

A fact's **category routing** comes from its `tags` array — no hardcoded
category field. To target a category, include one of its matching tags.

## Batch file format

`batch-NN.mjs` exports a default object with `facts: [...]`. Each fact:

```js
{
  slug: "fun-fact-some-kebab-slug",      // shared filename, must start fun-fact-
  postId: "fun-fact-some-id",            // shared cross-lang anchor
  tags: ["fun-fact", "space", "science"],// must include "fun-fact"
  en: {
    title: "Did You Know? ...",          // SEO title
    summary: "One-line preview ...",     // meta description
    body: `## Headline

Body in Chubby's voice with bold key facts and a Color-and-Discover
section the kid can act on.`,
  },
  es: { /* same shape, all fields translated */ }
}
```

The importer auto-fills `date`, `category: "fun-fact"`, `lang`, and `image: ""`.

## Running a batch

```bash
# Preview without writing:
node scripts/import-fun-fact-batch.mjs --batch 1 --dry-run

# Actually write Batch 1:
node scripts/import-fun-fact-batch.mjs --batch 1

# Pin a custom start date (otherwise: latest fun-fact date + 1 day):
node scripts/import-fun-fact-batch.mjs --batch 1 --start-date 2026-05-03
```

After writing, always run:

```bash
npm run check:i18n   # confirms EN/ES parity
npm run check        # Astro type/content schema check
npm run build        # full SSG build
```

## Roadmap

| Batch | Size | Focus                                                        |
| ----- | ---- | ------------------------------------------------------------ |
| 1     | 30   | Kick off World Records + fill weak Earth/Body/Ocean buckets  |
| 2     | 30   | SEO-balanced expansion across all 10 categories               |
| 3     | 35   | Inventions, History, Food & Plants                           |
| 4     | 35   | Body, Earth, World Records                                   |
| 5–10  | 50/each | Distribute remaining ~250 facts across all categories      |

Each batch should keep categories balanced; the homepage stat banner shows
totals per category and updates automatically.
