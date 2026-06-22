import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNativePosts } from '../lib/content';
import { SITE } from '../lib/seo';

/**
 * Feed RSS canônico do site. Só inclui posts nativos: o conteúdo agregado do
 * Medium permanece canônico na origem e não é republicado aqui.
 */
export async function GET(context: APIContext) {
  const posts = await getNativePosts();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.publishedAt,
      link: `/escritos/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: `<language>pt-br</language>`,
  });
}
