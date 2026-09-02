# SAFE-DRIVE-01

Tarih: 2026-06-10
Repo: `servis-platform`

## Amaç
- `M44-TELEMATICS-T1-T5` ve `TELEMATICS-PROVIDER-HUB-01` sonrası readonly safe-drive risk summary / recommendation katmanını sabitler.
- Bu katman yalnızca okur, özetler ve kullanıcıya güvenli kontrol notu verir.
- Kanonik check: `check:safedrive01`
- Komut: `node backend\scripts\safe_drive_01_check.js`

## Güvenli sürüş özeti dili
- `Güvenli sürüş özeti` başlığı kullanılır.
- `Risk sinyali` ifadesi yalnızca kontrol gerektiren canlı sinyaller için görünür.
- `Kontrol edilmeli` ifadesi belirsiz veya eksik sinyaller için görünür.
- `GPS güvenilirliği` canlı, güncel değil, çevrim dışı veya bekleniyor olarak okunur.
- `Hız riski` hız ve hız limiti birlikte okunarak değerlendirilir.
- `Rota ilerleme sinyali` sıradaki durak ve canlı rota durumunu birlikte okur.
- `Kanıt / biniş kaydı durumu` operasyon kanıtı ve biniş kaydı görünürlüğünü toplar.
- `Operasyon kontrol önerisi` kullanıcıyı sıradaki en güvenli okumaya yönlendirir.
- `İnsan onayı gerekir` ifadesi, kontrol kararı insan onayına bırakıldığında görünür.

## Okunan sinyaller
- GPS yaş / canlılık
- Hız ve hız limiti
- Rota ilerleme ve sıradaki durak
- Kanıt / check-in / proof durumu
- Kaynak / provider etiketi

## Readonly sınırı
- Rota uygulanmaz.
- Sürücü/araç ataması değiştirilmez.
- Ödeme/hakediş başlatılmaz.
- Sözleşme bağlanmaz.
- Otomatik yönlendirme verilmez.
- Bu katman yalnızca read-only güvenli kontrol bandıdır.

## Kullanılan yüzeyler
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/driver/MapPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/shared/SafeDriveSummaryCard.jsx`
- `web/src/utils/safeDriveSummary.js`

## Milestone zinciri
- `M44-TELEMATICS-T1-T5`
- `TELEMATICS-PROVIDER-HUB-01`
- `SAFE-DRIVE-01`
- `OFFER-RANKING-QUALITY-01`

## Notlar
- Bu katman ceza, yaptırım, otomatik disiplin, otomatik yönlendirme veya otomatik atama akışları açmaz.
- Bu katman route apply, driver/vehicle assignment change, payment/settlement execute veya contract execute başlatmaz.
- Kullanıcıya sadece görünür kontrol önerisi sunar.
