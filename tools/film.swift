// Hero filmi üreticisi.
//
// Kıvanç Karademir sitesinin scroll ile oynatılan hero videosunu kareleri tek tek
// çizerek üretir. Sahneler sitedeki metinlerle aynı zaman çizelgesini paylaşır;
// zamanlamayı değiştirirsen assets/js/main.js içindeki SCENES dizisini de güncelle.
//
//   swiftc -O tools/film.swift -o tools/.film
//   tools/.film desktop public/video/hero.mp4
//   tools/.film mobile  public/video/hero-mobile.mp4
//   tools/.film frames  <klasör>            (inceleme kareleri, JPG)
//
// Sahne akışı (T = 0..1, 12 sn):
//   0.00-0.14  Işık   gece; 0.05'ten itibaren ufukta tek bir ışık çizgisi ve sinyal
//              (0-0.05 arası çizgiyi sayfa çizer: fareyle titreşen ışık teli)
//   0.14-0.36  Soru   çizgi onlarca ize bölünür, gürültüye dağılır, sonra düzene oturur
//   0.36-0.56  Ağ     izler noktalara ayrışır: 70 parlak düğüm, 300 soluk nokta
//   0.56-0.74  Veri   düğümler 14x5 ışık sütununa, noktalar zemin ızgarasına dizilir
//   0.74-0.90  Eğri   sütun tepelerinden geçen eğri çizilir ve dikleşerek yükselir
//   0.90-1.00  Şafak  eğrinin ucundan ışık yayılır, kare sayfanın rengine açılır
//
import AVFoundation
import AppKit
import CoreGraphics
import CoreImage
import Foundation

// MARK: - Yardımcılar

@inline(__always) func clamp(_ x: Double, _ a: Double = 0, _ b: Double = 1) -> Double { min(max(x, a), b) }
@inline(__always) func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double { a + (b - a) * t }
@inline(__always) func smooth(_ x: Double) -> Double { let t = clamp(x); return t * t * (3 - 2 * t) }
@inline(__always) func smoother(_ x: Double) -> Double { let t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10) }
@inline(__always) func ramp(_ a: Double, _ b: Double, _ x: Double) -> Double { smooth((x - a) / (b - a)) }
@inline(__always) func easeOut(_ x: Double) -> Double { let t = clamp(x); return 1 - pow(1 - t, 3) }

struct RNG {
  var s: UInt64
  mutating func next() -> Double {
    s = s &* 6364136223846793005 &+ 1442695040888963407
    return Double(s >> 11) / Double(UInt64(1) << 53)
  }
  mutating func range(_ a: Double, _ b: Double) -> Double { lerp(a, b, next()) }
  mutating func gauss() -> Double { (next() + next() + next() + next() - 2) / 2 }
}

struct V3 { var x: Double, y: Double, z: Double }
func +(a: V3, b: V3) -> V3 { V3(x: a.x + b.x, y: a.y + b.y, z: a.z + b.z) }
func -(a: V3, b: V3) -> V3 { V3(x: a.x - b.x, y: a.y - b.y, z: a.z - b.z) }
func *(a: V3, s: Double) -> V3 { V3(x: a.x * s, y: a.y * s, z: a.z * s) }
func mix(_ a: V3, _ b: V3, _ t: Double) -> V3 { a + (b - a) * t }

struct RGB { var r: Double, g: Double, b: Double }
func hex(_ h: UInt32) -> RGB { RGB(r: Double((h >> 16) & 255) / 255, g: Double((h >> 8) & 255) / 255, b: Double(h & 255) / 255) }
func mixc(_ a: RGB, _ b: RGB, _ t: Double) -> RGB { RGB(r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t)) }
func cg(_ c: RGB, _ a: Double = 1) -> CGColor { CGColor(srgbRed: c.r, green: c.g, blue: c.b, alpha: a) }

// Palet: portreden ölçülen renkler (docs/BRIEF.md)
let NIGHT = hex(0x0F1523)      // takım elbise laciverti
let NIGHT_HAZE = hex(0x16253A)
let BONE = hex(0xE6EDF1)       // gömlek beyazı
let POOL = hex(0x459ACD)       // havuz mavisi
let POOL_LIGHT = hex(0x7CCBF2)
let SKY = hex(0xEAF0F2)        // sayfa zemini (şafak)
let SKY_WARM = hex(0xCFE6F0)

// Catmull-Rom (tek boyut)
func cr(_ p0: Double, _ p1: Double, _ p2: Double, _ p3: Double, _ t: Double) -> Double {
  let t2 = t * t, t3 = t2 * t
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}
func crV(_ p0: V3, _ p1: V3, _ p2: V3, _ p3: V3, _ t: Double) -> V3 {
  V3(x: cr(p0.x, p1.x, p2.x, p3.x, t), y: cr(p0.y, p1.y, p2.y, p3.y, t), z: cr(p0.z, p1.z, p2.z, p3.z, t))
}

// MARK: - Format

struct Format {
  let name: String, W: Int, H: Int, bitrate: Int, gop: Int
  let horizon: Double       // ufuk çizgisinin dikey konumu (0..1)
  let cx: Double, cy: Double // izdüşüm merkezi (0..1)
  let focal: Double         // piksel cinsinden odak uzaklığı
  let lw: Double            // çizgi kalınlığı çarpanı
  let traces: Int
  let camBack: Double       // dikey formatta kamerayı geri çek
  let bloom: Double
}

let fps = 30
let seconds = 12.0
let frameCount = Int(seconds * Double(fps))

let DESKTOP = Format(name: "desktop", W: 1920, H: 1080, bitrate: 5_200_000, gop: 8,
                     horizon: 0.56, cx: 0.60, cy: 0.52, focal: 1080 * 0.92, lw: 1.0, traces: 48,
                     camBack: 0, bloom: 11)
let MOBILE = Format(name: "mobile", W: 720, H: 1280, bitrate: 2_600_000, gop: 4,
                    horizon: 0.40, cx: 0.50, cy: 0.40, focal: 720 * 0.98, lw: 0.78, traces: 40,
                    camBack: 5.5, bloom: 7)

// MARK: - Sahne verisi (deterministik)

struct Trace { var chaos: Double; var ordered: Double; var f: [Double]; var ph: [Double]; var w: [Double]; var alpha: Double; var pool: Bool }
struct Node { var cloud: V3; var bar: V3; var height: Double; var col: Int; var row: Int; var delay: Double; var size: Double }
struct Dot { var node: Int; var off: V3; var floor: V3; var delay: Double; var lineX: Double; var lineIdx: Int }

let FLOOR = -1.2
let COLS = 14, ROWS = 5

final class Scene {
  var traces: [Trace] = []
  var nodes: [Node] = []
  var dots: [Dot] = []
  var edges: [(Int, Int)] = []
  var colTop: [Double] = []
  let nTraces: Int

  init(traces n: Int) {
    nTraces = n
    var r = RNG(s: 20260910)
    for i in 0..<n {
      let u = Double(i) / Double(n - 1) - 0.5
      traces.append(Trace(
        chaos: r.gauss() * 0.34,
        ordered: u * 0.011,
        f: [r.range(0.6, 1.6), r.range(1.8, 3.4), r.range(3.6, 6.2)],
        ph: [r.range(0, 6.28), r.range(0, 6.28), r.range(0, 6.28)],
        w: [r.range(0.55, 1.0), r.range(0.25, 0.55), r.range(0.08, 0.22)],
        alpha: r.range(0.28, 0.72),
        pool: r.next() < 0.16))
    }
    // 70 düğüm: bayiler
    for _ in 0..<70 {
      let c = V3(x: clamp(r.gauss() * 9.5, -12, 12), y: r.range(-1.0, 6.0), z: r.range(4, 32))
      nodes.append(Node(cloud: c, bar: c, height: 1, col: 0, row: 0, delay: 0, size: r.range(0.8, 1.35)))
    }
    // Düğümleri x'e göre sütunlara, sütun içinde z'ye göre satırlara ata
    let byX = nodes.indices.sorted { nodes[$0].cloud.x < nodes[$1].cloud.x }
    for c in 0..<COLS {
      let group = Array(byX[(c * ROWS)..<((c + 1) * ROWS)]).sorted { nodes[$0].cloud.z < nodes[$1].cloud.z }
      for (row, j) in group.enumerated() {
        let trend = pow(Double(c) / Double(COLS - 1), 1.25)
        let h = max(0.35, 0.55 + 3.5 * trend + (r.next() - 0.5) * 0.8 - Double(row) * 0.14)
        nodes[j].col = c; nodes[j].row = row; nodes[j].height = h
        nodes[j].bar = V3(x: -6.5 + Double(c), y: FLOOR + h, z: 9 + Double(row) * 2.4)
        nodes[j].delay = Double(c) * 0.0035 + r.range(0, 0.01)
      }
    }
    for c in 0..<COLS {
      colTop.append(nodes.filter { $0.col == c }.map { $0.height }.max() ?? 1)
    }
    // Her düğümü en yakın iki komşusuna bağla (ağ)
    for i in 0..<nodes.count {
      let near = nodes.indices.filter { $0 != i }.sorted {
        let a = nodes[$0].cloud - nodes[i].cloud, b = nodes[$1].cloud - nodes[i].cloud
        return a.x * a.x + a.y * a.y + a.z * a.z < b.x * b.x + b.y * b.y + b.z * b.z
      }
      for k in near.prefix(2) where !edges.contains(where: { ($0.0 == k && $0.1 == i) }) { edges.append((i, k)) }
    }
    // 300 nokta: personel. Her biri bir bayiye bağlı, sonra 20x15 zemin ızgarasına iner.
    for k in 0..<300 {
      let dir = V3(x: r.gauss(), y: r.gauss(), z: r.gauss())
      let len = max(0.001, sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z))
      let off = dir * (r.range(0.35, 1.15) / len)
      let gi = k % 20, gj = k / 20
      dots.append(Dot(node: k % 70, off: off,
                      floor: V3(x: -9.5 + Double(gi), y: FLOOR, z: 4 + Double(gj) * 1.8),
                      delay: r.range(0, 0.045), lineX: r.next(), lineIdx: Int(r.next() * Double(n))))
    }
  }

  // Eğrinin kontrol noktaları: 14 sütun tepesi + dikleşen 5 uzantı noktası
  lazy var curve: [V3] = {
    var pts: [V3] = []
    for c in 0..<COLS { pts.append(V3(x: -6.5 + Double(c), y: FLOOR + colTop[c] + 0.45, z: 8.6)) }
    let last = pts.last!
    for k in 1...5 {
      let kk = Double(k)
      pts.append(V3(x: last.x + kk * 0.8, y: last.y + 0.75 * pow(kk, 1.55), z: last.z - kk * 0.25))
    }
    return pts
  }()

  func curvePoint(_ s: Double) -> V3 {
    // s: 0..1 tüm eğri boyunca
    let p = curve
    let seg = Double(p.count - 1) * clamp(s)
    let i = min(Int(seg), p.count - 2)
    let t = seg - Double(i)
    let p0 = p[max(i - 1, 0)], p1 = p[i], p2 = p[i + 1], p3 = p[min(i + 2, p.count - 1)]
    return crV(p0, p1, p2, p3, t)
  }
}

// MARK: - Kamera

struct Cam { var pos: V3; var yaw: Double; var pitch: Double }

struct Key { let t: Double; let pos: V3; let target: V3 }

func cameraAt(_ T: Double, _ fmt: Format, _ scene: Scene) -> Cam {
  let back = fmt.camBack
  let keys: [Key] = [
    Key(t: 0.30, pos: V3(x: 0, y: 1.2, z: -8 - back), target: V3(x: 0, y: 1.6, z: 16)),
    Key(t: 0.40, pos: V3(x: 0, y: 1.3, z: -6 - back), target: V3(x: 0, y: 1.7, z: 16)),
    Key(t: 0.47, pos: V3(x: 0.3, y: 1.6, z: -1.5 - back), target: V3(x: 0.2, y: 1.8, z: 18)),
    Key(t: 0.555, pos: V3(x: 0.9, y: 2.0, z: 2.5 - back), target: V3(x: 0.4, y: 1.9, z: 20)),
    Key(t: 0.66, pos: V3(x: -0.3, y: 2.8, z: -1.8 - back), target: V3(x: 0.2, y: 0.8, z: 14)),
    Key(t: 0.74, pos: V3(x: -0.6, y: 3.0, z: -2.2 - back), target: V3(x: 0.4, y: 1.0, z: 13)),
    Key(t: 0.84, pos: V3(x: 0.8, y: 4.4, z: -8.0 - back), target: V3(x: 2.0, y: 3.0, z: 12)),
    Key(t: 0.92, pos: V3(x: 1.6, y: 5.2, z: -11 - back), target: V3(x: 2.6, y: 5.0, z: 11)),
    Key(t: 1.00, pos: V3(x: 2.0, y: 5.6, z: -12 - back), target: V3(x: 3.0, y: 5.6, z: 11)),
  ]
  var i = 0
  while i < keys.count - 2 && T > keys[i + 1].t { i += 1 }
  let k0 = keys[max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[min(i + 2, keys.count - 1)]
  let u = clamp((T - k1.t) / (k2.t - k1.t))
  let pos = crV(k0.pos, k1.pos, k2.pos, k3.pos, u)
  var target = crV(k0.target, k1.target, k2.target, k3.target, u)
  // Eğri sahnesinde kamera eğrinin ucunu yumuşakça takip eder
  let follow = ramp(0.78, 0.9, T) * 0.22
  if follow > 0 {
    let head = scene.curvePoint(curveProgress(T))
    target = mix(target, head, follow)
  }
  let d = target - pos
  return Cam(pos: pos, yaw: atan2(d.x, d.z), pitch: atan2(d.y, sqrt(d.x * d.x + d.z * d.z)))
}

func curveProgress(_ T: Double) -> Double {
  // sütun tepelerine kadar (14/19 = 0.684) 0.74-0.81, dikleşen uzantı 0.81-0.90
  let a = 13.0 / 18.0
  if T < 0.81 { return a * easeOut((T - 0.74) / 0.07) * (T > 0.74 ? 1 : 0) }
  return a + (1 - a) * smooth((T - 0.81) / 0.09)
}

// Dünya noktasını ekrana izdüşür: (x, y, derinlik) ya da kamera arkasında nil
func project(_ p: V3, _ cam: Cam, _ fmt: Format) -> (Double, Double, Double)? {
  var d = p - cam.pos
  let cy = cos(-cam.yaw), sy = sin(-cam.yaw)
  d = V3(x: d.x * cy + d.z * sy, y: d.y, z: -d.x * sy + d.z * cy)
  let cp = cos(cam.pitch), sp = sin(cam.pitch)
  d = V3(x: d.x, y: d.y * cp - d.z * sp, z: d.y * sp + d.z * cp)
  if d.z < 0.3 { return nil }
  let W = Double(fmt.W), H = Double(fmt.H)
  return (W * fmt.cx + fmt.focal * d.x / d.z, H * fmt.cy - fmt.focal * d.y / d.z, d.z)
}

// MARK: - Çizim

func glowDot(_ ctx: CGContext, _ x: Double, _ y: Double, _ r: Double, _ c: RGB, _ a: Double) {
  guard a > 0.003, r > 0.05 else { return }
  let colors = [cg(c, a), cg(c, a * 0.28), cg(c, 0)] as CFArray
  let grad = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors, locations: [0, 0.22, 1])!
  ctx.drawRadialGradient(grad, startCenter: CGPoint(x: x, y: y), startRadius: 0,
                         endCenter: CGPoint(x: x, y: y), endRadius: r, options: [])
}

func render(_ ctx: CGContext, _ T: Double, _ fmt: Format, _ scene: Scene) {
  let W = Double(fmt.W), H = Double(fmt.H)
  let time = T * seconds
  let lw = fmt.lw * (H > W ? 1.0 : 1.0)
  let scale = fmt.name == "mobile" ? 0.8 : 1.0

  // CoreGraphics orijini sol altta: y ekseni aşağı baksın diye çevir
  ctx.saveGState()
  ctx.translateBy(x: 0, y: H)
  ctx.scaleBy(x: 1, y: -1)

  // 1) Zemin: gece + ufukta hafif pus
  ctx.setFillColor(cg(NIGHT))
  ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
  let hz = H * fmt.horizon
  let haze = 0.55 + 0.45 * ramp(0.0, 0.3, T)
  do {
    let colors = [cg(NIGHT_HAZE, 0.95 * haze), cg(NIGHT_HAZE, 0.0)] as CFArray
    let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors, locations: [0, 1])!
    ctx.saveGState()
    ctx.translateBy(x: W * 0.5, y: hz)
    ctx.scaleBy(x: 1, y: 0.42)
    ctx.drawRadialGradient(g, startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: max(W, H) * 0.75, options: [])
    ctx.restoreGState()
  }

  let cam = cameraAt(T, fmt, scene)
  ctx.setLineCap(.round)
  ctx.setLineJoin(.round)

  // 2) Izler (Işık + Soru sahneleri)
  let traceAlpha = 1 - ramp(0.37, 0.45, T)
  // İlk karelerde çizgi yok: sayfa kendi etkileşimli çizgisini aynı yere çizer
  // (assets/js/main.js > ışık teli). Kaydırma başlayınca bu çizgi devralır.
  let lineIn = ramp(0.022, 0.05, T)
  if traceAlpha > 0.002 {
    let fanIn = ramp(0.145, 0.225, T)
    let order = ramp(0.25, 0.345, T)
    let chaos = ramp(0.15, 0.22, T) * (1 - ramp(0.255, 0.34, T))
    let tilt = order * 0.05 * H
    let steps = 140
    for tr in scene.traces {
      let off = lerp(lerp(0, tr.chaos, fanIn), tr.ordered, order) * H
      let path = CGMutablePath()
      for s in 0...steps {
        let u = Double(s) / Double(steps)
        let x = u * W
        let env = 0.3 + 0.7 * sin(Double.pi * u)
        var n = 0.0
        for k in 0..<3 { n += tr.w[k] * sin(2 * Double.pi * tr.f[k] * u + tr.ph[k] + time * (0.7 + Double(k) * 0.55)) }
        let y = hz + off + n * chaos * 0.085 * H * env - tilt * (u - 0.5)
        if s == 0 { path.move(to: CGPoint(x: x, y: y)) } else { path.addLine(to: CGPoint(x: x, y: y)) }
      }
      let spread = max(fanIn, order)
      let a = lineIn * traceAlpha * lerp(lerp(0.55, tr.alpha, spread), 0.09, order * 0.9)
      ctx.addPath(path)
      ctx.setStrokeColor(cg(tr.pool ? POOL_LIGHT : BONE, a))
      ctx.setLineWidth(lw * (tr.pool ? 1.3 : 1.05))
      ctx.strokePath()
    }
    // Düzene oturan izler: tek, parlak ve hafifçe yükselen bir çizgi
    let core = order * traceAlpha
    if core > 0.002 {
      ctx.saveGState()
      ctx.setShadow(offset: .zero, blur: 10 * lw, color: cg(POOL_LIGHT, 0.8 * core))
      ctx.setStrokeColor(cg(BONE, 0.92 * core))
      ctx.setLineWidth(1.5 * lw)
      ctx.move(to: CGPoint(x: 0, y: hz + tilt * 0.5)); ctx.addLine(to: CGPoint(x: W, y: hz - tilt * 0.5))
      ctx.strokePath()
      ctx.restoreGState()
    }
    // Sinyal: ilk sahnede çizgi boyunca soldan sağa ilerleyen ışık
    let pulse = (T - 0.05) / 0.095
    if pulse > -0.1 && pulse < 1.15 {
      let px = lerp(-0.08, 1.08, pulse) * W
      let pa = sin(Double.pi * clamp(pulse, 0, 1)) * (1 - fanIn)
      ctx.saveGState()
      ctx.translateBy(x: px, y: hz)
      ctx.scaleBy(x: 3.2, y: 1)
      glowDot(ctx, 0, 0, 0.05 * H, POOL_LIGHT, 0.85 * pa)
      ctx.restoreGState()
      glowDot(ctx, px, hz, 0.012 * H, BONE, 0.9 * pa)
    }
  }

  // 3) Parçacıklar (Ağ, Veri, Eğri)
  if T > 0.355 {
    let toBars = T < 0.555 ? 0.0 : 1.0
    let fadeCloud = ramp(0.8, 0.9, T)

    // Düğüm konumları
    var nodePos: [V3] = []
    for n in scene.nodes {
      let e = smoother((T - 0.56 - n.delay) / 0.11) * toBars
      // Ağ sahnesinde hafif süzülme
      let drift = V3(x: sin(time * 0.35 + n.cloud.z) * 0.12, y: cos(time * 0.3 + n.cloud.x) * 0.1, z: 0)
      nodePos.append(mix(n.cloud + drift * (1 - e), n.bar, e))
    }
    // Ekrandaki izdüşümler
    let nodeScr = nodePos.map { project($0, cam, fmt) }

    // Izden ayrışma: nokta önce izin üstünde doğar, sonra 3B konumuna gider
    func traceY(_ idx: Int, _ u: Double) -> Double {
      let tr = scene.traces[idx]
      return hz + tr.ordered * H - 0.05 * H * (u - 0.5)
    }

    // Ağ bağlantıları (düğüm-düğüm)
    let netA = ramp(0.45, 0.52, T) * (1 - ramp(0.56, 0.61, T))
    if netA > 0.002 {
      ctx.setLineWidth(0.8 * lw)
      for (a, b) in scene.edges {
        guard let pa = nodeScr[a], let pb = nodeScr[b] else { continue }
        let fog = clamp(1.25 - (pa.2 + pb.2) * 0.5 / 34)
        ctx.setStrokeColor(cg(BONE, 0.2 * netA * fog))
        ctx.move(to: CGPoint(x: pa.0, y: pa.1)); ctx.addLine(to: CGPoint(x: pb.0, y: pb.1))
        ctx.strokePath()
      }
    }

    // Personel noktaları ve bayilere bağlanan çizgiler
    let spokeA = ramp(0.44, 0.5, T) * (1 - ramp(0.555, 0.6, T))
    for d in scene.dots {
      let nbase = nodePos[d.node]
      let e = smoother((T - 0.57 - d.delay) / 0.11)
      let cloudP = nbase + d.off
      let p3 = mix(cloudP, d.floor, e)
      guard let s = project(p3, cam, fmt) else { continue }
      var sx = s.0, sy = s.1
      let local = clamp((T - 0.36 - d.delay) / 0.085)
      if local < 1 {
        let lx = d.lineX * W, ly = traceY(d.lineIdx, d.lineX)
        let k = smoother(local)
        sx = lerp(lx, sx, k); sy = lerp(ly, sy, k)
      }
      let fog = clamp(1.3 - s.2 / 36) * clamp((s.2 - 0.6) / 2.2)
      let a = (T < 0.4 ? ramp(0.355, 0.39, T) : 1) * fog * lerp(0.5, 0.32, e) * (1 - 0.45 * fadeCloud)
      if spokeA > 0.002, let ns = nodeScr[d.node] {
        ctx.setStrokeColor(cg(BONE, 0.16 * spokeA * fog))
        ctx.setLineWidth(0.6 * lw)
        ctx.move(to: CGPoint(x: ns.0, y: ns.1))
        ctx.addLine(to: CGPoint(x: lerp(ns.0, sx, spokeA), y: lerp(ns.1, sy, spokeA)))
        ctx.strokePath()
      }
      let r = min(4.5, max(0.7, 1.35 * scale * 7.5 / max(s.2, 1)) * (fmt.name == "mobile" ? 1.1 : 1.4))
      ctx.setFillColor(cg(BONE, a))
      ctx.fillEllipse(in: CGRect(x: sx - r, y: sy - r, width: 2 * r, height: 2 * r))
    }

    // Zemin ızgarası çizgileri (Veri sahnesi)
    let gridA = ramp(0.64, 0.71, T) * (1 - 0.5 * fadeCloud) * (1 - ramp(0.9, 0.97, T))
    if gridA > 0.002 {
      ctx.setLineWidth(0.7 * lw)
      for gi in 0..<20 {
        let x = -9.5 + Double(gi)
        if let a = project(V3(x: x, y: FLOOR, z: 4), cam, fmt), let b = project(V3(x: x, y: FLOOR, z: 4 + 14 * 1.8), cam, fmt) {
          ctx.setStrokeColor(cg(BONE, 0.07 * gridA)); ctx.move(to: CGPoint(x: a.0, y: a.1)); ctx.addLine(to: CGPoint(x: b.0, y: b.1)); ctx.strokePath()
        }
      }
      for gj in 0..<15 {
        let z = 4 + Double(gj) * 1.8
        if let a = project(V3(x: -9.5, y: FLOOR, z: z), cam, fmt), let b = project(V3(x: 9.5, y: FLOOR, z: z), cam, fmt) {
          ctx.setStrokeColor(cg(BONE, 0.07 * gridA)); ctx.move(to: CGPoint(x: a.0, y: a.1)); ctx.addLine(to: CGPoint(x: b.0, y: b.1)); ctx.strokePath()
        }
      }
    }

    // Işık sütunları (Veri sahnesi)
    let barFade = 1 - 0.55 * fadeCloud
    for (j, n) in scene.nodes.enumerated() {
      let grow = smoother((T - 0.6 - Double(n.col) * 0.004) / 0.1)
      guard grow > 0.001 else { continue }
      let top = V3(x: n.bar.x, y: FLOOR + n.height * grow, z: n.bar.z)
      guard let a = project(V3(x: n.bar.x, y: FLOOR, z: n.bar.z), cam, fmt), let b = project(top, cam, fmt) else { continue }
      let fog = clamp(1.3 - a.2 / 36)
      let colors = [cg(BONE, 0.05 * barFade * fog), cg(BONE, 0.62 * barFade * fog * grow)] as CFArray
      let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors, locations: [0, 1])!
      let w = max(1.1, 2.8 * lw * 7.5 / max(a.2, 1))
      ctx.saveGState()
      ctx.move(to: CGPoint(x: a.0, y: a.1)); ctx.addLine(to: CGPoint(x: b.0, y: b.1))
      ctx.setLineWidth(w)
      ctx.replacePathWithStrokedPath()
      ctx.clip()
      ctx.drawLinearGradient(g, start: CGPoint(x: a.0, y: a.1), end: CGPoint(x: b.0, y: b.1), options: [])
      ctx.restoreGState()
      _ = j
    }

    // Düğümler (bayiler): parlak noktalar
    for (j, n) in scene.nodes.enumerated() {
      guard let s0 = nodeScr[j] else { continue }
      var sx = s0.0, sy = s0.1
      let local = clamp((T - 0.36 - Double(j % 9) * 0.004) / 0.09)
      if local < 1 {
        let idx = (j * 7) % scene.nTraces
        let u = Double((j * 37) % 100) / 100
        let k = smoother(local)
        sx = lerp(u * W, sx, k); sy = lerp(traceY(idx, u), sy, k)
      }
      let fog = clamp(1.35 - s0.2 / 34) * clamp((s0.2 - 0.6) / 2.2)
      let appear = ramp(0.355, 0.4, T)
      let a = appear * fog * (1 - 0.5 * fadeCloud)
      let r = min(12, n.size * max(1.4, 2.8 * scale * 8 / max(s0.2, 1)) * (fmt.name == "mobile" ? 0.9 : 1.25))
      glowDot(ctx, sx, sy, r * 6, POOL_LIGHT, 0.4 * a)
      ctx.setFillColor(cg(BONE, 0.95 * a))
      ctx.fillEllipse(in: CGRect(x: sx - r, y: sy - r, width: 2 * r, height: 2 * r))
    }
  }

  // 4) Eğri
  var headScreen: (Double, Double)? = nil
  if T > 0.735 {
    let prog = curveProgress(T)
    let samples = 260
    let path = CGMutablePath()
    var started = false
    var last: (Double, Double)? = nil
    let n = max(2, Int(Double(samples) * prog))
    for i in 0...n {
      let s = prog * Double(i) / Double(n)
      guard let p = project(scene.curvePoint(s), cam, fmt) else { continue }
      if !started { path.move(to: CGPoint(x: p.0, y: p.1)); started = true } else { path.addLine(to: CGPoint(x: p.0, y: p.1)) }
      last = (p.0, p.1)
    }
    let dawn = ramp(0.9, 0.99, T)
    ctx.saveGState()
    ctx.setShadow(offset: .zero, blur: 14 * lw, color: cg(POOL_LIGHT, 0.75 * (1 - dawn)))
    ctx.addPath(path)
    ctx.setStrokeColor(cg(POOL_LIGHT, 1 - dawn * 0.6))
    ctx.setLineWidth(2.7 * lw)
    ctx.strokePath()
    ctx.restoreGState()
    ctx.addPath(path)
    ctx.setStrokeColor(cg(BONE, 0.55 * (1 - dawn)))
    ctx.setLineWidth(0.9 * lw)
    ctx.strokePath()
    if let h = last {
      headScreen = h
      glowDot(ctx, h.0, h.1, 0.06 * H, POOL_LIGHT, 0.55)
      glowDot(ctx, h.0, h.1, 0.012 * H, BONE, 1)
    }
  }

  // 5) Şafak: eğrinin ucundan açılan ışık, kare sayfa rengine döner
  let dawn = ramp(0.885, 0.975, T)
  if dawn > 0.001 {
    let hx = clamp(headScreen?.0 ?? W * 0.7, W * 0.15, W * 0.85)
    let hy = clamp(headScreen?.1 ?? H * 0.3, H * 0.12, H * 0.7)
    // Önce ışık eklenir (additive): lacivertin üstünde griye değil maviye-beyaza açılır
    let radius = lerp(0.08, 1.6, easeOut(dawn)) * max(W, H)
    let glow = min(1, dawn * 1.5)
    ctx.saveGState()
    ctx.setBlendMode(.plusLighter)
    let colors = [cg(BONE, glow), cg(POOL_LIGHT, 0.75 * glow), cg(POOL, 0.25 * glow), cg(POOL, 0)] as CFArray
    let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors, locations: [0, 0.3, 0.62, 1])!
    ctx.drawRadialGradient(g, startCenter: CGPoint(x: hx, y: hy), startRadius: 0,
                           endCenter: CGPoint(x: hx, y: hy), endRadius: radius, options: [])
    ctx.restoreGState()
    // Sonra gökyüzü rengi merkezden yayılır
    let sky = ramp(0.925, 0.985, T)
    if sky > 0 {
      let r2 = lerp(0.2, 1.8, easeOut(sky)) * max(W, H)
      let c2 = [cg(SKY, sky), cg(SKY_WARM, sky * 0.85), cg(SKY_WARM, 0)] as CFArray
      let g2 = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: c2, locations: [0, 0.6, 1])!
      ctx.drawRadialGradient(g2, startCenter: CGPoint(x: hx, y: hy), startRadius: 0,
                             endCenter: CGPoint(x: hx, y: hy), endRadius: r2, options: [])
    }
    let flat = ramp(0.96, 1.0, T)
    if flat > 0 {
      ctx.setFillColor(cg(SKY, flat))
      ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    }
    // Açılıştaki ufuk çizgisi, bu kez gün ışığında
    let lineA = ramp(0.955, 1.0, T)
    if lineA > 0 {
      ctx.setStrokeColor(cg(NIGHT, 0.22 * lineA))
      ctx.setLineWidth(1.1 * lw)
      ctx.move(to: CGPoint(x: 0, y: hz)); ctx.addLine(to: CGPoint(x: W, y: hz)); ctx.strokePath()
    }
  }
  ctx.restoreGState()
}

// MARK: - Kodlama

let ciContext = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

func makeFrame(_ T: Double, _ fmt: Format, _ scene: Scene) -> CIImage {
  let W = fmt.W, H = fmt.H
  let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)
  ctx.interpolationQuality = .high
  render(ctx, T, fmt, scene)
  let img = CIImage(cgImage: ctx.makeImage()!)
  let dawn = ramp(0.88, 0.97, T)
  let bloom = CIFilter(name: "CIBloom")!
  bloom.setValue(img, forKey: kCIInputImageKey)
  bloom.setValue(fmt.bloom, forKey: kCIInputRadiusKey)
  bloom.setValue(0.62 * (1 - dawn), forKey: kCIInputIntensityKey)
  return bloom.outputImage!.cropped(to: img.extent)
}

func encode(_ fmt: Format, _ outPath: String) throws {
  let scene = Scene(traces: fmt.traces)
  let url = URL(fileURLWithPath: outPath)
  try? FileManager.default.removeItem(at: url)
  let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
  writer.shouldOptimizeForNetworkUse = true
  let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: fmt.W,
    AVVideoHeightKey: fmt.H,
    AVVideoColorPropertiesKey: [
      AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
      AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
      AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
    AVVideoCompressionPropertiesKey: [
      AVVideoAverageBitRateKey: fmt.bitrate,
      AVVideoMaxKeyFrameIntervalKey: fmt.gop,
      AVVideoAllowFrameReorderingKey: false,
      AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      AVVideoExpectedSourceFrameRateKey: fps,
    ],
  ]
  let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
  input.expectsMediaDataInRealTime = false
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: fmt.W,
    kCVPixelBufferHeightKey as String: fmt.H,
  ])
  writer.add(input)
  writer.startWriting()
  writer.startSession(atSourceTime: .zero)

  for i in 0..<frameCount {
    let T = Double(i) / Double(frameCount - 1)
    let frame = makeFrame(T, fmt, scene)
    while !input.isReadyForMoreMediaData { usleep(2000) }
    var pb: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
    guard let buffer = pb else { fatalError("pixel buffer") }
    ciContext.render(frame, to: buffer, bounds: frame.extent, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
    adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: CMTimeScale(fps)))
    if i % 60 == 0 { print("  \(fmt.name) kare \(i)/\(frameCount)") }
  }
  input.markAsFinished()
  let sem = DispatchSemaphore(value: 0)
  writer.finishWriting { sem.signal() }
  sem.wait()
  if writer.status != .completed { print("HATA", writer.error as Any) }
  let size = (try? FileManager.default.attributesOfItem(atPath: outPath)[.size] as? Int) ?? 0
  print(String(format: "%@  %.2f MB  %d kare  gop=%d", outPath, Double(size) / 1_048_576, frameCount, fmt.gop))
}

func writeJPEG(_ img: CIImage, _ path: String, quality: Double = 0.82) {
  guard let cgImg = ciContext.createCGImage(img, from: img.extent) else { return }
  let rep = NSBitmapImageRep(cgImage: cgImg)
  if let data = rep.representation(using: .jpeg, properties: [.compressionFactor: quality]) {
    try? data.write(to: URL(fileURLWithPath: path))
  }
}

// MARK: - Giriş noktası

let args = CommandLine.arguments
let mode = args.count > 1 ? args[1] : "desktop"
switch mode {
case "desktop": try encode(DESKTOP, args.count > 2 ? args[2] : "public/video/hero.mp4")
case "mobile": try encode(MOBILE, args.count > 2 ? args[2] : "public/video/hero-mobile.mp4")
case "posters":
  // Afiş kareleri: video yüklenene kadar ve azaltılmış hareket modunda görünür
  let dir = args.count > 2 ? args[2] : "public/video"
  let sd = Scene(traces: DESKTOP.traces), sm = Scene(traces: MOBILE.traces)
  writeJPEG(makeFrame(0, DESKTOP, sd), dir + "/poster.jpg")
  writeJPEG(makeFrame(0, MOBILE, sm), dir + "/poster-mobile.jpg")
  writeJPEG(makeFrame(0.82, DESKTOP, sd), dir + "/still.jpg")
  writeJPEG(makeFrame(0.82, MOBILE, sm), dir + "/still-mobile.jpg")
  print("afişler yazıldı")
case "frames":
  let dir = args.count > 2 ? args[2] : "frames"
  try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
  let which = args.count > 3 ? args[3] : "desktop"
  let fmt = which == "mobile" ? MOBILE : DESKTOP
  let scene = Scene(traces: fmt.traces)
  let ts: [Double] = args.count > 4 ? args[4].split(separator: ",").map { Double($0)! }
    : [0, 0.08, 0.18, 0.22, 0.3, 0.36, 0.4, 0.48, 0.6, 0.68, 0.76, 0.82, 0.88, 0.93, 0.97, 1.0]
  for t in ts { writeJPEG(makeFrame(t, fmt, scene), String(format: "%@/%@_%.2f.jpg", dir, which, t)) }
  print("kareler yazıldı:", dir)
case "sheet":
  // İnceleme için temas föyü: kareleri tek bir görselde ızgara halinde toplar
  let path = args.count > 2 ? args[2] : "sheet.jpg"
  let which = args.count > 3 ? args[3] : "desktop"
  let fmt = which == "mobile" ? MOBILE : DESKTOP
  let scene = Scene(traces: fmt.traces)
  let ts: [Double] = args.count > 4 ? args[4].split(separator: ",").map { Double($0)! }
    : [0, 0.08, 0.18, 0.22, 0.28, 0.34, 0.38, 0.44, 0.5, 0.58, 0.64, 0.7, 0.76, 0.8, 0.84, 0.88, 0.91, 0.94, 0.97, 1.0]
  let cols = which == "mobile" ? 10 : 5
  let tw = which == "mobile" ? 180 : 384
  let th = tw * fmt.H / fmt.W
  let rows = (ts.count + cols - 1) / cols
  let sheet = CGContext(data: nil, width: cols * tw, height: rows * th, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  sheet.interpolationQuality = .high
  for (i, t) in ts.enumerated() {
    let f = makeFrame(t, fmt, scene)
    if let cgi = ciContext.createCGImage(f, from: f.extent) {
      let x = (i % cols) * tw, y = (rows - 1 - i / cols) * th
      sheet.draw(cgi, in: CGRect(x: x, y: y, width: tw, height: th))
      let label = NSAttributedString(string: String(format: " %.2f ", t), attributes: [
        .font: NSFont.monospacedSystemFont(ofSize: 13, weight: .medium),
        .foregroundColor: NSColor.systemPink, .backgroundColor: NSColor.black])
      let ns = NSGraphicsContext(cgContext: sheet, flipped: false)
      NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = ns
      label.draw(at: CGPoint(x: x + 4, y: y + 4))
      NSGraphicsContext.restoreGraphicsState()
    }
  }
  writeJPEG(CIImage(cgImage: sheet.makeImage()!), path, quality: 0.8)
  print("föy:", path)
default: print("kullanım: film desktop|mobile|posters|frames|sheet")
}
