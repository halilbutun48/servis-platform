# OVERLAY NOTES — STEP1 SSOT SYNC + M43 PLAN (2026-03-10)

## Amaç
Step 1 sonrası repo içindeki geride kalmış SSOT/primer dosyalarını güncel primer ile hizalamak ve
M43 için backup’taki detaylı Step 2 taslağını tekrar canlı SSOT’a taşımak.

## Güncellenen dosyalar
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`

## Yapılan hizalamalar
- Current green ref artık Step 0.6 + Step 1 Security + Step 1 TOTP’yi içeriyor
- TOTP step-up davranışı ve korunan endpoint özeti primer/startpack’e işlendi
- Step 0.6 “manuel doğrulandı” dili kaldırıldı; resmi pack doğrulaması olarak işlendi
- CHECKLIST içindeki Step 1 bölümü resmi green state’e çekildi
- CHECKLIST içindeki Step 2 / M43 bölümü backup’taki detaylı invite/gis taslağı ile genişletildi

## Sonraki resmi iş
- M43 Google Auth + Invite Gate
