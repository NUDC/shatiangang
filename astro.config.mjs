// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { visit } from 'unist-util-visit';

/**
 * 站点域名。上线前改这里（或用环境变量 SITE_URL 覆盖）。
 * canonical / sitemap / JSON-LD @id 全部从这里派生，必须是线上真实域名。
 */
const SITE = process.env.SITE_URL || 'https://www.shatiangang.cn';

/**
 * 挂载路径。
 *
 * 站点托管在 GitHub Pages 项目站点，路径是 /<仓库名>/ = /shatiangang/，
 * 所以默认值就是 '/shatiangang/'。将来换自定义域名（内容挂在根上），
 * `BASE_PATH=/` 重新构建即可，站内链接经 src/lib/url.ts 自动回到根形式。
 *
 * 注意：**base 不会改变 dist 的目录结构**（产物仍是 dist/place/xxx/index.html），
 * 它只影响产物里写出来的 URL。GitHub Pages 项目站点天然把仓库名作为一级路径，
 * 所以 base 与站点实际路径一致，无需任何前缀剥离。
 */
const BASE = normalizeBase(process.env.BASE_PATH);

/**
 * BASE_PATH 兜底校验。
 *
 * 专门防一类 Windows 上的坑：Git Bash（MSYS）会把「看起来像 Unix 路径」的
 * 环境变量值自动转成 Windows 路径，`/shatian/` 会变成
 * `D:/Program Files/Git/shatiangang/`。手敲 `BASE_PATH=/shatiangang/ npm run build`
 * 时若被转换会出错，命令前加 MSYS_NO_PATHCONV=1 即可（CI 在 Linux 上无此问题）。
 *
 * 带盘符的值一旦漏进来，Astro 报的是 UnsupportedExternalRedirect ——
 * 一个完全看不出与 Windows 有关的错。这里直接拦掉并说清原因。
 */
/** @param {string | undefined} raw */
function normalizeBase(raw) {
  if (!raw) return '/shatiangang/';
  if (/^[A-Za-z]:/.test(raw) || !raw.startsWith('/')) {
    throw new Error(
      `BASE_PATH 不是站内路径：${raw}\n` +
        '  Windows 的 Git Bash 会把 /shatiangang/ 转成 D:/Program Files/Git/shatiangang/。\n' +
        '  在命令前加 MSYS_NO_PATHCONV=1（CI 在 Linux 上无此问题）。'
    );
  }
  return raw.endsWith('/') ? raw : raw + '/';
}

/**
 * Markdown 正文里的站内链接统一补前缀。
 *
 * Astro 的 base 只管它自己生成的链接，**不碰 Markdown 正文里手写的 `](/xxx/)`**。
 * 靠人工在每篇文章里写 `/shatian/place/...` 是错的：作者不该知道挂载点，
 * 而且换挂载点时要改遍所有内容文件。这里在编译期统一改写，与 src/lib/url.ts
 * 用的是同一个前缀来源。
 */
function rehypeBaseLinks() {
  const prefix = BASE.replace(/\/+$/, '');
  /** @param {any} tree */
  return (tree) => {
    if (!prefix) return;
    visit(tree, 'element', (node) => {
      for (const attr of ['href', 'src']) {
        const v = node.properties?.[attr];
        // 只改站内绝对路径；协议相对（//）、外链、锚点、mailto 一律不动
        if (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')) {
          node.properties[attr] = prefix + v;
        }
      }
    });
  };
}

export default defineConfig({
  site: SITE,
  base: BASE,

  // 目录式 URL（/haisi/hepu-shifagang/），对 SEO 与实体 @id 稳定性更友好
  trailingSlash: 'always',
  build: { format: 'directory' },

  // 实体消歧：别称 / 旧称一律 301 到 canonical 实体页（预案 §3.2）
  //
  // **source 与 destination 的处理方式不一样，这是 Astro 的一个坑：**
  // source 是逻辑路由（产物落在 dist/shatian-yugang/，Pages 直接按此路径命中），
  // 而 destination 被**原样写进 meta refresh / Location**，Astro 不给它补 base。
  // 不手动补的话，带前缀部署时这 5 条重定向全部跳到不存在的地址
  // —— 而且页面本身正常，只有点了别称链接的人会掉进去。
  redirects: Object.fromEntries(
    Object.entries({
      '/shatian-yugang/': '/place/shatian-gang/',
      '/shatiangang/': '/place/shatian-gang/',
      '/lianzhou-gang/': '/haisi/hepu-shifagang/',
      '/hepu-gang/': '/haisi/hepu-shifagang/',
      '/nanzhu/': '/pearl/hepu-nanzhu/',
    }).map(([from, to]) => [
      from,
      { status: 301, destination: BASE.replace(/\/+$/, '') + to },
    ])
  ),

  integrations: [
    sitemap({
      // 待核实 / 草稿 / 法务页不进 sitemap（预案 §2.2）
      filter: (page) =>
        !page.includes('/legal/') &&
        !page.includes('/404') &&
        !page.includes('/draft/'),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
        // changefreq 全站统一用上面的 weekly：主流搜索引擎基本忽略这个字段，
        // 真正起作用的是 priority 与 lastmod。
        if (item.url === new URL(BASE, SITE).href) {
          item.priority = 1.0;
        } else if (item.url.includes('/place/')) {
          item.priority = 0.9;
        } else if (item.url.includes('/faq/')) {
          item.priority = 0.8;
        } else {
          item.priority = 0.7;
        }
        return item;
      },
    }),
  ],

  markdown: {
    rehypePlugins: [rehypeBaseLinks],
    shikiConfig: { theme: 'github-light', wrap: true },
  },

  // 纯静态输出：AI 爬虫不执行 JS，正文必须在首屏 HTML 里
  output: 'static',
});
