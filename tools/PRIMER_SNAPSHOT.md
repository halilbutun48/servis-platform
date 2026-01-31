# PRIMER SNAPSHOT — SERVIS-PLATFORM / PERSONEL SERVİS V1 (M12 GREEN)
Tarih: 2026-01-31 (Europe/Istanbul)

## Repo referansı
- Repo: https://github.com/halilbutun48/servis-platform
- Branch: main
- Tag: v1-m12-green  ✅ (PACK M0..M12 + FULLCHECK + SMOKE PASS)

## Ürün özeti
Öğrenci/parent yok. GPS tabanlı “personel servisi”:
- Canlı araç takibi (map), shift/vardiya + rota/durak yönetimi
- Driver: active route, next-stop, stop state (reached/skip/reopen), shift complete
- Notifications: OVERSPEED, GPS_STALE, GPS_OFFLINE, recovery (transition + dedupe)
- Personel requests → stop suggestions → shift’e stop ekleme
- Company route templates → shift’e REPLACE uygula

## Roller
SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL

## Tek kaynak (SSOT)
Detaylı ve güncel doküman: **docs/PRIMER_SSOT.md**
Zorunlu spec dosyaları (M12): PROJECT_SPEC_V1, API_SPEC_V1, DB_SCHEMA_V1, UI_SPEC_V1, STARTPACK_V1

## Milestone standardı
Değişiklikten sonra “PACK PASS” almadan ilerleme yok:
- tools/pack.(ps1|cmd): M0→M12 + fullcheck + smoke
- Milestone sabitleme: tag (örn. v1-m13-green)

## Devam komutu (yeni sohbette)
“Tag v1-m12-green’den devam: Vehicle↔Driver bind + overlap rules (aynı vardiyada çakışma yok, farklı saatlerde izin). UI+API işleri sırala.”
