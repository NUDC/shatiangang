# 部署

借鉴 `wego-stockquant/ops` 的做法，按这个项目的实际形状裁剪过。

## 一条命令发布

```bash
SITE_URL=http://114.55.135.237 \
BASE_PATH=/shatian/ \
SHATIAN_WEB_PORT=8092 \
ops/publish-release.sh
```

本地构建 → 打包（含 sha256）→ scp → 服务器建镜像 → compose 起容器 → 健康检查 → 失败自动回滚。

---

## 链路全貌

```
 浏览器
   │  http://114.55.135.237/shatian/...
   ▼
┌─────────────────────────────────────────────┐
│ 公网机 114.55.135.237（hostname: wego）      │
│                                             │
│  :80  wego-gateway 容器                      │
│        gateway.toml 路由表（顺序即优先级）     │
│          /miniapps → /srv/static            │
│          /manager  → wego-manager           │
│          /games    → wego-user              │
│          /quant    → 172.18.0.1:18088       │
│          /shatian  → 172.18.0.1:18089  ★    │
│          /         → wego-site（兜底，必须最后）│
│                                             │
│  :7400 frps                                 │
│        proxyBindAddr = 172.18.0.1           │
│          └ 穿出来的端口只绑 docker 网桥，       │
│            公网不可达，必须经网关              │
│        allowPorts = [18088, 18089]          │
│          └ 只有这两个口能被穿出来              │
└─────────────────────────────────────────────┘
                     ▲
                     │ frp 隧道（内网机主动外连）
                     │
┌─────────────────────────────────────────────┐
│ 内网机 192.168.64.201（hostname: ubuntuvm）  │
│                                             │
│  frpc  /etc/frp/frpc.toml                   │
│    quant-web    127.0.0.1:8088 → :18088     │
│    shatian-web  127.0.0.1:8092 → :18089  ★  │
│  管理面 http://192.168.64.201:7400/static/   │
│    （只绑内网网卡，不走公网）                   │
│                                             │
│  容器端口占用：                                │
│    8088  quant-web                          │
│    8090  quant-api        ← 本站不能用        │
│    8091  quant-collector                    │
│    8092  shatian-web  ★                     │
│    5432  postgres / 6379 redis              │
└─────────────────────────────────────────────┘
```

**为什么本站是 8092 而不是 8090**：8090 被 `quant-api` 占着，且该服务在跑（`/health` 正常）。
`ops/deploy-release.sh` 在动容器之前会做端口预检，撞了直接报错退出，不会把站点停在半路。

---

## 前缀只加一次

站点挂在 `/shatian` 下，前缀在**三个地方各出现一次，且互不重复**：

| 环节 | 做什么 | 在哪 |
|---|---|---|
| 构建 | `base: '/shatian/'` 编进产物里的每个 URL | `astro.config.mjs` |
| 网关 | **原样转发，不剥前缀** | `gateway.toml` `strip_prefix = false` |
| 容器 | `rewrite ^/shatian/(.*)$ /$1 last` 剥掉再找文件 | `ops/nginx.conf` |

**base 不改变 dist 的目录结构** —— 产物仍是 `dist/place/xxx/index.html`，没有 `shatian` 这一层。
所以必须由 nginx 剥，而网关不能再剥一次。

quant 踩过的坑：网关开着 `strip_prefix` 时，同一个前缀被加一次剥两次，
而且局域网直连与经网关是**两条形状不同的路径**，测试覆盖不到真正跑的那条。

站内链接不硬编码前缀，统一走 `src/lib/url.ts`：

- `.astro` 里用 `href('/place/xxx/')`
- Markdown 正文里照常写 `](/place/xxx/)`，由 `astro.config.mjs` 的 rehype 插件编译期改写
- canonical / JSON-LD `@id` / `llms.txt` 走 `absUrl()` 与 `BASE`

换成独立域名时：`BASE_PATH=/ ops/build-release.sh`，全部自动回到根形式，业务代码一行不改。

---

## 三个踩过的坑

**1. Astro 的 `redirects` 不给 destination 补 base。**
source 是逻辑路由（产物落在 `dist/shatian-yugang/`），destination 却被原样写进 meta refresh。
不手动补前缀的话，5 条别称 301 全跳到不存在的地址，而且**页面本身完全正常**，
只有真点了别称链接的人会掉进 404。`scripts/geo-audit.mjs` 现在会专门查这一项。

**2. Git Bash 会把 `BASE_PATH=/shatian/` 转成 `D:/Program Files/Git/shatian/`。**
MSYS 的路径自动转换。Astro 报的是 `UnsupportedExternalRedirect`，一个看不出与 Windows 有关的错。
`ops/build-release.sh` 里 `export MSYS_NO_PATHCONV=1`，`astro.config.mjs` 里还有一道带盘符的拦截。

**3. nginx 的 301 默认用自己的 `listen` 端口拼绝对地址。**
容器内监听 8090、映射到宿主 8092，访问 `/shatian` 时默认会跳到 `:8090` —— 一个打不开的端口。
`absolute_redirect off` 解决，quant 那边同样踩过。

---

## robots.txt 的已知限制

**爬虫只读源站根路径的 `/robots.txt`。** 本站挂在 `/shatian/` 下，
`http://114.55.135.237/robots.txt` 是公益官网 `wego-site` 的，不是本站的；
本站那份在 `/shatian/robots.txt`，爬虫不会去看，**里面的规则实际不生效**。

这不是配置错误，是子路径托管的固有限制。当前的对策：

- `robots.txt` 里首段显式写明了这个情况，不让它静静地不起作用；
- sitemap **直接提交到搜索资源平台**，不依赖 robots.txt 里的 `Sitemap:` 行；
- `llms.txt` / `entities.json` 通过每个页面 `<head>` 里的 `<link rel="alternate">` 暴露，不依赖根路径约定。

**根治办法只有一个：独立域名。** 到时 `BASE_PATH=/` 重新构建，
这份 robots.txt 自动落到根路径并开始生效。在那之前，本站的 SEO 上限就卡在这里。

---

## 常用操作

```bash
# 只重新发布（内容改了）
SITE_URL=http://114.55.135.237 BASE_PATH=/shatian/ SHATIAN_WEB_PORT=8092 ops/publish-release.sh

# 本地打包不发布
SITE_URL=http://114.55.135.237 BASE_PATH=/shatian/ ops/build-release.sh

# 看隧道状态（内网机上，或局域网内浏览器打开）
curl -s http://192.168.64.201:7400/api/status

# 看网关有没有读到路由
ssh root@114.55.135.237 "docker logs --tail 20 <gateway容器> | grep 'route reloaded'"

# 回滚：重新部署上一代发布包（服务器上保留最近 3 代）
ssh root@192.168.64.201 "ls -1t /opt/shatian-releases/*.tar.gz"
```

改配置的位置：

| 改什么 | 文件 | 生效方式 |
|---|---|---|
| 隧道 | 内网机 `/etc/frp/frpc.toml` | `systemctl reload frpc` |
| 公网路由 | 公网机 `/opt/wego-gateway/gateway.toml` | 存盘即可，网关几秒自读 |
| 站点配置 | 本仓库 `ops/nginx.conf` | 重新发布（配置进摘要，会出新镜像） |

两处服务器配置改动前都会留 `.bak.<时间戳>`。

---
