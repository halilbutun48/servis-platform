> ⚠️ DEPRECATED: Güncel primer: 	ools/00_PRIMER_PERSONEL_SERVIS_V1.md

> ⚠️ DEPRECATED: Güncel primer: 	ools/00_PRIMER_PERSONEL_SERVIS_V1.md

8) Frontend (özet)

Driver map çalışıyor; GPS update sonrası araç konumu değişiyor.

Notifications panel v1 payload render ediyor (status/kind/title).

Session/token tarafı Bearer + x-auth-token uyumlu.

9) Şu an “çalışıyor” checklist ✅

POST /api/gps → DB’de GpsLast.OK + Vehicle.ACTIVE ✅

Overspeed → Notification (DRIVER/ROOM/COMPANY) ✅

eta:update WS + ETA hesaplama ✅

health endpoint ✅

10) Bilinen açık konu (öncelik)
GPS_STALE spam / dedupe (🟡)

STALE/OFFLINE notification’ları “durum değişmediği halde” tekrar tekrar üretebiliyor.

Hedef: yalnızca state transition olunca notif üret (LIVE→STALE, STALE→OFFLINE, OFFLINE→LIVE gibi)

Ayrıca DB güncellemesinde “zaten aynıysa continue” kontrolü var ama notif tarafı ayrıca gate’lenmeli.

11) Milestone Durumu (özet)

✅ M0: iskelet/auth/roles/seed

🟡 M1: Room/Company CRUD + onay akışı (kısmi)

✅ M2: GPS + Map + ETA core

🟡 M3: Route/stops tam workflow (kısmi)

🟡 M4: WS + Notification standardı (payload v1 DONE; dedupe eksik)

12) Test Komutları (tek shot)
cd D:\personel-servis-v1; `
$login = curl.exe -s -X POST "http://127.0.0.1:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"driver@demo.com","password":"demo123"}'; `
$TOKEN = ($login | ConvertFrom-Json).token; `
"--- gps ---"; curl.exe -s -X POST "http://127.0.0.1:3000/api/gps" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"vehicleId":1,"lat":41.0302,"lng":28.9960,"speed":20}'; `
"--- db check ---"; docker exec -it personel_db psql -U servis -d servisdb -c 'select "vehicleId", status, at from "GpsLast"

