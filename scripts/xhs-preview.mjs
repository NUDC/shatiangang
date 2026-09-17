#!/usr/bin/env node
/**
 * 小红书链接预览提取器
 *
 * ── 这是「链接预览」，不是「爬取」 ──
 *
 * 它只读小红书**主动为分享发布的 OG 预览标签**（微信分享卡片用的那份），
 * 取标题、描述、一张封面 —— 和微信/Slack 展开链接是同一件事，OG 标签
 * 本就是给第三方做预览用的。它**不做**这些：不登录、不带 Cookie、
 * 不伪造反爬签名、不抓笔记正文、不下整个图集。
 *
 * 关键点：普通 UA 请求笔记页会 302 到登录页；只有「链接预览爬虫」UA
 * （微信 MicroMessenger）能拿到平台发布的 OG 预览。用别的 UA 拿不到，
 * 也不该用别的手段去绕 —— 那就越界了。
 *
 * 产物：把封面存成小预览缩略图（public/media/notes/<id>.jpg），
 * 并打印一段 notes.ts 条目。封面是作者的图，卡片以「链接预览」形式呈现、
 * 明确跳回原文、留作者撤下通道（见 /wall/ 页与《版权声明》）。
 *
 * 用法：node scripts/xhs-preview.mjs "<小红书分享链接>"
 */

import https from 'node:https';
import http from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 只用这一个 UA —— 小红书正是对它吐分享预览。换 UA 拿不到，也不要去试别的绕法。
const WECHAT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) MicroMessenger/7.0';

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': WECHAT_UA, ...headers }, timeout: 20000 },
      (res) => {
        // 跟随一次跳转
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return resolve(get(new URL(res.headers.location, url).href, headers));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks), url })
        );
      }
    );
    req.on('timeout', () => (req.destroy(), reject(new Error('timeout'))));
    req.on('error', reject);
  });
}

function og(html, prop) {
  const re = new RegExp(
    `<meta[^>]*(?:property|name)=["']og:${prop}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function ogAll(html, prop) {
  const re = new RegExp(
    `<meta[^>]*(?:property|name)=["']og:${prop}["'][^>]*content=["']([^"']*)["']`,
    'gi'
  );
  return [...html.matchAll(re)].map((m) => m[1].trim());
}

function noteId(url) {
  const m = url.match(/explore\/([0-9a-f]+)/i);
  return m ? m[1] : `note-${Date.now()}`;
}

const target = process.argv[2];
if (!target) {
  console.error('用法: node scripts/xhs-preview.mjs "<小红书分享链接>"');
  process.exit(1);
}

const id = noteId(target);
const res = await get(target);
const html = res.body.toString('utf8');

// 命中登录页 = 没拿到预览。**不降级、不换手段**，直接报告拿不到。
if (res.url.includes('/login') || !og(html, 'title')) {
  console.error('未取到分享预览（可能链接失效或平台未对预览爬虫开放）。不做任何绕过尝试。');
  process.exit(2);
}

const rawTitle = og(html, 'title');
const title = rawTitle.replace(/\s*-\s*小红书\s*$/, '').trim();
const desc = og(html, 'description');
// og:image 有多张：第一张常是平台占位图（picasso-static），真正的笔记封面
// 在 xhscdn.com 上。优先取 xhscdn 那张，取不到再退回第一张。
const images = ogAll(html, 'image').map((u) => u.replace(/^\/\//, 'https://'));
const cover = images.find((u) => u.includes('xhscdn.com')) || images[0] || '';

console.error(`标题: ${title}`);
console.error(`描述: ${desc.slice(0, 80)}`);
console.error(`封面: ${cover}`);

let coverPath = '';
if (cover && cover.includes('xhscdn.com')) {
  const img = await get(cover, { Referer: 'https://www.xiaohongshu.com/' });
  if (img.status === 200 && img.body.length > 1000) {
    mkdirSync('public/media/notes', { recursive: true });
    const out = path.join('public/media/notes', `${id}.jpg`);
    // 存小预览缩略图（4:5），不是全分辨率转存 —— 这是链接预览的封面
    await sharp(img.body)
      .rotate()
      .resize(600, 750, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);
    coverPath = `/media/notes/${id}.jpg`;
    console.error(`封面已存: ${out}`);
  }
}

// 打印 notes.ts 条目（作者需你手动确认/补全昵称 —— OG 里通常没有）
console.log(
  JSON.stringify(
    {
      url: target,
      title,
      author: '',
      blurb: desc.replace(/#\S+/g, '').trim() || undefined,
      cover: coverPath || undefined,
    },
    null,
    2
  )
);
