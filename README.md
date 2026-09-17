# 北部湾沙田港

广西壮族自治区北海市合浦县沙田镇沙田港的文旅资料站点。
基于《北部湾沙田港 · 内容填充预案 v1.0》实现，**SEO / AEO / GEO 三优化**，纯静态输出。

---

## 快速开始

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # 产物在 dist/
npm run preview      # 本地预览构建产物
npm run audit:geo    # GEO 自检报告（需先 build）
```

---

## 三类优化分别落在哪里

| 目标 | 做法 | 代码位置 |
|---|---|---|
| **SEO** | canonical 绝对 URL、OG/Twitter 卡片、hreflang、geo meta、语义化标题层级、sitemap、RSS、301 别称重定向 | `src/components/BaseHead.astro`、`astro.config.mjs` |
| **AEO** | 每页首屏「直答块」（语义自足、带更新时间）、FAQPage 标注、Speakable 标注、稳定锚点便于深链 | `src/components/AnswerCard.astro`、`src/pages/faq/index.astro` |
| **GEO** | 实体 `@id` 全站唯一且复用、`@graph` 汇总标注、`sameAs` 实体对齐、`/entities.json` 数据集、`llms.txt` / `llms-full.txt`、内链实体图谱、来源标注 | `src/lib/schema.ts`、`src/data/site.ts`、`src/pages/entities*` |

### GEO 的关键设计：稳定实体标识

全站所有结构化数据引用同一实体时，用的都是同一个 `@id`：

```
https://<域名>/entities/#shatian-gang
```

`/entities/` 页面真实存在，并为每个实体渲染带对应 `id` 的可见区块 ——
标注与页面内容一致，是结构化数据不被判为垃圾标记的前提。

### 「待核实」机制

本站与多数文旅站最大的区别。无法核实的字段（坐标、班次、统计数字）：

1. 在 frontmatter 的 `unverified[]` 中登记，说明原因与核实途径；
2. 页面渲染为醒目的核实提示条；
3. **不写入 JSON-LD** —— `src/lib/schema.ts` 的 `place()` 在坐标为 `null` 时整个 `geo` 字段不输出；
4. `entities.json` 输出 `verification: "unverified"` 状态，让消费方明确知道「这里没有数据」而非「这里是 0」。

---

## 目录结构

```
src/
├── content.config.ts     # 字段标准化 + 强制规则（zod，校验失败即构建失败）
├── content/
│   ├── topics/           # 6 个一级主题
│   ├── articles/         # 二级专题正文
│   ├── places/           # 地点实体页（GEO 引用的最小单位）
│   ├── faqs.json         # FAQ 条目（AEO 主力）
│   └── legal/            # 4 份法律文本
├── data/site.ts          # 站点常量 + 实体注册表（唯一真相源）
├── lib/
│   ├── schema.ts         # JSON-LD 构造器
│   └── content.ts        # 查询层：过滤草稿、双排序、引用关系图谱
├── components/           # BaseHead / AnswerCard / FactSheet / VerifyNotice …
├── layouts/Base.astro
├── pages/
│   ├── index.astro
│   ├── [topic]/          # 主题页 + 专题页
│   ├── place/            # 实体索引 + 实体页
│   ├── faq/ entities/ about contribute legal/
│   ├── entities.json.ts  # 机器可读实体数据集
│   ├── llms.txt.ts  llms-full.txt.ts  robots.txt.ts  rss.xml.ts
│   └── 404.astro
└── styles/global.css     # 设计系统（明暗双主题，无 JS）
scripts/geo-audit.mjs     # 预案 §8 指标的自动巡检
```

---

## 内容规则（构建期强制）

`src/content.config.ts` 把预案第 2 章的字段规则做成了 zod 校验，**违反即构建失败**：

- `license_status = 待确认` 的内容必须 `draft: true`，不得发布；
- `source_platform = 授权投稿` 必须填 `original_url` 回链；
- `source_platform` 为 官方 / 公开索引整理 / 开放API 时，必须至少一条 `citations`；
- `updated_at` 不得早于 `published_at`。

合规不靠自觉，靠 build 报错。

---

## 上线前必做

- [ ] **改域名** —— `astro.config.mjs` 的 `SITE`，或设环境变量 `SITE_URL`。canonical / sitemap / 实体 `@id` 全从这里派生，用错域名会让所有结构化数据失效。
- [x] **填 ICP 备案号** —— `src/data/site.ts` 的 `SITE.icp` = `桂ICP备2026018295号-1`。
- [ ] **填真实联系方式** —— `SITE.author.email`，投稿通道依赖它。
- [ ] **导出 OG 图 PNG** —— 现为 `public/og-default.svg`，微信 / X 不渲染 SVG 格式的 OG 图。导出 1200×630 PNG 后改 `src/components/BaseHead.astro` 的 `image` 默认值。
- [ ] **补 apple-touch-icon.png**（180×180），并放开 `BaseHead.astro` 中注释掉的那行。
- [ ] **logo 转 PNG** —— `src/lib/schema.ts` 的 `publisher()` 引用 `/logo.svg`，Google 的 Organization logo 更认栅格图。
- [ ] 提交 sitemap 到 Google Search Console / 百度站长平台 / Bing。

## 部署

**托管在 GitHub Pages,纯静态,无后端、无数据库。**

推送到 `main` → GitHub Actions 自动构建并发布(见 `.github/workflows/pages.yml`)。
首次需在仓库 `Settings → Pages → Source` 选 **GitHub Actions**。

| | 地址 |
|---|---|
| 主站(GitHub Pages) | `https://nudc.github.io/shatiangang/` |
| 网关短链 | `http://114.55.135.237/shatiangang/` → 302 跳转到主站 |

- **`BASE_PATH=/shatiangang/`** —— 项目站点挂在 `/<仓库名>/` 下。站内链接经
  `src/lib/url.ts` 从这个 base 自动派生,换挂载点只改这一个环境变量。
- **高德地图用明文 `securityJsCode`** —— 纯静态无服务端可藏密钥。安全性靠高德控制台
  的**域名白名单**:上线前把 `nudc.github.io` 加进 key 的白名单。
- 网关短链只是一个 nginx 302,本身不托管内容(边缘网关无法反代外部 https,
  只能跳转)。

## 内容维护

复核周期（与预案 §6.2 一致，页面上也公开承诺了）：

| 内容类型 | 周期 | 过期处理 |
|---|---|---|
| 实用出行 | 3 个月 | 标「待核实」并从结构化数据移除 |
| 地点实体 | 6 个月 | 复核坐标与属性 |
| 历史文化 | 12 个月 | 有新研究则更新 |
| 授权投稿 | 12 个月 | 联系作者确认 |

新增一个地点实体页的步骤：

1. 在 `src/data/site.ts` 的 `ENTITIES` 注册实体（id、别称、canonical href）；
2. 在 `src/content/places/` 新建 `<id>.md`，`entity_tags` 带上该 id；
3. 坐标无可靠来源就留 `null` 并在 `unverified` 登记 —— **不要填推测值**；
4. `npm run build && npm run audit:geo` 确认指标仍然达标。

---

## 当前已核实与未核实

**已核实（有官方出处，可直接引用）**

- 沙田港为国家一级渔港，工程参数依据农业部农办渔〔2005〕44 号批复（2005-11-23）
- 沙田镇辖 1 社区 5 村，距合浦县城约 92 公里
- 山口红树林国家级自然保护区总面积约 8000 公顷，英罗港 / 丹兜海两片区
- 合浦儒艮国家级自然保护区 35000 公顷，海岸线 43 公里，中国唯一

**未核实（页面已显式标注，勿作事实引用）**

- 沙田港经纬度坐标、现有泊位构成、年吞吐量
- 沙田镇辖区面积与海岸线长度（公开资料存在两组冲突数据）
- 渔船数量、班车时刻、住宿餐饮、保护区进入规则

补齐这些是内容层下一阶段的主要工作，清单在 `/contribute/` 页面自动汇总。
