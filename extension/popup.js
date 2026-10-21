"use strict";
let DATA = { data_version: "", countries: [] };
let NAT = { locales:{}, countries:{} };
let LANG = "en";

const $ = (id) => document.getElementById(id);
const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
const pick = (o) => o ? (o[LANG] || o.en || o.zh || "") : "";
const sget = (d) => new Promise((r) => chrome.storage.local.get(d, r));
const sset = (o) => new Promise((r) => chrome.storage.local.set(o, r));

async function loadBundled() {
  const idx = await fetch(chrome.runtime.getURL("data/index.json")).then((r) => r.json());
  const countries = [];
  for (const c of idx.countries) countries.push(await fetch(chrome.runtime.getURL("data/" + c.file)).then((r) => r.json()));
  return { data_version: idx.data_version, countries };
}
async function getInitialData() {
  const { cache } = await sget({ cache: null });
  if (cache && cache.countries && cache.countries.length) return cache;
  return await loadBundled();
}
function joinUrl(b, p) { return b.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, ""); }
async function trySync(cur) {
  const { dataBaseUrl } = await sget({ dataBaseUrl: "" });
  if (!dataBaseUrl) return null;
  try {
    const idx = await fetch(joinUrl(dataBaseUrl, "index.json"), { cache: "no-store" }).then((r) => r.json());
    if (!idx.data_version || idx.data_version <= cur) return null;
    const countries = [];
    for (const c of idx.countries) countries.push(await fetch(joinUrl(dataBaseUrl, c.file)).then((r) => r.json()));
    const fresh = { data_version: idx.data_version, countries };
    await sset({ cache: fresh });
    return fresh;
  } catch (e) { return null; }
}

function toast(m) { const el = $("toast"); el.textContent = m; el.style.opacity = "1"; setTimeout(() => (el.style.opacity = "0"), 1600); }
function openUrl(u) { chrome.tabs.create({ url: u }); }
async function askAI(q) {
  const { engine } = await sget({ engine: "https://www.google.com/search?q={q}" });
  openUrl((engine || "https://www.google.com/search?q={q}").replace("{q}", encodeURIComponent(q)));
}
function shareLinks(text, url) {
  const e = encodeURIComponent, msg = e(text + " " + url);
  return { WhatsApp: "https://wa.me/?text=" + msg, LINE: "https://social-plugins.line.me/lineit/share?url=" + e(url), Email: "mailto:?subject=" + e(text) + "&body=" + msg };
}

function natCandidates() {
  // 先看用户在插件里选的界面语言（LANG），再退浏览器语言。
  // ⚠ 原来只看 navigator.language：用户把插件切成日语、Chrome 却是中文时，
  //   这里还在显示 中国 / 新加坡 / 马来西亚，跟他选的语言对不上，等于没用。
  const b = (navigator.language || "en");
  const keys = [LANG, String(LANG).split("-")[0], b, b.replace("_", "-"), b.split("-")[0]];
  for (const k of keys) if (k && NAT.locales && NAT.locales[k]) return NAT.locales[k];
  return [];
}
function natHelpHTML() {
  const chips = natCandidates().map((c) => { const r = (NAT.countries || {})[c]; if (!r) return "";
    const nm = (r.name && (r.name[LANG] || r.name.en)) || c;
    return `<span class="chip natchip" data-copy="${r.iso3}"><span class="nm">${nm}</span><span class="arrow">→</span><span class="code">${r.iso3}</span></span>`; }).join("");
  return (chips ? `<div class="natline">${t("nat_maybe")}</div><div class="chips natchips">${chips}</div>` : `<div class="natline">${t("nat_none")}</div>`)
    + `<div class="nattip">💡 ${t("nat_tip")}</div>`;
}
function pairsHTML(pairs) {
  return `<div class="pairs">${(pairs || []).map((p) =>
    `<div class="pair"><span class="pzh">${p.term}</span><span class="parrow">→</span><span class="pen">${p.en}</span></div>`).join("")}</div>`;
}
function renderHighlight(c) {
  const h = c.highlight;
  if (!h) return `<div class="natttl">🌐 ${t("nat_help")}</div>${natHelpHTML()}`;
  const title = pick(h.title) || t("nat_help");
  if (h.type === "nationality_code") return `<div class="natttl">🌐 ${title}</div>${natHelpHTML()}`;
  if (h.type === "no_english") return `<div class="natttl">🈶 ${title}</div>`
    + (h.pairs && h.pairs.length ? pairsHTML(h.pairs) : "")
    + (h.body ? `<div class="hlbody">${pick(h.body)}</div>` : "");
  return `<div class="natttl">💡 ${title}</div>${h.body ? `<div class="hlbody">${pick(h.body)}</div>` : ""}`;
}
function illustrationHTML(f) {
  const map = { boarding_pass: "icons/boarding_pass.svg", passport: "icons/passport.svg", passport_nationality: "icons/passport_nationality.svg" };
  const file = map[f.illustration];
  return file ? `<div class="illu"><img src="${chrome.runtime.getURL(file)}" alt=""></div>` : "";
}
// 防呆兜底（不依赖数据写得对）：
// 1) 一旦这个字段有"填写格式"说明，就说明它填的是用户自己的信息 → 完全不显示可点选项
// 2) 纯数字/纯符号的示例一律丢弃 —— 真正的"可选项"都是词（HOTEL、MALE…），
//    长得像数据的（1990、01、15、10110）绝不能做成点一下就复制
function safeExamples(f) {
  if (f.format) return [];
  return (f.examples || []).filter((x) => !/^[\d\s\/\-\.:]+$/.test(String(x)));
}

function fieldHTML(f) {
  const ex = safeExamples(f).map((x) => `<span class="chip" data-copy="${x}">${x}</span>`).join("");
  // format 只给格式说明、不可点复制，避免用户照抄成别人的信息
  const fmt = f.format ? `<div class="fmt"><span class="fmtk">${t("fmt_label")}</span>${pick(f.format)}</div>` : "";
  return `<div class="field"><b>${pick(f.label)}</b>
    ${f.reassure ? `<div class="reassure">✓ ${pick(f.reassure)}</div>` : ""}
    ${f.tip ? `<div class="tip"><span class="tipk">🔍</span>${pick(f.tip)}</div>` : ""}
    ${f.how ? `<div class="how">${pick(f.how)}</div>` : ""}
    ${illustrationHTML(f)}
    ${fmt}
    ${ex ? `<div class="chipcap">${t("opts_label")}</div><div class="chips">${ex}</div>` : ""}
    ${f.default ? `<div class="dft">${t("default_use")} <b>${f.default}</b></div>` : ""}
    ${f.stepEnd ? `<div class="stepend">✅ ${pick(f.stepEnd)}</div>` : ""}</div>`;
}

function flagUrl(id) { return chrome.runtime.getURL("icons/flags/" + id.toLowerCase() + ".svg"); }
function card(c) {
  const el = document.createElement("details");
  el.className = "card"; el.setAttribute("name", "eg-countries"); // Chrome 原生互斥手风琴
  const sh = shareLinks(`${pick(c.name)} — ${c.card_name}`, c.official_url);
  el.innerHTML = `
    <summary class="crow"><img class="flagimg" src="${flagUrl(c.id)}" alt="${c.flag} ${c.id}"><span class="cname">${pick(c.name)}</span><span class="ctag">${c.card_name}</span></summary>
    <div class="cbody">
      <div class="natbox">${renderHighlight(c)}</div>
      <div class="badges"><span class="badge official">${t("official")}</span>
        ${c.free ? `<span class="badge free">${t("free")}</span>` : ""}
        ${c.last_verified ? `<span class="badge veri">${t("verified")} ${c.last_verified}</span>` : ""}</div>
      ${c.reachability ? `<div class="reach">⚠ ${t("heads_up")}: ${pick(c.reachability)}</div>` : ""}
      <div class="row"><b>${t("window")}:</b> ${pick(c.window)}</div>
      <div class="row"><b>${t("notes")}:</b> ${pick(c.notes)}</div>
      <div class="btns">
        <button class="primary" data-act="open">${t("open_site")}</button>
        ${c.secondary_url ? `<button data-act="open2">${t("secondary")}</button>` : ""}
        <button data-act="ask">${t("ask")}</button>
        <button data-act="copy">${t("copy")}</button></div>
      <div class="share">
        <a class="btn" target="_blank" href="${sh.WhatsApp}">WhatsApp</a>
        <a class="btn" target="_blank" href="${sh.LINE}">LINE</a>
        <a class="btn" target="_blank" href="${sh.Email}">Email</a></div>
      <details class="sub"><summary>${t("fields")}</summary>${(c.fields || []).map(fieldHTML).join("")}</details>
    </div>`;
  el.querySelector('[data-act="open"]').onclick = () => openUrl(c.official_url);
  const o2 = el.querySelector('[data-act="open2"]'); if (o2) o2.onclick = () => openUrl(c.secondary_url);
  el.querySelector('[data-act="ask"]').onclick = () => askAI(`${pick(c.name)} ${c.card_name} how to fill official`);
  el.querySelector('[data-act="copy"]').onclick = (e) => { navigator.clipboard.writeText(c.official_url);
    e.target.textContent = t("copied"); setTimeout(() => (e.target.textContent = t("copy")), 1200); };
  el.querySelectorAll(".chip").forEach((ch) => ch.onclick = () => { navigator.clipboard.writeText(ch.dataset.copy); toast(t("copied")); });
  return el;
}

function render() {
  const q = ($("search").value || "").trim().toLowerCase();
  const list = $("list"); list.innerHTML = "";
  const hits = DATA.countries.filter((c) => !q ||
    [pick(c.name), c.name.en, c.name.zh, c.id, c.card_name].filter(Boolean).some((s) => s.toLowerCase().includes(q)));
  if (!hits.length) { const flags = DATA.countries.map((c) => c.flag).join(" ");
    list.innerHTML = `<p class="empty">${t("no_result")}<br><span style="font-size:18px;letter-spacing:3px">${flags}</span></p>`; return; }
  hits.forEach((c) => list.appendChild(card(c)));
  if (hits.length === 1) { const d = list.querySelector("details.card"); if (d) d.open = true; }
  const _v = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || "?";
  $("dataver").textContent = "v" + _v + " · data " + (DATA.data_version || "-");
}
function applyStatic() {
  $("title").textContent = t("title"); $("subtitle").textContent = t("subtitle");
  $("search").placeholder = t("search"); $("disclaimer").textContent = "⚠ " + t("disclaimer");
  $("settings-link").textContent = t("settings") + " ⚙";
  { const _tb = $("tripbtn"); if (_tb) _tb.textContent = "🗓 " + t("sp_open"); }
  markPending();
  renderPromo();
}

/* 侦测到订票站却没弹出系统通知时（Windows 专注助手/通知被关是常态），
   这里把入口高亮出来 —— 用户点开插件就知道有事等着他，信号不会丢。 */
async function markPending() {
  try {
    const { pending } = await sget({ pending: null });
    const tb = $("tripbtn");
    if (!tb) return;
    if (pending && Date.now() - pending.at < 24 * 3600 * 1000) {
      tb.textContent = "🔔 " + t("pend_title") + " · " + pending.domain;
      tb.classList.add("hot");
    } else tb.classList.remove("hot");
  } catch (e) {}
}

/* 赞助位：弹窗底部（国家列表下方）。目的地跟着"下一趟还没走的行程"走。 */
async function renderPromo() {
  try {
    const { trips = [] } = await sget({ trips: [] });
    const today = new Date();
    const ds = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const next = trips.filter((x) => x.status !== "done" && x.date >= ds).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (window.PROMO) PROMO.render($("promo-pop"), { slot: "popup", country: next ? next.cc : null, lang: LANG, t });
  } catch (e) {}
}

/* 打开备忘界面：sidePanel.open 要用户手势，被拒时退回普通标签页，绝不"点了没反应" */
function openTripPanel() {
  try {
    chrome.windows.getCurrent((w) => {
      let ok = false;
      try {
        const p = chrome.sidePanel.open({ windowId: w.id });
        if (p && p.then) { p.then(() => { ok = true; window.close(); })
                            .catch(() => { chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") }); window.close(); }); return; }
        ok = true;
      } catch (e) {}
      if (!ok) chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
      window.close();
    });
  } catch (e) {
    chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") });
  }
}
function setLang(l) { LANG = l; document.documentElement.lang = LANG; document.documentElement.dir = (LANG === "ar" || LANG === "he" || LANG === "fa") ? "rtl" : "ltr"; sset({ lang: l }); applyStatic(); render(); }

function detectLang(navLang) { return normLang(navLang); }

function hostOf(u) { try { return new URL(u).hostname; } catch (e) { return null; } }
async function setupPageBar() {
  try {
    const tabs = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
    const tabUrl = tabs && tabs[0] && tabs[0].url;
    if (!tabUrl) return;
    const h = hostOf(tabUrl);
    const c = DATA.countries.find((c) => hostOf(c.official_url) === h);
    if (!c || !h) return;
    const bar = $("pagebar"); bar.style.display = "flex";
    const key = "pause_" + h;
    const s = await sget({ [key]: false });
    const chk = $("pausechk"); chk.checked = !s[key];
    $("pausetxt").textContent = `${pick(c.name)} · ${t("page_assist")}`;
    chk.onchange = () => sset({ [key]: !chk.checked });
  } catch (e) { /* no tabs permission or restricted page — silently skip */ }
}

async function init() {
  const sel = $("lang");
  LANG_ORDER.forEach((l) => { const o = document.createElement("option"); o.value = l; o.textContent = I18N[l].lang_name; sel.appendChild(o); });
  const s = await sget({ lang: null });
  LANG = s.lang || detectLang(navigator.language);
  document.documentElement.lang = LANG;
  document.documentElement.dir = (LANG === "ar" || LANG === "he" || LANG === "fa") ? "rtl" : "ltr";
  sel.value = LANG; sel.onchange = () => setLang(sel.value);
  $("search").oninput = render;
  $("settings-link").onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
  { const _tb = $("tripbtn"); if (_tb) _tb.onclick = openTripPanel; }
  DATA = await getInitialData();
  try { NAT = await fetch(chrome.runtime.getURL("data/nationality.json")).then((r) => r.json()); } catch (e) {}
  applyStatic(); render();
  setupPageBar();
  const fresh = await trySync(DATA.data_version);
  if (fresh) { DATA = fresh; render(); } // 静默更新
}
init();
