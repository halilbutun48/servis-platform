# OVERLAY_NOTES_M81_1_1 — ParentChild Admin API Fix

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Neden?
SUPER_ADMIN → Users içindeki **Parent ↔ Öğrenci Bağlantıları** mini paneli
`GET /api/admin/parent-children` çağırıyor. Backend tarafında bu route eksikse UI’da `Cannot GET /api/admin/parent-children` hatası görülür.

## Neler değişti?
- Backend: `backend/src/routes/admin.js`
  - `createUserSchema.role` enum’una `PARENT` eklendi (geri uyumlu)
  - `PARENT` için scope kuralı: `roomId/companyId` olamaz
  - Yeni endpoints (SUPER_ADMIN):
    - `GET /api/admin/parent-children?parentUserId=`
    - `POST /api/admin/parent-children` `{ parentUserId, personelId }`
    - `DELETE /api/admin/parent-children/:id`

## Test
- SUPER_ADMIN ile bir PARENT user aç
- Users → PARENT → Düzenle
- Öğrenci seç → Bağla
- Yenile’de liste gelmeli; Kaldır çalışmalı
