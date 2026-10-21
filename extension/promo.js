"use strict";
/* ─────────────────────────────────────────────────────────────────────────
   promo.js — 赞助位（原生联盟推荐）

   为什么不是普通横幅广告：
     · MV3 扩展页面的 CSP 是 script-src 'self'，AdSense 那类第三方广告 JS
       在弹窗/侧边栏里根本跑不起来，硬塞只会白屏。
     · 商店对"注入式广告 / 意外弹窗"处罚很重。
   所以这里做的是本地 JSON 驱动的相关推荐卡：出现在用户主动打开的界面里，
   跟当前行程目的地相关，明确标注"赞助"，一键可关。
   data/promos.json 可以被设置里的远程数据源覆盖（纯 JSON，不含代码）。
   ───────────────────────────────────────────────────────────────────────── */
(function (root) {
  const HIDE_DAYS = 30;
  let CACHE = null;
  let styled = false;

  const sget = (d) => new Promise((r) => chrome.storage.local.get(d, r));
  const sset = (o) => new Promise((r) => chrome.storage.local.set(o, r));

  function joinUrl(b, p) { return b.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, ""); }

  async function load() {
    if (CACHE) return CACHE;
    let local = { items: [] };
    try { local = await fetch(chrome.runtime.getURL("data/promos.json")).then((r) => r.json()); } catch (e) {}
    CACHE = local;
    // 远程覆盖（可选）：只取 JSON，不取任何脚本
    try {
      const { dataBaseUrl } = await sget({ dataBaseUrl: "" });
      if (dataBaseUrl) {
        const remote = await fetch(joinUrl(dataBaseUrl, "promos.json"), { cache: "no-store" }).then((r) => r.json());
        if (remote && Array.isArray(remote.items) && remote.items.length) CACHE = remote;
      }
    } catch (e) { /* 离线就用本地的 */ }
    return CACHE;
  }

  function dayIndex() {
    const n = new Date();
    return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
  }

  function ensureStyle() {
    if (styled) return;
    styled = true;
    const s = document.createElement("style");
    s.textContent = `
.promo{border:1px solid #ececec;border-radius:10px;background:#fcfbf9;margin:10px 0 2px;overflow:hidden}
.promo-h{display:flex;align-items:center;justify-content:space-between;padding:5px 9px 0}
.promo-tag{font-size:10px;letter-spacing:.4px;color:#9a9a9a;border:1px solid #e3e3e3;border-radius:4px;padding:1px 5px;background:#fff}
.promo-x{font-size:10.5px;color:#a0a0a0;background:none;border:0;cursor:pointer;padding:2px 4px}
.promo-x:hover{color:#666;text-decoration:underline}
.promo-a{display:flex;gap:9px;align-items:flex-start;padding:6px 10px 10px;text-decoration:none;color:inherit}
.promo-a:hover{background:#f7f4f1}
.promo-emoji{font-size:19px;line-height:1.2;flex:none}
.promo-t{font-size:12.5px;font-weight:600;color:#1a1a1a;display:block;line-height:1.35}
.promo-b{font-size:11.5px;color:#666;display:block;margin-top:2px;line-height:1.5}
.promo-cta{font-size:11.5px;color:#c96442;font-weight:600;display:inline-block;margin-top:5px}
`;
    document.head.appendChild(s);
  }

  function pick(o, lang) {
    if (!o) return "";
    if (o[lang]) return o[lang];
    if (lang && lang.indexOf("zh") === 0) { if (o.zh) return o.zh; if (o["zh-TW"]) return o["zh-TW"]; }
    return o.en || o.zh || "";
  }

  /**
   * container : 要塞进去的父元素（会先清空）
   * opts      : { slot:"popup"|"sidepanel", country:"TH"|null, lang, t }
   */
  async function render(container, opts) {
    if (!container) return;
    container.innerHTML = "";
    const o = opts || {};
    const t = o.t || ((k) => k);
    const lang = o.lang || "en";

    const s = await sget({ promoEnabled: true, promoHidden: {} });
    if (!s.promoEnabled) return;

    const data = await load();
    const now = Date.now();
    const hidden = s.promoHidden || {};

    let items = (data.items || []).filter((it) => {
      if (!it || !it.url) return false;
      if (Array.isArray(it.slots) && it.slots.length && it.slots.indexOf(o.slot) < 0) return false;
      if (hidden[it.id] && now - hidden[it.id] < HIDE_DAYS * 86400000) return false;
      if (o.country && Array.isArray(it.countries) && it.countries.length) {
        if (it.countries.indexOf("*") < 0 && it.countries.indexOf(String(o.country).toUpperCase()) < 0) return false;
      }
      return true;
    });
    if (!items.length) return;

    // 每天轮换一条，不用随机 —— 同一天反复打开看到的是同一条，不会闪来闪去
    const it = items[dayIndex() % items.length];

    ensureStyle();
    const box = document.createElement("div");
    box.className = "promo";
    const head = document.createElement("div");
    head.className = "promo-h";
    const tag = document.createElement("span");
    tag.className = "promo-tag"; tag.textContent = t("promo_label");
    const x = document.createElement("button");
    x.className = "promo-x"; x.type = "button"; x.textContent = t("promo_off");
    head.appendChild(tag); head.appendChild(x);

    const a = document.createElement("a");
    a.className = "promo-a"; a.href = it.url; a.target = "_blank"; a.rel = "noopener noreferrer nofollow sponsored";
    const em = document.createElement("span");
    em.className = "promo-emoji"; em.textContent = it.emoji || "★";
    const txt = document.createElement("span");
    const tEl = document.createElement("b"); tEl.className = "promo-t"; tEl.textContent = pick(it.title, lang);
    const bEl = document.createElement("span"); bEl.className = "promo-b"; bEl.textContent = pick(it.body, lang);
    const cEl = document.createElement("span"); cEl.className = "promo-cta"; cEl.textContent = pick(it.cta, lang) + " ›";
    txt.appendChild(tEl); txt.appendChild(bEl); txt.appendChild(cEl);
    a.appendChild(em); a.appendChild(txt);

    x.onclick = async () => {
      const cur = await sget({ promoHidden: {} });
      const h = cur.promoHidden || {}; h[it.id] = Date.now();
      await sset({ promoHidden: h });
      container.innerHTML = "";
    };

    box.appendChild(head); box.appendChild(a);
    container.appendChild(box);
  }

  root.PROMO = { load, render };
})(typeof window !== "undefined" ? window : self);
