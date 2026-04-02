# TOOLS README

<!-- TOOLS_HYGIENE_CHECK_MARKER_V1 -->

## Kanonik komutlar
- Son tam master doğrulama: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 79 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- M79 acceptance pack: `tools\pack_m79_copilot_acceptance.ps1 -RepoRoot D:\servis-platform`
- M80 kabul kapısı: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 hot panel daraltma: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 agreements + shifts giriş yükü: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.3 georeview + shifts son giriş yükü: `tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Repo şu an `M79`’a kadar doğrulanmış kabul edilir.
- `tools/STABLE_TO.txt = 78` değeri M78.x repo-contract kontrolleri için korunur.
- Parent Access akışı legacy invite değildir.
- OSRM kodu repoda kalır; default compose modu fallback çalışır.
- `M80`, `M80.1`, `M80.2`, `M80.3` teknik kabul/daraltma zinciri repo içinde görünür ve pack-pass durumundadır.
- İş sırası olarak sonraki ana faz `M81` mobil saha sertleştirmedir.
- `M82` controlled cleanup sonrası saha testi kullanıcı tarafından yapılacaktır.

## Master pack
`tools\pack.ps1 -To 79` güncel tam master doğrulama referansıdır.

Akış:
1. `M104 / M105 / M106` statik repo check'leri
2. `M0 -> M41` gate
3. `M42 -> M58` phase pack
4. `M59 -> M66` phase pack
5. `M67 -> M75` phase pack
6. `M76 -> M79` phase pack
7. repo audit

## Önemli hizalama notu
- `docs/overlays/M80`, `M81`, `M82` klasörleri güncel aktif milestone anlamı değildir.
- Güncel aktif anlam için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.

<!-- REPO_CONTRACT_COMPAT_TOOLS_README_V2
pack_m59_observability_field_diagnostics.ps1
M59
M58 readiness contract
pack_m63_trust_quality_service_evaluation.ps1
m63 green olmadan m64 acilmaz
m64 - dogal copilot katmani
pack_m64_natural_copilot_layer.ps1
post-M66 functional
pack_m66_operation_reassignment.ps1
tools\pack.ps1 -To 66
tools\pack.ps1 -To 75
tools\pack.ps1 -To 76
tools\pack_docs_ssot.ps1
tools\pack_m77_kvkk_uyum_katmani.ps1
REPO_CONTRACT_COMPAT_TOOLS_README_V2 -->

<!-- REPO_CONTRACT_COMPAT_M78_TOOLS_README_V1
M78.1
M78.2 pack
M78.3 pack
M78 pack
pack_m78_checklist_operasyon_dogrulama.ps1
REPO_CONTRACT_COMPAT_M78_TOOLS_README_V1 -->

<!-- REPO_CONTRACT_COMPAT_M78_TOOLS_README_V2
tools\pack.ps1 -To 78
REPO_CONTRACT_COMPAT_M78_TOOLS_README_V2 -->

## Living pack klasör yapısı
- Grouped living pack path: `tools\packs\living\`
- Faz girişleri:
  - `tools\packs\living\pack_phase_m0_m41.ps1`
  - `tools\packs\living\pack_phase_m42_m58.ps1`
  - `tools\packs\living\pack_phase_m59_m66.ps1`
  - `tools\packs\living\pack_phase_m67_m75.ps1`
- Yardımcı doğrulamalar:
  - `tools\verify_living_static.ps1`
  - `tools\verify_living_runtime.ps1`

## Living hotfix grouping
- Grouped living hotfix path: `tools\packs\living\hotfixes`
- Bu hotfix pack/check girişleri tools root altında compatibility alias olarak korunur.
- compatibility alias örnekleri:
  - `tools\pack_m71_room_title_hotfix.ps1` -> `tools\packs\living\hotfixes\pack_m71_room_title_hotfix.ps1`
  - `tools\pack_m71_ui_contract_hotfix.ps1` -> `tools\packs\living\hotfixes\pack_m71_ui_contract_hotfix.ps1`
  - `tools\pack_m71_workflow_loadsummary_hotfix.ps1` -> `tools\packs\living\hotfixes\pack_m71_workflow_loadsummary_hotfix.ps1`
  - `tools\pack_m72_georeview_token_hotfix.ps1` -> `tools\packs\living\hotfixes\pack_m72_georeview_token_hotfix.ps1`
  - `tools\pack_m75_repo_contract_hotfix.ps1` -> `tools\packs\living\hotfixes\pack_m75_repo_contract_hotfix.ps1`

## M77 KVKK helper katmanı
- retention/export-trail-enforcement
- retention/export-trail-enforcement helper katmanı
- Referans: `docs\KVKK_RETENTION_ENFORCEMENT_V1.md`
- Referans: `docs\KVKK_EXPORT_ERISIM_IZI_V1.md`
- Referans: `docs\KVKK_ROLE_PAYLOAD_DARALTMA_V1.md`

## M78.1 operasyon doğrulama yüzeyi
- M78.1 operasyon doğrulama yüzeyi
- Super admin read-only operasyon doğrulama paneli
- operation verification / kanıt tipleri / durum özeti yüzeyi
- M78.1 pack: `tools\pack_m78_1_operasyon_dogrulama_yuzeyi.ps1`

## Pre-M80 hijyen notu
- File tabanli runtime store kullanan moduller icin atomik json yazimi uygulanir.
- `backend/scripts/repo_js_syntax_scan.js` backend script ve src agacinda syntax taramasi yapar.
- `npm --prefix backend run lint` artik placeholder degil; gercek syntax taramasi kosar.


## Repo contract state
- Makine-okur durum özeti: `tools\repo_contract_state.json`
- State-first docs-contract kuralı: önce `repo_contract_state.json`, sonra markdown anlatımı okunur.

## Pack hierarchy
- kanonik public pack kökü: `tools\packs\living`
- iç engine kökü: `tools\_packs`
- master pack public wrapper katmanını çağırır


## Root orchestration
- root lint: `npm run lint`
- hot-path smoke: `npm run verify:hot`
- docs/contract smoke: `npm run verify:docs`
- repo audit: `npm run audit:repo`

## M80 öncesi P2 hijyen notu
- `backend/data` altındaki runtime `.json` ve `.json.bak` dosyaları repo tarafından takip edilmez.
- Repo audit docs-contract ölçümü ham `.md` sayımı değil, doğrudan path-ref bağımlılığını izler.
- `tools/_repo_contract_state.ps1` ve `tools/repo_contract_state.json` state-first repo contract omurgasının kanonik girişidir.
