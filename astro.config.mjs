// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Tailwind v4 entra pelo PostCSS (postcss.config.mjs); o plugin Vite ainda não
// é compatível com o rolldown-vite que o Astro 6 usa.
//
// `site` precisa apontar para o domínio final (afeta canonical, sitemap e RSS).
// Em Pages de projeto, defina também `base: '/<repo>'`.
export default defineConfig({
  site: 'https://hitoshiyamamoto.dev',
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
