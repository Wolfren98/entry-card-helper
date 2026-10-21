"use strict";
const $ = (id) => document.getElementById(id);
const sget = (d) => new Promise((r) => chrome.storage.local.get(d, r));
const sset = (o) => new Promise((r) => chrome.storage.local.set(o, r));
let LANG = "en", COUNTRIES = [], VIEW = "trips";
const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;
const pick = (o) => o ? (o[LANG] || o.en || o.zh || "") : "";
// 交给 ics.js 的文案包
const icsL = () => ({ ev_flight: t("ev_flight"), ev_card: t("ev_card"), ev_card_desc: t("ev_card_desc") });

function todayStr(d) { const x = d ? new Date(d) : new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; }
function addDays(s, n) { const [y, m, d] = s.split("-").map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return todayStr(x); }
function toast(m) { const el = $("toast"); el.textContent = m; el.style.opacity = "1"; setTimeout(() => (el.style.opacity = "0"), 2200); }

async function detectLang() {
  const s = await sget({ lang: null }); if (s.lang) return s.lang;
  return normLang(navigator.language);
}
async function loadCountries() { try { const idx = await fetch(chrome.runtime.getURL("data/index.json")).then((r) => r.json()); return idx.countries || []; } catch (e) { return []; } }

/* ───────────────────── 视图切换（返回国家列表） ───────────────────── */
function setView(v) {
  VIEW = v;
  $("view-trips").hidden = (v !== "trips");
  $("view-list").hidden = (v !== "list");
  $("backbtn").textContent = (v === "trips") ? t("sp_back") : "‹ " + t("sp_tab_trips");
  $("navtitle").textContent = (v === "trips") ? t("sp_tab_trips") : t("sp_tab_list");
  try { window.scrollTo(0, 0); } catch (e) {}
  if (v === "list") renderList();
}

function applyStatic() {
  $("sp_title").textContent = t("sp_title"); $("sp_sub").textContent = t("sp_sub");
  $("l_dest").textContent = t("sp_dest"); $("l_date").textContent = t("sp_date");
  $("l_flight").textContent = t("sp_flight"); $("l_cal").textContent = t("sp_cal");
  $("save").textContent = t("sp_save"); $("upsell").textContent = t("sp_upsell");
  $("exportall").textContent = "🗂 " + t("cal_all");
  $("list_sub").textContent = t("sp_list_sub");
  $("lsearch").placeholder = t("sp_list_search");
  $("sh_close").textContent = t("cal_close");
  $("pd_yes").textContent = t("pend_yes"); $("pd_no").textContent = t("pend_no"); $("pd_mute").textContent = t("pend_mute");
  const sel = $("dest"); sel.innerHTML = "";
  const o0 = document.createElement("option"); o0.value = ""; o0.textContent = t("sp_pick"); sel.appendChild(o0);
  COUNTRIES.forEach((c) => { const o = document.createElement("option"); o.value = c.id; o.textContent = pick(c.name) + " · " + c.card_name; sel.appendChild(o); });
  const oo = document.createElement("option"); oo.value = "OTHER"; oo.textContent = t("sp_other"); sel.appendChild(oo);
  setView(VIEW);
}

function statusOf(tp) {
  const today = todayStr();
  if (tp.status === "done") return { cls: "x", key: "sp_done_tag" };
  if (today > tp.date) return { cls: "x", key: "sp_past" };
  if (tp.supported && tp.openDaysBefore != null) {
    const open = addDays(tp.date, -tp.openDaysBefore);
    if (today >= open) return { cls: "g", key: "sp_green" };
    return { cls: "a", key: "sp_amber", open };
  }
  return { cls: "b", key: "sp_memo" };
}

/* 遮罩层的显示/隐藏统一走这里。
   只写 el.hidden 是不够的：[hidden] 的 display:none 来自浏览器 UA 样式表、优先级最低，
   .sheetwrap{display:flex} 这条作者样式会把它盖掉，结果就是一个空白遮罩永远糊在最上面，
   整个侧边栏点不动。CSS 那边已经补了 .sheetwrap[hidden]{display:none!important}，
   这里再显式写一次 style.display —— 两道保险，以后改样式也不会再复发。 */
function showSheet(el, on) {
  if (!el) return;
  el.hidden = !on;
  el.style.display = on ? "flex" : "none";
}

/* ───────────────────── 日历投递 ───────────────────── */
function icsBlobUrl(trips, calName) {
  const text = ICS.build(trips, icsL(), calName);
  // ﻿：Outlook 桌面版对无 BOM 的 UTF-8 .ics 里的中文会乱码
  return URL.createObjectURL(new Blob(["﻿" + text], { type: "text/calendar;charset=utf-8" }));
}

// 之前用 <a download> 直接点，在侧边栏里经常被浏览器拦掉 —— 这就是"还差一点"的那一点。
// 改成优先走 chrome.downloads（扩展自己的下载通道，不受页面下载策略影响），失败再退回 <a>。
function saveICS(trips, filename, calName) {
  const url = icsBlobUrl(trips, calName);
  const done = (ok) => { setTimeout(() => URL.revokeObjectURL(url), 8000); toast(ok ? t("cal_dl_ok") : t("cal_dl_fail")); };
  try {
    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url, filename, saveAs: false }, (id) => {
        if (chrome.runtime.lastError || id == null) { anchorFallback(url, filename, done); }
        else done(true);
      });
      return;
    }
  } catch (e) {}
  anchorFallback(url, filename, done);
}
function anchorFallback(url, filename, done) {
  try {
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); done(true);
  } catch (e) { done(false); }
}

function openUrl(u) { try { chrome.tabs.create({ url: u }); } catch (e) { window.open(u, "_blank"); } }

function openCalSheet(tp) {
  const evs = ICS.eventsFor(tp, icsL());
  $("sh_title").textContent = t("cal_menu");
  $("sh_sub").textContent = tp.name + " · " + tp.date + (tp.flight ? " · " + tp.flight : "");
  const body = $("sh_body"); body.innerHTML = "";

  // 主操作：一个 .ics 里包含这趟行程的全部事件（航班 + 入境卡窗口）
  const main = document.createElement("div"); main.className = "sh-main";
  const bIcs = document.createElement("button"); bIcs.className = "k"; bIcs.textContent = "⬇ " + t("cal_ics");
  bIcs.onclick = () => saveICS([tp], ICS.filenameFor(tp), tp.name);
  const bCopy = document.createElement("button"); bCopy.textContent = "📋 " + t("cal_copy");
  bCopy.onclick = async () => {
    try { await navigator.clipboard.writeText(ICS.build([tp], icsL(), tp.name)); toast(t("cal_copied")); }
    catch (e) { toast(t("cal_dl_fail")); }
  };
  const bMail = document.createElement("button"); bMail.textContent = "✉ " + t("cal_mail");
  bMail.onclick = () => openUrl(ICS.mailtoUrl(tp, evs));
  main.appendChild(bIcs); main.appendChild(bCopy); main.appendChild(bMail);
  body.appendChild(main);

  // 直链：一趟行程可能有两个事件（航班 / 入境卡窗口），分开给，免得一次开两个标签页
  evs.forEach((ev) => {
    const g = document.createElement("div"); g.className = "sh-grp";
    const gt = document.createElement("div"); gt.className = "gt"; gt.textContent = ev.summary;
    const gd = document.createElement("div"); gd.className = "gd";
    const last = ICS.addDays(ev.endExclusive, -1);
    gd.textContent = (last === ev.start) ? ev.start : (ev.start + " → " + last);
    const gb = document.createElement("div"); gb.className = "gb";
    const bg = document.createElement("button"); bg.textContent = t("cal_google"); bg.onclick = () => openUrl(ICS.googleUrl(ev));
    const bo = document.createElement("button"); bo.textContent = t("cal_outlook"); bo.onclick = () => openUrl(ICS.outlookUrl(ev, false));
    const bw = document.createElement("button"); bw.textContent = t("cal_o365"); bw.onclick = () => openUrl(ICS.outlookUrl(ev, true));
    gb.appendChild(bg); gb.appendChild(bo); gb.appendChild(bw);
    g.appendChild(gt); g.appendChild(gd); g.appendChild(gb);
    body.appendChild(g);
  });

  showSheet($("calsheet"), true);
}
function closeCalSheet() { showSheet($("calsheet"), false); }

/* ───────────────────── 删除确认 ─────────────────────
   行程删掉 = 入境卡窗口期提醒一起没了，而且没有撤销，所以必须问一句。
   用面板内的确认框而不是 window.confirm：侧边栏里的原生弹窗表现不稳，
   而且原生弹窗说不清"提醒会一起消失"这件事。 */
function askConfirm(title, body, yesText, noText) {
  return new Promise((resolve) => {
    const box = $("confirm");
    $("cf_title").textContent = title;
    $("cf_sub").textContent = "";
    $("cf_body").textContent = body;
    $("cf_yes").textContent = yesText;
    $("cf_no").textContent = noText;
    const close = (v) => { showSheet(box, false); box.onclick = null; resolve(v); };
    $("cf_yes").onclick = () => close(true);
    $("cf_no").onclick = () => close(false);
    box.onclick = (e) => { if (e.target === box) close(false); };
    showSheet(box, true);
    $("cf_no").focus();
  });
}

async function exportAll() {
  const { trips = [] } = await sget("trips");
  const live = trips.filter((x) => x.status !== "done");
  if (!live.length) { toast(t("sp_none")); return; }
  saveICS(live, "trips-" + todayStr() + ".ics", t("sp_title"));
}

/* ───────────────────── 行程录入 ───────────────────── */
async function saveTrip() {
  const cc = $("dest").value, date = $("date").value, flight = $("flight").value.trim();
  if (!cc || !date) { $("err").textContent = t("sp_needdate"); return; }
  $("err").textContent = "";
  let name, officialUrl = null, openDaysBefore = null, supported = false;
  if (cc === "OTHER") { name = t("sp_memo"); }
  else {
    const c = COUNTRIES.find((x) => x.id === cc);
    name = pick(c.name); officialUrl = c.official_url || null;
    openDaysBefore = (c.open_days_before != null) ? c.open_days_before : null;
    supported = !!officialUrl;
  }
  const tp = { id: "t" + Date.now(), cc, name, officialUrl, openDaysBefore, supported, date, flight, status: "active", lastNotified: "", memoNotified: false, snoozeUntil: "", createdAt: todayStr() };
  const { trips = [] } = await sget("trips");
  trips.push(tp); await sset({ trips });
  // 记进插件本地才是真相源；日历只是"顺带同步到手机"的可选导出
  const wantCal = $("cal").checked;
  $("date").value = ""; $("flight").value = ""; $("dest").value = ""; $("cal").checked = false;
  await clearPending();
  render();
  renderPending();   // 不等 storage 事件回来，立刻收起横幅，避免"已经记完了还在问"
  if (wantCal) openCalSheet(tp);
}

/* ───────────────────── 订票站侦测横幅 ───────────────────── */
async function clearPending() {
  try { await new Promise((r) => chrome.runtime.sendMessage({ type: "eh:clearPending" }, () => r())); } catch (e) { await sset({ pending: null }); }
}
async function renderPending() {
  const { pending } = await sget({ pending: null });
  const box = $("pending");
  const fresh = pending && (Date.now() - pending.at < 24 * 3600 * 1000);
  if (!fresh) { box.hidden = true; return; }
  box.hidden = false;
  $("pd_title").textContent = t("pend_title") + "  ·  " + pending.domain;
  $("pd_body").textContent = t("pend_body");
  $("pd_yes").onclick = () => {
    setView("trips");
    const ab = document.querySelector(".addbox");
    ab.classList.add("flash"); setTimeout(() => ab.classList.remove("flash"), 1400);
    $("dest").focus();
    ab.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("pd_no").onclick = async () => { await clearPending(); renderPending(); };
  $("pd_mute").onclick = async () => {
    try { chrome.runtime.sendMessage({ type: "eh:muteSite", domain: pending.domain }, () => {}); } catch (e) {}
    setTimeout(renderPending, 120);
  };
}

/* ───────────────────── 行程列表 ───────────────────── */
function render() {
  sget("trips").then(async ({ trips = [] }) => {
    const box = $("trips"); box.innerHTML = "";
    const sorted = trips.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!sorted.length) {
      box.innerHTML = `<p class="empty">${t("sp_none")}<br><span style="font-size:11.5px;color:#aaa">${t("sp_none_hint")}</span></p>`;
    } else {
      sorted.forEach((tp) => {
        const st = statusOf(tp);
        let stText = t(st.key); if (st.key === "sp_amber" && st.open) stText += " · " + t("sp_opens") + " " + st.open;
        const el = document.createElement("div"); el.className = "trip";
        el.innerHTML = `<div class="top"><span class="dot ${st.cls}"></span><span class="nm"></span></div>
          <div class="meta"></div><div class="st ${st.cls}"></div><div class="acts"></div>`;
        el.querySelector(".nm").textContent = tp.name;
        el.querySelector(".meta").textContent = tp.date + (tp.flight ? " · " + tp.flight : "");
        el.querySelector(".st").textContent = stText;
        const acts = el.querySelector(".acts");
        if (st.cls === "g" && tp.officialUrl) { const b = document.createElement("button"); b.className = "fill"; b.textContent = t("sp_fill"); b.onclick = () => openUrl(tp.officialUrl); acts.appendChild(b); }
        const bc = document.createElement("button"); bc.textContent = "🗓 " + t("cal_menu"); bc.onclick = () => openCalSheet(tp); acts.appendChild(bc);
        if (tp.status !== "done") { const bd = document.createElement("button"); bd.textContent = t("sp_done"); bd.onclick = async () => { const { trips = [] } = await sget("trips"); const x = trips.find((z) => z.id === tp.id); if (x) x.status = "done"; await sset({ trips }); render(); }; acts.appendChild(bd); }
        const bx = document.createElement("button"); bx.textContent = t("sp_del");
        bx.onclick = async () => {
          const sure = await askConfirm(
            t("del_title"),
            tp.name + " · " + tp.date + (tp.flight ? " · " + tp.flight : "") + "\n" + t("del_body"),
            t("del_yes"), t("del_no"));
          if (!sure) return;
          const { trips = [] } = await sget("trips");
          await sset({ trips: trips.filter((z) => z.id !== tp.id) });
          render();
        };
        acts.appendChild(bx);
        box.appendChild(el);
      });
    }
    // 赞助位：跟着"下一趟还没走的行程"的目的地走，相关才有价值
    const today = todayStr();
    const next = sorted.find((x) => x.status !== "done" && x.date >= today);
    PROMO.render($("promo-sp"), { slot: "sidepanel", country: next ? next.cc : null, lang: LANG, t });
  });
}

/* ───────────────────── 国家列表视图 ───────────────────── */
function flagUrl(id) { return chrome.runtime.getURL("icons/flags/" + String(id).toLowerCase() + ".svg"); }
function renderList() {
  const q = ($("lsearch").value || "").trim().toLowerCase();
  const box = $("clist"); box.innerHTML = "";
  const hits = COUNTRIES.filter((c) => !q ||
    [pick(c.name), c.name.en, c.name.zh, c.id, c.card_name].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)));
  if (!hits.length) { box.innerHTML = `<p class="empty">${t("no_result")}</p>`; return; }
  hits.forEach((c) => {
    const el = document.createElement("div"); el.className = "crow";
    el.innerHTML = `<div class="ch"><img alt=""><span class="cn"></span></div><div class="ct"></div><div class="ca"></div>`;
    el.querySelector("img").src = flagUrl(c.id);
    el.querySelector(".cn").textContent = pick(c.name);
    el.querySelector(".ct").textContent = c.card_name + (c.open_days_before != null ? " · " + t("sp_opens") + " D-" + c.open_days_before : "");
    const ca = el.querySelector(".ca");
    const bg = document.createElement("button"); bg.className = "go"; bg.textContent = t("sp_list_open");
    bg.onclick = () => openUrl(c.official_url);
    const bn = document.createElement("button"); bn.textContent = t("sp_list_new");
    bn.onclick = () => { setView("trips"); $("dest").value = c.id; const ab = document.querySelector(".addbox"); ab.classList.add("flash"); setTimeout(() => ab.classList.remove("flash"), 1400); $("date").focus(); };
    ca.appendChild(bg); ca.appendChild(bn);
    box.appendChild(el);
  });
}

/* ───────────────────── 启动 ───────────────────── */
async function init() {
  showSheet($("calsheet"), false);
  showSheet($("confirm"), false);
  LANG = await detectLang();
  document.documentElement.lang = LANG;
  document.documentElement.dir = (LANG === "ar" || LANG === "he" || LANG === "fa") ? "rtl" : "ltr";
  document.documentElement.lang = LANG;
  document.documentElement.dir = (LANG === "ar" || LANG === "he" || LANG === "fa") ? "rtl" : "ltr";
  COUNTRIES = await loadCountries();
  applyStatic();
  $("save").onclick = saveTrip;
  $("backbtn").onclick = () => setView(VIEW === "trips" ? "list" : "trips");
  $("lsearch").oninput = renderList;
  $("exportall").onclick = exportAll;
  $("sh_close").onclick = closeCalSheet;
  $("calsheet").onclick = (e) => { if (e.target === $("calsheet")) closeCalSheet(); };
  render();
  renderPending();
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.trips) render();
    if (ch.pending) renderPending();
    if (ch.promoEnabled || ch.promoHidden) render();
  });
}
init();
