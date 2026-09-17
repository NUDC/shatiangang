#!/usr/bin/env bash
# =============================================================================
# 发布到远端
# =============================================================================
#
# 一条命令走完：本地构建发布包 → scp 到服务器 → 在服务器上部署。
#
# **与 wego-stockquant 的关键差别：构建在本地做，不在服务器上做。**
# quant 的产物是 glibc 的 Linux 二进制，Windows 开发机交叉编译不了，所以
# 那边把源码同步过去在服务器上编。这个项目的产物是静态文件，在哪台机器上
# 构建结果都一样——那就没有理由把源码搬到服务器，也没有理由让服务器装 Node。
#
# 也因此这里**不同步源码**：服务器上只有发布包，没有这个项目的工作副本。
#
# 用法：
#   SITE_URL=https://www.shatiangang.cn SHATIAN_WEB_PORT=8092 ops/publish-release.sh
#   SHATIAN_DEPLOY_HOST=root@1.2.3.4 ... ops/publish-release.sh
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

host="${SHATIAN_DEPLOY_HOST:-root@192.168.64.201}"
remote_releases="${SHATIAN_RELEASE_ROOT:-/opt/shatian-releases}"
web_port="${SHATIAN_WEB_PORT:?必须指定宿主端口（192.168.64.201 的 8090 被 quant-api 占用）}"

log() { echo "[发布] $1"; }
ssh_run() { ssh -o BatchMode=yes -o StrictHostKeyChecking=no "$host" "$@"; }

# SITE_URL 由 build-release.sh 强制校验，这里不重复检查，只是把它透传下去
archive="$(SITE_URL="${SITE_URL:-}" bash ops/build-release.sh)"
archive_name="$(basename "$archive")"

log "上传 $archive_name 到 $host:$remote_releases"
ssh_run "mkdir -p '$remote_releases'"
# scp 而不是 tar over ssh：这里只有一个文件，而且要连 .sha256 一起传，
# 服务器侧的校验才有意义
scp -o BatchMode=yes -o StrictHostKeyChecking=no \
    "$archive" "$archive.sha256" "$host:$remote_releases/"

# 部署脚本随包一起走：服务器上没有这个项目的源码，脚本不能从工作副本里找
log "上传部署脚本"
scp -o BatchMode=yes -o StrictHostKeyChecking=no \
    ops/deploy-release.sh "$host:$remote_releases/deploy-release.sh"

log "在服务器上部署（宿主端口 $web_port）"
ssh_run "
set -Eeuo pipefail
chmod +x '$remote_releases/deploy-release.sh'
SHATIAN_WEB_PORT='$web_port' \
SHATIAN_RELEASE_ROOT='$remote_releases' \
${SHATIAN_REQUIRE_SITE_URL:+SHATIAN_REQUIRE_SITE_URL='$SHATIAN_REQUIRE_SITE_URL'} \
bash '$remote_releases/deploy-release.sh' '$remote_releases/$archive_name'
"

log "完成。局域网访问 http://${host#*@}:$web_port/"
