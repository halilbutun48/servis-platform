# REPO AUDIT FIX — 2026-03-07

Bu overlay güncel repodaki iki yük taşıyan kırığı hedefler:

1. **ParentInvite schema drift**
   - `backend/src/routes/auth.js` ve `backend/src/routes/schoolParentInvites.js`
     `prisma.parentInvite` kullanıyordu.
   - Prisma şemasında `ParentInvite` modeli ve reverse relation'lar eksikti.
   - Fix:
     - `ParentInvite` modeli eklendi
     - `User`, `Company`, `Personel` reverse relation'ları eklendi

2. **M4 GPS OFFLINE threshold drift**
   - `env.js` eşikleri `GPS_STALE_SEC=40`, `GPS_OFFLINE_SEC=120`
   - `gps/status.js` ve test scriptleri hâlâ eski `20/300` mantığına bağlıydı.
   - Fix:
     - `gps/status.js` artık `ENV` eşiklerini kullanır
     - `m4check.js` ve `fullcheck.js` env-aware hale getirildi

Not:
- `qrcode` bağımlılığı `web/package.json` + `package-lock.json` içinde zaten vardır.
  Yerelde Vite açmadan önce `web` klasöründe `npm install` koşulmalıdır.
