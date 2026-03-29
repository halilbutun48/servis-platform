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
- `M77` KVKK + uyum katmanı green durumdadır; response-hardening ve retention/export-trail enforcement omurgası yazılı/kodlu hale gelmiştir.
- `M78` checklist / operasyon doğrulama iskeleti açılmıştır; saha kabul checklistleri, rol bazlı operasyon doğrulama, kanıt / proof / kontrol omurgası ve kabul / red / eksik / tekrar kontrol akışı artık living hatta bağlıdır.
- `M78.1` minimal ürün yüzeyi açılmıştır; super admin altında rol seçimi, durum özeti ve kanıt türleri okunabilir. `STABLE_TO` yine `78` kalır.
- `M78.2` ilk yazılabilir kayıt katmanıdır; aynı ekrandan durum + kanıt tipi + kısa not + referans metni kaydedilebilir. `STABLE_TO` yine `78` kalır.
- `M78.3` özet ve filtre katmanıdır; aynı ekranda filtreler, son güncelleyen / son güncelleme ve dışa aktarma görünürlüğü açılır. `STABLE_TO` yine `78` kalır.
- Driver/parent dışındaki roller için zorunlu consent enforcement'ı hâlâ sonraki kontrollü adımdır.

## Kanonik komutlar
- Operasyonel master doğrulama: `tools\pack.ps1 -To 78 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- M77 payload-enforcement: `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`
- M78 checklist/operasyon doğrulama: `tools\pack_m78_checklist_operasyon_dogrulama.ps1 -RepoRoot D:\servis-platform`
- M78.1 operasyon doğrulama yüzeyi: `tools\pack_m78_1_operasyon_dogrulama_yuzeyi.ps1 -RepoRoot D:\servis-platform`
- M78.2 operasyon doğrulama kayıt katmanı: `tools\pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1 -RepoRoot D:\servis-platform`
- M78.3 operasyon doğrulama özet ve filtre katmanı: `tools\pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1 -RepoRoot D:\servis-platform`
