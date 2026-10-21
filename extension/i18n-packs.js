"use strict";
// 新语种界面。缺的句子回落到英文。搜索标注句在 hint_*。
(function () {
  const H = (real, before, link, after) => ({ hint_real: real, hint_before: before, hint_link: link, hint_after: after });
  const add = (code, pack) => { I18N[code] = Object.assign({}, I18N.en, pack); };

  add("ru", Object.assign({
    lang_name:"Русский", title:"Помощник карты прибытия", subtitle:"Официальные сайты карт прибытия — без платных копий",
    search:"Куда летите…", open_site:"Открыть официальный сайт", secondary:"Запасной сайт",
    official:"ОФИЦИАЛЬНО", free:"БЕСПЛАТНО", window:"Когда подавать", notes:"Заметки", fields:"Подсказка по полям",
    heads_up:"Внимание", verified:"Обновлено", ask:"Спросить ИИ / поиск", share:"Поделиться", copy:"Копировать ссылку", copied:"Скопировано",
    examples:"Примеры", default_use:"Не уверены? укажите", fmt_label:"Как писать", opts_label:"Нажмите, чтобы скопировать", settings:"Настройки",
    no_result:"Это направление пока не поддерживается. Сейчас есть:", updated:"Данные обновлены", offline:"Офлайн — сохранённые данные",
    page_assist:"Подсказка на этой странице", nat_help:"Как выбрать гражданство", nat_maybe:"Примеры кодов:", nat_none:"Не удалось определить. Выберите сами.",
    nat_tip:"Откройте список и наберите chn / china — без прокрутки.", disclaimer:"Сверяйтесь с официальным сайтом. Правила часто меняются.",
    sp_open:"Напоминания о поездке", sp_title:"Напоминания о поездке", sp_sub:"Хранится на устройстве", sp_dest:"Куда", sp_pick:"Выберите страну",
    sp_other:"Другое · только рейс", sp_date:"Дата поездки", sp_flight:"Рейс (необязательно)", sp_cal:"Добавить в календарь (.ics)",
    sp_save:"Сохранить", sp_needdate:"Сначала выберите страну и дату", sp_none:"Поездок пока нет.", sp_fill:"Заполнить", sp_addcal:"В календарь",
    sp_done:"Готово", sp_del:"Удалить", sp_green:"Карту можно заполнить сегодня", sp_amber:"Окно ещё не открыто", sp_opens:"откроется",
    sp_memo:"Напоминание о рейсе", sp_done_tag:"Готово", sp_past:"Прошло", sp_upsell:"Для поддерживаемых стран напомню заполнить карту.",
    sp_back:"‹ Страны", sp_tab_trips:"Поездки", sp_tab_list:"Страны", sp_list_open:"Официальный сайт", sp_list_new:"Добавить", sp_list_search:"Поиск…",
    pend_title:"Бронируете билет?", pend_yes:"Добавить", pend_no:"Не сейчас", del_title:"Удалить поездку?", del_yes:"Удалить", del_no:"Оставить"
  }, H("Entry Card Helper напоминает: это настоящий сайт — {n}. Адрес заканчивается на {end}.", "Entry Card Helper напоминает: сайт выше не официальный. Заполните по ", "ссылке, которую советует расширение", ".")));

  add("de", Object.assign({
    lang_name:"Deutsch", title:"Ankunftskarten-Hilfe", subtitle:"Offizielle Ankunftskarten-Seiten — keine kostenpflichtigen Kopien",
    search:"Wohin geht die Reise…", open_site:"Offizielle Seite öffnen", official:"OFFIZIELL", free:"KOSTENLOS", window:"Wann einreichen",
    notes:"Hinweise", fields:"Feldhilfe", settings:"Einstellungen", no_result:"Dieses Reiseziel gibt es noch nicht. Derzeit:",
    page_assist:"Feldhilfe auf dieser Seite", disclaimer:"Bitte auf der offiziellen Seite prüfen. Regeln ändern sich oft.",
    sp_title:"Reiseerinnerung", sp_dest:"Reiseziel", sp_date:"Reisedatum", sp_flight:"Flugnummer (optional)", sp_save:"Speichern",
    sp_fill:"Ausfüllen", sp_del:"Löschen", sp_green:"Karte kann heute ausgefüllt werden", sp_back:"‹ Länder", sp_tab_trips:"Reisen", sp_tab_list:"Länder",
    sp_list_open:"Offizielle Seite", del_title:"Diese Reise löschen?", del_yes:"Löschen", del_no:"Behalten"
  }, H("Entry Card Helper erinnert Sie: das ist die echte Seite — {n}. Sie endet auf {end}.", "Entry Card Helper erinnert Sie: die Seite oben ist nicht offiziell. Bitte ausfüllen über ", "den vom Plugin empfohlenen Link", ".")));

  add("pl", Object.assign({
    lang_name:"Polski", title:"Pomocnik karty wjazdowej", subtitle:"Oficjalne strony kart wjazdowych — bez płatnych podróbek",
    search:"Dokąd lecisz…", open_site:"Otwórz oficjalną stronę", official:"OFICJALNE", free:"ZA DARMO", window:"Kiedy złożyć",
    notes:"Uwagi", fields:"Pomoc przy polach", settings:"Ustawienia", page_assist:"Pomoc na tej stronie",
    disclaimer:"Sprawdź na oficjalnej stronie. Przepisy często się zmieniają.",
    sp_title:"Przypomnienie o podróży", sp_dest:"Kierunek", sp_date:"Data podróży", sp_save:"Zapisz", sp_fill:"Wypełnij", sp_del:"Usuń",
    sp_back:"‹ Kraje", sp_tab_list:"Kraje", sp_list_open:"Strona oficjalna", del_title:"Usunąć tę podróż?", del_yes:"Usuń", del_no:"Zostaw"
  }, H("Entry Card Helper przypomina: to prawdziwa strona — {n}. Adres kończy się na {end}.", "Entry Card Helper przypomina: strona powyżej nie jest oficjalna. Wypełnij przez ", "link polecany przez wtyczkę", ".")));

  add("it", Object.assign({
    lang_name:"Italiano", title:"Guida carta d'arrivo", subtitle:"Siti ufficiali della carta d'arrivo — niente copie a pagamento",
    search:"Dove vai…", open_site:"Apri il sito ufficiale", official:"UFFICIALE", free:"GRATIS", window:"Quando inviare",
    notes:"Note", fields:"Guida ai campi", settings:"Impostazioni", page_assist:"Aiuto su questa pagina",
    disclaimer:"Controlla sempre sul sito ufficiale. Le regole cambiano spesso.",
    sp_title:"Promemoria di viaggio", sp_dest:"Destinazione", sp_date:"Data", sp_save:"Salva", sp_fill:"Compila", sp_del:"Elimina",
    sp_back:"‹ Paesi", sp_tab_list:"Paesi", sp_list_open:"Sito ufficiale", del_title:"Eliminare questo viaggio?", del_yes:"Elimina", del_no:"Tieni"
  }, H("Entry Card Helper ti ricorda: questo è il vero sito — {n}. Finisce con {end}.", "Entry Card Helper ti ricorda: il sito sopra non è ufficiale. Compila tramite ", "il link consigliato dall'estensione", ".")));

  add("ar", Object.assign({
    lang_name:"العربية", title:"مساعد بطاقة الوصول", subtitle:"مواقع بطاقة الوصول الرسمية — بدون مواقع مدفوعة مقلدة",
    search:"إلى أين تسافر…", open_site:"افتح الموقع الرسمي", official:"رسمي", free:"مجاني", window:"متى تقدّم",
    notes:"ملاحظات", fields:"شرح الحقول", settings:"الإعدادات", page_assist:"مساعدة في هذه الصفحة",
    disclaimer:"تأكد دائمًا من الموقع الرسمي. القواعد تتغير كثيرًا.",
    sp_title:"تذكير الرحلة", sp_dest:"الوجهة", sp_date:"التاريخ", sp_save:"حفظ", sp_fill:"املأ", sp_del:"حذف",
    sp_back:"‹ الدول", sp_tab_list:"الدول", sp_list_open:"الموقع الرسمي", del_title:"حذف هذه الرحلة؟", del_yes:"حذف", del_no:"إبقاء"
  }, H("Entry Card Helper يذكّركم: هذا هو الموقع الحقيقي — {n}. ينتهي بـ {end}.", "Entry Card Helper يذكّركم: الموقع أعلاه ليس رسمياً. يُرجى التعبئة عبر ", "الرابط الذي توصي به الإضافة", ".")));

  add("tr", Object.assign({
    lang_name:"Türkçe", title:"Giriş kartı yardımcısı", subtitle:"Resmi varış kartı siteleri — ücretli sahte siteler değil",
    search:"Nereye gidiyorsunuz…", open_site:"Resmi siteyi aç", official:"RESMİ", free:"ÜCRETSİZ", window:"Ne zaman gönderilir",
    notes:"Notlar", fields:"Alan rehberi", settings:"Ayarlar", page_assist:"Bu sayfadaki yardım",
    disclaimer:"Her zaman resmi siteden doğrulayın. Kurallar sık değişir.",
    sp_title:"Seyahat hatırlatıcısı", sp_dest:"Gidilecek yer", sp_date:"Tarih", sp_save:"Kaydet", sp_fill:"Doldur", sp_del:"Sil",
    sp_back:"‹ Ülkeler", sp_tab_list:"Ülkeler", sp_list_open:"Resmi site", del_title:"Bu gezi silinsin mi?", del_yes:"Sil", del_no:"Kalsın"
  }, H("Entry Card Helper hatırlatır: bu gerçek sitedir — {n}. Adres {end} ile biter.", "Entry Card Helper hatırlatır: yukarıdaki site resmi değil. Lütfen eklentinin önerdiği ", "adreste", " doldurun.")));

  add("uk", Object.assign({
    lang_name:"Українська", title:"Помічник картки прибуття", subtitle:"Офіційні сайти карток прибуття — без платних копій",
    search:"Куди летите…", open_site:"Відкрити офіційний сайт", official:"ОФІЦІЙНО", free:"БЕЗКОШТОВНО", window:"Коли подавати",
    notes:"Нотатки", fields:"Підказка до полів", settings:"Налаштування", page_assist:"Підказка на цій сторінці",
    disclaimer:"Звіряйтеся з офіційним сайтом. Правила часто змінюються.",
    sp_title:"Нагадування про поїздку", sp_dest:"Куди", sp_date:"Дата", sp_save:"Зберегти", sp_fill:"Заповнити", sp_del:"Видалити",
    sp_back:"‹ Країни", sp_tab_list:"Країни", sp_list_open:"Офіційний сайт", del_title:"Видалити цю поїздку?", del_yes:"Видалити", del_no:"Залишити"
  }, H("Entry Card Helper нагадує: це справжній сайт — {n}. Адреса закінчується на {end}.", "Entry Card Helper нагадує: сайт вище не офіційний. Заповнюйте за ", "посиланням, яке радить розширення", ".")));

  add("pt", Object.assign({
    lang_name:"Português", title:"Ajuda do cartão de chegada", subtitle:"Sites oficiais do cartão de chegada — sem cópias pagas",
    search:"Para onde você vai…", open_site:"Abrir site oficial", official:"OFICIAL", free:"GRÁTIS", window:"Quando enviar",
    notes:"Notas", fields:"Ajuda dos campos", settings:"Configurações", page_assist:"Ajuda nesta página",
    disclaimer:"Confirme sempre no site oficial. As regras mudam com frequência.",
    sp_title:"Lembrete de viagem", sp_dest:"Destino", sp_date:"Data", sp_save:"Salvar", sp_fill:"Preencher", sp_del:"Excluir",
    sp_back:"‹ Países", sp_tab_list:"Países", sp_list_open:"Site oficial", del_title:"Excluir esta viagem?", del_yes:"Excluir", del_no:"Manter"
  }, H("Entry Card Helper lembra você: este é o site verdadeiro — {n}. Termina em {end}.", "Entry Card Helper lembra você: o site acima não é oficial. Preencha no ", "link recomendado pela extensão", ".")));

  add("nl", Object.assign({
    lang_name:"Nederlands", title:"Aankomstkaart-hulp", subtitle:"Officiële aankomstkaart-sites — geen betaalde kopieën",
    search:"Waar ga je heen…", open_site:"Officiële site openen", official:"OFFICIEEL", free:"GRATIS", window:"Wanneer indienen",
    notes:"Opmerkingen", fields:"Veldhulp", settings:"Instellingen", page_assist:"Hulp op deze pagina",
    disclaimer:"Controleer altijd de officiële site. Regels veranderen vaak.",
    sp_title:"Reisherinnering", sp_dest:"Bestemming", sp_date:"Datum", sp_save:"Opslaan", sp_fill:"Invullen", sp_del:"Verwijderen",
    sp_back:"‹ Landen", sp_tab_list:"Landen", sp_list_open:"Officiële site", del_title:"Deze reis verwijderen?", del_yes:"Verwijderen", del_no:"Houden"
  }, H("Entry Card Helper herinnert u: dit is de echte site — {n}. Het adres eindigt op {end}.", "Entry Card Helper herinnert u: de site hierboven is niet officieel. Vul in via ", "de link die de extensie aanbeveelt", ".")));

  add("id", Object.assign({
    lang_name:"Bahasa Indonesia", title:"Bantuan kartu kedatangan", subtitle:"Situs resmi kartu kedatangan — bukan situs berbayar palsu",
    search:"Ke mana Anda pergi…", open_site:"Buka situs resmi", official:"RESMI", free:"GRATIS", window:"Kapan mengisi",
    notes:"Catatan", fields:"Panduan isian", settings:"Pengaturan", page_assist:"Bantuan di halaman ini",
    disclaimer:"Selalu cek di situs resmi. Aturan sering berubah.",
    sp_title:"Pengingat perjalanan", sp_dest:"Tujuan", sp_date:"Tanggal", sp_save:"Simpan", sp_fill:"Isi", sp_del:"Hapus",
    sp_back:"‹ Negara", sp_tab_list:"Negara", sp_list_open:"Situs resmi", del_title:"Hapus perjalanan ini?", del_yes:"Hapus", del_no:"Biarkan"
  }, H("Entry Card Helper mengingatkan: ini situs yang benar — {n}. Berakhiran {end}.", "Entry Card Helper mengingatkan: situs di atas bukan situs resmi. Silakan isi di ", "tautan yang disarankan ekstensi", ".")));

  add("ms", Object.assign({
    lang_name:"Bahasa Melayu", title:"Pembantu kad ketibaan", subtitle:"Laman rasmi kad ketibaan — bukan laman berbayar palsu",
    search:"Ke mana anda pergi…", open_site:"Buka laman rasmi", official:"RASMI", free:"PERCUMA", window:"Bila hendak dihantar",
    notes:"Nota", fields:"Panduan medan", settings:"Tetapan", page_assist:"Bantuan di halaman ini",
    disclaimer:"Sentiasa sahkan di laman rasmi. Peraturan sering berubah.",
    sp_title:"Peringatan perjalanan", sp_dest:"Destinasi", sp_date:"Tarikh", sp_save:"Simpan", sp_fill:"Isi", sp_del:"Padam",
    sp_back:"‹ Negara", sp_tab_list:"Negara", sp_list_open:"Laman rasmi", del_title:"Padam perjalanan ini?", del_yes:"Padam", del_no:"Kekalkan"
  }, H("Entry Card Helper mengingatkan: ini laman sebenar — {n}. Berakhir dengan {end}.", "Entry Card Helper mengingatkan: laman di atas bukan laman rasmi. Sila isi di ", "pautan yang disyorkan pemalam", ".")));

  add("hi", Object.assign({
    lang_name:"हिन्दी", title:"आगमन कार्ड सहायक", subtitle:"आधिकारिक आगमन कार्ड साइटें — भुगतान वाले नकली साइट नहीं",
    search:"आप कहाँ जा रहे हैं…", open_site:"आधिकारिक साइट खोलें", official:"आधिकारिक", free:"मुफ़्त", window:"कब भरें",
    notes:"नोट", fields:"फ़ील्ड सहायता", settings:"सेटिंग", page_assist:"इस पेज पर सहायता",
    disclaimer:"हमेशा आधिकारिक साइट पर जाँचें। नियम अक्सर बदलते हैं।",
    sp_title:"यात्रा याद दिलाना", sp_dest:"गंतव्य", sp_date:"तारीख", sp_save:"सहेजें", sp_fill:"भरें", sp_del:"हटाएँ",
    sp_back:"‹ देश", sp_tab_list:"देश", sp_list_open:"आधिकारिक साइट", del_title:"यह यात्रा हटाएँ?", del_yes:"हटाएँ", del_no:"रखें"
  }, H("Entry Card Helper याद दिलाता है: यह असली साइट है — {n}। पता {end} पर खत्म होता है।", "Entry Card Helper याद दिलाता है: ऊपर वाली साइट आधिकारिक नहीं है। कृपया एक्सटेंशन की सलाह वाले ", "पते", " पर भरें।")));

  add("he", Object.assign({
    lang_name:"עברית", title:"עוזר כרטיס כניסה", subtitle:"אתרי כרטיס כניסה רשמיים — בלי אתרים מתחזים בתשלום",
    search:"לאן טסים…", open_site:"פתחו את האתר הרשמי", official:"רשמי", free:"חינם", window:"מתי למלא",
    notes:"הערות", fields:"עזרה בשדות", settings:"הגדרות", page_assist:"עזרה בעמוד הזה",
    disclaimer:"תמיד לאמת באתר הרשמי. הכללים משתנים לעיתים קרובות.",
    sp_title:"תזכורת נסיעה", sp_dest:"יעד", sp_date:"תאריך", sp_save:"שמירה", sp_fill:"מילוי", sp_del:"מחיקה",
    sp_back:"‹ מדינות", sp_tab_list:"מדינות", sp_list_open:"אתר רשמי", del_title:"למחוק את הנסיעה?", del_yes:"מחיקה", del_no:"להשאיר"
  }, H("Entry Card Helper מזכיר: זה האתר האמיתי — {n}. הכתובת מסתיימת ב-{end}.", "Entry Card Helper מזכיר: האתר למעלה אינו רשמי. מלאו ב", "קישור שהתוסף ממליץ", ".")));

  add("cs", Object.assign({
    lang_name:"Čeština", title:"Pomocník příletové karty", subtitle:"Oficiální stránky příletových karet — žádné placené kopie",
    search:"Kam letíte…", open_site:"Otevřít oficiální web", official:"OFICIÁLNÍ", free:"ZDARMA", window:"Kdy podat",
    notes:"Poznámky", fields:"Nápověda k polím", settings:"Nastavení", page_assist:"Nápověda na této stránce",
    disclaimer:"Vždy ověřte na oficiálním webu. Pravidla se často mění.",
    sp_title:"Připomínka cesty", sp_dest:"Cíl", sp_date:"Datum", sp_save:"Uložit", sp_fill:"Vyplnit", sp_del:"Smazat",
    sp_back:"‹ Země", sp_tab_list:"Země", sp_list_open:"Oficiální web", del_title:"Smazat tuto cestu?", del_yes:"Smazat", del_no:"Nechat"
  }, H("Entry Card Helper připomíná: toto je skutečný web — {n}. Adresa končí na {end}.", "Entry Card Helper připomíná: web výše není oficiální. Vyplňte přes ", "odkaz, který doporučuje rozšíření", ".")));

  add("hu", Object.assign({
    lang_name:"Magyar", title:"Érkezési kártya segéd", subtitle:"Hivatalos érkezési kártya oldalak — nincs fizetős másolat",
    search:"Hová utazik…", open_site:"Hivatalos oldal megnyitása", official:"HIVATALOS", free:"INGYENES", window:"Mikor kell beadni",
    notes:"Megjegyzések", fields:"Mezősúgó", settings:"Beállítások", page_assist:"Súgó ezen az oldalon",
    disclaimer:"Mindig ellenőrizze a hivatalos oldalon. A szabályok gyakran változnak.",
    sp_title:"Utazási emlékeztető", sp_dest:"Cél", sp_date:"Dátum", sp_save:"Mentés", sp_fill:"Kitöltés", sp_del:"Törlés",
    sp_back:"‹ Országok", sp_tab_list:"Országok", sp_list_open:"Hivatalos oldal", del_title:"Törli ezt az utat?", del_yes:"Törlés", del_no:"Megtartás"
  }, H("Entry Card Helper emlékeztet: ez az igazi oldal — {n}. A cím {end} végű.", "Entry Card Helper emlékeztet: a fenti oldal nem hivatalos. Kérjük, a bővítmény által ajánlott ", "címen", " töltse ki.")));

  add("ro", Object.assign({
    lang_name:"Română", title:"Ajutor card de sosire", subtitle:"Site-uri oficiale de card de sosire — fără copii cu plată",
    search:"Unde mergi…", open_site:"Deschide site-ul oficial", official:"OFICIAL", free:"GRATUIT", window:"Când se trimite",
    notes:"Note", fields:"Ajutor câmpuri", settings:"Setări", page_assist:"Ajutor pe această pagină",
    disclaimer:"Verifică mereu pe site-ul oficial. Regulile se schimbă des.",
    sp_title:"Memento de călătorie", sp_dest:"Destinație", sp_date:"Data", sp_save:"Salvează", sp_fill:"Completează", sp_del:"Șterge",
    sp_back:"‹ Țări", sp_tab_list:"Țări", sp_list_open:"Site oficial", del_title:"Ștergi această călătorie?", del_yes:"Șterge", del_no:"Păstrează"
  }, H("Entry Card Helper vă amintește: acesta este site-ul real — {n}. Se termină cu {end}.", "Entry Card Helper vă amintește: site-ul de mai sus nu este oficial. Completați la ", "linkul recomandat de extensie", ".")));

  add("fa", Object.assign({
    lang_name:"فارسی", title:"راهنمای کارت ورود", subtitle:"سایت‌های رسمی کارت ورود — نه سایت‌های پولی تقلبی",
    search:"کجا می‌روید…", open_site:"باز کردن سایت رسمی", official:"رسمی", free:"رایگان", window:"کی ارسال شود",
    notes:"یادداشت", fields:"راهنمای خانه‌ها", settings:"تنظیمات", page_assist:"راهنما در این صفحه",
    disclaimer:"همیشه در سایت رسمی بررسی کنید. مقررات زیاد عوض می‌شود.",
    sp_title:"یادآور سفر", sp_dest:"مقصد", sp_date:"تاریخ", sp_save:"ذخیره", sp_fill:"پر کردن", sp_del:"حذف",
    sp_back:"‹ کشورها", sp_tab_list:"کشورها", sp_list_open:"سایت رسمی", del_title:"این سفر حذف شود؟", del_yes:"حذف", del_no:"نگه دار"
  }, H("Entry Card Helper یادآوری می‌کند: این سایت واقعی است — {n}. به {end} ختم می‌شود.", "Entry Card Helper یادآوری می‌کند: سایت بالا رسمی نیست. لطفاً در ", "نشانی پیشنهادی افزونه", " پر کنید.")));

  add("el", Object.assign({
    lang_name:"Ελληνικά", title:"Βοηθός κάρτας άφιξης", subtitle:"Επίσημες ιστοσελίδες κάρτας άφιξης — όχι αντίγραφα με χρέωση",
    search:"Πού ταξιδεύετε…", open_site:"Άνοιγμα επίσημης σελίδας", official:"ΕΠΙΣΗΜΟ", free:"ΔΩΡΕΑΝ", window:"Πότε υποβάλλεται",
    notes:"Σημειώσεις", fields:"Βοήθεια πεδίων", settings:"Ρυθμίσεις", page_assist:"Βοήθεια σε αυτή τη σελίδα",
    disclaimer:"Ελέγχετε πάντα την επίσημη σελίδα. Οι κανόνες αλλάζουν συχνά.",
    sp_title:"Υπενθύμιση ταξιδιού", sp_dest:"Προορισμός", sp_date:"Ημερομηνία", sp_save:"Αποθήκευση", sp_fill:"Συμπλήρωση", sp_del:"Διαγραφή",
    sp_back:"‹ Χώρες", sp_tab_list:"Χώρες", sp_list_open:"Επίσημη σελίδα", del_title:"Διαγραφή αυτού του ταξιδιού;", del_yes:"Διαγραφή", del_no:"Κράτησέ το"
  }, H("Entry Card Helper σας υπενθυμίζει: αυτός είναι ο πραγματικός ιστότοπος — {n}. Τελειώνει σε {end}.", "Entry Card Helper σας υπενθυμίζει: ο ιστότοπος από πάνω δεν είναι επίσημος. Συμπληρώστε στον ", "σύνδεσμο που προτείνει η επέκταση", ".")));
})();
