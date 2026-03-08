SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-07 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Ana GREEN:
- `tools/pack.ps1 -To 41` → ana regresyon kanıtı
- `tools/pack_m42_optional.ps1` → M42 optional release kanıtı

Kural:
- Ana pack zinciri M0→M41
- M42 zorla ana zincire eklenmez
- M42 açılınca ayrı optional pack ile doğrulanır

1) Ürün özeti
- Personel servis platformu
- COMPANY / ROOM / DRIVER / PERSONEL / SUPER_ADMIN + SCHOOL/PARENT türevleri
- WS canlı akış + GPS + agreements + offers + audit + retention

2) Şu an sabit kararlar
- M41 ana GREEN çizgi
- M42 = Check-in modülü, hazır ama opsiyonel release
- Default OFF, flag ON ile ayrı pack
- Sonraki büyük sıra: V1.5 → M43 → M44 → M45 → V2

3) M42 teknik model
- `FEATURE_CHECKIN=0` → fail-closed
- `FEATURE_CHECKIN=1` → credential issue/revoke + driver scan + dedupe + event list
- Prisma tarafında check-in tabloları mevcut olmalı
- Ana `pack.ps1` değişmeden kalır; `tools/pack_m42_optional.ps1` kullanılır

4) Çalışma kuralları
- En fazla 3 PowerShell komutu
- Overlay (zip) tercih
- Tek Guided Mode/Stepper

5) Son overlay ekleri
- Driver Check-in: kamera ile QR okutma
- Company/School Check-in: QR görsel üretimi
- School Parent Invite: link üret, parent self-serve accept

- Manual smoke sonucu: Driver kamera UI açılıyor; destek olmayan desktop/tarayıcıda fallback mod kabul. Parent invite revoke/expired/used/not-found durumları artık formu kapatır. Public paylaşım linki için `VITE_PUBLIC_BASE_URL` kullanılır.
