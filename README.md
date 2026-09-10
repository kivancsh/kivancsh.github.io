# Kıvanç Karademir: kişisel kariyer sitesi

Kaydırmayla oynatılan sinematik bir giriş filmi ve ardından Hakkımda, Stajlar,
Eğitim Programları, İş Tecrübeleri bölümleri. Derleme adımı yok: düz HTML, CSS, JS.

## Yayın

Canlı adres: https://kivancsh.github.io

`main` dalına push edilen her değişiklik GitHub Pages'te 1-2 dakika içinde yayına girer
(GitHub Desktop'ta "Push origin" ya da terminalde `git push`).

## Yerel önizleme

Proje klasörünün içinde çalıştır (başka klasörde çalıştırırsan o klasörü listeler):

```bash
python3 -m http.server 4500 --bind 127.0.0.1
```

Tarayıcıda: http://127.0.0.1:4500

`--bind 127.0.0.1` önemli: onsuz sunucu aynı ağdaki herkese açılır.

Dosyayı çift tıklayıp açmak (`file://`) videoyu yüklemez; mutlaka bir sunucu üzerinden aç.

## Klasörler

| Yol | İçerik |
|---|---|
| `index.html` | Sayfanın tamamı (metinler burada) |
| `assets/css/main.css` | Tasarım: renkler, tipografi, bölümler, mobil |
| `assets/js/main.js` | Koreografi: film metinleri, imza cümlesi, sayaçlar, menü |
| `assets/js/scrollcraft.js`, `assets/css/scrollcraft.css` | Kaydırma motoru (değiştirilmez) |
| `public/video/` | `hero.mp4` (masaüstü), `hero-mobile.mp4` (mobil), afiş kareleri |
| `public/img/` | Portre |
| `public/logos/` | Şirket logoları (beyaz zemini temizlenmiş PNG) |
| `tools/` | Filmi, logoları ve paleti üreten Swift araçları |
| `docs/` | Brief, tasarım DNA'sı, sahne kurgusu |

## Sık yapılan değişiklikler

**İletişim bilgisini değiştirmek:** `assets/js/main.js` en üstteki `CONTACT` nesnesi.
E-posta kaynakta düz yazılmaz, iki parçadan birleştirilir. Bağlantılar kapanış bölümünde görünür.

**Metin değiştirmek:** `index.html` içinde ilgili bölümü bul (yorum etiketleri: `BÖLÜM 1` ... `BÖLÜM 6`).

**Vurgu rengi kuralı:** havuz mavisi yalnızca rakamlarda kullanılır. Bir rakama `class="num"` ver.

**Kendi videonu kullanmak:** dosyayı `public/video/hero.mp4` (yatay) ve
`public/video/hero-mobile.mp4` (dikey) olarak koy. Kaydırmada akıcı olması için sık anahtar
kareyle kodlanmalı (ör. ffmpeg `-g 8 -keyint_min 8 -an -movflags +faststart`). Sonra
`assets/js/main.js` içindeki `SCENES` aralıklarını videondaki sahne geçişlerine göre ayarla
(0 = başlangıç, 1 = son).

**Filmi yeniden üretmek** (Xcode Komut Satırı Araçları yeterli):

```bash
swiftc -O tools/film.swift -o tools/.film
tools/.film desktop public/video/hero.mp4
tools/.film mobile public/video/hero-mobile.mp4
tools/.film posters public/video
```

## Test kancası

`http://localhost:4500/?qa` açılış perdesini atlar ve `window.__kk.apply(p)` ile filmin
istenen noktadaki metin durumunu uygular. Görsel kontrol içindir.
