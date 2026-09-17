/**
 * JSON-LD 构造器（预案 §7.1）
 *
 * 设计原则：
 * 1. 每个 @id 都是绝对 URL 且全站唯一 —— 这是实体图谱能被拼起来的前提。
 *    同一实体在不同页面出现时复用同一个 @id，生成引擎才知道说的是同一个东西。
 * 2. 只标注页面上真实可见的内容。标注与正文不一致会被判作垃圾标记。
 * 3. 未核实的字段一律不写进 JSON-LD —— 宁可缺字段，不可给错事实。
 */

import { SITE, ENTITIES, type Entity } from '@/data/site';
import { absUrl } from './url';

/**
 * 站内路径 → 绝对 URL。
 * 经由 lib/url.ts 补挂载前缀 —— canonical、@id 与浏览器地址栏必须完全一致，
 * 差一个前缀不会让页面打不开，只会让整张实体图谱指向不存在的 URL。
 */
export const abs = (path: string): string => absUrl(path, SITE.url);

/** 实体的稳定 @id：全站引用同一实体时必须用它 */
export const entityId = (id: string): string => `${abs('/entities/')}#${id}`;

type Json = Record<string, unknown>;

/** 去掉 undefined / null / 空数组，避免输出空字段污染标注 */
function clean<T extends Json>(obj: T): T {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out as T;
}

/* ------------------------------------------------------------------ *
 * 站点级：每页都带，构成实体图谱的根
 * ------------------------------------------------------------------ */

export const publisher = (): Json => ({
  '@type': 'Organization',
  '@id': abs('/#organization'),
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  email: SITE.author.email,
  logo: {
    '@type': 'ImageObject',
    '@id': abs('/#logo'),
    url: abs('/logo.svg'),
    width: 512,
    height: 512,
  },
  /** 主题范围：明确告诉生成引擎这个站点的知识领域 */
  knowsAbout: ENTITIES.map((e) => e.name),
  areaServed: {
    '@type': 'AdministrativeArea',
    name: '广西壮族自治区北海市合浦县沙田镇',
  },
});

export const website = (): Json => ({
  '@type': 'WebSite',
  '@id': abs('/#website'),
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  inLanguage: SITE.lang,
  publisher: { '@id': abs('/#organization') },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: abs('/search/?q={search_term_string}') },
    'query-input': 'required name=search_term_string',
  },
});

/* ------------------------------------------------------------------ *
 * 页面级
 * ------------------------------------------------------------------ */

export function breadcrumb(items: { name: string; href: string }[]): Json {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(items.at(-1)?.href ?? '/')}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.href),
    })),
  };
}

export function webPage(opts: {
  path: string;
  title: string;
  description: string;
  datePublished?: Date;
  dateModified?: Date;
  breadcrumbPath?: string;
  /** AEO：把直答段落标为可朗读，语音助手与摘要引擎优先取这里 */
  speakableSelectors?: string[];
}): Json {
  return clean({
    '@type': 'WebPage',
    '@id': `${abs(opts.path)}#webpage`,
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': abs('/#website') },
    inLanguage: SITE.lang,
    datePublished: opts.datePublished?.toISOString(),
    dateModified: opts.dateModified?.toISOString(),
    breadcrumb: opts.breadcrumbPath ? { '@id': `${abs(opts.breadcrumbPath)}#breadcrumb` } : undefined,
    speakable: opts.speakableSelectors?.length
      ? { '@type': 'SpeakableSpecification', cssSelector: opts.speakableSelectors }
      : undefined,
  });
}

export function article(opts: {
  path: string;
  headline: string;
  description: string;
  author: string;
  datePublished: Date;
  dateModified: Date;
  wordCount?: number;
  image?: string;
  about?: Entity[];
  mentions?: Entity[];
  citations?: { title: string; publisher: string; url?: string; ref?: string }[];
  articleSection?: string;
}): Json {
  return clean({
    '@type': 'Article',
    '@id': `${abs(opts.path)}#article`,
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: { '@id': `${abs(opts.path)}#webpage` },
    inLanguage: SITE.lang,
    articleSection: opts.articleSection,
    datePublished: opts.datePublished.toISOString(),
    dateModified: opts.dateModified.toISOString(),
    wordCount: opts.wordCount,
    author: { '@type': 'Person', name: opts.author, url: abs('/about/') },
    publisher: { '@id': abs('/#organization') },
    image: opts.image ? abs(opts.image) : undefined,
    /** about = 本文主要讲的实体；mentions = 提到但非主题的实体。生成引擎靠这组关系定位你 */
    about: opts.about?.map((e) => ({ '@id': entityId(e.id) })),
    mentions: opts.mentions?.map((e) => ({ '@id': entityId(e.id) })),
    /** citation：向权威来源致敬，同时向引擎证明内容有出处 */
    citation: opts.citations?.map((c) =>
      clean({
        '@type': 'CreativeWork',
        name: c.ref ? `${c.title}（${c.ref}）` : c.title,
        publisher: { '@type': 'Organization', name: c.publisher },
        url: c.url,
      })
    ),
    license: abs('/legal/copyright/'),
    isAccessibleForFree: true,
  });
}

/** 地点实体 —— GEO 引用的最小单位（预案 §1.2） */
export function place(opts: {
  path: string;
  id: string;
  type: string;
  name: string;
  description: string;
  adminFull?: string;
  altNames?: string[];
  sameAs?: string[];
  geo?: { lat: number | null; lng: number | null };
  containedIn?: string;
  image?: string;
  openingHours?: string;
  additionalProperties?: { label: string; value: string; verified: boolean }[];
}): Json {
  const hasGeo = typeof opts.geo?.lat === 'number' && typeof opts.geo?.lng === 'number';

  return clean({
    '@type': opts.type,
    '@id': entityId(opts.id),
    name: opts.name,
    alternateName: opts.altNames,
    description: opts.description,
    url: abs(opts.path),
    mainEntityOfPage: { '@id': `${abs(opts.path)}#webpage` },
    sameAs: opts.sameAs,
    image: opts.image ? abs(opts.image) : undefined,
    address: opts.adminFull
      ? {
          '@type': 'PostalAddress',
          addressCountry: 'CN',
          addressRegion: '广西壮族自治区',
          addressLocality: '北海市合浦县',
          streetAddress: opts.adminFull,
        }
      : undefined,
    // 坐标未核实时整个 geo 字段不输出，而不是填 0 或猜一个
    geo: hasGeo
      ? { '@type': 'GeoCoordinates', latitude: opts.geo!.lat, longitude: opts.geo!.lng }
      : undefined,
    containedInPlace: opts.containedIn ? { '@id': entityId(opts.containedIn) } : undefined,
    openingHours: opts.openingHours,
    /** 属性表里已核实的事实才进 additionalProperty */
    additionalProperty: opts.additionalProperties
      ?.filter((p) => p.verified)
      .map((p) => ({ '@type': 'PropertyValue', name: p.label, value: p.value })),
  });
}

/** FAQPage —— AEO 主力标注（预案 §7.1） */
export function faqPage(
  path: string,
  items: { question: string; answer: string }[]
): Json {
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}

/** 机器可读实体数据集 —— 主动把结构化数据递到生成引擎手里 */
export function dataset(): Json {
  return {
    '@type': 'Dataset',
    '@id': abs('/entities.json#dataset'),
    name: '沙田港实体数据集',
    description:
      '沙田港及周边地理、历史、文化实体的结构化数据，含行政区划全称、别称、坐标核实状态与站内 canonical URL。',
    url: abs('/entities/'),
    license: abs('/legal/copyright/'),
    creator: { '@id': abs('/#organization') },
    isAccessibleForFree: true,
    inLanguage: SITE.lang,
    keywords: ['沙田港', '合浦县', '北海市', '海上丝绸之路', '红树林', '南珠', '疍家'],
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: abs('/entities.json'),
      },
    ],
  };
}

/** 汇总成单个 @graph —— 比散落多个 <script> 更利于引擎解析实体关系 */
export function graph(nodes: (Json | undefined | false)[]): string {
  return JSON.stringify(
    { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) },
    null,
    0
  );
}
