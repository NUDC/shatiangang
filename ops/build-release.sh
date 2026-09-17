#!/usr/bin/env bash
# =============================================================================
# 打发布包
# =============================================================================
#
# 在**开发机**上运行（Windows 的 Git Bash 也可以）。与 wego-stockquant 不同，
# 这个项目没有需要交叉编译的原生二进制 —— 产物就是 astro build 出来的静态目录，
# 在哪台机器上构建都一样。所以构建留在开发机，服务器侧完全不需要 Node。
#
# 产出：dist-release/shatian-release-<时间戳>-<摘要>.tar.gz 及其 .sha256
#
# 包内结构（自包含，服务器侧只做 docker build）：
#   dist/                 astro 构建产物
#   nginx.conf            站点配置
#   images/web/Dockerfile 镜像定义
#   compose.yaml          运行编排
#   tags.env              镜像标签 = dist 的内容摘要
#
# 用法：
#   ops/build-release.sh
#   SITE_URL=https://www.shatiangang.cn ops/build-release.sh
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Windows 的 Git Bash（MSYS）会把「看起来像 Unix 路径」的值自动转成 Windows 路径。
# `BASE_PATH=/shatian/` 传到 node 里会变成 `D:/Program Files/Git/shatian/`，
# 然后 Astro 报 UnsupportedExternalRedirect —— 一个完全看不出与 Windows 有关的错。
#
# 这两个开关关掉转换。Linux / macOS 上它们无害。
# ---------------------------------------------------------------------------
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

log()  { echo "[打包] $1" >&2; }
die()  { echo "[错误] $1" >&2; exit 1; }

command -v node >/dev/null || die "没有 node"
test -d node_modules || die "node_modules 不存在，先执行 npm install"

# ---------------------------------------------------------------------------
# SITE_URL 决定 canonical、sitemap、JSON-LD 的 @id 与 llms.txt 里的每一条 URL。
# **构建时定死，事后改不了** —— 它被编进了产物的每一个页面。
#
# 这一条比 quant 那边的任何配置都更要紧：域名写错不会让站点打不开，
# 只会让全站的结构化数据指向一个不存在的地方，而且看起来一切正常。
# 所以这里不给「随便填一个也能跑」的默认值，而是必须显式确认。
# ---------------------------------------------------------------------------
site_url="${SITE_URL:-}"
if [[ -z "$site_url" ]]; then
    die "必须指定 SITE_URL（决定 canonical / sitemap / JSON-LD @id，构建后改不了）
     例：SITE_URL=https://www.shatiangang.cn ops/build-release.sh
     内网自测可用：SITE_URL=http://192.168.64.201:8092 ops/build-release.sh"
fi
case "$site_url" in
    http://*|https://*) ;;
    *) die "SITE_URL 必须带协议头：$site_url" ;;
esac
site_url="${site_url%/}"

# 挂载路径。公网入口是网关的 /shatian 前缀（根路径被公益官网占着）。
# 有了独立域名后改成 BASE_PATH=/ 重新构建即可，站内链接全部自动回到根形式。
base_path="${BASE_PATH:-/shatian/}"
case "$base_path" in
    /*) ;;
    *) die "BASE_PATH 必须以 / 开头：$base_path" ;;
esac
[[ "$base_path" == */ ]] || base_path="$base_path/"

log "构建静态产物（SITE_URL=$site_url，BASE_PATH=$base_path）"
rm -rf dist
SITE_URL="$site_url" BASE_PATH="$base_path" npm run build >&2

test -f dist/index.html    || die "构建没有产出 dist/index.html"
test -f dist/entities.json || die "构建没有产出 dist/entities.json"
test -f dist/llms.txt      || die "构建没有产出 dist/llms.txt"
test -f dist/robots.txt    || die "构建没有产出 dist/robots.txt"

# 产物里的 canonical 必须真的是这个域名 + 这个挂载路径。构建脚本传对了但
# astro.config 没读到，是一类只会在上线后才被发现的错 —— 在这里拦下来。
grep -q "rel=\"canonical\" href=\"$site_url$base_path\"" dist/index.html \
    || die "首页 canonical 不是 $site_url$base_path，SITE_URL / BASE_PATH 没有生效"

log "跑 GEO 自检（含死链与别称重定向的前缀校验）"
BASE_PATH="$base_path" npm run audit:geo >&2 || die "GEO 自检未通过，不打包"

# ---------------------------------------------------------------------------
# 镜像标签 = 内容摘要。
# 与 quant 同一个思路：内容没变标签就不变，compose 看到同一个 image 引用
# 就不重建容器 —— 重复发布同一份内容不会造成一次无意义的重启。
#
# 摘要覆盖 dist 全部文件 + nginx.conf：配置改了同样要出新镜像。
# ---------------------------------------------------------------------------
digest="$(
  {
    find dist -type f -print0 | sort -z | xargs -0 sha256sum
    sha256sum ops/nginx.conf
    # 挂载路径已经编进了产物的每一个 URL，必须进摘要：
    # 否则同一份内容按不同 base 构建会算出同一个标签，部署时被当成"内容未变"跳过
    printf '%s' "$base_path"
  } | sha256sum | cut -c1-12
)"

stamp="$(date -u +%Y%m%d%H%M%S)"
release_name="shatian-release-${stamp}-${digest}"
stage="dist-release/$release_name"

rm -rf "$stage"
mkdir -p "$stage/images/web"

cp -r dist "$stage/dist"
cp ops/nginx.conf "$stage/nginx.conf"
cp ops/images/web/Dockerfile "$stage/images/web/Dockerfile"
cp ops/compose.yaml "$stage/compose.yaml"

cat > "$stage/tags.env" <<EOF
# 由 ops/build-release.sh 生成。标签 = dist + nginx.conf 的内容摘要。
SHATIAN_WEB_VERSION=$digest
EOF

# 记下这份产物是按哪个域名构建的。部署脚本会核对，避免把内网自测包发到生产。
cat > "$stage/build.env" <<EOF
SITE_URL=$site_url
BASE_PATH=$base_path
BUILT_AT=$stamp
EOF

archive="dist-release/$release_name.tar.gz"
tar -czf "$archive" -C dist-release "$release_name"
rm -rf "$stage"

(cd dist-release && sha256sum "$release_name.tar.gz" > "$release_name.tar.gz.sha256")

log "产物 $archive（摘要 $digest，域名 $site_url，挂载 $base_path）"
# 只有这一行走 stdout：调用方用命令替换捕获包路径，日志混进去会毁掉它
echo "$archive"
