import type { Lang } from "./i18n";
import type { LocalizedText } from "./site";

export type SampleReview = {
  id: string;
  book_id: string;
  photo_url: string;
  extra_photos: string[];
  rating: number;
  review_text: LocalizedText;
  featured: boolean;
  display_name: string;
  submitted_at: string;
  /** marks this as a sample so the UI can badge / hide it later */
  isSample: true;
};

export const sampleReviews: SampleReview[] = [
  {
    id: "sample-awesome-girls-1",
    book_id: "awesome-girls",
    photo_url: "/images/gallery/awesome-girls/cover.webp",
    extra_photos: [
      "/images/gallery/awesome-girls/interior-1.webp",
      "/images/gallery/awesome-girls/interior-2.webp",
    ],
    rating: 5,
    review_text: {
      es: "A mi hija le encanto! Los dibujos son super lindos y los coloreo todos en una tarde. El gatito es su favorito 🐱",
      en: "My daughter loved it! The illustrations are super cute and she colored them all in one afternoon. The kitty is her favorite 🐱",
    },
    featured: true,
    display_name: "Sofia C.",
    submitted_at: "2026-04-15T10:00:00Z",
    isSample: true,
  },
];

/** How many real reviews needed before hiding samples */
export const SAMPLE_THRESHOLD = 3;

/**
 * Return sample reviews localized for the given language.
 * Shape matches the gallery_feed view columns so they can be
 * merged directly into the items array.
 */
export function getSampleItems(lang: Lang) {
  return sampleReviews.map((r) => ({
    id: r.id,
    book_id: r.book_id,
    photo_url: r.photo_url,
    extra_photos: r.extra_photos,
    rating: r.rating,
    review_text: r.review_text[lang],
    featured: r.featured,
    display_name: r.display_name,
    submitted_at: r.submitted_at,
    isSample: true,
  }));
}
