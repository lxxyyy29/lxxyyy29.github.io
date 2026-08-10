# -*- coding: utf-8 -*-
"""将 知识库_长页版.html 拆分为双知识库可切换页面，并整体翻新 UI。
扩充内容来自 frag_java.html（Java 八股第四部分）、frag_ragent.html（Ragent 源码深挖）、frag_langchain.html（LangChain 1.0+ 独立第三库）、frag_embabel.html（Embabel Agent 独立第四库）、frag_springai.html（Spring AI 独立第五库），
导航目录改为从合并后的正文标题自动生成。"""
import re
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "src_long.html")   # 仓库内相对路径优先（CI / 任意机器可构建）
if not os.path.exists(SRC):
    SRC = r"C:\Users\Administrator\WorkBuddy\2026-08-06-14-11-21\知识库_长页版.html"  # 本地兜底
OUT = os.path.join(BASE, "知识库.html")
FRAG_JAVA = os.path.join(BASE, "frag_java.html")
FRAG_RAGENT = os.path.join(BASE, "frag_ragent.html")
FRAG_LANGCHAIN = os.path.join(BASE, "frag_langchain.html")
FRAG_EMBABEL = os.path.join(BASE, "frag_embabel.html")
FRAG_SPRINGAI = os.path.join(BASE, "frag_springai.html")
FRAG_BIZTPL = os.path.join(BASE, "frag_biztpl.html")

html = open(SRC, encoding="utf-8").read()

# ---------- 1. 拆分正文并合并扩充片段 ----------
content = html.split("<div class='content'>", 1)[1].split("</div></main>", 1)[0]
idx = content.index('<h1 id="sec-136">')
page0, page1 = content[:idx], content[idx:]
page0 = page0.replace("<p>---</p>", '<hr class="sep">')
page1 = page1.replace("<p>---</p>", '<hr class="sep">')

if os.path.exists(FRAG_JAVA):
    page0 += open(FRAG_JAVA, encoding="utf-8").read()
if os.path.exists(FRAG_RAGENT):
    page1 += open(FRAG_RAGENT, encoding="utf-8").read()

# 独立知识库：以 (id, 图标, 名称, frag文件名) 声明；新增一个库只需在此加一行
EXTRA_LIBS = [
    ("2", "🔗", "LangChain 1.0+", "frag_langchain.html"),
    ("3", "🤖", "Embabel Agent", "frag_embabel.html"),
    ("4", "🌱", "Spring AI", "frag_springai.html"),
    ("5", "🧭", "业务开发模板", "frag_biztpl.html"),
]
extra_pages = {}
for _lid, _ic, _nm, _frag in EXTRA_LIBS:
    _p = ""
    _fp = os.path.join(BASE, _frag)
    if os.path.exists(_fp):
        _p = open(_fp, encoding="utf-8").read().replace("<p>---</p>", '<hr class="sep">')
    extra_pages[_lid] = _p

# ---------- 2. 从正文标题自动生成侧边导航 ----------
HEAD = re.compile(r'<h([123]) id="(sec-\d+)">(.*?)</h\1>', re.S)

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).strip()

def build_nav(page_html):
    out, group = [], None
    for m in HEAD.finditer(page_html):
        lvl, hid, text = int(m.group(1)), m.group(2), strip_tags(m.group(3))
        if lvl == 1:
            group = []
            out.append((text, group))
        elif group is not None:
            cls = "nav-h2" if lvl == 2 else "nav-h3"
            group.append('<a class="%s" href="#%s">%s</a>' % (cls, hid, text))
    return "".join(
        '<div class="nav-group"><div class="nav-h1">%s</div>%s</div>' % (t, "".join(links))
        for t, links in out
    )

# 全部内置库：0/1 来自源文档拆分，其余来自 EXTRA_LIBS（新增库只加一行）
ALL_LIBS = [("0", "☕", "Java 八股", page0), ("1", "🤖", "Ragent 项目", page1)]
for _lid, _ic, _nm, _frag in EXTRA_LIBS:
    ALL_LIBS.append((_lid, _ic, _nm, extra_pages[_lid]))

navs = {lib[0]: build_nav(lib[3]) for lib in ALL_LIBS}
N_LIBS = len(ALL_LIBS)

def gen_lib_tabs():
    out = []
    for i, (lid, ic, nm, pg) in enumerate(ALL_LIBS):
        active = " active" if i == 0 else ""
        out.append('<button type="button" class="lib-tab%s" data-lib="%s" onclick="switchLib(\'%s\')"><span class="ic">%s</span><span class="nm">%s</span><span class="ct"></span><span class="pbar"><i></i></span><span class="del" title="删除该知识库" onclick="delLib(event,\'%s\')">×</span></button>' % (active, lid, lid, ic, nm, lid))
    return "".join(out)

def gen_nav_lists():
    out = []
    for i, (lid, ic, nm, pg) in enumerate(ALL_LIBS):
        show = " show" if i == 0 else ""
        out.append('<div class="nav-list%s" data-lib="%s">%s</div>' % (show, lid, navs[lid]))
    return "".join(out)

def gen_pages():
    out = []
    for i, (lid, ic, nm, pg) in enumerate(ALL_LIBS):
        show = " show" if i == 0 else ""
        nxt = (i + 1) % N_LIBS
        nxt_lid, nxt_ic, nxt_nm, _ = ALL_LIBS[nxt]
        if i == N_LIBS - 1:
            foot = '<div class="page-foot"><span></span><button class="pf-btn" onclick="switchLib(\'%s\')">↻ 回到：%s</button></div>' % (ALL_LIBS[0][0], ALL_LIBS[0][2])
        else:
            foot = '<div class="page-foot"><span></span><button class="pf-btn" onclick="switchLib(\'%s\')">下一个知识库：%s →</button></div>' % (nxt_lid, nxt_nm)
        out.append('<section class="page%s" data-page="%s">%s\n    %s\n  </section>' % (show, lid, pg, foot))
    return "".join(out)

LIB_TABS_HTML = gen_lib_tabs()
NAV_LISTS_HTML = gen_nav_lists()
PAGES_HTML = gen_pages()

# ---------- 3. 生成新页面 ----------
# ---------- 3. 生成新页面 ----------
KB_TEMPLATE = os.path.join(BASE, "kb_template.html")
KB_APPJS = os.path.join(BASE, "kb_app.js")
TPL = open(KB_TEMPLATE, encoding="utf-8").read()
APPJS = open(KB_APPJS, encoding="utf-8").read()

TPL = (TPL.replace("%%APPJS%%", "<script>" + APPJS + "</script>")
       .replace("%%LIBTABS%%", LIB_TABS_HTML)
       .replace("%%NAVLISTS%%", NAV_LISTS_HTML)
       .replace("%%PAGES%%", PAGES_HTML))

open(OUT, "w", encoding="utf-8").write(TPL)
print("OK, libs:", N_LIBS, "nav groups per lib:",
      [navs[lib[0]].count('class="nav-group"') for lib in ALL_LIBS],
      "| output bytes:", len(TPL.encode("utf-8")))
