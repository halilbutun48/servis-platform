# OVERLAY_NOTES_M81.1 — SUPER_ADMIN Parent↔Student bağlama UI

Tarih: 2026-03-02

## Amaç
Postman/manuel API çağrısı olmadan, **SUPER_ADMIN → Users** ekranından PARENT kullanıcısına öğrenci (STUDENT) bağlayabilmek.

## Değişiklikler
- `web/src/panels/superadmin/UsersPanel.jsx`
  - Rol listesine **PARENT** eklendi.
  - PARENT kullanıcı “Düzenle” modal’ında **Parent ↔ Öğrenci Bağlantıları** kartı eklendi.
- `web/src/panels/superadmin/ParentChildMiniPanel.jsx`
  - Öğrenci arama + seçme + bağlama
  - Mevcut bağları listeleme + kaldırma

## Backend beklentisi
Bu UI şu endpoint’leri kullanır:
- `GET /api/admin/parent-children?parentUserId=`
- `POST /api/admin/parent-children` `{ parentUserId, personelId }`
- `DELETE /api/admin/parent-children/:id`

Öğrenci listesi için:
- `GET /api/personels` (SUPER_ADMIN branch)

## Not
- KVKK/time-window gate mantığı Parent canlı harita endpoint’lerinde devam eder; bu overlay sadece bağ yönetimini UI’ya taşır.
