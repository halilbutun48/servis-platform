# NEXT BACKLOG V1

Tarih: 2026-03-19
Timezone: Europe/Istanbul

Current direction: **M59 observability green -> M60 field acceptance green -> M61 ssot alignment green -> M62 commercial core green -> M63 trust quality service evaluation**

## 1) Resmi durum
- `M58 FINAL PILOT READINESS PACK PASS OK`
- `POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK`
- `M59 GOZLEMLEME + SAHA TESHis PACK PASS OK`
- `M60 SAHA ACCEPTANCE MERKEZI PACK PASS OK`
- `M61 SSOT + MILESTONE HIZASI PACK PASS OK`
- `M62 TICARI OMURGA GUCLENDIRME PACK PASS OK`
- `M58` tarihsel pilot readiness kapısıdır.
- `pilot kabul formu`, `GO`, `LIMITED GO`, `NO-GO` dili tarihsel not olarak korunur.
- Saha testi en sona taşındı; gerçek launch kapısı `M65` olacaktır.

## 2) Yeni resmi rota
- `M59 — Gözlemleme + Saha Teşhis` _(green)_
- `M60 — Saha Acceptance Merkezi` _(green)_
- `M61 — SSOT + Milestone Hizası` _(green)_
- `M62 — Ticari Omurga Güçlendirme` _(green)_
- `M63 — Güven + Kalite + Hizmet Değerlendirme` _(aktif)_
- `M64 — Doğal Copilot Katmanı`
- `M65 — Pilot Launch Gate`

## 3) İlk aktif iş — M63
- hizmet alan kurum değerlendirmesi iskeleti
- sağlayıcı kalite özeti ve güven sinyali
- no-show / iptal / uyum / ETA kalite görünürlüğü
- `/api/trust-quality` route iskeleti
- super admin güven + kalite paneli
- M63 pack ve repo-contract doğrulaması

## 4) Kanonik komutlar
- `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m61_ssot_milestone_alignment.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m62_commercial_core_strengthening.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot D:\servis-platform`

## 5) Çalışma kuralı
- Önce SSOT hizalanır.
- Sonra milestone açılır.
- `M63` bitmeden `M64`e geçilmez.
- Paralel dağınık ilerleme yoktur.
- Saha öncesi tüm işler repo içinde kapatılır; saha testi en son adımdır.

## 6) Sonraki ilk cümle
Repo su an `M62` seviyesine kadar green; yeni resmi saha öncesi rota `M59 → M65` olarak ilerliyor. Aktif iş `M63 — Güven + Kalite + Hizmet Değerlendirme`.


## M64 — Doğal Copilot Katmanı
- Durum: aktif
- Komut: `tools\pack_m64_natural_copilot_layer.ps1 -RepoRoot D:\servis-platform`
- Hedef: doğal Türkçe cevap katmanı, kısa konuşma hafızası, neden ilerlemiyor motoru, daha basit anlat ve geri bildirim iskeleti.
- Kural: M64 green olmadan M65 açılmaz.
