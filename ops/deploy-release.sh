#!/usr/bin/env bash
# =============================================================================
# 部署发布包
# =============================================================================
#
# 在服务器上运行。校验发布包 → 构建镜像 → compose 起容器 → 健康检查，
# **失败自动回滚到容器原来的标签**。
#
# 沿用 wego-stockquant/ops/deploy-release.sh 的几条硬规矩：
#
#   1. 动线上容器之前把能查的都查完。端口被占、镜像建不出来、包坏了——
#      这些都在 compose 之前拦下，那时候什么都还没动。
#   2. 回滚回到「这次动手之前容器实际在跑的标签」，而不是某个版本号。
#   3. 健康检查的 curl 一律带超时。curl 默认没有超时，容器换代那一刻发出的
#      请求可能卡在半开连接上——"重试 N 次"在没有单次超时时是假的上界。
#
# 比 quant 那份少掉的东西，都是这个项目真的没有：没有数据库连接串要校验、
# 没有迁移要等、没有多组件各自独立的标签。健康检查的重试窗口也因此短得多——
# nginx 起来就是起来了，不存在"迁移跑完才监听"那种几十秒的正常延迟。
#
# 用法：
#   ops/deploy-release.sh /opt/shatian-releases/shatian-release-xxx.tar.gz
set -Eeuo pipefail

archive_path="${1:?用法: deploy-release.sh <发布包>}"
release_root="${SHATIAN_RELEASE_ROOT:-/opt/shatian-releases}"
image_prefix="${SHATIAN_IMAGE_PREFIX:-wego}"
web_port="${SHATIAN_WEB_PORT:?必须显式指定宿主端口（这台机器 8090 被 quant-api 占用）}"
container_name="shatian-web"

log() { echo "[部署] $1"; }
die() { echo "[错误] $1" >&2; exit 1; }

archive_path="$(readlink -f "$archive_path")"
test -f "$archive_path" || die "发布包不存在：$archive_path"
test -f "$archive_path.sha256" || die "缺少校验文件：$archive_path.sha256"

log "校验发布包"
(cd "$(dirname "$archive_path")" && sha256sum --check "$(basename "$archive_path").sha256")

release_name="$(basename "$archive_path" .tar.gz)"
release_dir="$release_root/$release_name"
mkdir -p "$release_root"
rm -rf -- "$release_dir"
tar -xzf "$archive_path" -C "$release_root"

test -f "$release_dir/tags.env"             || die "发布包缺少 tags.env"
test -f "$release_dir/build.env"            || die "发布包缺少 build.env"
test -f "$release_dir/compose.yaml"         || die "发布包缺少 compose.yaml"
test -f "$release_dir/nginx.conf"  || die "发布包缺少 nginx.conf"
test -f "$release_dir/images/web/Dockerfile" || die "发布包缺少 Dockerfile"
test -f "$release_dir/dist/index.html"      || die "发布包缺少 dist/index.html"

compose_file="$release_dir/compose.yaml"

set -a
# shellcheck source=/dev/null
. "$release_dir/tags.env"
# shellcheck source=/dev/null
. "$release_dir/build.env"
set +a

: "${SHATIAN_WEB_VERSION:?tags.env 里缺少 SHATIAN_WEB_VERSION}"

# 产物里的域名已经被编进了每一个页面的 canonical 与 JSON-LD。部署时把它打出来，
# 是为了让"把内网自测包发到生产"这种事在日志里一眼可见，而不是上线三天后
# 才有人发现 sitemap 指向 192.168.64.201。
log "发布包构建域名：${SITE_URL:-未记录}"
if [[ "${SHATIAN_REQUIRE_SITE_URL:-}" != "" && "${SITE_URL:-}" != "$SHATIAN_REQUIRE_SITE_URL" ]]; then
    die "发布包域名是 ${SITE_URL:-未记录}，与要求的 $SHATIAN_REQUIRE_SITE_URL 不符"
fi

command -v docker >/dev/null || die "服务器上没有 docker"
docker compose version >/dev/null 2>&1 || die "docker compose 插件不可用"

# ---------------------------------------------------------------------------
# 端口占用预检。**在动容器之前做。**
#
# 这台机器上 8088/8090/8091 分别是 quant-web / quant-api / quant-collector。
# 不预检的话，docker 会在 compose up 阶段才报 bind 失败——那时旧容器已经被停掉，
# 站点是断的，而失败原因是一句不容易读的 docker 报错。
#
# 排除自己正在占用的情况：重新部署时本容器当然占着这个端口。
# ---------------------------------------------------------------------------
if command -v ss >/dev/null; then
    port_user="$(ss -lntpH "sport = :$web_port" 2>/dev/null || true)"
    if [[ -n "$port_user" ]]; then
        own="$(docker port "$container_name" 2>/dev/null | grep -c ":$web_port\$" || true)"
        if [[ "$own" == "0" ]]; then
            die "宿主端口 $web_port 已被占用，且不是 $container_name：
     $port_user
     当前什么都还没动。换一个 SHATIAN_WEB_PORT 重试。"
        fi
    fi
fi

# 回滚要回到「这次动手之前容器实际在跑的那个标签」
previous_tag="$(docker inspect -f '{{.Config.Image}}' "$container_name" 2>/dev/null | awk -F: '{print $NF}' || true)"
[[ -n "$previous_tag" ]] || log "当前没有在跑的容器，健康检查失败时无处可回滚"

# 先把镜像建完再动容器：构建失败不该让站点停在半路
image_ref="$image_prefix/shatian-web:$SHATIAN_WEB_VERSION"
if docker image inspect "$image_ref" >/dev/null 2>&1; then
    # 标签已存在 = 内容与上次发布一模一样，跳过构建，容器也不会被重建
    log "内容未变（$SHATIAN_WEB_VERSION），复用现有镜像"
    reused=true
else
    log "构建 $image_ref"
    docker build --tag "$image_ref" --file "$release_dir/images/web/Dockerfile" "$release_dir"
    reused=false
fi

compose() {
    SHATIAN_IMAGE_PREFIX="$image_prefix" \
    SHATIAN_WEB_PORT="$web_port" \
    SHATIAN_WEB_VERSION="$SHATIAN_WEB_VERSION" \
    docker compose --file "$compose_file" up --detach --remove-orphans
}

rollback() {
    echo "[部署] 健康检查未通过，回滚" >&2
    if [[ -z "$previous_tag" ]]; then
        docker compose --file "$compose_file" down >/dev/null 2>&1 || true
        return
    fi
    SHATIAN_WEB_VERSION="$previous_tag" compose >/dev/null 2>&1 || true
}

# 同名但不是这个 compose 项目建的容器，compose 不会接管，只会因为重名失败
compose_project="$(awk '/^name:/ {print $2; exit}' "$compose_file" | sed 's/\${[^}]*:-\([^}]*\)}/\1/')"
if [[ -n "$(docker ps -aq --filter "name=^${container_name}$")" ]]; then
    managed="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$container_name" 2>/dev/null || true)"
    if [[ "$managed" != "$compose_project" ]]; then
        log "替换非本编排管理的同名容器 $container_name"
        docker rm -f "$container_name" >/dev/null
    fi
fi

trap rollback ERR
compose >/dev/null

# ---------------------------------------------------------------------------
# 健康检查。
#
# **每一条都探真实内容，不探 /。** nginx 返回 200 只说明它活着，说明不了
# dist 完整——镜像里 COPY 漏了目录、构建产出残缺，首页照样能打开。
# 这几条各代表一类产物：页面树、实体页、结构化数据、爬虫入口。
# 少验哪一条，对应那类产物整体缺失也能一路部署成功，等搜索引擎来发现。
#
# 重试 30 次 × 1 秒 = 30 秒。nginx 冷启在百毫秒级，不存在 quant 那种
# "迁移跑完才监听"的正常长延迟，窗口不需要留到三分钟。
# ---------------------------------------------------------------------------
#
# **按挂载前缀探，不按裸路径探。** 产物里的链接全是 /shatian/xxx 形式，
# 真正被访问的也是那一条；裸路径能通只说明文件在，说明不了 nginx 的
# rewrite ^/shatian/ 写对了。quant 那边「局域网测的和生产跑的不是同一条路径」
# 的教训，就出在健康检查探的不是真正被访问的那条上。
base_prefix="${BASE_PATH:-/}"
base_prefix="${base_prefix%/}"

health_paths=(
    "/healthz"
    "$base_prefix/"
    "$base_prefix/place/shatian-gang/"
    "$base_prefix/entities.json"
    "$base_prefix/llms.txt"
    "$base_prefix/sitemap-index.xml"
)

curl_check() {
    curl --fail --silent --connect-timeout 3 --max-time 8 \
        "http://127.0.0.1:$web_port$1" >/dev/null
}

healthy=false
for _ in {1..30}; do
    ok=true
    for p in "${health_paths[@]}"; do curl_check "$p" || { ok=false; break; }; done
    [[ "$ok" == true ]] && { healthy=true; break; }
    sleep 1
done
if [[ "$healthy" != true ]]; then
    # 回滚前先说清是哪条没通，否则只看到"健康检查失败"还得再上机器查一遍
    for p in "${health_paths[@]}"; do curl_check "$p" || echo "[错误] 健康检查未通过：$p" >&2; done
    docker compose --file "$compose_file" ps >&2 || true
fi
[[ "$healthy" == true ]]
trap - ERR

# 只保留最近几代发布目录，够回滚就行。健康检查过了才清——早清就没得可回
keep="${SHATIAN_RELEASE_KEEP:-3}"
mapfile -t old < <(ls -1dt "$release_root"/shatian-release-* 2>/dev/null | grep -v '\.tar\.gz' | tail -n "+$((keep + 1))")
if ((${#old[@]})); then rm -rf -- "${old[@]}"; fi
mapfile -t old_tar < <(ls -1t "$release_root"/shatian-release-*.tar.gz 2>/dev/null | tail -n "+$((keep + 1))")
if ((${#old_tar[@]})); then rm -f -- "${old_tar[@]}" "${old_tar[@]/%/.sha256}"; fi

if [[ "$reused" == true ]]; then
    log "部署完成：内容未变，容器未重建"
else
    log "部署完成：镜像 $image_ref"
fi
log "本机访问 http://127.0.0.1:$web_port/"
