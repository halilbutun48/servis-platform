# M90 — SCHOOL Veli Erişimi Restore (tarihsel not)

> Tarihsel not (2026-04-01): Bu dosya Step 0.6 tarihsel overlay geçmişidir. Güncel aktif davranış için ilgili SSOT belgeleri baz alınır.


Bu overlay SCHOOL akışında kaybolan Veli Erişimi panelini geri getirir.

## Dahil
- `web/src/layout/NavDock.jsx`
  - SCHOOL için Gelişmiş altında `Veli Erişimi` menüsü geri geldi.
- `web/src/App.jsx`
  - `/school/parents` route geri geldi.
  - login gerekmeden çalışan `/accept-parent-invite?...` public ekran route’u geri geldi.
- `backend/src/server.js`
  - `/api/school/parent-invites` route mount geri geldi.

## Beklenen sonuç
- SCHOOL kullanıcı menüsünde `Veli Erişimi` görünür.
- Panel açılıp link üretilebilir.
- Üretilen link `#/accept-parent-invite?token=...` ekranına gider.
