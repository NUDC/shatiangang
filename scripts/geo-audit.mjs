#!/usr/bin/env node
/**
 * GEO 效果自检（预案 §8）
 *
 * 对 dist/ 产物做静态巡检，把预案里的观察指标变成 build 之后能跑的检查：
 *   - 结构化标注完整率 ≥90%
 *   - 实体页覆盖率 ≥80%
 *   - canonical / description / 直答块的缺失
 *   - 站内死链 <2%
 *
 * 退出码非 0 表示有指标未达标，可直接接进 CI。
 * 用法：npm run build && npm run audit:geo
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const TARGETS = { schema: 0.9, entityCoverage: 0.8, deadLinks: 0.02 };

/**
 * 挂载前缀。必须与 astro.config.mjs 的 BASE 取同一个来源，否则死链检查会
 * 把全站每一条链接都误报成死链 —— 产物里的链接带前缀，dist 的目录结构不带。
 */
const BASE = (process.env.BASE_PATH || '/shatian/').replace(/\/+$/, '');
/** 产物里的链接 → dist 里的逻辑路径 */
const stripBase = (l) => (BASE && l.startsWith(BASE + '/') ? l.slice(BASE.length) : l);

if (!existsSync(DIST)) {
  console.error('✗ 找不到 dist/。请先运行 npm run build');
  process.exit(1);
}

/** 递归收集 dist 下所有 .html */
async function collectHtml(dir, acc = []) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) await collectHtml(full, acc);
    else if (name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

/** dist 路径 → 站内 URL 路径 */
const toUrlPath = (file) => {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  return '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '/');
};

const files = await collectHtml(DIST);
const pages = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const urlPath = toUrlPath(file);

  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  let types = [];
  let ldValid = true;
  for (const m of ldMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const nodes = parsed['@graph'] ?? [parsed];
      types.push(...nodes.map((n) => n['@type']).filter(Boolean));
    } catch {
      ldValid = false;
    }
  }

  pages.push({
    urlPath,
    isNoindex: /name="robots"\s+content="noindex/.test(html),
    hasCanonical: /<link rel="canonical"/.test(html),
    hasDescription: /<meta name="description" content="[^"]{20,}"/.test(html),
    hasOg: /<meta property="og:title"/.test(html),
    hasSchema: types.length > 0,
    ldValid,
    types,
    hasAnswer: /class="answer"/.test(html),
    hasH1: /<h1[^>]*>/.test(html),
    // 别称 301 页的跳转目标。Astro 不给 redirects 的 destination 补 base，
    // 漏补时页面本身完全正常，只有点了别称链接的人会掉进 404 —— 单独查一遍
    redirectTo: (html.match(/http-equiv="refresh"[^>]*url=([^"'>]+)/i) ?? [])[1] ?? null,
    // 站内链接（忽略锚点、外链、mailto）
    links: [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]),
  });
}

const indexable = pages.filter((p) => !p.isNoindex);
const entityPages = pages.filter((p) => p.urlPath.startsWith('/place/') && p.urlPath !== '/place/');

/* ---------- 指标 ---------- */
const pct = (n, d) => (d === 0 ? 1 : n / d);
const fmt = (x) => `${(x * 100).toFixed(1)}%`;

const schemaRate = pct(indexable.filter((p) => p.hasSchema).length, indexable.length);
const canonicalRate = pct(indexable.filter((p) => p.hasCanonical).length, indexable.length);
const descRate = pct(indexable.filter((p) => p.hasDescription).length, indexable.length);
const answerRate = pct(indexable.filter((p) => p.hasAnswer).length, indexable.length);
const entityWithGeoSchema = entityPages.filter((p) => p.types.some((t) => t && t !== 'Article')).length;
const entityCoverage = pct(entityWithGeoSchema, entityPages.length);

/** 死链：站内链接指向不存在的产物 */
async function collectAll(dir, acc = []) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) await collectAll(full, acc);
    else acc.push('/' + path.relative(DIST, full).split(path.sep).join('/'));
  }
  return acc;
}

const known = new Set(pages.map((p) => p.urlPath));
// 非 HTML 产物（entities.json、llms.txt、/_astro/*.css 等）也是有效链接目标
for (const f of await collectAll(DIST)) known.add(f);

const allLinks = [];
const dead = [];
for (const p of pages) {
  for (const raw of p.links) {
    const l = stripBase(raw);
    // 构建产物资源由 Astro 保证一致，不纳入内容死链统计
    if (l.startsWith('/_astro/')) continue;
    // 带前缀部署时，站内链接必须都带前缀；漏掉的会在这里暴露成死链
    allLinks.push(raw);
    const normalized = l.endsWith('/') || path.basename(l).includes('.') ? l : l + '/';
    if (!known.has(normalized) && !known.has(l)) dead.push({ from: p.urlPath, to: raw });
  }
}
const deadRate = allLinks.length === 0 ? 0 : dead.length / allLinks.length;

/**
 * 别称 301 页的跳转目标。
 *
 * 单独查是因为它藏得深：Astro 不给 redirects 的 destination 补 base，
 * 漏补时重定向页本身、以及全站其他页面都完全正常，只有真正点了别称链接的人
 * 会掉进 404。这类「只在某条路径上才炸」的错，靠肉眼看产物是发现不了的。
 */
const redirects = pages.filter((p) => p.redirectTo);
const redirectProblems = [];
for (const r of redirects) {
  if (BASE && !r.redirectTo.startsWith(BASE + '/')) {
    redirectProblems.push(`重定向目标缺挂载前缀：${r.urlPath} → ${r.redirectTo}（应为 ${BASE}${r.redirectTo}）`);
    continue;
  }
  const target = stripBase(r.redirectTo);
  if (!known.has(target)) redirectProblems.push(`重定向目标不存在：${r.urlPath} → ${r.redirectTo}`);
}

/* ---------- 输出 ---------- */
const rows = [
  ['页面总数', String(pages.length), '', true],
  ['可索引页面', String(indexable.length), '', true],
  ['地点实体页', String(entityPages.length), '', true],
  ['结构化标注完整率', fmt(schemaRate), `目标 ≥${fmt(TARGETS.schema)}`, schemaRate >= TARGETS.schema],
  ['实体页 Place 标注率', fmt(entityCoverage), `目标 ≥${fmt(TARGETS.entityCoverage)}`, entityCoverage >= TARGETS.entityCoverage],
  ['canonical 覆盖率', fmt(canonicalRate), '目标 100%', canonicalRate === 1],
  ['description 覆盖率', fmt(descRate), '目标 100%', descRate === 1],
  ['AEO 直答块覆盖率', fmt(answerRate), '参考值', true],
  ['站内死链率', fmt(deadRate), `目标 <${fmt(TARGETS.deadLinks)}`, deadRate < TARGETS.deadLinks],
  ['别称 301 重定向', String(redirects.length), '目标须带前缀且存在', redirectProblems.length === 0],
  ['挂载前缀', BASE || '（根路径）', 'BASE_PATH', true],
];

console.log('\n北部湾沙田港 · GEO 自检报告');
console.log('='.repeat(60));
for (const [label, value, target, ok] of rows) {
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${label.padEnd(22, '　')} ${value.padStart(8)}  ${target}`);
}

const problems = [];
for (const p of indexable) {
  if (!p.hasSchema) problems.push(`缺 JSON-LD：${p.urlPath}`);
  if (!p.ldValid) problems.push(`JSON-LD 解析失败：${p.urlPath}`);
  if (!p.hasCanonical) problems.push(`缺 canonical：${p.urlPath}`);
  if (!p.hasDescription) problems.push(`缺 description：${p.urlPath}`);
  if (!p.hasH1) problems.push(`缺 h1：${p.urlPath}`);
  if (!p.hasOg) problems.push(`缺 og:title：${p.urlPath}`);
}
for (const d of dead) problems.push(`死链：${d.from} → ${d.to}`);
problems.push(...redirectProblems);

if (problems.length) {
  console.log('\n需要处理：');
  for (const x of problems.slice(0, 40)) console.log('  · ' + x);
  if (problems.length > 40) console.log(`  … 另有 ${problems.length - 40} 项`);
}

const failed = rows.some(([, , , ok]) => !ok);
console.log('');
process.exit(failed ? 1 : 0);
