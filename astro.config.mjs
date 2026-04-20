// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

const configuredSite = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
const site = configuredSite || 'https://www.littlechubbypress.com';

// https://astro.build/config
export default defineConfig({
	site,
	output: 'static',
	adapter: vercel(),
	trailingSlash: 'always',
	prefetch: true,
	integrations: [sitemap({
		filter: (page) => !page.includes('/admin/') && !page.includes('/api/')
	})]
});
