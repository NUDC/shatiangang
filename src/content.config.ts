import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/* ------------------------------------------------------------------ *
 * 字段标准化（预案 §2.1）
 * 每条进入站点的内容，无论来源，都必须落入同一组字段。
 * 这是 GEO 结构化标注的前提 —— schema 缺字段就构造不出合格的 JSON-LD。
 * ------------------------------------------------------------------ */

const SOURCE_PLATFORM = z.enum(['官方', '本站原创', '授权投稿', '开放API', '公开索引整理']);
const LICENSE_STATUS = z.enum(['自有', '授权', '公开许可', '待确认']);

/** 引用来源：P0/P2 内容每条必须标注原始出处（预案 §4 硬约束、§5.4） */
const citation = z.object({
  title: z.string(),
  publisher: z.string(),
  url: z.string().url().optional(),
  /** 官方文号 / 卷册号等可核验标识，如「农办渔〔2005〕44号」 */
  ref: z.string().optional(),
  accessed: z.coerce.date().optional(),
});

/**
 * 待核实字段（本站与预案的关键约定）
 * 无法实地核实的事实（坐标、船期、联系方式…）不硬写成结论。
 * 页面渲染为醒目核实提示条，且该页不进 sitemap 的高优先级序列。
 */
const unverified = z
  .array(
    z.object({
      field: z.string(),
      note: z.string(),
      /** 建议的核实渠道 */
      how: z.string().optional(),
    })
  )
  .default([]);

/** 公共字段基座 */
const base = z.object({
  title: z.string().max(60),
  /** SEO description / AEO 摘要 / JSON-LD description 三用，控制在 80–155 字 */
  description: z.string().min(20).max(200),
  source_platform: SOURCE_PLATFORM,
  author: z.string().default('本站原创'),
  published_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  original_url: z.string().url().optional(),
  license_status: LICENSE_STATUS,
  /** 绑定的实体 ID 列表（见 src/data/entities.ts） */
  entity_tags: z.array(z.string()).min(1),
  /** 被本站其他页引用次数；由 scripts/geo-audit.mjs 回写，手写值仅作初值 */
  citation_count: z.number().int().nonnegative().default(0),
  citations: z.array(citation).default([]),
  unverified,
  /** AEO 直答：一句话回答本页的核心问题，≤120 字，会被抽进 FAQ/摘要块 */
  answer: z.string().max(240).optional(),
  /** 本页正面回答的自然语言问题，用于 FAQPage / Speakable 标注 */
  questions: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  cover: z.string().optional(),
  cover_alt: z.string().optional(),
});

/**
 * 字段强制规则（预案 §2.2）
 * 校验失败 = 构建失败。合规不靠自觉，靠 build 报错。
 */
const withRules = <T extends z.ZodTypeAny>(s: T) =>
  s
    .superRefine((d: any, ctx) => {
      // 规则 1：license_status = 待确认 的内容一律不发布
      if (d.license_status === '待确认' && d.draft !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'license_status=待确认 的内容必须 draft: true，只进草稿箱，不得发布（预案 §2.2）',
        });
      }
      // 规则 2：授权投稿必须带 original_url 回链
      if (d.source_platform === '授权投稿' && !d.original_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'source_platform=授权投稿 必须填写 original_url 回链，否则退回（预案 §2.2）',
        });
      }
      // 规则 3：非原创来源必须有可核验出处
      if (
        (d.source_platform === '官方' ||
          d.source_platform === '公开索引整理' ||
          d.source_platform === '开放API') &&
        d.citations.length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `source_platform=${d.source_platform} 必须至少标注一条 citations 原始来源（预案 §4 硬约束）`,
        });
      }
      // 规则 4：updated_at 不得早于 published_at
      if (d.updated_at < d.published_at) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'updated_at 不得早于 published_at' });
      }
      // 规则 5：有坐标就必须有出处与精度说明。
      // 一个裸坐标进了结构化数据，下游无从判断它是码头还是镇中心 —— 这正是
      // 本站最想避免的那类「看起来精确、实际误导」的数据。
      if (d.geo && (d.geo.lat !== null || d.geo.lng !== null)) {
        if (d.geo.lat === null || d.geo.lng === null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'geo 的 lat 与 lng 必须同时给出或同时为 null' });
        }
        if (!d.geo.source) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: '填了坐标就必须填 geo.source（坐标出处）' });
        }
        if (!d.geo.precision) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: '填了坐标就必须填 geo.precision（这个点代表什么）' });
        }
      }
    });

/* ------------------------------------------------------------------ *
 * 集合定义
 * ------------------------------------------------------------------ */

/** 一级主题（6 个，预案 §1.1） */
const topics = defineCollection({
  loader: glob({ base: './src/content/topics', pattern: '**/*.md' }),
  schema: base.extend({
    /** URL 段，如 haisi / island / danjia / pearl / travel */
    slug: z.string().regex(/^[a-z0-9-]+$/),
    order: z.number().int(),
    /** 主题图标（内联 SVG path 的 key，见 src/components/Icon.astro） */
    icon: z.string().default('anchor'),
    /** 主题色调，用于卡片与主题页强调色 */
    accent: z.enum(['sea', 'pearl', 'tide', 'sail', 'coral', 'dusk']).default('sea'),
    tagline: z.string().max(40),
  }),
});

/** 二级专题页 */
const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.md' }),
  schema: withRules(
    base.extend({
      topic: z.string(),
      /** 正文阅读时长（分钟），首屏展示，提高点击率 */
      reading_time: z.number().int().positive().default(6),
      /** 关联地点实体 slug，渲染成实体关系图谱内链 */
      related_places: z.array(z.string()).default([]),
      related_articles: z.array(z.string()).default([]),
    })
  ),
});

/**
 * 地点实体页（预案 §1.2 关键原则）
 * GEO 引用的最小单位是「有坐标、有属性、可验证的实体页」。
 * 每个可识别地点单独成页。
 */
const places = defineCollection({
  loader: glob({ base: './src/content/places', pattern: '**/*.md' }),
  schema: withRules(
    base.extend({
      /** Schema.org 类型，决定 JSON-LD @type */
      place_type: z.enum([
        'Landform', // 自然地貌：半岛、海湾、滩涂
        'TouristAttraction', // 可游览点
        'LandmarksOrHistoricalBuildings', // 遗址、灯塔、古城
        'Park', // 保护区
        'AdministrativeArea', // 镇、村
        'Place', // 兜底：码头、港口
      ]).default('Place'),
      /**
       * 坐标。核实前保持 null，并在 unverified 里登记（预案 §2.1 条件必填）。
       *
       * **有坐标不等于坐标可以当作精确位置用。** 开放数据里的「镇」是一个
       * 人工标注的中心点，不同数据源之间常有上千米的差异，更不等于镇上某个
       * 具体设施（比如港口码头）的位置。所以坐标一旦落地，必须同时说清楚
       * 它是什么精度、来自哪里 —— 否则下游会把一个镇中心点当成码头坐标用。
       */
      geo: z
        .object({
          lat: z.number().min(-90).max(90).nullable(),
          lng: z.number().min(-180).max(180).nullable(),
          /** 坐标系：wgs84 / gcj02 / bd09。混用是国内地图最常见的错误源 */
          datum: z.enum(['wgs84', 'gcj02', 'bd09']).default('wgs84'),
          /**
           * 这个坐标代表什么。
           *   settlement-centroid  聚落中心点（镇/村级，误差可达千米量级）
           *   facility             具体设施的实测或官方公布位置
           *   area-indicative      面状地物的指示点，不代表边界
           */
          precision: z
            .enum(['settlement-centroid', 'facility', 'area-indicative'])
            .nullable()
            .default(null),
          /** 坐标出处。有坐标就必须有它，见下方 superRefine */
          source: z.string().optional(),
          /** 同一地物的其他来源坐标，用于展示来源间的离散度 */
          cross_check: z
            .array(z.object({ source: z.string(), lat: z.number(), lng: z.number() }))
            .default([]),
        })
        .default({ lat: null, lng: null, datum: 'wgs84', precision: null, cross_check: [] }),
      /** 行政区划全称 —— 实体消歧第一依据（预案 §3.1） */
      admin_full: z.string().default('广西壮族自治区北海市合浦县沙田镇'),
      /** 别称 / 旧称，写入 JSON-LD alternateName，并在正文中说明 */
      alt_names: z.array(z.string()).default([]),
      /** 权威外部实体链接，写入 sameAs —— GEO 实体对齐的核心信号 */
      same_as: z.array(z.string().url()).default([]),
      /** 结构化属性表：机器可读的事实清单 */
      facts: z
        .array(
          z.object({
            label: z.string(),
            value: z.string(),
            source: z.string().optional(),
            verified: z.boolean().default(true),
          })
        )
        .default([]),
      /** 是否为站点核心实体（首页与全站导航突出展示） */
      is_primary: z.boolean().default(false),
      related_places: z.array(z.string()).default([]),
      related_articles: z.array(z.string()).default([]),
      /** 开放时间 / 门票等，无可靠来源时留空而非编造 */
      visit: z
        .object({
          opening_hours: z.string().optional(),
          admission: z.string().optional(),
          duration: z.string().optional(),
          best_season: z.string().optional(),
        })
        .default({}),
    })
  ),
});

/**
 * FAQ 条目（AEO 主力，预案 §1.2 / §7.1）
 * 用单文件数据源而非一问一文件：条目短、结构固定，集中维护才便于整体复核问答覆盖面。
 */
const faqs = defineCollection({
  loader: file('./src/content/faqs.json'),
  schema: z.object({
    question: z.string().min(4).max(80),
    /** 直答，≤120 字。AI 引用时优先抓这段，必须自足、可独立成立 */
    answer: z.string().min(10).max(300),
    group: z.string(),
    order: z.number().int().default(50),
    entity_tags: z.array(z.string()).min(1),
    updated_at: z.coerce.date(),
    citations: z.array(citation).default([]),
    /** 延伸阅读的站内链接 */
    read_more: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    unverified,
  }),
});

/** 法律文本（预案 §9） */
const legal = defineCollection({
  loader: glob({ base: './src/content/legal', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated_at: z.coerce.date(),
    order: z.number().int().default(50),
  }),
});

export const collections = { topics, articles, places, faqs, legal };
