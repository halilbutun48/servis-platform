# FIELD-LAUNCH-PACK-01 Rollback / No-Go

## No-Go Kriterleri
- Backend health `dbOk` false
- Login / API temel akış fail
- Super Admin operasyon ekranı açılmıyor
- Oda / Firma vardiya görünmüyor
- Sürücü görev göremiyor
- Copilot teknik / raw / write / execute dili gösteriyor
- KVKK / rol boundary ihlali var
- Hakediş ekranında aktif ödeme veya settlement aksiyonu görünmesi
- GPS kaynak dili yanlış veya güven bozucu

## Rollback Yaklaşımı
- Son tag’e dönülür.
- Demo veri değiştirilmeden kanıt toplanır.
- `backend/artifacts/runtime-data` dosyaları commit’e alınmaz.
- Runtime-data değişiklikleri stage edilmez.
- DB reset kararı ayrı onaya bağlanır.

## Saha / Pilot Stop Kararı
- Bir no-go kriteri PASS dışı ise launch durur.
- Bir kritik rol boundary ihlali launch'u durdurur.
- Tek başına teknik görünüm eksikliği BLOCKED sayılabilir; veri/rol ihlali FAIL sayılır.

## Kanıt Toplama Notu
- Hata ekranı
- Son çalışır ekran
- Ekran adı
- Seçili kayıt
- Tarih / saat
- Rol
- Kısa açıklama

## Teknik Güvenlik Notu
- Aktif ödeme yok.
- Settlement execute yok.
- `Sürücünün telefon GPS’i` ve `Araç GPS’i` dili korunur.
- `agreement` görünür dilde kullanılmaz; `sözleşme` kullanılır.
- `runtime-data` commit’e alınmaz.

