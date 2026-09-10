# Kıvanç Karademir: kişisel kariyer sitesi

Kaydırmayla oynatılan sinematik bir giriş filmi ve ardından Hakkımda, Kariyer Yolculuğu,
Stajlar, Eğitim Programları, İş Tecrübeleri ve İletişim bölümleri. Türkçe ve İngilizce.
Derleme adımı yok: düz HTML, CSS, JS.

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

Dosyayı çift tıklayıp açmak (`file://`) yazı tiplerini yüklemez; mutlaka bir sunucu üzerinden aç.

## Klasörler

| Yol | İçerik |
|---|---|
| `index.html` | Sayfanın tamamı (metinler burada) |
| `assets/css/main.css` | Tasarım: renkler, tipografi, bölümler, mobil |
| `assets/js/main.js` | Koreografi ve ayarlar: `CONTACT`, `CV_URL`, `SCENES`, `TIMELINE`, `SHIFT` |
| `assets/js/film.js` | Giriş filmi: her karede canlı çizilir (`tools/film.swift` ile aynı sahne) |
| `assets/js/i18n.js` | İngilizce metinler (Türkçeler `index.html` içinde) |
| `assets/fonts/` | Archivo (SIL Open Font License), kendi sunucumuzdan |
| `assets/js/scrollcraft.js`, `assets/css/scrollcraft.css` | Kaydırma motoru (değiştirilmez) |
| `public/video/` | Filmin afiş kareleri: ilk boyama, hareket azaltılmış mod, paylaşım kartı |
| `public/img/` | Portre |
| `public/logos/` | Şirket logoları (beyaz zemini temizlenmiş PNG) |
| `public/cv/` | İndirilebilir CV |
| `public/og/` | LinkedIn paylaşım kartı (1200x630) |
| `tools/` | Filmi, logoları ve paleti üreten Swift araçları |
| `docs/` | Brief, tasarım DNA'sı, sahne kurgusu |

## Sık yapılan değişiklikler

**İletişim bilgisini değiştirmek:** `assets/js/main.js` en üstteki `CONTACT` nesnesi.
E-posta kaynakta düz yazılmaz, iki parçadan birleştirilir. Bağlantılar kapanış bölümünde görünür.

**Metin değiştirmek:** Türkçesi `index.html` içinde (yorum etiketleri: `BÖLÜM 1` ... `BÖLÜM 7`),
İngilizcesi `assets/js/i18n.js` içinde aynı `data-i18n` anahtarıyla. Yeni metin eklerken ikisine de yaz.

**Dil:** sağ üstteki TR / EN. Seçim tarayıcıda hatırlanır; `?lang=en` ile doğrudan İngilizce açılır.

**Kariyer yolculuğu:** `assets/js/main.js` > `TIMELINE`. Tarihler LinkedIn profilinden alındı.
Ayı bilinmeyen kayıt yalnızca yılla yazılır (`from: '2022'`); P&G VIA böyle, 2022.

**CV'yi güncellemek:** yeni dosyayı `public/cv/Kivanc-Karademir-CV.pdf` adıyla değiştir.

**Paylaşım kartı:** kaynağı `tools/og-card.html`. Değiştirirsen yerel sunucuda 1200x630 pencerede
açıp görüntüsünü `public/og/og-card.jpg` olarak kaydet. LinkedIn eski önizlemeyi önbellekte
tutar; https://www.linkedin.com/post-inspector/ ile yeniletebilirsin.

**Vurgu rengi kuralı:** havuz mavisi yalnızca rakamlarda kullanılır. Bir rakama `class="num"` ver.

**Giriş filmi:** video değil, `assets/js/film.js` her karede canlı çizer. Kaydırma hikâyeyi
ilerletir; kaydırma durunca da kamera nefes alır, düğümler süzülür, ağda ve sütunlarda ışık akar;
kaydırma hızı kamerayı ileri (aşağı) ya da geri (yukarı) atar. Sahne verisi, kamera ve izdüşüm
`tools/film.swift` ile birebir aynıdır (aynı tohum): birini değiştirirsen diğerini de güncelle ve
afiş karelerini yeniden üret. Sahne metinlerinin aralıkları `assets/js/main.js` > `SCENES`
(0 = başlangıç, 1 = son). Donanım yetişmezse film kendini kademeli sadeleştirir.

**Afiş karelerini yeniden üretmek** (Xcode Komut Satırı Araçları yeterli):

```bash
swiftc -O tools/film.swift -o tools/.film
tools/.film posters public/video
```

## Test kancası

`http://127.0.0.1:4500/?qa` açılış perdesini atlar; `window.__kk.apply(p)` filmin istenen
noktadaki metin durumunu, `__kk.lang('en')` dili, `__kk.play(x, y)` kapanış cümlesinin dağılmasını
uygular, `__kk.film(p, hız)` filmi istenen anda (hız: -1 yukarı, 1 aşağı kaydırma) çizer,
`__kk.net('opt')` canlı ağın görünümünü değiştirir. Görsel kontrol içindir.
