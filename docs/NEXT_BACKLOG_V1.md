# NEXT BACKLOG V1

Tarih: 2026-03-19
Timezone: Europe/Istanbul

Current direction: **M59 observability green -> M60 field acceptance center**

## 1) Resmi durum
- `M58 FINAL PILOT READINESS PACK PASS OK`
- `POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK`
- `M59 GOZLEMLEME + SAHA TESHis PACK PASS OK`
- `M58` tarihsel pilot readiness kapısıdır.
- `pilot kabul formu`, `GO`, `LIMITED GO`, `NO-GO` dili tarihsel not olarak korunur.
- Saha testi en sona taşındı; gerçek launch kapısı `M65` olacaktır.

## 2) Yeni resmi rota
- `M59 — Gözlemleme + Saha Teşhis`
- `M60 — Saha Acceptance Merkezi`
- `M61 — SSOT + Milestone Hizası`
- `M62 — Ticari Omurga Güçlendirme`
- `M63 — Güven + Kalite + Hizmet Değerlendirme`
- `M64 — Doğal Copilot Katmanı`
- `M65 — Pilot Launch Gate`

## 3) İlk aktif iş — M60
- pilot test oturumu kaydı
- acceptance checklist şablonu
- GO / LIMITED GO / NO-GO karar seçenekleri
- cihaz / build bazlı test özeti
- kanıt ve not alanı iskeleti
- super admin acceptance merkezi paneli

## 4) Kanonik komutlar
- `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`

## 5) Çalışma kuralı
- Önce SSOT hizalanır.
- Sonra milestone açılır.
- `M60` bitmeden `M61`e geçilmez.
- Paralel dağınık ilerleme yoktur.
- Saha öncesi tüm işler repo içinde kapatılır; saha testi en son adımdır.

## 6) Sonraki ilk cümle
Repo su an `M59` seviyesine kadar green; yeni resmi saha öncesi rota `M59 → M65` olarak ilerliyor. İlk aktif iş `M60 — Saha Acceptance Merkezi`.
