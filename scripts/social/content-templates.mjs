/**
 * Content templates for social media posts.
 * Each template is a function that receives a book/post object and returns
 * { text, hashtags, cta } for a given language.
 */

const SITE_URL = "https://www.littlechubbypress.com";

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
      cta: `Read more 👉 ${SITE_URL}/en/blog/${p.slug.en}`,
    }),
    (p) => ({
      text: `Did you know? 🤔\n\n${p.summary.en}\n\nWe wrote a full guide about it!`,
      cta: `Check it out: ${SITE_URL}/en/blog/${p.slug.en}`,
    }),
  ],
  es: [
    (p) => ({
      text: `📝 Nuevo en el blog: "${p.title.es}"\n\n${p.summary.es}`,
      cta: `Lee mas 👉 ${SITE_URL}/es/blog/${p.slug.es}`,
    }),
    (p) => ({
      text: `¿Sabias? 🤔\n\n${p.summary.es}\n\nEscribimos una guia completa!`,
      cta: `Leela aqui: ${SITE_URL}/es/blog/${p.slug.es}`,
    }),
  ],
};

// ─── Engagement / tips templates (no book needed) ───────────────────────────

const engagementTemplates = {
  en: [
    () => ({
      text: `What's your kid's favorite thing to color? 🖍️\n\nAnimals 🐾\nSpace 🚀\nFashion 👗\nFood 🍕\nVehicles 🚗\n\nTell us in the comments!`,
      cta: `Explore our full collection: ${SITE_URL}/en/books`,
    }),
    () => ({
      text: `3 benefits of coloring that might surprise you:\n\n1️⃣ Improves fine motor skills\n2️⃣ Reduces screen time naturally\n3️⃣ Creates calm family moments\n\nHow often does your family color together?`,
      cta: `Discover our books: ${SITE_URL}/en/books`,
    }),
    () => ({
      text: `Pro tip for parents: 💡\n\nDon't say "go draw something." Instead, sit down and color WITH your kids for 10 minutes. Watch the magic happen. ✨\n\nColoring together > coloring alone.`,
      cta: `Find the perfect book: ${SITE_URL}/en/books`,
    }),
    () => ({
      text: `Every page colored is a screen-free victory! 📵🎨\n\nOur coloring books are designed for meaningful family time — no batteries required.\n\nWhat's your family's screen-free activity?`,
      cta: `Browse our books: ${SITE_URL}/en/books`,
    }),
    () => ({
      text: `Did you know? The average kid spends 7+ hours/day on screens. 😟\n\nColoring books offer a simple, creative alternative that kids actually enjoy.\n\nStart with just 15 minutes a day!`,
      cta: `See our collection: ${SITE_URL}/en/books`,
    }),
  ],
  es: [
    () => ({
      text: `¿Que es lo que mas le gusta colorear a tu peque? 🖍️\n\nAnimales 🐾\nEspacio 🚀\nModa 👗\nComida 🍕\nVehiculos 🚗\n\n¡Cuentanos en los comentarios!`,
      cta: `Explora nuestra coleccion: ${SITE_URL}/es/books`,
    }),
    () => ({
      text: `3 beneficios de colorear que te sorprenderan:\n\n1️⃣ Mejora la motricidad fina\n2️⃣ Reduce el uso de pantallas\n3️⃣ Crea momentos familiares de calma\n\n¿Cada cuanto colorean juntos en familia?`,
      cta: `Descubre nuestros libros: ${SITE_URL}/es/books`,
    }),
    () => ({
      text: `Tip para padres: 💡\n\nNo digas "ve a dibujar." Mejor sientate y colorea CON tus peques 10 minutos. Mira la magia. ✨\n\nColorear juntos > colorear solo.`,
      cta: `Encuentra el libro perfecto: ${SITE_URL}/es/books`,
    }),
    () => ({
      text: `¡Cada pagina coloreada es una victoria sin pantallas! 📵🎨\n\nNuestros libros de colorear estan disenados para tiempo de calidad en familia.\n\n¿Cual es la actividad sin pantallas de tu familia?`,
      cta: `Mira nuestros libros: ${SITE_URL}/es/books`,
    }),
  ],
};

// ─── Review / social proof templates ────────────────────────────────────────

const reviewRequestTemplates = {
  en: [
    (b) => ({
      text: `If your kid loved "${b.title.en}", would you leave us a quick review on Amazon? ⭐\n\nReviews help other parents find quality coloring books and mean the world to small publishers like us. 🙏`,
      cta: `Review here: ${b.amazonUrl}`,
    }),
  ],
  es: [
    (b) => ({
      text: `Si a tu peque le encanto "${b.title.es}", ¿nos dejarias una reseña rapida en Amazon? ⭐\n\nLas reseñas ayudan a otros padres a encontrar libros de calidad y significan mucho para editoriales pequenas como nosotros. 🙏`,
      cta: `Deja tu reseña: ${b.amazonUrl}`,
    }),
  ],
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a social media post.
 * @param {"book-promo"|"blog-share"|"engagement"|"review-request"} type
 * @param {"en"|"es"} lang
 * @param {object} [data] - book or post object (not needed for engagement)
 * @returns {{ text: string, hashtags: string, fullPost: string }}
 */
export function generatePost(type, lang, data) {
  let templates;
  switch (type) {
    case "book-promo":
      templates = bookPromoTemplates[lang];
      break;
    case "blog-share":
      templates = blogShareTemplates[lang];
      break;
    case "engagement":
      templates = engagementTemplates[lang];
      break;
    case "review-request":
      templates = reviewRequestTemplates[lang];
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
    { day: "Tuesday",   type: "engagement" },
    { day: "Wednesday", type: "blog-share" },
    { day: "Thursday",  type: "book-promo" },
    { day: "Friday",    type: "engagement" },
    { day: "Saturday",  type: "review-request" },
    { day: "Sunday",    type: "book-promo" },
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
