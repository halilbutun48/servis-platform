# KVKK ROLE PAYLOAD DARALTMA V1

## Amaç
Bu belge M77.4 altında bazı response yüzeylerinde ham kişisel alanların hiç dönmemesini ve yeni Veli Erişimi akışında gereksiz iletişim verisinin tutulmamasını tanımlar.

## Kapsanan yüzeyler
- `GET /api/auth/parent-invite/info`
- `POST /api/auth/parent-invite/accept`
- `GET /api/vehicles`
- `GET /api/shifts`
- `GET /api/shifts/:id`
- `GET /api/logs/preview`
- `GET /api/logs/export`
- `GET /api/admin/logs/export`

## Temel kural
- `ROOM` ve `SUPER_ADMIN` operasyon gereği bazı exact alanları görebilir.
- `COMPANY`, `DRIVER`, `PERSONEL`, `PARENT` ve school-domain yüzeylerinde ham kişi iletişim verisi mümkün olduğunca dönmez.
- Mümkün olan yerde `phoneMasked`, `emailMasked` gibi türetilmiş alan verilir.

## Veli erişimi yüzeyi
- ham `email` ve `phone` tutulmaz
- `tokenHash` response'a hiç dönmez
- link, erişim kodu ve PIN süreli erişim üretir
- süre dolunca veya erişim iptal edilince yüzey kapanır

## Araç listesi
- `GET /api/vehicles` role göre sanitize edilir
- `gpsLast.lat/lng` exact / masked / hidden ayrımı korunur
- company/driver/personel tarafında gereksiz sürücü iletişim alanları taşınmaz

## Vardiya listesi ve detay
- `GET /api/shifts` ve `GET /api/shifts/:id` role göre driver iletişim alanını daraltır
- company tarafında sürücü adı görülebilir; açık telefon/e-posta zorunlu değildir
- operation-events actor label email fallback ile oluşsa bile masked görünür

## Log/export sertleştirmesi
- preview/export hedef etiketi email geçirse bile redacted görünür
- admin export audit meta içindeki `emailContains` ve `ipContains` gibi filtreler sanitize edilerek audit'e yazılır
- preview ve export aynı redaction mantığına bağlı kalmalıdır
