# OVERLAY — M80.1 + M81.0 (School UI parity + Parent skeleton)

Tarih: 2026-03-02 (Europe/Istanbul)

Bu paket iki işi birlikte getirir:

## M80.1 — School UI parity
- "Personel" ifadeleri SCHOOL varyantında "Öğrenci" olur.
- GeoReview varsayılan filtre: `kind=STUDENT`.

## M81.0 — Parent (PARENT role)
- Prisma: Role.PARENT + ParentChild tablosu.
- API: `/api/parent/*` + SUPER_ADMIN bağlama endpoint’leri.
- Web: `#/parent/live` paneli.

Uygulama notu: DB için `prisma db push` + `prisma generate` gerekir.
