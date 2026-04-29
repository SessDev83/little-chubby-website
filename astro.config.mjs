// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import sentryAstro from '@sentry/astro';

/** @param {string | undefined | null} value */
function normalizeSiteUrl(value) {
	let text = String(value || '').trim();
	if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
		text = text.slice(1, -1).trim();
	}
	text = text.replace(/\\r|\\n/g, '').replace(/[\r\n]/g, '').trim().replace(/\/+$/, '');
	try {
		const url = new URL(text || 'https://www.littlechubbypress.com');
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : '';
	} catch {
		return '';
	}
}

const configuredSite = normalizeSiteUrl(process.env.PUBLIC_SITE_URL);
const site = configuredSite || 'https://www.littlechubbypress.com';

// https://astro.build/config
export default defineConfig({
	site,
	output: 'static',
	adapter: vercel(),
	trailingSlash: 'always',
	prefetch: true,
	integrations: [
		sentryAstro(),
		sitemap({
			filter: (page) => !page.includes('/admin/') && !page.includes('/api/')
		})
	]
});
