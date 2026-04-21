# TOOLS README

<!-- TOOLS_HYGIENE_CHECK_MARKER_V1 -->

## Kanonik komutlar
- Tek repo kontrol zinciri: `npm run verify:repo`
- PowerShell wrapper: `tools\check-repo.ps1 -Phase all`
- Faz listeleme: `node backend\scripts\run_repo_check_chain.js --list`
- Güncel master doğrulama: `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- Living master doğrulama: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Living static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doğrulama: `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M90B.1 executable closure gate: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- M90C.6 hot-file queue policy: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- M90C.7 export / package hygiene closure: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- Physical snapshot hygiene soft gate: `npm run verify:snapshot`
- M90C.8 CI / verification visibility: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`
- M90C.9 güvenli kapanış / final hygiene checklist: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Root verify chain canonical entry: `npm run verify:repo`
- Milestone static chain: `npm run verify:milestones`
- M0->latest runner: `node backend\scripts\run_m0_latest.js --static-only --to latest --continue`
- M92 repo verification spine: `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`
- Root verify zinciri web lint kanıtını `artifacts/lint/web_lint_latest.txt` dosyasına yazar
- Final verify chain: `npm run verify:final`
- `verify:final`, `verify:repo` zincirinden sonra `verify:snapshot` soft gate raporunu da yeniler.
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

## Tarihsel anchor / compatibility marker
- Tarihsel tam master referansı: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- `tools\STABLE_TO.txt = 78` M78.x compatibility marker olarak kalır.
- `tools\pack.ps1 -To 82` ve `tools\pack_m82_1_backend_correctness.ps1` M82.1 correctness kilidinin tarihsel giriş kapısı olarak yaşar.

## Upper route packleri
- M80 kabul kapısı: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 hot panel daraltma: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 agreements/shifts giriş yükü: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.3 georeview/shifts son giriş yükü: `tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M81 mobil saha sertleştirme: `tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform`
- M82.1 backend correctness paketi: `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- M82.8 verification 2.0 paketi: `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- M82.9 dormant payment backbone paketi: `tools\pack_m82_9_dormant_payment_backbone.ps1 -RepoRoot D:\servis-platform`
- M82.10 super admin ticari ayarlar paketi: `tools\pack_m82_10_super_admin_commercial_settings.ps1 -RepoRoot D:\servis-platform`
- M82.11 payment readonly ticari yüzey paketi: `tools\pack_m82_11_payment_readonly_surface.ps1 -RepoRoot D:\servis-platform`
- M83 saha hazırlık paketi: `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- M84 saha geri bildirim döngüsü: `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- M85 opsiyonel ödeme pilotu: `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- M86 zorunlu ödeme rollout: `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- M87 ödeme hesabı hazırlığı: `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- M88 settlement operasyon masası: `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- M89 settlement mutabakat masası: `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## M90 yönü
- M90 yeni ürün modülü değildir.
- Amaç: docs/state/pack/verify/proof sistemini tek canonical gerçeğe toplamak.
- İlk yürütülebilir kapanış kapısı: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- Sıradaki resmi kapanış kuyruğu: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Single-roof repo check: `npm run verify:repo`
- Milestone static chain: `npm run verify:milestones`
- M91 route preview / shift agreement check: `npm --prefix backend run m91check`
- M91 compatibility milestone sweep: `npm --prefix backend run m91:milestones`
- M91 family runner: `node backend\scripts\run_m91_route_preview_checks.js`
- M92 repo verification spine check: `npm --prefix backend run m92check`
- Root verify zinciri web lint kanıtını `artifacts/lint/web_lint_latest.txt` dosyasına yazar
- Final verify chain: `npm run verify:final`
- Kanonik web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- CI workflow: `.github/workflows/vardis_verification_visibility.yml`
- Shareable repo zip üretimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- `verify:snapshot` fiziksel dosya yüzeyini raporlar; `verify:final` bu raporu yeniler ama ilk turda hard blocker değildir.
- Windows tarafinda export/hijyen kapanisinda `pwsh` tercih edilir.
- Satır azaltma en sona bırakılır; önce acceptance + export/package hijyeni + CI görünürlüğü + güvenli kapanış checklist'i kapanır.
- Tek rehber: `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`

## REPO_CONTRACT_MARKERS_V1
- TOOLS_README_STATE_FIRST_ROUTE_V1
- TOOLS_README_ROUTE_M59_V1
- TOOLS_README_ROUTE_M63_V1
- TOOLS_README_ROUTE_M64_V1
- TOOLS_README_ROUTE_M65_V1
- TOOLS_README_LIVING_PACK_M89_V1

## TOOLS_README_WARN_CLEANUP_M90D_V1
- TOOLS_README_ROUTE_M45_RETENTION_BACKUP_V1
- TOOLS_README_ROUTE_M47_4_MOBILE_READINESS_V1
- TOOLS_README_ROUTE_M48_5_TABLET_READINESS_V1
- TOOLS_README_ROUTE_M49_MOBILE_BETA_HARDENING_V1
- TOOLS_README_ROUTE_M49_1_VOICE_STOP_ETA_V1
- TOOLS_README_ROUTE_M50_RELEASE_READINESS_V1
- TOOLS_README_ROUTE_M51_53_BACKFILL_VERIFICATION_V1
- TOOLS_README_ROUTE_M54_4_DRIVER_ROUTE_DELIVERY_V1
- TOOLS_README_ROUTE_M57_MOBILE_HARDENING_V1
- TOOLS_README_ROUTE_M60_FIELD_ACCEPTANCE_V1
- TOOLS_README_ROUTE_M62_COMMERCIAL_CORE_V1


## Final closure order
- `npm run verify:final`
- `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- `git status --short`
- Beklenen fark disinda degisiklik yoksa commit/tag/push

## Final release evidence
- Evidence üretimi: `tools\write_m90_final_release_evidence.ps1 -RepoRoot D:\servis-platform`
- Kanonik özet dosyası: `docs/FINAL_RELEASE_EVIDENCE_M90.md`


## Wrapper / alias envanteri
- Resmi günlük giriş: `npm run verify:repo`
- Resmi kapanış: `npm run verify:final`
- Root PowerShell günlük wrapper: `tools\check-repo.ps1`
- Root living girişleri (`tools\pack_living.ps1`, `tools\verify_living_static.ps1`, `tools\verify_living_runtime.ps1`) compat-only / geniş prova hattı olarak korunur.
- Wrapper-first yön için `tools\wrappers\` altında paralel girişler bulunur.
- Eski root çağrıları kırılmaz; önce görünür etiketleme, sonra gerekiyorsa archive planı uygulanır.

## Compatibility alias clarity
- Root hotfix check wrappers such as `tools\check_m71_room_title_hotfix_repo_contract.ps1`, `tools\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1` and `tools\check_m72_georeview_token_hotfix_repo_contract.ps1` intentionally remain as backward-compatible aliases.
- Canonical implementations live under `tools\checks\living\hotfixes\`.
- `repo_audit` excludes explicit compatibility aliases from the duplicate-check consolidation metric.

## Repo audit consolidation note
- Duplicate pack/check consolidation uses semantic PowerShell signatures.
- Explicit `compatibility_alias` wrappers are counted separately and excluded from raw consolidation totals.
