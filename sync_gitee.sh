#!/usr/bin/env bash
# 把本仓库同步到 Gitee，用于「大陆访问更稳定」的 Gitee Pages 部署。
#
# 前置条件：
#   1. 在 Gitee（https://gitee.com）上创建同名空仓库（如 lxxyyy29/lxxyyy29）。
#   2. 配置好 Gitee 的 SSH 公钥，或用 Gitee 私人令牌走 HTTPS。
#
# 用法（默认仓库名同 GitHub）：
#   bash sync_gitee.sh
# 或显式指定：
#   GITEE_OWNER=你的用户名 GITEE_REPO=仓库名 bash sync_gitee.sh
#
# 说明：GitHub Pages 分支是 main，而 Gitee Pages 只认 master / gh-pages，
#       因此这里把 main 强制推送到 Gitee 的 master 分支。
set -e

OWNER="${GITEE_OWNER:-lxxyyy29}"
REPO="${GITEE_REPO:-lxxyyy29}"

cd "$(dirname "$0")"

git remote remove gitee 2>/dev/null || true
git remote add gitee "https://gitee.com/${OWNER}/${REPO}.git"

echo "→ 推送 main → gitee:master ..."
git push gitee main:master --force

echo "✅ 已推送到 Gitee。"
echo "下一步：进入 Gitee 仓库「服务 → Gitee Pages」，选择 master 分支、部署目录 / ，点击「启动」。"
echo "（如需自定义域名 / CDN，见仓库 README 的「大陆稳定访问」一节。）"
