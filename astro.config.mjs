// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Tailwind v4 entra pelo PostCSS (postcss.config.mjs); o plugin Vite ainda não
// é compatível com o rolldown-vite que o Astro 6 usa.
//
// remark-math + rehype-katex renderizam fórmulas LaTeX ($...$ e $$...$$) no
// build; o CSS do KaTeX é importado em BaseLayout.astro.
//
// `site` precisa apontar para a URL final (afeta canonical, sitemap e RSS).
// User Page (repo <user>.github.io) serve na raiz, sem `base`; em Pages de
// projeto seria preciso `base: '/<repo>'`.
export default defineConfig({
  site: 'https://hitoshyamamoto.github.io',
  // PT na raiz; demais idiomas com prefixo (ex.: /en). Os segmentos traduzidos
  // (/en/writing) são resolvidos pelos próprios arquivos de página em src/pages/en.
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
});
