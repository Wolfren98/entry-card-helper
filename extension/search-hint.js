"use strict";
// 谷歌搜索页自动加一行。不点图标，不读搜索记录。只看当前这一页的搜索词和结果网址。
// 提示语跟浏览器界面语言走。
(function () {
  if (!/\/search\b/.test(location.pathname)) return;

  const COUNTRIES = [
    { host: "s.nia.gov.cn", url: "https://s.nia.gov.cn/ArrivalCardFillingPC/", end: "gov.cn", codes: ["cdac"], names: ["中国", "中國", "china", "chine", "中国", "중국", "trung quốc", "จีน"], clones: ["cdac", "arrivalcard"],
      label: { zh: "中国入境卡", "zh-TW": "中國入境卡", en: "China arrival card", ja: "中国入国カード", ko: "중국 입국카드", fr: "carte d'arrivée Chine", es: "tarjeta de China", vi: "thẻ Trung Quốc", th: "บัตรจีน", ru: "карта Китая", de: "China-Ankunftskarte", pl: "karta Chin", it: "carta della Cina", ar: "بطاقة الصين", tr: "Çin kartı", uk: "картка Китаю" } },
    { host: "eservices.ica.gov.sg", url: "https://eservices.ica.gov.sg/sgarrivalcard/", end: "gov.sg", codes: ["sgac"], names: ["新加坡", "singapore", "singapour", "シンガポール", "싱가포르", "singapur", "xin-ga-po", "สิงคโปร์"], clones: ["sgac", "sgarrival", "arrivalcard"],
      label: { zh: "新加坡SGAC", "zh-TW": "新加坡SGAC", en: "Singapore SGAC", ja: "シンガポールSGAC", ko: "싱가포르 SGAC", fr: "Singapour SGAC", es: "Singapur SGAC", vi: "Singapore SGAC", th: "สิงคโปร์ SGAC", ru: "Сингапур SGAC", de: "Singapur SGAC", pl: "Singapur SGAC", it: "Singapore SGAC", ar: "سنغافورة SGAC", tr: "Singapur SGAC", uk: "Сінгапур SGAC" } },
    { host: "imigresen-online.imi.gov.my", url: "https://imigresen-online.imi.gov.my/mdac/main", end: "gov.my", codes: ["mdac"], names: ["马来西亚", "馬來西亞", "malaysia", "malaisie", "マレーシア", "말레이시아", "malasia", "ma-lai-xi-a", "มาเลเซีย"], clones: ["mdac", "arrivalcard"],
      label: { zh: "马来西亚MDAC", "zh-TW": "馬來西亞MDAC", en: "Malaysia MDAC", ja: "マレーシアMDAC", ko: "말레이시아 MDAC", fr: "Malaisie MDAC", es: "Malasia MDAC", vi: "Malaysia MDAC", th: "มาเลเซีย MDAC", ru: "Малайзия MDAC", de: "Malaysia MDAC", pl: "Malezja MDAC", it: "Malesia MDAC", ar: "ماليزيا MDAC", tr: "Malezya MDAC", uk: "Малайзія MDAC" } },
    { host: "tdac.immigration.go.th", url: "https://tdac.immigration.go.th/", end: "go.th", codes: ["tdac"], names: ["泰国", "泰國", "thailand", "thaïlande", "tailandia", "タイ", "태국", "thái lan", "ไทย", "таиланд", "тайланд", "tajlandia", "thailandia", "tayland", "таїланд"], clones: ["tdac", "thaiarrival", "thailandcard", "arrivalcard"],
      label: { zh: "泰国TDAC", "zh-TW": "泰國TDAC", en: "Thailand TDAC", ja: "タイTDAC", ko: "태국 TDAC", fr: "Thaïlande TDAC", es: "Tailandia TDAC", vi: "Thái Lan TDAC", th: "ไทย TDAC", ru: "Таиланд TDAC", de: "Thailand TDAC", pl: "Tajlandia TDAC", it: "Thailandia TDAC", ar: "تايلاند TDAC", tr: "Tayland TDAC", uk: "Таїланд TDAC" } },
    { host: "prearrival.immigration.gov.vn", url: "https://prearrival.immigration.gov.vn/", end: "gov.vn", codes: ["prearrival"], names: ["越南", "vietnam", "việt nam", "ベトナム", "베트남", "viet nam", "เวียดนาม", "вьетнам", "wietnam", "в'єтнам"], clones: ["prearrival", "arrivalcard"],
      label: { zh: "越南入境卡", "zh-TW": "越南入境卡", en: "Vietnam arrival card", ja: "ベトナム入国カード", ko: "베트남 입국카드", fr: "carte d'arrivée Vietnam", es: "tarjeta de Vietnam", vi: "thẻ Việt Nam", th: "บัตรเวียดนาม", ru: "карта Вьетнама", de: "Vietnam-Ankunftskarte", pl: "karta Wietnamu", it: "carta del Vietnam", ar: "بطاقة فيتنام", tr: "Vietnam kartı", uk: "картка В'єтнаму" } },
    { host: "allindonesia.imigrasi.go.id", url: "https://allindonesia.imigrasi.go.id/", end: "go.id", codes: ["allindonesia"], names: ["印尼", "印度尼西亚", "印度尼西亞", "indonesia", "indonésie", "インドネシア", "인도네시아", "อินโดนีเซีย", "индонезия", "indonesien", "indonezja", "endonezya", "індонезія"], clones: ["allindonesia", "arrivalcard"],
      label: { zh: "印尼入境卡", "zh-TW": "印尼入境卡", en: "Indonesia arrival card", ja: "インドネシア入国カード", ko: "인도네시아 입국카드", fr: "carte d'arrivée Indonésie", es: "tarjeta de Indonesia", vi: "thẻ Indonesia", th: "บัตรอินโดนีเซีย", ru: "карта Индонезии", de: "Indonesien-Ankunftskarte", pl: "karta Indonezji", it: "carta dell'Indonesia", ar: "بطاقة إندونيسيا", tr: "Endonezya kartı", uk: "картка Індонезії" } },
    { host: "twac.immigration.gov.tw", url: "https://twac.immigration.gov.tw/", end: "gov.tw", codes: ["twac"], names: ["台湾", "台灣", "taiwan", "taïwan", "台湾", "대만", "đài loan", "ไต้หวัน"], clones: ["twac", "arrivalcard"],
      label: { zh: "台湾TWAC", "zh-TW": "台灣TWAC", en: "Taiwan TWAC", ja: "台湾TWAC", ko: "대만 TWAC", fr: "Taïwan TWAC", es: "Taiwán TWAC", vi: "Đài Loan TWAC", th: "ไต้หวัน TWAC", ru: "Тайвань TWAC", de: "Taiwan TWAC", pl: "Tajwan TWAC", it: "Taiwan TWAC", ar: "تايوان TWAC", tr: "Tayvan TWAC", uk: "Тайвань TWAC" } },
    { host: "indianvisaonline.gov.in", url: "https://indianvisaonline.gov.in/earrival/", end: "gov.in", codes: ["earrival"], names: ["印度", "india", "inde", "インド", "인도", "ấn độ", "อินเดีย"], clones: ["earrival", "arrivalcard"],
      label: { zh: "印度入境卡", "zh-TW": "印度入境卡", en: "India arrival card", ja: "インド入国カード", ko: "인도 입국카드", fr: "carte d'arrivée Inde", es: "tarjeta de India", vi: "thẻ Ấn Độ", th: "บัตรอินเดีย", ru: "карта Индии", de: "Indien-Ankunftskarte", pl: "karta Indii", it: "carta dell'India", ar: "بطاقة الهند", tr: "Hindistan kartı", uk: "картка Індії" } },
    { host: "imuga.immigration.gov.mv", url: "https://imuga.immigration.gov.mv/traveller", end: "gov.mv", codes: ["imuga"], names: ["马尔代夫", "馬爾代夫", "maldives", "モルディブ", "몰디브", "maldivas", "มัลดีฟส์"], clones: ["imuga", "arrivalcard"],
      label: { zh: "马尔代夫入境卡", "zh-TW": "馬爾代夫入境卡", en: "Maldives arrival card", ja: "モルディブ入国カード", ko: "몰디브 입국카드", fr: "carte d'arrivée Maldives", es: "tarjeta de Maldivas", vi: "thẻ Maldives", th: "บัตรมัลดีฟส์", ru: "карта Мальдив", de: "Malediven-Ankunftskarte", pl: "karta Malediwów", it: "carta delle Maldive", ar: "بطاقة المالديف", tr: "Maldivler kartı", uk: "картка Мальдів" } },
    { host: "e-arrivalcard.go.kr", url: "https://www.e-arrivalcard.go.kr/", end: "go.kr", codes: ["e-arrivalcard"], names: ["韩国", "韓國", "korea", "corée", "韓国", "한국", "hàn quốc", "เกาหลี"], clones: ["e-arrivalcard", "arrivalcard"],
      label: { zh: "韩国入境卡", "zh-TW": "韓國入境卡", en: "Korea arrival card", ja: "韓国入国カード", ko: "한국 입국카드", fr: "carte d'arrivée Corée", es: "tarjeta de Corea", vi: "thẻ Hàn Quốc", th: "บัตรเกาหลี", ru: "карта Кореи", de: "Korea-Ankunftskarte", pl: "karta Korei", it: "carta della Corea", ar: "بطاقة كوريا", tr: "Kore kartı", uk: "картка Кореї" } },
    { host: "arrival.gov.kh", url: "https://arrival.gov.kh/", end: "gov.kh", codes: ["arrival.gov.kh"], names: ["柬埔寨", "柬埔寨", "cambodia", "cambodge", "カンボジア", "캄보디아", "campuchia", "กัมพูชา"], clones: ["arrivalcard"],
      label: { zh: "柬埔寨入境卡", "zh-TW": "柬埔寨入境卡", en: "Cambodia arrival card", ja: "カンボジア入国カード", ko: "캄보디아 입국카드", fr: "carte d'arrivée Cambodge", es: "tarjeta de Camboya", vi: "thẻ Campuchia", th: "บัตรกัมพูชา", ru: "карта Камбоджи", de: "Kambodscha-Ankunftskarte", pl: "karta Kambodży", it: "carta della Cambogia", ar: "بطاقة كمبوديا", tr: "Kamboçya kartı", uk: "картка Камбоджі" } },
    {"clones":["arrivalcard"],"host":"etravel.gov.ph","url":"https://etravel.gov.ph/","end":"gov.ph","codes":["etravel"],"names":["菲律宾","菲律賓","philippines","philippine","フィリピン","필리핀","filipinas","ฟิลิปปินส์","филиппины","philippinen","filipiny","filippine","filipinler","філіппіни"],"label":{"en":"Philippines","zh":"菲律宾","zh-TW":"菲律賓","ja":"フィリピン","ko":"필리핀","fr":"Philippines","es":"Filipinas","vi":"Philippines","th":"ฟิลิปปินส์","ru":"Филиппины","de":"Philippinen","pl":"Filipiny","it":"Filippine","ar":"الفلبين","tr":"Filipinler","uk":"Філіппіни","pt":"Filipinas","nl":"Filipijnen","id":"Filipina","ms":"Filipina","hi":"फ़िलीपींस","he":"הפיליפינים","cs":"Filipíny","hu":"Fülöp-szigetek","ro":"Filipine","fa":"فیلیپین","el":"Φιλιππίνες"}},
    {"clones":["arrivalcard"],"host":"vjw.digital.go.jp","url":"https://www.vjw.digital.go.jp/","end":"go.jp","codes":["vjw","visit japan web","visitjapan"],"names":["日本","japan","japon","japón","일본","nhật bản","ญี่ปุ่น","япония","japonia","giappone","japonya","японія"],"label":{"en":"Japan","zh":"日本","zh-TW":"日本","ja":"日本","ko":"일본","fr":"Japon","es":"Japón","vi":"Nhật Bản","th":"ญี่ปุ่น","ru":"Япония","de":"Japan","pl":"Japonia","it":"Giappone","ar":"اليابان","tr":"Japonya","uk":"Японія","pt":"Japão","nl":"Japan","id":"Jepang","ms":"Jepun","hi":"जापान","he":"יפן","cs":"Japonsko","hu":"Japán","ro":"Japonia","fa":"ژاپن","el":"Ιαπωνία"}},
    {"clones":["arrivalcard"],"host":"imm.gov.bn","url":"https://www.imm.gov.bn/","end":"gov.bn","codes":["imm.gov.bn"],"names":["文莱","汶萊","brunei","ブルネイ","브루나이","brunéi","บรูไน","бруней","brunej"],"label":{"en":"Brunei","zh":"文莱","zh-TW":"汶萊","ja":"ブルネイ","ko":"브루나이","fr":"Brunei","es":"Brunéi","vi":"Brunei","th":"บรูไน","ru":"Бруней","de":"Brunei","pl":"Brunei","it":"Brunei","ar":"بروناي","tr":"Brunei","uk":"Бруней","pt":"Brunei","nl":"Brunei","id":"Brunei","ms":"Brunei","hi":"ब्रुनेई","he":"ברוניי","cs":"Brunej","hu":"Brunei","ro":"Brunei","fa":"برونئی","el":"Μπρουνέι"}},
    {"clones":["arrivalcard"],"host":"travellerdeclaration.govt.nz","url":"https://www.travellerdeclaration.govt.nz/","end":"govt.nz","codes":["nztd","traveller declaration","traveler declaration"],"names":["新西兰","紐西蘭","new zealand","ニュージーランド","뉴질랜드","nueva zelanda","นิวซีแลนด์","новая зеландия","neuseeland","nowa zelandia","nuova zelanda","yeni zelanda","нова зеландія"],"label":{"en":"New Zealand","zh":"新西兰","zh-TW":"紐西蘭","ja":"ニュージーランド","ko":"뉴질랜드","fr":"Nouvelle-Zélande","es":"Nueva Zelanda","vi":"New Zealand","th":"นิวซีแลนด์","ru":"Новая Зеландия","de":"Neuseeland","pl":"Nowa Zelandia","it":"Nuova Zelanda","ar":"نيوزيلندا","tr":"Yeni Zelanda","uk":"Нова Зеландія","pt":"Nova Zelândia","nl":"Nieuw-Zeeland","id":"Selandia Baru","ms":"New Zealand","hi":"न्यूज़ीलैंड","he":"ניו זילנד","cs":"Nový Zéland","hu":"Új-Zéland","ro":"Noua Zeelandă","fa":"نیوزیلند","el":"Νέα Ζηλανδία"}},
    {"clones":["arrivalcard"],"host":"eticket.migracion.gob.do","url":"https://eticket.migracion.gob.do/","end":"gob.do","codes":["eticket.migracion"],"names":["多米尼加","多明尼加","dominican","ドミニカ共和国","도미니카 공화국","dominicaine","dominicana","สาธารณรัฐโดมินิกัน","доминикан"],"label":{"en":"Dominican Republic","zh":"多米尼加","zh-TW":"多明尼加","ja":"ドミニカ共和国","ko":"도미니카 공화국","fr":"République dominicaine","es":"República Dominicana","vi":"Cộng hòa Dominica","th":"สาธารณรัฐโดมินิกัน","ru":"Доминиканская Республика","de":"Dominikanische Republik","pl":"Dominikana","it":"Repubblica Dominicana","ar":"جمهورية الدومينيكان","tr":"Dominik Cumhuriyeti","uk":"Домініканська Республіка","pt":"República Dominicana","nl":"Dominicaanse Republiek","id":"Republik Dominika","ms":"Republik Dominika","hi":"डोमिनिकन गणराज्य","he":"הרפובליקה הדומיניקנית","cs":"Dominikánská republika","hu":"Dominikai Köztársaság","ro":"Republica Dominicană","fa":"جمهوری دومینیکن","el":"Δομινικανή Δημοκρατία"}},
    {"clones":["arrivalcard"],"host":"edcard.dominica.gov.dm","url":"https://edcard.dominica.gov.dm/","end":"gov.dm","codes":["edcard"],"names":["多米尼克","dominica","ドミニカ国","도미니카국","dominique","โดมินีกา"],"label":{"en":"Dominica","zh":"多米尼克","zh-TW":"多米尼克","ja":"ドミニカ国","ko":"도미니카국","fr":"Dominique","es":"Dominica","vi":"Dominica","th":"โดมินีกา","ru":"Доминика","de":"Dominica","pl":"Dominika","it":"Dominica","ar":"دومينيكا","tr":"Dominika","uk":"Домініка","pt":"Dominica","nl":"Dominica","id":"Dominica","ms":"Dominica","hi":"डोमिनिका","he":"דומיניקה","cs":"Dominika","hu":"Dominika","ro":"Dominica","fa":"دومینیکا","el":"Δομινίκα"}},
    {"clones":["arrivalcard"],"host":"enterjamaica.gov.jm","url":"https://enterjamaica.gov.jm/","end":"gov.jm","codes":["enterjamaica","jamaica c5","electronic c5"],"names":["牙买加","牙買加","jamaica","ジャマイカ","자메이카","jamaïque","จาเมกา","ямайка","jamaika","jamajka","giamaica"],"label":{"en":"Jamaica","zh":"牙买加","zh-TW":"牙買加","ja":"ジャマイカ","ko":"자메이카","fr":"Jamaïque","es":"Jamaica","vi":"Jamaica","th":"จาเมกา","ru":"Ямайка","de":"Jamaika","pl":"Jamajka","it":"Giamaica","ar":"جامايكا","tr":"Jamaika","uk":"Ямайка","pt":"Jamaica","nl":"Jamaica","id":"Jamaika","ms":"Jamaica","hi":"जमैका","he":"ג'מייקה","cs":"Jamajka","hu":"Jamaica","ro":"Jamaica","fa":"جامائیکا","el":"Τζαμάικα"}},
    {"clones":["arrivalcard"],"host":"travel.gov.tt","url":"https://travel.gov.tt/en","end":"gov.tt","codes":["travel.gov.tt"],"names":["特立尼达","千里達","trinidad","トリニダード","트리니다드","trinité","ตรินิแดด","тринидад","trynidad"],"label":{"en":"Trinidad and Tobago","zh":"特立尼达和多巴哥","zh-TW":"千里達及托巴哥","ja":"トリニダード・トバゴ","ko":"트리니다드 토바고","fr":"Trinité-et-Tobago","es":"Trinidad y Tobago","vi":"Trinidad và Tobago","th":"ตรินิแดดและโตเบโก","ru":"Тринидад и Тобаго","de":"Trinidad und Tobago","pl":"Trynidad i Tobago","it":"Trinidad e Tobago","ar":"ترينيداد وتوباغو","tr":"Trinidad ve Tobago","uk":"Тринідад і Тобаго","pt":"Trinidad e Tobago","nl":"Trinidad en Tobago","id":"Trinidad dan Tobago","ms":"Trinidad dan Tobago","hi":"त्रिनिदाद और टोबैगो","he":"טרינידד וטובגו","cs":"Trinidad a Tobago","hu":"Trinidad és Tobago","ro":"Trinidad și Tobago","fa":"ترینیداد و توباگو","el":"Τρινιντάντ και Τομπάγκο"}}
  ];

  const UI = {
    zh:    { real: (n, end) => "Entry Card Helper 提醒您：这是真的" + n + "网址，" + end + "结尾。", before: "Entry Card Helper 提醒您：上述网站非官网，请到", link: "插件推荐的网址", after: "去填报。" },
    "zh-TW": { real: (n, end) => "Entry Card Helper 提醒您：這是真的" + n + "網址，" + end + "結尾。", before: "Entry Card Helper 提醒您：上述網站非官網，請到", link: "插件推薦的網址", after: "去填報。" },
    en:    { real: (n, end) => "Entry Card Helper reminds you: this is the real " + n + " site. It ends with " + end + ".", before: "Entry Card Helper reminds you: the site above is not official. Please file at the ", link: "link recommended by the extension", after: "." },
    ja:    { real: (n, end) => "Entry Card Helper からのお知らせ：これは本物の" + n + "サイトです。末尾は" + end + "です。", before: "公式サイトではありません。ご確認ください。無料申請はEntrycard helperの", link: "公式リンク", after: "へ。" },
    ko:    { real: (n, end) => "Entry Card Helper 알림: 진짜 " + n + " 사이트입니다. 주소 끝은 " + end + "입니다.", before: "공식 사이트가 아닙니다. 확인해 주세요. 무료 신청은 Entrycard helper의 ", link: "공식 링크", after: "를 누르세요." },
    fr:    { real: (n, end) => "Entry Card Helper vous rappelle : ceci est le vrai site " + n + ". Il se termine par " + end + ".", before: "Ce n'est pas le site officiel. Vérifiez. Pour remplir gratuitement, cliquez le ", link: "lien officiel", after: " d'Entrycard helper." },
    es:    { real: (n, end) => "Entry Card Helper le recuerda: este es el sitio real de " + n + ". Termina en " + end + ".", before: "Este no es el sitio oficial. Compruebe. Para enviarlo gratis, pulse el ", link: "enlace oficial", after: " de Entrycard helper." },
    vi:    { real: (n, end) => "Entry Card Helper nhắc bạn: đây là trang thật của " + n + ". Đuôi là " + end + ".", before: "Đây không phải trang chính thức. Hãy kiểm tra. Khai miễn phí hãy bấm ", link: "liên kết chính thức", after: " của Entrycard helper." },
    th:    { real: (n, end) => "Entry Card Helper แจ้งคุณ: นี่คือเว็บจริงของ " + n + " ลงท้ายด้วย " + end, before: "นี่ไม่ใช่เว็บทางการ โปรดตรวจสอบ การกรอกฟรีให้คลิก", link: "ลิงก์ทางการ", after: "จาก Entrycard helper" },
    ru:    { real: (n, end) => "Entry Card Helper напоминает: это настоящий сайт — " + n + ". Адрес заканчивается на " + end + ".", before: "Это не официальный сайт. Проверьте. Бесплатная форма — по ", link: "официальной ссылке", after: " от Entrycard helper." },
    de:    { real: (n, end) => "Entry Card Helper erinnert Sie: das ist die echte Seite — " + n + ". Sie endet auf " + end + ".", before: "Das ist nicht die offizielle Seite. Bitte prüfen. Kostenlos ausfüllen über den ", link: "offiziellen Link", after: " von Entrycard helper." },
    pl:    { real: (n, end) => "Entry Card Helper przypomina: to prawdziwa strona — " + n + ". Adres kończy się na " + end + ".", before: "To nie jest oficjalna strona. Sprawdź. Bezpłatne wypełnienie: ", link: "oficjalny link", after: " od Entrycard helper." },
    it:    { real: (n, end) => "Entry Card Helper ti ricorda: questo è il vero sito — " + n + ". Finisce con " + end + ".", before: "Non è il sito ufficiale. Controlla. Per compilare gratis, clicca il ", link: "link ufficiale", after: " di Entrycard helper." },
    ar:    { real: (n, end) => "Entry Card Helper يذكّركم: هذا هو الموقع الحقيقي — " + n + ". ينتهي بـ " + end + ".", before: "هذا ليس الموقع الرسمي. يُرجى التحقق. للتعبئة المجانية اضغط ", link: "الرابط الرسمي", after: " من Entrycard helper." },
    tr:    { real: (n, end) => "Entry Card Helper hatırlatır: bu gerçek sitedir — " + n + ". Adres " + end + " ile biter.", before: "Bu resmi site değil. Kontrol edin. Ücretsiz doldurmak için Entrycard helper ", link: "resmi bağlantısına", after: " tıklayın." },
    uk:    { real: (n, end) => "Entry Card Helper нагадує: це справжній сайт — " + n + ". Адреса закінчується на " + end + ".", before: "Це не офіційний сайт. Перевірте. Безкоштовне заповнення — за ", link: "офіційним посиланням", after: " від Entrycard helper." }
  };

  function uiLang() {
    let raw = "";
    try { raw = (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || ""; } catch (e) {}
    if (!raw) raw = navigator.language || "en";
    if (typeof normLang === "function") return normLang(raw);
    const l = raw.toLowerCase();
    if (l.indexOf("zh") === 0) return (l.indexOf("tw") >= 0 || l.indexOf("hk") >= 0 || l.indexOf("hant") >= 0) ? "zh-TW" : "zh";
    const hit = ["ja", "ko", "fr", "es", "vi", "th", "ru", "de", "pl", "it", "ar", "tr", "uk", "pt", "nl", "id", "ms", "hi", "he", "cs", "hu", "ro", "fa", "el"].find((k) => l.indexOf(k) === 0);
    return hit || "en";
  }
  const L = uiLang();
  const MORE = {
    pt: { "s.nia.gov.cn":"cartão da China", "eservices.ica.gov.sg":"Singapura SGAC", "imigresen-online.imi.gov.my":"Malásia MDAC", "tdac.immigration.go.th":"Tailândia TDAC", "prearrival.immigration.gov.vn":"cartão do Vietnã", "allindonesia.imigrasi.go.id":"cartão da Indonésia", "twac.immigration.gov.tw":"Taiwan TWAC", "indianvisaonline.gov.in":"cartão da Índia", "imuga.immigration.gov.mv":"cartão das Maldivas", "e-arrivalcard.go.kr":"cartão da Coreia", "arrival.gov.kh":"cartão do Camboja" },
    nl: { "s.nia.gov.cn":"China-aankomstkaart", "eservices.ica.gov.sg":"Singapore SGAC", "imigresen-online.imi.gov.my":"Maleisië MDAC", "tdac.immigration.go.th":"Thailand TDAC", "prearrival.immigration.gov.vn":"Vietnam-aankomstkaart", "allindonesia.imigrasi.go.id":"Indonesië-aankomstkaart", "twac.immigration.gov.tw":"Taiwan TWAC", "indianvisaonline.gov.in":"India-aankomstkaart", "imuga.immigration.gov.mv":"Maldiven-aankomstkaart", "e-arrivalcard.go.kr":"Korea-aankomstkaart", "arrival.gov.kh":"Cambodja-aankomstkaart" },
    id: { "s.nia.gov.cn":"kartu Tiongkok", "eservices.ica.gov.sg":"Singapura SGAC", "imigresen-online.imi.gov.my":"Malaysia MDAC", "tdac.immigration.go.th":"Thailand TDAC", "prearrival.immigration.gov.vn":"kartu Vietnam", "allindonesia.imigrasi.go.id":"kartu Indonesia", "twac.immigration.gov.tw":"Taiwan TWAC", "indianvisaonline.gov.in":"kartu India", "imuga.immigration.gov.mv":"kartu Maladewa", "e-arrivalcard.go.kr":"kartu Korea", "arrival.gov.kh":"kartu Kamboja" },
    ms: { "s.nia.gov.cn":"kad China", "eservices.ica.gov.sg":"Singapura SGAC", "imigresen-online.imi.gov.my":"Malaysia MDAC", "tdac.immigration.go.th":"Thailand TDAC", "prearrival.immigration.gov.vn":"kad Vietnam", "allindonesia.imigrasi.go.id":"kad Indonesia", "twac.immigration.gov.tw":"Taiwan TWAC", "indianvisaonline.gov.in":"kad India", "imuga.immigration.gov.mv":"kad Maldives", "e-arrivalcard.go.kr":"kad Korea", "arrival.gov.kh":"kad Kemboja" },
    hi: { "s.nia.gov.cn":"चीन कार्ड", "eservices.ica.gov.sg":"सिंगापुर SGAC", "imigresen-online.imi.gov.my":"मलेशिया MDAC", "tdac.immigration.go.th":"थाईलैंड TDAC", "prearrival.immigration.gov.vn":"वियतनाम कार्ड", "allindonesia.imigrasi.go.id":"इंडोनेशिया कार्ड", "twac.immigration.gov.tw":"ताइवान TWAC", "indianvisaonline.gov.in":"भारत कार्ड", "imuga.immigration.gov.mv":"मालदीव कार्ड", "e-arrivalcard.go.kr":"कोरिया कार्ड", "arrival.gov.kh":"कंबोडिया कार्ड" },
    he: { "s.nia.gov.cn":"כרטיס סין", "eservices.ica.gov.sg":"סינגפור SGAC", "imigresen-online.imi.gov.my":"מלזיה MDAC", "tdac.immigration.go.th":"תאילנד TDAC", "prearrival.immigration.gov.vn":"כרטיס וייטנאם", "allindonesia.imigrasi.go.id":"כרטיס אינדונזיה", "twac.immigration.gov.tw":"טייוואן TWAC", "indianvisaonline.gov.in":"כרטיס הודו", "imuga.immigration.gov.mv":"כרטיס המלדיביים", "e-arrivalcard.go.kr":"כרטיס קוריאה", "arrival.gov.kh":"כרטיס קמבודיה" },
    cs: { "s.nia.gov.cn":"karta Číny", "eservices.ica.gov.sg":"Singapur SGAC", "imigresen-online.imi.gov.my":"Malajsie MDAC", "tdac.immigration.go.th":"Thajsko TDAC", "prearrival.immigration.gov.vn":"karta Vietnamu", "allindonesia.imigrasi.go.id":"karta Indonésie", "twac.immigration.gov.tw":"Tchaj-wan TWAC", "indianvisaonline.gov.in":"karta Indie", "imuga.immigration.gov.mv":"karta Malediv", "e-arrivalcard.go.kr":"karta Koreje", "arrival.gov.kh":"karta Kambodže" },
    hu: { "s.nia.gov.cn":"kínai kártya", "eservices.ica.gov.sg":"Szingapúr SGAC", "imigresen-online.imi.gov.my":"Malajzia MDAC", "tdac.immigration.go.th":"Thaiföld TDAC", "prearrival.immigration.gov.vn":"vietnámi kártya", "allindonesia.imigrasi.go.id":"indonéz kártya", "twac.immigration.gov.tw":"Tajvan TWAC", "indianvisaonline.gov.in":"indiai kártya", "imuga.immigration.gov.mv":"maldív kártya", "e-arrivalcard.go.kr":"koreai kártya", "arrival.gov.kh":"kambodzsai kártya" },
    ro: { "s.nia.gov.cn":"cardul Chinei", "eservices.ica.gov.sg":"Singapore SGAC", "imigresen-online.imi.gov.my":"Malaezia MDAC", "tdac.immigration.go.th":"Thailanda TDAC", "prearrival.immigration.gov.vn":"cardul Vietnamului", "allindonesia.imigrasi.go.id":"cardul Indoneziei", "twac.immigration.gov.tw":"Taiwan TWAC", "indianvisaonline.gov.in":"cardul Indiei", "imuga.immigration.gov.mv":"cardul Maldivelor", "e-arrivalcard.go.kr":"cardul Coreei", "arrival.gov.kh":"cardul Cambodgiei" },
    fa: { "s.nia.gov.cn":"کارت چین", "eservices.ica.gov.sg":"سنگاپور SGAC", "imigresen-online.imi.gov.my":"مالزی MDAC", "tdac.immigration.go.th":"تایلند TDAC", "prearrival.immigration.gov.vn":"کارت ویتنام", "allindonesia.imigrasi.go.id":"کارت اندونزی", "twac.immigration.gov.tw":"تایوان TWAC", "indianvisaonline.gov.in":"کارت هند", "imuga.immigration.gov.mv":"کارت مالدیو", "e-arrivalcard.go.kr":"کارت کره", "arrival.gov.kh":"کارت کامبوج" },
    el: { "s.nia.gov.cn":"κάρτα Κίνας", "eservices.ica.gov.sg":"Σιγκαπούρη SGAC", "imigresen-online.imi.gov.my":"Μαλαισία MDAC", "tdac.immigration.go.th":"Ταϊλάνδη TDAC", "prearrival.immigration.gov.vn":"κάρτα Βιετνάμ", "allindonesia.imigrasi.go.id":"κάρτα Ινδονησίας", "twac.immigration.gov.tw":"Ταϊβάν TWAC", "indianvisaonline.gov.in":"κάρτα Ινδίας", "imuga.immigration.gov.mv":"κάρτα Μαλδίβων", "e-arrivalcard.go.kr":"κάρτα Κορέας", "arrival.gov.kh":"κάρτα Καμπότζης" }
  };
  function packT() {
    const p = (typeof I18N !== "undefined" && I18N[L]) ? I18N[L] : null;
    if (p && p.hint_before) return {
      real: (n, end) => String(p.hint_real || "").replace("{n}", n).replace("{end}", end),
      before: p.hint_before, link: p.hint_link, after: p.hint_after
    };
    return UI[L] || UI.en;
  }
  const T = packT();
  const nameOf = (c) => (c.label && (c.label[L] || (MORE[L] && MORE[L][c.host]) || c.label.en)) || "";

  const norm = (h) => (h || "").toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const qtext = () => {
    try { return decodeURIComponent(new URL(location.href).searchParams.get("q") || "").toLowerCase(); }
    catch (e) { return (new URL(location.href).searchParams.get("q") || "").toLowerCase(); }
  };
  const cardish = (q) => /arrival|入境|入国|입국|arrivée|llegada|nhập cảnh|ขาเข้า|tdac|sgac|mdac|twac|imuga|e-?arrival|落地签|落地簽|etravel|nztd|edcard|vjw|eticket|e-ticket|visit japan|въезд|прибыт|einreise|ankunft|wjazd|przyjazd|arrivo|وصول|varış|в'їзд|в’їзд/.test(q);
  const hitName = (q, n) => {
    const s = String(n || "").toLowerCase();
    if (!s || q.indexOf(s) < 0) return false;
    if (s === "dominica") {
      const after = q.charAt(q.indexOf(s) + s.length);
      if (after && /[a-z]/.test(after)) return false;
    }
    return true;
  };
  const active = () => {
    const q = qtext();
    return COUNTRIES.filter((c) => c.codes.some((k) => q.includes(k)) || (cardish(q) && c.names.some((n) => hitName(q, n))));
  };
  const isOff = (host, c) => { const h = norm(host), o = norm(c.host); return h === o || h.endsWith("." + o); };
  const officialOf = (host) => COUNTRIES.find((c) => isOff(host, c));
  const skipHost = (host) => /(^|\.)gov(\.[a-z]{2})?$|(^|\.)go(\.[a-z]{2})?$|(^|\.)mil(\.[a-z]{2})?$|(^|\.)edu(\.[a-z]{2})?$/.test(host)
    || /embassy|consulate|immigration\.|youtube\.com|youtu\.be|wikipedia\.org|facebook\.com|reddit\.com/.test(host);
  const cloneOf = (host, list) => {
    const h = norm(host);
    if (!h || skipHost(h) || officialOf(h)) return null;
    return list.find((c) => c.clones.some((k) => h.includes(k)) || h.includes("ivisa")) || null;
  };
  const hostFrom = (text) => {
    const t = (text || "").replace(/\s+/g, " ");
    let m = t.match(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/i);
    if (m) return norm(m[1]);
    m = t.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?=\s|›|»|\/|$)/i);
    return m ? norm(m[1]) : "";
  };
  const cssReal = "all:initial;display:block;margin:4px 0 12px;font:14px/1.5 Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#0b7a32;font-weight:650;";
  const cssFake = "all:initial;display:block;margin:4px 0 12px;padding:2px 6px;background:#fde8e6;font:14px/1.5 Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#d93025;font-weight:650;";

  function realNote(c) {
    const d = document.createElement("div");
    d.className = "eh-real";
    d.setAttribute("style", cssReal);
    d.textContent = T.real(nameOf(c), c.end);
    return d;
  }
  function fakeNote(c) {
    const d = document.createElement("div");
    d.className = "eh-fake";
    d.setAttribute("style", cssFake);
    d.appendChild(document.createTextNode(T.before));
    const a = document.createElement("a");
    a.href = c.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = T.link;
    a.setAttribute("style", "color:#d93025;font-weight:700;text-decoration:underline;");
    a.addEventListener("click", (e) => e.stopPropagation());
    d.appendChild(a);
    d.appendChild(document.createTextNode(T.after));
    return d;
  }

  function blocks() {
    const list = [...document.querySelectorAll("#rso .yuRUbf, #search .yuRUbf, #tads .uEierd, #bottomads .uEierd")];
    if (list.length) return list;
    const fallback = [];
    document.querySelectorAll("#search a h3, #rso a h3, #tads a").forEach((el) => {
      const a = el.closest("a");
      if (a && a.parentElement) fallback.push(a.parentElement);
    });
    return fallback;
  }

  function scan() {
    const list = active();
    if (!list.length) return;
    blocks().forEach((block) => {
      if (!block || block.dataset.eh) return;
      const host = hostFrom(block.innerText);
      const box = block.closest(".MjjYud") || block.closest(".g") || block.parentElement;
      const off = host && officialOf(host);
      if (off && list.some((c) => c.host === off.host)) {
        if (!(block.nextElementSibling && block.nextElementSibling.classList.contains("eh-real"))) {
          block.insertAdjacentElement("afterend", realNote(off));
        }
        block.dataset.eh = "1";
        return;
      }
      if (box && (box.querySelector(".eh-real") || box.querySelector(".eh-fake"))) {
        block.dataset.eh = "1";
        return;
      }
      const fake = list[0];
      if (fake && !(block.nextElementSibling && block.nextElementSibling.classList.contains("eh-fake"))) {
        block.insertAdjacentElement("afterend", fakeNote(fake));
      }
      block.dataset.eh = "1";
    });
  }

  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(scan, 200); };
  scan();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", schedule);
})();
