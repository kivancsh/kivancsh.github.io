// Logo hazırlama aracı.
// Kaynak logoları (PNG / WebP / PDF) okur, beyaz zemini şeffaflığa çevirir,
// kenar boşluklarını kırpar ve public/logos/ altına PNG olarak yazar.
//
//   swiftc -O tools/logos.swift -o tools/.logos && tools/.logos
//
import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let home = FileManager.default.homeDirectoryForCurrentUser.path
let dl = home + "/Downloads/"
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "public/logos/"

// (kaynak, çıktı adı, beyazı şeffaflığa çevir)
let jobs: [(String, String, Bool)] = [
  (dl + "QNB Finansbak.png", "qnb-finansbank", true),
  (dl + "Vodafone.png", "vodafone", false),
  (dl + "SAMPA/sampa-seeklogo.png", "sampa", false),
  (dl + "Kastamonu Entegre.pdf", "kastamonu-entegre", true),
  (dl + "bp-vector-logo-seeklogo/BP.png", "bp", false),
  (dl + "turkcell-vector-logo-seeklogo/Turkcell.png", "turkcell", false),
  (dl + "LC Waikiki.pdf", "lc-waikiki", true),  // kılavuzdaki ilk (mavi) logotip
  (dl + "Loreal.png", "loreal", false),
  (dl + "PG.png", "pg", false),
  (dl + "Yıldız Holding.png", "yildiz-holding", true),
  (dl + "Türk Telekom.png", "turk-telekom", true),
]

func loadImage(_ path: String) -> CGImage? {
  let url = URL(fileURLWithPath: path)
  if path.lowercased().hasSuffix(".pdf") {
    guard let doc = CGPDFDocument(url as CFURL), let page = doc.page(at: 1) else { return nil }
    let box = page.getBoxRect(.cropBox)
    let scale = 2400.0 / max(box.width, box.height)
    let w = Int(box.width * scale), h = Int(box.height * scale)
    guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpace(name: CGColorSpace.sRGB)!,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.clear(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.interpolationQuality = .high
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -box.minX, y: -box.minY)
    ctx.drawPDFPage(page)
    return ctx.makeImage()
  }
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

func process(_ img: CGImage, whiteToAlpha: Bool, firstBandOnly: Bool = false) -> CGImage? {
  let w = img.width, h = img.height
  var px = [UInt8](repeating: 0, count: w * h * 4)
  guard let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                            space: CGColorSpace(name: CGColorSpace.sRGB)!,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
  ctx.clear(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

  if whiteToAlpha {
    // Zemin rengi: köşe pikseli (neredeyse beyaz). Renk-şeffaflık dönüşümü,
    // kenar yumuşatmasını koruyarak zemini saydamlaştırır.
    let bg = [Double(px[0]) / 255, Double(px[1]) / 255, Double(px[2]) / 255].map { max($0, 0.9) }
    for i in stride(from: 0, to: px.count, by: 4) {
      let a0 = Double(px[i + 3]) / 255
      if a0 == 0 { continue }
      var c = [Double(px[i]) / 255 / a0, Double(px[i + 1]) / 255 / a0, Double(px[i + 2]) / 255 / a0]
      var a = 0.0
      for k in 0..<3 { a = max(a, max(0, (bg[k] - c[k]) / bg[k])) }
      if a < 0.035 { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0; continue }
      for k in 0..<3 { c[k] = min(1, max(0, bg[k] - (bg[k] - c[k]) / a)) }
      let fa = a * a0
      px[i] = UInt8(c[0] * fa * 255); px[i + 1] = UInt8(c[1] * fa * 255)
      px[i + 2] = UInt8(c[2] * fa * 255); px[i + 3] = UInt8(fa * 255)
    }
  }

  // İsteğe bağlı: yalnızca en üstteki içerik bandı (ör. marka kılavuzu PDF'inde
  // ilk logotip). İlk içerik satırından sonra 2% yükseklikte boşluk görünce dur.
  var yEnd = h
  if firstBandOnly {
    var started = false, empty = 0
    for y in 0..<h {
      var has = false
      for x in 0..<w where px[(y * w + x) * 4 + 3] > 10 { has = true; break }
      if has { started = true; empty = 0 } else if started { empty += 1; if empty > h / 50 { yEnd = y; break } }
    }
  }

  // Görünür içeriğin sınırlarını bul ve kırp.
  var minX = w, minY = h, maxX = -1, maxY = -1
  for y in 0..<yEnd {
    for x in 0..<w where px[(y * w + x) * 4 + 3] > 10 {
      if x < minX { minX = x }; if x > maxX { maxX = x }
      if y < minY { minY = y }; if y > maxY { maxY = y }
    }
  }
  guard maxX >= minX, let full = ctx.makeImage() else { return nil }
  let pad = Int(Double(max(maxX - minX, maxY - minY)) * 0.02)
  let r = CGRect(x: max(0, minX - pad), y: max(0, minY - pad),
                 width: min(w, maxX + pad + 1) - max(0, minX - pad),
                 height: min(h, maxY + pad + 1) - max(0, minY - pad))
  guard let cropped = full.cropping(to: r) else { return nil }

  // En uzun kenar en fazla 1200px.
  let s = min(1.0, 1200.0 / Double(max(cropped.width, cropped.height)))
  let nw = Int(Double(cropped.width) * s), nh = Int(Double(cropped.height) * s)
  guard let c2 = CGContext(data: nil, width: nw, height: nh, bitsPerComponent: 8, bytesPerRow: 0,
                           space: CGColorSpace(name: CGColorSpace.sRGB)!,
                           bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
  c2.interpolationQuality = .high
  c2.clear(CGRect(x: 0, y: 0, width: nw, height: nh))
  c2.draw(cropped, in: CGRect(x: 0, y: 0, width: nw, height: nh))
  return c2.makeImage()
}

func writePNG(_ img: CGImage, _ path: String) {
  let url = URL(fileURLWithPath: path) as CFURL
  guard let dst = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else { return }
  CGImageDestinationAddImage(dst, img, nil)
  CGImageDestinationFinalize(dst)
}

try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
for (src, slug, w2a) in jobs {
  guard let img = loadImage(src),
        let res = process(img, whiteToAlpha: w2a, firstBandOnly: slug == "lc-waikiki") else {
    print("HATA", slug); continue
  }
  writePNG(res, out + slug + ".png")
  print(String(format: "%@ %dx%d ar=%.3f", slug, res.width, res.height, Double(res.width) / Double(res.height)))
}
