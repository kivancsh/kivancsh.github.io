# CLAUDE.md

## Proje

- Kıvanç Karademir'in kişisel portföy sitesi
- Depo: `kivancsh.github.io` — GitHub Pages, push edilince `https://kivancsh.github.io` adresinde herkese açık yayına girer

## Yapı

- Tek dosya: `index.html` — HTML, CSS ve JavaScript hepsi içinde
- Dış bağımlılık yok: CDN, harici font, kütüphane kullanılmaz
- Yazı tipleri sistem sans-serif ailesinden gelir (serif kullanılmaz)
- `profil.jpg` — üst bölümdeki dairesel portre
- Renkler ve ölçüler `:root` içindeki değişkenlerde toplanır

## Renk kuralı

- **Vurgu rengi (`--vurgu`, elektrik mavisi) SADECE sayısal değerlerde kullanılır**
- Başlıkta, bağlantıda, çizgide, ikonda, zeminde kullanılmaz
- Amaç: gözün doğrudan rakamlara gitmesi
- Kural tek bir sınıfta toplandı: `.sayi` — rakama bu sınıfı ver, rengi kendi gelir
- Şu an vurgulu olanlar: metrik rakamları, bölüm numaraları (01–05), proje yılları, sonuç rakamları, alt bilgideki yıl

## Bölüm yorum etiketleri

`index.html` içinde arayarak ilgili bölüme gidebilirsin:

| Etiket | İçerik |
|---|---|
| `BÖLÜM 1 — ÜST BÖLÜM + METRİKLER (İLK EKRAN)` | Fotoğraf, ad, tanıtım cümlesi, üç metrik |
| `METRİKLER —` | Üç metriğin rakam + açıklamaları |
| `BÖLÜM 2 — HAKKIMDA` | İki paragraf biyografi |
| `BÖLÜM 3 — PROJELER` | Proje listesi |
| `PROJE 1` / `PROJE 2` / `PROJE 3` | Tek tek projeler: ad / problem / yaptığım / sonuç |
| `BÖLÜM 4 — VİDEO` | 16:9 YouTube gömme alanı |
| `BÖLÜM 5 — YETKİNLİKLER` | Yetkinlik grupları |
| `YETKİNLİK GRUBU 1 — ANALİZ` | Analiz maddeleri |
| `YETKİNLİK GRUBU 2 — SÜREÇ` | Süreç maddeleri |
| `YETKİNLİK GRUBU 3 — SATIŞ` | Satış maddeleri |
| `BÖLÜM 6 — İLETİŞİM` | E-posta ve LinkedIn |
| `VURGU KURALI` | CSS'teki `.sayi` sınıfı ve renk kuralı |

Tek yerden düzenlenen ayarlar (sayfa altındaki script bloğunda):

- `VIDEO_KIMLIGI` — YouTube video kimliği, boşken sayfada boş çerçeve görünür
- `kullanici` / `alan` — e-posta adresi; kaynakta düz yazılmaz, tarayıcıda parçalardan birleştirilir

## Kurallar

- **Push yapmadan önce mutlaka onay al.** Push, siteyi herkese açık yayına sokar
- Commit atmak serbest, push ayrı bir karardır
- `.DS_Store` `.gitignore` içinde, commit'lenmez
- Yer tutucu metinlerde `yer-tutucu` sınıfı vardır; gerçek içerik yazılınca bu sınıf silinir

## Durum

- Tasarım hazır: palet, tipografi, boşluk düzeni, mobil uyum tamam
- **İçerik eksik** — hepsi hâlâ yer tutucu:
  - Metrik rakamları ve açıklamaları (`XX`)
  - Tanıtım cümlesi ve Hakkımda paragrafları
  - Proje adları, problem/yaptığım satırları, sonuç rakamları, yıllar
  - Video kimliği (`VIDEO_KIMLIGI` boş)
  - Yetkinlik maddeleri
  - E-posta adresi ve LinkedIn bağlantısı
