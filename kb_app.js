
var currentLib = "0";
var CUSTOM_KEY = "kb_custom_libs";
var HIDDEN_KEY = "kb_hidden_builtins";
var ICONS = ["📚","📒","🧠","💡","🗄️","⚙️","🔥","🚀","🧪","📖"];
var selIcon = ICONS[0];

function libName(i){
  var t = document.querySelector('.lib-tab[data-lib="' + i + '"] .nm');
  return t ? t.textContent : "知识库";
}
function liveLibs(){
  return Array.prototype.filter.call(document.querySelectorAll(".lib-tab"), function(t){
    return t.style.display !== "none";
  }).map(function(t){ return t.dataset.lib; });
}
function pageOf(id){
  var el = document.getElementById(id);
  if (!el) return currentLib;
  var p = el.closest ? el.closest(".page") : null;
  return p ? p.dataset.page : currentLib;
}

function switchLib(i, target){
  i = String(i);
  currentLib = i;
  document.querySelectorAll(".lib-tab").forEach(function(t){ t.classList.toggle("active", t.dataset.lib === i); });
  document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("show", p.dataset.page === i); });
  document.querySelectorAll(".nav-list").forEach(function(n){ n.classList.toggle("show", n.dataset.lib === i); });
  document.querySelectorAll(".nav-h2.active,.nav-h3.active").forEach(function(a){ a.classList.remove("active"); });
  var name = libName(i);
  var sub = document.getElementById("brandSub"); if (sub) sub.textContent = name;
  var tt = document.getElementById("topTitle"); if (tt) tt.textContent = name;
  var empty = document.getElementById("emptyTip"); if (empty) empty.style.display = "none";
  try { localStorage.setItem("kb_lib", i); } catch(e){}
  closeMenu();
  if (target) {
    hideResume();
    var el = document.getElementById(target);
    if (el) {
      try { history.replaceState(null, "", "#" + target); } catch(e){}
      requestAnimationFrame(function(){ el.scrollIntoView({ block: "start" }); onScroll(); });
      return;
    }
  }
  try { history.replaceState(null, "", location.pathname); } catch(e){}
  window.scrollTo(0, 0);
  onScroll();
  showResume(i);
}

/* 目录 / 锚点点击：跨库时先切库再定位 */
document.addEventListener("click", function(e){
  var a = e.target.closest ? e.target.closest('.nav-list a[href^="#"]') : null;
  if (!a) return;
  var id = a.getAttribute("href").slice(1);
  if (pageOf(id) !== currentLib) {
    e.preventDefault();
    switchLib(pageOf(id), id);
  }
  closeMenu();
});
window.addEventListener("hashchange", function(){
  var id = location.hash.slice(1);
  if (id && document.getElementById(id) && pageOf(id) !== currentLib) switchLib(pageOf(id), id);
});

/* ===== 滚动高亮 ===== */
var map = {};
var obs = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if (e.isIntersecting) {
      document.querySelectorAll(".nav-h2.active,.nav-h3.active").forEach(function(l){ l.classList.remove("active"); });
      var a = map[e.target.id];
      if (a && a.closest(".nav-list") && a.closest(".nav-list").dataset.lib === currentLib) a.classList.add("active");
    }
  });
}, { rootMargin: "0px 0px -72% 0px", threshold: 0 });
function reindex(){
  document.querySelectorAll(".nav-h2, .nav-h3").forEach(function(l){
    var id = l.getAttribute("href").slice(1);
    if (document.getElementById(id)) map[id] = l;
  });
  document.querySelectorAll(".content h1[id],.content h2[id],.content h3[id],.content h4[id]").forEach(function(h){ obs.observe(h); });
  addTicks();
  addPracticeBtns();
  applyProg();
}
reindex();

var progress = document.getElementById("progress");
var toTop = document.getElementById("toTop");
var lastPosSave = 0;
function onScroll(){
  var h = document.documentElement;
  var sc = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
  progress.style.width = (sc * 100) + "%";
  toTop.classList.toggle("show", window.scrollY > 420);
  var now = Date.now();
  if (now - lastPosSave > 800){ lastPosSave = now; savePos(); }
}
window.addEventListener("scroll", onScroll, { passive: true });

/* ===== 搜索（过滤当前库目录，提示另一库匹配数） ===== */
function onSearch(q){
  q = (q || "").trim().toLowerCase();
  var hint = document.getElementById("searchHint");
  var res = document.getElementById("searchResults");
  var global = document.getElementById("searchGlobal") && document.getElementById("searchGlobal").checked;
  if (global){
    if (!q){ res.style.display = "none"; res.innerHTML = ""; hint.style.display = "none"; restoreNavDisplay(); return; }
    var results = [];
    document.querySelectorAll(".nav-list").forEach(function(list){
      var lib = list.dataset.lib;
      var nm = libName(lib);
      list.querySelectorAll("a").forEach(function(a){
        if (a.textContent.toLowerCase().indexOf(q) >= 0)
          results.push({ lib: lib, name: nm, text: a.textContent, href: a.getAttribute("href") });
      });
    });
    restoreNavDisplay();
    if (!results.length){ res.style.display = "block"; res.innerHTML = '<div class="sr-empty">未找到匹配</div>'; hint.style.display = "none"; return; }
    var html = '<div class="sr-head">跨全部知识库找到 ' + results.length + ' 个匹配：</div>';
    results.slice(0, 60).forEach(function(r){
      html += '<div class="sr-item" data-lib="' + r.lib + '" data-href="' + r.href + '"><span class="sr-lib">' + esc(r.name) + '</span><span class="sr-text">' + esc(r.text) + '</span></div>';
    });
    if (results.length > 60) html += '<div class="sr-more">仅显示前 60 个，请输入更精确的关键词</div>';
    res.style.display = "block"; res.innerHTML = html; hint.style.display = "none";
    Array.prototype.forEach.call(res.querySelectorAll(".sr-item"), function(el){
      el.onclick = function(){ gotoResult(el.dataset.lib, el.dataset.href); };
    });
    return;
  }
  /* 非全局：仅过滤当前库，并提示其他库命中数 */
  var otherCount = 0;
  document.querySelectorAll(".nav-list").forEach(function(list){
    var isCur = list.dataset.lib === currentLib;
    list.querySelectorAll("a").forEach(function(a){
      var hit = !q || a.textContent.toLowerCase().indexOf(q) >= 0;
      if (isCur) a.style.display = hit ? "" : "none";
      else if (q && a.textContent.toLowerCase().indexOf(q) >= 0) otherCount++;
    });
    list.querySelectorAll(".nav-group").forEach(function(g){
      if (!isCur || !q) { g.style.display = ""; return; }
      var any = Array.prototype.some.call(g.querySelectorAll("a"), function(a){ return a.style.display !== "none"; });
      g.style.display = any ? "" : "none";
    });
  });
  res.style.display = "none"; res.innerHTML = "";
  if (q && otherCount > 0) {
    hint.style.display = "block";
    hint.textContent = "另一个知识库还有 " + otherCount + " 个匹配 →";
  } else {
    hint.style.display = "none";
  }
}
function restoreNavDisplay(){
  document.querySelectorAll(".nav-list a").forEach(function(a){ a.style.display = ""; });
  document.querySelectorAll(".nav-list .nav-group").forEach(function(g){ g.style.display = ""; });
}
function gotoResult(lib, href){
  var id = href ? href.replace(/^#/, "") : null;
  switchLib(lib, id);
  var res = document.getElementById("searchResults");
  if (res){ res.style.display = "none"; res.innerHTML = ""; }
  document.getElementById("search").blur();
}
function jumpOtherLib(){
  var q = document.getElementById("search").value;
  var other = liveLibs().filter(function(i){ return i !== currentLib; })[0];
  if (other) switchLib(other);
  onSearch(q);
}

/* ===== 主题 ===== */
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  var b = document.getElementById("themeBtn");
  if (b) b.innerHTML = (t === "dark") ? "☀️ 亮色" : "🌙 暗色";
  try { localStorage.setItem("kb_theme", t); } catch(e){}
}
function toggleTheme(){
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

/* ===== 背题模式（两个库分别构建折叠区） ===== */
function buildFolds(c){
  if (!c || c.dataset.fb) return;
  var nodes = Array.prototype.slice.call(c.children);
  var cur = null;
  nodes.forEach(function(n){
    var t = n.tagName.toLowerCase();
    if (t === "h3") {
      cur = document.createElement("div"); cur.className = "fold";
      c.insertBefore(cur, n.nextSibling); cur.appendChild(n);
    } else if (t === "h2" || t === "h1") {
      cur = null;
    } else if (cur && t !== "div" || cur && t === "div" && !n.classList.contains("page-foot")) {
      if (cur && !n.classList.contains("page-foot")) cur.appendChild(n);
    }
  });
  c.dataset.fb = "1";
  c.querySelectorAll("h3").forEach(function(h){
    h.addEventListener("click", function(){
      if (!document.body.classList.contains("review")) return;
      var f = h.parentElement;
      if (f && f.classList.contains("fold")) { f.classList.toggle("collapsed"); h.classList.toggle("open"); }
    });
  });
}
function toggleReview(){
  var on = document.body.classList.toggle("review");
  var b = document.getElementById("reviewBtn");
  if (b) b.classList.toggle("on", on);
  document.querySelectorAll(".page").forEach(function(p){ buildFolds(p); });
  document.querySelectorAll(".fold").forEach(function(f){ f.classList.toggle("collapsed", on); });
  if (!on) document.querySelectorAll(".content h3").forEach(function(h){ h.classList.remove("open"); });
  try { localStorage.setItem("kb_review", on ? "1" : "0"); } catch(e){}
}

function scrollTopFn(){ window.scrollTo({ top: 0, behavior: "smooth" }); }
function toggleMenu(){ document.getElementById("sidebar").classList.toggle("open"); document.getElementById("overlay").classList.toggle("show"); }
function closeMenu(){ document.getElementById("sidebar").classList.remove("open"); document.getElementById("overlay").classList.remove("show"); }

/* ===== 知识库增删（自建库存 localStorage） ===== */
function getCustoms(){ try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch(e){ return []; } }
function saveCustoms(l){
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(l)); return true; }
  catch(e){ alert("保存失败：浏览器本地存储空间不足"); return false; }
}
function getHidden(){ try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); } catch(e){ return []; } }
function saveHidden(l){ try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(l)); } catch(e){} }

function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function inline(s){
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}
function mdToHtml(md, prefix){
  var lines = md.replace(/\r\n?/g, "\n").split("\n");
  var html = "", heads = [], hn = 0;
  var inCode = false, codeBuf = [], inUl = false, inOl = false, para = [];
  function flushPara(){ if (para.length){ html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } }
  function flushList(){ if (inUl){ html += "</ul>"; inUl = false; } if (inOl){ html += "</ol>"; inOl = false; } }
  function flushCode(){ html += '<pre class="code-block"><div class="code-bar"><span class="code-lang">Code</span><span class="code-dots"><i></i><i></i><i></i></span></div><code>' + esc(codeBuf.join("\n")) + "</code></pre>"; codeBuf = []; inCode = false; }
  lines.forEach(function(ln){
    if (/^```/.test(ln.trim())){
      if (inCode) flushCode(); else { flushPara(); flushList(); inCode = true; }
      return;
    }
    if (inCode){ codeBuf.push(ln); return; }
    var t = ln.trim(), m;
    if (!t){ flushPara(); flushList(); return; }
    if ((m = t.match(/^(#{1,3})\s+(.*)$/))){
      flushPara(); flushList();
      var lvl = m[1].length, id = prefix + "-h" + (++hn), txt = m[2].replace(/[*`]/g, "").trim();
      html += "<h" + lvl + ' id="' + id + '">' + inline(m[2]) + "</h" + lvl + ">";
      heads.push({ lvl: lvl, id: id, text: txt });
    } else if (/^---+$/.test(t)){
      flushPara(); flushList(); html += '<hr class="sep">';
    } else if ((m = t.match(/^[-*]\s+(.*)$/))){
      flushPara(); if (inOl){ html += "</ol>"; inOl = false; }
      if (!inUl){ html += "<ul>"; inUl = true; }
      html += "<li>" + inline(m[1]) + "</li>";
    } else if ((m = t.match(/^\d+[.、)]\s*(.*)$/))){
      flushPara(); if (inUl){ html += "</ul>"; inUl = false; }
      if (!inOl){ html += "<ol>"; inOl = true; }
      html += "<li>" + inline(m[1]) + "</li>";
    } else if ((m = t.match(/^>\s?(.*)$/))){
      flushPara(); flushList();
      html += "<blockquote>" + inline(m[1]) + "</blockquote>";
    } else {
      para.push(ln);
    }
  });
  if (inCode) flushCode();
  flushPara(); flushList();
  return { html: html, heads: heads };
}
function navFromHeads(heads, fallback){
  var html = "", open = false;
  heads.forEach(function(h){
    if (h.lvl === 1){
      if (open) html += "</div>";
      html += '<div class="nav-group"><div class="nav-h1">' + esc(h.text) + "</div>";
      open = true;
    } else {
      if (!open){ html += '<div class="nav-group"><div class="nav-h1">' + esc(fallback) + "</div>"; open = true; }
      html += '<a class="' + (h.lvl === 2 ? "nav-h2" : "nav-h3") + '" href="#' + h.id + '">' + esc(h.text) + "</a>";
    }
  });
  if (!open) return '<div class="nav-group"><div class="nav-h1">' + esc(fallback) + "</div></div>";
  return html + "</div>";
}
function renderLib(lib){
  var tabs = document.getElementById("libTabs");
  var tab = document.createElement("button");
  tab.type = "button"; tab.className = "lib-tab"; tab.dataset.lib = lib.id;
  tab.innerHTML = '<span class="ic">' + lib.icon + '</span><span class="nm"></span><span class="ct"></span><span class="pbar"><i></i></span><span class="del" title="删除该知识库">×</span>';
  tab.querySelector(".nm").textContent = lib.name;
  tab.onclick = function(){ switchLib(lib.id); };
  tab.querySelector(".del").onclick = function(e){ delLib(e, lib.id); };
  tabs.insertBefore(tab, tabs.querySelector(".lib-add"));

  var nl = document.createElement("div");
  nl.className = "nav-list"; nl.dataset.lib = lib.id; nl.innerHTML = lib.nav;
  document.querySelector(".nav-scroll").appendChild(nl);

  var pg = document.createElement("section");
  pg.className = "page"; pg.dataset.page = lib.id; pg.innerHTML = lib.html;
  document.getElementById("contentBox").insertBefore(pg, document.getElementById("emptyTip"));

  tab.querySelector(".ct").textContent = nl.querySelectorAll(".nav-h2").length + " 个章节";
  if (document.body.classList.contains("review")) buildFolds(pg);
  aiIndex = null;
  reindex();
}
function openLibModal(){
  document.getElementById("libModal").classList.add("show");
  refreshRestoreBtn();
}
function closeLibModal(){ document.getElementById("libModal").classList.remove("show"); }
function refreshRestoreBtn(){
  var w = document.getElementById("restoreWrap");
  w.innerHTML = getHidden().length
    ? '<button class="m-btn danger-ghost" onclick="restoreBuiltins()">恢复默认知识库</button>' : "";
}
function createLib(){
  var name = document.getElementById("libName").value.trim();
  var body = document.getElementById("libBody").value.trim();
  if (!name){ alert("请填写知识库名称"); return; }
  if (!body){ alert("请填写内容"); return; }
  var id = "u" + Date.now().toString(36);
  var r = mdToHtml(body, id);
  if (!r.heads.some(function(h){ return h.lvl === 1; })){
    r.html = '<h1 id="' + id + '-h0">' + esc(name) + "</h1>" + r.html;
  }
  var lib = { id: id, name: name, icon: selIcon, html: r.html, nav: navFromHeads(r.heads, name) };
  var libs = getCustoms(); libs.push(lib);
  if (!saveCustoms(libs)) return;
  renderLib(lib);
  document.getElementById("libName").value = "";
  document.getElementById("libBody").value = "";
  closeLibModal();
  switchLib(id);
  /* 导入即预热：后台批量生成该库所有闪卡题目并持久缓存 */
  warmupLib(id);
}
function delLib(e, i){
  e.stopPropagation();
  i = String(i);
  var custom = i.charAt(0) === "u";
  var tip = custom ? "删除后不可恢复。" : "内置库删除后可在「新建知识库」弹窗中恢复。";
  if (!confirm("确定删除知识库「" + libName(i) + "」吗？\n" + tip)) return;
  if (custom){
    saveCustoms(getCustoms().filter(function(l){ return l.id !== i; }));
    removeLibDom(i);
  } else {
    var hd = getHidden(); if (hd.indexOf(i) < 0) hd.push(i); saveHidden(hd);
    var t = document.querySelector('.lib-tab[data-lib="' + i + '"]');
    if (t) t.style.display = "none";
  }
  if (currentLib === i){
    var rest = liveLibs();
    if (rest.length) switchLib(rest[0]);
    else showEmpty();
  }
  refreshRestoreBtn();
}
function removeLibDom(i){
  var t = document.querySelector('.lib-tab[data-lib="' + i + '"]'); if (t) t.remove();
  var n = document.querySelector('.nav-list[data-lib="' + i + '"]'); if (n) n.remove();
  var p = document.querySelector('.page[data-page="' + i + '"]'); if (p) p.remove();
  aiIndex = null;
  /* 清理该库的闪卡题目缓存，避免 localStorage 无用堆积 */
  var M = getFcQAll(); if (M[i]){ delete M[i]; try { localStorage.setItem(FC_Q_KEY, JSON.stringify(M)); } catch(e){} }
}
function restoreBuiltins(){
  saveHidden([]);
  document.querySelectorAll(".lib-tab").forEach(function(t){ t.style.display = ""; });
  refreshRestoreBtn();
  closeLibModal();
  if (liveLibs().indexOf(currentLib) < 0) switchLib("0");
}
function showEmpty(){
  document.querySelectorAll(".page").forEach(function(p){ p.classList.remove("show"); });
  document.querySelectorAll(".nav-list").forEach(function(n){ n.classList.remove("show"); });
  var empty = document.getElementById("emptyTip"); if (empty) empty.style.display = "block";
}

/* ===== AI 学习助手 ===== */
var AI_CFG_KEY = "kb_ai_cfg";
var AI_DEFAULT = { url: "https://api.deepseek.com", key: "", model: "deepseek-v4-flash" };
var aiIndex = null;      /* 惰性构建的检索索引 */
var aiBusy = false;

function getAiCfg(){
  try {
    var c = JSON.parse(localStorage.getItem(AI_CFG_KEY) || "null");
    if (c && c.url && c.key) return c;
  } catch(e){}
  return AI_DEFAULT;   /* 内置默认配置：DeepSeek V4 Flash */
}
function saveAiCfg(){
  var url = document.getElementById("aiUrl").value.trim();
  var key = document.getElementById("aiKey").value.trim();
  var model = document.getElementById("aiModel").value.trim();
  var proxy = document.getElementById("aiProxy").value.trim();
  if (!url || !key){ alert("请至少填写 API 地址和 Key"); return; }
  try { localStorage.setItem(AI_CFG_KEY, JSON.stringify({ url: url, key: key, model: model || "deepseek-v4-flash", proxy: proxy })); } catch(e){}
  refreshAiMode();
  toggleAiCfg();
  addMsg("bot", "已启用大模型模式 ✅ 现在提问会结合当前知识库内容由 AI 生成回答。");
}
function clearAiCfg(){
  try { localStorage.removeItem(AI_CFG_KEY); } catch(e){}
  refreshAiMode();
  addMsg("bot", "已清除配置，当前为本地检索模式（点 ⚙ 可重新填写 Key）。");
}
function refreshAiMode(){
  var cfg = getAiCfg();
  var custom = false;
  try { var c = JSON.parse(localStorage.getItem(AI_CFG_KEY) || "null"); custom = !!(c && c.url && c.key); } catch(e){}
  var hasKey = !!(cfg && cfg.key);
  document.getElementById("aiMode").textContent = hasKey ? ("AI · " + cfg.model + (custom ? "" : "（内置）")) : "本地检索";
  if (cfg){ document.getElementById("aiUrl").value = cfg.url; document.getElementById("aiKey").value = cfg.key; document.getElementById("aiModel").value = cfg.model; if (document.getElementById("aiProxy")) document.getElementById("aiProxy").value = cfg.proxy || ""; }
}
function toggleAI(){
  var p = document.getElementById("aiPanel");
  p.classList.toggle("show");
  if (p.classList.contains("show") && !document.getElementById("aiMsgs").children.length){
    addMsg("bot", "你好！我是你的学习助手 ✦ 可以问我这个知识库里的任何问题，比如「线程池参数怎么配」「Ragent 的限流怎么实现的」。点右上角 ⚙ 可接入大模型获得更完整的解答。");
  }
  if (p.classList.contains("show")) document.getElementById("aiQ").focus();
}
function toggleAiCfg(){ document.getElementById("aiCfg").classList.toggle("show"); }
function aiKeydown(e){ if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); askAI(); } }

function addMsg(role, html){
  var box = document.getElementById("aiMsgs");
  var d = document.createElement("div");
  d.className = "ai-msg " + role;
  d.innerHTML = '<span class="av">' + (role === "user" ? "🧑" : "✦") + '</span><div class="bub">' + html + "</div>";
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
  return d;
}

/* 把当前页面切成「标题 + 正文」块，建检索索引 */
function buildAiIndex(){
  aiIndex = [];
  function htext(n){
    var t = n.textContent, chip = n.querySelector(".h3-prac");
    if (chip) t = t.replace(chip.textContent, "");
    return t.trim();
  }
  document.querySelectorAll(".page").forEach(function(pg){
    var lib = pg.dataset.page;
    var cur = null, parent = "";
    Array.prototype.forEach.call(pg.querySelectorAll("h1,h2,h3,p,li,td,blockquote"), function(n){
      if (/^H[123]$/.test(n.tagName)){
        if (n.tagName === "H2" || n.tagName === "H1") parent = htext(n);
        cur = { lib: lib, id: n.id, title: htext(n), parent: parent, text: "" };
        aiIndex.push(cur);
      } else if (cur){
        cur.text += " " + n.textContent.trim();
      }
    });
  });
}
function bigrams(s){
  s = s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  var out = [];
  for (var i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  if (s.length === 1) out.push(s);
  return out;
}
function retrieve(q, topN){
  if (!aiIndex) buildAiIndex();
  var grams = bigrams(q);
  var words = q.toLowerCase().match(/[a-z0-9+#.]{2,}/g) || [];
  var scored = aiIndex.map(function(c){
    var hay = (c.title + " " + c.text).toLowerCase();
    var s = 0;
    grams.forEach(function(g){
      var i = hay.indexOf(g);
      while (i >= 0){ s += 1; i = hay.indexOf(g, i + 1); if (s > 400) break; }
      if (c.title.toLowerCase().indexOf(g) >= 0) s += 6;
    });
    words.forEach(function(w){
      var i = hay.indexOf(w);
      while (i >= 0){ s += 3; i = hay.indexOf(w, i + 1); if (s > 600) break; }
      if (c.title.toLowerCase().indexOf(w) >= 0) s += 10;
    });
    if (c.lib === currentLib) s *= 1.25;   /* 当前库加权 */
    return { c: c, s: s };
  }).filter(function(x){ return x.s > 0; });
  scored.sort(function(a, b){ return b.s - a.s; });
  return scored.slice(0, topN || 3);
}
function jumpRef(id){
  var pg = pageOf(id);
  if (String(pg) !== currentLib) switchLib(pg, id);
  else { var el = document.getElementById(id); if (el) el.scrollIntoView({ block: "start" }); }
  if (window.innerWidth <= 920) toggleAI();
}
function refsHtml(hits){
  if (!hits.length) return "";
  var h = '<span class="ref">📖 相关章节：';
  hits.forEach(function(x, i){
    h += '<a onclick="jumpRef(\'' + x.c.id + "')\">" + esc(x.c.title) + "</a>" + (i < hits.length - 1 ? " · " : "");
  });
  return h + "</span>";
}
function localAnswer(q){
  var hits = retrieve(q, 3);
  if (!hits.length || hits[0].s < 3){
    return "这个问题我在当前知识库里没有找到相关内容 🤔 可以换个关键词试试，或点 ⚙ 接入大模型获得通用解答。";
  }
  var best = hits[0].c;
  var text = best.text.trim();
  if (text.length > 320) text = text.slice(0, 320) + "……";
  var html = "<p>根据知识库「<strong>" + esc(best.title) + "</strong>」：</p><p>" + esc(text) + "</p>";
  if (hits.length > 1) html += "<p style='font-size:12px;color:var(--muted)'>还可以看看下面的相关章节：</p>";
  return html + refsHtml(hits);
}
/* 统一的 LLM 调用（出题/评分/问答共用） */
function callLLM(msgs, onOk, onFail, onDone){
  var cfg = getAiCfg();
  if (!cfg || !cfg.key){ if (onFail) onFail("未配置 API Key：请点击 ⚙ 填写 DeepSeek Key 后使用 AI 功能"); if (onDone) onDone(); return; }
  var body = JSON.stringify({ model: cfg.model, messages: msgs, temperature: 0.3 });
  var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key };
  function doFetch(url, viaProxy){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, viaProxy ? 90000 : 60000);
    return fetch(url, { method: "POST", headers: headers, body: body, signal: ctrl.signal })
      .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(data){
        var txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "（空响应）";
        onOk(txt);
      })
      .finally(function(){ clearTimeout(timer); });
  }
  var realUrl = cfg.url.replace(/\/+$/, "") + "/chat/completions";
  doFetch(realUrl, false)
    .then(function(){ if (onDone) onDone(); })
    .catch(function(err){
      /* 直连失败：若配置了代理，自动重试一次（代理会把 Authorization 转发给 DeepSeek） */
      if (cfg.proxy){
        var pUrl = cfg.proxy.indexOf("{url}") >= 0 ? cfg.proxy.replace("{url}", encodeURIComponent(realUrl)) : (cfg.proxy + encodeURIComponent(realUrl));
        doFetch(pUrl, true)
          .then(function(){ if (onDone) onDone(); })
          .catch(function(err2){ if (onFail) onFail(String(err2 && err2.message || err2)); if (onDone) onDone(); });
      } else {
        if (onFail) onFail(String(err && err.message || err));
        if (onDone) onDone();
      }
    });
}
/* 流式版本：逐 token 回调 onToken，用于聊天实时渲染 */
function callLLMStream(msgs, onToken, onDone, onFail){
  var cfg = getAiCfg();
  if (!cfg || !cfg.key){ if (onFail) onFail("未配置 API Key：请点击 ⚙ 填写 DeepSeek Key 后使用 AI 功能"); if (onDone) onDone(); return; }
  var body = JSON.stringify({ model: cfg.model, messages: msgs, temperature: 0.3, stream: true });
  var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key };
  function readStream(url, viaProxy){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, viaProxy ? 90000 : 60000);
    return fetch(url, { method: "POST", headers: headers, body: body, signal: ctrl.signal })
      .then(function(r){
        if (!r.ok) throw new Error("HTTP " + r.status);
        if (!r.body || !r.body.getReader) throw new Error("stream_unsupported");
        var reader = r.body.getReader();
        var dec = new TextDecoder("utf-8");
        var buf = "";
        function pump(){
          return reader.read().then(function(step){
            if (step.done) return;
            buf += dec.decode(step.value, { stream: true });
            var parts = buf.split("\n");
            buf = parts.pop();
            for (var i = 0; i < parts.length; i++){
              var ln = parts[i].trim();
              if (!ln || ln.indexOf("data:") !== 0) continue;
              var payload = ln.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                var obj = JSON.parse(payload);
                var delta = obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
                if (delta) onToken(delta);
              } catch (e) { /* 流式中途的碎片 JSON 忽略 */ }
            }
            return pump();
          });
        }
        return pump();
      })
      .finally(function(){ clearTimeout(timer); });
  }
  var realUrl = cfg.url.replace(/\/+$/, "") + "/chat/completions";
  readStream(realUrl, false)
    .then(function(){ if (onDone) onDone(); })
    .catch(function(err){
      if (cfg.proxy){
        var pUrl = cfg.proxy.indexOf("{url}") >= 0 ? cfg.proxy.replace("{url}", encodeURIComponent(realUrl)) : (cfg.proxy + encodeURIComponent(realUrl));
        readStream(pUrl, true)
          .then(function(){ if (onDone) onDone(); })
          .catch(function(err2){ if (onFail) onFail(String(err2 && err2.message || err2)); if (onDone) onDone(); });
      } else {
        if (onFail) onFail(String(err && err.message || err));
        if (onDone) onDone();
      }
    });
}
function askAI(){
  if (aiBusy) return;
  var inp = document.getElementById("aiQ");
  var q = inp.value.trim();
  if (!q) return;
  inp.value = "";
  addMsg("user", esc(q));
  /* 测验进行中：本条输入视为作答 */
  if (quiz){
    if (q === "退出" || q === "退出测验"){ quiz = null; addMsg("bot", "已退出测验 🛑 想再练点头部的 📝 随时开始。"); return; }
    var c = quiz; quiz = null;
    gradeAnswer(c, q);
    return;
  }
  aiBusy = true;
  document.getElementById("aiSend").disabled = true;
  var thinking = addMsg("bot", '<span class="ai-typing"><i></i><i></i><i></i></span>');
  var hits = retrieve(q, 3);
  var ctx = hits.map(function(x){ return "【" + x.c.title + "】\n" + x.c.text.slice(0, 900); }).join("\n\n");
  var msgs = [
    { role: "system", content: "你是一个面试学习助手。基于给出的知识库上下文回答问题，回答用简体中文、要点化、简洁准确；上下文没有的内容可基于通识补充但要说明。上下文：\n" + (ctx || "（无相关内容）") },
    { role: "user", content: q }
  ];
  var bub = thinking.querySelector(".bub");
  var acc = "";
  callLLMStream(msgs, function(tok){
    acc += tok;
    bub.innerHTML = simpleMd(acc) + refsHtml(hits);
    document.getElementById("aiMsgs").scrollTop = document.getElementById("aiMsgs").scrollHeight;
  }, function(){
    bub.innerHTML = simpleMd(acc) + refsHtml(hits);
    aiBusy = false;
    document.getElementById("aiSend").disabled = false;
    document.getElementById("aiMsgs").scrollTop = document.getElementById("aiMsgs").scrollHeight;
  }, function(err){
    if (!acc) bub.innerHTML = "大模型调用失败（" + esc(err) + "），已用本地检索回答：<br><br>" + localAnswer(q);
    else bub.innerHTML = simpleMd(acc) + refsHtml(hits);
    aiBusy = false;
    document.getElementById("aiSend").disabled = false;
    document.getElementById("aiMsgs").scrollTop = document.getElementById("aiMsgs").scrollHeight;
  });
}
function simpleMd(t){
  var html = esc(t);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/^###?\s+(.+)$/gm, "<strong>$1</strong>");
  html = html.replace(/^[-*]\s+(.+)$/gm, "• $1");
  html = html.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
  return html;
}

/* ===== AI 面板拖拽（位置存 localStorage） ===== */
var AI_POS_KEY = "kb_ai_pos";
(function initAiDrag(){
  var panel = document.getElementById("aiPanel");
  var head = panel.querySelector(".ai-head");
  var sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

  function clamp(x, y){
    var r = panel.getBoundingClientRect();
    var maxX = window.innerWidth - 60, maxY = window.innerHeight - 60;
    return [Math.max(-r.width + 120, Math.min(x, maxX)), Math.max(0, Math.min(y, maxY))];
  }
  function applyPos(x, y){
    panel.style.left = x + "px";
    panel.style.top = y + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }
  function restore(){
    try {
      var p = JSON.parse(localStorage.getItem(AI_POS_KEY) || "null");
      if (p){ var c = clamp(p.x, p.y); applyPos(c[0], c[1]); }
    } catch(e){}
  }
  head.addEventListener("pointerdown", function(e){
    if (e.target.closest("button")) return;   /* 点头部的设置/关闭按钮不触发拖拽 */
    dragging = true;
    panel.classList.add("dragging");
    var r = panel.getBoundingClientRect();
    /* 首次拖动：把 right/bottom 定位换算成 left/top，避免跳变 */
    applyPos(r.left, r.top);
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    head.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  head.addEventListener("pointermove", function(e){
    if (!dragging) return;
    var c = clamp(ox + e.clientX - sx, oy + e.clientY - sy);
    applyPos(c[0], c[1]);
  });
  function done(e){
    if (!dragging) return;
    dragging = false;
    panel.classList.remove("dragging");
    var r = panel.getBoundingClientRect();
    try { localStorage.setItem(AI_POS_KEY, JSON.stringify({ x: r.left, y: r.top })); } catch(e2){}
    try { head.releasePointerCapture(e.pointerId); } catch(e3){}
  }
  head.addEventListener("pointerup", done);
  head.addEventListener("pointercancel", done);
  window.addEventListener("resize", restore);
  restore();
})();

/* ===== 学习进度（按库记录已学章节，存 localStorage） ===== */
var PROG_KEY = "kb_progress";
function getProg(){ try { return JSON.parse(localStorage.getItem(PROG_KEY) || "{}"); } catch(e){ return {}; } }
function saveProg(p){ try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch(e){} }
function addTicks(){
  document.querySelectorAll(".nav-h2").forEach(function(a){
    if (a.querySelector(".tick")) return;
    var s = document.createElement("span");
    s.className = "tick"; s.textContent = "✓"; s.title = "标记为已学 / 取消";
    s.onclick = function(e){ toggleDone(e, a.getAttribute("href").slice(1)); };
    a.appendChild(s);
  });
}
function toggleDone(e, id){
  e.preventDefault(); e.stopPropagation();
  var a = e.target.closest ? e.target.closest(".nav-h2") : null;
  var lib = a && a.closest(".nav-list") ? a.closest(".nav-list").dataset.lib : currentLib;
  var p = getProg(), arr = p[lib] || [];
  setDoneProgress(lib, id, arr.indexOf(id) < 0);
}
/* 统一的"已学"写入：进度数组 + 学习时间记录 + 界面刷新 */
function setDoneProgress(lib, id, on){
  var p = getProg(), arr = p[lib] || [], i = arr.indexOf(id);
  if (on && i < 0) arr.push(id);
  if (!on && i >= 0) arr.splice(i, 1);
  p[lib] = arr;
  saveProg(p);
  setLearn(lib, id, on);
  applyProg();
  updateDueBadge();
}
function applyProg(){
  var p = getProg();
  document.querySelectorAll(".nav-list").forEach(function(list){
    var done = p[list.dataset.lib] || [];
    list.querySelectorAll(".nav-h2").forEach(function(a){
      a.classList.toggle("done", done.indexOf(a.getAttribute("href").slice(1)) >= 0);
    });
  });
  document.querySelectorAll(".lib-tab").forEach(function(tab){
    var lib = tab.dataset.lib;
    var total = document.querySelectorAll('.nav-list[data-lib="' + lib + '"] .nav-h2').length;
    var dn = (p[lib] || []).filter(function(id){ return !!document.getElementById(id); }).length;
    var ct = tab.querySelector(".ct");
    if (ct) ct.textContent = total + " 个章节 · 已学 " + dn;
    var bar = tab.querySelector(".pbar i");
    if (bar) bar.style.width = (total ? Math.round(dn / total * 100) : 0) + "%";
  });
}
function resetProgress(){
  if (!confirm("确定清空「" + libName(currentLib) + "」的学习进度吗？")) return;
  var p = getProg(); p[currentLib] = [];
  saveProg(p);
  applyProg();
}

/* ===== 艾宾浩斯复习提醒 ===== */
var LEARN_KEY = "kb_learn";
var INTERVALS = [1, 2, 4, 7, 15, 30];   /* 第 n 次复习的间隔天数 */
function getLearnAll(){ try { return JSON.parse(localStorage.getItem(LEARN_KEY) || "{}"); } catch(e){ return {}; } }
function saveLearnAll(l){ try { localStorage.setItem(LEARN_KEY, JSON.stringify(l)); } catch(e){} }
function setLearn(lib, id, on){
  var L = getLearnAll();
  if (on){
    L[lib] = L[lib] || {};
    var old = L[lib][id];
    L[lib][id] = { t: Date.now(), n: old ? old.n : 0 };
  } else if (L[lib]){
    delete L[lib][id];
  }
  saveLearnAll(L);
}
function dueList(){
  var p = getProg(), L = getLearnAll(), out = [], now = Date.now(), dirty = false;
  Object.keys(p).forEach(function(lib){
    (p[lib] || []).forEach(function(id){
      if (!document.getElementById(id)) return;
      L[lib] = L[lib] || {};
      var st = L[lib][id];
      if (!st){ st = { t: now, n: 0 }; L[lib][id] = st; dirty = true; }
      var days = (now - st.t) / 86400000;
      var iv = INTERVALS[Math.min(st.n, INTERVALS.length - 1)];
      if (days >= iv) out.push({ lib: lib, id: id, n: st.n });
    });
  });
  if (dirty) saveLearnAll(L);
  return out;
}
function updateDueBadge(){
  var n = dueList().length;
  var b = document.getElementById("dueBadge");
  if (!b) return;
  b.style.display = n > 0 ? "" : "none";
  b.textContent = n;
}
function openReview(){
  var list = dueList();
  var box = document.getElementById("reviewList");
  if (!list.length){
    box.innerHTML = '<div class="rv-empty">🎉 今日没有到期的复习内容<br><span style="font-size:12px">已学章节会按 1/2/4/7/15/30 天节奏出现在这里</span></div>';
  } else {
    box.innerHTML = "";
    list.forEach(function(it){
      var el = document.getElementById(it.id);
      var d = document.createElement("div");
      d.className = "rv-item";
      d.innerHTML = '<span class="tt"></span><span class="lb"></span><button class="ok">已复习 ✓</button>';
      var tt = d.querySelector(".tt");
      tt.textContent = el ? el.textContent : it.id;
      tt.onclick = function(){ closeReview(); jumpRef(it.id); };
      d.querySelector(".lb").textContent = libName(it.lib) + " · 第" + (it.n + 1) + "轮";
      d.querySelector(".ok").onclick = function(){ markReviewed(it.lib, it.id); };
      box.appendChild(d);
    });
  }
  document.getElementById("reviewModal").classList.add("show");
}
function closeReview(){ document.getElementById("reviewModal").classList.remove("show"); }
function markReviewed(lib, id){
  var L = getLearnAll();
  if (L[lib] && L[lib][id]){ L[lib][id].n++; L[lib][id].t = Date.now(); saveLearnAll(L); }
  updateDueBadge();
  openReview();
}

/* ===== 阅读位置记忆 ===== */
var POS_KEY = "kb_readpos";
function savePos(){
  var pg = document.querySelector(".page.show");
  if (!pg) return;
  var hs = pg.querySelectorAll("h1[id],h2[id],h3[id]");
  var cur = null;
  for (var i = 0; i < hs.length; i++){
    if (hs[i].getBoundingClientRect().top <= 90) cur = hs[i]; else break;
  }
  if (!cur) return;
  var P = {}; try { P = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch(e){}
  if (P[currentLib] === cur.id) return;
  P[currentLib] = cur.id;
  try { localStorage.setItem(POS_KEY, JSON.stringify(P)); } catch(e){}
}
function hideResume(){ document.getElementById("resumeTip").classList.remove("show"); }
function showResume(i){
  var tip = document.getElementById("resumeTip");
  var P = {}; try { P = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch(e){}
  var pid = P[i];
  var el = pid ? document.getElementById(pid) : null;
  if (!el){ tip.classList.remove("show"); return; }
  tip.innerHTML = '📖 继续阅读：<a id="resumeLink">' + esc(el.textContent) + '</a><span class="x" onclick="hideResume()">×</span>';
  document.getElementById("resumeLink").onclick = function(){ jumpRef(pid); hideResume(); };
  tip.classList.add("show");
  clearTimeout(window._rt);
  window._rt = setTimeout(hideResume, 9000);
}

/* ===== 闪卡模式 ===== */
var FC = { queue: [], cur: null, flipped: false, total: 0, q: {} };
var FC_Q_KEY = "kb_fc_q";   /* 持久化闪卡题目缓存：{libId: {chunkId: question}} */
function getFcQAll(){ try { return JSON.parse(localStorage.getItem(FC_Q_KEY) || "{}"); } catch(e){ return {}; } }
function getFcQ(lib, id){ var M = getFcQAll(); return (M[lib] && M[lib][id]) || null; }
function setFcQ(lib, id, q){
  var M = getFcQAll();
  M[lib] = M[lib] || {};
  if (M[lib][id] && M[lib][id] !== q && M[lib][id].indexOf("请说明：") === 0) {
    /* 已有模板降级题，被真题覆盖 */
  }
  M[lib][id] = q;
  try { localStorage.setItem(FC_Q_KEY, JSON.stringify(M)); } catch(e){}
}
function fallbackQuestion(c){
  return "请说明：" + c.title + "（结合你的理解展开）";
}
function genCardQuestion(c, cb){
  var cached = getFcQ(c.lib, c.id);
  if (cached){ cb(cached); return; }
  callLLM([
    { role: "system", content: "你是面试出题官。根据给定知识点内容出一道简洁的面试/理解题。要求：只输出题目本身、一两句话、中文、不要答案不要解析。知识点标题：" + c.title + "\n内容：" + c.text.slice(0, 700) },
    { role: "user", content: "出题" }
  ], function(txt){
    var q = txt.trim().replace(/^[「『"]+|[」』"]+$/g, "");
    setFcQ(c.lib, c.id, q); cb(q);
  }, function(){
    var q = fallbackQuestion(c); setFcQ(c.lib, c.id, q); cb(q);
  });
}
function renderFront(c){
  var q = getFcQ(c.lib, c.id) || fallbackQuestion(c);
  document.getElementById("fcFront").innerHTML =
    '<span class="bc">' + esc(c.parent || "知识卡片") + "</span>" +
    '<div class="q">' + esc(q) + "</div>" +
    '<div class="h">' + (FC.flipped ? "" : "点击卡片查看答案") + "</div>";
}
/* 预热：为指定库批量生成所有闪卡题目并持久缓存 */
function libChunks(lib){
  if (!aiIndex) buildAiIndex();
  return aiIndex.filter(function(c){ return c.lib === lib && c.text.trim().length > 40 && c.id; });
}
function showWarmToast(lib, i, total){
  var t = document.getElementById("fcToast");
  var pct = total ? Math.round(i / total * 100) : 100;
  t.innerHTML = '⚡ 正在为「' + esc(libName(lib)) + '」生成闪卡题目<br>' + i + ' / ' + total +
    '<span class="bar"><i style="width:' + pct + '%"></i></span>';
  t.classList.add("show");
}
function hideWarmToast(){ document.getElementById("fcToast").classList.remove("show"); }
function warmupLib(lib, onDone){
  var chunks = libChunks(lib);
  var todo = chunks.filter(function(c){ return !getFcQ(c.lib, c.id); });
  if (!todo.length){ if (onDone) onDone(0, chunks.length); return; }
  var i = 0, total = todo.length;
  showWarmToast(lib, 0, total);
  function step(){
    if (i >= total){
      hideWarmToast();
      if (onDone) onDone(total, chunks.length);
      return;
    }
    showWarmToast(lib, i, total);
    var c = todo[i];
    genCardQuestion(c, function(){ i++; setTimeout(step, 150); });
  }
  step();
}
function warmupCurrent(){
  warmupLib(currentLib, function(gen, total){
    var cached = libChunks(currentLib).filter(function(c){ return !!getFcQ(c.lib, c.id); }).length;
    alert("预热完成 ✅ 本库共 " + total + " 个知识点，已缓存 " + cached + " 道题" + (gen ? "（本次新生成 " + gen + " 道）" : ""));
  });
}
function cardPool(){
  if (!aiIndex) buildAiIndex();
  return aiIndex.filter(function(c){ return c.lib === currentLib && c.text.trim().length > 40 && c.id; });
}
function startCards(){
  var pool = cardPool();
  if (!pool.length){ alert("当前知识库没有可做闪卡的内容"); return; }
  FC.queue = pool.slice();
  FC.total = pool.length;
  document.getElementById("fcMask").classList.add("show");
  nextCard();
}
function nextCard(){
  var info = document.getElementById("fcInfo");
  if (!FC.queue.length){
    FC.cur = null;
    info.textContent = "完成";
    document.getElementById("fcCard").classList.remove("flipped");
    document.getElementById("fcFront").innerHTML = '<div class="q">🎉 本轮闪卡全部完成！</div><div class="h">点右上角 × 退出，或点「🔁 再看一次」重新来一轮</div>';
    document.getElementById("fcBack").textContent = "";
    return;
  }
  FC.cur = FC.queue.shift();
  FC.flipped = false;
  var card = document.getElementById("fcCard");
  card.classList.remove("flipped");
  /* 先放"出题中"占位，避免空白，再异步生成真正的题目 */
  document.getElementById("fcFront").innerHTML =
    '<span class="bc">' + esc(FC.cur.parent || "知识卡片") + "</span>" +
    '<div class="q" style="color:var(--muted);font-size:16px"><span class="ai-typing"><i></i><i></i><i></i></span> 正在出题…</div>' +
    '<div class="h"></div>';
  var txt = FC.cur.text.trim();
  if (txt.length > 800) txt = txt.slice(0, 800) + "……";
  document.getElementById("fcBack").textContent = txt;
  info.textContent = "剩余 " + (FC.queue.length + 1) + " / 共 " + FC.total + " 张";
  var me = FC.cur;
  if (getFcQ(me.lib, me.id)){
    renderFront(me);
  } else {
    genCardQuestion(me, function(){ if (FC.cur === me) renderFront(me); });
  }
}
function flipCard(){
  if (!FC.cur) return;
  FC.flipped = !FC.flipped;
  document.getElementById("fcCard").classList.toggle("flipped", FC.flipped);
}
function cardKnow(){
  if (!FC.cur){ startCards(); return; }
  setDoneProgress(FC.cur.lib, FC.cur.id, true);
  nextCard();
}
function cardAgain(){
  if (!FC.cur){ startCards(); return; }
  FC.queue.push(FC.cur);
  nextCard();
}
function closeCards(){ document.getElementById("fcMask").classList.remove("show"); }
document.addEventListener("keydown", function(e){
  if (!document.getElementById("fcMask").classList.contains("show")) return;
  if (e.key === " "){ e.preventDefault(); flipCard(); }
  else if (e.key === "ArrowRight") cardKnow();
  else if (e.key === "ArrowLeft") cardAgain();
  else if (e.key === "Escape") closeCards();
});

/* ===== 出题考我 ===== */
var quiz = null;
function startQuiz(){
  if (quiz){ quiz = null; addMsg("bot", "已退出测验 🛑"); return; }
  var pool = cardPool();
  if (!pool.length){ addMsg("bot", "当前知识库没有可出题的内容。"); return; }
  var c = pool[Math.floor(Math.random() * pool.length)];
  quiz = c;
  var thinking = addMsg("bot", '<span class="ai-typing"><i></i><i></i><i></i></span>');
  callLLM([
    { role: "system", content: "你是面试官。根据给定知识点出一道面试题。只输出题目本身，一两句话，不要答案、不要解析。知识点标题：" + c.title + "\n内容：" + c.text.slice(0, 700) },
    { role: "user", content: "请出题" }
  ], function(txt){
    thinking.querySelector(".bub").innerHTML = "📝 <strong>考题</strong>：" + simpleMd(txt) + "<br><span style='font-size:12px;color:var(--muted)'>直接在下方输入你的回答，我会对照知识库评分；输入「退出」结束测验。</span>";
  }, function(){
    thinking.querySelector(".bub").innerHTML = "📝 <strong>考题</strong>：请谈谈「" + esc(c.title) + "」。<br><span style='font-size:12px;color:var(--muted)'>（AI 出题失败，已用章节标题作题）直接在下方作答；输入「退出」结束。</span>";
  });
}
function gradeAnswer(c, ans){
  aiBusy = true;
  document.getElementById("aiSend").disabled = true;
  var thinking = addMsg("bot", '<span class="ai-typing"><i></i><i></i><i></i></span>');
  callLLM([
    { role: "system", content: "你是面试考官。根据「标准要点」给考生回答打分。输出格式严格为四段：\n得分：X/100\n点评：（一两句）\n遗漏要点：（列点，没有就写「无」）\n参考要点：（列点）\n标准要点（来自知识点「" + c.title + "」）：\n" + c.text.slice(0, 900) },
    { role: "user", content: "考生回答：" + ans }
  ], function(txt){
    thinking.querySelector(".bub").innerHTML = simpleMd(txt) + '<span class="ref">📖 对照原文：<a onclick="jumpRef(\'' + c.id + '\')">' + esc(c.title) + "</a> · 点头部的 📝 再来一题</span>";
  }, function(){
    var txt = c.text.trim();
    if (txt.length > 320) txt = txt.slice(0, 320) + "……";
    thinking.querySelector(".bub").innerHTML = "AI 评分失败，请自查对照 👇<br><br><strong>参考内容</strong>（" + esc(c.title) + "）：<br>" + esc(txt);
  }, function(){
    aiBusy = false;
    document.getElementById("aiSend").disabled = false;
    document.getElementById("aiMsgs").scrollTop = document.getElementById("aiMsgs").scrollHeight;
  });
}

/* ===== 动手实践（正文内嵌，按知识点） ===== */
var PRAC_KEY = "kb_prac";   /* {lib: {secId: {task, code, verdict}}} */
function getPracAll(){ try { return JSON.parse(localStorage.getItem(PRAC_KEY) || "{}"); } catch(e){ return {}; } }
function savePracAll(p){ try { localStorage.setItem(PRAC_KEY, JSON.stringify(p)); } catch(e){} }
function getPrac(lib, id){ var P = getPracAll(); return (P[lib] && P[lib][id]) || null; }
function setPrac(lib, id, obj){ var P = getPracAll(); P[lib] = P[lib] || {}; P[lib][id] = obj; savePracAll(P); }
function chunkById(id){ if (!aiIndex) buildAiIndex(); for (var i = 0; i < aiIndex.length; i++) if (aiIndex[i].id === id) return aiIndex[i]; return null; }
function parsePracticeJSON(txt){
  if (!txt) return null;
  txt = txt.replace(/```json|```/g, "").trim();
  /* 1) 直接解析 */
  try { var j = JSON.parse(txt); if (j && typeof j === "object") return j; } catch (e){}
  /* 2) 取首个 { 到最后一个 } 之间的片段 */
  var s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  var sub = txt.slice(s, e + 1);
  /* 去尾随逗号后重试 */
  try { return JSON.parse(sub.replace(/,(\s*[}\]])/g, "$1")); } catch (x){}
  /* 3) 若仍失败，尝试补齐未闭合的字符串/括号（应对截断） */
  try {
    var t = sub, depth = 0, open = null;
    for (var i = 0; i < t.length; i++){
      var ch = t[i];
      if (ch === '"' && t[i-1] !== '\\'){ open = open ? null : '"'; }
      else if (!open){ if (ch === '{') depth++; else if (ch === '}') depth--; }
    }
    while (depth > 0){ t += "}"; depth--; }
    if (open) t += '"';
    return JSON.parse(t.replace(/,(\s*[}\]])/g, "$1"));
  } catch (y){ return null; }
}
/* 给每个 h3 知识点挂一个「🛠 实践」chip */
function addPracticeBtns(){
  document.querySelectorAll(".content h3[id]").forEach(function(h){
    if (h.querySelector(".h3-prac")) return;
    var b = document.createElement("span");
    b.className = "h3-prac"; b.textContent = "🛠 实践"; b.title = "为这个知识点生成动手实践";
    b.onclick = function(e){ e.preventDefault(); e.stopPropagation(); togglePractice(h.id, b); };
    h.appendChild(b);
  });
}
function togglePractice(id, btn){
  var h = document.getElementById(id);
  if (!h) return;
  var card = h.nextElementSibling;
  if (card && card.classList.contains("prac-card-wrap")){
    if (card.style.display === "none"){ card.style.display = ""; btn.classList.add("active"); if (card._monacoEditor) setTimeout(function(){ try { card._monacoEditor.layout(); } catch(e){} }, 30); }
    else { card.style.display = "none"; btn.classList.remove("active"); }
    return;
  }
  card = document.createElement("div");
  card.className = "prac-card-wrap";
  h.parentNode.insertBefore(card, h.nextSibling);
  btn.classList.add("active");
  var lib = pageOf(id);
  var cached = getPrac(lib, id);
  if (cached && cached.task){
    renderPracticeCard(card, id, cached);
  } else {
    card.innerHTML = '<div class="prac"><div class="pd"><span class="ai-typing"><i></i><i></i><i></i></span> 正在为该知识点生成实践模板…</div></div>';
    var c = chunkById(id);
    if (!c){ card.innerHTML = '<div class="prac"><div class="pd empty">未找到该知识点内容</div></div>'; return; }
    genPracticeTask(c, function(task){
      setPrac(lib, id, { task: task, code: task.skeleton || "", verdict: "" });
      renderPracticeCard(card, id, { task: task, code: task.skeleton || "", verdict: "" });
    }, function(msg, raw){
      var hint = /Failed to fetch|NetworkError|TypeError|加载|abort/i.test(msg)
        ? "<br><small style=\"color:var(--muted)\">多为浏览器跨域(CORS)拦截或网络问题。请务必通过「本地预览服务器」打开本页（不要直接双击 html 文件），并确认网络可访问 api.deepseek.com。</small>" : "";
      card.innerHTML = '<div class="prac"><div class="pd empty">⚠️ ' + esc(msg) + hint +
        '<br><br><button class="sub" onclick="retryPractice(\'' + id + '\')">重试</button></div></div>';
    });
  }
}
function genPracticeTask(c, onTask, onErr){
  var attempt = 0, max = 2;
  function go(){
    attempt++;
    callLLM([
      { role: "system", content: "你是技术导师。根据知识点设计一道动手实践题，让学习者写代码或写方案。严格只输出 JSON（不要任何 markdown、不要解释、不要代码块围栏 ```），直接以 { 开头、} 结尾。格式：{\"title\":\"题目\",\"desc\":\"题目描述与要求\",\"lang\":\"Java/Python/JavaScript/SQL/Shell/文本\",\"skeleton\":\"起始代码骨架\",\"points\":[\"考察点1\",\"考察点2\",\"考察点3\"],\"difficulty\":\"简单/中等/困难\"}。\n【skeleton 硬性要求】skeleton 必须是「不完整的脚手架」：只给出必要的 import、类/函数签名与清晰的中文 // TODO 注释（指明要补全哪里），绝对不要写出完整可运行的实现，也不要给出标准答案；学习者必须自己填入 TODO 处的核心逻辑，运行/评阅才会通过。若 lang 为 文本 或 SQL，skeleton 设为空字符串 \"\"（让学习者从零书写）。\n知识点标题：" + c.title + "\n内容：" + c.text.slice(0, 600) },
      { role: "user", content: "只输出 JSON，不要其他文字。" }
    ], function(txt){
      var t = parsePracticeJSON(txt);
      if (t && t.title) return onTask(t);
      if (attempt < max){ return setTimeout(go, 800); }
      onErr("模型未返回可解析的 JSON（已重试 " + attempt + " 次）", txt);
    }, function(estr){
      if (attempt < max){ return setTimeout(go, 800); }
      onErr("大模型调用失败：" + estr, "");
    });
  }
  go();
}
function retryPractice(id){
  var h = document.getElementById(id);
  var card = h && h.nextElementSibling;
  if (!card || !card.classList.contains("prac-card-wrap")) return;
  card.innerHTML = '<div class="prac"><div class="pd"><span class="ai-typing"><i></i><i></i><i></i></span> 正在重新生成实践模板…</div></div>';
  var c = chunkById(id);
  if (!c){ card.innerHTML = '<div class="prac"><div class="pd empty">未找到该知识点内容</div></div>'; return; }
  genPracticeTask(c, function(task){
    setPrac(lib, id, { task: task, code: task.skeleton || "", verdict: "" });
    renderPracticeCard(card, id, { task: task, code: task.skeleton || "", verdict: "" });
  }, function(msg, raw){
    var hint = /Failed to fetch|NetworkError|TypeError|加载|abort/i.test(msg)
      ? "<br><small style=\"color:var(--muted)\">多为浏览器跨域(CORS)拦截或网络问题。请通过本地预览服务器打开本页，并确认网络可访问 api.deepseek.com。</small>" : "";
    card.innerHTML = '<div class="prac"><div class="pd empty">⚠️ ' + esc(msg) + hint +
      '<br><br><button class="sub" onclick="retryPractice(\'' + id + '\')">重试</button></div></div>';
  });
}
function mapMonacoLang(lang){
  var L = (lang || "").toLowerCase();
  if (L.indexOf("typescript") >= 0) return "typescript";
  if (L.indexOf("json") >= 0) return "json";
  if (L.indexOf("python") >= 0) return "python";
  if (L.indexOf("javascript") >= 0) return "javascript";
  if (L.indexOf("java") >= 0) return "java";
  if (L.indexOf("sql") >= 0) return "sql";
  if (L.indexOf("go") >= 0) return "go";
  if (L.indexOf("html") >= 0) return "html";
  if (L.indexOf("js") >= 0) return "javascript";
  return "plaintext";
}
function getCodeVal(card){
  if (card._monacoEditor){ try { return card._monacoEditor.getValue(); } catch(e){} }
  var ta = card.querySelector("textarea.code"); return ta ? ta.value : "";
}
function startEdResize(e, grip){
  e.preventDefault();
  var card = grip.closest(".prac");
  if (!card) return;
  var mount = card.querySelector(".monaco-mount");
  var ta = card.querySelector("textarea.code");
  var target = null, startH = 0;
  if (mount && mount.style.display !== "none"){ target = mount; startH = mount.getBoundingClientRect().height; }
  else if (ta && ta.style.display !== "none"){ target = ta; startH = ta.getBoundingClientRect().height; }
  if (!target) return;
  var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
  var startY = pt.clientY;
  function mm(ev){
    var p = (ev.touches && ev.touches[0]) ? ev.touches[0] : ev;
    var h = Math.max(120, startH + (p.clientY - startY));
    target.style.height = h + "px";
    if (target === mount && card._monacoEditor){ try { card._monacoEditor.layout(); } catch(_){} }
  }
  function mu(){
    document.removeEventListener("mousemove", mm);
    document.removeEventListener("touchmove", mm);
    document.removeEventListener("mouseup", mu);
    document.removeEventListener("touchend", mu);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }
  document.body.style.userSelect = "none";
  document.body.style.cursor = "ns-resize";
  document.addEventListener("mousemove", mm);
  document.addEventListener("touchmove", mm, { passive: false });
  document.addEventListener("mouseup", mu);
  document.addEventListener("touchend", mu);
}
function registerKbCompletions(){
  if (window.__kbCompletionsRegistered){ return; }
  window.__kbCompletionsRegistered = true;
  var ANN = ["@Override","@Deprecated","@SuppressWarnings","@FunctionalInterface","@SafeVarargs","@Test","@Before","@After","@BeforeEach","@AfterEach","@BeforeAll","@AfterAll","@Ignore","@DisplayName","@ParameterizedTest","@RepeatedTest","@SpringBootApplication","@EnableAutoConfiguration","@ComponentScan","@Configuration","@Component","@Service","@Repository","@Controller","@RestController","@ControllerAdvice","@RestControllerAdvice","@RequestMapping","@GetMapping","@PostMapping","@PutMapping","@DeleteMapping","@PatchMapping","@ExceptionHandler","@RequestParam","@PathVariable","@RequestBody","@ResponseBody","@RequestHeader","@ModelAttribute","@CookieValue","@RequestPart","@Autowired","@Qualifier","@Value","@Bean","@Primary","@Lazy","@Scope","@Profile","@PropertySource","@Import","@ConditionalOnProperty","@ConditionalOnMissingBean","@ConditionalOnClass","@Entity","@Table","@Id","@GeneratedValue","@Column","@ManyToOne","@OneToMany","@OneToOne","@ManyToMany","@JoinColumn","@JoinTable","@Transient","@Embedded","@Embeddable","@MappedSuperclass","@NotNull","@NotEmpty","@NotBlank","@Size","@Pattern","@Email","@Min","@Max","@Positive","@Future","@Past","@DecimalMin","@DecimalMax","@Transactional","@Modifying","@Scheduled","@Async","@EventListener","@Cacheable","@CacheEvict","@CachePut","@EnableCaching","@EnableScheduling","@EnableAsync","@Data","@Getter","@Setter","@NoArgsConstructor","@AllArgsConstructor","@RequiredArgsConstructor","@Builder","@ToString","@EqualsAndHashCode","@Slf4j","@Log","@Log4j2","@Accessors","@JsonProperty","@JsonIgnore","@JsonInclude","@JsonFormat","@JsonSerialize","@JsonDeserialize","@Mapper","@Select","@Insert","@Update","@Delete","@Param","@Results","@Result","@ResultMap","@Options","@SelectProvider","@UpdateProvider","@CrossOrigin","@ResponseStatus","@PreAuthorize","@PostAuthorize","@Secured","@EnableWebSecurity","@DateTimeFormat","@NumberFormat","@Valid","@Validated","@InitBinder"];
  var KW = ["public","private","protected","static","final","abstract","class","interface","enum","extends","implements","new","return","if","else","for","while","do","switch","case","break","continue","default","try","catch","finally","throw","throws","import","package","void","int","long","double","float","boolean","char","byte","short","this","super","synchronized","volatile","transient","instanceof","var","record","sealed","permits","yield","assert"];
  var CLS = ["Object","String","Integer","Long","Double","Float","Boolean","Character","Byte","Short","StringBuilder","StringBuffer","List","ArrayList","LinkedList","Map","HashMap","TreeMap","LinkedHashMap","Set","HashSet","TreeSet","LinkedHashSet","Collection","Queue","Deque","PriorityQueue","Stack","Vector","Arrays","Collections","Math","System","Runtime","Optional","Objects","Thread","Runnable","Callable","ExecutorService","Executors","Future","ScheduledExecutorService","ThreadPoolExecutor","ReentrantLock","Semaphore","CountDownLatch","CyclicBarrier","AtomicInteger","ConcurrentHashMap","Iterable","Iterator","Comparable","Comparator","Stream","Collectors","Exception","RuntimeException","NullPointerException","IllegalArgumentException","IllegalStateException","IOException","ClassNotFoundException","InterruptedException","SQLException","ParseException","Function","Predicate","Consumer","Supplier","BiFunction","UnaryOperator","Class","ClassLoader","Method","Field","Constructor","ApplicationContext","BeanFactory","CommandLineRunner","InitializingBean","BeanPostProcessor","LocalDate","LocalDateTime","DateTimeFormatter","BigDecimal","BigInteger","UUID","Random"];
  var langs = ["java","kotlin","typescript","javascript","python","go","sql","html","plaintext"];
  var K = monaco.languages.CompletionItemKind;
  langs.forEach(function(lang){
    try {
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ["@"],
        provideCompletionItems: function(model, position){
          var line = model.getLineContent(position.lineNumber);
          var before = line.substring(0, position.column - 1);
          var m = before.match(/(@)([A-Za-z_]*)$/);
          var startCol;
          if (m){
            startCol = position.column - m[0].length;
          } else {
            var w = model.getWordUntilPosition(position);
            startCol = w.startColumn;
          }
          var range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, position.column);
          var items = [];
          ANN.forEach(function(a){
            items.push({ label: a, kind: K.Property, insertText: a, detail: "注解 (annotation)", range: range, sortText: "0" + a });
          });
          KW.forEach(function(k){
            items.push({ label: k, kind: K.Keyword, insertText: k, detail: "关键字", range: range, sortText: "1" + k });
          });
          CLS.forEach(function(c){
            items.push({ label: c, kind: K.Class, insertText: c, detail: "类 / 类型", range: range, sortText: "2" + c });
          });
          return { suggestions: items };
        }
      });
    } catch(e){}
  });
}
/* ===== KB-LSP：浏览器端 Java 语言服务器客户端（手写 JSON-RPC over WebSocket） =====
   仅当在 ⚙ 里配置了本地 LSP 后端（jdtls 桥接）并连接成功后，才会接管补全/悬浮/诊断；
   未连接时所有 provider 返回空，自动回退到 kb-dark 静态补全，不影响使用。 */
var LSP = { ws: null, ready: false, caps: null, nextId: 1, pending: {}, docs: {}, modelOf: {}, url: null };
var LSP_WS_KEY = "kb_lsp_ws";
function lspSetStatus(s){ var el = document.getElementById("lspStatus"); if (el) el.textContent = s; }
function lspInit(){
  var url = ""; try { url = localStorage.getItem(LSP_WS_KEY) || ""; } catch(e){}
  if (url){ LSP.url = url; lspConnect(url); }
}
function lspConnect(url){
  if (!url){ lspSetStatus("未填写地址"); return; }
  if (LSP.ws && (LSP.ws.readyState === 0 || LSP.ws.readyState === 1)){ try { LSP.ws.close(); } catch(e){} }
  LSP.url = url; lspSetStatus("连接中…");
  var ws; try { ws = new WebSocket(url); } catch(e){ lspSetStatus("地址无效"); return; }
  LSP.ws = ws;
  ws.onopen = function(){
    lspSend("initialize", lspInitParams()).then(function(res){
      LSP.caps = res && res.capabilities;
      return lspSend("initialized", {}, true);
    }).then(function(){
      LSP.ready = true; lspSetStatus("已连接 ✓");
      Object.keys(LSP.docs).forEach(function(uri){
        var d = LSP.docs[uri];
        lspSend("textDocument/didOpen", { textDocument: { uri: uri, languageId: d.languageId, version: d.version, text: d.text } }, true).catch(function(){});
      });
    }).catch(function(err){ LSP.ready = false; lspSetStatus("初始化失败：" + ((err && err.message) || err)); });
  };
  ws.onmessage = function(ev){
    var msg; try { msg = JSON.parse(ev.data); } catch(e){ return; }
    if (msg.id !== undefined && msg.id !== null && LSP.pending[msg.id]){
      var p = LSP.pending[msg.id]; delete LSP.pending[msg.id];
      if (msg.error) p.reject(new Error((msg.error.message) || "LSP error")); else p.resolve(msg.result);
      return;
    }
    if (msg.method) lspHandleNotification(msg);
  };
  ws.onerror = function(){ LSP.ready = false; lspSetStatus("连接错误"); };
  ws.onclose = function(){ LSP.ready = false; lspSetStatus("已断开"); };
}
function lspInitParams(){
  return {
    processId: null, rootUri: "file:///kb-workspace", rootPath: "/kb-workspace",
    capabilities: {
      textDocument: {
        completion: { contextSupport: true, completionItem: { snippetSupport: true, documentationFormat: ["markdown","plaintext"], insertReplaceSupport: true } },
        hover: { contentFormat: ["markdown","plaintext"] },
        publishDiagnostics: { relatedInformation: true },
        synchronization: { didSave: true, willSave: true }
      },
      workspace: { workspaceFolders: true, configuration: true }
    },
    workspaceFolders: [{ uri: "file:///kb-workspace", name: "kb-workspace" }]
  };
}
function lspSend(method, params, isNotify){
  return new Promise(function(resolve, reject){
    if (!LSP.ws || LSP.ws.readyState !== 1){ reject(new Error("not connected")); return; }
    var msg = { jsonrpc: "2.0", method: method };
    if (!isNotify) msg.id = LSP.nextId++;
    if (params !== undefined) msg.params = params;
    if (!isNotify) LSP.pending[msg.id] = { resolve: resolve, reject: reject };
    try { LSP.ws.send(JSON.stringify(msg)); } catch(e){ if (!isNotify) reject(e); }
    if (isNotify) resolve();
  });
}
function lspHandleNotification(msg){
  var m = msg.method, p = msg.params || {};
  if (m === "textDocument/publishDiagnostics"){ lspShowDiagnostics(p); return; }
  /* window/logMessage、client/registerCapability 等忽略 */
}
function lspDocOpen(model, languageId, text){
  var uri = model.uri.toString();
  LSP.docs[uri] = { version: 1, languageId: languageId, text: text };
  LSP.modelOf[uri] = model;
  if (LSP.ready) lspSend("textDocument/didOpen", { textDocument: { uri: uri, languageId: languageId, version: 1, text: text } }, true).catch(function(){});
}
function lspDocChange(model, text){
  var uri = model.uri.toString(); var d = LSP.docs[uri];
  if (!d) return; d.version++; d.text = text;
  if (LSP.ready) lspSend("textDocument/didChange", { textDocument: { uri: uri, version: d.version }, contentChanges: [{ text: text }] }, true).catch(function(){});
}
function lspDocClose(model){
  var uri = model.uri.toString();
  if (LSP.docs[uri]){
    if (LSP.ready) lspSend("textDocument/didClose", { textDocument: { uri: uri } }, true).catch(function(){});
    delete LSP.docs[uri]; delete LSP.modelOf[uri];
  }
}
function lspCompletion(model, position, ctx){
  return new Promise(function(resolve){
    var uri = model.uri.toString();
    if (!LSP.ready || !LSP.docs[uri]){ resolve({ suggestions: [] }); return; }
    var params = { textDocument: { uri: uri }, position: { line: position.lineNumber - 1, character: position.column - 1 } };
    if (ctx){ params.context = { triggerKind: ctx.triggerKind || 1 }; if (ctx.triggerCharacter) params.context.triggerCharacter = ctx.triggerCharacter; }
    lspSend("textDocument/completion", params).then(function(res){
      var items = Array.isArray(res) ? res : (res && res.items ? res.items : []);
      resolve({ suggestions: items.map(function(it){ return lspToMonacoItem(it, model, position); }) });
    }).catch(function(){ resolve({ suggestions: [] }); });
  });
}
function lspHover(model, position){
  return new Promise(function(resolve){
    var uri = model.uri.toString();
    if (!LSP.ready || !LSP.docs[uri]){ resolve(null); return; }
    lspSend("textDocument/hover", { textDocument: { uri: uri }, position: { line: position.lineNumber - 1, character: position.column - 1 } })
      .then(function(res){ resolve(res || null); }).catch(function(){ resolve(null); });
  });
}
function lspToMonacoTextEdit(te){
  return { range: new monaco.Range(te.range.start.line+1, te.range.start.character+1, te.range.end.line+1, te.range.end.character+1), text: te.newText };
}
function lspToMonacoItem(it, model, position){
  var label = (typeof it.label === "string") ? it.label : ((it.label && it.label.label) || "");
  var detail = it.detail || ((it.label && it.label.detail) || "");
  var doc = ""; if (it.documentation){ doc = (typeof it.documentation === "string") ? it.documentation : (it.documentation.value || ""); }
  var insertText = it.insertText || label;
  var range = null;
  if (it.textEdit && it.textEdit.range){
    range = new monaco.Range(it.textEdit.range.start.line+1, it.textEdit.range.start.character+1, it.textEdit.range.end.line+1, it.textEdit.range.end.character+1);
    insertText = it.textEdit.newText;
  }
  if (!range){
    var col = position.column;
    var line = model.getLineContent(position.lineNumber);
    var at = line.substring(0, col-1).match(/@([A-Za-z_]*)$/);
    var startCol = at ? (col - at[0].length) : model.getWordUntilPosition(position).startColumn;
    range = new monaco.Range(position.lineNumber, startCol, position.lineNumber, col);
  }
  var kind = (typeof it.kind === "number" && it.kind >= 1 && it.kind <= 25) ? it.kind : 1;
  var item = { label: label, kind: kind, detail: detail, documentation: doc ? { value: doc } : undefined, insertText: insertText, range: range, sortText: it.sortText || label, filterText: it.filterText || label, preselect: !!it.preselect, commitCharacters: it.commitCharacters };
  if (it.insertTextFormat === 2) item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  if (it.additionalTextEdits){ try { item.additionalTextEdits = it.additionalTextEdits.map(lspToMonacoTextEdit); } catch(e){} }
  return item;
}
function lspShowDiagnostics(p){
  var model = LSP.modelOf[p.uri]; if (!model) return;
  var markers = (p.diagnostics || []).map(function(dg){
    var r = dg.range;
    return { severity: (dg.severity === 1) ? monaco.MarkerSeverity.Error : ((dg.severity === 2) ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info), message: dg.message, startLineNumber: r.start.line+1, startColumn: r.start.character+1, endLineNumber: r.end.line+1, endColumn: r.end.character+1 };
  });
  try { monaco.editor.setModelMarkers(model, "lsp", markers); } catch(e){}
}
function lspRegisterProviders(){
  if (window.__kbLspProviders) return; window.__kbLspProviders = true;
  var langs = ["java","kotlin","typescript","javascript","python","go","sql","html","plaintext"];
  langs.forEach(function(lang){
    try {
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: [".", "@"],
        provideCompletionItems: function(model, position, context){ return lspCompletion(model, position, context); }
      });
    } catch(e){}
    try {
      monaco.languages.registerHoverProvider(lang, {
        provideHover: function(model, position){
          return lspHover(model, position).then(function(res){
            if (!res || !res.contents) return null;
            var c = res.contents;
            var value = (typeof c === "string") ? c : (c.value || (Array.isArray(c) ? c.join("\n") : ""));
            return { contents: [{ value: value }] };
          });
        }
      });
    } catch(e){}
  });
}
function lspConnectBtn(){
  var v = ""; try { v = (document.getElementById("lspWs")||{}).value || ""; } catch(e){}
  v = (v || "").trim();
  if (!v){ lspSetStatus("请填写 ws 地址"); return; }
  try { localStorage.setItem(LSP_WS_KEY, v); } catch(e){}
  lspConnect(v);
}
function lspDisconnectBtn(){ if (LSP.ws){ try { LSP.ws.close(); } catch(e){} LSP.ws = null; } LSP.ready = false; lspSetStatus("已断开"); }
var __monacoState = 0, __monacoCbs = [];
var MONACO_CDNS = [
  "./vendor/monaco/min",
  "https://registry.npmmirror.com/monaco-editor/0.52.2/files/min",
  "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min",
  "https://unpkg.com/monaco-editor@0.52.2/min"
];
function ensureMonaco(cb){
  if (__monacoState === 2){ cb(true); return; }
  if (__monacoState === 3){ cb(false); return; }
  if (__monacoState === 1){ __monacoCbs.push(cb); return; }
  __monacoState = 1; __monacoCbs.push(cb);
  (function tryIdx(i){
    if (i >= MONACO_CDNS.length){ failMonaco(); return; }
    var CDN = MONACO_CDNS[i];
    try {
      window.MonacoEnvironment = { getWorkerUrl: function(){
        return "data:text/javascript;charset=utf-8," + encodeURIComponent(
          "self.MonacoEnvironment={baseUrl:'" + CDN + "/'};importScripts('" + CDN + "/vs/base/worker/workerMain.js');"
        );
      }};
    } catch(e){}
    var s = document.createElement("script");
    s.src = CDN + "/vs/loader.js";
    s.onload = function(){
      try {
        require.config({ paths: { vs: CDN + "/vs" } });
        require.onError = function(){ failMonaco(); };
        require(["vs/editor/editor.main"], function(){
          __monacoState = 2;
          try { registerKbCompletions(); } catch(e){}
          try { lspRegisterProviders(); } catch(e){}
          __monacoCbs.forEach(function(f){ try { f(true); } catch(e){} });
          __monacoCbs = [];
        });
      } catch(e){ tryIdx(i + 1); }
    };
    s.onerror = function(){ tryIdx(i + 1); };
    document.head.appendChild(s);
  })(0);
}
function failMonaco(){
  __monacoState = 3;
  __monacoCbs.forEach(function(f){ try { f(false); } catch(e){} });
  __monacoCbs = [];
}
function mountMonaco(card, id, code, lang){
  var mount = card.querySelector(".monaco-mount");
  if (!mount) return;
  ensureMonaco(function(ok){
    if (!ok || !mount.isConnected){
      if (mount) mount.style.display = "none";
      var t0 = card.querySelector("textarea.code"); if (t0) t0.style.display = "";
      return;
    }
    try {
      try { monaco.editor.defineTheme('kb-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editorSuggestWidget.background': '#252526',
          'editorSuggestWidget.border': '#454545',
          'editorSuggestWidget.foreground': '#e6e6e6',
          'editorSuggestWidget.highlightForeground': '#4ec9b0',
          'editorSuggestWidget.selectedBackground': '#094771',
          'editorSuggestWidget.focusHighlightForeground': '#4ec9b0',
          'list.hoverBackground': '#2a2d2e',
          'list.focusBackground': '#094771',
          'list.activeSelectionBackground': '#094771',
          'list.focusForeground': '#ffffff',
          'list.highlightForeground': '#4ec9b0',
          'list.foreground': '#e6e6e6'
        }
      }); } catch(e){}
      if (card._monacoEditor){ try { lspDocClose(card._monacoEditor); } catch(e){} try { card._monacoEditor.dispose(); } catch(e){} }
      var ed = monaco.editor.create(mount, {
        value: code, language: mapMonacoLang(lang), theme: "kb-dark",
        fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false,
        automaticLayout: true, tabSize: 4, insertSpaces: true,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        padding: { top: 8, bottom: 6 }, lineNumbersMinChars: 3,
        renderLineHighlight: "line", wordWrap: "on",
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
      });
      card._monacoEditor = ed;
      try { var L0 = ed.getModel(); if (L0) lspDocOpen(L0, mapMonacoLang(lang), code); } catch(e){}
      ed.onDidChangeModelContent(function(){
        var val = ed.getValue();
        var t = card.querySelector("textarea.code"); if (t) t.value = val;
        var task = card._pracTask;
        var d = getPrac(pageOf(id), id) || { task: task };
        d.task = task; d.code = val;
        var vd = card.querySelector(".verdict"); d.verdict = vd ? (vd.innerHTML || "") : "";
        setPrac(pageOf(id), id, d);
        try { var m1 = ed.getModel(); if (m1) lspDocChange(m1, val); } catch(e){}
      });
    } catch(e){
      if (mount) mount.style.display = "none";
      var t = card.querySelector("textarea.code"); if (t) t.style.display = "";
    }
  });
}
function attachTaFallback(ta, card, id, lib, task){
  ta.addEventListener("keydown", function(e){
    if (e.isComposing || e.metaKey || e.ctrlKey) return;
    var v = this.value, s = this.selectionStart, en = this.selectionEnd;
    if (e.key === "Tab"){
      e.preventDefault();
      this.value = v.slice(0, s) + "    " + v.slice(en);
      this.selectionStart = this.selectionEnd = s + 4;
      this.dispatchEvent(new Event("input"));
      return;
    }
    var pair = { "{":"}", "(":")", "[":"]", "\"":"\"", "'":"'", "`":"`" };
    if (pair[e.key]){
      var nx = v[en];
      if ((nx && /[\w]/.test(nx)) || nx === pair[e.key]) return;
      e.preventDefault();
      var sel = v.slice(s, en);
      if (sel){
        this.value = v.slice(0, s) + e.key + sel + pair[e.key] + v.slice(en);
        this.selectionStart = this.selectionEnd = s + 1 + sel.length;
      } else {
        this.value = v.slice(0, s) + e.key + pair[e.key] + v.slice(en);
        this.selectionStart = this.selectionEnd = s + 1;
      }
      this.dispatchEvent(new Event("input"));
      return;
    }
    var close = { "}":"{", ")":"(", "]":"[" };
    if (close[e.key] && s === en && v[s] === e.key){
      e.preventDefault();
      this.selectionStart = this.selectionEnd = s + 1;
      return;
    }
    if (e.key === "Backspace" && s === en && s > 0){
      var pm = { "{":"}", "(":")", "[":"]", "\"":"\"", "'":"'" };
      if (pm[v[s-1]] === v[s]){
        e.preventDefault();
        this.value = v.slice(0, s-1) + v.slice(s+1);
        this.selectionStart = this.selectionEnd = s - 1;
        this.dispatchEvent(new Event("input"));
        return;
      }
    }
    if (e.key === "Enter"){
      e.preventDefault();
      var ls = v.lastIndexOf("\n", s - 1) + 1;
      var ind = (v.slice(ls, s).match(/^[ \t]*/) || [""])[0];
      var tail = v.slice(0, s).replace(/\s+$/, "").slice(-1);
      var extra = (tail === "{" || tail === "(" || tail === "[") ? "    " : "";
      var ins = "\n" + ind + extra;
      this.value = v.slice(0, s) + ins + v.slice(en);
      this.selectionStart = this.selectionEnd = s + ins.length;
      this.dispatchEvent(new Event("input"));
      return;
    }
  });
  ta.addEventListener("input", function(){
    var d = getPrac(lib, id) || { task: task };
    d.task = task; d.code = ta.value; var vd = card.querySelector(".verdict"); d.verdict = vd ? (vd.innerHTML || "") : "";
    setPrac(lib, id, d);
  });
}
function renderPracticeCard(card, id, data){
  var task = data.task, code = data.code || task.skeleton || "", verdict = data.verdict || "";
  var lib = pageOf(id);
  var pts = (task.points || []).map(function(p){ return "<li>" + esc(p) + "</li>"; }).join("");
  card.innerHTML = '<div class="prac">' +
    '<div class="ph"><div class="pt">🛠 ' + esc(task.title || "动手实践") + '</div><div class="pm">' + esc(task.lang || "代码") + " · " + esc(task.difficulty || "") + "</div></div>" +
    '<div class="pd"><div class="lab">题目</div>' + esc(task.desc || "") + (pts ? '<div class="lab">考察点</div><ul>' + pts + "</ul>" : "") + "</div>" +
    '<div class="ed"><div class="lh"><span>' + esc(task.lang || "code") + '</span><span>Monaco 编辑器 · 语法高亮 · 自动保存</span></div><div class="monaco-mount" id="mm-' + id + '"></div><textarea class="code" spellcheck="false" style="display:none"></textarea><div class="ed-grip" onmousedown="startEdResize(event,this)" ontouchstart="startEdResize(event,this)" title="拖动调整高度"> </div></div>' +
    '<div class="acts"><button class="run" onclick="runPracticeInline(\'' + id + '\')">▶ 运行</button><button class="hint-btn" onclick="hintPracticeInline(\'' + id + '\')">💡 提示</button><button class="ans-btn" onclick="answerPracticeInline(\'' + id + '\')">🔑 答案</button><button class="sub" onclick="submitPracticeInline(\'' + id + '\')">提交评阅</button></div>' +
    '<div class="term" style="display:none"></div>' +
    '<div class="hint" style="display:none"></div>' +
    '<div class="answer" style="display:none"></div>' +
    (verdict ? '<div class="verdict">' + verdict + "</div>" : '<div class="verdict" style="display:none"></div>') +
    "</div>";
  var ta = card.querySelector("textarea.code");
  if (ta) ta.value = code;
  card._pracTask = task;
  if (ta) attachTaFallback(ta, card, id, lib, task);
  mountMonaco(card, id, code, task.lang);
  card.dataset.sec = id;
}
function hintPracticeInline(id){
  var h = document.getElementById(id);
  var card = h && h.nextElementSibling;
  if (!card || !card.classList.contains("prac-card-wrap")) return;
  var box = card.querySelector(".hint");
  if (!box) return;
  var lib = pageOf(id);
  var d = getPrac(lib, id);
  if (!d || !d.task){ alert("题目未就绪"); return; }
  var task = d.task, c = chunkById(id);
  if (d.hint && d.hint.replace(/<[^>]*>/g, "").trim()){ box.style.display = "block"; box.innerHTML = d.hint; box.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  box.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> 正在生成解题提示…';
  var sys = "你是耐心导师。学习者面对下面这道实践题卡住了，需要解题提示。严格做到：【绝对不要给出完整代码，也不要直接给标准答案】。请只提供：(1) 思路点拨（从哪入手、用何种数据结构/API/算法）(2) 关键步骤拆解（分步说明要点，每步只讲做什么、不写实现）(3) 易错点提醒 (4) 可参考的知识点。简洁中文，用有序列表。";
  callLLM([
    { role: "system", content: sys },
    { role: "user", content: "题目：" + (task.title || "") + "\n描述：" + (task.desc || "") + "\n考察点：" + JSON.stringify(task.points || []) + (c ? "\n参考知识（来自知识点「" + c.title + "」）：\n" + c.text.slice(0, 800) : "") + "\n请给出解题提示（不要答案）。" }
  ], function(txt){
    txt = (txt || "").trim();
    if (!txt) txt = "（模型返回空内容，请检查 API Key / 模型名是否有效，或换个模型重试）";
    var html = "<h5>思路点拨（非标准答案）</h5>" + simpleMd(txt);
    box.innerHTML = html;
    var dd = getPrac(lib, id) || { task: task };
    dd.task = task; dd.code = getCodeVal(card);
    dd.verdict = card.querySelector(".verdict").innerHTML || "";
    dd.hint = html;
    setPrac(lib, id, dd);
  }, function(err){
    box.innerHTML = "提示生成失败：" + esc(err);
  });
}
function answerPracticeInline(id){
  var h = document.getElementById(id);
  var card = h && h.nextElementSibling;
  if (!card || !card.classList.contains("prac-card-wrap")) return;
  var box = card.querySelector(".answer");
  if (!box) return;
  var lib = pageOf(id);
  var d = getPrac(lib, id);
  if (!d || !d.task){ alert("题目未就绪"); return; }
  var task = d.task, c = chunkById(id);
  if (d.answer && d.answer.replace(/<[^>]*>/g, "").trim()){ box.style.display = "block"; box.innerHTML = d.answer; return; }
  box.style.display = "block";
  box.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> 正在生成参考答案…';
  var sys = "你是严谨的编程导师。下面是一道实践题，请直接给出【完整可运行的参考答案】（包含必要的 import、函数/类完整实现、以及能体现结果的主流程/main）。要求：(1) 代码必须正确、可直接运行，用代码块包裹 (2) 代码后附 2-4 句关键思路说明（不要剧透式逐行讲解，只点明核心技巧/易错点）。用中文。语言与题目一致：" + (task.lang || "代码") + "。";
  callLLM([
    { role: "system", content: sys },
    { role: "user", content: "题目：" + (task.title || "") + "\n描述：" + (task.desc || "") + "\n考察点：" + JSON.stringify(task.points || []) + (c ? "\n参考知识（来自知识点「" + c.title + "」）：\n" + c.text.slice(0, 800) : "") + "\n请给出完整参考答案（代码 + 关键思路）。" }
  ], function(txt){
    txt = (txt || "").trim();
    if (!txt) txt = "（模型返回空内容，请检查 API Key / 模型名是否有效，或换个模型重试）";
    var html = "<h5>🔑 参考答案（完整实现）</h5>" + simpleMd(txt) + '<div class="note">提示：先自己写，再看答案对照思路～</div>';
    box.innerHTML = html;
    var dd = getPrac(lib, id) || { task: task };
    dd.task = task; dd.code = getCodeVal(card);
    dd.verdict = card.querySelector(".verdict").innerHTML || "";
    // 不要从当前 DOM 覆盖 hint 缓存，避免把空/加载态写回 localStorage
    if (!dd.hint) dd.hint = "";
    dd.answer = html;
    setPrac(lib, id, dd);
  }, function(err){
    box.innerHTML = "答案生成失败：" + esc(err);
  });
}
function submitPracticeInline(id){
  var h = document.getElementById(id);
  var card = h && h.nextElementSibling;
  if (!card || !card.classList.contains("prac-card-wrap")) return;
  var code = getCodeVal(card);
  var lib = pageOf(id);
  var d = getPrac(lib, id);
  if (!d || !d.task){ alert("题目未就绪"); return; }
  var task = d.task, c = chunkById(id), v = card.querySelector(".verdict");
  v.style.display = "block"; v.className = "verdict";
  v.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> AI 评阅中…';
  var sys = "你是代码评审。评阅用户的实践作答。题目：" + (task.title || "") +
    "\n描述：" + (task.desc || "") +
    "\n考察点：" + JSON.stringify(task.points || []) +
    (c ? "\n参考知识（来自知识点「" + c.title + "」）：\n" + c.text.slice(0, 900) : "") +
    "\n用户代码：\n" + code;
  callLLM([
    { role: "system", content: sys },
    { role: "user", content: "请评阅。输出第一行必须是「结论：通过」或「结论：不通过」；然后给出：2) 问题与修复建议 3) 优化建议 4) 参考实现（用代码块）。简洁中文。" }
  ], function(txt){
    var pass = /^\s*结论[:：]\s*通过/.test(txt) && !/不通过/.test(txt.split("\n")[0]);
    v.className = "verdict " + (pass ? "pass" : "fail");
    v.innerHTML = (pass ? "✅ <b>通过</b><br>" : "❌ <b>未通过</b><br>") + simpleMd(txt);
    var dd = getPrac(lib, id) || { task: task };
    dd.task = task; dd.code = code; dd.verdict = v.innerHTML;
    setPrac(lib, id, dd);
  }, function(err){
    v.className = "verdict fail";
    v.innerHTML = "评阅失败：" + esc(err);
  });
}
/* 运行按钮：按语言分流——Python 真跑(Pyodide)、JavaScript 真跑(沙箱)、其余 AI 模拟 */
function runPracticeInline(id){
  var h = document.getElementById(id);
  var card = h && h.nextElementSibling;
  if (!card || !card.classList.contains("prac-card-wrap")) return;
  var term = card.querySelector(".term");
  if (!term) return;
  var code = getCodeVal(card);
  var d = getPrac(pageOf(id), id);
  if (!d || !d.task){ alert("题目未就绪"); return; }
  var task = d.task, lang = task.lang || "代码";
  var L = lang.toLowerCase();
  if (L.indexOf("python") >= 0) return runPy(code, term, task);
  if (L.indexOf("javascript") >= 0 || L.indexOf("js") >= 0) return runJs(code, term);
  return runAiSim(code, term, task, lang);
}
function runJs(code, term){
  term.style.display = "block"; term.className = "term";
  term.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> JavaScript 运行中…';
  var logs = [];
  var cap = { log:function(){ logs.push(Array.prototype.slice.call(arguments).join(" ")); },
              error:function(){ logs.push("[err] " + Array.prototype.slice.call(arguments).join(" ")); },
              warn:function(){}, info:function(){} };
  try {
    var fn = new Function("console", code);
    fn(cap);
    term.className = "term has-out";
    term.innerHTML = '<div class="term-h"><span>●</span> 运行结果（JavaScript 真运行）</div><pre>' + esc(logs.join("\n")) + "</pre>";
  } catch (e){
    term.className = "term has-out";
    term.innerHTML = '<div class="term-h"><span>●</span> 运行出错</div><pre>' + esc(String(e)) + "</pre>";
  }
}
var _py = null;
function runPy(code, term, task){
  term.style.display = "block"; term.className = "term";
  term.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> Python 运行中…';
  function exec(py){
    var out = [];
    try {
      py.setStdout({ batched: function(s){ out.push(s); } });
      py.setStderr({ batched: function(s){ out.push(s); } });
      py.runPython(code);
      term.className = "term has-out";
      term.innerHTML = '<div class="term-h"><span>●</span> 运行结果（Python 真运行）</div><pre>' + esc(out.join("")) + "</pre>";
    } catch (e){
      term.className = "term has-out";
      term.innerHTML = '<div class="term-h"><span>●</span> 运行出错</div><pre>' + esc(String(e)) + "</pre>";
    }
  }
  if (_py) return exec(_py);
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
  s.onload = function(){
    if (typeof loadPyodide !== "function"){ return fallbackPy(code, term, task); }
    loadPyodide().then(function(py){ _py = py; exec(py); }).catch(function(){ fallbackPy(code, term, task); });
  };
  s.onerror = function(){ fallbackPy(code, term, task); };
  document.head.appendChild(s);
}
function fallbackPy(code, term, task){
  // Pyodide 加载失败（多为网络访问不了 CDN）→ 自动回退 AI 模拟
  runAiSim(code, term, task, (task && task.lang) || "Python");
}
function runAiSim(code, term, task, lang){
  term.style.display = "block"; term.className = "term";
  term.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> AI 模拟运行中…';
  var sys = "你是 " + lang + " 语言的运行环境/解释器。用户提交了一段针对题目的实现，请严格按语言语义模拟执行，只输出程序运行后的真实结果，不要解释、不要给出修正后的代码。";
  callLLM([
    { role: "system", content: sys },
    { role: "user", content: "请运行以下" + lang + "代码：\n```\n" + code + "\n```\n题目背景：" + (task ? task.title : "") + "。" + (task ? task.desc : "") + "\n只按下面格式输出（去掉 ``` 代码块围栏）：\n输出：\n<程序真实会打印到标准输出的内容，逐字还原；若无任何输出写（无输出）>\n若代码有编译/运行时错误，再追加一行：\n错误：\n<具体的错误信息>" }
  ], function(txt){
    txt = txt.replace(/```/g, "").trim();
    term.className = "term has-out";
    term.innerHTML = '<div class="term-h"><span>●</span> 运行结果（AI 模拟）</div><pre>' + esc(txt) + "</pre>";
  }, function(err){
    term.className = "term has-out";
    term.innerHTML = '<div class="term-h"><span>●</span> 运行失败</div><pre>' + esc(err) + "</pre>";
  });
}

/* ===== AI 学习计划（替换原背题功能） ===== */
function openPlan(){
  var sel = document.getElementById("planLib");
  sel.innerHTML = "";
  document.querySelectorAll(".lib-tab").forEach(function(t){
    if (t.style.display !== "none"){
      var o = document.createElement("option");
      o.value = t.dataset.lib;
      o.textContent = t.querySelector(".nm").textContent;
      sel.appendChild(o);
    }
  });
  sel.value = currentLib;
  var ds = document.getElementById("planStart");
  if (!ds.value){ var d = new Date(); ds.value = d.toISOString().slice(0, 10); }
  document.getElementById("planModal").classList.add("show");
}
function closePlan(){ document.getElementById("planModal").classList.remove("show"); }
function libH2Titles(lib){
  var out = [];
  document.querySelectorAll('.nav-list[data-lib="' + lib + '"] .nav-h2').forEach(function(a){
    out.push({ id: a.getAttribute("href").slice(1), title: a.textContent.trim() });
  });
  return out;
}
function parsePlanJSON(txt){
  if (!txt) return null;
  txt = txt.replace(/```json|```/g, "").trim();
  try { var a = JSON.parse(txt); if (Array.isArray(a)) return a; } catch (e){}
  var s = txt.indexOf("["), e = txt.lastIndexOf("]");
  if (s < 0 || e <= s) return null;
  var sub = txt.slice(s, e + 1);
  try { return JSON.parse(sub.replace(/,(\s*[}\]])/g, "$1")); } catch (x){}
  /* 尝试补齐未闭合括号（应对截断） */
  try {
    var t = sub, depth = 0, open = null;
    for (var i = 0; i < t.length; i++){
      var ch = t[i];
      if (ch === '"' && t[i-1] !== '\\'){ open = open ? null : '"'; }
      else if (!open){ if (ch === '[') depth++; else if (ch === ']') depth--; }
    }
    while (depth > 0){ t += "]"; depth--; }
    if (open) t += '"';
    return JSON.parse(t.replace(/,(\s*[}\]])/g, "$1"));
  } catch (y){ return null; }
}
function fmtDate(startISO, day){
  var d = new Date(startISO + "T00:00:00");
  d.setDate(d.getDate() + (day - 1));
  return (d.getMonth() + 1) + "月" + d.getDate() + "日 周" + "日一二三四五六".charAt(d.getDay());
}
function isPlanToday(startISO, day){
  var d = new Date(startISO + "T00:00:00");
  d.setDate(d.getDate() + (day - 1));
  return d.toDateString() === new Date().toDateString();
}
function titleToId(titles, title){
  var t = title.trim();
  for (var i = 0; i < titles.length; i++) if (titles[i].title === t) return titles[i].id;
  return null;
}
function planTag(titles, t, cls){
  var id = titleToId(titles, t);
  var p = getProg()[document.getElementById("planLib").value] || [];
  var done = id && p.indexOf(id) >= 0;
  return '<span class="tag ' + cls + (done ? " done" : "") + '"' +
    (id ? ' onclick="closePlan();jumpRef(\'' + id + '\')"' : "") + ">" + esc(t) + "</span>";
}
function generatePlan(){
  var lib = document.getElementById("planLib").value;
  var days = parseInt(document.getElementById("planDays").value, 10) || 14;
  var per = parseInt(document.getElementById("planPerDay").value, 10) || 2;
  var start = document.getElementById("planStart").value || new Date().toISOString().slice(0, 10);
  var titles = libH2Titles(lib);
  if (!titles.length){ alert("该知识库没有章节，无法生成计划"); return; }
  var out = document.getElementById("planOut");
  var attempt = 0, max = 2;
  function go(){
    attempt++;
    out.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span> AI 正在排课…（第 ' + attempt + " 次）";
    var list = titles.map(function(t, i){ return (i + 1) + ". " + t.title; }).join("\n");
    callLLM([
      { role: "system", content: "你是学习规划师。基于艾宾浩斯遗忘曲线（复习间隔 1/2/4/7/15/30 天），为以下知识点生成一份 " + days + " 天的学习计划。要求：每天安排约 " + per + " 个新学章节（按列表顺序推进，全部学完后 learn 为空数组），并标注当天到期需要复习的章节（按某章节学后第 1/2/4/7/15/30 天推算，review 标题须与列表完全一致）。严格只输出 JSON 数组（不要 markdown、不要解释、不要代码块围栏），直接以 [ 开头、] 结尾。格式：[{\"day\":1,\"learn\":[\"标题\"],\"review\":[\"标题\"]}]。知识点列表：\n" + list },
      { role: "user", content: "只输出 JSON 数组，不要其他文字。" }
    ], function(txt){
      var plan = parsePlanJSON(txt);
      if (plan && plan.length) return renderPlan(plan, start, lib, titles);
      if (attempt < max){ return setTimeout(go, 800); }
      out.innerHTML = '<div class="plan-day"><div class="empty">⚠️ AI 返回格式异常，<button class="sub" onclick="generatePlan()">重试</button></div><pre style="white-space:pre-wrap;font-size:12px;margin-top:6px">' + esc(txt.slice(0, 800)) + "</pre></div>";
    }, function(err){
      if (attempt < max){ return setTimeout(go, 800); }
      var hint = /Failed to fetch|NetworkError|TypeError|abort/i.test(err)
        ? "<br><small style=\"color:var(--muted)\">多为浏览器跨域(CORS)拦截或网络问题。请通过本地预览服务器打开本页（不要直接双击 html 文件），并确认网络可访问 api.deepseek.com。</small>" : "";
      out.innerHTML = '<div class="plan-day empty">⚠️ 生成失败：' + esc(err) + hint + ' <button class="sub" onclick="generatePlan()">重试</button></div>';
    });
  }
  go();
}
function renderPlan(plan, start, lib, titles){
  var p = getProg()[lib] || [];
  var html = "";
  plan.forEach(function(d){
    var learn = d.learn || [], review = d.review || [];
    var todayMark = isPlanToday(start, d.day) ? ' <span style="color:#c0453a;font-size:11px;font-weight:700">· 今天</span>' : "";
    html += '<div class="plan-day">';
    html += '<div class="dh"><span class="dn">第 ' + d.day + ' 天</span><span class="dd">' + fmtDate(start, d.day) + todayMark + "</span></div>";
    if (learn.length){
      html += '<div class="row"><b>新学：</b>';
      learn.forEach(function(t){ html += planTag(titles, t, "l"); });
      html += "</div>";
    } else {
      html += '<div class="row empty">（无新内容，专注复习）</div>';
    }
    if (review.length){
      html += '<div class="row"><b>复习：</b>';
      review.forEach(function(t){ html += planTag(titles, t, "r"); });
      html += "</div>";
    } else if (learn.length){
      html += '<div class="row empty">（今日无到期复习）</div>';
    }
    html += "</div>";
  });
  document.getElementById("planOut").innerHTML = html;
}

/* ===== 初始化 ===== */
(function(){
  var t = "light"; try { t = localStorage.getItem("kb_theme") || "light"; } catch(e){} applyTheme(t);

  /* 图标选择 */
  var io = document.getElementById("iconOpts");
  ICONS.forEach(function(ic, idx){
    var s = document.createElement("span");
    s.textContent = ic;
    if (idx === 0) s.className = "sel";
    s.onclick = function(){
      selIcon = ic;
      io.querySelectorAll("span").forEach(function(x){ x.classList.remove("sel"); });
      s.classList.add("sel");
    };
    io.appendChild(s);
  });

  /* 渲染自建库 + 隐藏已删内置库 */
  getCustoms().forEach(renderLib);
  getHidden().forEach(function(i){
    var tab = document.querySelector('.lib-tab[data-lib="' + i + '"]');
    if (tab) tab.style.display = "none";
  });
  applyProg();
  updateDueBadge();

  /* 恢复上次所在库；若 URL 带锚点则以锚点所在库为准 */
  var lib = "0"; try { lib = localStorage.getItem("kb_lib") || "0"; } catch(e){}
  var h = location.hash.slice(1);
  if (h && document.getElementById(h)) lib = pageOf(h);
  var live = liveLibs();
  if (!live.length){ showEmpty(); }
  else switchLib(live.indexOf(lib) >= 0 ? lib : live[0], h || null);

  refreshAiMode();
  updateDueBadge();
  onScroll();
  checkOrigin();
  decorateHeadings();
  try { lspInit(); } catch(e){}
})();
/* ---------- 备份 / 恢复：导出导入全部 kb_ 数据 ---------- */
function kbToast(msg){
  var t = document.getElementById("kbToast");
  if (!t){
    t = document.createElement("div"); t.id = "kbToast";
    t.style.cssText = "position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:rgba(34,42,51,.94);color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:99999;opacity:0;transition:opacity .2s;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:80vw;";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(t._t); t._t = setTimeout(function(){ t.style.opacity = "0"; }, 1900);
}
function exportData(){
  var data = { _app: "kb-backup", _ver: 1, _time: new Date().toISOString(), data: {} };
  for (var i = 0; i < localStorage.length; i++){
    var k = localStorage.key(i);
    if (k && k.indexOf("kb_") === 0) data.data[k] = localStorage.getItem(k);
  }
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "知识库备份_" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  kbToast("已导出备份（" + Object.keys(data.data).length + " 项）");
}
function importData(){
  var inp = document.getElementById("backupFile");
  if (!inp){
    inp = document.createElement("input"); inp.type = "file"; inp.id = "backupFile";
    inp.accept = "application/json"; inp.style.display = "none";
    inp.onchange = function(){ if (inp.files && inp.files[0]) doImport(inp.files[0]); };
    document.body.appendChild(inp);
  }
  inp.value = ""; inp.click();
}
function doImport(file){
  var r = new FileReader();
  r.onload = function(){
    try {
      var obj = JSON.parse(r.result);
      if (!obj || !obj.data) throw new Error("文件格式不正确");
      if (!confirm("恢复备份将覆盖当前所有自建库、学习进度、笔记与设置，确定继续？")) return;
      for (var k in obj.data){ if (obj.data.hasOwnProperty(k)) localStorage.setItem(k, obj.data[k]); }
      kbToast("恢复成功，即将刷新…");
      setTimeout(function(){ location.reload(); }, 700);
    } catch(e){ alert("导入失败：" + e.message); }
  };
  r.readAsText(file);
}

/* ---------- 笔记 / 收藏 ---------- */
var KB_FAV_KEY = "kb_favs";   /* { lib: [secId,...] } */
var KB_NOTE_KEY = "kb_notes"; /* { lib: { secId: "text" } } */
var _mnFilter = "all";
var _curNote = null;

function favMap(){ try{ return JSON.parse(localStorage.getItem(KB_FAV_KEY)||"{}"); }catch(e){ return {}; } }
function noteMap(){ try{ return JSON.parse(localStorage.getItem(KB_NOTE_KEY)||"{}"); }catch(e){ return {}; } }
function saveFavMap(m){ try{ localStorage.setItem(KB_FAV_KEY, JSON.stringify(m)); }catch(e){} }
function saveNoteMap(m){ try{ localStorage.setItem(KB_NOTE_KEY, JSON.stringify(m)); }catch(e){} }
function isFav(lib, secId){ var m=favMap(); return !!(m[lib] && m[lib].indexOf(secId)>=0); }
function isNoted(lib, secId){ var m=noteMap(); return !!(m[lib] && m[lib][secId]); }

function toggleFav(lib, secId){
  var m=favMap(); if(!m[lib]) m[lib]=[];
  var i=m[lib].indexOf(secId);
  if(i>=0){ m[lib].splice(i,1); if(!m[lib].length) delete m[lib]; kbToast("已取消收藏"); }
  else { m[lib].push(secId); kbToast("★ 已收藏"); }
  saveFavMap(m);
  refreshFavButtons(lib, secId);
  if (document.getElementById("myNotesModal").classList.contains("show")) openMyNotes();
}
function refreshFavButtons(lib, secId){
  document.querySelectorAll('.page[data-page="'+lib+'"] .h-fav[data-sec="'+secId+'"]').forEach(function(b){
    b.classList.toggle("on", isFav(lib, secId));
  });
}
function refreshNoteButtons(lib, secId){
  document.querySelectorAll('.page[data-page="'+lib+'"] .h-note[data-sec="'+secId+'"]').forEach(function(b){
    b.classList.toggle("on", isNoted(lib, secId));
  });
}

/* 给每个小节标题挂上 ⭐/📝 按钮（只在首次执行一次） */
function decorateHeadings(){
  document.querySelectorAll(".page").forEach(function(page){
    var lib = page.dataset.page;
    page.querySelectorAll('h2[id^="sec-"],h3[id^="sec-"]').forEach(function(h){
      if (h.dataset.decorated) return;
      h.dataset.decorated = "1";
      var sid = h.id;
      var act = document.createElement("span"); act.className = "h-actions";
      var fav = document.createElement("button");
      fav.className = "h-fav" + (isFav(lib, sid) ? " on" : "");
      fav.title = "收藏此节"; fav.textContent = "⭐"; fav.setAttribute("data-sec", sid);
      fav.onclick = function(e){ e.stopPropagation(); toggleFav(lib, sid); };
      var note = document.createElement("button");
      note.className = "h-note" + (isNoted(lib, sid) ? " on" : "");
      note.title = "写笔记"; note.textContent = "📝"; note.setAttribute("data-sec", sid);
      note.onclick = function(e){ e.stopPropagation(); openNoteEditor(lib, sid); };
      act.appendChild(fav); act.appendChild(note); h.appendChild(act);
    });
  });
}

function openMyNotes(){
  var lib = currentLib;
  document.getElementById("mnLibName").textContent = "· " + libName(lib);
  var page = document.querySelector('.page[data-page="'+lib+'"]');
  var secs = page ? page.querySelectorAll('h2[id^="sec-"],h3[id^="sec-"]') : [];
  var favs = favMap()[lib] || [];
  var notes = noteMap()[lib] || {};
  var list = document.getElementById("mnList"); list.innerHTML = "";
  var arr = Array.prototype.slice.call(secs);
  if (!arr.length){ list.innerHTML = '<div class="mn-empty">这个知识库还没有小节。</div>'; }
  arr.forEach(function(h){
    var sid = h.id;
    var title = h.textContent.replace(/[⭐📝]/g,"").replace(/\s+/g," ").trim();
    var f = favs.indexOf(sid) >= 0; var n = !!notes[sid];
    if (_mnFilter === "fav" && !f) return;
    if (_mnFilter === "note" && !n) return;
    var row = document.createElement("div"); row.className = "mn-row";
    var star = document.createElement("button"); star.className = "mn-star" + (f ? " on" : "");
    star.textContent = "⭐"; star.title = "收藏"; star.onclick = function(){ toggleFav(lib, sid); };
    var t = document.createElement("span"); t.className = "mn-title"; t.textContent = title;
    t.onclick = function(){ switchLib(lib, sid); closeMyNotes(); };
    var nb = document.createElement("span"); nb.className = "mn-note-badge" + (n ? " on" : "");
    nb.textContent = n ? "📝" : ""; nb.title = n ? "有笔记" : "无笔记";
    nb.onclick = function(){ openNoteEditor(lib, sid); closeMyNotes(); };
    row.appendChild(star); row.appendChild(t); row.appendChild(nb);
    list.appendChild(row);
  });
  document.getElementById("mnTip").textContent =
    "共 " + arr.length + " 节 · 收藏 " + favs.length + " · 有笔记 " + Object.keys(notes).length;
  document.getElementById("myNotesModal").classList.add("show");
}
function mnFilter(f){
  _mnFilter = f;
  document.querySelectorAll(".mn-tab").forEach(function(b){ b.classList.toggle("on", b.dataset.f === f); });
  openMyNotes();
}
function closeMyNotes(){ document.getElementById("myNotesModal").classList.remove("show"); }

function openNoteEditor(lib, secId){
  _curNote = { lib: lib, secId: secId };
  var page = document.querySelector('.page[data-page="'+lib+'"]');
  var h = page ? page.querySelector('[id="'+secId+'"]') : null;
  var title = h ? h.textContent.replace(/[⭐📝]/g,"").replace(/\s+/g," ").trim() : secId;
  document.getElementById("noteSecTitle").textContent = "· " + title;
  var nm = noteMap();
  document.getElementById("noteArea").value = (nm[lib] && nm[lib][secId]) ? nm[lib][secId] : "";
  document.getElementById("noteFav").checked = isFav(lib, secId);
  document.getElementById("noteModal").classList.add("show");
  try { document.getElementById("noteArea").focus(); } catch(e){}
}
function saveNote(){
  if (!_curNote) return;
  var lib = _curNote.lib, secId = _curNote.secId;
  var txt = document.getElementById("noteArea").value;
  var nm = noteMap(); if (!nm[lib]) nm[lib] = {};
  if (txt && txt.trim()) nm[lib][secId] = txt; else delete nm[lib][secId];
  saveNoteMap(nm);
  var wantFav = document.getElementById("noteFav").checked;
  if (wantFav && !isFav(lib, secId)) toggleFav(lib, secId);
  else if (!wantFav && isFav(lib, secId)) toggleFav(lib, secId);
  refreshNoteButtons(lib, secId);
  kbToast("笔记已保存");
  closeNoteEditor();
}
function delNote(){
  if (!_curNote) return;
  var lib = _curNote.lib, secId = _curNote.secId;
  var nm = noteMap(); if (nm[lib]) delete nm[lib][secId];
  saveNoteMap(nm);
  document.getElementById("noteArea").value = "";
  refreshNoteButtons(lib, secId);
  kbToast("笔记已删除");
  closeNoteEditor();
}
function closeNoteEditor(){ document.getElementById("noteModal").classList.remove("show"); _curNote = null; }

function realAppUrl(){
  var APP_URL = "https://1c0993a0612f4d948cebcf9059e2d530.sh2.agentos-app.net";
  return (window.location.href && /^https?:/.test(window.location.href)) ? window.location.href : APP_URL;
}
function openInNewTab(){
  try { window.open(realAppUrl(), "_blank"); } catch(e){ copyAppUrl(); }
}
function copyAppUrl(){
  var u = realAppUrl();
  var inp = document.getElementById("owUrl"); if (inp) inp.value = u;
  function ok(){ var b = document.getElementById("owCopyBtn"); if (b){ b.textContent = "已复制 ✓"; setTimeout(function(){ b.textContent = "复制链接"; }, 2000); } }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(u).then(ok, function(){ if(!fallbackCopy(u)) ok(); });
  } else { if(!fallbackCopy(u)) ok(); }
}
function fallbackCopy(u){
  try {
    var ta = document.createElement("textarea"); ta.value = u; ta.style.position="fixed"; ta.style.top="0"; ta.style.left="0"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    var r = document.execCommand("copy"); document.body.removeChild(ta); return r;
  } catch(e){ return false; }
}
function checkOrigin(){
  var bad = (window.self !== window.top) || (location.protocol === "file:") || !location.origin || (location.origin === "null");
  var w = document.getElementById("originWarn");
  if (bad && w){ w.style.display = "flex"; var inp = document.getElementById("owUrl"); if (inp) inp.value = realAppUrl(); }
}
