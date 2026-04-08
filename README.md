# Little Chubby Press Website (MVP)

Sitio editorial estatico y bilingue (Espanol/English) para Little Chubby Press, construido con Astro y listo para deploy en Vercel.

## Stack

- Astro (sitio estatico)
- Integracion de sitemap con @astrojs/sitemap
- CSS propio (sin framework UI)

## Correr en local

1. Instalar dependencias:

```bash
npm install
```

2. Iniciar entorno de desarrollo:

```bash
npm run dev
```

3. Abrir en navegador:

http://localhost:4321

## Variables de entorno (produccion)

Este sitio puede configurarse sin tocar codigo usando variables PUBLIC_.

1. Copia .env.example a .env para desarrollo local.
2. Configura las mismas variables en Vercel para produccion.

Variables:

- PUBLIC_SITE_URL
	- Ejemplo: https://www.tudominio.com
	- Uso: canonical, hreflang, sitemap y redirects absolutos.

- PUBLIC_BUTTONDOWN_USERNAME
	- Ejemplo: littlechubbypress
	- Uso: construye newsletter.actionUrl automaticamente.

- PUBLIC_FORMSPREE_FORM_ID
	- Ejemplo: xzzabcde
	- Uso: construye contactForm.actionUrl automaticamente.

## Build de produccion

```bash
npm run build
```

El resultado queda en la carpeta dist.

## Deploy en Vercel

### Opcion A: via Git (recomendada)

1. Sube este proyecto a un repositorio nuevo.
2. Importa el repo en Vercel.
3. Framework preset: Astro (autodetectado).
4. Build command: npm run build
5. Output directory: dist
6. Asigna tu dominio principal nuevo.

### Opcion B: CLI (si la necesitas)

```bash
npm i -g vercel
vercel
vercel --prod
```

Checklist recomendado para salida a produccion e indexacion:

- DEPLOY_CHECKLIST.md

## Rutas principales

- /es/
- /es/books/
- /es/blog/
- /es/newsletter/
- /es/contact/
- /es/privacy/
- /es/thanks/
- /en/ (equivalentes en ingles)

La ruta / detecta idioma preferido y redirige a /es/ o /en/.

## Ajustes rapidos

Edita estos archivos para personalizar el sitio:

1. Marca, bio, enlaces sociales y proveedores de formularios:
	- src/data/site.ts

2. Catalogo de libros (titulo, descripcion, enlace Amazon, portada):
	- src/data/books.ts

3. Posts del blog (titulo, fecha, resumen, slug, contenido):
	- src/data/posts.ts

4. Activos visuales de marca:
	- public/images/brand/logo-mark.svg
	- public/images/brand/logo-lockup.svg
	- public/images/brand/og-cover.svg
	- public/favicon.svg

5. Portadas de libros:
	- public/images/books/* (webp recomendado)

## Pipeline de portadas 600x600

El proyecto incluye un flujo para estandarizar portadas cuadradas sin deformacion.

Archivos del pipeline:

- scripts/prepare-book-covers.mjs
- scripts/book-covers.queue.json

Procesar lote completo:

```bash
npm run covers:build
```

Procesar una portada individual:

```bash
npm run cover:one -- --id mi-libro --source "https://.../cover.jpg"
```

Resultado:

- Genera portadas 600x600 en public/images/books en formato webp.
- Mantiene proporciones con fit contain para evitar deformacion.

Flujo recomendado para agregar muchos libros:

1. Agrega entradas al archivo scripts/book-covers.queue.json con id y source.
2. Ejecuta npm run covers:build.
3. En src/data/books.ts usa coverSrc con /images/books/id.webp.
4. Ejecuta npm run build.

## Integracion de formularios

### Newsletter

- Archivo: src/data/site.ts
- Campo: newsletter.actionUrl (se genera desde PUBLIC_BUTTONDOWN_USERNAME)
- Fallback placeholder: YOUR_BUTTONDOWN_USERNAME
- Proveedor sugerido: Buttondown

### Contacto

- Archivo: src/data/site.ts
- Campo: contactForm.actionUrl (se genera desde PUBLIC_FORMSPREE_FORM_ID)
- Fallback placeholder: YOUR_FORM_ID
- Proveedor sugerido: Formspree

Mientras existan placeholders, el frontend muestra un aviso visible de configuracion pendiente.

## SEO tecnico incluido

- Meta title y description por pagina
- Open Graph basico
- Sitemap automatico en /sitemap-index.xml
- robots.txt en public/robots.txt
- Favicon propio
- Canonical + hreflang basico (es/en)

## Accesibilidad incluida

- Navegacion por teclado
- Estados focus visibles
- Estructura semantica por secciones
- Labels asociados en formularios
- Enlace de salto al contenido principal

## Notas

- Este proyecto es independiente y no depende de ningun otro repositorio.
- El idioma se cambia con toggle ES/EN en la esquina superior derecha y se guarda en localStorage.
