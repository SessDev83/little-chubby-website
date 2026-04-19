export type LocalizedText = {
  es: string;
  en: string;
};

const cleanEnvValue = (value: string | undefined) => (value || "").trim();

const publicSiteUrl = cleanEnvValue(import.meta.env.PUBLIC_SITE_URL).replace(/\/+$/, "");
const resolvedSiteUrl = publicSiteUrl || "https://www.littlechubbypress.com";



const formspreeFormId = cleanEnvValue(import.meta.env.PUBLIC_FORMSPREE_FORM_ID);
const resolvedContactActionUrl = formspreeFormId
  ? `https://formspree.io/f/${encodeURIComponent(formspreeFormId)}`
  : "https://formspree.io/f/YOUR_FORM_ID";

export const siteConfig = {
  siteUrl: resolvedSiteUrl,
  brandName: "Little Chubby Press",
  penName: "Little Chubby Press",
  tagline: {
    es: "Libros de colorear creados por peques, para peques",
    en: "Coloring books created by kids, for kids"
  },
  shortBio: {
    es: "Publicamos libros de colorear para familias creativas: faciles de empezar, divertidos de completar y pensados para compartir tiempo de calidad.",
    en: "We publish coloring books for creative families: easy to start, fun to complete, and designed for meaningful family time."
  },
  longBio: {
    es: "Little Chubby Press es un pen name editorial enfocado en libros de colorear con identidad propia. Combinamos ilustraciones amables, retos creativos y experiencias que invitan a jugar sin pantallas.",
    en: "Little Chubby Press is an editorial pen name focused on coloring books with a unique identity. We blend friendly illustrations, creative prompts, and screen-free family experiences."
  },
  contactEmail: "hello@littlechubbypress.com",
  social: {
    instagram: "https://www.instagram.com/LittleChubbyPress",
    facebook: "https://www.facebook.com/profile.php?id=61572034373766",
    bluesky: "https://bsky.app/profile/littlechubbypress.bsky.social",
    amazonAuthor: "https://www.amazon.com/author/littlechubbypress"
  },
  brandAssets: {
    logoMark: "/images/brand/logo-mark.png",
    logoLockup: "/images/brand/logo-lockup.png",
    ogCover: "/images/brand/og-cover.png"
  },
  newsletter: {
    successRedirect: {
      es: "/es/thanks/?form=newsletter",
      en: "/en/thanks/?form=newsletter"
    }
  },
  contactForm: {
    providerName: "Formspree",
    actionUrl: resolvedContactActionUrl,
    providerGuide: {
      es: "Reemplaza YOUR_FORM_ID para recibir mensajes reales.",
      en: "Replace YOUR_FORM_ID to receive real messages."
    },
    successRedirect: {
      es: "/es/thanks/?form=contact",
      en: "/en/thanks/?form=contact"
    }
  }
} as const;

export const quickAdjustments = [
  "src/data/site.ts -> penName, bio, email, redes, provider URLs",
  "src/data/books.ts -> titulos, descripciones, enlaces Amazon, portadas",
  "src/data/posts.ts -> titulos, resumenes, slugs, contenido",
  "public/images/brand/ -> logo-mark.png, logo-lockup.png, og-cover.png"
] as const;
