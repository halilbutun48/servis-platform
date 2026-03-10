# OVERLAY NOTES — M102 PERSONEL PUBLIC LINK ENABLE — 2026-03-10

Amaç: PERSONEL için zorunlu login yerine mevcut repo içinde yarım kalmış süreli public link hattını devreye almak.

Kapsam:
- `PassengerLiveLink` Prisma modeli + migration
- backend route mount:
  - `POST/GET /api/company/passenger-links`
  - `POST /api/company/passenger-links/:id/revoke`
  - `GET /api/public/passenger-live`
  - `GET /api/public/personel-live` (alias)
- web route mount:
  - company/school/organization advanced menüde `.../access-links`
  - public hash route `#/public/personel-live?token=...`
- personel create akışında login opsiyonel hale getirildi

Beklenen ürün davranışı:
- Personel hesabı açmak zorunlu değil.
- Company isterse personeli sadece profil olarak oluşturur.
- APPROVED/ACTIVE vardiya için süreli kişisel link üretir.
- Link yalnızca ilgili kişinin durak/ETA/canlı araç yaklaşım bilgisini gösterir.
- Gerekirse personel için ayrıca klasik login hesabı da açılabilir.
