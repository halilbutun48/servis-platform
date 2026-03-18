# NEXT BACKLOG V1

Tarih: 2026-03-19
Timezone: Europe/Istanbul

Current direction: **M59 observability green -> M60 field acceptance green -> M61 ssot milestone alignment**

## 1) Resmi durum
- `M58 FINAL PILOT READINESS PACK PASS OK`
- `POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK`
- `M59 GOZLEMLEME + SAHA TESHis PACK PASS OK`
- `M60 SAHA ACCEPTANCE MERKEZI PACK PASS OK`
- `M58` tarihsel pilot readiness kapısıdır.
- `pilot kabul formu`, `GO`, `LIMITED GO`, `NO-GO` dili tarihsel not olarak korunur.
- Saha testi en sona taşındı; gerçek launch kapısı `M65` olacaktır.

## 2) Yeni resmi rota
- `M59 — Gözlemleme + Saha Teşhis` _(green)_
- `M60 — Saha Acceptance Merkezi` _(green)_
- `M61 — SSOT + Milestone Hizası` _(aktif)_
- `M62 — Ticari Omurga Güçlendirme`
- `M63 — Güven + Kalite + Hizmet Değerlendirme`
- `M64 — Doğal Copilot Katmanı`
- `M65 — Pilot Launch Gate`

## 3) İlk aktif iş — M61
- milestone registry dosyası
- README / PRIMER / CHECKLIST / STARTPACK hizası
- tools primer / checklist / readme hizası
- `/api/ssot-alignment` route iskeleti
- super admin SSOT hizası paneli
- M61 pack ve repo-contract doğrulaması

## 4) Kanonik komutlar
- `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m61_ssot_milestone_alignment.ps1 -RepoRoot D:\servis-platform`

## 5) Çalışma kuralı
- Önce SSOT hizalanır.
- Sonra milestone açılır.
- `M61` bitmeden `M62`ye geçilmez.
- Paralel dağınık ilerleme yoktur.
- Saha öncesi tüm işler repo içinde kapatılır; saha testi en son adımdır.

## 6) Sonraki ilk cümle
Repo su an `M60` seviyesine kadar green; yeni resmi saha öncesi rota `M59 → M65` olarak ilerliyor. İlk aktif iş `M61 — SSOT + Milestone Hizası`.
