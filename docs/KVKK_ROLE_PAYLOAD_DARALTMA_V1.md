# KVKK ROLE PAYLOAD DARALTMA V1

## Amaç
Bu belge M77.4 altında maskelemeden bir adım ileri gidip bazı response yüzeylerinde ham kişisel alanların hiç dönmemesini tanımlar.

## Kapsanan yüzeyler
- `GET /api/auth/invites`
- `POST /api/auth/invites`
- `GET /api/vehicles`
- `GET /api/shifts`
- `GET /api/shifts/:id`
- `GET /api/logs/preview`
- `GET /api/logs/export`
- `GET /api/admin/logs/export`

## Temel kural
- `ROOM` ve `SUPER_ADMIN` operasyon gereği bazı exact alanları görmeye devam edebilir.
- `COMPANY`, `DRIVER`, `PERSONEL`, `PARENT` ve school-domain yüzeylerinde ham kişi iletişim verisi mümkün olduğunca dönmez.
- Mümkün olan yerde `phoneMasked`, `emailMasked` gibi türetilmiş alan verilir.

## Auth invite listesi
- ham `email` ve `phone` list yüzeyinde korunmaz
- `tokenHash` response'a hiç dönmez
- `createdBy.email` ve `consumedBy.email` exact yerine masked görünür
- `SUPER_ADMIN` için exact email gerektiğinde ayrı kontrollü yüzey düşünülür; liste yüzeyi varsayılan güvenli görünüm taşır

## Araç listesi
- `GET /api/vehicles` role göre sanitize edilir
- `gpsLast.lat/lng` exact / masked / hidden ayrımı aynen korunur
- company/driver/personel tarafında `driver.phone`, `driver.user.email`, `driver.userId`, `driverCode`, `pinTemporary`, `deviceInfo` gibi alanlar taşıt listesi yüzeyinde gereksizse dönmez
- room tarafında operasyon ihtiyacı olan exact görünüm korunabilir

## Vardiya listesi ve detay
- `GET /api/shifts` ve `GET /api/shifts/:id` role göre driver iletişim alanı daraltır
- company tarafında sürücü adı görülebilir; açık telefon/e-posta response yüzeyinde zorunlu değildir
- operation-events actor label email fallback ile oluşsa bile masked görünür

## Log/export sertleştirmesi
- preview/export hedef etiketi email geçirse bile redacted görünür
- admin export audit meta içindeki `emailContains` ve `ipContains` gibi filtreler sanitize edilerek audit'e yazılır
- preview ve export aynı redaction mantığına bağlı kalmalıdır

## Not
Bu belge final hukuki metin değil; role/payload response yüzeyini daraltan teknik enforcement rehberidir.
