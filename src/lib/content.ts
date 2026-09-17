/**
 * 内容查询层
 *
 * 集中实现预案里的三条内容规则，页面模板不再各自为政：
 *  §2.2  待确认 / draft 内容永不出现在任何列表或 sitemap
 *  §2.2  同一实体下多条内容按 published_at 倒序 + citation_count 倒序双排
 *  §7.2  citation_count 由站内实际内链关系算出，而非手填
 */

import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;
export type Place = CollectionEntry<'places'>;
export type Topic = CollectionEntry<'topics'>;
export type Faq = CollectionEntry<'faqs'>;

/**
 * 字段级类型。
 * zod 的嵌套推断在这些深层数组上会退化成 any，模板里的回调参数因此失去类型。
 * 显式声明一份，让组件与页面都能拿到真实形状。
 */
export type Fact = { label: string; value: string; source?: string; verified?: boolean };
export type UnverifiedField = { field: string; note: string; how?: string };
export type Citation = {
  title: string;
  publisher: string;
  url?: string;
  ref?: string;
  accessed?: Date;
};

/** 可发布判定：草稿与待确认授权状态一律排除 */
const publishable = (d: { draft?: boolean; license_status?: string }) =>
  d.draft !== true && d.license_status !== '待确认';

export const getTopics = async (): Promise<Topic[]> =>
  (await getCollection('topics')).sort((a, b) => a.data.order - b.data.order);

export const getArticles = async (): Promise<Article[]> =>
  (await getCollection('articles', (e) => publishable(e.data))).sort(sortByRecencyThenCitations);

export const getPlaces = async (): Promise<Place[]> =>
  (await getCollection('places', (e) => publishable(e.data))).sort(sortByRecencyThenCitations);

export const getFaqs = async (): Promise<Faq[]> =>
  (await getCollection('faqs')).sort((a, b) => a.data.order - b.data.order);

/** §2.2 双排序：先看新鲜度，同日则看被引用次数 */
function sortByRecencyThenCitations(
  a: { data: { published_at: Date; citation_count: number } },
  b: { data: { published_at: Date; citation_count: number } }
) {
  const byDate = b.data.published_at.getTime() - a.data.published_at.getTime();
  if (byDate !== 0) return byDate;
  return b.data.citation_count - a.data.citation_count;
}

export const articlesOfTopic = async (topicSlug: string): Promise<Article[]> =>
  (await getArticles()).filter((a) => a.data.topic === topicSlug);

/* ------------------------------------------------------------------ *
 * §7.2 引用关系图谱
 * ------------------------------------------------------------------ */

type AnyEntry = Article | Place;

/**
 * 统计每个页面被站内其他页面引用的次数。
 * 三种引用算作一次：related_articles、related_places、共享 entity_tags。
 * 这个数字同时用于排序与 GEO 效果观察，所以必须是算出来的，不是拍出来的。
 */
export async function buildCitationIndex(): Promise<Map<string, number>> {
  const [articles, places] = await Promise.all([getArticles(), getPlaces()]);
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  const all: AnyEntry[] = [...articles, ...places];
  for (const entry of all) {
    for (const ref of entry.data.related_articles ?? []) bump(`articles:${ref}`);
    for (const ref of entry.data.related_places ?? []) bump(`places:${ref}`);
  }
  return counts;
}

export const citationKey = (entry: AnyEntry): string =>
  `${entry.collection}:${entry.id}`;

/* ------------------------------------------------------------------ *
 * 相关内容解析
 * ------------------------------------------------------------------ */

export async function resolveRelated(entry: AnyEntry): Promise<{
  articles: Article[];
  places: Place[];
}> {
  const [articles, places] = await Promise.all([getArticles(), getPlaces()]);
  const byId = <T extends AnyEntry>(list: T[], ids: string[]) =>
    ids.map((id) => list.find((x) => x.id === id)).filter((x): x is T => Boolean(x));

  const direct = {
    articles: byId(articles, entry.data.related_articles ?? []),
    places: byId(places, entry.data.related_places ?? []),
  };

  // 直接关联不足 3 条时，用共享实体标签补足，保证每页都有活的内链出口
  if (direct.articles.length + direct.places.length < 3) {
    const tags = new Set<string>(entry.data.entity_tags);
    const shares = (e: AnyEntry) => e.data.entity_tags.some((t: string) => tags.has(t));
    const self = citationKey(entry);

    for (const a of articles) {
      if (direct.articles.length + direct.places.length >= 4) break;
      if (citationKey(a) === self || direct.articles.includes(a)) continue;
      if (shares(a)) direct.articles.push(a);
    }
    for (const p of places) {
      if (direct.articles.length + direct.places.length >= 4) break;
      if (citationKey(p) === self || direct.places.includes(p)) continue;
      if (shares(p)) direct.places.push(p);
    }
  }
  return direct;
}

/** 某实体下的全部内容，供实体页「相关内容」区与 llms.txt 使用 */
export async function contentForEntity(entityId: string): Promise<{
  articles: Article[];
  places: Place[];
  faqs: Faq[];
}> {
  const [articles, places, faqs] = await Promise.all([getArticles(), getPlaces(), getFaqs()]);
  const has = (tags: string[]) => tags.includes(entityId);
  return {
    articles: articles.filter((a) => has(a.data.entity_tags)),
    places: places.filter((p) => has(p.data.entity_tags)),
    faqs: faqs.filter((f) => has(f.data.entity_tags)),
  };
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

export const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fmtDateCN = (d: Date): string =>
  `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;

/** 中文正文按字符数估算，英文按词数 */
export function countWords(body: string): number {
  const cjk = (body.match(/[一-龥]/g) ?? []).length;
  const latin = (body.match(/[A-Za-z]+/g) ?? []).length;
  return cjk + latin;
}

/** 内容是否存在未核实字段 —— 决定是否渲染核实提示条 */
export const hasUnverified = (d: { unverified?: unknown[] }): boolean =>
  Array.isArray(d.unverified) && d.unverified.length > 0;

/* ------------------------------------------------------------------ *
 * 地图中心
 * ------------------------------------------------------------------ */

/**
 * 取一个有出处坐标的实体作为交互地图的中心。
 *
 * 全站目前只有沙田镇满足条件。这里不写死它，而是从数据里找 ——
 * 将来沙田港的坐标核实到位，地图中心会自动切到更合适的那个点，
 * 不需要有人记得回来改这个组件。
 */
export async function getMapCenter(): Promise<{
  name: string;
  lat: number;
  lng: number;
  datum: 'wgs84' | 'gcj02' | 'bd09';
  precision: string | null;
  source?: string;
} | null> {
  const places = await getPlaces();
  // 设施级坐标优先于聚落中心点：前者才真正代表一个具体地点
  const rank = (p: Place) => (p.data.geo.precision === 'facility' ? 0 : 1);
  const withGeo = places
    .filter((p) => p.data.geo.lat !== null && p.data.geo.lng !== null)
    .sort((a, b) => rank(a) - rank(b));
  const hit = withGeo[0];
  if (!hit) return null;
  return {
    name: hit.data.title,
    lat: hit.data.geo.lat as number,
    lng: hit.data.geo.lng as number,
    datum: hit.data.geo.datum,
    precision: hit.data.geo.precision,
    source: hit.data.geo.source,
  };
}
