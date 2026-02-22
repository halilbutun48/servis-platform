SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-23 (Europe/Istanbul)

0) Durum / Referans

Repo: servis-platform (aktif çalışma klasörü: D:\servis-platform)

Çalışma modu: Docker mode (Gate/Pack container içinde koşar; host node_modules gerekmiyor)

Son GREEN (güncel): v1-m22-green.1 ✅ tools/pack.ps1 -To 22 PASS

İçerik: M0→M22

M17 Agreements ✅

M18 Agreement→Daily Shift Generator ✅

M19 Hub + Direction/Pattern + Route Preview (summary/path) ✅

M20 Availability bulk ✅

M21 SUPER_ADMIN Companies/Rooms + Overview stats ✅

M22 Room Directory + Company Agreement/Shift Room Select UX ✅

Doğrulama komutu:

.\tools\pack.ps1 -To 22

Not: PowerShell execution policy sıkıntısı olursa “Process scope bypass” ile sadece o oturumda çalıştırılır.

1) Amaç (V1)

Öğrenci/parent yok. GPS tabanlı personel servis platformu:

Live map + GPS status (LIVE/STALE/OFFLINE)

Shift yönetimi + durak akışı (start/reached/skip/reopen/complete)

Notifications (overspeed + gps stale/offline + recovery) + dedupe

Personel request → stop suggestions → shift’e stop ekleme

Route templates (company) → shift’e REPLACE uygula

Shift People + Route Preview standardı (M16.2)

Geo Review + Manual Override (M16.3)

Agreements (M17): periyodik rezervasyon + conflict + monitor + availability entegrasyonu

Agreement → “bugün” için otomatik shift üretimi + duplicate guard (M18)

Hub/direction/pattern + route-preview summary/path (M19)

Availability bulk (M20)

SUPER_ADMIN yönetim ekranları + Overview stats (M21)

Room Directory + Company tarafında room seçimi UX (M22)

2) Roller

SUPER_ADMIN: kurulum, company/room yönetimi, admin stats

ROOM: araç+sürücü CRUD, shift approve/assign/start, request close(ACCEPTED), stop-suggestions + from-suggestion, route-preview, agreement approve

COMPANY: shift create, template yönetimi, request’leri görür (kapatamaz), agreements create/cancel/extend, shift people UI soft-switch

DRIVER: GPS post (assigned vehicle), active route, stop progression, complete

PERSONEL: request create (lat/lng zorunlu), own view

3) Kritik Mimari Kural (M21) — Company ↔ Room ilişkisi
Domain tanımı (V1)

Company = servis kiralayan

Room = servis sağlayan (bağımsız)

Company ile Room arasındaki ilişki Agreement üzerinden kurulur (many-to-many).

Sonuçlar

✅ Room oluştururken company seçilmez (Room bağımsız “directory”)

✅ Eski Room.companyId modeli kaldırıldı (artık yok)

✅ Bildirim/filtre/erişim kuralları room.companyId gibi alanlara bağlı değildir.

4) M16 doğrulanan akış (kısa)

COMPANY shift create

ROOM approve/assign(vehicleId+driverId) + start

PERSONEL request create (lat/lng required)

ROOM stop-suggestions (cluster) → POST stops/from-suggestion

DRIVER route: GET /api/driver/route/active

Cleanup: shift complete

5) M17 — Agreements (Periyodik rezervasyon)

COMPANY: create/list/cancel/extend

ROOM: approve (vehicle+driver assign)

Conflict: approve’da 409

Availability kuralı: agreement conflict önce, shift conflict sonra

Monitor: süresi geçen agreement otomatik DONE

6) M18 — Agreement → Günlük Shift Otomatik Üretimi

Job: agreementShiftGenerator

Duplicate guard: unique(agreementId, startAt)

UI: Company/Room Shifts listesinde Agreement #id badge + filtre

7) M19 — Hub + Direction/Pattern + Route Preview (summary/path)

Shift’te hub + (OUTBOUND/INBOUND) + (LOOP/LINE) desteklenir

Route preview response: summary + path.points içerir (tahmini km/dk)

8) M20 — Availability Bulk

Tek çağrıda çoklu vehicle/driver uygunluk kontrolü

Conflict payload deterministik (agreement-first)

9) M21 — SUPER_ADMIN Admin/Overview

GET /api/admin/stats → { companies, rooms, vehicles, drivers }

SUPER_ADMIN paneli: Companies/Rooms create+list (V1’de update/delete yok)

10) M22 — Room Directory + Company UX
Backend

GET /api/rooms artık Company için directory gibi çalışır:

?q= → isimle arama (contains)

?hasHub=1 → hub’ı olan room’lar

?take= → limit

m22check.js ile doğrulama: room create + hub set + company search + agreement create

Web (Company)

Agreements panelinde Room dropdown + search + “sadece hub’lı”

Shifts panelinde Room seçimi + search

localStorage: company:lastRoomId (son seçilen room’u hatırlar)

11) OSRM / Learning notu (repo hijyeni)

infra/osrm-data/ Git’te yok (runtime artifact, çok büyük)

Learning/route match için localde data bulunmalı; repo commit/tag/push sırasında taşınmaz.

12) SSOT dokümanlar

docs/PRIMER_SSOT.md

docs/API_SPEC_V1.md

docs/DB_SCHEMA_V1.md

docs/PROJECT_SPEC_V1.md

docs/UI_SPEC_V1.md

docs/STARTPACK_V1.md

docs/MILESTONE_M22.md

Ek — M16/M19/M22 Endpoint Referansları (kısa)

Suggestions: GET /api/shifts/:id/stop-suggestions

From-suggestion: POST /api/shifts/:id/stops/from-suggestion

Driver route: GET /api/driver/route/active

Route preview: GET /api/shifts/:id/route-preview

Room directory: GET /api/rooms?q=&hasHub=1&take=

İstersen bir sonraki adım olarak M23’ü seçelim. Benim önerim: M23-A = WS agreement:update ile Company/Room Agreements auto-refresh (en hızlı UX kazanımı, düşük risk).