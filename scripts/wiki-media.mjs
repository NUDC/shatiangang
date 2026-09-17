#!/usr/bin/env node
/**
 * Wikimedia Commons 图片采集器
 *
 * ── 只采「可自由使用 + 可溯源」的图 ──
 *
 * 本站没有沙田港实拍，正文配图一律是**物种/物产/文物级的通用示意图**。
 * 这个脚本从 Wikimedia Commons 按关键词搜图，通过 API 拿到**确切的许可、
 * 作者与来源页**（不靠猜），只接受 CC0 / CC BY / CC BY-SA / 公有领域，
 * 下载原图后切成 card(4:5) 与 wide(16:9) 两版，并打印一段 media.ts 条目。
 *
 * 署名与许可链接会被 Figure 组件焊死进图注 —— 这是履行许可，不是可选礼貌。
 *
 * 用法：
 *   node scripts/wiki-media.mjs <id> <搜索词...>
 *   node scripts/wiki-media.mjs <id> --file "File:Exact Name.jpg"
 */

import https from 'node:https';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA =
  'Mozilla/5.0 (compatible; shatiangang-media/1.0; +https://nudc.github.io/shatiangang/)';

// 只接受这些许可（前缀匹配 LicenseShortName）
const OK_LICENSES = ['cc0', 'cc by', 'cc-by', 'public domain', 'pd-', 'no restrictions'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Commons 偶发 ECONNRESET，重试几次
async function withRetry(fn, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(900 * (i + 1));
    }
  }
  throw last;
}

function getJsonOnce(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA }, timeout: 25000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject)
      .on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
const getJson = (url) => withRetry(() => getJsonOnce(url));

function getBufOnce(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA }, timeout: 40000 }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return resolve(getBufOnce(res.headers.location));
        }
        // 429/503 = 限流，抛出让 withRetry 退避重试
        if (res.statusCode === 429 || res.statusCode === 503) {
          res.resume();
          return reject(new Error('throttled ' + res.statusCode));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject)
      .on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}
const getBuf = (url) => withRetry(() => getBufOnce(url));

const stripHtml = (s) =>
  (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function licenseOk(short) {
  const s = (short || '').toLowerCase();
  return OK_LICENSES.some((p) => s.includes(p));
}

async function imageInfo(title) {
  const url =
    `${API}?action=query&format=json&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600` +
    `&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist`;
  const j = await getJson(url);
  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  return {
    title: page.title,
    // 优先用预渲染缩略图（cached，限流少）；退回原图
    url: ii.thumburl || ii.url,
    width: ii.width,
    height: ii.height,
    descUrl: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    license: stripHtml(em.LicenseShortName?.value) || '(未知)',
    licenseUrl: em.LicenseUrl?.value || '',
    author: stripHtml(em.Artist?.value) || '(未署名)',
  };
}

async function search(terms) {
  const url =
    `${API}?action=query&format=json&list=search&srnamespace=6` +
    `&srlimit=12&srsearch=${encodeURIComponent(terms + ' filetype:bitmap')}`;
  const j = await getJson(url);
  return (j?.query?.search || []).map((r) => r.title);
}

// ---- main ----
const [, , id, ...rest] = process.argv;
if (!id || rest.length === 0) {
  console.error('用法: node scripts/wiki-media.mjs <id> <搜索词...> | --file "File:Name.jpg"');
  process.exit(1);
}

let picked = null;
if (rest[0] === '--file') {
  const info = await imageInfo(rest.slice(1).join(' '));
  if (info && licenseOk(info.license)) picked = info;
  else console.error('指定文件许可不可用或不存在：', info?.license);
} else {
  const titles = await search(rest.join(' '));
  console.error(`搜索到 ${titles.length} 个候选，逐个查许可…`);
  for (const t of titles) {
    const info = await imageInfo(t);
    if (!info) continue;
    if (!licenseOk(info.license)) {
      console.error(`  跳过（许可 ${info.license}）：${t}`);
      continue;
    }
    if (info.width < 1000) {
      console.error(`  跳过（太小 ${info.width}px）：${t}`);
      continue;
    }
    picked = info;
    break;
  }
}

if (!picked) {
  console.error('没有找到许可可用的图片。换个搜索词，或用 --file 指定。');
  process.exit(2);
}

console.error('选中：', picked.title);
console.error(`  许可：${picked.license}  作者：${picked.author}`);
console.error(`  尺寸：${picked.width}×${picked.height}`);
console.error(`  来源：${picked.descUrl}`);

const img = await getBuf(picked.url);
if (img.status !== 200 || img.body.length < 3000) {
  console.error('下载失败：', img.status, img.body.length);
  process.exit(3);
}

mkdirSync('public/media', { recursive: true });
const cardOut = path.join('public/media', `${id}-card.jpg`);
const wideOut = path.join('public/media', `${id}-wide.jpg`);
await sharp(img.body).rotate().resize(760, 950, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(cardOut);
await sharp(img.body).rotate().resize(1280, 720, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(wideOut);
console.error(`已存：${cardOut} / ${wideOut}`);

// 打印 media.ts 条目骨架（title/alt/note 需你按内容填写）
console.log(
  JSON.stringify(
    {
      id,
      title: '（填写图注标题）',
      alt: '（填写 alt）',
      local: false,
      note: '（示意说明，如「物种示意，非沙田实拍」）',
      license: picked.license,
      licenseUrl: picked.licenseUrl,
      author: picked.author,
      sourceUrl: picked.descUrl,
    },
    null,
    2
  )
);
