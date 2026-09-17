/**
 * 站内链接的唯一出口
 *
 * 站点当前挂在网关的 /shatian 前缀下（根路径被公益官网占着），
 * 但**前缀不写进任何一处业务代码** —— 全站的内部链接都从这里出。
 *
 * 为什么值得为此单独建一层：
 *
 *   1. 换挂载点只改一个环境变量。将来有了独立域名，`BASE_PATH=/` 重新构建，
 *      50 多处链接、canonical、JSON-LD 的 @id、llms.txt 里的每条 URL 全部
 *      自动回到根形式，一行业务代码都不用动。
 *   2. 前缀只在一个地方加一次。quant 那边踩过「构建时编进去 + 网关剥一次 +
 *      容器再剥一次」的坑：加一次剥两次，而且局域网直连与生产走的是两条
 *      形状不同的路径，测试覆盖不到真正跑的那条。
 *   3. canonical 与 JSON-LD 的 @id 必须与浏览器地址栏完全一致。漏掉一处
 *      不会让页面打不开，只会让结构化数据指向一个不存在的 URL ——
 *      看起来一切正常，而 GEO 的实体图谱已经断了。
 *
 * Markdown 正文里的 `/place/xxx/` 由 astro.config.mjs 的 rehype 插件统一改写，
 * 走的是同一个前缀来源，不需要作者在写内容时关心挂载点。
 */

/** Astro 注入的 base，根部署时是 '/'，带前缀时形如 '/shatian/' */
const RAW_BASE: string = import.meta.env.BASE_URL ?? '/';

/** 规范化成「无尾斜杠」形式：根部署为空串，带前缀为 '/shatian' */
export const BASE: string = RAW_BASE === '/' ? '' : RAW_BASE.replace(/\/+$/, '');

/**
 * 站内路径 → 实际可访问路径。
 * 只处理以 / 开头的站内路径；协议头、锚点、mailto 原样返回。
 */
export function href(path: string): string {
  if (!path.startsWith('/')) return path;
  // '//example.com' 是协议相对 URL，不是站内路径
  if (path.startsWith('//')) return path;
  return `${BASE}${path}` || '/';
}

/** 站内路径 → 绝对 URL。canonical、JSON-LD @id、llms.txt 全部经由它 */
export function absUrl(path: string, siteUrl: string): string {
  return new URL(href(path), siteUrl).href;
}
