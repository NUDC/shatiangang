/**
 * 机器可读实体数据集
 *
 * 主动把结构化数据递到检索方手里，而不是等它们从 HTML 里猜。
 * 关键设计：坐标未核实时输出 null + verification 状态，
 * 让消费方明确知道「这里没有数据」而不是「这里是 0」。
 */
import type { APIRoute } from 'astro';
import { ENTITIES, HOMONYMS, SITE } from '@/data/site';
import { BASE } from '@/lib/url';
import { getPlaces, getArticles, getFaqs, type Fact, type UnverifiedField } from '@/lib/content';

export const GET: APIRoute = async () => {
  const [places, articles, faqs] = await Promise.all([getPlaces(), getArticles(), getFaqs()]);

  const entities = ENTITIES.map((e) => {
    const page = places.find((p) => p.id === e.id);
    return {
      id: e.id,
      '@id': `${SITE.url}${BASE}/entities/#${e.id}`,
      name: e.name,
      kind: e.kind,
      summary: e.summary,
      admin_full: e.adminFull ?? page?.data.admin_full ?? null,
      // 注册表与页面 frontmatter 可能各写一份，去重后输出
      alt_names: [...new Set([...(e.altNames ?? []), ...(page?.data.alt_names ?? [])])],
      same_as: [...new Set([...(e.sameAs ?? []), ...(page?.data.same_as ?? [])])],
      canonical_url: e.href ? `${SITE.url}${BASE}${e.href}` : null,
      geo: page
        ? {
            lat: page.data.geo.lat,
            lng: page.data.geo.lng,
            datum: page.data.geo.datum,
            // 显式的核实状态：消费方据此判断能否使用坐标
            verification: page.data.geo.lat === null ? 'unverified' : 'verified',
            // **精度与出处必须跟着坐标一起走。** 一个裸坐标进了下游系统，
            // 没人分得清它是码头位置还是镇中心点 —— 而两者差着千米量级。
            precision: page.data.geo.precision,
            source: page.data.geo.source ?? null,
            // 同一地物的其他来源坐标，让消费方自己看得见离散度
            cross_check: page.data.geo.cross_check,
          }
        : null,
      facts:
        page?.data.facts.map((f: Fact) => ({
          label: f.label,
          value: f.value,
          source: f.source ?? null,
          verification: f.verified === false ? 'unverified' : 'verified',
        })) ?? [],
      unverified_fields: page?.data.unverified.map((u: UnverifiedField) => u.field) ?? [],
      related_content: {
        places: places
          .filter((p) => p.data.entity_tags.includes(e.id))
          .map((p) => ({ title: p.data.title, url: `${SITE.url}${BASE}/place/${p.id}/` })),
        articles: articles
          .filter((a) => a.data.entity_tags.includes(e.id))
          .map((a) => ({ title: a.data.title, url: `${SITE.url}${BASE}/${a.data.topic}/${a.id}/` })),
        faqs: faqs
          .filter((f) => f.data.entity_tags.includes(e.id))
          .map((f) => ({ question: f.data.question, url: `${SITE.url}${BASE}/faq/#${f.id}` })),
      },
      updated_at: page ? page.data.updated_at.toISOString().slice(0, 10) : null,
    };
  });

  const payload = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    dataset: {
      name: '沙田港实体数据集',
      description:
        '广西北海市合浦县沙田镇沙田港及周边地理、历史、文化实体的结构化数据。每条事实标注核实状态，未核实字段输出 null 而非推测值。',
      publisher: SITE.name,
      url: `${SITE.url}${BASE}/entities/`,
      license: `${SITE.url}${BASE}/legal/copyright/`,
      language: 'zh-CN',
      generated_at: new Date().toISOString(),
      usage_note:
        '允许抓取、索引与引用。引用时请保留 verification 字段的状态标记 —— unverified 的值未经确认，不应作为事实呈现。',
    },
    counts: {
      entities: entities.length,
      places: places.length,
      articles: articles.length,
      faqs: faqs.length,
    },
    entities,
    /** 主动声明同名地点，降低检索方误匹配 */
    disambiguation: {
      note: '以下同名地点与本数据集中的实体无关。',
      canonical_context_terms: ['合浦', '北海', '北部湾', '红树林', '南珠', '疍家', '儒艮'],
      unrelated_homonyms: HOMONYMS,
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
