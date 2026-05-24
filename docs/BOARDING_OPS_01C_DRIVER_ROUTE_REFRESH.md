# BOARDING-OPS-01C - Applied boarding change → driver route refresh + mobile route update

## Amaç
- `BOARDING-OPS-01B` ile günlük atamaya işlenmiş boarding change etkisini sürücü yüzeylerinde görünür hale getirmek.
- Bu adımda amaç görünürlük ve güvenli route-refresh sinyalidir; kalıcı rota veya atama değişimi yoktur.

## Kapsam
- `Driver / Bugün`
- `Driver / Rota`
- Gerekirse `Company / Operasyon Paneli`, `School / Operasyon Paneli`, `Room / Operasyon Sağlığı` üzerinde sadece status görünürlüğü.
- Harita yüzeyi bu milestone için zorunlu değildir.

## Desteklenen change türleri
- `NO_SERVICE_TODAY`
- `ALTERNATE_STOP_TODAY`
- `TEMPORARY_BOARDING_NOTE`

## Görünürlük sözleşmesi
- Sürücü ekranında günlük değişiklik etiketi görünür.
- Route refresh durumu `bekliyor`, `görünür` veya `not-only` gibi güvenli etiketlerle okunur.
- `Sürücü rotası yenilenmedi` / `Sürücü rota ekranında görünür` gibi sınır dili korunur.

## Yasaklar
- SMS yok.
- Push notification yok.
- Payment / settlement execute yok.
- Kalıcı rota / durak / personel ataması değişmez.
- Schema / migration yok.
- Runtime-data write yok.

## Milestone ayrımı
- `BOARDING-OPS-01A`: readonly route impact preview.
- `BOARDING-OPS-01B`: accepted change → günlük atama etkisi.
- `BOARDING-OPS-01C`: günlük atama etkisinin driver yüzeyinde güvenli görünürlüğü.
