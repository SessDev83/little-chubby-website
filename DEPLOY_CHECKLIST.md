# Deploy and Indexation Checklist

Use this checklist when you are ready to publish.

## 1) Before deploy

- Set environment variables in local .env and in Vercel project settings:
  - PUBLIC_SITE_URL=https://your-domain.com
  - PUBLIC_BUTTONDOWN_USERNAME=your_buttondown_username
  - PUBLIC_FORMSPREE_FORM_ID=your_form_id
- Run build:
  - npm run build
- Run audits:
  - node scripts/report-page-weights.mjs
  - node scripts/report-external-assets.mjs
  - node scripts/seo-audit.mjs
- Confirm dist/seo-audit-report.json shows 0 blocking issues.

## 2) Deploy in Vercel

- Import repo into Vercel.
- Framework preset: Astro.
- Build command: npm run build.
- Output directory: dist.
- Add custom domain and set as primary.

## 3) DNS and domain

- Add DNS records requested by Vercel.
- Wait for SSL certificate status to become valid.
- Confirm both apex and www redirect to primary canonical domain.

## 4) Post-deploy smoke test

- Check these routes load in both languages:
  - /es/
  - /en/
  - /es/books/
  - /en/books/
  - /es/blog/
  - /en/blog/
  - /es/contact/
  - /en/contact/
  - /es/newsletter/
  - /en/newsletter/
- Submit test entries in contact and newsletter forms.
- Confirm redirects to /thanks pages are correct.
- Confirm no visible provider warning appears in forms.

## 5) Security checks

- Confirm `vercel.json` security headers are active in production responses.
- Confirm no secrets exist in repo files (`.env` and `.env.local` must stay local).
- Confirm GitHub Actions secrets exist only in repository settings, not in code.
- If any token was exposed during setup, revoke and regenerate before go-live.

## 6) Search Console and indexing

- Verify domain property in Google Search Console.
- Submit sitemap:
  - https://your-domain.com/sitemap-index.xml
- Request indexing for:
  - homepage
  - books page
  - blog index
- Check Coverage and Enhancements after first crawl.

## 7) Social preview and metadata

- Validate Open Graph and Twitter cards with a link preview tool.
- Check canonical and hreflang tags on /es/ and /en/.
- Confirm organization and website structured data are present.

## 8) First-week monitoring

- Re-run SEO audit after first content edits.
- Watch 404 and redirect behavior.
- Track Core Web Vitals and Search Console performance trends.
