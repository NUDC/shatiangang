/**
 * 站点常量与实体注册表
 *
 * 这个文件是全站唯一的「实体真相源」。JSON-LD、内链图谱、llms.txt、
 * /entities.json 全部从这里派生 —— 实体定义只改一处，机器可读层同步更新。
 */

/**
 * 高德地图 JS API 配置。
 *
 * **key 是公开的，安全密钥不是。**
 * key 会出现在浏览器请求里，这是高德的设计 —— 它靠「域名白名单」而不是保密来防滥用，
 * 所以上线前务必在高德控制台把本站域名（nudc.github.io）加进该 key 的白名单。
 *
 * 安全密钥见下方 securityCode 字段。
 */
export const AMAP = {
  // 纯静态站，直接硬编码。key 与安全密钥都会出现在前端 JS 里 ——
  // 这是 GitHub Pages（无服务端）的固有情形，安全性靠高德控制台的域名白名单
  // （给 key 绑定 nudc.github.io），不靠保密。
  key: 'e004b2482662e0bfce518e8e36a1c3b9',
  securityCode: '671dcc72c12007ecf5b1b9aa04783e8d',
} as const;

export const SITE = {
  /** 上线前改成真实域名，或用 SITE_URL 环境变量覆盖 */
  url: (import.meta.env.SITE as string) || 'https://www.shatiangang.cn',
  /** 站点品牌名。加「北部湾」是有意的：它本身就是一层消歧 ——
      检索「沙田港」会撞上东莞虎门港沙田港区，加上海域名就不会。
      注意这是**站名**，不是港口的official名称，港口实体仍叫「沙田港」。 */
  name: '北部湾沙田港',
  shortName: '沙田港',
  /** 首页 title，控制在 30 字内，核心实体全称前置 */
  title: '北部湾沙田港 · 广西北海合浦县沙田镇 | 海丝古港·南珠·疍家·红树林',
  description:
    '沙田港位于广西壮族自治区北海市合浦县沙田镇，是北部湾东北端的国家一级渔港。本站系统整理沙田港的海丝港口史、沙田半岛海岛与红树林生态、疍家渔业文化、合浦南珠文化与实用出行信息，每条事实标注来源，未核实字段明确标记。',
  lang: 'zh-CN',
  locale: 'zh_CN',
  /** 站点负责人 —— E-E-A-T 的作者信号，上线前填真实信息 */
  author: {
    name: '北部湾沙田港编辑部',
    email: '1461076997@qq.com',
    /** 上线前填写，缺失会削弱 Article schema 的作者可信度 */
    url: '/about/',
  },
  /** ICP 备案号（中国大陆主机强制），页脚展示并链到工信部查询入口 */
  icp: '桂ICP备2026018295号-1',
  founded: '2026-09-16',
} as const;

/* ------------------------------------------------------------------ *
 * 实体注册表（预案 §3 实体消歧）
 * ------------------------------------------------------------------ */

export type Entity = {
  id: string;
  name: string;
  /** 行政区划全称 —— 消歧第一依据 */
  adminFull?: string;
  altNames?: string[];
  /** 权威外部标识，写入 sameAs。GEO 靠这个把你的页面挂到已知实体上 */
  sameAs?: string[];
  kind: 'place' | 'culture' | 'history' | 'nature' | 'product' | 'admin';
  /** canonical 页面路径；无独立页的概念实体留空 */
  href?: string;
  summary: string;
};

export const ENTITIES: Entity[] = [
  {
    id: 'shatian-gang',
    name: '沙田港',
    adminFull: '广西壮族自治区北海市合浦县沙田镇',
    altNames: ['沙田渔港', '沙田一级渔港'],
    kind: 'place',
    href: '/place/shatian-gang/',
    summary:
      '位于北部湾东北端、合浦县沙田镇的国家一级渔港，是桂东南与粤西通往海南及东南亚的海上通道之一。',
  },
  {
    id: 'shatian-zhen',
    name: '沙田镇',
    adminFull: '广西壮族自治区北海市合浦县沙田镇',
    kind: 'admin',
    href: '/place/shatian-zhen/',
    // Wikidata Q11140638 的 P131 指向合浦县（Q1268277），与本站 adminFull 一致 ——
    // 这是把本站实体挂到已知实体图谱上最硬的一根锚
    sameAs: [
      'https://www.wikidata.org/wiki/Q11140638',
      'https://zh.wikipedia.org/wiki/%E6%B2%99%E7%94%B0%E9%95%87_(%E5%90%88%E6%B5%A6%E5%8E%BF)',
    ],
    summary:
      '合浦县东南沿海边陲乡镇，距县城约 92 公里，辖沙田社区及上新、对达、淡水、山寮、海战 5 个行政村。',
  },
  {
    id: 'shatian-bandao',
    name: '沙田半岛',
    kind: 'nature',
    href: '/place/shatian-bandao/',
    summary: '伸入北部湾的半岛，东侧为英罗港、西侧为丹兜海，两侧均分布成片红树林。',
  },
  {
    id: 'yingluo-gang',
    name: '英罗港',
    kind: 'nature',
    href: '/place/yingluo-gang/',
    summary: '沙田半岛东侧海湾，山口红树林国家级自然保护区两大片区之一，以高大的红海榄群落著称。',
  },
  {
    id: 'dandou-hai',
    name: '丹兜海',
    kind: 'nature',
    href: '/place/dandou-hai/',
    summary: '沙田半岛西侧海湾，山口红树林保护区另一片区，滩涂广阔，是疍家赶海与滩涂养殖的传统海域。',
  },
  {
    id: 'shankou-hongshulin',
    name: '广西山口红树林生态国家级自然保护区',
    altNames: ['山口红树林保护区', '山口国家级红树林保护区'],
    kind: 'nature',
    href: '/island/shankou-hongshulin/',
    sameAs: ['https://zh.wikipedia.org/wiki/山口红树林生态国家级自然保护区'],
    summary: '1990 年经国务院批准建立的国家级自然保护区，由英罗港、丹兜海两个片区组成，跨山口、沙田、白沙三镇。',
  },
  {
    id: 'hepu-rugen',
    name: '广西合浦儒艮国家级自然保护区',
    altNames: ['合浦儒艮保护区'],
    kind: 'nature',
    href: '/island/hepu-rugen/',
    summary:
      '中国唯一以儒艮及其栖息海草床为保护对象的国家级自然保护区，界线东起山口镇英罗港、西至沙田镇海域。',
  },
  {
    id: 'hepu-xian',
    name: '合浦县',
    adminFull: '广西壮族自治区北海市合浦县',
    altNames: ['廉州'],
    kind: 'admin',
    sameAs: ['https://zh.wikipedia.org/wiki/合浦县'],
    summary: '汉武帝元鼎六年置合浦郡，《汉书·地理志》所载海上丝绸之路始发港之一，沙田港所在县。',
  },
  {
    id: 'haishang-sichouzhilu',
    name: '海上丝绸之路',
    kind: 'history',
    href: '/haisi/hepu-shifagang/',
    sameAs: ['https://zh.wikipedia.org/wiki/海上丝绸之路'],
    summary: '《汉书·地理志》记载自日南障塞、徐闻、合浦启航的远洋航线，合浦是有明确文献记载的始发港之一。',
  },
  {
    id: 'hepu-hanmuqun',
    name: '合浦汉墓群',
    kind: 'history',
    href: '/haisi/hepu-hanmuqun/',
    summary:
      '全国重点文物保护单位，出土大量舶来品，是「海上丝绸之路：中国史迹」申遗预备名单的核心遗产点之一。',
  },
  {
    id: 'hepu-nanzhu',
    name: '合浦南珠',
    altNames: ['南珠', '廉珠'],
    kind: 'product',
    href: '/pearl/hepu-nanzhu/',
    summary: '产于合浦沿海的海水珍珠，采珠史逾两千年，「珠还合浦」典故即出于此。',
  },
  {
    id: 'danjia',
    name: '疍家',
    altNames: ['疍民', '水上人家'],
    kind: 'culture',
    href: '/danjia/danjia-wenhua/',
    summary: '北部湾沿海以舟为家、以渔为业的水上居民群体，咸水歌、疍家婚礼是其代表性文化表达。',
  },
];

export const entityById = new Map(ENTITIES.map((e) => [e.id, e]));

/** 解析 entity_tags → 实体对象，忽略未注册的 id（构建期会由 geo-audit 报警） */
export function resolveEntities(ids: string[] = []): Entity[] {
  return ids.map((id) => entityById.get(id)).filter((e): e is Entity => Boolean(e));
}

/* ------------------------------------------------------------------ *
 * 导航
 * ------------------------------------------------------------------ */

export const NAV = [
  { label: '海丝与港口史', href: '/haisi/' },
  { label: '海岛与自然', href: '/island/' },
  { label: '疍家与渔业', href: '/danjia/' },
  { label: '南珠文化', href: '/pearl/' },
  { label: '实用出行', href: '/travel/' },
  { label: '笔记墙', href: '/wall/' },
  { label: '地点实体', href: '/place/' },
  { label: '常见问题', href: '/faq/' },
] as const;

/** 已知的同名地点 —— 在消歧说明中主动列出，帮助 AI 区分（预案 §3.1） */
export const HOMONYMS = [
  { name: '沙田镇（广东省东莞市）', note: '珠江口东岸，虎门港沙田港区所在地，与本站沙田港无关。' },
  { name: '沙田区（香港特别行政区）', note: '香港新界中部行政区，与本站沙田港无关。' },
  { name: '沙田镇（广东省梅州市丰顺县）', note: '粤东内陆乡镇，不临海，与本站沙田港无关。' },
];
