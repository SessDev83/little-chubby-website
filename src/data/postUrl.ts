import { getPrimaryFunFactCategory } from "./funFactCategories";

export function getPostUrl(
  lang: string,
  postId: string,
  category: string,
  tags: string[],
  articleCategory?: string
): string {
  const slug = postId.replace(/^(es|en)\//, "");
  if (category === "fun-fact") {
    const primaryCat = getPrimaryFunFactCategory(tags);
    return `/${lang}/fun-facts/${primaryCat.slug}/${slug}/`;
  }
  if (category === "article" && articleCategory) {
    return `/${lang}/articles/${articleCategory}/${slug}/`;
  }
  return `/${lang}/blog/${slug}/`;
}
