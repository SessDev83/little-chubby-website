# Little Chubby Press Blog SEO Strategy — 500 Posts / Estrategia SEO del Blog

> Goal / Objetivo: build a bilingual, SEO-focused blog system that attracts organic traffic from Google, Pinterest, and other discovery channels without repeating topics, cannibalizing keywords, or breaking the current Astro app.
>
> Objetivo: construir un sistema bilingue de blog, optimizado para SEO, que atraiga trafico organico desde Google, Pinterest y otros canales sin repetir temas, sin canibalizar keywords y sin romper la app Astro actual.

## 1. Strategic foundation / Fundamento estrategico

The content plan from `Plan de Contenido Blog Libros Colorear.pdf` is based on a **Topic Cluster / Hub & Spoke** model. The blog should not behave like a random list of articles. It should behave like a structured library where each broad pillar topic is supported by many precise long-tail articles.

El plan de contenido del PDF se basa en un modelo **Topic Cluster / Hub & Spoke**. El blog no debe funcionar como una lista aleatoria de articulos. Debe funcionar como una biblioteca estructurada donde cada tema pilar amplio recibe apoyo de muchos articulos long-tail muy especificos.

### Main traffic strategy / Estrategia principal de trafico

- Capture parent search intent before the buying moment.
- Capturar la intencion de busqueda de padres antes del momento de compra.
- Solve real problems first: tantrums, travel, screen time, bedtime, boredom, learning, emotional regulation.
- Resolver problemas reales primero: berrinches, viajes, pantallas, dormir, aburrimiento, aprendizaje, regulacion emocional.
- Present coloring books as a natural tool, not as aggressive advertising.
- Presentar los libros de colorear como una herramienta natural, no como publicidad agresiva.
- Build trust through useful, human, practical content.
- Construir confianza con contenido util, humano y practico.

## 2. Non-negotiable rules / Reglas no negociables

1. **Always bilingual / Siempre bilingue**
   - Every strategic article must have EN + ES versions.
   - Cada articulo estrategico debe tener version EN + ES.
   - Both versions must share the same `postId` for hreflang and language switching.
   - Ambas versiones deben compartir el mismo `postId` para hreflang y cambio de idioma.

2. **No repetition / Sin repeticiones**
   - Never publish two posts with the same primary keyword.
   - Nunca publicar dos posts con la misma keyword principal.
   - If two ideas feel similar, separate them by age, setting, search intent, or problem.
   - Si dos ideas se parecen, diferenciarlas por edad, contexto, intencion de busqueda o problema.

3. **No orphan pages / Sin paginas huerfanas**
   - Every spoke article should link to its pillar when the pillar exists.
   - Cada articulo spoke debe enlazar a su pillar cuando el pillar exista.
   - Pillar pages should link back to published spokes.
   - Las paginas pilar deben enlazar hacia los spokes publicados.

4. **Human, helpful, brand-safe / Humano, util y seguro para la marca**
   - Warm parent voice, practical tips, low pressure.
   - Voz calida de padres, consejos practicos, baja presion.
   - Avoid medical overclaims. Use phrases like “may help”, “can support”, “for serious concerns, talk to a professional”.
   - Evitar promesas medicas fuertes. Usar frases como “puede ayudar”, “puede apoyar”, “si hay preocupaciones serias, consulta a un profesional”.

5. **Soft conversion only / Conversion suave solamente**
   - Product mentions should stay under 15% of the article.
   - Las menciones de producto deben mantenerse por debajo del 15% del articulo.
   - Recommended CTAs: newsletter, printable, helpful checklist, “check it out if you are curious”.
   - CTAs recomendados: newsletter, imprimible, checklist util, “miralo si te da curiosidad”.

## 3. Six SEO clusters / Seis clusters SEO

The app currently has 5 technical article categories in `src/data/articleCategories.ts`. To avoid breaking routes, the 6 strategic SEO clusters are mapped onto the existing categories through optional metadata.

La app actualmente tiene 5 categorias tecnicas en `src/data/articleCategories.ts`. Para no romper rutas, los 6 clusters estrategicos se mapean sobre las categorias existentes mediante metadata opcional.

| SEO Cluster | Cluster ES | Primary technical category | Primary search intent |
| --- | --- | --- | --- |
| Emotional regulation & behavior | Gestion emocional y comportamiento | `focus-calm` | Informational urgent |
| Screen-free travel & activities | Viajes, ocio desconectado y pantallas | `activities` | Informational / commercial |
| Developmental learning & school readiness | Aprendizaje, motricidad y escuela | `learning` | Informational |
| Parent wellbeing & family dynamics | Bienestar parental y dinamica familiar | `guides` | Informational / relational |
| Visual routines & early education | Rutinas visuales y educacion temprana | `focus-calm` / `learning` | Informational practical |
| Slow parenting & analog childhood | Slow parenting e infancia analogica | `creativity` / `activities` | Lifestyle / informational |

## 4. Content roles / Roles de contenido

### Pillar

Long, foundational guide that explains a broad topic and links to many supporting posts.

Guia amplia y fundamental que explica un tema grande y enlaza a muchos articulos de apoyo.

### Spoke

Specific long-tail article targeting one precise parent problem, age, setting, or search intent.

Articulo long-tail especifico enfocado en un problema, edad, contexto o intencion de busqueda.

### Support

Shorter or tactical article that supports a cluster, often useful for seasonal, checklist, or conversion content.

Articulo mas tactico que apoya un cluster, util para contenido de temporada, checklist o conversion.

## 5. SEO metadata standard / Estandar de metadata SEO

New strategic articles can include these optional frontmatter fields:

Los articulos estrategicos nuevos pueden incluir estos campos opcionales en frontmatter:

```yaml
category: "article"
articleCategory: "activities"
seoCluster: "screen-free-travel"
searchIntent: "informational"
contentRole: "spoke"
pillarId: "screen-free-activities-guide"
primaryKeyword:
  en: "screen-free restaurant activities for kids"
  es: "actividades sin pantallas para restaurantes con ninos"
```

## 6. Anti-cannibalization checklist / Checklist anti-canibalizacion

Before any topic enters the queue:

Antes de que cualquier tema entre a la cola:

- Compare against existing slugs in `src/content/blog/en` and `src/content/blog/es`.
- Comparar contra slugs existentes en `src/content/blog/en` y `src/content/blog/es`.
- Compare against existing `postId` values.
- Comparar contra valores existentes de `postId`.
- Compare against titles and primary keywords.
- Comparar contra titulos y keywords principales.
- If similar to an existing post, change the angle or reject it.
- Si se parece a un post existente, cambiar el angulo o rechazarlo.
- Use one clear primary keyword per language.
- Usar una sola keyword principal clara por idioma.

## 7. Publication roadmap / Hoja de ruta de publicacion

### Phase 1 / Fase 1

- Create the cluster map.
- Crear el mapa de clusters.
- Create the first deduplicated queue.
- Crear la primera cola deduplicada.
- Add audit tooling.
- Agregar herramientas de auditoria.
- Improve the generator without breaking old posts.
- Mejorar el generador sin romper posts antiguos.

### Phase 2 / Fase 2

- Publish 6 pillar articles first.
- Publicar primero 6 articulos pilar.
- Publish 12-18 supporting spokes.
- Publicar 12-18 spokes de apoyo.
- Run build, SEO audit, and internal link audit.
- Ejecutar build, auditoria SEO y auditoria de enlaces internos.

### Phase 3 / Fase 3

- Publish 3-5 bilingual article pairs per week.
- Publicar 3-5 pares bilingues por semana.
- Review Search Console and conversion analytics monthly.
- Revisar Search Console y analiticas de conversion cada mes.
- Double down on clusters with impressions, clicks, newsletter signups, or Amazon clicks.
- Reforzar clusters que generen impresiones, clicks, suscripciones o clicks a Amazon.

## 8. Success criteria / Criterios de exito

- `npm run check` passes.
- `npm run check` pasa.
- `npm run build` passes.
- `npm run build` pasa.
- EN/ES parity is maintained by `postId`.
- Se mantiene paridad EN/ES por `postId`.
- No duplicate primary keywords.
- No hay keywords principales duplicadas.
- No duplicate slugs or titles.
- No hay slugs ni titulos duplicados.
- Every strategic post has `articleCategory`, `seoCluster`, `searchIntent`, and `contentRole`.
- Cada post estrategico tiene `articleCategory`, `seoCluster`, `searchIntent` y `contentRole`.
- Pillars and spokes are internally linked over time.
- Pillars y spokes quedan enlazados internamente con el tiempo.
