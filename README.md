# 知识库 · 单文件可切换知识库站点

一个**纯静态、单文件、可离线打开**的知识库网站。支持多知识库切换、侧边导航、全文搜索、学习计划、闪卡速记、艾宾浩斯复习、暗色模式，并内置 Monaco 代码编辑器与「AI 学习助手」。数据全部保存在浏览器 `localStorage`，无需后端。

> 本仓库（`lxxyyy29.github.io`）仅存放构建产物（`index.html` / `知识库.html`）。源码生成器 `build_kb.py` 与各个内容片段 `frag_*.html`、以及可选 IDEA 级补全后端 `lsp-bridge/` 在本地 WorkBuddy 工程中。

---

## 在线访问

| 站点 | 地址 | 说明 |
| --- | --- | --- |
| GitHub Pages（主站） | https://lxxyyy29.github.io | 功能最全；**大陆网络可能较慢/被墙** |
| CloudStudio 镜像 | https://1c0993a0612f4d948cebcf9059e2d530.sh2.agentos-app.net | 大陆可访问的临时镜像，与主页同步 |

也可以直接把本仓库的 `知识库.html` 下载到本地，双击用浏览器打开即可使用（部分 AI 功能在「文件协议/预览面板」下受浏览器源限制，按页面提示复制到真实浏览器新标签页即可解锁）。

---

## 内置知识库（6 个，可切换）

点击左上角 ☰ 打开侧栏，顶部一排标签即为各知识库：

| # | 名称 | 内容 |
| --- | --- | --- |
| 0 | ☕ Java 八股 | Java 面试题第四部分等核心八股 |
| 1 | 🤖 Ragent 项目 | Ragent（AI 智能问答/知识库系统）源码深挖：核心类速查、队列限流、RRF 融合、模型熔断、意图识别、线程池、23 张表等 |
| 2 | 🔗 LangChain 1.0+ | LangChain 1.0+ 独立指南：定位哲学、`init_chat_model`、`@tool`、内容块、Agent、中间件、结构化输出、LangGraph、RAG、迁移对照 |
| 3 | 🤖 Embabel Agent | Embabel 目标导向智能体框架（JVM） |
| 4 | 🌱 Spring AI | Spring AI 工程框架（Java 生态 AI 开发） |
| 5 | 🧭 业务开发模板 | **后端业务项目从 0 到 1 的开发方法论**：需求→选型→架构→实现→运维五段闭环，逐功能技术选型含「优点/缺点/备选」对照，以 Ragent 为蓝本模拟 |

除内置库外，点侧栏「＋ 新建知识库」可用 Markdown 简写自建任意知识库，存在本浏览器，可删除/恢复。

---

## 主要功能

- **多库切换 + 侧边导航**：自动从正文标题生成目录，点击跳转；每个库独立记录学习进度。
- **全文搜索**：当前库内实时搜索，并可跨库跳转到结果所在库。
- **学习计划 / 闪卡 / 复习**：AI 生成学习计划；闪卡速记（可预热预生成题目）；按艾宾浩斯曲线（1/2/4/7/15/30 天）推送「今日待复习」。
- **暗色 / 亮色主题**：一键切换，记忆偏好。
- **代码练习（实践卡）**：部分章节带可编辑代码框（IDE 风格：自动缩进、括号补全），支持 ▶ 运行（Python/JS 真跑，Java/SQL 走 AI 模拟）、💡 提示、🔑 答案、提交评阅。
- **Monaco 编辑器 + 补全**：
  - 内置静态补全（Java 注解/关键字/类名，`@` 触发）。
  - **IDEA 级补全（可选）**：连接本机 Java 语言服务器（jdtls）桥接服务后，获得类型推断/成员补全/参数提示/报错诊断。详见下方「IDEA 级补全后端」。
- **AI 学习助手**：右下角 ✦ 面板，默认本地检索；配置任意 OpenAI 兼容接口（DeepSeek / 通义 / 硅基流动等）后由大模型回答，支持出题考我。

---

## 项目结构（源码侧）

```
知识库.html            构建产物（单文件，可直接打开）
build_kb.py           生成器：拆分正文 + 拼接各 frag + 注入 TPL
frag_java.html        库 0 扩充片段
frag_ragent.html      库 1 片段（Ragent 源码深挖）
frag_langchain.html   库 2 片段
frag_embabel.html     库 3 片段
frag_springai.html    库 4 片段
frag_biztpl.html      库 5 片段（业务开发模板）
lsp-bridge/           可选：IDEA 级 Java 补全后端（Node WS 桥接 jdtls）
```

新增一个知识库的标准做法：写 `frag_xxx.html`（以 `<h1>` 作为导航分组标题，章节用 `<h2>/<h3>` 并带 `id="sec-xxxx"`），在 `build_kb.py` 里加 `FRAG_XXX` / `pageN` / `navN`、TPL 补 `lib-tab` / `nav-list` / `page` 占位与 `replace` 注入，再 `python build_kb.py` 重建。库切换逻辑全读 DOM，无需改 JS。

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

```bash
# 本地重建（需 Python 3.13+）
python build_kb.py          # 生成 知识库.html

# 发布到 GitHub Pages
cp 知识库.html deploy_kb/index.html
cd deploy_kb && git add -A && git commit -m "update" && git push origin main
```

CloudStudio 镜像通过部署工具覆盖重部署（同沙箱 ID），与 GitHub Pages 保持同步。

---

## 许可

内容用于个人学习；转载请注明来源。
