# BOARDING-CHANGE-REQUEST-ENTRY-01

Tarih: 2026-05-25
Repo: `servis-platform`

## Personel talep girişi
Personel ve Veli tarafında biniş / durak değişikliği talebi oluşturma arayüzü eklenir. Bu milestone sadece talep girişini ve talep durum takibini kapsar. Rota otomatik uygulanmaz, driver route refresh çalışmaz, Room kabul/red vermez.

- Bugün binmeyeceğim
- Aynı rota üzerindeki başka duraktan bineceğim
- Farklı konumdan alınmak istiyorum

Farklı konumdan alınmak istiyorum akışında üç güvenli seçenek vardır:

- Konumumu al
  - Tarayıcı geolocation izni ister.
  - İzin verilmezse güvenli fallback görünür.
- Büyük haritada konum seç
  - Harita açılır, pin seçilir, sonra forma aktarılır.
- Adresten konum bul
  - Mevcut geocode proxy kullanılır.
  - Geocode bağlı değilse güvenli fallback görünür.

Same-route / aynı rota üzerindeki başka durak talebinde serbest pin kullanılmaz; yalnızca rota üzerindeki durak listesi kullanılır.

KVKK dili:
- Bu konum sadece bu biniş değişikliği talebi için kullanılır.

## Veli / Parent talep girişi
Veli / Parent tarafında çocuk bağlamı ile aynı boarding request giriş akışını kullanır.

- Çocuğum bugün binmeyecek
- Çocuğum başka duraktan binecek
- Çocuğum şu konumdan alınsın

Parent tarafında da aynı üç güvenli seçenek görünür ve çocuk context korunur.

## Talep tipleri
- `NO_SHOW`
- `DIFFERENT_STOP`
- `PICKUP_FROM_LOCATION`

## Karar sahibi kuralı
- Same-route => Driver
- Non-same-route => Company / School / Organization
- Room sadece görür
- Readonly önizleme

## Durum ve görünürlük
- Talep alındıktan sonra durum ve karar sahibi görünür.
- Same-route ise "Sürücü onayı bekleniyor." görünür.
- Non-same-route ise "Firma/Okul/Kurum onayı bekleniyor." görünür.
- Talep alındıktan sonra rota otomatik uygulanmaz.

## Rota etkisi sınırı
- Rota uygulanmaz
- Sürücü rotası yenilenmez
- Bildirim gönderilmez
- SMS / push yok
- Ödeme / tahsilat / fatura yok
- Ceza / yaptırım yok
- Kalıcı assignment / stop / route değişikliği yok

## Harita / text fallback
- Koordinat varsa mini harita veya konum özeti gösterilir.
- Koordinat yoksa metinsel fallback gösterilir.
- Konum izni verilmezse büyük harita veya adres fallback gösterilir.
- Geocode henüz bağlı değilse güvenli fallback görünür.
- Veri yetersizse nedenli empty state görünür.

## Out-of-scope
- Personel / Veli için yeni boarding talep oluşturma dışında yeni business flow yok
- Prisma migration yok
- Kalıcı operasyon / route apply yok
- Yeni paralel panel mimarisi yok
- Marketplace / free-to-operate / %1-%3 başarı payı yok

## Check
- `npm run check:boardingchangerequestentry01`
