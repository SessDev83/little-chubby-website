#!/usr/bin/env node
/**
 * Evergreen pinned-post generator (playbook §13.1)
 *
 * Prints ready-to-paste pinned post copy for each platform. These are
 * MANUAL posts — an operator pastes them once to Bluesky / Facebook /
 * Instagram bio-adjacent pin, then never rewrites them unless brand
 * direction changes.
 *
 * Usage:
 *   node scripts/social/pin-posts.mjs [--lang en|es]
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith("--")) acc.push([v.replace(/^--/, ""), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, [])
);

const lang = args.lang === "es" ? "es" : "en";
const SITE = "https://littlechubby.com";

const CATEGORIES = {
  en: [
    "Animals & Nature",
    "Space & Astronauts",
    "Dinosaurs",
    "Food & Drinks",
    "Jobs",
    "Machines & Construction",
    "Kids Favorites (Toys & Fantasy)",
    "Mini Scenes",
    "Basic Elements",
  ],
  es: [
    "Animales y Naturaleza",
    "Espacio y Astronautas",
    "Dinosaurios",
    "Comida y Bebidas",
    "Trabajos",
    "Maquinas y Construccion",
    "Favoritos de los Ninos (Juguetes y Fantasia)",
    "Mini Escenas",
    "Elementos Basicos",
  ],
};

const COPY = {
  en: {
    bluesky: [
      `👋 Welcome! Here is what we do:`,
      ``,
      `FREE coloring pages for kids — ${CATEGORIES.en.length} categories, updated every week.`,
      `→ ${SITE}/en/coloring-corner`,
      ``,
      `Made by one mom + one dad who draw all pages by hand.`,
      `Earn Peanuts 🥜 by sharing → get free downloads.`,
    ].join("\n"),
    facebook: [
      `📌 If you just found us, start here.`,
      ``,
      `We are a tiny family studio (one mom, one dad) creating free coloring pages for kids in ${CATEGORIES.en.length} categories:`,
      CATEGORIES.en.map((c) => `  • ${c}`).join("\n"),
      ``,
      `Every page is free to browse. Download is 1 Peanut 🥜 — and sharing any page or gallery review earns you Peanuts back (up to 3/day).`,
      ``,
      `No subscriptions. No spam. Just coloring.`,
      `→ ${SITE}/en/coloring-corner`,
      ``,
      `If you love our work, share a review photo at ${SITE}/en/gallery and get 5 free tickets for our monthly book giveaway 🎁`,
    ].join("\n"),
    instagram: [
      `📌 New here? Saved posts live in the highlights.`,
      ``,
      `We are Little Chubby Press — a mom + dad drawing free coloring pages for kids.`,
      ``,
      `🎨 ${CATEGORIES.en.length} categories of free pages`,
      `🥜 Peanuts let you download — share to earn them`,
      `🎁 Monthly free-book giveaway for photo reviewers`,
      ``,
      `Tap the link in bio → ${SITE}/en/bio`,
      ``,
      `#kidscoloringpages #freecoloringpages #homeschoolmom #momlife #kidsactivities #coloringbooksforkids #rainydayactivity`,
    ].join("\n"),
  },
  es: {
    bluesky: [
      `👋 Bienvenidos!`,
      ``,
      `Paginas para colorear GRATIS para ninos — ${CATEGORIES.es.length} categorias, actualizadas cada semana.`,
      `→ ${SITE}/es/coloring-corner`,
      ``,
      `Dibujadas a mano por mama + papa.`,
      `Gana Cacahuetes 🥜 al compartir.`,
    ].join("\n"),
    facebook: [
      `📌 Si acabas de encontrarnos, empieza aqui.`,
      ``,
      `Somos un pequeno estudio familiar (mama + papa) creando paginas para colorear gratis para ninos en ${CATEGORIES.es.length} categorias:`,
      CATEGORIES.es.map((c) => `  • ${c}`).join("\n"),
      ``,
      `Cada pagina es gratis de ver. La descarga cuesta 1 Cacahuete 🥜 — y al compartir cualquier pagina o resena ganas Cacahuetes de vuelta (hasta 3/dia).`,
      ``,
      `Sin suscripciones. Sin spam. Solo colorear.`,
      `→ ${SITE}/es/coloring-corner`,
      ``,
      `Si te gusta nuestro trabajo, comparte una foto resena en ${SITE}/es/gallery y recibe 5 boletos gratis para el sorteo mensual de libros 🎁`,
    ].join("\n"),
    instagram: [
      `📌 Nuevo aqui? Los posts guardados estan en las historias destacadas.`,
      ``,
      `Somos Little Chubby Press — una mama + un papa dibujando paginas para colorear gratis para ninos.`,
      ``,
      `🎨 ${CATEGORIES.es.length} categorias de paginas gratis`,
      `🥜 Los Cacahuetes te permiten descargar — comparte para ganarlos`,
      `🎁 Sorteo mensual de libro gratis para resenas con foto`,
      ``,
      `Pulsa el enlace en bio → ${SITE}/es/bio`,
      ``,
      `#paginasparacolorear #colorearninos #mamablogger #actividadesninos #manualidadesninos`,
    ].join("\n"),
  },
};

const block = COPY[lang];
const sep = "─".repeat(72);

console.log(`\n${sep}\n📌 EVERGREEN PINNED POSTS — lang=${lang}\n${sep}\n`);
console.log(`▶ BLUESKY (pin this post to your profile)\n`);
console.log(block.bluesky);
console.log(`\n  Characters: ${block.bluesky.length}\n`);
console.log(`${sep}\n▶ FACEBOOK (pin to top of Page)\n`);
console.log(block.facebook);
console.log(`\n${sep}\n▶ INSTAGRAM (pin to grid — first slot)\n`);
console.log(block.instagram);
console.log(`\n${sep}`);
console.log(`\nHow to use:`);
console.log(`  1. Copy each block`);
console.log(`  2. Post manually once per platform`);
console.log(`  3. Use the platform's "pin" feature so it always shows first`);
console.log(`  4. Refresh only when branding changes (playbook §13.1)\n`);
