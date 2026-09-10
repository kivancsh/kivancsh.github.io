/* ============================================================================
   Kıvanç Karademir: sayfa koreografisi
   ----------------------------------------------------------------------------
   scrollcraft.js mekanizmayı sağlar (pinleme, video yükleme ve oynatma kafası,
   yatay şerit). Bu dosya siteye özgü her şeyi yapar ve motoru hiç değiştirmez:

     1. Dil (TR / EN): Türkçe HTML'de, İngilizce assets/js/i18n.js içinde
     2. Yumuşak tekerlek kaydırması (masaüstü)
     3. Açılış perdesi: gerçek indirme ilerlemesi, çizgi filmin ufkuna devredilir
     4. Film metinleri: videonun KENDİ oynatma kafasından okunur
     5. İmza hareketi: "Bunu nasıl daha iyi yapabiliriz?" kendini düzeltir
     6. Kariyer yolculuğu: tek yıl ekseni, kaydırdıkça ilerleyen oynatma çizgisi
     7. Önce / sonra grafiği, dönen kartlar, oynanabilir kapanış cümlesi
     8. Bölüm açılımları, portre, sayaçlar, menü, iletişim, ziyaretçi sayacı
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ AYARLAR -- */

  // İletişim. E-posta kaynakta düz yazılmasın diye iki parçadan birleştirilir.
  var CONTACT = {
    emailUser: 'alperen.kivanc',
    emailDomain: 'hotmail.com',
    linkedin: 'https://www.linkedin.com/in/alperenk%C4%B1van%C3%A7karademir/'
  };
  var CV_URL = 'public/cv/Kivanc-Karademir-CV.pdf';

  // Ziyaretçi sayacı (GoatCounter). goatcounter.com'da ücretsiz hesap açıp
  // seçtiğin kodu buraya yaz (ör. 'kivanc'). Panel yalnızca senin hesabınla açılır.
  // Kendi ziyaretlerini saydırmamak için siteyi bir kez ?sayac=kapat ile aç.
  var ANALYTICS = { goatcounter: '' };

  // Film zaman çizelgesi (0..1). tools/film.swift içindeki sahnelerle aynı.
  // [giriş başlar, tam görünür, çıkış başlar, tamamen çıktı]
  var SCENES = {
    intro: [-1, 0, 0.085, 0.125],
    soru: [0.14, 0.19, 0.37, 0.405],
    ag: [0.415, 0.455, 0.525, 0.56],
    veri: [0.575, 0.615, 0.70, 0.735],
    egri: [0.745, 0.785, 0.885, 0.915],
    safak: [0.935, 0.972, 2, 3]
  };

  // İmza hareketi: kelimelerin dağınık hali (genişlik, ağırlık, kayma em, dönüş)
  var DISORDER = [
    { wdth: 125, wght: 250, dx: -0.22, dy: 0.34, rot: -5, op: 0.55 },
    { wdth: 62, wght: 900, dx: 0.16, dy: -0.3, rot: 3.5, op: 0.92 },
    { wdth: 114, wght: 330, dx: -0.1, dy: 0.16, rot: -2.4, op: 0.62 },
    { wdth: 66, wght: 840, dx: 0.3, dy: -0.24, rot: 6, op: 0.86 },
    { wdth: 121, wght: 210, dx: -0.06, dy: 0.28, rot: -3, op: 0.72 }
  ];
  var ORDER = { wdth: 75, wght: 800 };

  // Filmin kare geometrisi: ufuk çizgisinin ekrandaki yerini hesaplamak için
  var FILM = { desktop: { w: 1920, h: 1080, horizon: 0.56 }, mobile: { w: 720, h: 1280, horizon: 0.40 } };

  // Kariyer yolculuğu. Kaynak: LinkedIn profili. Ay biçimi 'YYYY-AA', to: null = bugün.
  // P&G VIA'nın tarihi eklenince aynı biçimde buraya (type: 'program').
  var TIMELINE = [
    { id: 'dau', type: 'edu', from: '2018-09', to: '2023-07', name: { tr: 'Doğu Akdeniz Üniversitesi', en: 'Eastern Mediterranean University' }, role: { tr: 'Endüstri Mühendisliği, lisans', en: 'B.Eng., Industrial Engineering' } },
    { id: 'turkcell', type: 'program', from: '2021-01', to: '2021-02', name: 'Turkcell', role: { tr: 'Satış ve Pazarlama', en: 'Sales & Marketing' } },
    { id: 'qnb', type: 'intern', from: '2021-08', to: '2021-08', name: 'QNB Finansbank', role: { tr: 'Finans Stajyeri', en: 'Finance Intern' } },
    { id: 'vodafone', type: 'intern', from: '2021-09', to: '2021-11', name: 'Vodafone', role: { tr: 'Dijital Pazarlama Stajyeri', en: 'Digital Marketing Intern' } },
    { id: 'sampa', type: 'intern', from: '2022-02', to: '2022-02', name: 'SAMPA', role: { tr: 'Metot Geliştirme Birimi Stajyeri', en: 'Method Development Unit Intern' } },
    { id: 'lcw', type: 'program', from: '2022-02', to: '2022-03', name: 'LC Waikiki', role: { tr: 'Teknoloji ve Dijitalleşmeye Giriş Programı', en: 'Introduction to Technology and Digitalization' } },
    { id: 'loreal', type: 'program', from: '2022-02', to: '2022-07', name: 'L’Oréal', role: { tr: 'L’Oréal İle Benim Geleceğim, Mentee', en: 'My Future with L’Oréal, Mentee' } },
    { id: 'kastamonu', type: 'intern', from: '2022-07', to: '2022-08', name: 'Kastamonu Entegre', role: { tr: 'Üretim Planlama Stajyeri', en: 'Production Planning Intern' } },
    { id: 'bp', type: 'intern', from: '2022-08', to: '2022-10', name: 'BP', role: { tr: 'Teknik Destek Uzmanı Stajyeri', en: 'Technical Support Specialist Intern' } },
    { id: 'penta', type: 'work', from: '2023-09', to: '2024-11', name: 'Yıldız Holding, Penta Teknoloji', role: { tr: 'İş Geliştirme Uzmanı', en: 'Business Development Specialist' } },
    { id: 'tt', type: 'work', from: '2024-11', to: null, name: 'Türk Telekom', role: { tr: 'Perakende Kanal Satış Yöneticisi', en: 'Retail Channel Sales Manager' } }
  ];
  var LANES = ['work', 'intern', 'program', 'edu'];

  // Önce / sonra (endeks, başlangıç = 100). Gerçek veri: %62 verimlilik, %38 büyüme.
  var SHIFT = [
    { k: 'eff', before: 100, after: 162 },
    { k: 'growth', before: 100, after: 138 }
  ];
  var SHIFT_MAX = 200;

  /* -------------------------------------------------------- yardımcılar -- */
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = '(max-width: 860px), (hover: none) and (pointer: coarse)';
  var isMobile = matchMedia(mobileQuery).matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var darkMQ = matchMedia('(prefers-color-scheme: dark)');

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function c01(x) { return clamp(x, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(x) { x = c01(x); return x * x * (3 - 2 * x); }
  function smoother(x) { x = c01(x); return x * x * x * (x * (x * 6 - 15) + 10); }
  function expoOut(x) { x = c01(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function cubicIn(x) { x = c01(x); return x * x * x; }
  function cubicOut(x) { x = c01(x); return 1 - Math.pow(1 - x, 3); }
  function quartInOut(x) { x = c01(x); return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; }
  function span(a, b, x) { return (x - a) / (b - a); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------------------------------------------------------------- DİL --
     Türkçe asıl kaynak: öğelerin ilk içeriği saklanır. EN seçilince
     KK_EN sözlüğündeki karşılık yazılır; TR'ye dönünce saklanan geri gelir. */
  var EN = window.KK_EN || {};
  var UI = window.KK_UI || { tr: {}, en: {} };
  var i18nEls = $$('[data-i18n]');
  var i18nAttrEls = $$('[data-i18n-attr]');
  var metaDesc = $('meta[name="description"]');
  var TR_TITLE = document.title, TR_DESC = metaDesc ? metaDesc.getAttribute('content') : '';
  var qEl = $('.question');
  var TR_QUESTION = qEl.textContent.replace(/\s+/g, ' ').trim();
  i18nEls.forEach(function (e) { e.__tr = e.innerHTML; });
  i18nAttrEls.forEach(function (e) {
    e.__trAttr = {};
    e.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var attr = pair.split(':')[0];
      e.__trAttr[attr] = e.getAttribute(attr);
    });
  });

  var LANG = 'tr';
  (function () {
    var q = location.search.match(/[?&]lang=(tr|en)\b/);
    var saved = null;
    try { saved = localStorage.getItem('kk-lang'); } catch (e) {}
    LANG = q ? q[1] : (saved === 'en' ? 'en' : 'tr');
  })();
  function ui(k) { var d = UI[LANG] || UI.tr || {}; return d[k] != null ? d[k] : (UI.tr || {})[k]; }
  function locale() { return LANG === 'en' ? 'en-US' : 'tr-TR'; }

  function applyTexts() {
    root.lang = LANG;
    i18nEls.forEach(function (e) {
      var k = e.getAttribute('data-i18n');
      var html = LANG === 'en' && EN[k] != null ? EN[k] : e.__tr;
      e.__html = html;
      e.innerHTML = html;
    });
    i18nAttrEls.forEach(function (e) {
      e.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'), attr = p[0], key = p[1];
        e.setAttribute(attr, LANG === 'en' && EN[key] != null ? EN[key] : e.__trAttr[attr]);
      });
    });
    document.title = LANG === 'en' ? (EN['meta.title'] || TR_TITLE) : TR_TITLE;
    if (metaDesc) metaDesc.setAttribute('content', LANG === 'en' ? (EN['meta.description'] || TR_DESC) : TR_DESC);
    $$('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === LANG ? 'true' : 'false');
    });
    $$('.flip').forEach(function (b) { b.setAttribute('title', ui('flip')); });
  }

  /* -------------------------------------------------- satırlara bölme --
     Metni kelimelere ayırır, satır kırılımlarını ölçer ve her satırı kendi
     maskesine sarar. <strong> ve .num gibi satır içi öğeler korunur.        */
  function splitLines(node) {
    if (node.__html === undefined) node.__html = node.innerHTML;
    node.innerHTML = node.__html;
    var words = [];
    (function walk(n, wrappers) {
      Array.prototype.slice.call(n.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { words.push(null); return; }
            var outer = document.createTextNode(part);
            for (var i = wrappers.length - 1; i >= 0; i--) {
              var w = wrappers[i].cloneNode(false); w.appendChild(outer); outer = w;
            }
            var probe = el('span', 'w-probe');
            probe.appendChild(outer);
            words.push(probe);
          });
        } else if (child.nodeType === 1) {
          walk(child, wrappers.concat(child));
        }
      });
    })(node, []);
    node.innerHTML = '';
    words.forEach(function (w) { node.appendChild(w || document.createTextNode(' ')); });
    var lines = [], cur = null, lastTop = null;
    words.forEach(function (w) {
      if (!w) { if (cur) cur.push(null); return; }
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 3) { cur = []; lines.push(cur); lastTop = top; }
      cur.push(w);
    });
    node.innerHTML = '';
    lines.forEach(function (line, li) {
      while (line.length && line[line.length - 1] === null) line.pop();
      var ln = el('span', 'ln'), inner = el('span', 'ln__i');
      inner.style.setProperty('--i', li);
      line.forEach(function (w) {
        if (!w) { inner.appendChild(document.createTextNode(' ')); return; }
        while (w.firstChild) inner.appendChild(w.firstChild);
      });
      ln.appendChild(inner);
      node.appendChild(ln);
      if (li < lines.length - 1) node.appendChild(document.createTextNode(' '));
    });
    return $$('.ln__i', node);
  }

  /* ----------------------------------------------------- imza cümlesi -- */
  function buildQuestion() {
    var text = LANG === 'en' ? (EN['hero.question'] || TR_QUESTION) : TR_QUESTION;
    qEl.textContent = '';
    text.split(' ').forEach(function (w, i, arr) {
      qEl.appendChild(el('span', 'w', w));
      if (i < arr.length - 1) qEl.appendChild(document.createTextNode(' '));
    });
  }

  /* ------------------------------------------------ kariyer yolculuğu -- */
  var journey = $('#kariyer-yolculugu');
  var gantt = $('.gantt');
  var jList = $('.journey__list');
  var jYears = $$('.js-journey-year');
  var NOW = (function () { var d = new Date(); return d.getFullYear() + d.getMonth() / 12 + (d.getDate() - 1) / 365; })();
  function ym(s) { var p = s.split('-'); return +p[0] + (+p[1] - 1) / 12; }
  var AX0 = 2018.5, AX1 = Math.max(NOW + 0.3, 2026.5);
  function xPct(t) { return (t - AX0) / (AX1 - AX0) * 100; }
  var jItems = TIMELINE.map(function (d) {
    return { d: d, s: ym(d.from), e: d.to ? ym(d.to) + 1 / 12 : NOW, row: 0, k: -1, lit: null };
  });
  var laneRows = {};
  LANES.forEach(function (lane) {
    var ends = [];
    jItems.filter(function (it) { return it.d.type === lane; })
      .sort(function (a, b) { return a.s - b.s; })
      .forEach(function (it) {
        var r = 0;
        while (ends[r] != null && ends[r] > it.s + 1e-6) r++;
        ends[r] = it.e; it.row = r;
      });
    laneRows[lane] = Math.max(ends.length, 1);
  });
  var gTip = null;

  function nameOf(d) { return typeof d.name === 'string' ? d.name : d.name[LANG] || d.name.tr; }
  function dateParts(d) {
    var mf = new Intl.DateTimeFormat(locale(), { month: 'short' });
    var f = d.from.split('-').map(Number), t = d.to ? d.to.split('-').map(Number) : null;
    function mn(a) { return mf.format(new Date(a[0], a[1] - 1, 1)).replace(/\.$/, ''); }
    if (!t) return [[mn(f) + ' ', 0], [String(f[0]), 1], [' - ' + ui('present'), 0]];
    if (f[0] === t[0] && f[1] === t[1]) return [[mn(f) + ' ', 0], [String(f[0]), 1]];
    if (f[0] === t[0]) return [[mn(f) + ' - ' + mn(t) + ' ', 0], [String(f[0]), 1]];
    return [[mn(f) + ' ', 0], [String(f[0]), 1], [' - ' + mn(t) + ' ', 0], [String(t[0]), 1]];
  }
  function durationOf(d) {
    var f = d.from.split('-').map(Number), t;
    if (d.to) t = d.to.split('-').map(Number);
    else { var n = new Date(); t = [n.getFullYear(), n.getMonth() + 1]; }
    var m = (t[0] - f[0]) * 12 + (t[1] - f[1]) + 1;
    var y = Math.floor(m / 12), r = m % 12, out = [];
    if (y) out.push(y + ' ' + ui('year'));
    if (r) out.push(r + ' ' + ui('month'));
    return out.join(' ');
  }
  function renderDate(target, d, withDuration) {
    dateParts(d).forEach(function (p) {
      target.appendChild(p[1] ? el('span', 'num', p[0]) : document.createTextNode(p[0]));
    });
    if (withDuration) target.appendChild(document.createTextNode(' · ' + durationOf(d)));
  }

  function buildJourney() {
    gantt.textContent = '';
    var grid = el('div', 'gantt__grid');
    var axis = el('div', 'gantt__axis');
    for (var y = Math.ceil(AX0); y <= Math.floor(AX1); y++) {
      var g = el('span'); g.style.left = xPct(y) + '%'; grid.appendChild(g);
      var a = el('span', null, String(y)); a.style.left = xPct(y) + '%'; axis.appendChild(a);
    }
    var lanes = el('div', 'gantt__lanes');
    LANES.forEach(function (lane) {
      var laneEl = el('div', 'gantt__lane');
      laneEl.appendChild(el('span', 'gantt__label', (ui('lanes') || {})[lane] || lane));
      var track = el('div', 'gantt__track');
      track.style.setProperty('--rows', laneRows[lane]);
      jItems.forEach(function (it) {
        if (it.d.type !== lane) return;
        var bar = el('span', 'gantt__bar');
        bar.style.setProperty('--x', xPct(it.s) + '%');
        bar.style.setProperty('--w', 'calc(' + (xPct(it.e) - xPct(it.s)).toFixed(3) + '% - 2px)');
        bar.style.setProperty('--row', it.row);
        bar.setAttribute('data-id', it.d.id);
        var fill = el('span', 'gantt__fill');
        bar.appendChild(fill);
        track.appendChild(bar);
        it.bar = bar; it.fill = fill; it.k = -1;
      });
      laneEl.appendChild(track);
      lanes.appendChild(laneEl);
    });
    var head = el('div', 'gantt__head');
    gTip = el('div', 'gantt__tip'); gTip.hidden = true;
    gantt.appendChild(grid); gantt.appendChild(lanes); gantt.appendChild(axis); gantt.appendChild(head); gantt.appendChild(gTip);

    jList.textContent = '';
    jItems.forEach(function (it) {
      var li = el('li', 'jl');
      li.setAttribute('data-id', it.d.id);
      var date = el('span', 'jl__date'); renderDate(date, it.d, true);
      li.appendChild(date);
      li.appendChild(el('span', 'jl__name', nameOf(it.d)));
      li.appendChild(el('span', 'jl__role', it.d.role[LANG] || it.d.role.tr));
      jList.appendChild(li);
      it.li = li; it.lit = null;
      if (reduce) li.classList.add('is-lit');
    });
    lastYear = null;
    if (reduce) {
      // Hareket azaltılmış: çizelge baştan tamamlanmış halde
      gantt.style.setProperty('--t', ((NOW - AX0) / (AX1 - AX0)).toFixed(4));
      jItems.forEach(function (it) { it.fill.style.setProperty('--k', 1); it.k = 1; it.lit = true; });
      setYear(new Date().getFullYear());
    }
  }

  function hot(id, on) {
    jItems.forEach(function (it) {
      var h = on && it.d.id === id;
      if (it.bar) it.bar.classList.toggle('is-hot', h);
      if (it.li) it.li.classList.toggle('is-hot', h);
    });
  }
  gantt.addEventListener('pointerover', function (e) {
    var bar = e.target.closest && e.target.closest('.gantt__bar');
    if (!bar) return;
    var id = bar.getAttribute('data-id');
    var it = jItems.filter(function (x) { return x.d.id === id; })[0];
    hot(id, true);
    gTip.textContent = '';
    var dt = el('span', 't-date'); renderDate(dt, it.d, true);
    gTip.appendChild(dt);
    gTip.appendChild(el('strong', null, nameOf(it.d)));
    gTip.appendChild(el('span', 't-role', it.d.role[LANG] || it.d.role.tr));
    var gr = gantt.getBoundingClientRect(), br = bar.getBoundingClientRect();
    var x = clamp(br.left + br.width / 2 - gr.left, 110, gr.width - 110);
    gTip.style.left = x + 'px';
    gTip.style.top = (br.top - gr.top) + 'px';
    gTip.hidden = false;
  });
  gantt.addEventListener('pointerout', function (e) {
    var bar = e.target.closest && e.target.closest('.gantt__bar');
    if (!bar || (e.relatedTarget && bar.contains(e.relatedTarget))) return;
    hot(null, false); gTip.hidden = true;
  });
  jList.addEventListener('pointerover', function (e) {
    var li = e.target.closest && e.target.closest('.jl');
    if (li) hot(li.getAttribute('data-id'), true);
  });
  jList.addEventListener('pointerleave', function () { hot(null, false); });

  // Kaydırma ilerlemesini zamana çevirir. Yoğun 2021-2022'de daha yavaş ilerler.
  var TKEYS = [[0, 2018.6], [0.14, 2020.95], [0.62, 2022.9], [0.8, 2024.8], [1, NOW]];
  function mapTime(p) {
    p = c01(p);
    for (var i = 1; i < TKEYS.length; i++) {
      if (p <= TKEYS[i][0]) {
        var a = TKEYS[i - 1], b = TKEYS[i];
        return lerp(a[1], b[1], (p - a[0]) / (b[0] - a[0]));
      }
    }
    return NOW;
  }
  var lastYear = null, lastHead = null;
  function setYear(y) {
    if (y === lastYear) return;
    lastYear = y;
    jYears.forEach(function (n) { n.textContent = String(y); });
  }
  function updateJourney() {
    if (!marks.journey) return;
    var y = scrollY, vh = innerHeight;
    if (y + vh < marks.journey.top - vh * 0.2 || y > marks.journey.bottom + vh * 0.2) return;
    var i, it;
    if (!isMobile) {
      var p = journeyAct ? journeyAct.p : c01((y + vh * 0.6 - marks.journey.top) / (marks.journey.bottom - marks.journey.top));
      var t = reduce ? NOW : mapTime(p);
      var head = ((t - AX0) / (AX1 - AX0)).toFixed(4);
      if (head !== lastHead) { gantt.style.setProperty('--t', head); lastHead = head; }
      for (i = 0; i < jItems.length; i++) {
        it = jItems[i];
        var k = +c01((t - it.s) / (it.e - it.s)).toFixed(3);
        if (k !== it.k) { it.fill.style.setProperty('--k', k); it.k = k; }
        var lit = t >= it.s;
        if (lit !== it.lit) { it.li.classList.toggle('is-lit', lit); it.lit = lit; }
      }
      setYear(Math.min(Math.floor(t), new Date().getFullYear()));
    } else {
      // Mobil: dikey liste. Ekranın %62'sini geçen satır yanar, ray dolar.
      var line = vh * 0.62, tops = [], listTop = jList.getBoundingClientRect().top;
      for (i = 0; i < jItems.length; i++) tops.push(jItems[i].li.getBoundingClientRect().top);
      var last = -1;
      for (i = 0; i < jItems.length; i++) {
        it = jItems[i];
        var on = reduce || tops[i] < line;
        if (on) last = i;
        if (on !== it.lit) { it.li.classList.toggle('is-lit', on); it.lit = on; }
      }
      var fill = last < 0 ? 0 : Math.max(0, tops[last] - listTop + 6);
      jList.style.setProperty('--fill', fill.toFixed(0) + 'px');
      setYear(last < 0 ? Math.floor(jItems[0].s) : Math.floor(jItems[last].s));
    }
  }

  /* ------------------------------------------------- önce / sonra -- */
  var shiftPlot = $('.shift__plot'), shiftTip = $('.shift__tip'), shiftTable = $('.shift__table');
  var shiftDone = reduce;
  function pctIndex(v) { return (v / SHIFT_MAX * 100).toFixed(3) + '%'; }
  function deltaText(r) {
    var d = Math.round(r.after - r.before);
    return LANG === 'en' ? '+' + d + '%' : '+%' + d;
  }
  function buildShift() {
    shiftPlot.textContent = '';
    SHIFT.forEach(function (r, i) {
      var name = ui(r.k);
      shiftPlot.appendChild(el('span', 'shift__label', name));
      var tr = el('div', 'shift__track');
      tr.tabIndex = 0;
      tr.setAttribute('role', 'img');
      tr.setAttribute('aria-label', name + ': ' + ui('before') + ' ' + r.before + ', ' + ui('after') + ' ' + r.after + ', ' + ui('change') + ' ' + deltaText(r));
      tr.style.setProperty('--b', pctIndex(r.before));
      tr.style.setProperty('--a', pctIndex(shiftDone ? r.after : r.before));
      var ref = el('span', 'shift__ref');
      if (i === 0) ref.appendChild(el('span', null, ui('base')));
      tr.appendChild(ref);
      tr.appendChild(el('span', 'shift__line'));
      tr.appendChild(el('span', 'shift__dot shift__dot--before'));
      tr.appendChild(el('span', 'shift__dot shift__dot--after'));
      var val = el('span', 'shift__value');
      var b = el('b', null, String(shiftDone ? r.after : r.before));
      var dl = el('span', null, shiftDone ? deltaText(r) : '');
      val.appendChild(b); val.appendChild(dl);
      tr.appendChild(val);
      tr.__r = r; tr.__b = b; tr.__dl = dl;
      shiftPlot.appendChild(tr);
    });
    shiftPlot.appendChild(el('span', 'shift__axis-pad'));
    var ticks = el('div', 'shift__ticks');
    for (var v = 0; v <= SHIFT_MAX; v += 50) {
      var t = el('span', null, String(v)); t.style.left = pctIndex(v); ticks.appendChild(t);
    }
    shiftPlot.appendChild(ticks);

    // Ekran okuyucu için tablo karşılığı
    shiftTable.textContent = '';
    shiftTable.appendChild(el('caption', null, ui('tableCaption')));
    var thead = el('thead'), hr = el('tr');
    ['', ui('before'), ui('after'), ui('change')].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr); shiftTable.appendChild(thead);
    var tb = el('tbody');
    SHIFT.forEach(function (r) {
      var row = el('tr');
      row.appendChild(el('th', null, ui(r.k)));
      row.appendChild(el('td', null, String(r.before)));
      row.appendChild(el('td', null, String(r.after)));
      row.appendChild(el('td', null, deltaText(r)));
      tb.appendChild(row);
    });
    shiftTable.appendChild(tb);
  }
  function runShift() {
    if (shiftDone) return;
    shiftDone = true;
    var tracks = $$('.shift__track', shiftPlot), t0 = null;
    (function tick(now) {
      if (t0 === null) t0 = now;
      var done = true;
      tracks.forEach(function (tr, i) {
        var r = tr.__r, k = expoOut((now - t0 - i * 180) / 1600);
        if (k < 1) done = false;
        var v = lerp(r.before, r.after, k);
        tr.style.setProperty('--a', pctIndex(v));
        tr.__b.textContent = String(Math.round(v));
        tr.__dl.textContent = k >= 1 ? deltaText(r) : '';
      });
      if (!done) requestAnimationFrame(tick);
    })(performance.now());
  }
  function showShiftTip(tr) {
    var r = tr.__r;
    shiftTip.textContent = '';
    shiftTip.appendChild(el('div', 't-name', ui(r.k)));
    [[r.after, ui('after'), 'var(--chart-after)'], [r.before, ui('before'), 'var(--chart-before)']].forEach(function (x) {
      var row = el('div', 'row');
      var lk = el('span', 'lk'); lk.style.background = x[2];
      row.appendChild(lk); row.appendChild(el('b', null, String(x[0]))); row.appendChild(el('span', null, x[1]));
      shiftTip.appendChild(row);
    });
    var ch = el('div', 'row');
    ch.appendChild(el('b', null, deltaText(r))); ch.appendChild(el('span', null, ui('change')));
    shiftTip.appendChild(ch);
    var fr = shiftPlot.parentNode.getBoundingClientRect(), dot = $('.shift__dot--after', tr).getBoundingClientRect();
    shiftTip.style.left = clamp(dot.left + dot.width / 2 - fr.left, 100, fr.width - 100) + 'px';
    shiftTip.style.top = (dot.top - fr.top) + 'px';
    shiftTip.hidden = false;
    $$('.shift__track', shiftPlot).forEach(function (x) { x.classList.toggle('is-hot', x === tr); });
  }
  function hideShiftTip() {
    shiftTip.hidden = true;
    $$('.shift__track', shiftPlot).forEach(function (x) { x.classList.remove('is-hot'); });
  }
  shiftPlot.addEventListener('pointerover', function (e) {
    var tr = e.target.closest && e.target.closest('.shift__track');
    if (tr) showShiftTip(tr);
  });
  shiftPlot.addEventListener('pointerleave', hideShiftTip);
  shiftPlot.addEventListener('focusin', function (e) {
    if (e.target.classList.contains('shift__track')) showShiftTip(e.target);
  });
  shiftPlot.addEventListener('focusout', hideShiftTip);

  /* ------------------------------------------ oynanabilir kapanış cümlesi --
     Harfler fareden kaçar ve biçimleri bozulur; fare ayrılınca ya da tuş
     bırakılınca yaylanarak kusursuz dizgiye geri döner. */
  var playEl = $('.play');
  var letters = [];
  var play = { x: -9999, y: -9999, active: false, down: false, running: false, fs: 80 };
  function buildPlay() {
    var text = (playEl.textContent || '').replace(/\s+/g, ' ').trim();
    playEl.textContent = '';
    letters = [];
    playEl.appendChild(el('span', 'sr-only', text));
    var vis = el('span'); vis.setAttribute('aria-hidden', 'true');
    text.split(' ').forEach(function (word, wi, arr) {
      var w = el('span'); w.style.whiteSpace = 'nowrap'; w.style.display = 'inline-block';
      Array.from(word).forEach(function (ch, ci) {
        var s = el('span', 'play__l', ch);
        w.appendChild(s);
        var seed = Math.sin((wi + 1) * 12.9898 + (ci + 1) * 78.233) * 43758.5453;
        seed = seed - Math.floor(seed);
        letters.push({ el: s, seed: seed * 2 - 1, grow: seed > 0.5 ? 48 : -12, x: 0, y: 0, r: 0, w: 0, vx: 0, vy: 0, vr: 0, vw: 0, tx: 0, ty: 0, tr: 0, tw: 0, cx: 0, cy: 0 });
      });
      vis.appendChild(w);
      if (wi < arr.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    playEl.appendChild(vis);
    measurePlay();
  }
  function measurePlay() {
    play.fs = parseFloat(getComputedStyle(playEl).fontSize) || 80;
    var pr = playEl.getBoundingClientRect();
    letters.forEach(function (L) {
      var s = L.el.style.transform; L.el.style.transform = 'none';
      var r = L.el.getBoundingClientRect();
      L.cx = r.left - pr.left + r.width / 2; L.cy = r.top - pr.top + r.height / 2;
      L.el.style.transform = s;
    });
  }
  function playTick() {
    var R = play.fs * 2.1, str = play.down ? 1.9 : 1, moving = false;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      if (play.active) {
        var dx = L.cx - play.x, dy = L.cy - play.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = smooth(1 - d / R) * str;
        L.tx = dx / d * f * play.fs * 0.5; L.ty = dy / d * f * play.fs * 0.42;
        L.tr = f * L.seed * 24; L.tw = Math.min(f, 1.4);
      } else { L.tx = 0; L.ty = 0; L.tr = 0; L.tw = 0; }
      L.vx = (L.vx + (L.tx - L.x) * 0.14) * 0.76; L.x += L.vx;
      L.vy = (L.vy + (L.ty - L.y) * 0.14) * 0.76; L.y += L.vy;
      L.vr = (L.vr + (L.tr - L.r) * 0.14) * 0.76; L.r += L.vr;
      L.vw = (L.vw + (L.tw - L.w) * 0.12) * 0.78; L.w += L.vw;
      var still = Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.r) + Math.abs(L.w) < 0.02 &&
                  Math.abs(L.vx) + Math.abs(L.vy) + Math.abs(L.vr) + Math.abs(L.vw) < 0.02;
      if (still && !play.active) {
        if (L.on) { L.el.style.transform = ''; L.el.style.fontVariationSettings = ''; L.on = false; }
        continue;
      }
      moving = true; L.on = true;
      L.el.style.transform = 'translate3d(' + L.x.toFixed(2) + 'px,' + L.y.toFixed(2) + 'px,0) rotate(' + L.r.toFixed(2) + 'deg)';
      var wd = clamp(72 + L.w * L.grow, 62, 125), wg = clamp(800 - L.w * 380, 200, 900);
      L.el.style.fontVariationSettings = '"wdth" ' + wd.toFixed(1) + ', "wght" ' + wg.toFixed(0);
    }
    if (moving || play.active) requestAnimationFrame(playTick); else play.running = false;
  }
  function kickPlay() { if (!play.running) { play.running = true; requestAnimationFrame(playTick); } }
  if (!reduce) {
    var playArea = playEl.parentNode;
    playArea.addEventListener('pointermove', function (e) {
      var r = playEl.getBoundingClientRect();
      play.x = e.clientX - r.left; play.y = e.clientY - r.top; play.active = true; kickPlay();
    });
    playArea.addEventListener('pointerleave', function () { play.active = false; play.down = false; playEl.classList.remove('is-grab'); kickPlay(); });
    playEl.addEventListener('pointerdown', function () { play.down = true; playEl.classList.add('is-grab'); kickPlay(); });
    addEventListener('pointerup', function () {
      if (!play.down) return;
      play.down = false; playEl.classList.remove('is-grab');
      // Dokunmatikte bırakınca cümle hemen yeniden dizilsin
      play.active = false; kickPlay();
    });
    addEventListener('pointercancel', function () { play.down = false; play.active = false; kickPlay(); });
  }

  /* ----------------------------------------------------------- iletişim -- */
  var contactList = $('[data-contact]');
  function buildContact() {
    contactList.textContent = '';
    function add(href, label, opts) {
      var li = el('li'), a = el('a', null, label);
      a.href = href;
      if (opts && opts.external) { a.target = '_blank'; a.rel = 'noopener'; }
      if (opts && opts.download) a.setAttribute('download', 'Kivanc-Karademir-CV.pdf');
      li.appendChild(a); contactList.appendChild(li);
    }
    if (/^https:\/\//.test(CONTACT.linkedin)) add(CONTACT.linkedin, ui('linkedin'), { external: true });
    if (CONTACT.emailUser && CONTACT.emailDomain) add('mailto:' + CONTACT.emailUser + '@' + CONTACT.emailDomain, ui('email'));
    if (CV_URL) add(CV_URL, ui('cv'), { download: true });
    contactList.hidden = !contactList.children.length;
  }

  /* ------------------------------------------------------------ sayaçlar -- */
  var counters = $$('[data-count]');
  function formatCount(c, v) {
    var n = new Intl.NumberFormat(locale()).format(Math.round(v));
    if (c.hasAttribute('data-pct')) return LANG === 'en' ? n + '%' : '%' + n;
    return n + (c.getAttribute('data-suffix') || '');
  }
  counters.forEach(function (c) {
    var unit = $('.unit', c);
    c.textContent = '';
    c.__t = document.createTextNode('');
    c.appendChild(c.__t);
    if (unit) c.appendChild(unit);
    c.__unit = unit;
    c.__target = +c.getAttribute('data-count');
    c.__v = reduce ? c.__target : 0;
  });
  function refreshCounters() {
    counters.forEach(function (c) {
      c.__t.textContent = formatCount(c, c.__v);
      c.setAttribute('aria-label', formatCount(c, c.__target) + (c.__unit ? ' ' + c.__unit.textContent : ''));
    });
  }

  /* ------------------------------------------------- ilk kurulum (dil) -- */
  applyTexts();
  buildQuestion();
  buildPlay();
  buildJourney();
  buildShift();
  buildContact();
  refreshCounters();

  /* --------------------------------------------------- modu hazırla ----- */
  var film = $('#film');
  var video = $('.film__video');
  var ledger = $('.ledger');
  var rail = $('.ledger__rail');
  var JOURNEY_PIN = !reduce && !isMobile && innerHeight >= 720 && (innerWidth > 1200 || innerHeight >= 860);

  if (reduce) {
    film.removeAttribute('data-sc-act');
  } else {
    film.setAttribute('data-sc-span', isMobile ? '5' : '6.4');
    if (!isMobile) {
      ledger.setAttribute('data-sc-act', 'pan');
      $('.ledger__stage').setAttribute('data-sc-stage', '');
      rail.setAttribute('data-sc-pan', '0');
      ledger.setAttribute('data-sc-span', String(ledgerSpan()));
    }
    if (JOURNEY_PIN) {
      journey.setAttribute('data-sc-act', 'pin');
      journey.setAttribute('data-sc-span', '3.2');
      $('.journey__stage').setAttribute('data-sc-stage', '');
    }
  }
  function ledgerSpan() {
    var over = Math.max(rail.scrollWidth - innerWidth, 0);
    return +(1 + (over / innerHeight) * 1.1).toFixed(3);
  }

  // Sahne satırlarını hazırla
  var scenes = $$('.scene').map(function (e) {
    return { el: e, id: e.getAttribute('data-scene'), lines: [], live: null, words: null };
  });
  function prepareScenes() {
    scenes.forEach(function (s) {
      $$('[data-lines]', s.el).forEach(function (t) { splitLines(t); });
      s.lines = $$('.ln__i', s.el);
      if (s.id === 'soru') s.words = $$('.question .w', s.el);
    });
    measureWords();
  }
  // İmza cümlesindeki her kelimeye son (düzgün) halindeki genişliği sabitlenir:
  // dağınık hali satırları kaydırmaz, sadece kendi kutusunda nefes alır.
  function measureWords() {
    var s = scenes.filter(function (x) { return x.id === 'soru'; })[0];
    if (!s || !s.words) return;
    s.words.forEach(function (w) {
      w.style.width = ''; w.style.display = 'inline-block'; w.style.justifyContent = '';
      w.style.fontVariationSettings = '"wdth" ' + ORDER.wdth + ', "wght" ' + ORDER.wght;
      w.__fv = null;
    });
    s.words.forEach(function (w) { w.__w = w.getBoundingClientRect().width; });
    s.words.forEach(function (w) {
      w.style.width = w.__w.toFixed(2) + 'px';
      w.style.display = 'inline-flex';
      w.style.justifyContent = 'flex-start';
    });
  }

  // Akıştaki açılımlar
  var reveals = $$('[data-reveal]');
  function prepareReveals() {
    reveals.forEach(function (e) {
      if (e.getAttribute('data-reveal') === 'lines') splitLines(e);
    });
    var groups = new Map();
    reveals.forEach(function (e) {
      var t = e.getAttribute('data-reveal');
      if (t !== 'fade' && t !== 'card') return;
      var k = e.parentElement, n = groups.get(k) || 0;
      e.style.setProperty('--i', n); groups.set(k, n + 1);
    });
  }

  prepareScenes();
  prepareReveals();

  /* ------------------------------------------------------ motoru bağla -- */
  var sc = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;
  function actOf(node) { return sc && sc.acts.filter(function (a) { return a.el === node; })[0]; }
  var heroAct = actOf(film);
  var ledgerAct = actOf(ledger);
  var journeyAct = actOf(journey);
  var clip = heroAct && heroAct.video;

  /* -------------------------------------------------- ufuk çizgisi -----
     Film "cover" ile yerleştiği için ufuk çizgisinin ekrandaki yeri pencere
     oranına göre değişir. Açılış çizgisi ve ufuk sahneleri buna hizalanır.  */
  var stage = $('.film__stage');
  function computeHorizon() {
    var f = isMobile ? FILM.mobile : FILM.desktop;
    var w = innerWidth;
    var h = (stage && stage.getBoundingClientRect().height) || innerHeight;
    var s = Math.max(w / f.w, h / f.h);
    var y = (h - f.h * s) / 2 + f.horizon * f.h * s;
    root.style.setProperty('--horizon', y.toFixed(1) + 'px');
  }
  computeHorizon();

  /* --------------------------------------------------- açılış perdesi -- */
  var loader = $('.loader');
  var loaderPct = $('.loader__pct');
  var boot = { start: 0, done: false };
  var loadState = { value: 0, finished: false, failed: false };

  function setLoad(v) {
    loadState.value = Math.max(loadState.value, c01(v));
    loader.style.setProperty('--load', loadState.value.toFixed(4));
    loaderPct.textContent = String(Math.round(loadState.value * 100));
  }
  function finishLoader() {
    if (loadState.finished) return;
    loadState.finished = true;
    setLoad(1);
    root.style.overflow = '';
    setTimeout(function () {
      loader.classList.add('is-done');
      boot.start = performance.now();
      if (location.hash) jumpToHash(location.hash, true);
    }, 280);
  }

  if (!reduce) {
    root.style.overflow = 'hidden';
    scrollTo(0, 0);
    var src = isMobile ? video.getAttribute('data-src-mobile') : video.getAttribute('data-src-desktop');
    fetch(src).then(function (res) {
      if (!res.ok) throw new Error('video ' + res.status);
      var total = +res.headers.get('Content-Length') || 0;
      if (!res.body || !total || !res.body.getReader) return res.blob();
      var reader = res.body.getReader(), chunks = [], got = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return new Blob(chunks, { type: 'video/mp4' });
          chunks.push(r.value); got += r.value.length;
          setLoad(0.96 * got / total);
          return pump();
        });
      })();
    }).then(function (blob) {
      // Motor videoyu bu yerel adresten alır: ikinci bir indirme olmaz
      video.setAttribute('data-sc-src', URL.createObjectURL(blob));
      if (sc) sc.read();
    }).catch(function () {
      loadState.failed = true;
      finishLoader();
    });
    // Ağ çok yavaşsa ziyaretçiyi bekletme: afiş karesiyle devam et
    setTimeout(finishLoader, 9000);
  } else {
    boot.start = performance.now() - 5000;
    loadState.finished = true;
  }

  /* -------------------------------------------------- yumuşak kaydırma --
     Tekerlek hedefi yazar, her karede mevcut konum hedefe yaklaşır. Klavye ve
     kaydırma çubuğu yerlidir; dokunmatikte hiç devreye girmez.              */
  var SS = { on: !reduce && !isMobile && fine, cur: 0, target: 0, running: false, tween: null };
  var menuOpen = false;
  function maxScroll() { return Math.max(root.scrollHeight - innerHeight, 0); }
  if (SS.on) {
    addEventListener('wheel', function (e) {
      if (e.ctrlKey || menuOpen || !loadState.finished) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1);
      if (!SS.running || SS.tween) { SS.cur = scrollY; SS.target = scrollY; }
      SS.tween = null;
      SS.target = clamp(SS.target + dy, 0, maxScroll());
      SS.running = true;
    }, { passive: false });
  }
  function scrollStep(now, dt) {
    if (SS.tween) {
      var t = c01((now - SS.tween.t0) / SS.tween.d);
      SS.cur = lerp(SS.tween.from, SS.tween.to, quartInOut(t));
      scrollTo(0, SS.cur);
      if (t >= 1) { SS.tween = null; SS.running = false; SS.target = SS.cur; }
      return;
    }
    if (SS.running) {
      var k = 1 - Math.pow(1 - 0.09, dt / 16.667);
      SS.cur += (SS.target - SS.cur) * k;
      if (Math.abs(SS.target - SS.cur) < 0.35) { SS.cur = SS.target; SS.running = false; }
      scrollTo(0, SS.cur);
    } else if (Math.abs(scrollY - SS.cur) > 0.5) {
      SS.cur = SS.target = scrollY;
    }
  }
  function scrollToY(y, instant) {
    y = clamp(y, 0, maxScroll());
    if (instant || reduce) { scrollTo(0, y); SS.cur = SS.target = y; return; }
    if (SS.on) {
      var dist = Math.abs(y - scrollY);
      SS.tween = { from: scrollY, to: y, t0: performance.now(), d: clamp(700 + dist * 0.11, 800, 2200) };
      SS.running = true;
    } else {
      scrollTo({ top: y, behavior: 'smooth' });
    }
  }
  function jumpToHash(hash, instant) {
    var target = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    var y = target === film ? 0 : target.getBoundingClientRect().top + scrollY;
    scrollToY(y, instant);
    var focusEl = target.querySelector('h2, h1') || target;
    if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
    setTimeout(function () { focusEl.focus({ preventScroll: true }); }, instant ? 0 : 900);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length < 2 || !document.getElementById(decodeURIComponent(hash.slice(1)))) return;
    e.preventDefault();
    closeMenu();
    jumpToHash(hash, false);
    history.replaceState(null, '', hash === '#film' ? location.pathname + location.search : hash);
  });

  /* ---------------------------------------------------------- menü ----- */
  var menu = $('#menu');
  var toggle = $('.nav__toggle');
  function openMenu() {
    menuOpen = true; menu.hidden = false; toggle.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden';
    var first = $('a', menu); if (first) first.focus();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
    toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  $('.menu__close').addEventListener('click', closeMenu);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------ film koreografisi -- */
  var veil = $('.film__veil');
  var scrim = $('.film__scrim');
  var heroCount = $('.js-hero-count');
  var lastCount = null;

  function sceneLines(s, p, bootK) {
    var w = SCENES[s.id];
    var visible = p >= w[0] && p <= w[3];
    if (s.id === 'intro' && bootK < 1) visible = true;
    if (visible !== s.live) {
      s.live = visible;
      s.el.classList.toggle('is-live', visible);
      s.el.style.opacity = visible ? '1' : '0';
    }
    if (!visible) return;
    var enter = w[0] < 0 ? 1 : span(w[0], w[1], p);
    if (s.id === 'intro') enter = Math.min(enter, bootK);
    var exit = span(w[2], w[3], p);
    var n = s.lines.length;
    var st = Math.min(0.16, 0.55 / Math.max(n, 1));
    for (var k = 0; k < n; k++) {
      var ek = expoOut((enter - k * st) / (1 - st * (n - 1)));
      var xk = cubicIn((exit - k * st * 0.7) / (1 - st * 0.7 * (n - 1)));
      var ty = (1 - ek) * 108 - xk * 108;
      var op = c01(ek * 1.5) * (1 - c01(xk * 1.25));
      var ln = s.lines[k];
      ln.style.transform = 'translate3d(0,' + ty.toFixed(2) + '%,0)';
      ln.style.opacity = op.toFixed(3);
    }
    // metin katmanı videonun üstünde hafifçe süzülür (en fazla 3vh)
    var life = span(Math.max(w[0], 0), Math.min(w[3], 1), p);
    if (!reduce && s.id !== 'safak') s.el.style.transform = 'translate3d(0,' + ((0.5 - c01(life)) * 3).toFixed(2) + 'vh,0)';
    if (s.id === 'safak' && !isMobile) {
      // kapanış cümlesi yerine otururken harf aralığı daralır
      s.el.style.letterSpacing = (lerp(0.04, -0.03, expoOut(enter))).toFixed(4) + 'em';
    }
  }

  function questionWords(s, p) {
    if (!s.words || !s.live) return;
    var appear = smooth(span(SCENES.soru[0], SCENES.soru[1], p));
    var exit = smooth(span(SCENES.soru[2], SCENES.soru[3], p));
    var chaos = smooth(span(0.15, 0.21, p)) * (1 - smooth(span(0.255, 0.34, p)));
    // kelime sayısı ne olursa olsun (TR 5, EN 6) son kelime aynı anda oturur
    var stg = 0.064 / Math.max(s.words.length - 1, 1);
    for (var i = 0; i < s.words.length; i++) {
      var d = DISORDER[i % DISORDER.length];
      var k = smoother(span(0.245 + i * stg, 0.305 + i * stg, p));
      var jitter = Math.sin(p * 118 + i * 1.9) * 0.05 * chaos;
      var wd = lerp(d.wdth, ORDER.wdth, k), wg = lerp(d.wght, ORDER.wght, k);
      var dx = d.dx * (1 - k), dy = d.dy * (1 - k) + jitter - 0.3 * exit + 0.25 * (1 - appear);
      var rot = d.rot * (1 - k);
      var op = lerp(d.op, 1, k) * appear * (1 - exit);
      var w = s.words[i];
      var fv = '"wdth" ' + wd.toFixed(1) + ', "wght" ' + wg.toFixed(0);
      if (w.__fv !== fv) { w.style.fontVariationSettings = fv; w.__fv = fv; }
      w.style.transform = 'translate3d(' + dx.toFixed(3) + 'em,' + dy.toFixed(3) + 'em,0) rotate(' + rot.toFixed(2) + 'deg)';
      w.style.opacity = op.toFixed(3);
    }
  }

  function updateFilm(p, bootK) {
    for (var i = 0; i < scenes.length; i++) {
      sceneLines(scenes[i], p, bootK);
      if (scenes[i].id === 'soru') questionWords(scenes[i], p);
    }
    // sayaç: eğrinin yükselişiyle aynı anda
    var c = Math.round(62 * cubicOut(span(0.79, 0.885, p)));
    if (c !== lastCount) { heroCount.textContent = String(c); lastCount = c; }
    // şafak: kare sayfanın zeminine teslim edilir
    var v = darkMQ.matches ? smooth(span(0.9, 0.97, p)) : smooth(span(0.955, 0.995, p));
    veil.style.opacity = v.toFixed(3);
    scrim.style.opacity = (1 - smooth(span(0.885, 0.94, p))).toFixed(3);
  }

  /* ---------------------------------------------- menü tonu ve konum -- */
  var nav = $('.nav');
  var navLinks = $$('.nav__links a');
  var sections = $$('main > section[id]');
  var marks = { filmEnd: 0, about: null, journey: null, secs: [] };
  var aboutEl = $('#hakkimda');
  var portrait = $('.portrait__frame');

  function measure() {
    var y = scrollY;
    var fr = film.getBoundingClientRect();
    marks.filmEnd = fr.top + y + fr.height;
    var ar = aboutEl.getBoundingClientRect();
    marks.about = { top: ar.top + y, height: ar.height };
    var jr = journey.getBoundingClientRect();
    marks.journey = { top: jr.top + y, bottom: jr.bottom + y };
    marks.secs = sections.map(function (s) {
      var r = s.getBoundingClientRect(); return { id: s.id, top: r.top + y, bottom: r.bottom + y };
    });
    if (letters.length) measurePlay();
  }

  var navState = { tone: null, solid: null, current: null };
  function updateNav(p) {
    var y = scrollY, vh = innerHeight;
    var inFilm = y < marks.filmEnd - 70;
    var tone = inFilm && p < 0.95 ? 'night' : 'day';
    if (tone !== navState.tone) { nav.setAttribute('data-tone', tone); navState.tone = tone; }
    var solid = y > marks.filmEnd - 70;
    if (solid !== navState.solid) { nav.classList.toggle('is-solid', solid); navState.solid = solid; }
    var cur = null;
    for (var i = 0; i < marks.secs.length; i++) {
      var m = marks.secs[i];
      if (m.id !== 'film' && y + vh * 0.35 >= m.top && y + vh * 0.35 < m.bottom) cur = m.id;
    }
    if (cur !== navState.current) {
      navState.current = cur;
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }

  /* ------------------------------------------------------ portre ------- */
  var portraitState = '';
  function updatePortrait() {
    if (!marks.about || reduce) return;
    var q = (scrollY + innerHeight - marks.about.top) / (marks.about.height);
    if (q < -0.05 || q > 1.05) return;
    var clipV = (1 - expoOut(span(0.04, 0.26, q))) * 100;
    var zoom = lerp(1.42, 1.2, cubicOut(span(0.04, 0.7, q)));
    var mono = 1 - smooth(span(0.28, 0.6, q));
    var key = clipV.toFixed(2) + zoom.toFixed(4) + mono.toFixed(3);
    if (key === portraitState) return;
    portraitState = key;
    portrait.style.setProperty('--clip', clipV.toFixed(2) + '%');
    portrait.style.setProperty('--zoom', zoom.toFixed(4));
    portrait.style.setProperty('--mono', mono.toFixed(3));
  }
  if (reduce) portrait.style.setProperty('--mono', '0');

  /* ----------------------------------------------------- açılımlar ----- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    reveals.forEach(function (e) { io.observe(e); });

    var sio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { runShift(); sio.disconnect(); }
    }, { threshold: 0.45 });
    sio.observe(shiftPlot);
  } else {
    reveals.forEach(function (e) { e.classList.add('is-in'); });
  }

  // Kapanıştaki çizgi kendini çizer
  var closeLine = $('.close__line');
  if (!reduce && 'IntersectionObserver' in window) {
    closeLine.style.setProperty('--draw', '0');
    closeLine.style.transition = 'transform 1800ms cubic-bezier(0.16, 1, 0.3, 1)';
    var lio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { closeLine.style.setProperty('--draw', '1'); lio.disconnect(); }
    }, { threshold: 1 });
    lio.observe(closeLine);
  }

  // Sayaçlar görünür olunca bir kez sayar
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var c = e.target, t0 = null;
        (function tick(now) {
          if (t0 === null) t0 = now;
          var k = expoOut((now - t0) / 1700);
          c.__v = c.__target * k;
          c.__t.textContent = formatCount(c, c.__v);
          if (k < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ------------------------------------------------------ dönen kartlar -- */
  $$('.flip').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  /* ------------------------------------------------------ dil düğmeleri -- */
  function setLang(lang) {
    if (lang === LANG) return;
    LANG = lang;
    try { localStorage.setItem('kk-lang', lang); } catch (e) {}
    applyTexts();
    buildQuestion();
    buildPlay();
    buildJourney();
    buildShift();
    buildContact();
    refreshCounters();
    relayout(true);
  }
  $$('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });

  /* ------------------------------------------------ ziyaretçi sayacı ----- */
  (function () {
    if (!ANALYTICS.goatcounter) return;
    try {
      if (/[?&]sayac=kapat\b/.test(location.search)) localStorage.setItem('kk-no-count', '1');
      if (/[?&]sayac=ac\b/.test(location.search)) localStorage.removeItem('kk-no-count');
      if (localStorage.getItem('kk-no-count')) return;
    } catch (e) {}
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + ANALYTICS.goatcounter + '.goatcounter.com/count');
    document.head.appendChild(s);
  })();

  /* ------------------------------------------------ yeniden düzen ------ */
  var lastW = innerWidth;
  var relayoutTimer = null;
  function relayout(full) {
    computeHorizon();
    if (full) {
      scenes.forEach(function (s) { s.live = null; });
      prepareScenes();
      reveals.forEach(function (e) { if (e.getAttribute('data-reveal') === 'lines') splitLines(e); });
    }
    if (ledgerAct) { ledgerAct.span = ledgerSpan(); }
    if (sc) sc.layout();
    measure();
  }
  addEventListener('resize', function () {
    var nowMobile = matchMedia(mobileQuery).matches;
    if (nowMobile !== isMobile && !reduce) { location.reload(); return; }
    if (isMobile && innerWidth === lastW) { computeHorizon(); return; } // yalnız adres çubuğu
    lastW = innerWidth;
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(function () { relayout(true); }, 160);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { relayout(true); });
  }
  addEventListener('load', function () { measure(); });
  measure();

  /* ------------------------------------------------------ ana döngü ---- */
  var lastT = performance.now();
  function frame(now) {
    var dt = Math.min(now - lastT, 64); lastT = now;
    scrollStep(now, dt);

    // Açılış: video ilk gerçek karesini boyadığında perde kalkar
    if (!loadState.finished && clip && clip.painted) finishLoader();
    var bootK = boot.start ? c01((now - boot.start) / 1500) : 0;
    if (!boot.done && bootK >= 1) boot.done = true;

    // Filmin ilerlemesi: videonun kendi oynatma kafası (video yoksa kaydırma)
    var p = 0;
    if (heroAct) p = clip && clip.ready && !loadState.failed ? clip.cur : heroAct.p;
    if (!reduce && scrollY < marks.filmEnd + innerHeight) updateFilm(c01(p), bootK);
    updateNav(p);
    updatePortrait();
    updateJourney();
    requestAnimationFrame(frame);
  }

  // Test kancası: ?qa ile açıldığında film durumu tek çağrıyla uygulanabilir
  if (/[?&]qa\b/.test(location.search)) {
    finishLoader();
    window.__kk = {
      apply: function (p) { updateFilm(c01(p), 1); updateNav(p); updatePortrait(); updateJourney(); },
      lang: setLang,
      shift: runShift,
      play: function (xf, yf, n) {
        var r = playEl.getBoundingClientRect();
        play.x = r.width * xf; play.y = r.height * yf; play.active = true;
        for (var i = 0; i < (n || 40); i++) playTick();
      }
    };
  }

  if (reduce) {
    // Hareket azaltılmış: sahneler statik, imza cümlesi düzgün halinde
    scenes.forEach(function (s) {
      s.el.classList.add('is-live'); s.el.style.opacity = '1';
      if (s.words) s.words.forEach(function (w) { w.style.fontVariationSettings = '"wdth" 75, "wght" 800'; });
    });
    heroCount.textContent = '62';
  }
  requestAnimationFrame(frame);
})();
