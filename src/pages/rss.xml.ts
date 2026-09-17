import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '@/data/site';
import { href } from '@/lib/url';
import { getArticles, getPlaces } from '@/lib/content';

export async function GET(context: APIContext) {
  const [articles, places] = await Promise.all([getArticles(), getPlaces()]);

  const items = [
    ...articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      // @astrojs/rss 用 site 拼绝对地址，但它不知道 base —— 前缀要自己补
      link: href(`/${a.data.topic}/${a.id}/`),
      pubDate: a.data.updated_at,
      author: a.data.author,
      categories: [a.data.topic],
    })),
    ...places.map((p) => ({
      title: `${p.data.title}（地点实体）`,
      description: p.data.description,
      link: href(`/place/${p.id}/`),
      pubDate: p.data.updated_at,
      author: p.data.author,
      categories: ['place'],
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
    customData: `<language>zh-cn</language><copyright>${SITE.name}</copyright>`,
  });
}
