# M81.12 — M37CHECK (E2E) — School + Parent uçtan uca doğrulama

Bu overlay bir **check script’i** ekler: `backend/scripts/m37check.js`.

Amaç: M80/M81 ile gelen **School (Company.kind=SCHOOL) + Parent (PARENT)** akışını tek senaryoda uçtan uca doğrulamak.

## Senaryo

1) SUPER_ADMIN ile **SCHOOL company** oluştur
2) SUPER_ADMIN ile
   - SCHOOL şirketine bağlı **COMPANY** user oluştur
   - Scope’suz **PARENT** user oluştur
3) SCHOOL user ile:
   - Shift oluştur (REQUESTED)
   - Shift people listesine 3 kişi yazar (3 farklı cluster)
   - `stops/generate` ile stop + assignment üretir
4) ROOM user ile:
   - approve (vehicle+driver bind)
   - start
5) SUPER_ADMIN ile:
   - Parent ↔ Student link (ParentChild)
6) DRIVER ile:
   - gps post
   - ilk stop için `reached`
7) PARENT ile:
   - `/api/parent/children` içinde çocuğu görür
   - `/api/parent/live/vehicles?childId=...` ile aracı + ETA + live stop card görür
   - `/api/notifications/my` içinde `ETA_2_STOPS / ETA_1_STOP / STOP_REACHED_PARENT` tiplerinden en az bir bildirim görür

## Önemli assertion’lar

- `stops/generate` sonrası **stop.order min >= 1** olmalı (0 tabanlı order bug’ını yakalamak için)
- Student `kind=STUDENT` olmalı (School mode)

## Çalıştırma

- `tools/gate.ps1` listesine M37 eklendiği için `pack` artık `-To 37` ile M37CHECK’i de koşturabilir.

