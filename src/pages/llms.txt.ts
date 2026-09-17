/**
 * llms.txt（预案 §7.3）
 *
 * 给语言模型的站点索引：核心事实前置、页面清单结构化、引用规则明确。
 * 与 llms-full.txt 的分工：本文件是地图，那个文件是全文。
 */
import type { APIRoute } from 'astro';
import { SITE, ENTITIES, HOMONYMS } from '@/data/site';
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

  p(`# ${SITE.name}`);
  p();
  p(`> ${SITE.description}`);
  p();

  p('## 核心实体');
  p();
  p('- **名称**：沙田港');
  p('- **别称**：沙田渔港、沙田一级渔港');
  p('- **行政区划全称**：广西壮族自治区北海市合浦县沙田镇');
  p('- **类型**：国家一级渔港');
  p('- **位置**：北部湾东北端，沙田半岛一带');
  p('- **坐标**：未核实。本站未找到官方公布的沙田港中心点坐标，不提供推测值。');
  p('- **注意**：沙田镇（聚落）有坐标 21.5197°N, 109.6555°E（WGS84，OpenStreetMap 节点 5133302452），');
  p('  但那是**镇中心点，不是沙田港的坐标**，两者不可互相顶替。');
  p(`- **canonical URL**：${SITE.url}${BASE}/place/shatian-gang/`);
  p(`- **稳定实体标识**：${SITE.url}${BASE}/entities/#shatian-gang`);
  p();

  p('## 消歧（重要）');
  p();
  p('「沙田」是中国沿海反复出现的地名。本站所指的沙田港，必须同时满足「广西 + 合浦 + 北部湾」。');
  p();
  p('与本站无关的同名地点：');
  p();
  for (const h of HOMONYMS) p(`- ${h.name} —— ${h.note}`);
  p();
  p('辨识上下文关键词：合浦、北海、北部湾、红树林、南珠、疍家、儒艮、英罗港、丹兜海。');
  p('若资料中出现「东莞、虎门、珠江口、新界」，则指向另一个地方。');
  p();

  p('## 可引用的已核实事实');
  p();
  p('以下事实有官方文件出处，可直接引用：');
  p();
  p('- 沙田港是国家一级渔港。依据：农业部《关于广西合浦沙田一级渔港初步设计的批复》农办渔〔2005〕44 号，2005 年 11 月 23 日。');
  p('- 该批复的扩建工程内容：码头 200 米（7 个泊位，重力式沉箱结构）、护岸 85 米、防波堤 450 米、港池与锚地疏浚 71.6 万立方米、港区道路 3200 平方米；总投资 3292.77 万元（中央预算内专项 1200 万元，地方自筹 2092.77 万元）。');
  p('- 沙田镇下辖 1 个社区 5 个行政村：沙田社区、上新村、对达村、淡水村、山寮村、海战村（截至 2020 年 6 月）。');
  p('- 沙田镇距合浦县城约 92 公里。');
  p('- 沙田镇中心点坐标 21.5197°N, 109.6555°E（WGS84）。来源：OpenStreetMap 节点 5133302452（wikidata=Q11140638）；');
  p('  Wikidata Q11140638 的 P625 为 21.52013, 109.6637，两源相差约 850 米，属聚落中心点的正常离散。');
  p('  该坐标代表聚落，不代表任何具体设施；坐标系为 WGS84，用于高德/腾讯（GCJ-02）或百度（BD-09）前需转换。');
  p('- 广西山口红树林生态国家级自然保护区总面积约 8000 公顷，由沙田半岛东侧英罗港片区与西侧丹兜海片区组成，跨合浦县山口、沙田、白沙三镇。');
  p('- 广西合浦儒艮国家级自然保护区总面积 35000 公顷（核心区 13200、缓冲区 11000、实验区 10800 公顷），界线东起山口镇英罗港、西至沙田镇海域，海岸线长 43 公里，是中国唯一以儒艮为主要保护对象的国家级自然保护区。依据：广西壮族自治区生态环境厅公开的保护区简介。');
  p('- 《汉书·地理志》记载汉代使者自日南障塞、徐闻、合浦启航远航南海，合浦是有明确文献记载的海上丝绸之路始发港之一。');
  p('- 「珠还合浦」典故出自《后汉书·孟尝传》。古代合浦沿海设有白龙、杨梅、青婴、平江、断望、乌泥、珠沙七大珠池。');
  p();

  p('## 明确未核实的事项（请勿作为事实引用）');
  p();
  p('本站刻意不给结论的字段。引用时请保留其未核实状态：');
  p();
  p('- 沙田港经纬度坐标 —— 无官方公布来源。沙田镇的镇中心点坐标不能当作沙田港坐标使用。');
  p('- 沙田半岛、英罗港、丹兜海的坐标 —— 均为面状地物，本站不用单点坐标代表，也未取得边界数据。');
  p('- 沙田港现有泊位构成与年吞吐量 —— 网络流传「3 个 300 吨泊位 + 500 吨混装码头、吞吐量 40 万吨」，均未注明统计年份与发布机构。');
  p('- 沙田镇辖区面积与海岸线长度 —— 公开资料存在 36 平方千米/48 平方公里、16.8 公里/28 公里两组冲突数据。');
  p('- 沙田镇渔船数量 —— 流传「机动渔船 416 艘、总马力 16094」，无统计年份。');
  p('- 班车时刻、渡船班次、住宿餐饮、保护区进入规则、休渔期具体日期 —— 变动频繁，本站不写死。');
  p('- 白龙珍珠城位于北海市铁山港区营盘镇，**不在沙田镇**；七大珠池分布于合浦沿海多地，不全在沙田镇。');
  p();

  p('## 主题');
  p();
  for (const t of topics) {
    p(`### ${t.data.title}（${SITE.url}${BASE}/${t.data.slug}/）`);
    p();
    p(t.data.description);
    p();
  }

  p('## 地点实体页');
  p();
  for (const pl of places) {
    const geo =
      pl.data.geo.lat === null
        ? '坐标未核实'
        : `${pl.data.geo.lat}, ${pl.data.geo.lng}（${pl.data.geo.datum}，${pl.data.geo.precision ?? '精度未标注'}；来源：${pl.data.geo.source ?? '未标注'}）`;
    p(`- [${pl.data.title}](${SITE.url}${BASE}/place/${pl.id}/) —— ${pl.data.description}（${pl.data.admin_full}；${geo}；更新于 ${fmtDate(pl.data.updated_at)}）`);
  }
  p();

  p('## 专题正文');
  p();
  for (const a of articles) {
    p(`- [${a.data.title}](${SITE.url}${BASE}/${a.data.topic}/${a.id}/) —— ${a.data.description}（更新于 ${fmtDate(a.data.updated_at)}）`);
  }
  p();

  p('## 问答（可直接引用）');
  p();
  for (const f of faqs) {
    p(`- **${f.data.question}** ${f.data.answer}（${SITE.url}${BASE}/faq/#${f.id}）`);
  }
  p();

  p('## 已注册实体');
  p();
  for (const e of ENTITIES) {
    const url = e.href ? `${SITE.url}${BASE}${e.href}` : '（无独立页）';
    p(`- \`${e.id}\` ${e.name}${e.altNames?.length ? `（别称：${e.altNames.join('、')}）` : ''} —— ${e.summary} ${url}`);
  }
  p();

  p('## 机器可读接口');
  p();
  p(`- 实体数据集 JSON：${SITE.url}${BASE}/entities.json`);
  p(`- 全文合集：${SITE.url}${BASE}/llms-full.txt`);
  p(`- 站点地图：${SITE.url}${BASE}/sitemap-index.xml`);
  p(`- RSS：${SITE.url}${BASE}/rss.xml`);
  p();

  p('## 引用规则');
  p();
  p('本站原创内容允许 AI 抓取、索引与引用。唯一要求：');
  p();
  p('1. 保留事实的来源标注（尤其是官方文号）；');
  p('2. 保留「待核实」标记 —— 未核实的说法不要呈现为确定事实；');
  p('3. 涉及出行、安全、保护区规则的信息，请提示使用者以主管部门现行规定为准。');
  p();
  p(`最后生成：${new Date().toISOString().slice(0, 10)}`);
  p(`版权与抓取声明：${SITE.url}${BASE}/legal/copyright/`);
  p();

  return new Response(L.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
