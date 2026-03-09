M0 — Guardrails

 Yeni işlerde mümkünse feature gate/env ile aç/kapat (default kapalı ya da soft)

 Her PR sonrası: npm run smoke + npm run fullcheck PASS

 WS scope/rooms + dedupe davranışı bozulmayacak

M1 — EPIC C: No-show / Ceza (hızlı değer)

DB

 DriverPenalty (driverId, kind=NO_SHOW, startsAt, endsAt, reason, createdBy, createdAt) + index

API

 POST /api/room/drivers/:id/penalties/no-show (months=3 default)

 GET /api/drivers/:id/penalties (scope kontrollü)

Enforcement

 Driver assignment/approve noktasında “aktif ceza varsa” engelle (403/409)

WS/Notify/Audit

 notify:new (driver + room)

 AuditLog: “NO_SHOW_PENALTY_CREATED” (kim verdi/niye)

DoD / Check

 Demo’da ceza ver → driver’a shift ata → engellendi

 fullcheck içine 1 senaryo ekle (penalty gate)

M2 — EPIC D: KVKK Onay (Soft Policy ile başla)

DB

 ConsentDocument (version, contentHash, publishedAt)

 UserConsent (userId, documentId, acceptedAt, ip/userAgent ops.)

API

 GET /api/consent/current

 POST /api/consent/accept

 /api/me → consent: { ok, documentId, acceptedAt }

Policy (Soft)

 Consent yoksa: “konum/harita gibi kritik” alanlarda kısıt/uyarı (bloklamayı sonra strict’e çekebiliriz)

Audit

 Consent accept aksiyonu audit’e düşer

DoD / Check

 Consent yok → kısıt görülebilir

 Accept → kısıt kalkar

 fullcheck içine “consent state” kontrolü

M3 — EPIC A / Sprint 1: Excel Import + Geocode Cache

DB

 Personel: addressText/addressNorm/lat/lng/geoStatus/geoUpdatedAt/geoManualOverride...

 Import izleri: ShiftImport + ShiftImportRow

API

 POST /api/company/shifts

 POST /api/company/shifts/:id/import-excel (xlsx/csv)

Service

 normalizeAddress() + cache kuralı + throttle

 Status: OK | NEEDS_REVIEW | FAILED

DoD / Check

 Aynı adres tekrar import → geocode tekrar çağrılmaz

 Adres değişince sadece o satır geocode olur

 Import summary doğru (ok/failed/review)

M4 — EPIC A / Sprint 2: Clustering + Draft → ROOM

DB

 StopAssignment (stopId, personelId, shiftId) + index/unique

Service

 clusterStops(points, maxWalkM) (maxWalkM garantili, medoid stop)

Akış

 Draft üretimi: durak insert + assignment insert

 Shift status: DRAFT → REQUESTED

 ROOM approve: vehicle+driver ata

WS

 shift:requested (room:{roomId}, company:{companyId})

 shift:approved (driver:{driverId} + scope)

DoD / Check

 Room’da draft görünür → approve → driver durakları görür

 Replace mode net (yeniden üretme davranışı)

M5 — EPIC A / Sprint 3: Review UI + Kalite + Check Pack

API

 GET /api/company/personels?geoStatus=NEEDS_REVIEW

 PUT /api/company/personels/:id/location (manual override)

Kalite

 Rota sıralama MVP: nearest-neighbor (+ opsiyon 2-opt)

 m-check/fullcheck genişlet: import → cache → cluster → draft → approve

DoD

 NEEDS_REVIEW listesi yönetilebilir

 Test pack regression yakalar

M6 — EPIC B: Rapor/Export (MVP → Advanced)
B-MVP (önce)

 Rapor endpoint’leri: overspeed/offline/stop-times gibi “kolay metrikler”

 CSV export (format standardı)

 RBAC + pagination

B-Advanced (sonra)

 Günlük km hesabı (GPS history netleşince)

 Async export / büyük veri kuyruğu

 Performans/index iyileştirmeleri