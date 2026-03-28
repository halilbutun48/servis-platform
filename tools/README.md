# TOOLS README

<!-- TOOLS_HYGIENE_CHECK_MARKER_V1 -->

## Kanonik komutlar
- Yaşayan master hat: `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M76A-1 pack: `tools\pack_m76a_1_minimum_normalization.ps1 -RepoRoot D:\servis-platform`
- M76B pack: `tools\pack_m76b_living_matrix_tools_consolidation.ps1 -RepoRoot D:\servis-platform`
- M76A-2 pack: `tools\pack_m76a_2_final_normalization_archiving.ps1 -RepoRoot D:\servis-platform`
- M77 pack: `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Repo şu an **M75 living baseline** üstünde durur.
- M76A-1 minimum normalizasyon, M76B living matrix/tools consolidation ve M76A-2 final normalization adımları tamamlanmış kanonik girişlerdir.
- M77 artık `response-hardening + retention/export-trail-enforcement` durumundadır; bu faz altında rol/business domain ayrımı, veri görünürlük matrisi, aydınlatma envanteri, retention / silme / anonimleştirme yaklaşımı, audit izi, payload redaction yüzeyleri ve retention/export helper katmanı yazılı/kodlu hale getirilmiştir.
- Ana belgeler: `docs\KVKK_VERI_GORUNURLUK_MATRISI_V1.md`, `docs\KVKK_AYDINLATMA_ENVANTERI_V1.md`, `docs\KVKK_RETENTION_ANONIMLESTIRME_V1.md`, `docs\KVKK_AUDIT_ERISIM_IZI_V1.md`.
- Tüm root pack/check dosyalarını tek seferde taşımak yerine, yeni living girişler klasör altında toplanır ve uyumluluk korunur.
- Geçici `_m*` overlay klasörleri repo içine commitlenmez.

## Master pack
`tools\pack.ps1 -To 75` yaşayan ana çatıdır.

Akış:
1. `M104 / M105 / M106` statik repo check'leri
2. `M0 -> M41` gate
3. `M42 -> M58` phase pack
4. `M59 -> M66` phase pack
5. `M67 -> M75` phase pack
6. repo audit

## Living giriş düzeni
- Faz wrapper'ları: `tools\packs\living\`
- Living check girişleri: `tools\checks\living\`
- Dışarıdaki kanonik girişler: `pack.ps1`, `pack_living.ps1`, `verify_living_static.ps1`, `verify_living_runtime.ps1`, `gate.ps1`
- Legacy root pack/check dosyaları uyumluluk için korunur.
- Yaşayan hotfix pack klasörü: `tools\packs\living\hotfixes\`
- Yaşayan hotfix check klasörü: `tools\checks\living\hotfixes\`
- Kökteki hotfix pack/check dosyaları compatibility alias olarak bırakılır.

- M77.2 / M77.3 / M77.5 yüzeyleri: `docs\KVKK_ENFORCEMENT_YUZEYI_V1.md`, `docs\KVKK_REDACTION_ENFORCEMENT_V1.md`, `docs\KVKK_ROLE_PAYLOAD_DARALTMA_V1.md`, `docs\KVKK_RETENTION_ENFORCEMENT_V1.md`, `docs\KVKK_EXPORT_ERISIM_IZI_V1.md`
