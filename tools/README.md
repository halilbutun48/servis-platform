# TOOLS README

<!-- TOOLS_HYGIENE_CHECK_MARKER_V1 -->

## Kanonik komutlar
- GÃ¼ncel master doÄŸrulama: `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- Living master doÄŸrulama: `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Living static doÄŸrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Living runtime doÄŸrulama: `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M90B.1 executable closure gate: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- M90C.6 hot-file queue policy: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- M90C.7 export / package hygiene closure: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- M90C.8 CI / verification visibility: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`
- M90C.9 gÃ¼venli kapanÄ±ÅŸ / final hygiene checklist: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Root verify zinciri web lint kanÄ±tÄ±nÄ± `artifacts/lint/web_lint_latest.txt` dosyasÄ±na yazar
- Final verify chain: `npm run verify:final`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

## Tarihsel anchor / compatibility marker
- Tarihsel tam master referansÄ±: `tools\pack.ps1 -To 79 -RepoDir D:\servis-platform -NoBuild`
- `tools\STABLE_TO.txt = 78` M78.x compatibility marker olarak kalÄ±r.
- `tools\pack.ps1 -To 82` ve `tools\pack_m82_1_backend_correctness.ps1` M82.1 correctness kilidinin tarihsel giriÅŸ kapÄ±sÄ± olarak yaÅŸar.

## Upper route packleri
- M80 kabul kapÄ±sÄ±: `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`
- M80.1 hot panel daraltma: `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`
- M80.2 agreements/shifts giriÅŸ yÃ¼kÃ¼: `tools\pack_m80_2_agreements_shifts_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M80.3 georeview/shifts son giriÅŸ yÃ¼kÃ¼: `tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1 -RepoRoot D:\servis-platform`
- M81 mobil saha sertleÅŸtirme: `tools\pack_m81_mobile_saha_sertlestirme.ps1 -RepoRoot D:\servis-platform`
- M82.1 backend correctness paketi: `tools\pack_m82_1_backend_correctness.ps1 -RepoRoot D:\servis-platform`
- M82.8 verification 2.0 paketi: `tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`
- M82.9 dormant payment backbone paketi: `tools\pack_m82_9_dormant_payment_backbone.ps1 -RepoRoot D:\servis-platform`
- M82.10 super admin ticari ayarlar paketi: `tools\pack_m82_10_super_admin_commercial_settings.ps1 -RepoRoot D:\servis-platform`
- M82.11 payment readonly ticari yÃ¼zey paketi: `tools\pack_m82_11_payment_readonly_surface.ps1 -RepoRoot D:\servis-platform`
- M83 saha hazÄ±rlÄ±k paketi: `tools\pack_m83_field_prep_packet.ps1 -RepoRoot D:\servis-platform`
- M84 saha geri bildirim dÃ¶ngÃ¼sÃ¼: `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- M85 opsiyonel Ã¶deme pilotu: `tools\pack_m85_optional_payment_pilot.ps1 -RepoRoot D:\servis-platform`
- M86 zorunlu Ã¶deme rollout: `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- M87 Ã¶deme hesabÄ± hazÄ±rlÄ±ÄŸÄ±: `tools\pack_m87_payment_account_readiness.ps1 -RepoRoot D:\servis-platform`
- M88 settlement operasyon masasÄ±: `tools\pack_m88_settlement_operations_console.ps1 -RepoRoot D:\servis-platform`
- M89 settlement mutabakat masasÄ±: `tools\pack_m89_settlement_reconciliation_desk.ps1 -RepoRoot D:\servis-platform`

## M90 yÃ¶nÃ¼
- M90 yeni Ã¼rÃ¼n modÃ¼lÃ¼ deÄŸildir.
- AmaÃ§: docs/state/pack/verify/proof sistemini tek canonical gerÃ§eÄŸe toplamak.
- Ä°lk yÃ¼rÃ¼tÃ¼lebilir kapanÄ±ÅŸ kapÄ±sÄ±: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- SÄ±radaki resmi kapanÄ±ÅŸ kuyruÄŸu: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Root verify chain: `npm run verify:ci`
- Root verify zinciri web lint kanÄ±tÄ±nÄ± `artifacts/lint/web_lint_latest.txt` dosyasÄ±na yazar
- Final verify chain: `npm run verify:final`
- Kanonik web lint kanÄ±tÄ±: `artifacts/lint/web_lint_latest.txt`
- CI workflow: `.github/workflows/vardis_verification_visibility.yml`
- Shareable repo zip Ã¼retimi: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- Windows tarafinda export/hijyen kapanisinda `pwsh` tercih edilir.
- SatÄ±r azaltma en sona bÄ±rakÄ±lÄ±r; Ã¶nce acceptance + export/package hijyeni + CI gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼ + gÃ¼venli kapanÄ±ÅŸ checklist'i kapanÄ±r.
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
- Evidence Ã¼retimi: `tools\write_m90_final_release_evidence.ps1 -RepoRoot D:\servis-platform`
- Kanonik Ã¶zet dosyasÄ±: `docs/FINAL_RELEASE_EVIDENCE_M90.md`
