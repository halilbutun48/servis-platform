param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function Info($m) { Write-Host "INFO $m" }
function Ok($m) { Write-Host "OK $m" }
function MustExist($rel) {
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }
  Ok "$rel exists"
}
function MustAbsent($rel) {
  $p = Join-Path $RepoRoot $rel
  if (Test-Path -LiteralPath $p) { throw "FAIL $rel still in tools root" }
  Ok "$rel archived from tools root"
}
function MustContain($rel, $needle, $label) {
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if ($txt -notlike "*$needle*") { throw "FAIL $label" }
  Ok $label
}
function MustContainAny($rel, $needles, $label) {
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  foreach ($needle in $needles) {
    if ($txt -like "*$needle*") { Ok $label; return }
  }
  throw "FAIL $label"
}

Info "Checking canonical tools root files"
@(
  "tools\README.md","tools\PRIMER_SNAPSHOT.md","tools\CHECKLIST_SSOT.md","tools\STABLE_TO.txt","tools\_console_status.ps1",
  "tools\gate.ps1","tools\gate.cmd","tools\pack.ps1","tools\pack.cmd","tools\pack_m42_optional.ps1","tools\pack_step06_stabil.ps1",
  "tools\pack_step1_security_foundation.ps1","tools\pack_step1_totp_stepup.ps1","tools\reset-and-pack.ps1",
  "tools\check_repo_cleanup_m104.ps1","tools\check_step06_repo_contract.ps1","tools\check_step1_security_foundation_repo_contract.ps1",
  "tools\check_step1_totp_stepup_repo_contract.ps1","tools\check_tools_hygiene_m105.ps1","tools\check_repo_hygiene_m106.ps1"
) | ForEach-Object { MustExist $_ }

Info "Checking tools archive folders"
@("tools\_archive\legacy-overlays","tools\_archive\oneoff-hotfixes","tools\_archive\legacy-docs","tools\_backup") | ForEach-Object { MustExist $_ }

Info "Checking legacy files removed from tools root"
@(
  "tools\apply_organization_plan_relation_fix.ps1","tools\apply_organization_schema_dedupe_hotfix.ps1","tools\apply_overlay_m42_schema_restore.ps1",
  "tools\apply_overlay_m96_company_list_click_details.ps1","tools\apply_overlay_organization_enum_fix.ps1","tools\apply_overlay_organization_market_direct_live_fix.ps1",
  "tools\apply_overlay_organization_market_direct_live_fix_v2.ps1","tools\apply_overlay_organization_market_first_fix.ps1","tools\apply_overlay_organization_seed_router_fix.ps1",
  "tools\apply_overlay_personel_public_link_fix.ps1","tools\apply_overlay_room_shifts_panel_fix.ps1","tools\build_overlay_bundle.ps1",
  "tools\dedupe-user-notifications.ps1","tools\fix-escaped-import-quotes.ps1","tools\overlay_fix_driver_completeshift_crash.ps1","tools\overlay_fix_m41_device_binding.ps1",
  "tools\overlay_M58_3_apply.ps1","tools\overlay_M58_4_apply.ps1","tools\overlay_M58_5_apply.ps1","tools\overlay_M58_6_apply.ps1","tools\overlay_M59_1_apply.ps1","tools\overlay_M59_apply.ps1",
  "tools\overlay_update_checklist_ssot.ps1","tools\overlay_update_checklist_ssot_safe.ps1","tools\overlay_update_checklist_ssot_user.ps1","tools\overlay_update_primer_snapshot_safe.ps1",
  "tools\repair-schema-kind.ps1","tools\PRIMER SNAPSHOT (Yeni).md",
  "tools\apply_overlay_m46_6_c2_d4_simple_role_mode.ps1","tools\apply_overlay_m46_6_c2_screen_coverage_terminology.ps1","tools\apply_overlay_m46_7_ssot_sync.ps1",
  "tools\OVERLAY_FIX_DRIVER_COMPLETESHIFT_README.md","tools\OVERLAY_FIX_M41_README.md","tools\OVERLAY_M42_OPTIONAL_HOTFIX_README.md","tools\OVERLAY_M42_OPTIONAL_RELEASE_README.md",
  "tools\OVERLAY_M58_3_README.md","tools\OVERLAY_M58_4_README.md","tools\OVERLAY_M58_5_README.md","tools\OVERLAY_M58_6_README.md","tools\OVERLAY_M59_1_README.md","tools\OVERLAY_M59_README.md",
  "tools\OVERLAY_UPDATE_CHECKLIST_SSOT_README.md","tools\OVERLAY_UPDATE_CHECKLIST_SSOT_SAFE_README.md","tools\OVERLAY_UPDATE_CHECKLIST_SSOT_USER_README.md","tools\OVERLAY_UPDATE_PRIMER_SNAPSHOT_README.md"
) | ForEach-Object { MustAbsent $_ }

Info "Checking docs sync"
MustContainAny "tools\README.md" @("TOOLS_HYGIENE_CHECK_MARKER_V1","check_tools_hygiene_m105.ps1","Tools hijyen check markerı") "tools readme hygiene check sync"
MustContainAny "README.md" @("TOOLS_HYGIENE_CANONICAL_V1","Kanonik tools düzeni") "root readme tools section"
MustContainAny "docs\STARTPACK_V1.md" @("STARTPACK_TOOLS_HYGIENE_V1","repo/tools hijyen check") "startpack tools hygiene sync"
MustContainAny "docs\CHECKLIST_SSOT.md" @("TOOLS_CANONICAL_CLEANUP_M105_V1","M105 Tools Canonical Cleanup","M76B","Tools Consolidation","Kanonik tools") "docs checklist tools cleanup section"
MustContainAny "tools\CHECKLIST_SSOT.md" @("TOOLS_CANONICAL_CLEANUP_M105_V1","M105 Tools Canonical Cleanup","M76B","Tools Consolidation","Kanonik tools") "tools checklist tools cleanup section"
MustExist "docs\overlays\OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10.md"

Write-Host "TOOLS HYGIENE M105 CHECK PASS"
