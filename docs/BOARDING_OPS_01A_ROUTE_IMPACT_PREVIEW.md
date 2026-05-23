# BOARDING-OPS-01A - Boarding change readonly route impact preview

Tarih: 2026-05-23  
Kapsam: günlük biniş değişikliklerinin rota etkisini güvenli, readonly ve uygulamasız olarak önizleme.

## Amaç
- Bugün servise binmeyecek kişi, farklı duraktan binecek kişi ve geçici biniş notu gibi değişikliklerin rota etkisini görünür kılmak.
- Kişi, durak, km, süre ve kapasite etkisini tek preview kartında okumak.
- Değişiklik uygulamamak; yalnızca önizlemek.

## Bu milestone ne yapar?
- `NO_SERVICE_TODAY` değişikliğini readonly önizler.
- `ALTERNATE_STOP_TODAY` değişikliğini readonly önizler.
- `TEMPORARY_BOARDING_NOTE` değişikliğini readonly önizler.
- Mevcut kişi sayısı ile önizleme kişi sayısını karşılaştırır.
- Mevcut durak sayısı ile önizleme durak sayısını karşılaştırır.
- Mevcut km, önizleme km, km farkı, süre farkı ve kapasite etkisini gösterir.
- Güvenilirlik notu üretir.

## Bu milestone ne yapmaz?
- `StopAssignment` oluşturmaz ya da güncellemez.
- Route refresh başlatmaz.
- Rota uygulamaz.
- Bildirim veya SMS göndermez.
- Kabul / red / onay write action yapmaz.
- Ödeme / settlement execute etmez.

## Güvenli dil
- GPS güncel değilse kesin ETA gösterilmez.
- ETA hesaplanamıyorsa `ETA hesaplanamıyor` kullanılır.
- ETA güncel değilse `ETA güncel değil` kullanılır.
- Şüpheli veya aşırı yüksek değerler kesin bilgi gibi sunulmaz.
- UI ve Copilot cevabı şu sınırı açıkça söyler: `Bu sadece önizlemedir. Rota/atama uygulanmadı.`

## UI bağlamı
- Company / Operasyon Paneli
- Company / Vardiyalar
- School / Operasyon Paneli
- Room / Operasyon Sağlığı veya Room / Vardiyalar gerektiğinde görünürlük desteği
- Parent / Canlı Takip ve Personel / Canlı Takip gerekirse readonly bilgi

## Copilot bağlamı
- Sefer Abi yalnızca readonly yorum yapar.
- Sorular, değişiklik türünü ve rota etkisini açıklar.
- Önizleme, uygulama veya gönderim başlatmaz.

## Sonraki milestone'lar
- `BOARDING-OPS-01B`: accepted change -> `StopAssignment`
- `BOARDING-OPS-01C`: driver route refresh

## Kısa smoke notu
- Önizleme kartında kişi, eski durak, yeni/geçici durak, km farkı, süre farkı, kapasite ve güvenilirlik görünür.
- `Uygula`, `Kaydet`, `Gönder`, `SMS`, `StopAssignment`, `Route refresh` gibi yazma dilinin görünmemesi gerekir.
