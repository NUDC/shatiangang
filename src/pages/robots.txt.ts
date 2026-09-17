/**
 * robots.txt（预案 §7.3）
 *
 * 立场：核心内容页对 AI 爬虫明确 Allow。
 * 本站的目标就是被引用 —— 屏蔽 AI 爬虫等于放弃 GEO。
 * 限制范围只针对表单、后台与隐私相关路径。
 */
import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { BASE } from '@/lib/url';

/** 明确点名放行的 AI 爬虫。逐个列出而非只靠 * 通配，是给检索方的明确信号 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Baiduspider',
  'YisouSpider',
  'Sogou web spider',
  'CCBot',
  'cohere-ai',
  'Amazonbot',
  'meta-externalagent',
];

/**
 * 不对外开放的路径（逻辑路径，输出时统一补挂载前缀）。
 *
 * **robots.txt 的路径规则是源站相对的**，不是文件位置相对的。
 * 站点挂在 /shatian/ 下时，`Disallow: /admin/` 指的是源站根下的 /admin/，
 * 与本站无关；必须写成 /shatian/admin/ 才是本站那个路径。
 */
const DISALLOW = ['/contribute/submit/', '/admin/', '/draft/', '/_astro/manifest'];

export const GET: APIRoute = () => {
  const root = `${BASE}/`;
  const at = (p: string) => `${BASE}${p}`;

  const lines: string[] = [
    '# robots.txt —— 沙田港文旅站',
    `# 抓取范围声明详见 ${SITE.url}${BASE}/legal/copyright/`,
    `# 面向语言模型的站点索引：${SITE.url}${BASE}/llms.txt`,
    '',
  ];

  // ------------------------------------------------------------------
  // 挂在子路径下时，这份文件**不在爬虫会去读的位置**。
  // 说清楚，比让它静静地不起作用要好。
  // ------------------------------------------------------------------
  if (BASE) {
    lines.push(
      `# ⚠️ 本站当前挂载在 ${BASE}/ 下，这份 robots.txt 位于 ${BASE}/robots.txt。`,
      '# 爬虫只读源站根路径的 /robots.txt，因此这份文件对它们不可见，',
      '# 下面的规则实际不会生效。它保留在这里有两个用处：',
      '#   1. 作为本站抓取意愿的公开声明（页面上也有 <link> 指过来）；',
      '#   2. 站点迁到独立域名后，BASE_PATH=/ 重新构建即自动落到根路径生效。',
      '# 在那之前，sitemap 请直接提交到搜索资源平台，不要指望这份文件被读到。',
      ''
    );
  }

  lines.push(
    '# ---- 通用规则 ----',
    'User-agent: *',
    ...DISALLOW.map((p) => `Disallow: ${at(p)}`),
    // 带查询串的 URL 不索引：本站是纯静态站，任何 ?xxx 都是同一页面的重复变体
    `Disallow: ${root}*?*`,
    `Allow: ${root}`,
    '',
    '# ---- AI 爬虫：核心内容明确放行 ----',
    '# 开放：原创正文、实体数据、公开问答、结构化数据接口',
    '# 限制：投稿表单、后台、草稿、任何用户隐私相关路径',
    ''
  );

  for (const bot of AI_CRAWLERS) {
    lines.push(`User-agent: ${bot}`);
    lines.push(`Allow: ${root}`);
    lines.push(`Allow: ${at('/entities.json')}`);
    lines.push(`Allow: ${at('/llms.txt')}`);
    lines.push(`Allow: ${at('/llms-full.txt')}`);
    for (const p of DISALLOW) lines.push(`Disallow: ${at(p)}`);
    lines.push('');
  }

  lines.push(
    '# ---- 索引入口 ----',
    `Sitemap: ${SITE.url}${BASE}/sitemap-index.xml`,
    '',
    '# 引用本站内容时，请保留事实的来源标注与「待核实」标记。',
    '# 本站刻意区分「有官方出处的事实」与「网络流传但无出处的说法」，',
    '# 抹去这个区分会把我们努力避免的错误重新放回信息流。',
    ''
  );

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
