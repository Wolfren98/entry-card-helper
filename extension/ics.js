"use strict";
/* ─────────────────────────────────────────────────────────────────────────
   ics.js — 行程备忘的"日历投递"层
   插件本地存储才是真相源（驱动窗口期提醒）；这里只负责把一份行程"发出去"：
     · .ics 文件（Outlook / Google / 苹果日历 通吃，零登录零 API）
     · Google 日历 / Outlook 直链（点开即存，不用下载文件）
     · 纯文本（复制 / 邮件）
   之前版本的问题（本次修掉）：
     ① DTSTAMP 写成了事件日期而不是"生成时刻" —— 严格的日历（Outlook 桌面版）会拒收或错乱
     ② SUMMARY/DESCRIPTION 里的 , ; \ 换行没转义 —— 航班号带逗号或备注换行就把整个文件写坏
     ③ 超过 75 字节的行没有折行 —— 中文国家名 + 长官网链接非常容易超，部分日历直接解析失败
     ④ 只生成一个事件 —— "入境卡窗口"本该是从开放日到出发日的一整段，用户在日历里看不到窗口
     ⑤ 没有 METHOD/CALNAME —— 导入后事件落在莫名其妙的日历里
   ───────────────────────────────────────────────────────────────────────── */
(function (root) {
  const PRODID = "-//Entry Card Helper//Trip Reminder//EN";

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayStr(d) {
    const x = d ? new Date(d) : new Date();
    return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  }
  function addDays(s, n) {
    const p = String(s).split("-").map(Number);
    const x = new Date(p[0], p[1] - 1, p[2]);
    x.setDate(x.getDate() + n);
    return todayStr(x);
  }
  const compact = (s) => String(s).replace(/-/g, "");

  // RFC 5545 3.3.11：反斜杠、分号、逗号、换行都要转义。顺序很重要，反斜杠必须第一个换。
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }

  // RFC 5545 3.1：一行最多 75 个八位组，续行以一个空格开头。
  // 按"字节"算而不是按"字符"算 —— 一个中文字占 3 字节，按字符数折会超标。
  function fold(line) {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = [];
    let cur = "", curBytes = 0, limit = 75;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (curBytes + b > limit) { out.push(cur); cur = " " + ch; curBytes = 1 + b; limit = 75; }
      else { cur += ch; curBytes += b; }
    }
    if (cur) out.push(cur);
    return out.join("\r\n");
  }

  function stamp() {
    // 生成时刻，UTC。必须是"现在"，不是事件日期。
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function uidOf(trip, kind) {
    return (trip.id || "t" + Math.random().toString(36).slice(2)) + "-" + kind + "@entrycardhelper.local";
  }

  /* 一趟行程拆成 1~2 个事件：
       flight —— 出发当天的全天事件（不分国内外，所有行程都有）
       card   —— 入境卡窗口：从开放日一直铺到出发日的多天全天事件，
                 只有目的地在支持的国家、且拿得到开放天数时才生成 */
  function eventsFor(trip, L) {
    const t = (k) => (L && L[k]) || k;
    const name = trip.name || "";
    const flight = (trip.flight || "").trim();
    const evs = [];

    evs.push({
      kind: "flight",
      uid: uidOf(trip, "flight"),
      start: trip.date,
      endExclusive: addDays(trip.date, 1),
      summary: "✈ " + t("ev_flight") + " · " + name + (flight ? " " + flight : ""),
      description: [name, trip.date, flight].filter(Boolean).join(" · "),
      url: "",
      // 全天事件的 DTSTART 是当天 00:00，-PT15H = 前一天 09:00 提醒
      alarms: ["-PT15H"]
    });

    if (trip.supported && trip.openDaysBefore != null && trip.officialUrl) {
      const open = addDays(trip.date, -trip.openDaysBefore);
      evs.push({
        kind: "card",
        uid: uidOf(trip, "card"),
        start: open,
        endExclusive: addDays(trip.date, 1),   // 铺满整个窗口，用户一眼看见"从哪天到哪天"
        summary: "🛂 " + name + " " + t("ev_card") + (flight ? " (" + flight + ")" : ""),
        description: t("ev_card_desc") + " " + trip.officialUrl,
        url: trip.officialUrl,
        alarms: ["PT9H"]                        // 开放当天 09:00
      });
    }
    return evs;
  }

  function veventLines(ev) {
    const L = [];
    L.push("BEGIN:VEVENT");
    L.push("UID:" + ev.uid);
    L.push("DTSTAMP:" + stamp());
    L.push("DTSTART;VALUE=DATE:" + compact(ev.start));
    L.push("DTEND;VALUE=DATE:" + compact(ev.endExclusive));
    L.push("SUMMARY:" + esc(ev.summary));
    if (ev.description) L.push("DESCRIPTION:" + esc(ev.description));
    if (ev.url) L.push("URL:" + ev.url);          // URL 属性按规范不转义
    L.push("TRANSP:TRANSPARENT");                  // 全天备忘不该把人显示成"忙"
    L.push("CATEGORIES:TRAVEL");
    (ev.alarms || []).forEach((trig) => {
      L.push("BEGIN:VALARM");
      L.push("TRIGGER:" + trig);
      L.push("ACTION:DISPLAY");
      L.push("DESCRIPTION:" + esc(ev.summary));
      L.push("END:VALARM");
    });
    L.push("END:VEVENT");
    return L;
  }

  /** trips: 一个或多个行程；calName: 日历显示名 */
  function build(trips, L, calName) {
    const list = Array.isArray(trips) ? trips : [trips];
    let lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:" + PRODID,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" + esc(calName || "Trips"),
      "X-WR-TIMEZONE:UTC"
    ];
    list.forEach((tp) => eventsFor(tp, L).forEach((ev) => { lines = lines.concat(veventLines(ev)); }));
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  const e = encodeURIComponent;

  function googleUrl(ev) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + e(ev.summary)
      + "&dates=" + compact(ev.start) + "/" + compact(ev.endExclusive)
      + "&details=" + e(ev.description || "");
  }
  function outlookUrl(ev, work) {
    const host = work ? "https://outlook.office.com" : "https://outlook.live.com";
    return host + "/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent"
      + "&subject=" + e(ev.summary)
      + "&body=" + e(ev.description || "")
      + "&startdt=" + ev.start + "&enddt=" + ev.endExclusive + "&allday=true";
  }
  function mailtoUrl(trip, evs) {
    const subject = evs[0] ? evs[0].summary : (trip.name || "Trip");
    const body = evs.map((ev) =>
      ev.summary + "\n" + ev.start + (ev.endExclusive !== addDays(ev.start, 1) ? " → " + addDays(ev.endExclusive, -1) : "")
      + (ev.url ? "\n" + ev.url : "")
      + "\nGoogle: " + googleUrl(ev)
      + "\nOutlook: " + outlookUrl(ev, false)
    ).join("\n\n");
    return "mailto:?subject=" + e(subject) + "&body=" + e(body);
  }

  function filenameFor(trip) {
    const cc = (trip && trip.cc ? String(trip.cc) : "trip").toLowerCase().replace(/[^a-z0-9]/g, "");
    const d = (trip && trip.date ? trip.date : todayStr());
    return "trip-" + cc + "-" + d + ".ics";
  }

  root.ICS = { build, eventsFor, googleUrl, outlookUrl, mailtoUrl, filenameFor, addDays, todayStr, esc, fold };
})(typeof self !== "undefined" ? self : this);
