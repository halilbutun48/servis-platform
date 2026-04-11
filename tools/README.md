# TOOLS README

<!-- TOOLS_HYGIENE_CHECK_MARKER_V1 -->

## Kanonik komutlar
- GÃƒÂ¼ncel master doÃ„Å¸rulama: `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- Living master doÃ„Å¸rulama: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Living static doÃ„Å¸rulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doÃ„Å¸rulama: `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M90B.1 executable closure gate: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- M90C.6 hot-file queue policy: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- M90C.7 export / package hygiene closure: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- M90C.8 CI / verification visibility: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`
- M90C.9 gÃƒÂ¼venli kapanÃ„Â±Ã…Å¸ / final hygiene checklist: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Root verify zinciri web lint kanÃ„Â±tÃ„Â±nÃ„Â± `artifacts/lint/web_lint_latest.txt` dosyasÃ„Â±na yazar
- Final verify chain: `npm run verify:final`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

## Tarihsel anchor / compatibility marker
- Tarihsel tam master referansÃ„Â±: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- `tools\STABLE_TO.txt = 78` M78.x compatibility marker olarak kalÃ„Â±r.
- `tools\pack.ps1 -To 82` ve `tools\pack_m82_1_backend_correctness.ps1` M82.1 correctness kilidinin tarihsel giriÃ…Å¸ kapÃ„Â±sÃ„Â± olarak yaÃ…Å¸ar.

## Upper route packleri
- M80 kabul kapÃ„Â±sÃ„Â±: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 hot panel daraltma: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 agreements/shifts giriÃ…Å¸ yÃƒÂ¼kÃƒÂ¼: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.3 georeview/shifts son giriÃ…Å¸ yÃƒÂ¼kÃƒÂ¼: `tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M81 mobil saha sertleÃ…Å¸tirme: `tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform`
- M82.1 backend correctness paketi: `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- M82.8 verification 2.0 paketi: `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- M82.9 dormant payment backbone paketi: `tools\pack_m82_9_dormant_payment_backbone.ps1 -RepoRoot D:\servis-platform`
- M82.10 super admin ticari ayarlar paketi: `tools\pack_m82_10_super_admin_commercial_settings.ps1 -RepoRoot D:\servis-platform`
- M82.11 payment readonly ticari yÃƒÂ¼zey paketi: `tools\pack_m82_11_payment_readonly_surface.ps1 -RepoRoot D:\servis-platform`
- M83 saha hazÃ„Â±rlÃ„Â±k paketi: `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- M84 saha geri bildirim dÃƒÂ¶ngÃƒÂ¼sÃƒÂ¼: `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- M85 opsiyonel ÃƒÂ¶deme pilotu: `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- M86 zorunlu ÃƒÂ¶deme rollout: `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- M87 ÃƒÂ¶deme hesabÃ„Â± hazÃ„Â±rlÃ„Â±Ã„Å¸Ã„Â±: `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- M88 settlement operasyon masasÃ„Â±: `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- M89 settlement mutabakat masasÃ„Â±: `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## M90 yÃƒÂ¶nÃƒÂ¼
- M90 yeni ÃƒÂ¼rÃƒÂ¼n modÃƒÂ¼lÃƒÂ¼ deÃ„Å¸ildir.
- AmaÃƒÂ§: docs/state/pack/verify/proof sistemini tek canonical gerÃƒÂ§eÃ„Å¸e toplamak.
- Ã„Â°lk yÃƒÂ¼rÃƒÂ¼tÃƒÂ¼lebilir kapanÃ„Â±Ã…Å¸ kapÃ„Â±sÃ„Â±: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- SÃ„Â±radaki resmi kapanÃ„Â±Ã…Å¸ kuyruÃ„Å¸u: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Root verify zinciri web lint kanÃ„Â±tÃ„Â±nÃ„Â± `artifacts/lint/web_lint_latest.txt` dosyasÃ„Â±na yazar
- Final verify chain: `npm run verify:final`
- Kanonik web lint kanÃ„Â±tÃ„Â±: `artifacts/lint/web_lint_latest.txt`
- CI workflow: `.github/workflows/vardis_verification_visibility.yml`
- Shareable repo zip ÃƒÂ¼retimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- Windows tarafinda export/hijyen kapanisinda `pwsh` tercih edilir.
- SatÃ„Â±r azaltma en sona bÃ„Â±rakÃ„Â±lÃ„Â±r; ÃƒÂ¶nce acceptance + export/package hijyeni + CI gÃƒÂ¶rÃƒÂ¼nÃƒÂ¼rlÃƒÂ¼Ã„Å¸ÃƒÂ¼ + gÃƒÂ¼venli kapanÃ„Â±Ã…Å¸ checklist'i kapanÃ„Â±r.
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
- `pwsh -ExecutionPolicy Bypass -File .	ools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- `pwsh -ExecutionPolicy Bypass -File .	ools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- `git status --short`
- Beklenen fark disinda degisiklik yoksa commit/tag/push

## Final release evidence
- Evidence ÃƒÂ¼retimi: `tools\write_m90_final_release_evidence.ps1 -RepoRoot D:\servis-platform`
- Kanonik ÃƒÂ¶zet dosyasÃ„Â±: `docs/FINAL_RELEASE_EVIDENCE_M90.md`

## Compatibility alias clarity
- Root hotfix check wrappers such as `tools\check_m71_room_title_hotfix_repo_contract.ps1`, `tools\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1` and `tools\check_m72_georeview_token_hotfix_repo_contract.ps1` intentionally remain as backward-compatible aliases.
- Canonical implementations live under `tools\checks\living\hotfixes\`.
- `repo_audit` excludes explicit compatibility aliases from the duplicate-check consolidation metric.

## Repo audit consolidation note
- Duplicate pack/check consolidation uses semantic PowerShell signatures.
- Explicit `compatibility_alias` wrappers are counted separately and excluded from raw consolidation totals.
