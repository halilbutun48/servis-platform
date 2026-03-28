# VARDIS / PERSONEL SERVİS V1

<!-- TOOLS_HYGIENE_CANONICAL_V1 -->

Bu repo, okul ve kurumsal taşıma alanlarını birlikte taşıyan; **pazar + sözleşme + operasyon** omurgasında çalışan canlı ürün ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Living baseline: `docs/LIVING_BASELINE_M75.md`
- Milestone registry: `docs/MILESTONE_REGISTRY_V1.md`
- Overlay notları: `docs/overlays/`

## Güncel dürüst durum (2026-03-28)
- Teknik yaşayan taban **M75 green baseline** olarak kabul edilir.
- `M76A-1`, `M76B`, `M76A-2` kanonik normalizasyon/konsolidasyon adımlarıdır.
- `M77` şu an `response-hardening + retention/export-trail-enforcement` aşamasındadır; KVKK tarafında rol/business domain ayrımı, görünürlük matrisi, aydınlatma envanteri, retention yaklaşımı, audit izi, payload daraltma ve retention/export trail helper katmanı yazılı/kodlu omurgaya taşınmıştır.
- Driver/parent dışındaki roller için zorunlu consent enforcement'ı hâlâ sonraki kontrollü adımdır.

## Kanonik komutlar
- Yaşayan master hat: `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M77 payload-enforcement: `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`
