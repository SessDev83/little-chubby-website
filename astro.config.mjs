// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const configuredSite = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
const site = configuredSite || 'https://www.littlechubbypress.com';

// https://astro.build/config
export default defineConfig({
	site,
	output: 'static',
	trailingSlash: 'always',
	integrations: [sitemap()]
});
