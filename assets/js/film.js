/* ============================================================================
   Canlı film
   ----------------------------------------------------------------------------
   Giriş filmi bir video değil: tools/film.swift'teki sahne, kamera ve çizim
   burada her karede tarayıcıda yeniden çizilir. Aynı tohum (20260910), aynı
   kamera anahtarları ve aynı izdüşüm: Swift'in ürettiği afiş kareleriyle
   birebir örtüşür. Birini değiştirirsen diğerini de güncelle.

   Üç girdi:
     T     hikâye (0..1, kaydırmadan): hangi sahne, kamera nerede
     time  gerçek zaman (sn): durunca da süren hareket (süzülme, dalga, ışık)
     kick  kaydırma hızı (-1..1): aşağı = kamera ileri atılır, tozlar yanından
           akar, akış hızlanır; yukarı = kamera geri çekilir, akış tersine döner
   ========================================================================== */
(function () {
  'use strict';

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(x) { var t = c01(x); return t * t * (3 - 2 * t); }
  function smoother(x) { var t = c01(x); return t * t * t * (t * (t * 6 - 15) + 10); }
  function ramp(a, b, x) { return smooth((x - a) / (b - a)); }
  function easeOut(x) { var t = c01(x); return 1 - Math.pow(1 - t, 3); }
  function frac(x) { return x - Math.floor(x); }

  // Swift'teki RNG ile aynı dizi (64 bit LCG). BigInt literal yok: eski tarayıcıda
  // dosya ayrıştırılabilsin, create() hata verirse sayfa afiş karesiyle devam eder.
  function RNG(seed) {
    var B = window.BigInt;
    var s = B(seed), M = B('6364136223846793005'), I = B('1442695040888963407');
    var MASK = (B(1) << B(64)) - B(1), SH = B(11), D = 9007199254740992;
    function next() { s = (s * M + I) & MASK; return Number(s >> SH) / D; }
    return {
      next: next,
      range: function (a, b) { return lerp(a, b, next()); },
      gauss: function () { return (next() + next() + next() + next() - 2) / 2; }
    };
  }

  // Palet (film.swift ile aynı)
  var NIGHT = [15, 21, 35], HAZE = [22, 37, 58], BONE = [230, 237, 241], POOL = [69, 154, 205];
  var POOL_LIGHT = [124, 203, 242], SKY = [234, 240, 242], SKY_WARM = [207, 230, 240];
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c01(a).toFixed(3) + ')'; }

  var DESKTOP = { name: 'desktop', W: 1920, H: 1080, horizon: 0.56, cx: 0.60, cy: 0.52, focal: 1080 * 0.92, lw: 1.0, traces: 48, camBack: 0 };
  var MOBILE = { name: 'mobile', W: 720, H: 1280, horizon: 0.40, cx: 0.50, cy: 0.40, focal: 720 * 0.98, lw: 0.78, traces: 40, camBack: 5.5 };
  var FLOOR = -1.2, COLS = 14, ROWS = 5;

  function d2(a, b) { var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; }
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function crV(a, b, c, d, t) { return [cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t)]; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  /* ------------------------------------------------ sahne verisi (Swift) -- */
  function buildScene(n) {
    var r = RNG(20260910), sc = { traces: [], nodes: [], dots: [], edges: [], colTop: [], adj: [], n: n };
    var i, k, c;
    for (i = 0; i < n; i++) {
      var u = i / (n - 1) - 0.5;
      var chaos = r.gauss() * 0.34;
      var f = [r.range(0.6, 1.6), r.range(1.8, 3.4), r.range(3.6, 6.2)];
      var ph = [r.range(0, 6.28), r.range(0, 6.28), r.range(0, 6.28)];
      var w = [r.range(0.55, 1.0), r.range(0.25, 0.55), r.range(0.08, 0.22)];
      var alpha = r.range(0.28, 0.72);
      sc.traces.push({ chaos: chaos, ordered: u * 0.011, f: f, ph: ph, w: w, alpha: alpha, pool: r.next() < 0.16 });
    }
    // 70 düğüm: bayiler
    for (i = 0; i < 70; i++) {
      var p = [clamp(r.gauss() * 9.5, -12, 12), r.range(-1.0, 6.0), r.range(4, 32)];
      sc.nodes.push({ cloud: p, bar: p, height: 1, col: 0, row: 0, delay: 0, size: r.range(0.8, 1.35) });
    }
    // x'e göre sütunlar, sütun içinde z'ye göre satırlar
    var byX = sc.nodes.map(function (_, j) { return j; }).sort(function (a, b) { return sc.nodes[a].cloud[0] - sc.nodes[b].cloud[0]; });
    for (c = 0; c < COLS; c++) {
      var group = byX.slice(c * ROWS, (c + 1) * ROWS).sort(function (a, b) { return sc.nodes[a].cloud[2] - sc.nodes[b].cloud[2]; });
      for (var row = 0; row < group.length; row++) {
        var nd = sc.nodes[group[row]];
        var trend = Math.pow(c / (COLS - 1), 1.25);
        var h = Math.max(0.35, 0.55 + 3.5 * trend + (r.next() - 0.5) * 0.8 - row * 0.14);
        nd.col = c; nd.row = row; nd.height = h;
        nd.bar = [-6.5 + c, FLOOR + h, 9 + row * 2.4];
        nd.delay = c * 0.0035 + r.range(0, 0.01);
      }
    }
    for (c = 0; c < COLS; c++) {
      var mx = -Infinity;
      for (i = 0; i < 70; i++) if (sc.nodes[i].col === c && sc.nodes[i].height > mx) mx = sc.nodes[i].height;
      sc.colTop.push(mx === -Infinity ? 1 : mx);
    }
    // her düğüm en yakın iki komşusuna bağlı
    for (i = 0; i < 70; i++) {
      var near = [];
      for (k = 0; k < 70; k++) if (k !== i) near.push(k);
      var ci = sc.nodes[i].cloud;
      near.sort(function (a, b) { return d2(sc.nodes[a].cloud, ci) - d2(sc.nodes[b].cloud, ci); });
      for (var q = 0; q < 2; q++) {
        var kk = near[q];
        if (!sc.edges.some(function (e) { return e[0] === kk && e[1] === i; })) sc.edges.push([i, kk]);
      }
    }
    for (i = 0; i < 70; i++) sc.adj.push([]);
    sc.edges.forEach(function (e) { sc.adj[e[0]].push(e[1]); sc.adj[e[1]].push(e[0]); });
    // 300 nokta: personel
    for (k = 0; k < 300; k++) {
      var dx = r.gauss(), dy = r.gauss(), dz = r.gauss();
      var len = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));
      var m = r.range(0.35, 1.15) / len;
      var delay = r.range(0, 0.045), lineX = r.next(), lineIdx = Math.floor(r.next() * n);
      sc.dots.push({ node: k % 70, off: [dx * m, dy * m, dz * m], floor: [-9.5 + (k % 20), FLOOR, 4 + Math.floor(k / 20) * 1.8],
                     delay: delay, lineX: lineX, lineIdx: lineIdx });
    }
    // eğri: 14 sütun tepesi + dikleşen 5 uzantı
    var pts = [];
    for (c = 0; c < COLS; c++) pts.push([-6.5 + c, FLOOR + sc.colTop[c] + 0.45, 8.6]);
    var last = pts[pts.length - 1];
    for (k = 1; k <= 5; k++) pts.push([last[0] + k * 0.8, last[1] + 0.75 * Math.pow(k, 1.55), last[2] - k * 0.25]);
    sc.curve = pts;
    return sc;
  }
  function curvePoint(sc, s) {
    var p = sc.curve, seg = (p.length - 1) * c01(s), i = Math.min(Math.floor(seg), p.length - 2);
    return crV(p[Math.max(i - 1, 0)], p[i], p[i + 1], p[Math.min(i + 2, p.length - 1)], seg - i);
  }
  function curveProgress(T) {
    var a = 13 / 18;
    if (T < 0.81) return a * easeOut((T - 0.74) / 0.07) * (T > 0.74 ? 1 : 0);
    return a + (1 - a) * smooth((T - 0.81) / 0.09);
  }

  /* ---------------------------------------------------------- kamera -- */
  var KEYS = [
    [0.30, [0, 1.2, -8], [0, 1.6, 16]],
    [0.40, [0, 1.3, -6], [0, 1.7, 16]],
    [0.47, [0.3, 1.6, -1.5], [0.2, 1.8, 18]],
    [0.555, [0.9, 2.0, 2.5], [0.4, 1.9, 20]],
    [0.66, [-0.3, 2.8, -1.8], [0.2, 0.8, 14]],
    [0.74, [-0.6, 3.0, -2.2], [0.4, 1.0, 13]],
    [0.84, [0.8, 4.4, -8.0], [2.0, 3.0, 12]],
    [0.92, [1.6, 5.2, -11], [2.6, 5.0, 11]],
    [1.00, [2.0, 5.6, -12], [3.0, 5.6, 11]]
  ];
  function camPath(T, fmt, sc) {
    var i = 0;
    while (i < KEYS.length - 2 && T > KEYS[i + 1][0]) i++;
    var k0 = KEYS[Math.max(i - 1, 0)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(i + 2, KEYS.length - 1)];
    var u = c01((T - k1[0]) / (k2[0] - k1[0]));
    var pos = crV(k0[1], k1[1], k2[1], k3[1], u), target = crV(k0[2], k1[2], k2[2], k3[2], u);
    pos[2] -= fmt.camBack; // Catmull-Rom afin: her anahtardan çıkarmakla aynı
    var follow = ramp(0.78, 0.9, T) * 0.22;
    if (follow > 0) target = mix(target, curvePoint(sc, curveProgress(T)), follow);
    return { pos: pos, target: target };
  }
  function makeCam(pos, target, focal) {
    var dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2];
    var yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    return { pos: pos, cy: Math.cos(-yaw), sy: Math.sin(-yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), focal: focal };
  }
  function project(p, cam, fmt, out) {
    var dx = p[0] - cam.pos[0], dy = p[1] - cam.pos[1], dz = p[2] - cam.pos[2];
    var x1 = dx * cam.cy + dz * cam.sy, z1 = -dx * cam.sy + dz * cam.cy;
    var y2 = dy * cam.cp - z1 * cam.sp, z2 = dy * cam.sp + z1 * cam.cp;
    if (z2 < 0.3) return null;
    out[0] = fmt.W * fmt.cx + cam.focal * x1 / z2;
    out[1] = fmt.H * fmt.cy - cam.focal * y2 / z2;
    out[2] = z2;
    return out;
  }

  function glowSprite(c) {
    var g = document.createElement('canvas');
    g.width = g.height = 128;
    var x = g.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(0.22, rgba(c, 0.28)); gr.addColorStop(1, rgba(c, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    return g;
  }

  /* ------------------------------------------------------------ çizici -- */
  function create(canvas, opts) {
    var fmt = opts && opts.mobile ? MOBILE : DESKTOP;
    var isM = fmt === MOBILE;
    var sc = buildScene(fmt.traces);
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    var W = fmt.W, H = fmt.H, hz = H * fmt.horizon, lw = fmt.lw, scale = isM ? 0.8 : 1.0;
    var view = { cw: 0, ch: 0, dpr: 1, s: 1, ox: 0, oy: 0 };
    var q = { level: 0, bloom: true, steps: 140, dprCap: 2, motes: isM ? 110 : 170 };
    var SP = { pool: glowSprite(POOL_LIGHT), bone: glowSprite(BONE) };
    var bloomA = document.createElement('canvas'), bloomB = document.createElement('canvas');
    var rnd = RNG(707).next;
    var st = {
      motes: [], packets: [], pulses: [], lastPulse: -10, lastKickPulse: -10,
      wave: 0, colOff: 0, gridOff: 0, comet: 0, lastTime: null, painted: false
    };
    var nodePos = [], nodeScr = [], tmp = [0, 0, 0], tmpB = [0, 0, 0];
    for (var i = 0; i < 70; i++) { nodePos.push([0, 0, 0]); nodeScr.push([0, 0, 0]); }
    var KX = (W * 0.62) / fmt.focal, KY = (H * 0.62) / fmt.focal;

    function newMote(m, z) {
      m = m || {};
      m.z = z; m.x = (rnd() * 2 - 1) * z * KX; m.y = (rnd() * 2 - 1) * z * KY;
      m.ph = rnd() * 6.283; m.s = 0.55 + rnd() * 0.95; m.pool = rnd() < 0.22;
      return m;
    }
    function seedMotes() {
      st.motes = [];
      for (var k = 0; k < q.motes; k++) st.motes.push(newMote(null, 1.2 + rnd() * 36));
    }
    function seedPackets() {
      st.packets = [];
      for (var k = 0; k < (isM ? 22 : 34); k++) {
        var e = sc.edges[Math.floor(rnd() * sc.edges.length)];
        st.packets.push({ a: e[0], b: e[1], u: rnd(), sp: 0.3 + rnd() * 0.35 });
      }
    }
    seedMotes();
    seedPackets();

    function resize(cw, ch) {
      var dpr = Math.min(window.devicePixelRatio || 1, q.dprCap);
      dpr = Math.max(0.75, Math.min(dpr, Math.sqrt((isM ? 1.9e6 : 3.2e6) / Math.max(cw * ch, 1))));
      view.cw = cw; view.ch = ch; view.dpr = dpr;
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      view.s = Math.max(cw / W, ch / H);
      view.ox = (cw - W * view.s) / 2;
      view.oy = (ch - H * view.s) / 2;
      bloomA.width = Math.max(1, Math.round(canvas.width / 4)); bloomA.height = Math.max(1, Math.round(canvas.height / 4));
      bloomB.width = Math.max(1, Math.round(canvas.width / 10)); bloomB.height = Math.max(1, Math.round(canvas.height / 10));
    }

    // Donanım yetişmiyorsa kademeli sadeleş: önce parıltı, sonra çözünürlük, sonra yoğunluk
    function degrade() {
      q.level++;
      if (q.level === 1) q.bloom = false;
      else if (q.level === 2) { q.dprCap = 1; resize(view.cw, view.ch); }
      else if (q.level === 3) { q.steps = 70; q.motes = Math.round(q.motes / 2); seedMotes(); }
      return q.level;
    }

    function glow(spr, x, y, r, a) {
      if (a <= 0.003 || r <= 0.05) return;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(spr, x - r, y - r, 2 * r, 2 * r);
    }
    function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

    /* T: hikâye, time: saniye, kick: kaydırma hızı (-1..1), dt: ms */
    function render(T, time, kick, dt) {
      T = c01(T);
      kick = clamp(kick || 0, -1.2, 1.2);
      var sdt = Math.min((dt || 16.7) / 1000, 0.05);
      var ak = Math.abs(kick);
      var pxs = view.dpr * view.s; // film pikselinden aygıt pikseline
      var k, p, a, r;

      // gövdeyi arka plana boya (yakınlaşma/uzaklaşmada kenar boş kalmasın)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(NIGHT, 1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // film koordinatları: cover yerleşimi + kaydırmayla hafif itme (ufuk merkezli)
      var zoom = 1 + 0.028 * kick;
      ctx.setTransform(pxs, 0, 0, pxs, view.dpr * view.ox, view.dpr * view.oy);
      ctx.translate(W * 0.5, hz); ctx.scale(zoom, zoom); ctx.translate(-W * 0.5, -hz);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // 1) zemin: ufukta hafif pus, pus nefes alır
      var haze = (0.55 + 0.45 * ramp(0.0, 0.3, T)) * (0.93 + 0.07 * Math.sin(time * 0.5));
      ctx.save();
      ctx.translate(W * 0.5, hz); ctx.scale(1, 0.42);
      var R = Math.max(W, H) * 0.75, hg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      hg.addColorStop(0, rgba(HAZE, 0.95 * haze)); hg.addColorStop(1, rgba(HAZE, 0));
      ctx.fillStyle = hg; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.restore();

      // kamera: yol + durunca da süren nefes + kaydırmayla ileri/geri atılma
      var sway = [Math.sin(time * 0.23) * 0.34 + Math.sin(time * 0.61 + 1.3) * 0.07, Math.sin(time * 0.19 + 0.7) * 0.17];
      var path = camPath(T, fmt, sc), pos = path.pos, tgt = path.target;
      pos[0] += sway[0]; pos[1] += sway[1]; tgt[0] += sway[0] * 0.35; tgt[1] += sway[1] * 0.3;
      var fx = tgt[0] - pos[0], fy = tgt[1] - pos[1], fz = tgt[2] - pos[2], fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
      var dolly = kick * (isM ? 3.2 : 2.4);
      pos = [pos[0] + fx / fl * dolly, pos[1] + fy / fl * dolly, pos[2] + fz / fl * dolly];
      var cam = makeCam(pos, tgt, fmt.focal);

      // 2) ışık tozu: her sahnede havada; kaydırınca yanımızdan akan çizgilere dönüşür
      var moteVis = 1 - ramp(0.86, 0.93, T);
      if (moteVis > 0.01) {
        var vz = 0.5 + kick * 26;
        var trail = ak > 0.04 ? 0.075 : 0;
        var swx = sway[0] * 0.9, swy = sway[1] * 0.9;
        ctx.lineCap = 'round';
        for (k = 0; k < st.motes.length; k++) {
          var m = st.motes[k];
          m.z -= vz * sdt;
          m.x += Math.sin(time * 0.3 + m.ph) * 0.05 * sdt;
          if (m.z < 0.7) newMote(m, 34 + rnd() * 4);
          else if (m.z > 38.5) newMote(m, 1.0 + rnd() * 3);
          var px = W * fmt.cx + fmt.focal * (m.x - swx) / m.z, py = H * fmt.cy - fmt.focal * (m.y - swy) / m.z;
          if (px < -60 || px > W + 60 || py < -60 || py > H + 60) {
            if (vz > 0 && m.z < 12) newMote(m, 34 + rnd() * 4);
            continue;
          }
          var depthA = c01(1.15 - m.z / 36) * c01((m.z - 0.7) / 1.4);
          a = 0.4 * depthA * (0.62 + 0.38 * Math.sin(time * 1.3 + m.ph)) * moteVis;
          r = clamp(m.s * 9 / m.z, 0.35, 2.6) * lw;
          var col = kick < -0.05 ? POOL_LIGHT : (m.pool ? POOL_LIGHT : BONE);
          if (trail > 0) {
            var zt = m.z + vz * trail;
            if (zt > 0.3) {
              var tx = W * fmt.cx + fmt.focal * (m.x - swx) / zt, ty = H * fmt.cy - fmt.focal * (m.y - swy) / zt;
              ctx.globalAlpha = 1;
              ctx.strokeStyle = rgba(col, a * (0.7 + 0.9 * c01(ak)));
              ctx.lineWidth = Math.max(0.6, r * 1.1);
              line(tx, ty, px, py);
              continue;
            }
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = rgba(col, a);
          ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
        }
      }

      // 3) ızlar (Işık + Soru)
      var traceAlpha = 1 - ramp(0.37, 0.45, T);
      var lineIn = ramp(0.022, 0.05, T);
      var fanIn = ramp(0.145, 0.225, T), order = ramp(0.25, 0.345, T);
      var chaos = ramp(0.15, 0.22, T) * (1 - ramp(0.255, 0.34, T));
      var tilt = order * 0.05 * H;
      st.wave += kick * sdt * 9; // dalga kaydırma yönünde akar
      if (traceAlpha > 0.002 && lineIn > 0.002) {
        var live = chaos + 0.035 + ak * 0.2; // durunca da hafif titreşim, kaydırınca sarsıntı
        var steps = q.steps;
        for (var ti = 0; ti < sc.traces.length; ti++) {
          var tr = sc.traces[ti];
          var off = lerp(lerp(0, tr.chaos, fanIn), tr.ordered, order) * H;
          ctx.beginPath();
          for (var s = 0; s <= steps; s++) {
            var u = s / steps, x = u * W, env = 0.3 + 0.7 * Math.sin(Math.PI * u), nz = 0;
            for (var kf = 0; kf < 3; kf++) nz += tr.w[kf] * Math.sin(6.28318 * tr.f[kf] * u + tr.ph[kf] + time * (0.7 + kf * 0.55) - st.wave * (1 + kf * 0.4));
            var y = hz + off + nz * live * 0.085 * H * env - tilt * (u - 0.5);
            if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          var spread = Math.max(fanIn, order);
          a = lineIn * traceAlpha * lerp(lerp(0.55, tr.alpha, spread), 0.09, order * 0.9);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(tr.pool ? POOL_LIGHT : BONE, a);
          ctx.lineWidth = lw * (tr.pool ? 1.3 : 1.05);
          ctx.stroke();
        }
        var core = order * traceAlpha;
        if (core > 0.002) {
          ctx.save();
          ctx.shadowColor = rgba(POOL_LIGHT, 0.8 * core); ctx.shadowBlur = 10 * lw * pxs;
          ctx.strokeStyle = rgba(BONE, 0.92 * core); ctx.lineWidth = 1.5 * lw;
          line(0, hz + tilt * 0.5, W, hz - tilt * 0.5);
          ctx.restore();
        }
      }
      // ufuk sinyalleri: filmdeki ilk sinyal + her birkaç saniyede bir yenisi;
      // kaydırınca kaydırma yönünde hızlı sinyaller (yukarıda sağdan sola)
      if (traceAlpha > 0.002) {
        if (time - st.lastPulse > 3.1) { st.pulses.push({ x: -0.08, dir: 1, sp: 0.4 }); st.lastPulse = time; }
        if (ak > 0.3 && time - st.lastKickPulse > 0.26) {
          st.pulses.push({ x: kick > 0 ? -0.08 : 1.08, dir: kick > 0 ? 1 : -1, sp: 0.95 + ak * 1.3 });
          st.lastKickPulse = time;
        }
        if (st.pulses.length > 14) st.pulses.splice(0, st.pulses.length - 14);
        var pv = traceAlpha * (1 - 0.85 * chaos) * (1 - 0.5 * fanIn * (1 - order));
        var film0 = (T - 0.05) / 0.095;
        var list = st.pulses.slice();
        if (film0 > -0.1 && film0 < 1.15) list.push({ x: lerp(-0.08, 1.08, film0), film: 1 });
        for (k = 0; k < list.length; k++) {
          var pl = list[k];
          if (!pl.film) pl.x += pl.dir * pl.sp * sdt;
          var pa = Math.sin(Math.PI * c01(pl.x)) * (pl.film ? (1 - fanIn) : pv);
          if (pa <= 0.004) continue;
          var ppx = pl.x * W, ppy = hz + tilt * (0.5 - pl.x);
          ctx.save();
          ctx.translate(ppx, ppy); ctx.scale(3.2, 1);
          glow(SP.pool, 0, 0, 0.05 * H, 0.85 * pa);
          ctx.restore();
          glow(SP.bone, ppx, ppy, 0.012 * H, 0.9 * pa);
        }
        st.pulses = st.pulses.filter(function (x) { return x.x > -0.12 && x.x < 1.12; });
        ctx.globalAlpha = 1;
      }

      // 4) parçacıklar (Ağ, Veri, Eğri)
      if (T > 0.355) {
        var toBars = T < 0.555 ? 0 : 1;
        var fadeCloud = ramp(0.8, 0.9, T);
        for (k = 0; k < 70; k++) {
          var nd = sc.nodes[k], e = smoother((T - 0.56 - nd.delay) / 0.11) * toBars;
          var ddx = Math.sin(time * 0.35 + nd.cloud[2]) * 0.16, ddy = Math.cos(time * 0.3 + nd.cloud[0]) * 0.13;
          nodePos[k][0] = lerp(nd.cloud[0] + ddx * (1 - e), nd.bar[0], e);
          nodePos[k][1] = lerp(nd.cloud[1] + ddy * (1 - e), nd.bar[1], e);
          nodePos[k][2] = lerp(nd.cloud[2], nd.bar[2], e);
          nodeScr[k].ok = !!project(nodePos[k], cam, fmt, nodeScr[k]);
        }
        var traceY = function (idx, u) { return hz + sc.traces[idx].ordered * H - 0.05 * H * (u - 0.5); };

        // ağ bağlantıları
        var netA = ramp(0.45, 0.52, T) * (1 - ramp(0.56, 0.61, T));
        if (netA > 0.002) {
          ctx.lineWidth = 0.8 * lw;
          ctx.globalAlpha = 1;
          for (k = 0; k < sc.edges.length; k++) {
            var ea = nodeScr[sc.edges[k][0]], eb = nodeScr[sc.edges[k][1]];
            if (!ea.ok || !eb.ok) continue;
            ctx.strokeStyle = rgba(BONE, 0.2 * netA * c01(1.25 - (ea[2] + eb[2]) * 0.5 / 34));
            line(ea[0], ea[1], eb[0], eb[1]);
          }
          // bağlantılarda akan ışık paketleri: kaydırma yönünde hızlanır, yukarıda geri akar
          var flow = 1 + 5.5 * kick;
          for (k = 0; k < st.packets.length; k++) {
            var pk = st.packets[k];
            pk.u += pk.sp * sdt * flow;
            var guard = 0;
            while ((pk.u > 1 || pk.u < 0) && guard++ < 4) {
              var nb, choices;
              if (pk.u > 1) {
                choices = sc.adj[pk.b].filter(function (x) { return x !== pk.a; });
                nb = choices.length ? choices[Math.floor(rnd() * choices.length)] : pk.a;
                pk.a = pk.b; pk.b = nb; pk.u -= 1;
              } else {
                choices = sc.adj[pk.a].filter(function (x) { return x !== pk.b; });
                nb = choices.length ? choices[Math.floor(rnd() * choices.length)] : pk.b;
                pk.b = pk.a; pk.a = nb; pk.u += 1;
              }
            }
            var qa = nodeScr[pk.a], qb = nodeScr[pk.b];
            if (!qa.ok || !qb.ok) continue;
            var fog = c01(1.3 - (qa[2] + qb[2]) * 0.5 / 34);
            var hx = lerp(qa[0], qb[0], pk.u), hy = lerp(qa[1], qb[1], pk.u);
            var tail = clamp(0.1 * flow, -0.35, 0.35);
            var bx = lerp(qa[0], qb[0], c01(pk.u - tail)), by = lerp(qa[1], qb[1], c01(pk.u - tail));
            ctx.globalAlpha = 1;
            ctx.strokeStyle = rgba(POOL_LIGHT, 0.55 * netA * fog);
            ctx.lineWidth = 1.4 * lw;
            line(bx, by, hx, hy);
            glow(SP.pool, hx, hy, 9 * lw, 0.75 * netA * fog);
            glow(SP.bone, hx, hy, 2.4 * lw, 0.95 * netA * fog);
          }
          ctx.globalAlpha = 1;
        }

        // personel noktaları ve bayilere bağlanan çizgiler
        var spokeA = ramp(0.44, 0.5, T) * (1 - ramp(0.555, 0.6, T));
        var appearDots = T < 0.4 ? ramp(0.355, 0.39, T) : 1;
        for (k = 0; k < sc.dots.length; k++) {
          var dd = sc.dots[k], nb3 = nodePos[dd.node];
          var ed = smoother((T - 0.57 - dd.delay) / 0.11);
          // noktalar bayilerinin çevresinde yavaşça döner (bulutta), zeminde durulur
          var orb = (1 - ed) * 0.12;
          tmpB[0] = lerp(nb3[0] + dd.off[0] + Math.sin(time * 0.5 + k) * orb, dd.floor[0], ed);
          tmpB[1] = lerp(nb3[1] + dd.off[1] + Math.cos(time * 0.43 + k * 1.7) * orb, dd.floor[1], ed);
          tmpB[2] = lerp(nb3[2] + dd.off[2], dd.floor[2], ed);
          if (!project(tmpB, cam, fmt, tmp)) continue;
          var sx = tmp[0], sy = tmp[1];
          var local = c01((T - 0.36 - dd.delay) / 0.085);
          if (local < 1) {
            var kl = smoother(local);
            sx = lerp(dd.lineX * W, sx, kl); sy = lerp(traceY(dd.lineIdx, dd.lineX), sy, kl);
          }
          var fogd = c01(1.3 - tmp[2] / 36) * c01((tmp[2] - 0.6) / 2.2);
          a = appearDots * fogd * lerp(0.5, 0.32, ed) * (1 - 0.45 * fadeCloud);
          var ns = nodeScr[dd.node];
          if (spokeA > 0.002 && ns.ok) {
            ctx.strokeStyle = rgba(BONE, 0.16 * spokeA * fogd);
            ctx.lineWidth = 0.6 * lw;
            line(ns[0], ns[1], lerp(ns[0], sx, spokeA), lerp(ns[1], sy, spokeA));
          }
          r = Math.min(4.5, Math.max(0.7, 1.35 * scale * 7.5 / Math.max(tmp[2], 1)) * (isM ? 1.1 : 1.4));
          ctx.fillStyle = rgba(BONE, a);
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832); ctx.fill();
        }

        // zemin ızgarası: üzerinde ışık dalgası gezer
        var gridA = ramp(0.64, 0.71, T) * (1 - 0.5 * fadeCloud) * (1 - ramp(0.9, 0.97, T));
        st.gridOff += sdt * (1.3 + 5 * kick);
        if (gridA > 0.002) {
          ctx.lineWidth = 0.7 * lw;
          for (k = 0; k < 20; k++) {
            var gx = -9.5 + k;
            tmpB[0] = gx; tmpB[1] = FLOOR; tmpB[2] = 4;
            if (!project(tmpB, cam, fmt, tmp)) continue;
            var ax = tmp[0], ay = tmp[1];
            tmpB[2] = 4 + 14 * 1.8;
            if (!project(tmpB, cam, fmt, tmp)) continue;
            ctx.strokeStyle = rgba(BONE, 0.07 * gridA);
            line(ax, ay, tmp[0], tmp[1]);
          }
          for (k = 0; k < 15; k++) {
            var gz = 4 + k * 1.8;
            tmpB[0] = -9.5; tmpB[1] = FLOOR; tmpB[2] = gz;
            if (!project(tmpB, cam, fmt, tmp)) continue;
            var lx = tmp[0], ly = tmp[1];
            tmpB[0] = 9.5;
            if (!project(tmpB, cam, fmt, tmp)) continue;
            var wv = Math.pow(Math.max(0, Math.sin(st.gridOff - k * 0.55)), 6);
            ctx.strokeStyle = rgba(wv > 0.02 ? POOL_LIGHT : BONE, (0.07 + 0.16 * wv) * gridA);
            line(lx, ly, tmp[0], tmp[1]);
          }
        }

        // ışık sütunları: içlerinden yukarı ışık akar (yukarı kaydırınca aşağı)
        var barFade = 1 - 0.55 * fadeCloud;
        st.colOff += sdt * 0.34 * (1 + 5 * kick);
        for (k = 0; k < 70; k++) {
          var nb2 = sc.nodes[k];
          var grow = smoother((T - 0.6 - nb2.col * 0.004) / 0.1);
          if (grow <= 0.001) continue;
          tmpB[0] = nb2.bar[0]; tmpB[1] = FLOOR; tmpB[2] = nb2.bar[2];
          if (!project(tmpB, cam, fmt, tmp)) continue;
          var bax = tmp[0], bay = tmp[1], baz = tmp[2];
          tmpB[1] = FLOOR + nb2.height * grow;
          if (!project(tmpB, cam, fmt, tmp)) continue;
          var fogb = c01(1.3 - baz / 36);
          var cg = ctx.createLinearGradient(bax, bay, tmp[0], tmp[1]);
          cg.addColorStop(0, rgba(BONE, 0.05 * barFade * fogb));
          cg.addColorStop(1, rgba(BONE, 0.62 * barFade * fogb * grow));
          ctx.strokeStyle = cg;
          ctx.lineWidth = Math.max(1.1, 2.8 * lw * 7.5 / Math.max(baz, 1));
          line(bax, bay, tmp[0], tmp[1]);
          var ph2 = frac(st.colOff + k * 0.137);
          var lpx = lerp(bax, tmp[0], ph2), lpy = lerp(bay, tmp[1], ph2);
          var la = barFade * fogb * grow * Math.sin(Math.PI * ph2) * (1 - fadeCloud * 0.6);
          glow(SP.pool, lpx, lpy, 7 * lw, 0.7 * la);
          glow(SP.bone, lpx, lpy, 1.8 * lw, 0.9 * la);
          ctx.globalAlpha = 1;
        }

        // bayiler: parlak noktalar, kendi ritimleriyle parıldar
        var appear = ramp(0.355, 0.4, T);
        for (k = 0; k < 70; k++) {
          var n0 = sc.nodes[k], s0 = nodeScr[k];
          if (!s0.ok) continue;
          var nx = s0[0], ny = s0[1];
          var loc = c01((T - 0.36 - (k % 9) * 0.004) / 0.09);
          if (loc < 1) {
            var idx = (k * 7) % sc.n, uu = ((k * 37) % 100) / 100, kn = smoother(loc);
            nx = lerp(uu * W, nx, kn); ny = lerp(traceY(idx, uu), ny, kn);
          }
          var fogn = c01(1.35 - s0[2] / 34) * c01((s0[2] - 0.6) / 2.2);
          a = appear * fogn * (1 - 0.5 * fadeCloud);
          var twk = 0.78 + 0.22 * Math.sin(time * 1.7 + k * 2.3);
          r = Math.min(12, n0.size * Math.max(1.4, 2.8 * scale * 8 / Math.max(s0[2], 1)) * (isM ? 0.9 : 1.25));
          glow(SP.pool, nx, ny, r * 6 * (0.92 + 0.16 * twk), 0.4 * a * twk * 1.15);
          ctx.globalAlpha = 1;
          ctx.fillStyle = rgba(BONE, 0.95 * a);
          ctx.beginPath(); ctx.arc(nx, ny, r, 0, 6.2832); ctx.fill();
        }
      }

      // 5) eğri: çizildikten sonra üzerinde bir ışık kuyruklu yıldız gibi dolaşır
      var head = null;
      var dawnC = ramp(0.9, 0.99, T);
      if (T > 0.735) {
        var prog = curveProgress(T), samples = 260, pts = [];
        var nn = Math.max(2, Math.floor(samples * prog));
        for (k = 0; k <= nn; k++) {
          var cp = curvePoint(sc, prog * k / nn);
          if (project(cp, cam, fmt, tmp)) pts.push(tmp[0], tmp[1]);
        }
        if (pts.length >= 4) {
          ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
          for (k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
          ctx.save();
          ctx.shadowColor = rgba(POOL_LIGHT, 0.75 * (1 - dawnC)); ctx.shadowBlur = 14 * lw * pxs;
          ctx.strokeStyle = rgba(POOL_LIGHT, 1 - dawnC * 0.6); ctx.lineWidth = 2.7 * lw;
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = rgba(BONE, 0.55 * (1 - dawnC)); ctx.lineWidth = 0.9 * lw;
          ctx.stroke();
          head = [pts[pts.length - 2], pts[pts.length - 1]];
          // kuyruklu ışık
          st.comet += sdt * 0.36 * (1 + 4 * kick);
          if (prog > 0.05 && dawnC < 0.99) {
            var cs = frac(st.comet) * prog, dir = kick < -0.1 ? -1 : 1;
            for (var tk = 7; tk >= 0; tk--) {
              var ss = c01(cs - dir * tk * 0.012);
              if (!project(curvePoint(sc, ss), cam, fmt, tmp)) continue;
              var fall = 1 - tk / 8;
              glow(SP.pool, tmp[0], tmp[1], 0.03 * H * fall, 0.55 * fall * (1 - dawnC));
              if (tk === 0) glow(SP.bone, tmp[0], tmp[1], 0.008 * H, 0.95 * (1 - dawnC));
            }
          }
          var br = 1 + 0.12 * Math.sin(time * 2.1);
          glow(SP.pool, head[0], head[1], 0.06 * H * br, 0.55);
          glow(SP.bone, head[0], head[1], 0.012 * H, 1);
          ctx.globalAlpha = 1;
        }
      }

      // parıltı (filmdeki bloom): küçültülmüş kopyadan zemin çıkarılır, üstüne eklenir
      var bloomK = q.bloom ? 0.62 * (1 - ramp(0.88, 0.97, T)) : 0;
      if (bloomK > 0.02) {
        var ba = bloomA.getContext('2d'), bb = bloomB.getContext('2d');
        ba.globalCompositeOperation = 'source-over';
        ba.drawImage(canvas, 0, 0, bloomA.width, bloomA.height);
        ba.globalCompositeOperation = 'difference';
        ba.fillStyle = rgba(NIGHT, 1); ba.fillRect(0, 0, bloomA.width, bloomA.height);
        ba.globalCompositeOperation = 'source-over';
        bb.globalCompositeOperation = 'copy';
        bb.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
        bb.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.32 * bloomK; ctx.drawImage(bloomA, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.5 * bloomK; ctx.drawImage(bloomB, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 6) şafak: eğrinin ucundan ışık açılır, kare sayfanın rengine döner
      var dawn = ramp(0.885, 0.975, T);
      if (dawn > 0.001) {
        var hx2 = clamp(head ? head[0] : W * 0.7, W * 0.15, W * 0.85);
        var hy2 = clamp(head ? head[1] : H * 0.3, H * 0.12, H * 0.7);
        var rad = lerp(0.08, 1.6, easeOut(dawn)) * Math.max(W, H) * (1 + 0.03 * Math.sin(time * 0.8));
        var gl = Math.min(1, dawn * 1.5);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var dg = ctx.createRadialGradient(hx2, hy2, 0, hx2, hy2, rad);
        dg.addColorStop(0, rgba(BONE, gl)); dg.addColorStop(0.3, rgba(POOL_LIGHT, 0.75 * gl));
        dg.addColorStop(0.62, rgba(POOL, 0.25 * gl)); dg.addColorStop(1, rgba(POOL, 0));
        ctx.fillStyle = dg; ctx.fillRect(-W, -H, 3 * W, 3 * H);
        ctx.restore();
        var sky = ramp(0.925, 0.985, T);
        if (sky > 0) {
          var r2 = lerp(0.2, 1.8, easeOut(sky)) * Math.max(W, H);
          var sg = ctx.createRadialGradient(hx2, hy2, 0, hx2, hy2, r2);
          sg.addColorStop(0, rgba(SKY, sky)); sg.addColorStop(0.6, rgba(SKY_WARM, sky * 0.85)); sg.addColorStop(1, rgba(SKY_WARM, 0));
          ctx.fillStyle = sg; ctx.fillRect(-W, -H, 3 * W, 3 * H);
        }
        var flat = ramp(0.96, 1.0, T);
        if (flat > 0) { ctx.fillStyle = rgba(SKY, flat); ctx.fillRect(-W, -H, 3 * W, 3 * H); }
        var lineA = ramp(0.955, 1.0, T);
        if (lineA > 0) { ctx.strokeStyle = rgba(NIGHT, 0.22 * lineA); ctx.lineWidth = 1.1 * lw; line(-W, hz, 2 * W, hz); }
      }
      ctx.globalAlpha = 1;
      st.painted = true;
    }

    return {
      render: render, resize: resize, degrade: degrade, fmt: fmt,
      get painted() { return st.painted; },
      get level() { return q.level; }
    };
  }

  window.KKFilm = { create: create };
})();
