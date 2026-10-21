"use strict";
// ENTRYGUIDE 二期：页面内气泡（content script）
// 装载方式：见 manifest.json content_scripts，仅注入 7 个官方填报网站。
// 说明：字段匹配依赖 data/countries/*.json 里 fields[].match 的 label/name 数组，
// 这些选择器是按官网人工核对过的既有数据，但未在真实浏览器环境里对本次改动做二次验收，
// 如果官网改版导致匹配不上，气泡就是安静地不出现（不会报错/不会挡住表单）。

(function () {
  const HOST_COUNTRY = {
    "s.nia.gov.cn": "cn",
    "eservices.ica.gov.sg": "sg",
    "imigresen-online.imi.gov.my": "my",
    "tdac.immigration.go.th": "th",
    "prearrival.immigration.gov.vn": "vn",
    "allindonesia.imigrasi.go.id": "id",
    "twac.immigration.gov.tw": "tw",
    "indianvisaonline.gov.in": "in",
    "imuga.immigration.gov.mv": "mv",
    "www.e-arrivalcard.go.kr": "kr",
    "arrival.gov.kh": "kh",
    "etravel.gov.ph": "ph",
    "www.etravel.gov.ph": "ph",
    "vjw.digital.go.jp": "jp",
    "www.vjw.digital.go.jp": "jp",
    "imm.gov.bn": "bn",
    "www.imm.gov.bn": "bn",
    "travellerdeclaration.govt.nz": "nz",
    "www.travellerdeclaration.govt.nz": "nz",
    "eticket.migracion.gob.do": "do",
    "www.eticket.migracion.gob.do": "do",
    "enterjamaica.gov.jm": "jm",
    "www.enterjamaica.gov.jm": "jm",
    "edcard.dominica.gov.dm": "dm",
    "www.edcard.dominica.gov.dm": "dm",
    "travel.gov.tt": "tt",
    "www.travel.gov.tt": "tt"
  };
  const cid = HOST_COUNTRY[location.hostname];
  if (!cid) return;

  const PAUSE_KEY = "pause_" + location.hostname;
  let paused = false;
  let country = null;
  let nat = null;
  let lang = "en";
  let pinned = false;
  let bubbleEl = null, hostEl = null, shadow = null;
  let dragState = null;
  let userMoved = false;            // 用户是否手动拖动过气泡
  // 气泡摆哪儿：auto=放得下就贴着字段、放不下就靠边（默认）｜side=一律靠右上｜beside=一律贴着
  // ⚠ 这个值要存进 storage。原来 ⧉ 只对当前这一次有效，翻一页就回到贴着字段，
  //   用户得每页重点一次，等于没有这个功能。
  let dockMode = "auto";
  let ringEl = null, ringPrev = "", ringPrevOff = "";
  let curFieldId = null, curEl = null;  // 当前展示的字段，避免重复重建 DOM
  let hideTimer = null, shownAt = 0;    // 隐藏计时器 / 本次弹出时间，用于防"闪一下"

  const rurl = (p) => chrome.runtime.getURL(p);
  // 语言回退：找不到当前语言时，华语之间先互相回退，再退英文。
  // 不这么做的话，繁体用户在只写了 zh/en 的数据里会直接看到英文 —— 明明有中文却不给他看。
  const pickRaw = (o) => {
    if (!o) return "";
    if (o[lang]) return o[lang];
    if (lang && lang.indexOf("zh") === 0) { if (o.zh) return o.zh; if (o["zh-TW"]) return o["zh-TW"]; }
    return o.en || o.zh || "";
  };
  const pick = (o) => fillEx(pickRaw(o));
  const UI = {
    "zh":    { fmt: "怎么写", opts: "可以照着填（点一下就复制）", dft: "不确定就填" },
    "zh-TW": { fmt: "怎麼寫", opts: "可以照著填（點一下就複製）", dft: "不確定就填" },
    "en":    { fmt: "How to write it", opts: "Tap one to copy", dft: "Not sure? use" },
    "ja":    { fmt: "書き方", opts: "タップするとコピーできます", dft: "迷ったらこれ" },
    "ko":    { fmt: "쓰는 방법", opts: "눌러서 복사할 수 있어요", dft: "애매하면 이걸로" },
    "fr":    { fmt: "Comment l'écrire", opts: "Touchez pour copier", dft: "En cas de doute" },
    "es":    { fmt: "Cómo escribirlo", opts: "Toque para copiar", dft: "Si duda, use" },
    "vi":    { fmt: "Cách viết", opts: "Nhấn để sao chép", dft: "Không chắc? dùng" },
    "th":    { fmt: "เขียนอย่างไร", opts: "แตะเพื่อคัดลอก", dft: "ไม่แน่ใจ ใช้" },
    "ru":    { fmt: "Как писать", opts: "Нажмите, чтобы скопировать", dft: "Если не уверены" },
    "de":    { fmt: "So schreiben", opts: "Tippen zum Kopieren", dft: "Unsicher? dann" },
    "pl":    { fmt: "Jak wpisać", opts: "Kliknij, aby skopiować", dft: "W razie wątpliwości" },
    "it":    { fmt: "Come scriverlo", opts: "Tocca per copiare", dft: "In dubbio usa" },
    "ar":    { fmt: "طريقة الكتابة", opts: "انقر للنسخ", dft: "إن لم تتأكد" },
    "tr":    { fmt: "Nasıl yazılır", opts: "Kopyalamak için dokun", dft: "Emin değilsen" },
    "uk":    { fmt: "Як писати", opts: "Натисніть, щоб скопіювати", dft: "Якщо не впевнені" },
    "pt":    { fmt: "Como escrever", opts: "Toque para copiar", dft: "Na dúvida use" },
    "nl":    { fmt: "Hoe te schrijven", opts: "Tik om te kopiëren", dft: "Twijfel? gebruik" },
    "id":    { fmt: "Cara menulis", opts: "Ketuk untuk menyalin", dft: "Ragu? pakai" },
    "ms":    { fmt: "Cara tulis", opts: "Ketik untuk salin", dft: "Tak pasti? guna" },
    "hi":    { fmt: "कैसे लिखें", opts: "कॉपी करने के लिए टैप करें", dft: "पक्का न हो तो" },
    "he":    { fmt: "איך לכתוב", opts: "לחצו להעתקה", dft: "לא בטוחים? כתבו" },
    "cs":    { fmt: "Jak to napsat", opts: "Klepněte pro kopírování", dft: "Nejste si jistí?" },
    "hu":    { fmt: "Hogyan írja", opts: "Koppintson a másoláshoz", dft: "Ha bizonytalan" },
    "ro":    { fmt: "Cum se scrie", opts: "Atinge pentru copiere", dft: "Dacă nu ești sigur" },
    "fa":    { fmt: "چطور بنویسید", opts: "برای کپی بزنید", dft: "اگر مطمئن نیستید" },
    "el":    { fmt: "Πώς να το γράψετε", opts: "Πατήστε για αντιγραφή", dft: "Αν δεν είστε σίγουροι" }
  };
  const ui = (k) => ((UI[lang] || UI.en)[k] || UI.en[k]);

  async function loadData() {
    try {
      const [c, n, s] = await Promise.all([
        fetch(rurl("data/countries/" + cid + ".json")).then((r) => r.json()),
        fetch(rurl("data/nationality.json")).then((r) => r.json()),
        new Promise((res) => chrome.storage.local.get({ lang: null, dockMode: "auto", [PAUSE_KEY]: false }, res))
      ]);
      country = c; nat = n;
      lang = (s.lang && UI[s.lang]) ? s.lang : (typeof normLang === "function" ? normLang(navigator.language) : "en");
      paused = !!s[PAUSE_KEY];
      if (s.dockMode === "side" || s.dockMode === "beside") dockMode = s.dockMode;
      console.debug("[EntryGuide] data loaded OK for", cid, "| fields:", (country.fields || []).map((f) => f.id), "| paused:", paused);
    } catch (e) {
      country = null;
      console.error("[EntryGuide] failed to load bundled data — bubble will not show. Error:", e);
    }
  }

  function ensureHost() {
    // 只判断 hostEl 存不存在是不够的：
    // TDAC 这类单页应用切换步骤时会重绘整个 body，把我们插进去的容器连根移除，
    // 而变量还指着那个已经脱离页面的旧节点 → 之后永远不再重建，
    // renderBubble 里 bubbleEl.classList 就会报 null，表现为"所有气泡都不弹了"。
    if (hostEl && bubbleEl && shadow && hostEl.isConnected) return;
    try { if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl); } catch (e) {}
    hostEl = null; shadow = null; bubbleEl = null;
    curFieldId = null; curEl = null;
    hostEl = document.createElement("div");
    hostEl.style.cssText = "all:initial;";
    (document.body || document.documentElement).appendChild(hostEl);
    shadow = hostEl.attachShadow({ mode: "open" });
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = rurl("content.css");
    shadow.appendChild(link);
    bubbleEl = document.createElement("div");
    bubbleEl.className = "eg-bubble";
    shadow.appendChild(bubbleEl);

    // 关键：在气泡上按下鼠标时阻止默认行为，输入框就不会失焦。
    // 这样点按钮/拖标题条都不会触发 focusout → 气泡不会在你操作它的时候自己消失。
    bubbleEl.addEventListener("mousedown", (e) => {
      if (e.target && e.target.tagName === "A") return;   // 底部官方链接仍可正常点开
      e.preventDefault();
    }, true);
  }

  // ===== 几何定位找标签 =====
  // 背景：TDAC 这类站点把输入框设成 no-label 模式，标签文字不在输入框容器里，
  // 顺着 DOM 往上找是找不到的。改成看屏幕位置：谁在这个框的正上方/正左边最近，谁就是它的标签。
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const stripMark = (s) => clean(s).replace(/^[*＊:：\s]+/, "").replace(/[:：*＊\s]+$/, "");
  const ICON_RE = /material-icons|mat-icon|mat-ripple|mdc-.*__(icon|ripple)/i;
  const NOT_LABEL_RE = /^(please\s+(fill\s+in|choose|select)\b|this field is required|請填寫上述欄位|請選擇一個選項|请填写上述栏位|请选择一个选项)/i;

  let _cands = null, _candsAt = 0;
  function candidates() {
    const now = Date.now();
    if (_cands && now - _candsAt < 1200) return _cands;   // 缓存，避免每次聚焦都全页扫一遍
    const out = [];
    const sx = window.scrollX || window.pageXOffset || 0;
    const sy = window.scrollY || window.pageYOffset || 0;
    let w;
    try { w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null); } catch (e) { return (_cands = []); }
    let n;
    while ((n = w.nextNode())) {
      const t = clean(n.nodeValue);
      if (!t || t.length > 140) continue;
      if (!/[A-Za-z\u4e00-\u9fa5]/.test(t)) continue;      // 排除 "+"、"0 / 215" 这类纯符号
      // 排除校验提示文字。上面按 mat-error / [role=alert] 排除只管得住 Angular Material；
      // 台湾是 React，报错文字没有那些标记，会紧贴字段冒出来、把真标签挤掉。
      // ⚠ 只认死这几句实测原文。台湾真标签是 "Please enter the ..." 开头的整句，
      //    所以这里只排 fill in / choose / select，绝不能连 "please enter" 一起排掉。
      if (NOT_LABEL_RE.test(t)) continue;
      const p = n.parentElement;
      if (!p) continue;
      if (["SCRIPT", "STYLE", "OPTION", "NOSCRIPT"].indexOf(p.tagName) >= 0) continue;
      if (/^H[1-6]$/.test(p.tagName)) continue;            // 排除区块大标题（Arrival Information 之类）
      const cls = (p.className && p.className.toString) ? p.className.toString() : "";
      if (ICON_RE.test(cls)) continue;
      if (p.closest("label")) continue;                    // 排除别的单选/复选框自己的说明文字
      // 关键修复：别的字段里「已经填好的值」不是标签。
      // 例如 Flight No. 正上方是 Mode of Transport 里显示的 COMMERCIAL FLIGHT、
      // Province 正上方是住宿类型里的 HOTEL —— 它们离得比真正的左侧标签更近，
      // 会把标签挤掉，导致这些字段匹配不上、不弹气泡（那个框空着时又能弹，所以时好时坏）。
      if (p.closest("input, textarea, select, mat-select, [role=combobox], [role=listbox], " +
                    ".mat-mdc-select, .mat-mdc-select-value, .mat-mdc-form-field-infix, " +
                    ".ant-select-selector, .el-input, .cdk-overlay-container")) continue;
      // 排除红色报错提示（This field is required. 之类）
      if (p.closest("mat-error, [role=alert], .mat-mdc-form-field-error, .mat-mdc-form-field-subscript-wrapper")) continue;
      let r;
      try { r = p.getBoundingClientRect(); } catch (e) { continue; }
      if (r.width <= 0 || r.height <= 0) continue;
      // 关键：getBoundingClientRect 给的是「相对屏幕」的坐标，页面一滚就全变了。
      // 缓存里存屏幕坐标的话，用户滚动后拿新位置去比对旧位置 = 全部错位 → 找不到标签 → 不弹气泡。
      // 这里换算成「相对整个页面」的坐标存起来，滚动就不影响了。
      out.push({ text: t, el: p, rect: {
        left: r.left + sx, right: r.right + sx, top: r.top + sy, bottom: r.bottom + sy
      } });
    }
    _cands = out; _candsAt = now;
    return out;
  }

  function getLabelText(el) {
    try {
      if (el.labels && el.labels.length) {
        const t = stripMark(el.labels[0].textContent);
        if (t) return t;
      }
    } catch (e) {}
    const al = stripMark(el.getAttribute("aria-label"));
    if (al) return al;

    let r;
    try {
      const b = el.getBoundingClientRect();
      const sx = window.scrollX || window.pageXOffset || 0;
      const sy = window.scrollY || window.pageYOffset || 0;
      r = { left: b.left + sx, right: b.right + sx, top: b.top + sy, bottom: b.bottom + sy };
    } catch (e) { return ""; }
    let best = null, bestScore = Infinity;
    for (const c of candidates()) {
      if (c.el.contains(el)) continue;
      const cr = c.rect;
      const dyAbove = r.top - cr.bottom;
      const overlapX = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const lenPenalty = Math.min(c.text.length, 140) * 0.06;   // 同样近的情况下，短标签优先
      if (dyAbove >= -6 && dyAbove < 70 && overlapX > 10) {
        const s = dyAbove + Math.abs(cr.left - r.left) * 0.3 + lenPenalty;
        if (s < bestScore) { bestScore = s; best = c; }
      }
      const dxLeft = r.left - cr.right;
      const overlapY = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      if (dxLeft >= -6 && dxLeft < 40 && overlapY > 6) {
        const s = dxLeft + 8 + lenPenalty;
        if (s < bestScore) { bestScore = s; best = c; }
      }
    }
    if (best) return stripMark(best.text);
    return stripMark(el.getAttribute("placeholder"));   // 最后兜底：用占位提示
  }

  // 短词用"整词"匹配，避免 LAND 命中 THAILAND；同时取"最长关键词"胜出，
  // 避免 Sub-District 被更短的 District 抢走
  function kwHit(hay, needle) {
    if (!hay || !needle) return false;
    const n = needle.toLowerCase();
    if (n.length >= 6) return hay.indexOf(n) >= 0;
    try {
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("(^|[^a-z0-9])" + esc + "([^a-z0-9]|$)", "i").test(hay);
    } catch (e) { return hay.indexOf(n) >= 0; }
  }

  // 路径限定：印尼一个网站有 4 个步骤，同名概念在不同步骤是不同的栏。
  // fields 里不写 path 的规则不受影响（其他国家全都不写）。
  function pathOK(f) {
    const p = f.match && f.match.path;
    if (!p) return true;
    try { return location.pathname.indexOf(p) >= 0; } catch (e) { return false; }
  }

  // 页内位置：从 1 开始数，和字段扫描脚本的编号对齐。
  // 印尼的是/否、男/女控件既没有 id、标签又随界面语言变，只能靠这个。
  // 只在"该步骤没有前置条件字段"的页面上用（已逐页核对过）。
  function pageFieldIndex(el) {
    let all;
    try {
      // ⚠ 这个选择器必须和 isFieldLike() 认的范围保持一致。
      // 不一致的后果：气泡认得出某个控件、但数编号时不数它，
      // 于是「页内第 N 个」整体错位，印尼那套按位置匹配全废。
      all = Array.prototype.slice.call(document.querySelectorAll(
        "input,select,textarea,[role=combobox],[aria-haspopup=listbox],mat-select," +
        "[role=radio],[role=checkbox],[role=switch],[role=listbox],[role=textbox],[role=spinbutton]"));
    } catch (e) { return 0; }
    all = all.filter(function (n) {
      try {
        if (n.getAttribute && n.getAttribute("type") === "hidden") return false;
        const b = n.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      } catch (e) { return false; }
    });
    const i = all.indexOf(el);
    return i < 0 ? 0 : i + 1;
  }

  // 匹配顺序（从最可靠到最兜底）：
  //   ① id / name 片段 —— 跨界面语言不变，实测印尼同一栏中英文 id 完全相同
  //   ② 页内位置 ——     给没有 id 的控件用，必须配 path 限定
  //   ③ 标签文字 ——     最后兜底（泰国只有这条路可走）
  function matchField(el) {
    if (!country || !country.fields) return null;
    const nameAttr = ((el.getAttribute("name") || "") + " " + (el.id || "")).toLowerCase();

    // ① id / name 片段：最长关键词胜出
    let best = null, bestLen = 0;
    if (nameAttr.trim()) {
      for (const f of country.fields) {
        if (!pathOK(f)) continue;
        for (const n of (f.match && f.match.name) || []) {
          if (kwHit(nameAttr, n) && n.length > bestLen) { best = f; bestLen = n.length; }
        }
      }
      if (best) return best;
    }

    // ② 页内位置
    let idx = -1;
    for (const f of country.fields) {
      if (!pathOK(f)) continue;
      const want = f.match && f.match.index;
      if (!want || !want.length) continue;
      if (idx < 0) idx = pageFieldIndex(el);
      if (idx > 0 && want.indexOf(idx) >= 0) return f;
    }

    // ③ 标签文字
    const labelText = (getLabelText(el) || "").toLowerCase();
    if (labelText) {
      best = null; bestLen = 0;
      for (const f of country.fields) {
        if (!pathOK(f)) continue;
        for (const l of (f.match && f.match.label) || []) {
          if (kwHit(labelText, l) && l.length > bestLen) { best = f; bestLen = l.length; }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function isNationalityLike(el, f) {
    if (f && /nation|country|国籍|国家/i.test(f.id || "")) return true;
    return el.tagName === "SELECT" && el.options && el.options.length > 15;
  }

  function natSuggestions(el) {
    // 与 popup 的 natCandidates 保持一致：先看用户选的界面语言，再退浏览器语言
    const b = navigator.language || "en";
    const keys = [lang, String(lang).split("-")[0], b, b.replace("_", "-"), b.split("-")[0]];
    let codes = [];
    for (const k of keys) { if (nat.locales && nat.locales[k]) { codes = nat.locales[k]; break; } }
    const opts = Array.from(el.options || []);
    const found = [];
    for (const code of codes) {
      const info = nat.countries[code]; if (!info) continue;
      const aliases = (info.aliases || []).map((a) => a.toLowerCase());
      const hit = opts.find((o) => aliases.includes((o.textContent || "").trim().toLowerCase()) || aliases.includes((o.value || "").trim().toLowerCase()));
      if (hit) found.push({ info, opt: hit });
    }
    return found;
  }

  // 防呆兜底（不依赖数据写得对）：
  // 1) 一旦这个字段有"填写格式"说明，就说明它填的是用户自己的信息 → 完全不显示可点选项
  // 2) 纯数字/纯符号的示例一律丢弃 —— 真正的"可选项"都是词（HOTEL、MALE…），
  //    长得像数据的（1990、01、15、10110）绝不能做成点一下就复制
  // 读取页面上"另一个已填字段"的当前值，作为参考显示。
  // 用途：常住国 / 登机国这类下拉，多数情况就等于刚才填的国籍——
  // 把用户自己已经填过的值摆出来，省掉在几百个选项里翻找。
  // 注意：只展示、不做成一键填入（这是用户的个人信息，必须由本人确认）。
  function readFieldValue(wantId) {
    try {
      const nodes = document.querySelectorAll(
        "input,select,textarea,[role=combobox],[aria-haspopup=listbox]," +
        "[role=radio],[role=checkbox],[role=switch],[role=listbox],[role=textbox]");
      for (let i = 0; i < nodes.length && i < 200; i++) {
        const el = nodes[i];
        if (el.type === "hidden") continue;
        const v = (el.value || el.textContent || "").trim();
        if (!v || v.length > 60) continue;
        const f = matchField(el);
        if (f && f.id === wantId) return v;
      }
    } catch (e) {}
    return "";
  }

  // ── 举例用的国家：跟着「界面语言」走 ──
  // 用户选了日语助手，例子就该举日本，而不是让他从中文的例子里再换算一次。
  // 严格保持"举例"口吻，不做成"你是哪国人"的断言（读不到就退回美国当中性例子）。
  // 一次举 2~3 个例子：说这门语言的国家往往不止一个，多给几个能覆盖更多人。
  // 举再多就啰嗦了，所以封顶 3 个。猜不中也无妨——这只是举例，不是断言。
  function exampleCountries() {
    const keys = [lang, (navigator.language || "en"), (navigator.language || "en").split("-")[0], "en"];
    for (const k of keys) {
      const list = nat && nat.locales && nat.locales[k];
      if (list && list.length) {
        const out = [];
        for (const code of list.slice(0, 3)) {
          const info = (nat.countries || {})[code];
          if (info) out.push(info);
        }
        if (out.length) return out;
      }
    }
    const usa = nat && nat.countries && nat.countries.USA;
    return usa ? [usa] : [];
  }

  function exampleCountry() {
    const keys = [lang, (navigator.language || "en"), (navigator.language || "en").split("-")[0], "en"];
    for (const k of keys) {
      const list = nat && nat.locales && nat.locales[k];
      if (list && list.length) {
        const info = (nat.countries || {})[list[0]];
        if (info) return info;
      }
    }
    return (nat && nat.countries && nat.countries.USA) || null;
  }

  // 文案里写 {{EXNAME}} / {{EXCODE}} / {{EXDIAL}}，渲染时换成对应语言的例子国家
  function fillEx(text) {
    if (!text || text.indexOf("{{") < 0) return text || "";
    const c = exampleCountry();
    if (!c) return text.replace(/\{\{EX(NAME|CODE|DIAL)\}\}/g, "");
    const nm = (c.name && (c.name[lang] || c.name.en)) || c.iso3;
    const sep = (lang && (lang.indexOf("zh") === 0 || lang === "ja")) ? "、" : ", ";
    const list = exampleCountries().map((x) =>
      ((x.name && (x.name[lang] || x.name.en)) || x.iso3) + " " + x.iso3).join(sep);
    return text.replace(/\{\{EXLIST\}\}/g, list)
               .replace(/\{\{EXNAME\}\}/g, nm)
               .replace(/\{\{EXCODE\}\}/g, c.iso3)
               .replace(/\{\{EXDIAL\}\}/g, c.dial || "");
  }

  // 电话国家号：优先用用户前面已填的国家；读不到就举一个中性例子。
  // 全部 9 种语言，不留英文。
  const DIAL_T = {
    "zh": [
      "你前面填的是 ",
      "，国家号就是 ",
      "。",
      "举个例子：",
      " 的国家号是 ",
      "。你填自己国家的那个。"
    ],
    "zh-TW": [
      "你前面填的是 ",
      "，國碼就是 ",
      "。",
      "舉個例子：",
      " 的國碼是 ",
      "。你填自己國家的那個。"
    ],
    "en": [
      "You entered ",
      " earlier — its country code is ",
      ".",
      "For example, ",
      "'s country code is ",
      ". Use your own country's."
    ],
    "ja": [
      "先ほど入力したのは ",
      " なので、国番号は ",
      " です。",
      "例えば ",
      " の国番号は ",
      " です。ご自分の国のものを入れてください。"
    ],
    "ko": [
      "앞에서 입력한 것은 ",
      " 이므로 국가번호는 ",
      " 입니다.",
      "예를 들어 ",
      " 의 국가번호는 ",
      " 입니다. 본인 나라의 번호를 넣으세요."
    ],
    "fr": [
      "Vous avez indiqué ",
      " — son indicatif est ",
      ".",
      "Par exemple, l'indicatif de ",
      " est ",
      ". Utilisez celui de votre pays."
    ],
    "es": [
      "Antes indicó ",
      " — su prefijo es ",
      ".",
      "Por ejemplo, el prefijo de ",
      " es ",
      ". Use el de su país."
    ],
    "vi": [
      "Bạn đã chọn ",
      " — mã điện thoại là ",
      ".",
      "Ví dụ, mã điện thoại của ",
      " là ",
      ". Hãy dùng mã của nước bạn."
    ],
    "th": [
      "คุณเลือก ",
      " ไว้ก่อนหน้า — รหัสโทรศัพท์คือ ",
      "",
      "ตัวอย่าง รหัสโทรศัพท์ของ ",
      " คือ ",
      " กรุณาใช้รหัสของประเทศคุณ"
    ],
    "ru": ["Вы указали ", " — код страны ", ".", "Например, код ", " — ", ". Укажите код своей страны."],
    "de": ["Sie haben ", " angegeben — die Vorwahl ist ", ".", "Zum Beispiel ist die Vorwahl von ", " ", ". Nehmen Sie die Ihres Landes."],
    "pl": ["Wpisano ", " — numer kierunkowy to ", ".", "Na przykład numer ", " to ", ". Wpisz numer swojego kraju."],
    "it": ["Hai indicato ", " — il prefisso è ", ".", "Per esempio, il prefisso di ", " è ", ". Usa quello del tuo paese."],
    "ar": ["اخترت ", " — رمز البلد هو ", ".", "مثلاً، رمز ", " هو ", ". استخدم رمز بلدك."],
    "tr": ["Şunu seçtiniz: ", " — ülke kodu ", ".", "Örneğin ", " kodu ", ". Kendi ülkenizin kodunu yazın."],
    "uk": ["Ви вказали ", " — код країни ", ".", "Наприклад, код ", " — ", ". Вкажіть код своєї країни."],
    "pt": ["Você indicou ", " — o código do país é ", ".", "Por exemplo, o código de ", " é ", ". Use o do seu país."],
    "nl": ["U vulde ", " in — de landcode is ", ".", "Bijvoorbeeld, de landcode van ", " is ", ". Gebruik die van uw land."],
    "id": ["Anda memilih ", " — kode negara adalah ", ".", "Misalnya, kode ", " adalah ", ". Gunakan kode negara Anda."],
    "ms": ["Anda pilih ", " — kod negara ialah ", ".", "Contohnya, kod ", " ialah ", ". Gunakan kod negara anda."],
    "hi": ["आपने ", " चुना — देश कोड है ", "।", "उदाहरण: ", " का कोड ", " है। अपना देश कोड लिखें।"],
    "he": ["בחרתם ", " — קידומת המדינה היא ", ".", "לדוגמה, הקידומת של ", " היא ", ". השתמשו בקידומת של המדינה שלכם."],
    "cs": ["Uvedli jste ", " — předvolba je ", ".", "Například předvolba ", " je ", ". Použijte předvolbu své země."],
    "hu": ["Ezt adta meg: ", " — az országkód ", ".", "Például ", " kódja ", ". A saját országáét írja be."],
    "ro": ["Ați ales ", " — prefixul este ", ".", "De exemplu, prefixul pentru ", " este ", ". Folosiți prefixul țării dvs."],
    "fa": ["شما ", " را نوشتید — کد کشور ", " است.", "مثلاً کد ", " ", " است. کد کشور خودتان را بگذارید."],
    "el": ["Δηλώσατε ", " — ο κωδικός χώρας είναι ", ".", "Για παράδειγμα, ο κωδικός της ", " είναι ", ". Βάλτε τον κωδικό της χώρας σας."]
  };

  function dialHintHTML(f) {
    if (!f.dialFrom || !nat) return "";
    const t = DIAL_T[lang] || DIAL_T.en;
    const nameOf = (i) => (i.name && (i.name[lang] || i.name.en)) || i.iso3;
    for (const src of f.dialFrom) {
      const raw = readFieldValue(src);
      if (!raw) continue;
      const m = String(raw).toUpperCase().match(/\b([A-Z]{3})\b/);
      if (!m) continue;
      const info = (nat.countries || {})[m[1]];
      if (!info || !info.dial) continue;
      return `<div class="dial">${t[0]}${nameOf(info)}${t[1]}${info.dial}${t[2]}</div>`;
    }
    const c = exampleCountry();
    if (!c || !c.dial) return "";
    return `<div class="dial">${t[3]}${nameOf(c)}${t[4]}${c.dial}${t[5]}</div>`;
  }

  function illuHTML(f) {
    const map = { boarding_pass: "icons/boarding_pass.svg", passport: "icons/passport.svg", passport_nationality: "icons/passport_nationality.svg" };
    const file = map[f.illustration];
    return file ? `<div class="illu"><img src="${rurl(file)}" alt=""></div>` : "";
  }

  function safeExamples(f) {
    if (f.format) return [];
    return (f.examples || []).filter((x) => !/^[\d\s\/\-\.:]+$/.test(String(x)));
  }

  const REF = {
    "zh":    ["你在「", "」里填的是：", "，多数人这一栏也是同一个。"],
    "zh-TW": ["你在「", "」裡填的是：", "，多數人這一欄也是同一個。"],
    "en":    ["You entered this for ", ": ", " — for most people this field is the same."],
    "ja":    ["「", "」に入力したのは ", " です。多くの場合この欄も同じになります。"],
    "ko":    ["「", "」에 입력한 값은 ", " 입니다. 대부분 이 칸도 같습니다."],
    "fr":    ["Vous avez saisi pour « ", " » : ", " — pour la plupart des gens, ce champ est identique."],
    "es":    ["Lo que puso en «", "»: ", " — para la mayoría, este campo es el mismo."],
    "vi":    ["Ở « ", " » bạn đã nhập: ", " — với phần lớn mọi người ô này cũng giống vậy."],
    "th":    ["ในช่อง « ", " » คุณกรอกว่า ", " — สำหรับคนส่วนใหญ่ช่องนี้ก็เหมือนกัน"],
    "ru": ["Вы указали для «", "»: ", " — у большинства это поле такое же."],
    "de": ["Bei „", "“ haben Sie eingetragen: ", " — bei den meisten ist dieses Feld gleich."],
    "pl": ["W polu „", "” wpisano: ", " — u większości to pole jest takie samo."],
    "it": ["Per «", "» hai inserito: ", " — per la maggior parte questo campo è uguale."],
    "ar": ["في «", "» أدخلت: ", " — عند معظم الناس هذا الحقل هو نفسه."],
    "tr": ["«", "» için girdiğiniz: ", " — çoğu kişide bu alan aynıdır."],
    "uk": ["У полі «", "» ви вказали: ", " — у більшості це поле таке саме."],
    "pt": ["Em «", "» você pôs: ", " — para a maioria este campo é o mesmo."],
    "nl": ["Bij «", "» vulde u in: ", " — bij de meesten is dit veld hetzelfde."],
    "id": ["Di «", "» Anda mengisi: ", " — bagi kebanyakan orang kolom ini sama."],
    "ms": ["Pada «", "» anda isi: ", " — bagi kebanyakan orang ruangan ini sama."],
    "hi": ["«", "» में आपने लिखा: ", " — ज़्यादातर लोगों का यह खाना वही होता है।"],
    "he": ["ב«", "» הזנתם: ", " — אצל רוב האנשים השדה הזה זהה."],
    "cs": ["U «", "» jste uvedli: ", " — u většiny lidí je toto pole stejné."],
    "hu": ["A(z) «", "» mezőbe ezt írta: ", " — a legtöbb embernél ez a mező ugyanaz."],
    "ro": ["La «", "» ați scris: ", " — la majoritatea acest câmp e la fel."],
    "fa": ["در «", "» نوشتید: ", " — برای بیشتر افراد این خانه همان است."],
    "el": ["Στο «", "» γράψατε: ", " — για τους περισσότερους αυτό το πεδίο είναι το ίδιο."]
  };

  function refHTML(f) {
    if (!f.refFrom) return "";
    const v = readFieldValue(f.refFrom);
    if (!v) return "";
    const from = country.fields.filter((x) => x.id === f.refFrom)[0];
    const fromName = from ? pick(from.label) : f.refFrom;
    const t = REF[lang] || REF.en;
    return `<div class="tipref">${t[0]}${fromName}${t[1]}<b>${v}</b>${t[2]}</div>`;
  }

  const NAT_TIP = {
    "zh": "💡 这张表里没找到对应候选，直接点开下拉打字跳转（如 chn / china）。",
    "zh-TW": "💡 這張表裡沒找到對應候選，直接點開下拉打字跳轉（如 chn / china）。",
    "en": "💡 No matching option in this list. Open it and type to jump (for example chn / china).",
    "ja": "💡 この一覧に候補がありません。開いて入力すると飛べます（例：chn / china）。",
    "ko": "💡 이 목록에 맞는 항목이 없습니다. 열고 입력하면 이동합니다(예: chn / china).",
    "fr": "💡 Aucun choix correspondant. Ouvrez la liste et tapez pour sauter (par ex. chn / china).",
    "es": "💡 No hay una opción que coincida. Abra la lista y escriba para saltar (p. ej. chn / china).",
    "vi": "💡 Không có mục khớp. Mở danh sách và gõ để nhảy (ví dụ chn / china).",
    "th": "💡 ไม่พบตัวเลือกที่ตรงกัน เปิดรายการแล้วพิมพ์เพื่อข้ามไป (เช่น chn / china)",
    "ru": "💡 В этом списке нет подходящего пункта. Откройте его и начните печатать (например chn / china).",
    "de": "💡 Kein passender Eintrag. Liste öffnen und tippen, um zu springen (z. B. chn / china).",
    "pl": "💡 Brak pasującej pozycji. Otwórz listę i zacznij pisać (np. chn / china).",
    "it": "💡 Nessuna voce corrispondente. Apri l'elenco e inizia a scrivere (es. chn / china).",
    "ar": "💡 لا يوجد خيار مطابق. افتح القائمة واكتب للانتقال (مثل chn / china).",
    "tr": "💡 Eşleşen seçenek yok. Listeyi açıp yazarak atlayın (ör. chn / china).",
    "uk": "💡 У цьому списку немає відповідного пункту. Відкрийте його й почніть друкувати (наприклад chn / china).",
    "pt": "💡 Não há opção correspondente. Abra a lista e digite para saltar (ex.: chn / china).",
    "nl": "💡 Geen passende keuze. Open de lijst en typ om te springen (bijv. chn / china).",
    "id": "💡 Tidak ada pilihan yang cocok. Buka daftar dan ketik untuk melompat (mis. chn / china).",
    "ms": "💡 Tiada pilihan yang sepadan. Buka senarai dan taip untuk melompat (cth. chn / china).",
    "hi": "💡 कोई मेल खाता विकल्प नहीं। सूची खोलकर टाइप करें (जैसे chn / china)।",
    "he": "💡 אין אפשרות מתאימה. פתחו את הרשימה והקלידו כדי לקפוץ (למשל chn / china).",
    "cs": "💡 Žádná odpovídající položka. Otevřete seznam a začněte psát (např. chn / china).",
    "hu": "💡 Nincs egyező tétel. Nyissa meg a listát, és kezdjen gépelni (pl. chn / china).",
    "ro": "💡 Nu există o opțiune potrivită. Deschideți lista și începeți să tastați (de ex. chn / china).",
    "fa": "💡 گزینهٔ مطابق نیست. فهرست را باز کنید و تایپ کنید تا بروید (مثلاً chn / china).",
    "el": "💡 Δεν υπάρχει αντίστοιχη επιλογή. Ανοίξτε τη λίστα και πληκτρολογήστε (π.χ. chn / china)."
  };

  function fieldBodyHTML(f, el) {
    const ex = safeExamples(f).map((x) => `<span class="chip" data-copy="${x}">${x}</span>`).join("");
    let natBlock = "";
    if (nat && isNationalityLike(el, f) && el.tagName === "SELECT") {
      const found = natSuggestions(el);
      natBlock = found.length
        ? `<div class="egnat">${found.map((x) => `<button class="egnatbtn" data-value="${(x.opt.value || "").replace(/"/g, "&quot;")}">${pick(x.info.name)} → <b>${x.opt.textContent.trim()}</b></button>`).join("")}</div>`
        : `<div class="egnattip">${(NAT_TIP[lang] || NAT_TIP.en)}</div>`;
    }
    // format = 只能填你自己的信息，只给格式说明，故意不做成可点复制，避免照抄示例
    const fmt = f.format ? `<div class="fmt"><span class="fmtk">${ui("fmt")}</span>${pick(f.format)}</div>` : "";
    return `<b>${pick(f.label)}</b>
      ${f.reassure ? `<div class="reassure">✓ ${pick(f.reassure)}</div>` : ""}
      ${f.tip ? `<div class="tip"><span class="tipk">🔍</span>${pick(f.tip)}${refHTML(f)}</div>` : ""}
      ${f.how ? `<div class="how">${pick(f.how)}${dialHintHTML(f)}</div>` : ""}
      ${natBlock}
      ${fmt}
      ${illuHTML(f)}
      ${ex ? `<div class="chipcap">${ui("opts")}</div><div class="chips">${ex}</div>` : ""}
      ${f.default ? `<div class="dft">${ui("dft")} <b>${f.default}</b></div>` : ""}
      ${f.stepEnd ? `<div class="stepend">✅ ${pick(f.stepEnd)}</div>` : ""}`;
  }

  // 该不该靠边：
  //   side   —— 用户选了「固定在右上角」，永远靠边
  //   beside —— 用户选了「贴着字段」，永远贴着
  //   auto   —— 左右两侧都放不下才靠边（窄屏、或字段本身很宽的时候）
  function shouldDock(el) {
    if (dockMode === "side") return true;
    if (dockMode === "beside") return false;
    let r;
    try { r = el.getBoundingClientRect(); } catch (e) { return false; }
    const bw = (bubbleEl && bubbleEl.offsetWidth) || 300;
    const M = 12;
    const fitsRight = r.right + M + bw <= window.innerWidth - 8;
    const fitsLeft  = r.left - M - bw >= 8;
    return !(fitsRight || fitsLeft);
  }

  // 靠边之后气泡离字段很远，用户会不知道它说的是哪一栏 —— 给当前字段描一圈边。
  // 用行内 style 而不是加 class：官网的样式表五花八门，加 class 可能被它们的规则盖掉，
  // 而且行内样式好还原（记下原值，走的时候放回去）。
  function setRing(el) {
    if (ringEl === el) return;
    clearRing();
    if (!el || !el.style) return;
    try {
      ringPrev = el.style.outline || "";
      ringPrevOff = el.style.outlineOffset || "";
      el.style.outline = "2px solid #c96442";
      el.style.outlineOffset = "2px";
      ringEl = el;
    } catch (e) { ringEl = null; }
  }
  function clearRing() {
    if (!ringEl) return;
    try { ringEl.style.outline = ringPrev; ringEl.style.outlineOffset = ringPrevOff; } catch (e) {}
    ringEl = null; ringPrev = ""; ringPrevOff = "";
  }

  // 位置策略：优先放在字段【右侧】，其次左侧。
  // 原因：下拉候选列表几乎都是向下弹的，气泡放下面必然挡住它们。
  function positionBubble(el) {
    if (!bubbleEl) return;
    if (!userMoved) {
      const dock = shouldDock(el);
      bubbleEl.classList.toggle("docked", dock);
      if (dock) { bubbleEl.style.left = ""; bubbleEl.style.top = ""; setRing(el); }
      else clearRing();
    }
    if (bubbleEl.classList.contains("docked")) return;
    if (userMoved) return;                      // 用户手动拖过，就尊重用户摆的位置，不再自动跳
    let r;
    try { r = el.getBoundingClientRect(); } catch (e) { return; }
    const bw = bubbleEl.offsetWidth || 280;
    const bh = bubbleEl.offsetHeight || 180;
    const M = 12;
    let left;
    if (r.right + M + bw <= window.innerWidth - 8) left = r.right + M;
    else if (r.left - M - bw >= 8) left = r.left - M - bw;
    else left = Math.min(Math.max(8, r.left), window.innerWidth - bw - 8);
    let top = r.top;
    if (top + bh > window.innerHeight - 8) top = window.innerHeight - bh - 8;
    if (top < 8) top = 8;
    bubbleEl.style.left = left + "px";
    bubbleEl.style.top = top + "px";
  }

  // 拖拽：不用 setPointerCapture。
  // 之前的 bug——在标题条上 setPointerCapture 会把后续 click 重定向到标题条本身，
  // 导致条里的 📌 / ⧉ / ✕ 三个按钮全部点不动。改成把 move/up 挂到 window 上。
  function wireDrag() {
    const bar = shadow && shadow.querySelector("#egdrag");
    if (!bar || bar._egWired) return;
    bar._egWired = true;
    bar.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("button")) return;   // 点按钮不进入拖拽
      let rect;
      try { rect = bubbleEl.getBoundingClientRect(); } catch (err) { return; }
      dragState = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.preventDefault();
    });
  }

  function wireGlobalDrag() {
    if (window._egDragWired) return;
    window._egDragWired = true;
    window.addEventListener("pointermove", (e) => {
      if (!dragState || !bubbleEl) return;
      userMoved = true;
      bubbleEl.classList.remove("docked");
      const bw = bubbleEl.offsetWidth || 280;
      const x = Math.max(4, Math.min(window.innerWidth - bw - 4, e.clientX - dragState.dx));
      const y = Math.max(4, Math.min(window.innerHeight - 40, e.clientY - dragState.dy));
      bubbleEl.style.left = x + "px";
      bubbleEl.style.top = y + "px";
    }, true);
    window.addEventListener("pointerup", () => { dragState = null; }, true);
    window.addEventListener("pointercancel", () => { dragState = null; }, true);
  }

  function renderBubble(f, el) {
    ensureHost();
    if (!bubbleEl) { console.error("[EntryGuide] 气泡容器创建失败，跳过"); return; }
    wireGlobalDrag();

    // 同一个字段重复聚焦时不重建 DOM，避免按钮和已绑定的事件被反复销毁
    if (curFieldId !== f.id || curEl !== el) {
      curFieldId = f.id; curEl = el;
      let body = "";
      try { body = fieldBodyHTML(f, el); }
      catch (err) { console.error("[EntryGuide] 组装内容出错，改用最简说明", err); body = `<b>${pick(f.label)}</b>`; }
      bubbleEl.innerHTML = `
        <div class="eg-bar" id="egdrag">
          <span class="eg-logo">🛡</span><span class="eg-name">${pick(country.name)} · ${country.card_name}</span>
          <span class="eg-btns">
            <button type="button" data-a="pin" title="持续展示" class="${pinned ? "on" : ""}">📌</button>
            <button type="button" data-a="dock" title="靠边固定">⧉</button>
            <button type="button" data-a="close" title="关闭">✕</button>
          </span>
        </div>
        <div class="eg-body">${body}</div>
        <div class="eg-foot">🔒 官方链接已核验 · <a href="${country.official_url}" target="_blank" rel="noopener">${(new URL(country.official_url)).hostname}</a></div>`;

      bubbleEl.querySelector('[data-a="close"]').onclick = (ev) => { ev.stopPropagation(); hideBubble(true); };
      bubbleEl.querySelector('[data-a="pin"]').onclick = (ev) => {
        ev.stopPropagation();
        pinned = !pinned;
        ev.currentTarget.classList.toggle("on", pinned);
      };
      // 切换靠边／贴着，并把选择存下来 —— 下一页、下一次打开都照这个来
      bubbleEl.querySelector('[data-a="dock"]').onclick = (ev) => {
        ev.stopPropagation();
        userMoved = false;
        dockMode = bubbleEl.classList.contains("docked") ? "beside" : "side";
        try { chrome.storage.local.set({ dockMode: dockMode }); } catch (e) {}
        bubbleEl.style.left = ""; bubbleEl.style.top = "";
        positionBubble(el);
      };
      bubbleEl.querySelectorAll(".egnatbtn").forEach((b) => b.onclick = (ev) => {
        ev.stopPropagation();
        el.value = b.dataset.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      bubbleEl.querySelectorAll(".chip").forEach((c) => c.onclick = (ev) => {
        ev.stopPropagation();
        try { navigator.clipboard.writeText(c.dataset.copy); } catch (e) {}
      });
      wireDrag();
    }

    clearTimeout(hideTimer);          // 有待执行的隐藏就取消，防止刚弹出又被旧计时器关掉
    shownAt = Date.now();
    bubbleEl.classList.add("show");
    positionBubble(el);
  }

  function hideBubble(userClosed) {
    if (dragState) return;                 // 正在拖动，不要消失
    if (pinned && !userClosed) return;
    if (bubbleEl) bubbleEl.classList.remove("show");
    clearRing();
    if (userClosed) { pinned = false; curFieldId = null; curEl = null; }
  }

  // 很多站点的"下拉框"并不是原生 <select>，而是带 role=combobox 的 div
  // （Angular Material 的 mat-select、Ant Design、Element UI 都是这种）。
  // 只认 INPUT/SELECT/TEXTAREA 的话，这类下拉永远不会弹气泡。
  function isFieldLike(el) {
    if (!el || !el.tagName) return false;
    if (["INPUT", "SELECT", "TEXTAREA"].indexOf(el.tagName) >= 0) return true;
    const role = (el.getAttribute("role") || "").toLowerCase();
    // radio / checkbox / switch 是马尔代夫逼出来的：
    // IMUGA 的「抵达日期」四张卡片是 <ui-radio role="radio">，整页 input[type=radio] 数量为 0，
    // 完全靠自定义元素 + ARIA 角色。不认 role=radio 的话这类控件永远不弹气泡。
    if (["combobox", "listbox", "textbox", "spinbutton",
         "radio", "checkbox", "switch"].indexOf(role) >= 0) return true;
    if ((el.getAttribute("aria-haspopup") || "").toLowerCase() === "listbox") return true;
    if (/^MAT-SELECT$/i.test(el.tagName)) return true;
    const cls = (el.className && el.className.toString) ? el.className.toString() : "";
    return /mat-mdc-select|mat-select|ant-select|el-select|select__control|dropdown-toggle/i.test(cls);
  }

  function onFocusIn(e) {
    if (paused) return;
    if (!country) return;
    // composedPath()[0] 而不是 e.target：输入框在 Shadow DOM 里时 e.target 会被重定向成外层宿主元素
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const el = path[0] || e.target;
    if (!isFieldLike(el)) return;
    const f = matchField(el);
    console.debug("[EntryGuide] focusin", el.tagName, "| label:", getLabelText(el), "| matched:", f && f.id);
    if (f) renderBubble(f, el);
  }

  // 隐藏判定收紧：宁可多留一会儿，也不要"闪一下就没"。
  // v0.5.1 的问题就出在这里——当时只判断"焦点是否在气泡里"，
  // 但 Angular Material 这类组件在打开下拉/校验时会内部 blur 再 focus 回同一个输入框，
  // 这一瞬间焦点既不在气泡里、也还没回到输入框，于是气泡被误关。
  function tryHide() {
    if (dragState || pinned) return;
    const a = document.activeElement;
    if (a === curEl) return;                                   // 焦点还在（或已回到）当前这个输入框
    if (a && hostEl && (a === hostEl || hostEl.contains(a))) return;   // 焦点在气泡内部
    // 自定义下拉展开时，焦点会跑到浮层面板上（cdk-overlay 等），这时候更不该关气泡
    if (a && a.closest && a.closest(".cdk-overlay-container, .mat-mdc-select-panel, .mat-mdc-autocomplete-panel, [role=listbox], [role=option], .ant-select-dropdown, .el-select-dropdown")) return;
    if (!a || a === document.body || a === document.documentElement) return; // 焦点暂时飘走（多半是下拉浮层），先留着
    const since = Date.now() - shownAt;
    if (since < 700) { scheduleHide(700 - since); return; }    // 刚弹出来不到 0.7 秒，推迟再判断一次
    console.debug("[EntryGuide] hide, focus moved to:", a && a.tagName, a && a.id);
    hideBubble(false);
  }

  function scheduleHide(delay) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(tryHide, delay || 350);
  }

  function onFocusOut() { scheduleHide(350); }

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.dockMode) {
        const v = changes.dockMode.newValue;
        dockMode = (v === "side" || v === "beside") ? v : "auto";
        userMoved = false;
        if (bubbleEl && curEl) { bubbleEl.style.left = ""; bubbleEl.style.top = ""; positionBubble(curEl); }
      }
      if (changes[PAUSE_KEY]) {
        paused = !!changes[PAUSE_KEY].newValue;
        if (paused) hideBubble(true);
      }
    });
  }

  // 因为上面的隐藏判定很保守（焦点飘到空处时会留着气泡），
  // 这里补一个明确的关闭途径：点了页面空白处（既不在气泡上、也不是输入框）就收起。
  function onDocPointerDown(e) {
    if (pinned) return;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    if (hostEl && (path.indexOf(hostEl) >= 0 || (e.target && e.target === hostEl))) return;
    const t = path[0] || e.target;
    if (t && t.tagName && ["INPUT", "SELECT", "TEXTAREA", "LABEL", "OPTION"].indexOf(t.tagName) >= 0) return;
    if (t && t.closest && t.closest(".cdk-overlay-container, [role=listbox], [role=option], .mat-mdc-autocomplete-panel")) return;
    hideBubble(false);
  }

  (async function init() {
    await loadData();
    if (!country) return;
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("pointerdown", onDocPointerDown, true);
  })();
})();
