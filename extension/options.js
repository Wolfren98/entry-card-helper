"use strict";
const $ = (id) => document.getElementById(id);

chrome.storage.local.get(
  { engine: "https://www.google.com/search?q={q}", dataBaseUrl: "", dockMode: "auto",
    bookingDetectEnabled: true, promoEnabled: true },
  (s) => {
    $("engine").value = s.engine; $("dataBaseUrl").value = s.dataBaseUrl || "";
    const r = document.querySelector('input[name="dock"][value="' + (s.dockMode || "auto") + '"]');
    if (r) r.checked = true;
    $("bookingDetect").checked = s.bookingDetectEnabled !== false;
    $("promoEnabled").checked = s.promoEnabled !== false;
  });

// 位置这一项即选即存，不用等「保存」—— 用户多半是被挡住了才跑来改，越快生效越好
document.querySelectorAll('input[name="dock"]').forEach((r) => {
  r.onchange = () => chrome.storage.local.set({ dockMode: r.value });
});
// 这两个开关同理：勾完立刻生效，否则用户以为没存上
$("bookingDetect").onchange = () => chrome.storage.local.set({ bookingDetectEnabled: $("bookingDetect").checked });
$("promoEnabled").onchange = () => chrome.storage.local.set({ promoEnabled: $("promoEnabled").checked });

$("save").onclick = () => {
  const engine = $("engine").value.trim();
  if (!engine.includes("{q}")) { $("status").textContent = "Engine URL must contain {q} / 引擎网址需包含 {q}"; return; }
  const dockEl = document.querySelector('input[name="dock"]:checked');
  chrome.storage.local.set({ engine, dataBaseUrl: $("dataBaseUrl").value.trim(),
                             dockMode: dockEl ? dockEl.value : "auto" }, () => {
    $("status").textContent = "Saved ✓ / 已保存"; setTimeout(() => ($("status").textContent = ""), 1500);
  });
};

/* ───────────────────── 订票站侦测自检 ─────────────────────
   "打开携程没弹提示"有三种可能，肉眼分不出来，所以直接把三环状态摆出来：
   没命中域名 / 命中了但被节流 / 发出去了但被系统吞掉。 */
function ago(ts) {
  if (!ts) return '<span class="mute">从未 / never</span>';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return s + " 秒前";
  if (s < 3600) return Math.round(s / 60) + " 分钟前";
  if (s < 86400) return Math.round(s / 3600) + " 小时前";
  return Math.round(s / 86400) + " 天前";
}
function row(k, v) { return "<tr><td>" + k + "</td><td>" + v + "</td></tr>"; }
function send(msg) {
  return new Promise((r) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        const e = chrome.runtime.lastError;
        r(res || { ok: false, error: String((e && e.message) || "no response") });
      });
    } catch (e) { r({ ok: false, error: String(e) }); }
  });
}

async function runDiag() {
  const d = await send({ type: "eh:selftest" });
  const T = $("diagTable");
  if (!d || !d.ok) { T.innerHTML = row("后台无响应 / no response", '<span class="bad">' + ((d && d.error) || "?") + "</span>"); return; }
  const g = d.diag || {};
  const permOk = d.permission === "granted";
  const throttled = Object.keys(d.nudged || {});
  const muted = Object.keys(d.muted || {});
  T.innerHTML = [
    row("侦测开关 / detection", d.enabled ? '<span class="ok">开 ON</span>' : '<span class="bad">关 OFF</span>'),
    row("订票站名单 / site list", d.sites + " 个域名"),
    row("定时检查 / daily alarm", d.alarm ? '<span class="ok">已注册</span>' : '<span class="bad">未注册（在 chrome://extensions 重新加载一次即可）</span>'),
    row("系统通知权限 / notifications",
      permOk ? '<span class="ok">granted</span>'
             : '<span class="bad">' + (d.permission || "?") + '</span> — 系统把 Chrome 的通知关了，弹不出来。Windows：设置 → 系统 → 通知 → 打开 Google Chrome，并关掉「专注助手 / 免打扰」。'),
    row("最近看到的网址 / last host", (g.lastHost ? g.lastHost + " · " + ago(g.lastHostAt) : '<span class="mute">无</span>')),
    row("最近命中订票站 / last match", (g.lastMatch ? '<span class="ok">' + g.lastMatch + "</span> · " + ago(g.lastMatchAt) : '<span class="bad">还没命中过</span>')),
    row("最近一次跳过 / last skip", (g.lastSkip ? g.lastSkip + " · " + ago(g.lastSkipAt) : '<span class="mute">无</span>')),
    row("最近发通知 / last notify", (g.lastNotifyAt ? ago(g.lastNotifyAt) + (g.lastNotifyError ? ' · <span class="bad">' + g.lastNotifyError + "</span>" : ' · <span class="ok">无报错</span>') : '<span class="mute">无</span>')),
    row("待处理横幅 / pending banner", d.pending ? '<span class="ok">' + d.pending.domain + "</span> · " + ago(d.pending.at) : '<span class="mute">无</span>'),
    row("节流中的站 / throttled", throttled.length ? throttled.join(", ") : '<span class="mute">无</span>'),
    row("已静音的站 / muted", muted.length ? muted.join(", ") : '<span class="mute">无</span>')
  ].join("");
}

$("diagRun").onclick = runDiag;
$("diagNotify").onclick = async () => {
  const r = await send({ type: "eh:testNotify" });
  $("status").textContent = r.ok
    ? "测试通知已发出。屏幕上没看到 = 被系统吞了，不是插件的问题。"
    : "发送失败：" + (r.error || "?") + "（权限：" + (r.permission || "?") + "）";
  runDiag();
};
$("diagClear").onclick = async () => {
  await send({ type: "eh:clearThrottle" });
  $("status").textContent = "已清除节流和静音名单。重新打开一次订票网站（比如 ctrip.com）即可复测。";
  runDiag();
};
runDiag();
