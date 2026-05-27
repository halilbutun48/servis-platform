# SEFER ABI TERMINAL HUMANIZE 01

## Problem
Sefer Abi Terminali ve sağ alt Sefer Abi drawer içinde teknik, İngilizce, internal ve debug ağırlıklı metinler kullanıcıyı yoruyor. Kullanıcı ham alan adları, enumlar veya payload benzeri teknik ifadeleri okumak zorunda kalmamalı. Ana görünüm, geliştirici konsolu gibi değil operasyon yorumlayıcı paneli gibi görünmeli.

## Hedef Dil
- Sade Türkçe
- Rol bazlı
- Operasyon odaklı
- Teknik değil, açıklayıcı
- Kısa ve net

Rol dili örnekleri:
- Company / School / Organization: firma/okul/kurum onayı, servis ihtiyacı, teklif değerlendirme, sözleşmeye dönüştürme, kaynak zinciri, başarı payı önizleme
- Room: tedarikçi dili, araç/sürücü/kapsam, teklif verme, kapasite ve rota uygunluğu
- Dispatch / Operasyon: atama, araç/sürücü uygunluğu, operasyon riski, eksik atama
- Driver: kısa, saha odaklı, bugünkü görev, ilk durak, rota, biniş talebi, gecikme riski
- Parent / Personel: çok sade, servis nerede, talebim kimde, canlı araç görünmüyor, farklı durak/konum talebi
- Super Admin: biraz daha detaylı olabilir ama yine Türkçe ve açıklamalı

## Analiz Formatı
Önemli cevaplarda mümkün olduğunca şu yapı korunur:

1. Durum:
Kısa özet.

2. Ne anlama geliyor?
Kullanıcı dilinde açıklama.

3. Etki / risk:
Operasyon etkisi.

4. Sıradaki doğru işlem:
Kullanıcı ne yapmalı?

5. Güvenli sınır:
Gerekiyorsa kısa sınır cümlesi.

Örnek güvenli sınır cümleleri:
- Bu ekran işlem başlatmaz.
- Bu ekran ödeme yapmaz.
- Bu ekran rota uygulamaz.
- Bu ekran yalnızca önizleme verir.

## Teknik Ayrıntı Standardı
Teknik detay gerekiyorsa ana cevabın içinde değil, kapalı veya ikincil bir bölümde gösterilir.
- `Teknik ayrıntılar`
- `Gelişmiş ayrıntılar`
- `İsteğe bağlı teknik bilgi`

Varsayılan kullanıcı görünümünde açıklayıcı Türkçe özet bulunur. Ham alan adları gerekiyorsa yalnızca bu ikincil alanda kalır.

## Yasak / Azaltılacak Raw Teknik Kelimeler
Ana görünümde mümkün oldukça azaltılacak ifadeler:
- payload
- token
- hash
- debug
- internal
- enum
- fallback
- stale
- null
- undefined
- OperationProof
- sourceConfidence
- previewOnly
- payableNow
- canCollect
- canInvoice
- raw
- JSON
- technical

Gerektiğinde bu ifadeler kapalı teknik ayrıntılar bölümünde kalabilir. Ana metin yine sade Türkçe olmalıdır.

## Beklenen Dil Dönüşümleri
- `GPS STALE` -> `GPS güncel değil`
- `OFFLINE` -> `Bağlantı yok / canlı veri yok`
- `ETA unreliable` -> `ETA güvenilir değil`
- `INSUFFICIENT_LINEAGE` -> `Kaynak zinciri eksik`
- `EXISTING_IMPORTED` -> `Mevcut/taşınmış sözleşme`
- `SEFERPAKT_NEW` -> `SeferPakt kaynaklı yeni sözleşme`
- `SEFERPAKT_RENEWAL` -> `SeferPakt kaynaklı yenilenen sözleşme`
- `previewOnly true` -> `Sadece önizleme`
- `payableNow false` -> `Şu anda ödeme başlatılamaz`
- `canInvoice false` -> `Fatura oluşturulmaz`
- `canCollect false` -> `Tahsilat yapılmaz`
- `sourceConfidence HIGH` -> `Kaynak güveni yüksek`
- `decisionOwner` -> `Karar sahibi`
- `driverOwned` -> `Sürücü onayı gerekir`
- `companyOwned` -> `Firma/okul/kurum onayı gerekir`
- `fallback` -> `Yedek değerlendirme`
- `proofMissing` -> `Kanıt eksik`
- `routeImpact` -> `Rota etkisi`
- `qualityRisk` -> `Kalite riski`

## Out-of-scope
- AI runtime kararını değiştirmek
- Intent routing davranışını genişletmek
- Business action açmak
- Yeni API endpoint eklemek
- Prisma migration yapmak
- Payment/fatura/tahsilat/ceza/rota uygulama iddiası eklemek
- Runtime-data dosyalarına dokunmak
- `.env` dosyalarına dokunmak

## Kapsanan Yüzeyler
- Sefer Abi Terminali
- Sağ alt Sefer Abi drawer
- Analiz / risk / kanıt / operasyon yorumları
- Copilot facts görünür metinleri
- AI cevap composer metinleri
- Starter chip / quick action metinleri
- Error / fallback metinleri
- Marketplace / source lineage / ETA / GPS / boarding / payment preview cevapları

## Not
Bu standart, kullanıcıyı teknik veri okumaya zorlamadan operasyon kararını anlamasına yardımcı olmak için yazılmıştır. Teknik bilgi gerekiyorsa ikincil alanda tutulur, ana cevap sade kalır.
