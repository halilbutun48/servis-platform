# #4 Araç Planı ve Kapasite Referansı

Bu sözleşme #4 düşük-girdili maliyet senaryosu preview akışının kapasite ve araç-planı referansıdır. Yeni bir maliyet hesabı oluşturmaz; her MINIBUS, MIDIBUS ve OTOBUS adayını mevcut `buildOperationalCostModel` üzerinden preview eder.

## Yetki ve güvenlik

Kapasite önceliği:

1. Seçili araç veya actual kapasite
2. Kanonik araç modeli kapasitesi
3. Sürümlü teknik sınıf referansının güvenli alt sınırı
4. Açık `NO_DATA`

Araç sayısı `ceil(kişi sayısı / kapasite)` ile hesaplanır. Kapasite kanıtı yoksa aday maliyeti ve öneri uydurulmaz. Eşzamanlı araç başına bir sürücü gereksinimi türetilebilir; sürücü maliyeti ve bakım maliyeti ise ayrıca kanıtlanmadıkça eksik kalır.

Sözleşme sürümü: `SEFERPAKT-VEHICLE-PLAN-REFERENCE-V1`

Birim: `PERSONS_PER_VEHICLE`

## Sınıf referansları

| Sınıf | Kaynaklı güvenli kapasite tabanı | Teknik kaynak | Sınır |
| --- | ---: | --- | --- |
| MINIBUS | 10 kişi/araç | [Ford Transit Minibüs teknik broşürü](https://www.ford.com.tr/getmedia/8595b24b-d82e-4e35-8df9-a5677ed8adfe/transit-minibus-2018-temmuz-teknik-brosur.pdf.aspx?ext=.pdf) | Broşürde 10+1, 14+1 ve 17+1 örnekleri bulunur; gerçek model/yerleşim doğrulanmalıdır. |
| MIDIBUS | 25 kişi/araç | [Otokar Sultan Comfort teknik broşürü](https://commercial.otokar.com.tr/OtokarTicari/media/Otokar-Ticari/brosur/SULTAN-COMFORT-EURO6-KS62TP-21-onizleme.pdf) | Broşürde 25+1, 27+1+1 ve 29+1 yerleşimleri bulunur; gerçek araç doğrulanmalıdır. |
| OTOBUS | 44 kişi/araç | [MAN Lion’s Coach resmi teknik verileri](https://www.man.eu/mea/en/bus/coaches/the-man-lion_s-coach/technology-and-specifications/man-lion_s-coach-technical-data.html) ve [resmi araç tanımı](https://press.mantruckandbus.com/france/download/59a75bd2-b10f-4dd3-8d0a-ac9954dce372/man-lion039s-coach-vehicle-description-en.pdf) | Resmi MAN örnekleri 44–61 koltuk aralığı gösterir; alt tip bilinmediğinde 44 güvenli alt sınır olarak kullanılır. |

Bu sınıf değerleri evrensel gerçek veya seçili filonun actual kapasitesi değildir. Actual veya kanonik kapasite geldiğinde teknik tabanın önüne geçer.

## Alternatif planı

Her aday aynı rota, gün, para birimi ve #2 bölgesel yakıt fiyatı bağlamını kullanır; yalnız kapasiteye göre araç sayısı, aday sınıfın sürümlü tüketim referansı ve buna bağlı yakıt/maliyet etkisi değişir. Eksik sürücü veya bakım maliyeti karşılaştırmayı durdurmaz; aday `PARTIAL` olarak gösterilir ve şu açıklama korunur:

> Bu karşılaştırma sürücü ve bakım maliyetleri dahil edilmeden hesaplandı.

Öneri, yalnızca kapasite uygunluğu ve mevcut hesaplanabilir maliyet kanıtı bulunduğunda üretilir. Kapsam kısmi ise etiket `Operasyonel olarak önerilen` olur; tam maliyet açısından “en iyi” iddiası üretilmez. Tüm sonuçlar `previewOnly`, `notPersisted` ve `noLiveMutation` sınırında kalır.
