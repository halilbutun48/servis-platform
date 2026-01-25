# PERSONEL-SERVIS-V1 — PRIMER (2026-01-25)

Repo: D:\personel-servis-v1
Compose: .\infra\docker-compose.yml  (servisler: db, redis, api)
API: http://localhost:3000

✅ ÇALIŞAN AKIŞ (Doğrulandı)
- Driver Map açılıyor, GPS güncellemesi sonrası araç haritada yer değiştiriyor.
- Driver shifts endpoint:
  - GET /api/shifts/my ✅
- ETA endpoint:
  - GET /api/eta?vehicleId=1 ✅
  - response: { vehicleId, last{lat,lng,speed,at,status}, items:[{shiftId,stops[{remainingKm,etaMin}]}] }

YAPILAN FIX’LER
1) Auth token okuma standardı (backend/src/auth/middleware.js)
   - Authorization: Bearer <token> ✅
   - x-auth-token: <token> ✅
   - Böylece curl ile POST /api/gps artık “Missing token” vermiyor (header uyumu).

2) Driver Map doğru shifts endpoint (web/src/panels/driver/MapPanel.jsx)
   - /api/shifts (404) yerine /api/shifts/my kullanılıyor ✅
   - Canlılık: 3sn polling + gps:update auto-reload var.

3) NotificationsPanel stabil (objeyi direkt render crash’i fix)
   - payloadJson parse/stringify güvenli + “Detay” modal ✅

BUGÜN KONUŞTUĞUMUZ “SIRADAKİ 3 İŞ” (BACKLOG)
A) Status standardı: LIVE / STALE / OFFLINE
   - Hem Map marker’da hem listelerde aynı badge + aynı renk + aynı logic.
   - Tek helper: statusFromAgeSec(ageSec) + statusToBadgeClass(status)

B) PRIMER + DB_SCHEMA (Mermaid) güncelle
   - Tamamlanan aşamaları tek sayfada toparla (STARTPACK/PRIMER).
   - DB ilişkilerini Mermaid ile dokümante et.

C) Notifications payload standardı (backend)
   - notifications.payloadJson her zaman sabit şema:
     { title, message, vehicleId, at, ageSec, ... }
   - UI tarafında payload parsing daha da temizlenir.

TEST USER
- driver@demo.com / demo123