# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2

Bu repo PERSONEL SERVİS V1/V2 uygulamasının canlı çalışma ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Project spec: `docs/PROJECT_SPEC_V1.md`
- API spec: `docs/API_SPEC_V1.md`
- DB spec: `docs/DB_SCHEMA_V1.md`
- UI spec: `docs/UI_SPEC_V1.md`
- Overlay notları: `docs/overlays/`

## Resmi green çizgisi
- `M41 PACK PASS`
- `M42 OPTIONAL PACK PASS`
- `STEP 0.6 STABIL PACK PASS`
- `STEP 1 SECURITY FOUNDATION PACK PASS`
- `STEP 1 TOTP STEP-UP PACK PASS`
- `M104 REPO CLEANUP CHECK PASS`
- `M105 TOOLS HYGIENE CHECK PASS`
- `M106 REPO HYGIENE CHECK PASS`

## Repo hijyen kuralları
- Canlı kaynak ağacında `.bak` dosyası bırakma.
- Tek seferlik overlay/readme notlarını repo köküne değil `docs/_archive/root-legacy/` veya `docs/overlays/` altına taşı.
- Aktif kod için tek kanonik dosya kullan; stale duplicate panel/route dosyalarını `tools/_backup/` altına arşivle.
- Kod değişirse aynı overlay içinde ilgili SSOT dosyalarını da güncelle.

## Kanonik tools düzeni
- `tools/` kökü sadece kanonik çalıştırma/doğrulama script’leri için kullanılır.
- Sabit komutlar: `pack.ps1`, `pack_m42_optional.ps1`, `pack_step06_stabil.ps1`, `pack_step1_security_foundation.ps1`, `pack_step1_totp_stepup.ps1`, `gate.ps1`, repo-contract `check_*.ps1` script’leri.
- Eski tek seferlik `apply_*`, `overlay_*`, `OVERLAY_*` ve hotfix script’leri `tools/_archive/` altına taşınır.
- Otomatik yedekler `tools/_backup/` altında kalır; bu klasör canlı komut alanı değildir.
