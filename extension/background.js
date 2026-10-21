"use strict";
importScripts("i18n.js", "i18n-packs.js");

/* ─────────────────────────────────────────────────────────────────────────
   background.js — 侦测 → 备忘 → 窗口期提醒

   本次修的是"打开 ctrip.com 没弹提示"。原因不是一个，是三个叠在一起：
     ① 系统通知会被静默吞掉。Windows 的专注助手 / Chrome 通知被系统关掉时，
        chrome.notifications.create 依然"成功"返回，什么都不显示，代码这边毫无察觉。
        → 现在改成三重兜底：系统通知 + 角标 + 侧边栏顶部的待办横幅。
          通知没出来也不会丢，点开插件就看得见。
     ② 6 小时节流是按域名存的，测试时弹过一次，之后再打开就再也不弹了，
        看起来像"功能坏了"。→ 节流只压系统通知，横幅照常；设置页给了"清除节流"按钮。
     ③ 携程是单页应用，站内跳转不再触发 status==="complete"。
        → 改成 info.status === "complete" || info.url 都查一次。
   ───────────────────────────────────────────────────────────────────────── */

const DAILY_ALARM = "eh-daily";
const NUDGE_THROTTLE_MS = 4 * 3600 * 1000;   // 只节流"系统通知"，不节流侧边栏横幅
const PENDING_TTL_MS = 24 * 3600 * 1000;     // 横幅最多留 24 小时
const CORAL = "#c96442";

const sget = (d) => chrome.storage.local.get(d);
const sset = (o) => chrome.storage.local.set(o);

function todayStr(d) {
  const x = d ? new Date(d) : new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function addDays(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return todayStr(x);
}
async function curLang() {
  const { lang } = await sget("lang");
  if (lang && I18N[lang]) return lang;
  try { return normLang(chrome.i18n.getUILanguage()); } catch (e) { return "en"; }
}
function tt(L, k) { return (I18N[L] && I18N[L][k]) || I18N.en[k] || k; }

function setBadge(active) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: CORAL });
    chrome.action.setBadgeText({ text: active ? "!" : "" });
  } catch (e) {}
}
function setTitle(txt) { try { chrome.action.setTitle({ title: txt || "" }); } catch (e) {} }

async function saveNotif(id, p) { const { notifMap = {} } = await sget("notifMap"); notifMap[id] = p; await sset({ notifMap }); }
async function getNotif(id) { const { notifMap = {} } = await sget("notifMap"); return notifMap[id]; }
async function dropNotif(id) { const { notifMap = {} } = await sget("notifMap"); delete notifMap[id]; await sset({ notifMap }); }

/* ── 诊断记录：设置页的"自检"直接读这里，用户能自己看出是哪一环没走通 ── */
async function diagSet(patch) {
  const { diag = {} } = await sget("diag");
  await sset({ diag: Object.assign(diag, patch) });
}

/* ── 通知封装：把 lastError 抓下来，而不是让它无声无息 ── */
function notify(id, opts) {
  return new Promise((resolve) => {
    try {
      chrome.notifications.create(id, opts, () => {
        const err = chrome.runtime.lastError;
        resolve(err ? String(err.message || err) : null);
      });
    } catch (e) { resolve(String(e && e.message || e)); }
  });
}
function permissionLevel() {
  return new Promise((resolve) => {
    try { chrome.notifications.getPermissionLevel((lvl) => resolve(lvl)); }
    catch (e) { resolve("unknown"); }
  });
}

/* ── 订票站侦测（只看域名，不读页面内容） ── */
let BOOKING = null;
async function bookingSites() {
  if (BOOKING) return BOOKING;
  try { BOOKING = await fetch(chrome.runtime.getURL("data/booking_sites.json")).then((r) => r.json()); }
  catch (e) { BOOKING = []; }
  return BOOKING;
}
function hostOf(u) { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return null; } }
function matchBooking(host, sites) {
  if (!host) return null;
  for (const d of sites) if (host === d || host.endsWith("." + d)) return d;
  return null;
}

async function maybeNudge(url) {
  const { bookingDetectEnabled = true } = await sget("bookingDetectEnabled");
  if (!bookingDetectEnabled) return;
  const host = hostOf(url);
  if (!host) return;
  await diagSet({ lastHost: host, lastHostAt: Date.now() });

  const dom = matchBooking(host, await bookingSites());
  if (!dom) return;

  const { mutedSites = {} } = await sget("mutedSites");
  if (mutedSites[dom]) { await diagSet({ lastSkip: "muted:" + dom, lastSkipAt: Date.now() }); return; }

  await diagSet({ lastMatch: dom, lastMatchAt: Date.now() });

  // ① 横幅：不受节流影响，插件里一定看得到（这是"通知被系统吞掉"的兜底）
  const { pending } = await sget({ pending: null });
  if (!pending || pending.domain !== dom || Date.now() - pending.at > PENDING_TTL_MS) {
    await sset({ pending: { domain: dom, at: Date.now() } });
  }
  setBadge(true);
  const L = await curLang();
  setTitle(tt(L, "pend_title") + " — " + dom);

  // ② 系统通知：4 小时内同一个站只弹一次，避免刷页面被烦
  const { nudged = {} } = await sget("nudged");
  const now = Date.now();
  if (nudged[dom] && now - nudged[dom] < NUDGE_THROTTLE_MS) {
    await diagSet({ lastSkip: "throttled:" + dom, lastSkipAt: now });
    return;
  }
  nudged[dom] = now; await sset({ nudged });

  const id = "booking:" + now;
  await saveNotif(id, { type: "booking", domain: dom });
  const err = await notify(id, {
    type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: tt(L, "nudge_title"), message: tt(L, "nudge_body"),
    buttons: [{ title: tt(L, "nudge_add") }, { title: tt(L, "nudge_no") }], priority: 2
  });
  await diagSet({
    lastNotifyAt: now, lastNotifyError: err || "",
    lastPermission: await permissionLevel()
  });
}

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  // 携程/飞猪这类单页应用站内跳转不会再报 complete，所以 info.url 变化也要查一次
  if ((info.status === "complete" || info.url) && tab && tab.url) maybeNudge(tab.url);
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const tab = await chrome.tabs.get(tabId); if (tab && tab.url) maybeNudge(tab.url); } catch (e) {}
});

/* ── 行程检查：航班备忘 + 入境卡窗口期 ── */
async function checkTrips() {
  const { trips = [] } = await sget("trips");
  const { pending } = await sget({ pending: null });
  const L = await curLang(), today = todayStr();
  let dirty = false, actionable = false;
  for (const tp of trips) {
    if (tp.status === "done" || !tp.date || today > tp.date) continue;
    if (tp.supported && tp.openDaysBefore != null) {
      const open = addDays(tp.date, -tp.openDaysBefore);
      if (today >= open) {
        actionable = true;
        const snoozed = tp.snoozeUntil && today < tp.snoozeUntil;
        if (!snoozed && tp.lastNotified !== today) {
          const id = "arr:" + tp.id + ":" + today;
          await saveNotif(id, { type: "arrival", tripId: tp.id });
          await notify(id, {
            type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: tt(L, "arr_title"), message: tp.name + tt(L, "arr_msg"),
            buttons: [{ title: tt(L, "fill_now") }, { title: tt(L, "not_today") }],
            requireInteraction: true, priority: 2
          });
          tp.lastNotified = today; dirty = true;
        }
        continue;
      }
    }
    if (today >= addDays(tp.date, -2) && !tp.memoNotified) {
      const id = "memo:" + tp.id;
      await saveNotif(id, { type: "memo", tripId: tp.id });
      await notify(id, {
        type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: tt(L, "memo_title"), message: tp.name + " · " + tp.date + (tp.flight ? " · " + tp.flight : ""), priority: 1
      });
      tp.memoNotified = true; dirty = true; actionable = true;
    }
  }
  if (dirty) await sset({ trips });
  const hasPending = !!(pending && Date.now() - pending.at < PENDING_TTL_MS);
  setBadge(actionable || hasPending);
  if (!actionable && !hasPending) setTitle("");
}

/* alarms 只在 onInstalled/onStartup 建是不够的：
   浏览器更新、扩展 reload 之后 SW 冷启动，闹钟可能已经没了，
   之后就再也不检查窗口期。这里每次 SW 起来都补一次（幂等）。 */
function ensureAlarms() {
  try {
    chrome.alarms.get(DAILY_ALARM, (a) => {
      if (!a) chrome.alarms.create(DAILY_ALARM, { periodInMinutes: 180 });
    });
  } catch (e) {}
}
ensureAlarms();
chrome.runtime.onInstalled.addListener(() => { ensureAlarms(); checkTrips(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarms(); checkTrips(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === DAILY_ALARM) checkTrips(); });
chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.trips || ch.pending)) checkTrips(); });

/* ── 打开备忘界面 ──
   sidePanel.open() 要求用户手势，从通知回调里调经常会被拒。
   拒了就退而求其次：把 sidepanel.html 当普通标签页打开 —— 同一套界面，绝不"点了没反应"。 */
async function openPanel() {
  try {
    const w = await chrome.windows.getLastFocused();
    await chrome.sidePanel.open({ windowId: w.id });
    return true;
  } catch (e) {
    try { await chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") }); return true; }
    catch (e2) { return false; }
  }
}

async function handleNotif(id, btn) {
  const p = await getNotif(id);
  chrome.notifications.clear(id);
  if (!p) { openPanel(); return; }
  if (p.type === "arrival") {
    const { trips = [] } = await sget("trips");
    const tp = trips.find((t) => t.id === p.tripId);
    if (btn === 0) { if (tp && tp.officialUrl) chrome.tabs.create({ url: tp.officialUrl }); }
    else if (btn === 1) { if (tp) { tp.snoozeUntil = addDays(todayStr(), 1); await sset({ trips }); } }
    else openPanel();
  } else if (p.type === "booking") {
    if (btn === 1) { await sset({ pending: null }); setBadge(false); setTitle(""); }
    else openPanel();
  } else openPanel();
  await dropNotif(id);
}
chrome.notifications.onButtonClicked.addListener((id, b) => handleNotif(id, b));
chrome.notifications.onClicked.addListener((id) => handleNotif(id, -1));

/* ── 给设置页 / 侧边栏用的消息接口 ── */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || !msg.type) return;
  if (msg.type === "eh:selftest") {
    (async () => {
      const s = await sget({ diag: {}, nudged: {}, pending: null, mutedSites: {}, bookingDetectEnabled: true });
      reply({
        ok: true,
        permission: await permissionLevel(),
        sites: (await bookingSites()).length,
        enabled: s.bookingDetectEnabled,
        diag: s.diag || {},
        nudged: s.nudged || {},
        muted: s.mutedSites || {},
        pending: s.pending || null,
        alarm: await new Promise((r) => { try { chrome.alarms.get(DAILY_ALARM, (a) => r(!!a)); } catch (e) { r(false); } })
      });
    })();
    return true;
  }
  if (msg.type === "eh:clearThrottle") {
    (async () => { await sset({ nudged: {}, mutedSites: {}, pending: null }); setBadge(false); setTitle(""); reply({ ok: true }); })();
    return true;
  }
  if (msg.type === "eh:testNotify") {
    (async () => {
      const L = await curLang();
      const err = await notify("selftest:" + Date.now(), {
        type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: tt(L, "nudge_title"), message: tt(L, "nudge_body"), priority: 2
      });
      reply({ ok: !err, error: err || "", permission: await permissionLevel() });
    })();
    return true;
  }
  if (msg.type === "eh:muteSite") {
    (async () => {
      const { mutedSites = {} } = await sget("mutedSites");
      if (msg.domain) mutedSites[msg.domain] = true;
      await sset({ mutedSites, pending: null });
      setBadge(false); setTitle(""); reply({ ok: true });
    })();
    return true;
  }
  if (msg.type === "eh:clearPending") {
    (async () => { await sset({ pending: null }); setTitle(""); await checkTrips(); reply({ ok: true }); })();
    return true;
  }
});
