/* ============================================================================
   Kıvanç Karademir: sayfa koreografisi
   ----------------------------------------------------------------------------
   scrollcraft.js mekanizmayı sağlar (pinleme, video yükleme ve oynatma kafası,
   yatay şerit). Bu dosya siteye özgü her şeyi yapar ve motoru hiç değiştirmez:

     1. Yumuşak tekerlek kaydırması (masaüstü)
     2. Açılış perdesi: gerçek indirme ilerlemesi, çizgi filmin ufkuna devredilir
     3. Film metinleri: videonun KENDİ oynatma kafasından okunur. Video ile
        tipografi tek bir zaman çizelgesidir, iki ayrı animasyon sistemi değil.
     4. İmza hareketi: "Bunu nasıl daha iyi yapabiliriz?" cümlesi dağınık
        tipografiyle girer ve filmdeki izler toparlandıkça kendini düzeltir.
     5. Bölüm açılımları, portre, sayaçlar, menü
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ AYARLAR -- */

  // İletişim bilgileri. Doldurulunca kapanış bölümünde bağlantılar görünür.
  // E-posta kaynakta düz yazılmasın diye iki parçadan birleştirilir.
  var CONTACT = {
    emailUser: 'alperen.kivanc',
    emailDomain: 'hotmail.com',
    linkedin: 'https://www.linkedin.com/in/alperenk%C4%B1van%C3%A7karademir/'
  };

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
  var trNum = new Intl.NumberFormat('tr-TR');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* -------------------------------------------------- satırlara bölme --
     Metni kelimelere ayırır, satır kırılımlarını ölçer ve her satırı kendi
     maskesine sarar. <strong> ve .num gibi satır içi öğeler korunur.        */
  function splitLines(el) {
    if (el.__html === undefined) el.__html = el.innerHTML;
    el.innerHTML = el.__html;
    var words = [];
    (function walk(node, wrappers) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { words.push(null); return; }
            var inner = document.createTextNode(part);
            var outer = inner;
            for (var i = wrappers.length - 1; i >= 0; i--) {
              var w = wrappers[i].cloneNode(false); w.appendChild(outer); outer = w;
            }
            var probe = document.createElement('span');
            probe.className = 'w-probe';
            probe.appendChild(outer);
            words.push(probe);
          });
        } else if (child.nodeType === 1) {
          walk(child, wrappers.concat(child));
        }
      });
    })(el, []);
    el.innerHTML = '';
    words.forEach(function (w) { el.appendChild(w || document.createTextNode(' ')); });
    var lines = [], cur = null, lastTop = null;
    words.forEach(function (w) {
      if (!w) { if (cur) cur.push(null); return; }
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 3) { cur = []; lines.push(cur); lastTop = top; }
      cur.push(w);
    });
    el.innerHTML = '';
    lines.forEach(function (line, li) {
      while (line.length && line[line.length - 1] === null) line.pop();
      var ln = document.createElement('span'); ln.className = 'ln';
      var inner = document.createElement('span'); inner.className = 'ln__i';
      inner.style.setProperty('--i', li);
      line.forEach(function (w) {
        if (!w) { inner.appendChild(document.createTextNode(' ')); return; }
        while (w.firstChild) inner.appendChild(w.firstChild);
      });
      ln.appendChild(inner);
      el.appendChild(ln);
      if (li < lines.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return $$('.ln__i', el);
  }

  /* --------------------------------------------------- modu hazırla ----- */
  var film = $('#film');
  var video = $('.film__video');
  var ledger = $('.ledger');
  var rail = $('.ledger__rail');

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
  }
  function ledgerSpan() {
    var over = Math.max(rail.scrollWidth - innerWidth, 0);
    return +(1 + (over / innerHeight) * 1.1).toFixed(3);
  }

  // Sahne satırlarını hazırla
  var scenes = $$('.scene').map(function (el) {
    return { el: el, id: el.getAttribute('data-scene'), lines: [], live: null, words: null };
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
    reveals.forEach(function (el) {
      if (el.getAttribute('data-reveal') === 'lines') splitLines(el);
    });
    // aynı ebeveyn içindeki kardeşleri sırayla geciktir
    var groups = new Map();
    reveals.forEach(function (el) {
      var t = el.getAttribute('data-reveal');
      if (t !== 'fade' && t !== 'card') return;
      var k = el.parentElement; var n = groups.get(k) || 0;
      el.style.setProperty('--i', n); groups.set(k, n + 1);
    });
  }

  prepareScenes();
  prepareReveals();

  /* ------------------------------------------------------ motoru bağla -- */
  var sc = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;
  var heroAct = sc && sc.acts.filter(function (a) { return a.el === film; })[0];
  var ledgerAct = sc && sc.acts.filter(function (a) { return a.el === ledger; })[0];
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
  var loaderFill = $('.loader__fill');
  var loaderPct = $('.loader__pct');
  var boot = { start: 0, done: false, shown: 0 };
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
    root.classList.remove('is-locked');
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
    var el = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    var y = el === film ? 0 : el.getBoundingClientRect().top + scrollY;
    scrollToY(y, instant);
    var focusEl = el.querySelector('h2, h1') || el;
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
    history.replaceState(null, '', hash === '#film' ? location.pathname : hash);
  });

  /* ---------------------------------------------------------- menü ----- */
  var menu = $('#menu');
  var toggle = $('.nav__toggle');
  var menuOpen = false;
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
      var el = s.lines[k];
      el.style.transform = 'translate3d(0,' + ty.toFixed(2) + '%,0)';
      el.style.opacity = op.toFixed(3);
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
    for (var i = 0; i < s.words.length; i++) {
      var d = DISORDER[i % DISORDER.length];
      var k = smoother(span(0.245 + i * 0.016, 0.305 + i * 0.016, p));
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
  var marks = { filmEnd: 0, about: null, secs: [] };
  var aboutEl = $('#hakkimda');
  var portrait = $('.portrait__frame');

  function measure() {
    var y = scrollY;
    var fr = film.getBoundingClientRect();
    marks.filmEnd = fr.top + y + fr.height;
    var ar = aboutEl.getBoundingClientRect();
    marks.about = { top: ar.top + y, height: ar.height };
    marks.secs = sections.map(function (s) {
      var r = s.getBoundingClientRect(); return { id: s.id, top: r.top + y, bottom: r.bottom + y };
    });
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
    var clip = (1 - expoOut(span(0.04, 0.26, q))) * 100;
    var zoom = lerp(1.42, 1.2, cubicOut(span(0.04, 0.7, q)));
    var mono = 1 - smooth(span(0.28, 0.6, q));
    var key = clip.toFixed(2) + zoom.toFixed(4) + mono.toFixed(3);
    if (key === portraitState) return;
    portraitState = key;
    portrait.style.setProperty('--clip', clip.toFixed(2) + '%');
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
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
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

  /* ------------------------------------------------------- sayaçlar ---- */
  function formatCount(el, v) {
    var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
    return pre + trNum.format(Math.round(v)) + suf;
  }
  $$('[data-count]').forEach(function (el) {
    var unit = $('.unit', el);
    el.textContent = '';
    var t = document.createTextNode('');
    el.appendChild(t);
    if (unit) el.appendChild(unit);
    el.__t = t;
    var target = +el.getAttribute('data-count');
    t.textContent = formatCount(el, reduce ? target : 0);
    el.setAttribute('aria-label', formatCount(el, target) + (unit ? ' ' + unit.textContent : ''));
  });
  if (!reduce && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, target = +el.getAttribute('data-count'), t0 = null, last = '';
        (function tick(now) {
          if (t0 === null) t0 = now;
          var k = expoOut((now - t0) / 1700);
          var s = formatCount(el, target * k);
          if (s !== last) { el.__t.textContent = s; last = s; }
          if (k < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* ------------------------------------------------------ iletişim ----- */
  (function () {
    var list = $('[data-contact]');
    function add(href, label, external) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = href; a.textContent = label;
      if (external) { a.target = '_blank'; a.rel = 'noopener'; }
      li.appendChild(a); list.appendChild(li); list.hidden = false;
    }
    if (/^https:\/\//.test(CONTACT.linkedin)) add(CONTACT.linkedin, 'LinkedIn', true);
    if (CONTACT.emailUser && CONTACT.emailDomain) add('mailto:' + CONTACT.emailUser + '@' + CONTACT.emailDomain, 'E-posta gönder');
  })();

  /* ------------------------------------------------ yeniden düzen ------ */
  var lastW = innerWidth;
  var relayoutTimer = null;
  function relayout(full) {
    computeHorizon();
    if (full) {
      scenes.forEach(function (s) { s.live = null; });
      prepareScenes();
      reveals.forEach(function (el) { if (el.getAttribute('data-reveal') === 'lines') splitLines(el); });
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
    requestAnimationFrame(frame);
  }
  // Test kancası: ?qa ile açıldığında film durumu tek çağrıyla uygulanabilir
  if (/[?&]qa\b/.test(location.search)) {
    finishLoader();
    window.__kk = { apply: function (p) { updateFilm(c01(p), 1); updateNav(p); updatePortrait(); } };
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
