# M90 — SCHOOL Parent Link Restore

Bu overlay SCHOOL akışında kaybolan parent link üretme panelini geri getirir.

## Dahil
- `web/src/layout/NavDock.jsx`
  - SCHOOL için Gelişmiş altında `Parent Link` menüsü geri geldi.
- `web/src/App.jsx`
  - `/school/parents` route geri geldi.
  - login gerekmeden çalışan `/accept-parent-invite?...` public ekran route’u geri geldi.
- `backend/src/server.js`
  - `/api/school/parent-invites` route mount geri geldi.

## Beklenen sonuç
- SCHOOL kullanıcı menüsünde `Parent Link` görünür.
- Panel açılıp link üretilebilir.
- Üretilen link `#/accept-parent-invite?token=...` ekranına gider.
