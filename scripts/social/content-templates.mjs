/**
 * Content templates for social media posts.
 * Each template is a function that receives a book/post object and returns
 * { text, hashtags, cta } for a given language.
 */

const SITE_URL = "https://www.littlechubbypress.com";

// ─── UTM helpers ────────────────────────────────────────────────────────────

/**
 * Append UTM query params to a site URL (skips Amazon / external links).
 * @param {string} url
 * @param {{ source?: string, campaign?: string, content?: string }} utm
 * @returns {string}
 */
export function buildUtmUrl(url, { source = "social", campaign = "organic", content } = {}) {
  // Only tag our own URLs — Amazon strips UTM params
  if (!url.startsWith(SITE_URL)) return url;
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  if (content) u.searchParams.set("utm_content", content);
  return u.toString();
}

// Internal: wrap a site URL at template-render time (platform + campaign set later)
let _utmCtx = { source: "social", campaign: "organic" };
function siteUrl(path) {
  return buildUtmUrl(`${SITE_URL}${path}`, _utmCtx);
}

// ─── Hashtag pools ──────────────────────────────────────────────────────────

const BASE_HASHTAGS_EN = [
  "#ColoringBook", "#KidsActivities", "#AmazonKDP",
  "#LittleChubbyPress", "#ColoringFun", "#KidsColoring",
  "#FamilyTime", "#ScreenFreePlay", "#CreativeKids",
];

const BASE_HASHTAGS_ES = [
  "#LibroDeColorear", "#ActividadesParaNinos", "#AmazonKDP",
  "#LittleChubbyPress", "#ColorearEsDivertido", "#TiempoEnFamilia",
  "#NinosCreativos", "#SinPantallas",
];

// pick N random items without repeats
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Book promo templates ───────────────────────────────────────────────────

const bookPromoTemplates = {
  en: [
    (b) => ({
      text: `🎨 Meet "${b.title.en}" — ${b.subtitle.en}!\n\n${b.description.en}\n\n📖 ${b.pages} pages of creative fun for ${b.ageRange.en}.`,
      cta: `Get your copy on Amazon 👉 ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `Looking for screen-free fun? "${b.title.en}" is packed with ${b.pages} pages of coloring magic for ${b.ageRange.en}. ✨\n\n${b.subtitle.en}`,
      cta: `Available now on Amazon: ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `Parents, this one's for you! 🙌\n\n"${b.title.en}" keeps kids busy, creative, and OFF screens. ${b.pages} single-sided pages — no bleed-through!\n\n${b.description.en}`,
      cta: `Grab it on Amazon: ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `Need a gift idea? 🎁\n\n"${b.title.en}" is the perfect creative gift for ${b.ageRange.en}.\n\n${b.subtitle.en}. ${b.pages} beautiful pages to explore!`,
      cta: `Order on Amazon: ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `Rainy day? Boring afternoon? ☔\n\n"${b.title.en}" turns any dull moment into creative time.\n\n${b.description.en}`,
      cta: `Find it on Amazon: ${b.amazonUrl}`,
    }),
  ],
  es: [
    (b) => ({
      text: `🎨 Conoce "${b.title.es}" — ${b.subtitle.es}!\n\n${b.description.es}\n\n📖 ${b.pages} paginas de diversion creativa para ${b.ageRange.es}.`,
      cta: `Consiguelo en Amazon 👉 ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `¿Buscas diversion sin pantallas? "${b.title.es}" tiene ${b.pages} paginas de magia para colorear para ${b.ageRange.es}. ✨\n\n${b.subtitle.es}`,
      cta: `Disponible en Amazon: ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `Papas, este es para ustedes! 🙌\n\n"${b.title.es}" mantiene a los peques ocupados, creativos y SIN pantallas. ${b.pages} paginas a una cara — sin que traspase!\n\n${b.description.es}`,
      cta: `Consiguelo en Amazon: ${b.amazonUrl}`,
    }),
    (b) => ({
      text: `¿Necesitas idea de regalo? 🎁\n\n"${b.title.es}" es el regalo creativo perfecto para ${b.ageRange.es}.\n\n${b.subtitle.es}. ${b.pages} hermosas paginas para explorar!`,
      cta: `Pidelo en Amazon: ${b.amazonUrl}`,
    }),
  ],
};

// ─── Blog share templates ───────────────────────────────────────────────────

const blogShareTemplates = {
  en: [
    (p) => ({
      text: `📝 New on the blog: "${p.title.en}"\n\n${p.summary.en}`,
      cta: `Read more 👉 ${siteUrl(`/en/blog/${p.slug.en}`)}`,
    }),
    (p) => ({
      text: `Did you know? 🤔\n\n${p.summary.en}\n\nWe wrote a full guide about it!`,
      cta: `Check it out: ${siteUrl(`/en/blog/${p.slug.en}`)}`,
    }),
  ],
  es: [
    (p) => ({
      text: `📝 Nuevo en el blog: "${p.title.es}"\n\n${p.summary.es}`,
      cta: `Lee mas 👉 ${siteUrl(`/es/blog/${p.slug.es}`)}`,
    }),
    (p) => ({
      text: `¿Sabias? 🤔\n\n${p.summary.es}\n\nEscribimos una guia completa!`,
      cta: `Leela aqui: ${siteUrl(`/es/blog/${p.slug.es}`)}`,
    }),
  ],
};

// ─── Blog-new templates (for announcing new blog posts) ─────────────────────

const blogNewTemplates = {
  en: [
    (p) => ({
      text: `🆕 Just published! "${p.title.en}"\n\n${p.summary.en}\n\nFresh off the blog — don't miss it!`,
      cta: `Read it now 👉 ${siteUrl(`/en/blog/${p.slug.en}`)}`,
    }),
    (p) => ({
      text: `📣 New on the blog today!\n\n"${p.title.en}"\n\n${p.summary.en}`,
      cta: `Check it out: ${siteUrl(`/en/blog/${p.slug.en}`)}`,
    }),
    (p) => ({
      text: `Hot off the press! 🔥\n\nWe just published a new guide: "${p.title.en}"\n\n${p.summary.en}`,
      cta: `Read the full article: ${siteUrl(`/en/blog/${p.slug.en}`)}`,
    }),
  ],
  es: [
    (p) => ({
      text: `🆕 ¡Recien publicado! "${p.title.es}"\n\n${p.summary.es}\n\n¡Directo del blog — no te lo pierdas!`,
      cta: `Leelo ahora 👉 ${siteUrl(`/es/blog/${p.slug.es}`)}`,
    }),
    (p) => ({
      text: `📣 ¡Nuevo en el blog hoy!\n\n"${p.title.es}"\n\n${p.summary.es}`,
      cta: `Miralo aqui: ${siteUrl(`/es/blog/${p.slug.es}`)}`,
    }),
    (p) => ({
      text: `¡Recien salido del horno! 🔥\n\nPublicamos una nueva guia: "${p.title.es}"\n\n${p.summary.es}`,
      cta: `Lee el articulo completo: ${siteUrl(`/es/blog/${p.slug.es}`)}`,
    }),
  ],
};

// ─── Engagement / tips templates (no book needed) ───────────────────────────

const engagementTemplates = {
  en: [
    () => ({
      text: `What's your kid's favorite thing to color? 🖍️\n\nAnimals 🐾\nSpace 🚀\nFashion 👗\nFood 🍕\nVehicles 🚗\n\nTell us in the comments!`,
      cta: `Explore our full collection: ${siteUrl("/en/books")}`,
    }),
    () => ({
      text: `3 benefits of coloring that might surprise you:\n\n1️⃣ Improves fine motor skills\n2️⃣ Reduces screen time naturally\n3️⃣ Creates calm family moments\n\nHow often does your family color together?`,
      cta: `Discover our books: ${siteUrl("/en/books")}`,
    }),
    () => ({
      text: `Pro tip for parents: 💡\n\nDon't say "go draw something." Instead, sit down and color WITH your kids for 10 minutes. Watch the magic happen. ✨\n\nColoring together > coloring alone.`,
      cta: `Find the perfect book: ${siteUrl("/en/books")}`,
    }),
    () => ({
      text: `Every page colored is a screen-free victory! 📵🎨\n\nOur coloring books are designed for meaningful family time — no batteries required.\n\nWhat's your family's screen-free activity?`,
      cta: `Browse our books: ${siteUrl("/en/books")}`,
    }),
    () => ({
      text: `Did you know? The average kid spends 7+ hours/day on screens. 😟\n\nColoring books offer a simple, creative alternative that kids actually enjoy.\n\nStart with just 15 minutes a day!`,
      cta: `See our collection: ${siteUrl("/en/books")}`,
    }),
  ],
  es: [
    () => ({
      text: `¿Que es lo que mas le gusta colorear a tu peque? 🖍️\n\nAnimales 🐾\nEspacio 🚀\nModa 👗\nComida 🍕\nVehiculos 🚗\n\n¡Cuentanos en los comentarios!`,
      cta: `Explora nuestra coleccion: ${siteUrl("/es/books")}`,
    }),
    () => ({
      text: `3 beneficios de colorear que te sorprenderan:\n\n1️⃣ Mejora la motricidad fina\n2️⃣ Reduce el uso de pantallas\n3️⃣ Crea momentos familiares de calma\n\n¿Cada cuanto colorean juntos en familia?`,
      cta: `Descubre nuestros libros: ${siteUrl("/es/books")}`,
    }),
    () => ({
      text: `Tip para padres: 💡\n\nNo digas "ve a dibujar." Mejor sientate y colorea CON tus peques 10 minutos. Mira la magia. ✨\n\nColorear juntos > colorear solo.`,
      cta: `Encuentra el libro perfecto: ${siteUrl("/es/books")}`,
    }),
    () => ({
      text: `¡Cada pagina coloreada es una victoria sin pantallas! 📵🎨\n\nNuestros libros de colorear estan disenados para tiempo de calidad en familia.\n\n¿Cual es la actividad sin pantallas de tu familia?`,
      cta: `Mira nuestros libros: ${siteUrl("/es/books")}`,
    }),
  ],
};

// ─── Community / website traffic templates ──────────────────────────────────

const communityTemplates = {
  en: [
    () => ({
      text: `Want coloring tips, free activities, and first looks at new books? 📬\n\nJoin our newsletter — it's free, fun, and screen-free friendly!`,
      cta: `Sign up here: ${siteUrl("/en/newsletter")}`,
    }),
    () => ({
      text: `We'd love to see your kid's artwork! 🎨\n\nShare your coloring creations with us — tag @LittleChubbyPress or visit our gallery for inspiration.`,
      cta: `See the gallery: ${siteUrl("/en/gallery")}`,
    }),
    () => ({
      text: `New books, tips, and free coloring resources — all in one place! 📚\n\nVisit our website and discover what's new at Little Chubby Press.`,
      cta: `Explore: ${siteUrl("/en")}`,
    }),
    () => ({
      text: `Got questions about our coloring books? Want to suggest a theme? 💌\n\nWe read every message! Drop us a line and let's chat.`,
      cta: `Contact us: ${siteUrl("/en/contact")}`,
    }),
    () => ({
      text: `Looking for your next family coloring session? 📖✨\n\nBrowse our full collection — there's something for every age and every mood!`,
      cta: `See all books: ${siteUrl("/en/books")}`,
    }),
  ],
  es: [
    () => ({
      text: `¿Quieres tips de colorear, actividades gratis y acceso anticipado a nuevos libros? 📬\n\n¡Unete a nuestro newsletter — es gratis y divertido!`,
      cta: `Registrate aqui: ${siteUrl("/es/newsletter")}`,
    }),
    () => ({
      text: `¡Nos encantaria ver las obras de arte de tus peques! 🎨\n\nComparte sus creaciones con nosotros — visita nuestra galeria para inspirarte.`,
      cta: `Ver la galeria: ${siteUrl("/es/gallery")}`,
    }),
    () => ({
      text: `Nuevos libros, tips y recursos gratis para colorear — todo en un lugar! 📚\n\nVisita nuestro sitio y descubre las novedades de Little Chubby Press.`,
      cta: `Explora: ${siteUrl("/es")}`,
    }),
    () => ({
      text: `¿Tienes preguntas sobre nuestros libros? ¿Quieres sugerir un tema? 💌\n\n¡Leemos cada mensaje! Escribenos y platiquemos.`,
      cta: `Contacto: ${siteUrl("/es/contact")}`,
    }),
    () => ({
      text: `¿Buscas tu proxima sesion de colorear en familia? 📖✨\n\nExplora nuestra coleccion completa — hay algo para cada edad y cada momento!`,
      cta: `Ver todos los libros: ${siteUrl("/es/books")}`,
    }),
  ],
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a social media post.
 * @param {"book-promo"|"blog-share"|"engagement"|"review-request"} type
 * @param {"en"|"es"} lang
 * @param {object} [data] - book or post object (not needed for engagement)
 * @param {{ source?: string }} [utmOpts] - UTM overrides (source set per-platform by caller)
 * @returns {{ text: string, hashtags: string, fullPost: string }}
 */
export function generatePost(type, lang, data, utmOpts = {}) {
  // Set UTM context so siteUrl() embeds tracking params in every CTA
  _utmCtx = { source: utmOpts.source || "social", campaign: type };

  let templates;
  switch (type) {
    case "book-promo":
      templates = bookPromoTemplates[lang];
      break;
    case "blog-share":
      templates = blogShareTemplates[lang];
      break;
    case "blog-new":
      templates = blogNewTemplates[lang];
      break;
    case "engagement":
      templates = engagementTemplates[lang];
      break;
    case "community":
      templates = communityTemplates[lang];
      break;
    case "parenting-tip":
    case "behind-scenes":
    case "fun-fact":
      // These AI-only types fall back to engagement templates
      templates = engagementTemplates[lang];
      break;
    default:
      throw new Error(`Unknown template type: ${type}`);
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  const { text, cta } = template(data);

  const hashtagPool = lang === "es" ? BASE_HASHTAGS_ES : BASE_HASHTAGS_EN;
  const hashtags = pickRandom(hashtagPool, 5).join(" ");

  const fullPost = `${text}\n\n${cta}\n\n${hashtags}`;

  return { text, cta, hashtags, fullPost };
}

/**
 * Generate a weekly content calendar (7 posts).
 * @param {object[]} books - array of book objects
 * @param {object[]} posts - array of blog post objects
 * @param {"en"|"es"} lang
 * @returns {Array<{ day: string, type: string, fullPost: string }>}
 */
export function generateWeeklyCalendar(books, posts, lang) {
  const schedule = [
    { day: "Monday",    type: "book-promo" },
    { day: "Tuesday",   type: "parenting-tip" },
    { day: "Wednesday", type: "blog-share" },
    { day: "Thursday",  type: "behind-scenes" },
    { day: "Friday",    type: "fun-fact" },
    { day: "Saturday",  type: "community" },
    { day: "Sunday",    type: "engagement" },
  ];

  let bookIdx = Math.floor(Math.random() * books.length);
  let postIdx = Math.floor(Math.random() * posts.length);

  return schedule.map(({ day, type }) => {
    let data;
    if (type === "book-promo" || type === "review-request") {
      data = books[bookIdx % books.length];
      bookIdx++;
    } else if (type === "blog-share") {
      data = posts[postIdx % posts.length];
      postIdx++;
    }
    const post = generatePost(type, lang, data);
    return { day, type, ...post };
  });
}
