import type { Lang } from "./i18n";

export type ArticleCategorySlug =
  | "focus-calm"
  | "learning"
  | "creativity"
  | "activities"
  | "guides";

export type ArticleCategory = {
  slug: ArticleCategorySlug;
  icon: string;
  color: string;
  label: Record<Lang, string>;
  shortLabel: Record<Lang, string>;
  description: Record<Lang, string>;
  metaTitle: Record<Lang, string>;
  metaDescription: Record<Lang, string>;
};

export const articleCategories: readonly ArticleCategory[] = [
  {
    slug: "focus-calm",
    icon: "🌿",
    color: "#4a9e7f",
    label: { es: "Calma y Concentración", en: "Focus & Calm" },
    shortLabel: { es: "Calma", en: "Calm" },
    description: {
      es: "Cómo colorear ayuda a niños con ansiedad, TDAH, transiciones difíciles, rutinas de sueño y desarrollo emocional.",
      en: "How coloring helps kids with anxiety, ADHD, tough transitions, bedtime routines, and emotional growth.",
    },
    metaTitle: {
      es: "Colorear para la calma y concentración infantil | Little Chubby Press",
      en: "Coloring for Kids' Focus and Calm | Little Chubby Press",
    },
    metaDescription: {
      es: "Artículos sobre cómo colorear ayuda a niños con ansiedad, TDAH, transiciones y concentración. Consejos prácticos para padres.",
      en: "Articles on how coloring helps kids with anxiety, ADHD, transitions, and focus. Practical tips for parents.",
    },
  },
  {
    slug: "learning",
    icon: "🎓",
    color: "var(--brand-blue)",
    label: { es: "Aprendizaje y STEM", en: "Learning & STEM" },
    shortLabel: { es: "Aprender", en: "Learn" },
    description: {
      es: "Geografía, letras, habilidades motoras finas, ciencia y habilidades espaciales a través del colorear.",
      en: "Geography, letters, fine motor skills, science, and spatial skills learned through coloring.",
    },
    metaTitle: {
      es: "Colorear para aprender y STEM | Little Chubby Press",
      en: "Coloring for Learning and STEM | Little Chubby Press",
    },
    metaDescription: {
      es: "Cómo los libros de colorear desarrollan habilidades de aprendizaje, STEM, motricidad fina y educación en niños.",
      en: "How coloring books develop learning skills, STEM, fine motor skills, and education in children.",
    },
  },
  {
    slug: "creativity",
    icon: "🎨",
    color: "#9b59a0",
    label: { es: "Creatividad", en: "Creativity" },
    shortLabel: { es: "Crear", en: "Create" },
    description: {
      es: "Imaginación, autoexpresión, moda, cuentos y confianza creativa a través del color y el arte.",
      en: "Imagination, self-expression, fashion, storytelling, and creative confidence through color and art.",
    },
    metaTitle: {
      es: "Colorear para la creatividad infantil | Little Chubby Press",
      en: "Coloring for Kids' Creativity | Little Chubby Press",
    },
    metaDescription: {
      es: "Artículos sobre creatividad, imaginación, moda y autoexpresión infantil a través del colorear.",
      en: "Articles on creativity, imagination, fashion, and self-expression in children through coloring.",
    },
  },
  {
    slug: "activities",
    icon: "⭐",
    color: "var(--accent-gold)",
    label: { es: "Actividades", en: "Activities" },
    shortLabel: { es: "Actividades", en: "Activities" },
    description: {
      es: "Ideas prácticas para colorear en familia: temporadas, viajes, sin pantallas, fiestas y tiempo libre en casa.",
      en: "Practical coloring ideas for families: seasonal, travel, screen-free, parties, and at-home fun.",
    },
    metaTitle: {
      es: "Actividades de colorear para familias | Little Chubby Press",
      en: "Coloring Activities for Families | Little Chubby Press",
    },
    metaDescription: {
      es: "Actividades de colorear para hacer en familia: estaciones, viajes, sin pantallas y mucho más.",
      en: "Family coloring activities: seasonal, travel, screen-free, and more fun ideas for kids.",
    },
  },
  {
    slug: "guides",
    icon: "📋",
    color: "var(--brand-brown)",
    label: { es: "Guías para Padres", en: "Parent Guides" },
    shortLabel: { es: "Guías", en: "Guides" },
    description: {
      es: "Cómo elegir libros de colorear, materiales recomendados y consejos prácticos para empezar bien.",
      en: "How to choose coloring books, recommended supplies, and practical tips to get started right.",
    },
    metaTitle: {
      es: "Guías de libros de colorear para padres | Little Chubby Press",
      en: "Coloring Book Guides for Parents | Little Chubby Press",
    },
    metaDescription: {
      es: "Guías para padres sobre cómo elegir libros de colorear, materiales y consejos para niños de todas las edades.",
      en: "Parent guides on choosing coloring books, supplies, and tips for kids of all ages.",
    },
  },
] as const;

export function getArticleCategoryBySlug(slug: string | undefined): ArticleCategory | undefined {
  return articleCategories.find((c) => c.slug === slug);
}
