# Brief ve sahne kurgusu

> Kaynak: kullanıcının 10 Eylül 2026 tarihli isteği (İngilizce prompt + Türkçe içerik).
> Yaratıcı yön açıkça devredildi ("original premium website", "keep it original").
> Aşağıdaki kararlar bu devir altında verildi; içerik metinleri kullanıcıya aittir.

## 1. Referans analizi: landonorris.com (design-dna)

Sayfanın hesaplanmış stilleri tarayıcıda okundu (ölçüm, göz kararı değil):

| Özellik | Değer |
|---|---|
| Zemin / mürekkep | `#282C20` zeytin-siyah, `#F4F4ED` kırık beyaz |
| Vurgu | `#D2FF00` asit limon |
| Yazı | Mona Sans Variable (genişlik ekseni), Brier (vurgu) |
| Manifesto satırı | 105.8px / 95.25px, ağırlık 400, tracking -0.83px, büyük harf |
| Başlık | 93px, ağırlık 700, tracking -3.3px |
| Mikro etiket | 8.3px büyük harf (başlıkla ~12x ölçek farkı) |
| Gövde | 16.7px / 20.8px |
| Ritim | 900px'lik tam ekran bölümler, 3143px'lik pinli yatay şerit, 13.578px toplam |
| Hareket | yumuşak kaydırma, satır satır maskeli açılım, WebGL (21 canvas), marquee |

Alınan: devasa tipografi ile küçük metin arasındaki ölçek kontrastı, satır maskeleri,
tam ekran bölüm ritmi, pinli yatay şerit, akıcı kaydırma, koyu ve açık zeminler arası geçiş.
Alınmayan: renkler, fontlar, 3B kask, marquee, büyük harf manifesto.

## 2. Yön (frontend-design + design-taste-frontend)

**Okuma:** Türkiye'deki işe alımcı ve yöneticiler için kişisel kariyer sitesi; sinematik,
editoryal bir kaydırma anlatısı; yerli HTML/CSS/JS, kaydırmayla oynatılan video,
değişken genişlikli grotesk tipografi.

**Kadranlar:** DESIGN_VARIANCE 7 · MOTION_INTENSITY 8 · VISUAL_DENSITY 3

**Palet (portreden ölçüldü, `tools/palette.swift`):**

| Rol | Hex | Kaynak |
|---|---|---|
| Gece (film zemini) | `#0F1523` | takım elbise, ölçülen `#10121B` |
| Kağıt (sayfa zemini) | `#EAF0F2` | gömlek ve sabah göğü |
| Mürekkep | `#0F1523` | takım elbise |
| Havuz (yalnızca rakamlar) | `#1A7FAE` / gece üstünde `#7CCBF2` | havuz, ölçülen `#1880AA`, `#459ACD` |
| İkincil metin | `#4F5B69` / `#93A0AE` | |

Kural (eski sitenden devralındı): vurgu rengi **sadece sayısal değerlerde**.

**Tipografi:** Archivo, tek aile. Başlıklar `font-stretch: 70-75%`, ağırlık 800;
rakamlar `font-stretch: 116-118%`, ağırlık 250-280. Aynı ailenin iki ucu kimliği taşır.

**Reddedilen varsayılanlar ve nedenleri:**
- Koyu zemin + tek parlak vurgu (asit yeşil / vermilyon): yapay zekâ klişesi. Yerine:
  portreden gelen gece/gündüz ikiliği ve yalnızca rakamlara ayrılmış havuz mavisi.
- Krem zemin + serif: klişe. Yerine: soğuk kağıt + tek grotesk aile.
- Büyük harfli, mono, aralıklı küçük etiketler; `·` ayraçlar; `—`: hiç kullanılmadı.

## 3. Sekiz soru (scroll-craft, devredilmiş yaratıcı yön)

1. **Hava:** sakin, kararlı, veri kokan, gece yarısından sabaha. Referanslar: landonorris.com
   (tempo), bir havuz kenarı sabahı (renk), bir performans panosunun yükselen eğrisi.
2. **Yolculuk:** isim → temel soru → satış, insan, veri, teknoloji → hedeften fazlası →
   %62 → sürekli daha iyisi → Hakkımda → Stajlar → Eğitim Programları → İş Tecrübeleri → kapanış.
3. **Enerji:** sakin açılış, soruda gerilim, ağda genişlik, eğride doruk, sonra sakin gün ışığı.
4. **Duygu ve tek an:** aşağıdaki eğri. Tek an: *dağınık cümlenin kendini düzeltip ışık
   çizgisinin üstüne oturması.*
5. **Başka hiçbir sitede olmayan şey:** cümle, sahibinin sorduğu soruyu kendine uygular.
6. **Premium-minimalden uzaklık:** editoryal-minimal, sinematik.
7. **Tek dünya mı, sahneler mi:** girişte tek kesintisiz film, sonra bölümler.
8. **Varlıklar:** portre (`Me.jpg`), 11 logo. Proje klasöründe video yoktu; hikâyeye göre
   kurgulanan film `tools/film.swift` ile üretildi.

## 4. Duygu eğrisi

| Perde | Duygu | Ekranda nedeni |
|---|---|---|
| Işık | merak | gecede tek bir ışık çizgisi, üstünde isim |
| Soru | huzursuzluk, sonra rahatlama | izler gürültüye dağılır; cümle dağınık, sonra kendini düzeltir |
| Ağ | genişlik | 70 parlak düğüm, 300 soluk nokta; kamera ağın içinden geçer |
| Veri | odak | noktalar sütunlara ve zemin ızgarasına dizilir |
| Eğri | **zirve: coşku** | eğri dikleşir, sayaç %62'ye çıkar, kamera geri çekilip bütünü gösterir |
| Şafak | ferahlık | ışık açılır, kare sayfanın zeminine döner; açılıştaki çizgi gün ışığında |
| Hakkımda | güven | portre maskeden çıkar, siyah-beyazdan renge geçer |
| Stajlar, Eğitim | ritim | tipografik liste ve kademeli logo levhaları |
| İş Tecrübeleri | gurur | Türk Telekom metrikleri yatay şeritte akar |
| Kapanış | çözülme | soru bu kez düzgün dizilmiş, altında kendini çizen tek çizgi |

**Zirve cümlesi:** "Kaydırdıkça eğri yükseliyor ve %62 tam o anda sayıyor."
**Birine anlatma cümlesi:** "Kaydırdıkça sorunun kendini düzelttiği site."

## 5. Skor (cihaz / perde)

| Perde | Cihaz | Neden |
|---|---|---|
| Film (6.4 ekran, mobilde 5) | `scrub` + ufka hizalı metin | kamera okurun elinde; metin videonun oynatma kafasından okunur |
| Hakkımda | `flow` + portre maskesi (bespoke) | kişiyle tanışma: filmin tersine durağan ve yakın |
| Stajlar | `flow` + satır açılımı | yan yana değil alt alta: bir yolculuğun durakları |
| Eğitim Programları | `flow` + kademeli levhalar | aynı düzen tekrar edilmedi |
| Türk Telekom metrikleri | `pan` (masaüstü) | yatay hareket "ölçek" okur; mobilde dikey gruplar |
| Kapanış | `flow` + kendini çizen çizgi | açılıştaki çizginin gün ışığındaki karşılığı |

**İmza hareketi:** Kendini düzelten cümle. "Bunu nasıl daha iyi yapabiliriz?" her kelimesi
farklı genişlik, ağırlık, açı ve konumla girer; filmdeki izler toparlanırken kelimeler sırayla
ideal dizgiye (wdth 75, wght 800) oturur. Kelime kutuları son genişliğe sabitlendiği için satırlar
kaymaz. Hepsi videonun oynatma kafasından hesaplanır; geri kaydırınca cümle yeniden dağılır.

## 6. Masaüstü ve mobil

| | Masaüstü | Mobil |
|---|---|---|
| Video | 1920x1080, 8 karede bir anahtar kare, 5.4 MB | 720x1280 dikey kurgu, 4 karede bir, 2.7 MB |
| Film uzunluğu | 6.4 ekran | 5 ekran |
| Kaydırma | yumuşak tekerlek (lerp) | yerli dokunmatik, motorun oynatma kafası yumuşatır |
| Film metni | sol alt köşe + ufuk çizgisi | alt bant + ufuk çizgisi (ekranın %40'ı) |
| Metrikler | pinli yatay şerit | gruplu dikey liste |
| Portre | yapışkan (sticky), metinle birlikte akar | tam genişlik, normal akış |
| Harf aralığı animasyonu | var (kapanış cümlesi) | yok |

**Hareket azaltılmış:** film pinlenmez, video hiç indirilmez; bir kare görseli üstünde bütün
sahne metinleri okunur halde durur, imza cümlesi düzgün halindedir, sayaçlar son değerindedir.
