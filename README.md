# 知识库 · 单文件可切换知识库站点

一个**纯静态、单文件、可离线打开**的知识库网站。支持多知识库切换、侧边导航、全文搜索、学习计划、闪卡速记、艾宾浩斯复习、暗色模式，并内置 Monaco 代码编辑器与「AI 学习助手」。数据全部保存在浏览器 `localStorage`，无需后端。

> 本仓库（`lxxyyy29.github.io`）既存放构建产物（`index.html` / `知识库.html`），也**自带可构建源码**：`build_kb.py`、`kb_template.html`、`kb_app.js`、`frag_*.html`、`src_long.html`。因此可直接由 GitHub Actions 自动构建并部署，无需本地先行构建（见下文「自动部署」）。IDEA 级补全后端 `lsp-bridge/` 在本地 WorkBuddy 工程中，为可选组件。

---

## 在线访问

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| **CloudStudio 线上站（当前唯一维护）** | https://1c0993a0612f4d948cebcf9059e2d530.sh2.agentos-app.net | 大陆可直接访问；已含全部最新优化（移动端/PWA、AI 拓展、闪卡随机、护眼主题等）。在手机浏览器打开后「添加到主屏幕」即可像 App 一样离线使用 |
| GitHub Pages（历史镜像） | https://lxxyyy29.github.io | 一份历史快照，**暂不主动同步**；如需与本机一致可在本机 `git push origin main` 由 Actions 发布，但非必须（线上以 CloudStudio 为准） |

也可以直接把本仓库的 `知识库.html` 下载到本地，双击用浏览器打开即可使用（部分 AI 功能在「文件协议/预览面板」下受浏览器源限制，按页面提示复制到真实浏览器新标签页即可解锁）。

---

## 内置知识库（7 个，可切换）

点击左上角 ☰ 打开侧栏，顶部一排标签即为各知识库：

| # | 名称 | 版本 / 更新 | 内容 |
| --- | --- | --- | --- |
| 0 | ☕ Java 八股 | Java 21 / 2026-08-06 | Java 面试题第四部分等核心八股 |
| 1 | 🤖 Ragent 项目 | — / 2026-08-06 | Ragent（AI 智能问答/知识库系统）源码深挖：核心类速查、队列限流、RRF 融合、模型熔断、意图识别、线程池、23 张表等 |
| 2 | 🔗 LangChain 1.0+ | 1.0+ / 2026-08-06 | LangChain 1.0+ 独立指南：定位哲学、`init_chat_model`、`@tool`、内容块、Agent、中间件、结构化输出、LangGraph、RAG、迁移对照 |
| 3 | 🤖 Embabel Agent | 0.x / 2026-08-06 | Embabel 目标导向智能体框架（JVM） |
| 4 | 🌱 Spring AI | 2.0 / 2026-08-13 | Spring AI 工程框架（Java 生态 AI 开发）：含 **2.0 GA（2026-05-28，Boot 4/Java 21）** 重大升级、破坏性迁移清单、与 LangChain4j / Semantic Kernel 横向对比 |
| 5 | 🧭 业务开发模板 | — / 2026-08-06 | **后端业务项目从 0 到 1 的开发方法论**：需求→选型→架构→实现→运维五段闭环，逐功能技术选型含「优点/缺点/备选」对照，以 Ragent 为蓝本模拟 |
| 6 | 📨 消息队列 MQ | — / 2026-08-06 | **MQ 知识体系**：为什么需要 MQ、核心术语、Kafka/RabbitMQ/RocketMQ/Pulsar 横向对比、点对点 vs 发布订阅、投递语义（最多/至少/精确一次）、顺序性、四大 MQ 逐一深入、可靠性（ACK/重试/死信/幂等）、高可用、Push vs Pull、常见问题排查、最佳实践与速查表 |

除内置库外，点侧栏「＋ 新建知识库」可用 Markdown 简写自建任意知识库，存在本浏览器，可删除/恢复。

---

## 主要功能

- **多库切换 + 侧边导航**：自动从正文标题生成目录，点击跳转；每个库独立记录学习进度。
- **全文搜索**：当前库内实时搜索，并可跨库跳转到结果所在库。
- **学习计划 / 闪卡 / 复习**：AI 生成学习计划；闪卡速记（可预热预生成题目，**每次打开顺序随机**，避免总从第一个开始）；按艾宾浩斯曲线（1/2/4/7/15/30 天）推送「今日待复习」。
- **单知识点 AI 拓展**：每个小节标题旁的 ✨ 按钮，点开后 AI 自动基于该知识点做深入拓展讲解（原理 / 例子 / 易错点 / 对比 / 记忆技巧），流式输出；需配置 API Key（⚙）。**生成结果自动缓存到本浏览器，下次秒开且可离线回看**，点「🔄 重新生成」可刷新。
- **暗色 / 亮色 / 护眼主题**：一键切换，记忆偏好；手机状态栏颜色随主题同步。
- **PWA 离线 + 移动端 App 化**：支持「添加到主屏幕」安装为 App；Service Worker 离线缓存，弱网/无网也能打开；刘海/灵动岛安全区适配、窄屏底部抽屉弹窗、安装引导横幅（Android 直接装、iOS 引导「分享→添加到主屏幕」）。
- **代码练习（实践卡）**：部分章节带可编辑代码框（IDE 风格：自动缩进、括号补全），支持 ▶ 运行（Python/JS 真跑，Java/SQL 走 AI 模拟）、💡 提示、🔑 答案、提交评阅。
- **Monaco 编辑器 + 补全**：
  - 内置静态补全（Java 注解/关键字/类名，`@` 触发）。
  - **IDEA 级补全（可选）**：连接本机 Java 语言服务器（jdtls）桥接服务后，获得类型推断/成员补全/参数提示/报错诊断。详见下方「IDEA 级补全后端」。
- **AI 学习助手**：右下角 ✦ 面板，默认本地检索；配置任意 OpenAI 兼容接口（DeepSeek / 通义 / 硅基流动等）后由大模型回答，支持出题考我。
- **📊 学习中心**：顶栏「📊 学习」汇总各库进度（已学/总章节进度条）、笔记 · 收藏 · 闪卡数量、今日待复习，以及近 30 天学习活跃度热力图，复习规划一目了然。

---

## 项目结构（本仓库即源码）

```
index.html            构建产物 / Pages 入口（单文件，可直接打开）
知识库.html           构建产物副本（同 index.html）
build_kb.py           生成器：拆分正文 + 拼接各 frag + 注入 TPL
kb_template.html      HTML 模板（含 %%APPJS%%/%%LIBTABS%%/%%NAVLISTS%%/%%PAGES%% 占位）
kb_app.js             全部应用逻辑（内联到产物中）
frag_java.html        库 0 扩充片段
frag_ragent.html      库 1 片段（Ragent 源码深挖）
frag_langchain.html   库 2 片段
frag_embabel.html     库 3 片段
frag_springai.html    库 4 片段
frag_biztpl.html      库 5 片段（业务开发模板）
frag_mq.html          库 6 片段（消息队列 MQ）
src_long.html         原始长页正文（库 0/1 的来源；CI 构建用，本地缺失时回退绝对路径）
.github/workflows/    GitHub Actions 自动部署
sync_gitee.sh         一键同步到 Gitee（大陆访问）
```

> ⚠️ `lsp-bridge/`（IDEA 级 Java 补全后端）为**可选本地组件，不在本仓库内**。它位于本地 WorkBuddy 工程，需自行在本地或自有服务器运行（详见其自带 `README.md` / `家用部署说明_Windows.md`），再在站点 ⚙ 里填 `ws://localhost:5008`（或自有服务器的 `wss://域名/lsp`）。未运行时站点自动回退到内置静态补全。

新增一个知识库的标准做法（**数据驱动，只加一行**）：写 `frag_xxx.html`（以 `<h1>` 作为导航分组标题，章节用 `<h2>/<h3>` 并带 `id="sec-xxxx"`），在 `build_kb.py` 的 `EXTRA_LIBS` 列表加一行 `("7","🚀","新库名","frag_xxx.html")`，再 `python build_kb.py` 重建。库切换逻辑全读 DOM，无需改 JS。

> ⚠️ 导航分组必须以 `<h1>` 作为锚点：如果某个库片段首行不是 `<h1>`，`build_nav` 会得不到分组，导致该库侧边导航为空（库 5 曾踩过这个坑）。

---

## IDEA 级补全后端（可选）

纯静态站点跑不了 Java 语言服务器。如需真正的 IDEA 级补全/诊断，在**本机或自有服务器**运行 `lsp-bridge/`：

- `server.js`：Node `ws` + `vscode-ws-jsonrpc` 转发 WebSocket ↔ jdtls stdio。
- 前置：JDK 17+、jdtls。
- 启动后在站点 ⚙ 设置面板「智能补全」填 `ws://localhost:5008`（本机）或 `wss://你的域名/lsp`（自有服务器，HTTPS 站必须 wss），点「连接」。
- Windows 家用部署见 `lsp-bridge/家用部署说明_Windows.md`；自有服务器部署见 `lsp-bridge/README.md`。
- 注意：未连接时自动回退到内置静态补全；jdtls 在完整 Java 工程上下文中最准，零散片段仅 JDK 级 + 当前文件补全。

---

## 构建与部署

### 本地构建

```bash
python build_kb.py          # 生成 知识库.html（同时可 cp 知识库.html index.html）
```

### 自动部署（GitHub Actions）✅

本仓库已配置 `.github/workflows/deploy.yml`：**push 到 `main` 即自动构建并发布到 GitHub Pages**。

1. 在本仓库「Settings → Pages → Build and deployment → Source」选择 **GitHub Actions**。
2. 之后任何 `git push` 都会触发：检出 → `python build_kb.py && cp 知识库.html index.html` → 发布 Pages 产物。
3. 无需本地先构建；源码（含 `src_long.html`）已随仓库提交，CI 可直接还原整站。

> 注意：CI 默认读取仓库内的 `src_long.html`。若你只改了 `frag_*.html` / `kb_app.js` 等，直接 push 即可；若改了底层长页源，记得一并更新 `src_long.html`。

> ⚠️ **关于 GitHub Pages**：云端 Agent 沙箱无 GitHub 凭据、无法代为推送；且当前线上站已定为 CloudStudio，**GitHub Pages 不再作为主动同步目标**。若你日后想手动同步，可在本机执行（非必须）——
> ```bash
> git -C "C:\Users\Administrator\WorkBuddy\2026-08-06-16-05-01\deploy_kb" push origin main
> ```
> 推送后即由 Actions 自动构建并发布到 GitHub Pages。

### 大陆稳定访问（Gitee Pages / 自定义域名 / CDN）

GitHub Pages 在大陆经常不稳定，下面是几条可用的「加速」路径：

**A. Gitee Pages 镜像（已附脚本）**

```bash
# 1) 在 Gitee 建同名空仓库，配置好 SSH 公钥或私人令牌
# 2) 运行同步脚本（默认仓库 lxxyyy29/lxxyyy29，可用环境变量覆盖）
bash sync_gitee.sh
# 或：GITEE_OWNER=你的用户名 GITEE_REPO=仓库名 bash sync_gitee.sh
```

脚本会把 `main` 强制推到 Gitee 的 `master` 分支（Gitee Pages 只认 `master`/`gh-pages`）。随后在 Gitee 仓库「服务 → Gitee Pages」选 `master`、目录 `/`，点「启动」。

**B. 自定义域名 + CDN（最稳）**

1. 给 Pages 绑一个你自己的域名（GitHub Pages / Gitee Pages 均支持自定义域名），并在 DNS 处开启 **CNAME 扁平化 / 关闭 DNSSEC 冲突**。
2. 在域名前挂一层 CDN（Cloudflare / 国内云厂商 CDN），开启：
   - 静态缓存（`index.html` 及 Monaco 等静态资源缓存 1 小时~1 天）；
   - **HTTP/2、Brotli 压缩**；
   - 必要时「海外回源 + 大陆边缘节点」以绕开直连不稳定。
3. 开启 HTTPS（证书可由 CDN 自动签发）。这样大陆访问走 CDN 边缘，稳定性显著提升。

**C. 把 Monaco 放到本地 / 自有 CDN（离线也能用编辑器）**

编辑器默认从 `npmmirror → jsdelivr → unpkg` 依次加载，全失败时回退纯文本框。若希望**完全离线或自有域名加速**，把 Monaco 放到站点同目录 `vendor/monaco/min`（加载器会**优先**用本地路径）：

```bash
# 任选其一拉取 monaco-editor 0.52.2 的 min 产物到 vendor/monaco
npm pack monaco-editor@0.52.2 && tar -xzf monaco-editor-0.52.2.tgz && mv package/dist/min vendor/monaco/min
# 或：直接下载 https://registry.npmmirror.com/monaco-editor/0.52.2/files/min 整目录到 vendor/monaco/min
```

CloudStudio 线上站是当前**唯一常态化维护**的部署目标（覆盖重部署，同沙箱 ID），已包含全部最新优化；GitHub Pages 为历史镜像，暂不主动同步。

---

## Roadmap（已落地 / 规划）

- [x] 第 6 个知识库「业务开发模板」（Ragent 为蓝本，五段闭环 + 逐功能优缺点）
- [x] 第 7 个知识库「消息队列 MQ」（Kafka/RabbitMQ/RocketMQ/Pulsar 横向对比 + 逐功能深入 + 最小可运行片段）
- [x] 工程化：拆分 `TPL`/`JS` 为 `kb_template.html` + `kb_app.js`，新增库改为数据驱动（一行）
- [x] 备份/恢复：⬇ 导出 / ⬆ 导入 `localStorage` 全部 `kb_` 数据
- [x] 全局搜索：跨全部知识库检索，结果下拉直达
- [x] 我的笔记与收藏：标题 ⭐/📝 一键标注，📝 我的 总览（全部/收藏/有笔记筛选）
- [x] 业务模板库加深：四层架构图 + 问答数据流图（SVG）、5 处最小可运行片段、章节交叉链接
- [x] 移动端打磨：窄屏工具行可横滑、编辑器与标题按钮缩小
- [x] Monaco 加载：本地 `vendor` 优先 + npmmirror/jsdelivr/unpkg 多 CDN 兜底
- [x] 大陆稳定访问：Gitee 同步脚本 + 自定义域名/CDN 指南
- [x] GitHub Actions 自动部署：push 即构建发布到 Pages
- [x] 移动端 / PWA 优化：安全区适配、iOS apple-touch-icon、安装引导横幅、动态状态栏主题色、窄屏底部抽屉弹窗、SW 离线缓存增强
- [x] AI 拓展缓存（localStorage，秒开/离线回看/🔄重新生成）+ 侧栏章节状态角标（⭐收藏/📝笔记 一目了然）
- [x] 📊 学习中心：各库进度条 + 笔记/收藏/闪卡/待复习统计 + 近 30 天学习活跃度热力图

---

## 许可

内容用于个人学习；转载请注明来源。
