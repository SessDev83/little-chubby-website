import type { Lang } from "./i18n";

export type FunFactCategorySlug =
  | "space"
  | "animals"
  | "body"
  | "earth"
  | "ocean"
  | "food-plants"
  | "machines-inventions"
  | "colors-art"
  | "history-language";

export type FunFactCategory = {
  slug: FunFactCategorySlug;
  icon: string;
  color: string;
  tags: readonly string[];
  label: Record<Lang, string>;
  shortLabel: Record<Lang, string>;
  description: Record<Lang, string>;
  metaTitle: Record<Lang, string>;
  metaDescription: Record<Lang, string>;
};

export const funFactCategories: readonly FunFactCategory[] = [
  {
    slug: "space",
    icon: "🚀",
    color: "var(--brand-blue)",
    tags: ["space"],
    label: { es: "Espacio", en: "Space" },
    shortLabel: { es: "Espacio", en: "Space" },
    description: {
      es: "Planetas, estrellas fugaces, astronautas y misterios del cielo que invitan a colorear mundos nuevos.",
      en: "Planets, shooting stars, astronauts, and sky mysteries that invite kids to color new worlds.",
    },
    metaTitle: {
      es: "Datos curiosos del espacio para niños | Little Chubby Press",
      en: "Space Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos del espacio para niños: planetas, meteoros, la Luna, Marte y actividades creativas para colorear.",
      en: "Space fun facts for kids: planets, meteors, the Moon, Mars, and creative coloring prompts for families.",
    },
  },
  {
    slug: "animals",
    icon: "🐾",
    color: "var(--brand-green)",
    tags: ["animals", "pets", "dinosaurs"],
    label: { es: "Animales", en: "Animals" },
    shortLabel: { es: "Animales", en: "Animals" },
    description: {
      es: "Mascotas, animales salvajes, criaturas marinas y dinosaurios con detalles fáciles de compartir en familia.",
      en: "Pets, wild animals, sea creatures, and dinosaurs with family-friendly details worth sharing.",
    },
    metaTitle: {
      es: "Datos curiosos de animales para niños | Little Chubby Press",
      en: "Animal Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de animales para niños: mascotas, criaturas marinas, dinosaurios y prompts creativos para colorear.",
      en: "Animal fun facts for kids: pets, sea creatures, dinosaurs, and creative coloring prompts.",
    },
  },
  {
    slug: "body",
    icon: "🧠",
    color: "var(--accent-coral)",
    tags: ["body"],
    label: { es: "Cuerpo Humano", en: "Human Body" },
    shortLabel: { es: "Cuerpo", en: "Body" },
    description: {
      es: "Cerebro, huesos, dientes, sentidos y pequeñas sorpresas del cuerpo explicadas con cuidado familiar.",
      en: "Brain, bones, teeth, senses, and small body surprises explained with a family-safe touch.",
    },
    metaTitle: {
      es: "Datos curiosos del cuerpo humano para niños | Little Chubby Press",
      en: "Human Body Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos del cuerpo humano para niños: huesos, dientes, sentidos y ciencia simple para familias.",
      en: "Human body fun facts for kids: bones, teeth, senses, and simple science for families.",
    },
  },
  {
    slug: "earth",
    icon: "🌍",
    color: "var(--brand-brown)",
    tags: ["earth"],
    label: { es: "Planeta Tierra", en: "Planet Earth" },
    shortLabel: { es: "Tierra", en: "Earth" },
    description: {
      es: "Geografía, polos, formas del planeta y detalles de la Tierra que convierten mapas en aventuras.",
      en: "Geography, poles, planet shapes, and Earth details that turn maps into adventures.",
    },
    metaTitle: {
      es: "Datos curiosos de la Tierra para niños | Little Chubby Press",
      en: "Earth Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de la Tierra para niños: geografía, polos, mapas y ciencia del planeta para colorear.",
      en: "Earth fun facts for kids: geography, poles, maps, and planet science with coloring prompts.",
    },
  },
  {
    slug: "ocean",
    icon: "🌊",
    color: "#287c9b",
    tags: ["ocean"],
    label: { es: "Océano", en: "Ocean" },
    shortLabel: { es: "Océano", en: "Ocean" },
    description: {
      es: "Vida marina, océano profundo, oxígeno y misterios azules para peques curiosos.",
      en: "Marine life, the deep sea, oxygen, and blue mysteries for curious kids.",
    },
    metaTitle: {
      es: "Datos curiosos del océano para niños | Little Chubby Press",
      en: "Ocean Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos del océano para niños: vida marina, mar profundo, oxígeno y actividades creativas.",
      en: "Ocean fun facts for kids: marine life, the deep sea, oxygen, and creative family activities.",
    },
  },
  {
    slug: "food-plants",
    icon: "🍓",
    color: "#8a7d22",
    tags: ["food", "plants"],
    label: { es: "Comida y Plantas", en: "Food & Plants" },
    shortLabel: { es: "Comida", en: "Food" },
    description: {
      es: "Frutas, verduras, plantas y ciencia de cocina con conexiones naturales al dibujo y al color.",
      en: "Fruits, vegetables, plants, and kitchen science with natural links to drawing and color.",
    },
    metaTitle: {
      es: "Datos curiosos de comida y plantas para niños | Little Chubby Press",
      en: "Food and Plant Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de comida y plantas para niños: frutas, verduras, bambú, ciencia simple y colorear.",
      en: "Food and plant fun facts for kids: fruit, vegetables, bamboo, simple science, and coloring prompts.",
    },
  },
  {
    slug: "machines-inventions",
    icon: "🛠️",
    color: "var(--accent-gold)",
    tags: ["machines", "inventions", "construction", "airplanes"],
    label: { es: "Máquinas e Inventos", en: "Machines & Inventions" },
    shortLabel: { es: "Inventos", en: "Inventions" },
    description: {
      es: "Vehículos, herramientas, ingeniería y objetos cotidianos con historias sorprendentes.",
      en: "Vehicles, tools, engineering, and everyday objects with surprising stories.",
    },
    metaTitle: {
      es: "Datos curiosos de máquinas e inventos para niños | Little Chubby Press",
      en: "Machine and Invention Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de máquinas e inventos para niños: vehículos, construcción, ingeniería y objetos cotidianos.",
      en: "Machine and invention fun facts for kids: vehicles, construction, engineering, and everyday objects.",
    },
  },
  {
    slug: "colors-art",
    icon: "🎨",
    color: "#b06aa7",
    tags: ["colors", "art"],
    label: { es: "Colores y Arte", en: "Colors & Art" },
    shortLabel: { es: "Colores", en: "Colors" },
    description: {
      es: "Colores raros, crayones, tinta, arte y pequeñas historias perfectas para empezar una página de colorear.",
      en: "Rare colors, crayons, ink, art, and small stories perfect for starting a coloring page.",
    },
    metaTitle: {
      es: "Datos curiosos de colores y arte para niños | Little Chubby Press",
      en: "Color and Art Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de colores y arte para niños: crayones, tinta, colores raros y actividades para colorear.",
      en: "Color and art fun facts for kids: crayons, ink, rare colors, and coloring activities.",
    },
  },
  {
    slug: "history-language",
    icon: "📚",
    color: "#7b5bb7",
    tags: ["history", "language", "fantasy", "dinosaurs"],
    label: { es: "Historia y Palabras", en: "History & Words" },
    shortLabel: { es: "Historia", en: "History" },
    description: {
      es: "Origen de palabras, mitos, historia suave y datos culturales que despiertan conversaciones.",
      en: "Word origins, myths, gentle history, and cultural facts that spark conversation.",
    },
    metaTitle: {
      es: "Datos curiosos de historia y palabras para niños | Little Chubby Press",
      en: "History and Word Fun Facts for Kids | Little Chubby Press",
    },
    metaDescription: {
      es: "Datos curiosos de historia y palabras para niños: origen de nombres, mitos y cultura explicada de forma familiar.",
      en: "History and word fun facts for kids: name origins, myths, and culture explained in a family-friendly way.",
    },
  },
] as const;

export function getFunFactCategoryBySlug(slug: string | undefined): FunFactCategory | undefined {
  return funFactCategories.find((category) => category.slug === slug);
}

export function getFunFactCategoryMatches(tags: readonly string[]): FunFactCategory[] {
  const tagSet = new Set(tags);
  return funFactCategories.filter((category) => category.tags.some((tag) => tagSet.has(tag)));
}

export function getPrimaryFunFactCategory(tags: readonly string[]): FunFactCategory {
  return getFunFactCategoryMatches(tags)[0] || funFactCategories[0];
}
