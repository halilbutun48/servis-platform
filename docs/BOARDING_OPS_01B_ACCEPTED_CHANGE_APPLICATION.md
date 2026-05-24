# BOARDING-OPS-01B - Accepted boarding change → StopAssignment güvenli uygulama taslağı

Tarih: 2026-05-23

## Amaç
- 01A readonly önizlemesinden geçen kabul edilmiş boarding change kaydını, kullanıcı onayıyla ve dar kapsamda günlük `StopAssignment` etkisine bağlamak.
- Kalıcı personel / öğrenci atamasını değil, sadece ilgili gün / shift bağlamını etkilemek.

## Kapsam
- `Company / Operasyon Paneli`
- `Company / Vardiyalar`
- `School / Operasyon Paneli`
- `Room / Operasyon Sağlığı`
- `Room / Vardiyalar` görünürlük desteği

## Desteklenen change türleri
- `NO_SERVICE_TODAY`
- `ALTERNATE_STOP_TODAY`
- `TEMPORARY_BOARDING_NOTE`

## Uygulama yolu
- Kabul edilmiş kayıt `POST /api/requests/:id/apply-boarding-change` üzerinden işlenir.
- Uygulama öncesi 01A route impact preview tekrar kontrol edilir.
- İşlem idempotent çalışır ve audit log üretir.

## Etki modeli
- `NO_SERVICE_TODAY`: ilgili shift için günlük stop assignment etkisi oluşturur; kalıcı atama kapsamını değiştirmez.
- `ALTERNATE_STOP_TODAY`: ilgili gün / shift için geçici durak etkisi oluşturur; kalıcı durak değiştirmez.
- `TEMPORARY_BOARDING_NOTE`: gerekiyorsa not / audit olarak kalır; yanlış stop assignment üretmez.

## Güvenli sınır
- Driver route refresh yok.
- SMS / notification yok.
- Payment / settlement execute yok.
- Schema / migration yok.
- Runtime-data dosyalarına dokunulmaz.
- Otomatik toplu uygulama yok.

## Copilot / Sefer Abi
- Sefer Abi bu akışta yalnızca kabul edilmiş değişikliğin günlük atamaya işlenebilir olduğunu söyler.
- `Bu işlem sürücü rotasını yenilemez.` sınırı korunur.
- `BOARDING-OPS-01C` sürücü route refresh için sonraki adımdır.

## Sonuç
- 01B, 01A önizleme ile 01C route refresh arasında güvenli ve dar bir uygulama köprüsü kurar.
- Ürün/business flow sadece kabul edilmiş değişikliğin günlük atama etkisini yazacak kadar dar tutulur.
