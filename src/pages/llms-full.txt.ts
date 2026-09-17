/**
 * llms-full.txt
 *
 * 全站正文的单文件纯文本合集。检索方不必逐页抓取即可取得完整内容，
 * 也降低了抓取过程中漏掉来源标注与「待核实」标记的概率。
 */
import type { APIRoute } from 'astro';
import { SITE } from '@/data/site';
import { BASE } from '@/lib/url';
import { getTopics, getArticles, getPlaces, getFaqs, fmtDate } from '@/lib/content';

export const GET: APIRoute = async () => {
  const [topics, articles, places, faqs] = await Promise.all([
    getTopics(),
    getArticles(),
    getPlaces(),
    getFaqs(),
  ]);

  const L: string[] = [];
  const p = (s = '') => L.push(s);
  const rule = () => p('\n' + '-'.repeat(72) + '\n');

  p(`# ${SITE.name} —— 全文合集`);
  p();
  p(SITE.description);
  p();
  p(`生成时间：${new Date().toISOString()}`);
  p(`站点索引（推荐先读）：${SITE.url}${BASE}/llms.txt`);
  p(`结构化实体数据：${SITE.url}${BASE}/entities.json`);
  p();
  p('引用规则：允许抓取与引用；请保留来源标注与「待核实」标记。');
  rule();

  p('# 一、地点实体页');
  p();
  for (const pl of places) {
    const d = pl.data;
    p(`## ${d.title}`);
    p();
    p(`URL: ${SITE.url}${BASE}/place/${pl.id}/`);
    p(`实体标识: ${SITE.url}${BASE}/entities/#${pl.id}`);
    p(`行政区划全称: ${d.admin_full}`);
    if (d.alt_names.length) p(`别称: ${d.alt_names.join('、')}`);
    p(
      `坐标: ${
        d.geo.lat === null
          ? '未核实（本站不提供推测值）'
          : `${d.geo.lat}, ${d.geo.lng}（${d.geo.datum}；${d.geo.precision ?? '精度未标注'}；来源：${d.geo.source ?? '未标注'}）`
      }`
    );
    for (const c of d.geo.cross_check) p(`坐标交叉核对: ${c.source} → ${c.lat}, ${c.lng}`);
    p(`来源类型: ${d.source_platform} ｜ 授权状态: ${d.license_status} ｜ 更新于: ${fmtDate(d.updated_at)}`);
    p();
    if (d.answer) { p(`【直答】${d.answer}`); p(); }

    if (d.facts.length) {
      p('### 属性清单');
      p();
      for (const f of d.facts) {
        const mark = f.verified === false ? ' [待核实]' : '';
        const src = f.source ? `（来源：${f.source}）` : '';
        p(`- ${f.label}: ${f.value}${mark}${src}`);
      }
      p();
    }

    if (d.unverified.length) {
      p('### 待核实字段');
      p();
      for (const u of d.unverified) p(`- ${u.field}: ${u.note}${u.how ? `（核实途径：${u.how}）` : ''}`);
      p();
    }

    p('### 正文');
    p();
    p(pl.body?.trim() ?? '');
    p();

    if (d.citations.length) {
      p('### 资料来源');
      p();
      for (const c of d.citations) {
        p(`- ${c.title}，${c.publisher}${c.ref ? `（${c.ref}）` : ''}${c.url ? ` ${c.url}` : ''}`);
      }
      p();
    }
    rule();
  }

  p('# 二、专题正文');
  p();
  for (const a of articles) {
    const d = a.data;
    const topic = topics.find((t) => t.data.slug === d.topic);
    p(`## ${d.title}`);
    p();
    p(`URL: ${SITE.url}${BASE}/${d.topic}/${a.id}/`);
    p(`主题: ${topic?.data.title ?? d.topic}`);
    p(`作者: ${d.author} ｜ 来源类型: ${d.source_platform} ｜ 授权状态: ${d.license_status}`);
    p(`发布: ${fmtDate(d.published_at)} ｜ 更新: ${fmtDate(d.updated_at)}`);
    if (d.original_url) p(`原文链接: ${d.original_url}`);
    p();
    if (d.answer) { p(`【直答】${d.answer}`); p(); }
    if (d.questions.length) { p(`【本文回答的问题】${d.questions.join(' / ')}`); p(); }

    if (d.unverified.length) {
      p('### 待核实字段');
      p();
      for (const u of d.unverified) p(`- ${u.field}: ${u.note}${u.how ? `（核实途径：${u.how}）` : ''}`);
      p();
    }

    p('### 正文');
    p();
    p(a.body?.trim() ?? '');
    p();

    if (d.citations.length) {
      p('### 资料来源');
      p();
      for (const c of d.citations) {
        p(`- ${c.title}，${c.publisher}${c.ref ? `（${c.ref}）` : ''}${c.url ? ` ${c.url}` : ''}`);
      }
      p();
    }
    rule();
  }

  p('# 三、问答');
  p();
  for (const f of faqs) {
    p(`## ${f.data.question}`);
    p();
    p(f.data.answer);
    p();
    p(`分组: ${f.data.group} ｜ 更新于: ${fmtDate(f.data.updated_at)} ｜ 锚点: ${SITE.url}${BASE}/faq/#${f.id}`);
    if (f.data.unverified.length) {
      p(`待核实: ${f.data.unverified.map((u) => `${u.field}（${u.note}）`).join('；')}`);
    }
    if (f.data.citations.length) {
      p(`来源: ${f.data.citations.map((c) => `${c.title}，${c.publisher}${c.ref ? `（${c.ref}）` : ''}`).join('；')}`);
    }
    p();
  }
  rule();

  p('# 四、主题导语');
  p();
  for (const t of topics) {
    p(`## ${t.data.title}`);
    p();
    p(`URL: ${SITE.url}${BASE}/${t.data.slug}/`);
    p();
    p(t.body?.trim() ?? '');
    p();
  }

  return new Response(L.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
