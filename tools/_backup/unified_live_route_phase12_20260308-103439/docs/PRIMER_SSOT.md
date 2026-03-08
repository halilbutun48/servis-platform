# PERSONEL SERVİS V1 — PRIMER (SSOT)

Tarih: 2026-03-07  
Timezone: Europe/Istanbul

## Repo & doğrulama
- Repo path: `D:\servis-platform`
- Ana kanıt: `tools/pack.ps1 -To 41` → **PACK PASS**
- M42 ayrı doğrulanır: `tools/pack_m42_optional.ps1`
- Kural: `backend/scripts/m{N}check.js` zinciri ana regresyon içindir; optional modüller bu zincire zorla eklenmez.

## Milestone durumu
- **M41:** refresh token + device binding + redis-backed rate limit → ana GREEN çizgi
- **M42:** QR/NFC check-in modülü → **optional release**
  - default OFF
  - flag ON iken ayrı optional pack ile doğrulanır
- Sonraki sıra: V1.5 → M43 → M44 → M45 → V2

## M42 kararı (sabit)
- `FEATURE_CHECKIN=0` → dormant, fail-closed, ana sistem etkilenmez
- `FEATURE_CHECKIN=1` → credential issue / revoke / scan / dedupe / events akışı aktif
- Ana `pack.ps1` M42’ye yükseltilmez; bunun yerine `tools/pack_m42_optional.ps1` kullanılır

## SSOT dosyaları
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/OPTIONAL_CHECKIN_QR_NFC.md`
- `docs/PRIMER_SSOT.md`
- `tools/PRIMER_SNAPSHOT.md`

## Çalışma standardı
- Green olmadan ilerleme yok
- Değişiklik olursa docs aynı PR/overlay içinde güncellenir
- “Çalışıyor” = kanıtlı pack/check PASS
- Değişiklikleri mümkün olduğunca tek seferde overlay (zip) taşı


## Son ekler
- M42 UI: COMPANY/SCHOOL panelinde QR canvas, DRIVER panelinde kamera ile QR okutma
- SCHOOL scope: self-serve parent invite link paneli + public accept akışı

- Manual smoke sonucu: Driver kamera UI açılıyor; destek olmayan desktop/tarayıcıda fallback mod kabul. Parent invite revoke/expired/used/not-found durumları artık formu kapatır. Public paylaşım linki için `VITE_PUBLIC_BASE_URL` kullanılır.
