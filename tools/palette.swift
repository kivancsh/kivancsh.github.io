// Portreden paleti ölçer (design-dna ölçüm adımı; node olmadığı için Swift).
// k-means (k=8) ile baskın renkler + belirli bölgelerin ortalama rengi.
//
//   swiftc -O tools/palette.swift -o tools/.palette && tools/.palette ~/Desktop/Me.jpg
//
import CoreGraphics
import Foundation
import ImageIO

let path = CommandLine.arguments[1]
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("okunamadı") }
let W = 165, H = Int(Double(img.height) * 165.0 / Double(img.width))
var px = [UInt8](repeating: 0, count: W * H * 4)
let ctx = CGContext(data: &px, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.interpolationQuality = .high
ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))

func hex(_ c: [Double]) -> String { String(format: "#%02X%02X%02X", Int(c[0]), Int(c[1]), Int(c[2])) }
var pts: [[Double]] = []
for i in stride(from: 0, to: px.count, by: 4) { pts.append([Double(px[i]), Double(px[i + 1]), Double(px[i + 2])]) }

// k-means++ tohumlama, sabit rastgelelik
var rng = SystemRandomNumberGenerator()
_ = rng
var seed: UInt64 = 42
func rnd() -> Double { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return Double(seed >> 11) / Double(1 << 53) }
func d2(_ a: [Double], _ b: [Double]) -> Double { (a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) + (a[2]-b[2])*(a[2]-b[2]) }
let k = 8
var cents: [[Double]] = [pts[Int(rnd() * Double(pts.count))]]
while cents.count < k {
  let ds = pts.map { p in cents.map { d2(p, $0) }.min()! }
  let tot = ds.reduce(0, +); var r = rnd() * tot; var idx = 0
  for (i, d) in ds.enumerated() { r -= d; if r <= 0 { idx = i; break } }
  cents.append(pts[idx])
}
var assign = [Int](repeating: 0, count: pts.count)
for _ in 0..<30 {
  for (i, p) in pts.enumerated() { var b = 0; var bd = Double.infinity; for (j, c) in cents.enumerated() { let d = d2(p, c); if d < bd { bd = d; b = j } }; assign[i] = b }
  var sums = [[Double]](repeating: [0, 0, 0], count: k); var n = [Int](repeating: 0, count: k)
  for (i, p) in pts.enumerated() { let a = assign[i]; sums[a][0] += p[0]; sums[a][1] += p[1]; sums[a][2] += p[2]; n[a] += 1 }
  for j in 0..<k where n[j] > 0 { cents[j] = [sums[j][0] / Double(n[j]), sums[j][1] / Double(n[j]), sums[j][2] / Double(n[j])] }
}
var n = [Int](repeating: 0, count: k); for a in assign { n[a] += 1 }
print("k-means palet (kapsama):")
for j in (0..<k).sorted(by: { n[$0] > n[$1] }) { print("  \(hex(cents[j]))  \(String(format: "%.3f", Double(n[j]) / Double(pts.count)))") }

// Bölge örnekleri, orijinal görsele göre oransal (x, y, yarıçap)
let regions: [(String, Double, Double)] = [
  ("takım elbise", 0.30, 0.74), ("takım elbise 2", 0.24, 0.86), ("kravat", 0.37, 0.61),
  ("gömlek", 0.31, 0.56), ("havuz koyu", 0.70, 0.86), ("havuz açık", 0.12, 0.68),
  ("gökyüzü", 0.12, 0.08), ("gökyüzü üst sağ", 0.85, 0.35), ("çam", 0.25, 0.30), ("ten", 0.31, 0.27),
]
print("bölge ortalamaları:")
for (name, fx, fy) in regions {
  let cx = Int(fx * Double(W)), cy = Int(fy * Double(H)); var s = [0.0, 0.0, 0.0]; var c = 0
  for y in max(0, cy - 2)...min(H - 1, cy + 2) { for x in max(0, cx - 2)...min(W - 1, cx + 2) {
    // CGContext başlangıcı sol alt; görsel koordinatı üstten
    let i = (y * W + x) * 4
    s[0] += Double(px[i]); s[1] += Double(px[i + 1]); s[2] += Double(px[i + 2]); c += 1 } }
  print("  \(name): \(hex(s.map { $0 / Double(c) }))")
}
