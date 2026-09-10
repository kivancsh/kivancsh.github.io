# CLAUDE.md

## Proje

- Kıvanç Karademir'in kişisel kariyer sitesi
- Depo: `kivancsh.github.io`. GitHub Pages, `main` dalına push edilince `https://kivancsh.github.io` adresinde herkese açık yayına girer

## Yapı

- Derleme adımı yok: düz HTML, CSS, JS
- `index.html`: sayfanın tamamı ve bütün metinler (bölüm etiketleri `BÖLÜM 1` ... `BÖLÜM 6`)
- `assets/css/main.css`: renk ve ölçü jetonları (`:root`), bölümler, mobil düzen
- `assets/js/main.js`: koreografi. Üstte `CONTACT` (iletişim) ve `SCENES` (film zaman çizelgesi)
- `assets/js/scrollcraft.js`, `assets/css/scrollcraft.css`: kaydırma motoru, değiştirilmez
- `public/video/`: `hero.mp4` (1920x1080), `hero-mobile.mp4` (720x1280), afiş kareleri
- `public/img/`: portre, `public/logos/`: şirket logoları
- `tools/*.swift`: filmi, logoları ve paleti üreten araçlar (makinede node ve ffmpeg yok, Swift var)
- `docs/`: brief, tasarım DNA'sı, sahne kurgusu
- `.nojekyll`: GitHub Pages dosyaları olduğu gibi sunsun

Yerel önizleme (yalnızca bu bilgisayardan erişilir):

```bash
python3 -m http.server 4500 --bind 127.0.0.1
```

## Renk kuralı

- **Vurgu rengi (havuz mavisi) SADECE sayısal değerlerde kullanılır**: `.num` sınıfı
- Başlıkta, bağlantıda, çizgide, zeminde kullanılmaz
- Amaç: gözün doğrudan rakamlara gitmesi

## Metin kuralları

- Bölüm başlıkları birebir: Hakkımda, Stajlar, Eğitim Programları, İş Tecrübeleri
- Görünür metinde uzun tire (— ya da –) kullanılmaz; tarih aralıkları kısa tireyle (2023-2024)
- Film metinleri `SCENES` aralıklarına bağlıdır; video değişirse aralıklar da güncellenir
- E-posta kaynakta düz yazılmaz; `CONTACT` içinde iki parçadan birleştirilir

## Kurallar

- **Push yapmadan önce mutlaka onay al.** Push, siteyi herkese açık yayına sokar
- Commit atmak serbest, push ayrı bir karardır
- `.DS_Store` ve `tools/` altındaki derlenmiş araçlar `.gitignore` içinde
