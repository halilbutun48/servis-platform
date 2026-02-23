SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-23 (Europe/Istanbul)

0) Durum / Referans

Repo: servis-platform (aktif çalışma klasörü: D:\servis-platform)

Çalışma modu: Docker mode (Gate/Pack container içinde koşar; host node_modules gerekmiyor)

Son GREEN (güncel): v1-m24-green.1 ✅ tools/pack.ps1 -To 24 PASS

İçerik: M0→M24

M21 Room↔Company decouple + SUPER_ADMIN admin/stats ✅

M22 Room Directory + Company Agreement/Shift Room Select UX ✅

M23 WS agreement:update → Agreements auto-refresh ✅

M24 Marketplace Offers (multi-room offer + counter + accept cancels others) ✅

Doğrulama komutu:

.\tools\pack.ps1 -To 24
1) Amaç (V1)

Öğrenci/parent yok. GPS tabanlı personel servis platformu:

Live map + GPS status (LIVE/STALE/OFFLINE)

Shift yönetimi + durak akışı (start/reached/skip/reopen/complete)

Notifications (overspeed + gps stale/offline + recovery) + dedupe

Personel request → stop suggestions → shift’e stop ekleme

Route templates (company) → shift’e REPLACE uygula

Shift People + Route Preview standardı (M16.2)

Geo Review + Manual Override (M16.3)

Agreements (M17) + monitor + availability entegrasyonu

Agreement → günlük shift üretimi (M18)

Hub + direction/pattern + route preview summary/path (M19)

Availability bulk (M20)

SUPER_ADMIN yönetimi + overview stats (M21)

Room Directory + Company UX (M22)

WS auto-refresh (Agreements) (M23)

Marketplace Offers (Shift teklif pazarı) (M24)

2) Roller

SUPER_ADMIN: kurulum, company/room yönetimi, admin stats

ROOM: araç+sürücü CRUD, shift approve/assign/start, request close(ACCEPTED), stop-suggestions + from-suggestion, route-preview, agreement approve, offers inbox + counter (M24)

COMPANY: shift create, template yönetimi, agreements create/cancel/extend, market shift + offers gönder + accept (M24)

DRIVER: GPS post (assigned vehicle), active route, stop progression, complete

PERSONEL: request create (lat/lng zorunlu), own view

3) Kritik Mimari Kural (M21) — Company ↔ Room ilişkisi

Company = servis kiralayan

Room = servis sağlayan (bağımsız)

Company ↔ Room ilişkisi Agreement ile (many-to-many)

Room oluştururken company seçilmez

Room.companyId yok (kaldırıldı)

4) M22 — Room Directory + Company UX
Backend

GET /api/rooms Company için directory:

?q= (isimle arama)

?hasHub=1 (hub’ı olanlar)

?take= (limit)

Web (Company)

Agreements: Room dropdown + search + “sadece hub’lı”

Shifts: Room seçimi + search + company:lastRoomId

5) M23 — WS (Agreements Auto-Refresh)

Backend agreement:update event’leri geldiğinde web ws.js:

eventName’i (agreement:update) normalize eder

agreements topic invalidate eder

Company/Room Agreements panelleri otomatik yenilenir.

6) M24 — Marketplace Offers (Multi-Room)
İş mantığı

Company shift’i room seçmeden oluşturabilir (market shift).

Company aynı shift için birden fazla room’a teklif gönderir.

Room teklifleri “inbox”ta görür ve counter yapabilir.

Company bir teklifi ACCEPT edince:

shift roomId ile o room’a bağlanır

diğer room teklifleri CANCELLED olur (transaction)

ROOM sadece kabul edilen shift’i approve/assign edebilir.

API (özet)

POST /api/shifts → roomId opsiyonel (market shift)

POST /api/shifts/:id/offers (COMPANY) → { roomIds[], amountCompany?, noteCompany? }

GET /api/offers/inbox (ROOM)

GET /api/offers/shift/:shiftId (COMPANY)

PUT /api/offers/:id/counter (ROOM)

PUT /api/offers/:id/accept (COMPANY) → accept 1 + cancel others + bind shift.roomId

(ops) PUT /api/offers/:id/cancel (COMPANY)

UI (özet)

ROOM: Offers panel (inbox + counter)

COMPANY: Shifts panel (market shift + teklif gönder + teklifler listesi + accept)

7) OSRM / Learning notu (repo hijyeni)

infra/osrm-data/ Git’te yok (runtime artifact)

Localde data bulunmalı; commit/tag/push içine girmez.

8) SSOT dokümanlar

docs/PRIMER_SSOT.md

docs/API_SPEC_V1.md

docs/DB_SCHEMA_V1.md

docs/PROJECT_SPEC_V1.md

docs/UI_SPEC_V1.md

docs/STARTPACK_V1.md

docs/MILESTONE_M22.md

docs/MILESTONE_M23.md

docs/MILESTONE_M24.md

M25 Adayları (seçim)

Offer UX polishing: filtre/sıralama, Accept sonrası otomatik refresh + banner, room tarafına “CANCELLED” bildirimleri

Shift lifecycle uyumu: market shift → accept sonrası “approve gate” mesajları ve daha net status geçişleri

WS offers: offer:update eventlerini daha granular topic’lerle auto-refresh (company/room offers ekranları)

Hangisini M25 yapalım? (Ben 1’i öneririm: en hızlı kullanıcı değeri, düşük risk.)