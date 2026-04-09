param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")

Write-Host "=== M80-M89 CONTRACT SWEEP ==="

$state = Read-RepoContractState -RepoRoot $RepoRoot
Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 89 -Label 'state latest master pack is 89'
Assert-RepoContractStateValue -State $state -Property 'latestHistoricalMasterPack' -Expected 79 -Label 'state latest historical master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'nextMilestone' -Expected 'M90' -Label 'state next milestone is M90'
Assert-RepoContractStateValue -State $state -Property 'historicalNextMilestone' -Expected 'M80' -Label 'state historical next milestone is M80'
Assert-RepoContractStateValue -State $state -Property 'livingUpperRouteFrom' -Expected 80 -Label 'state living upper route starts at M80'
Assert-RepoContractStateValue -State $state -Property 'livingUpperRouteTo' -Expected 89 -Label 'state living upper route ends at M89'

$manifest = Get-Content (Join-Path $RepoRoot 'tools\milestone_pack_manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$required = @(
  @{ Id='M80'; Script='tools\pack_m80_final_sert_kabul_yuk_guveni.ps1'; Check='tools\check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1'; Runtime='backend\scripts\m80_final_sert_kabul_yuk_guveni_check.js'; Runbook='docs\RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md' },
  @{ Id='M80.1'; Script='tools\pack_m80_1_hot_panel_daraltma.ps1'; Check='tools\check_m80_1_hot_panel_daraltma_repo_contract.ps1'; Runtime='backend\scripts\m80_1_hot_panel_daraltma_check.js'; Runbook='docs\RUNBOOK_M80_1_HOT_PANEL_DARALTMA.md' },
  @{ Id='M80.2'; Script='tools\pack_m80_2_agreements_shifts_giris_yuku.ps1'; Check='tools\check_m80_2_agreements_shifts_giris_yuku_repo_contract.ps1'; Runtime='backend\scripts\m80_2_agreements_shifts_giris_yuku_check.js'; Runbook='docs\RUNBOOK_M80_2_AGREEMENTS_SHIFTS_GIRIS_YUKU.md' },
  @{ Id='M80.3'; Script='tools\pack_m80_3_georeview_shifts_son_giris_yuku.ps1'; Check='tools\check_m80_3_georeview_shifts_son_giris_yuku_repo_contract.ps1'; Runtime='backend\scripts\m80_3_georeview_shifts_son_giris_yuku_check.js'; Runbook='docs\RUNBOOK_M80_3_GEOREVIEW_SHIFTS_SON_GIRIS_YUKU.md' },
  @{ Id='M81'; Script='tools\pack_m81_mobile_saha_sertlestirme.ps1'; Check='tools\check_m81_mobile_saha_sertlestirme_repo_contract.ps1'; Runtime=''; Runbook='docs\RUNBOOK_M81_MOBILE_SAHA_SERTLESTIRME.md' },
  @{ Id='M82.1'; Script='tools\pack_m82_1_backend_correctness.ps1'; Check='tools\check_m82_1_backend_correctness_repo_contract.ps1'; Runtime='backend\scripts\m82_1_correctness_guard_check.js'; Runbook='docs\RUNBOOK_M82_1_BACKEND_CORRECTNESS.md' },
  @{ Id='M82.8'; Script='tools\pack_m82_8_verification_2_0.ps1'; Check='tools\check_m82_8_verification_2_0_repo_contract.ps1'; Runtime='mobile\scripts\m82_8_verification_2_0_check.js'; Runbook='docs\RUNBOOK_M82_8_VERIFICATION_2_0.md' },
  @{ Id='M82.9'; Script='tools\pack_m82_9_dormant_payment_backbone.ps1'; Check='tools\check_m82_9_dormant_payment_backbone_repo_contract.ps1'; Runtime='backend\scripts\m82_9_dormant_payment_backbone_check.js'; Runbook='docs\RUNBOOK_M82_9_DORMANT_PAYMENT_BACKBONE.md' },
  @{ Id='M82.10'; Script='tools\pack_m82_10_super_admin_commercial_settings.ps1'; Check='tools\check_m82_10_super_admin_commercial_settings_repo_contract.ps1'; Runtime='backend\scripts\m82_10_super_admin_commercial_settings_check.js'; Runbook='docs\RUNBOOK_M82_10_SUPER_ADMIN_COMMERCIAL_SETTINGS.md' },
  @{ Id='M82.11'; Script='tools\pack_m82_11_payment_readonly_surface.ps1'; Check='tools\check_m82_11_payment_readonly_surface_repo_contract.ps1'; Runtime='backend\scripts\m82_11_payment_readonly_surface_check.js'; Runbook='docs\RUNBOOK_M82_11_PAYMENT_READONLY_SURFACE.md' },
  @{ Id='M83'; Script='tools\pack_m83_field_prep_packet.ps1'; Check='tools\check_m83_field_prep_packet_repo_contract.ps1'; Runtime='backend\scripts\m83_field_prep_packet_check.js'; Runbook='docs\RUNBOOK_M83_FIELD_PREP_PACKET.md' },
  @{ Id='M84'; Script='tools\pack_m84_field_feedback_loop.ps1'; Check='tools\check_m84_field_feedback_loop_repo_contract.ps1'; Runtime='backend\scripts\m84_field_feedback_loop_check.js'; Runbook='docs\RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md' },
  @{ Id='M85'; Script='tools\pack_m85_optional_payment_pilot.ps1'; Check='tools\check_m85_optional_payment_pilot_repo_contract.ps1'; Runtime='backend\scripts\m85_optional_payment_pilot_check.js'; Runbook='docs\RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md' },
  @{ Id='M86'; Script='tools\pack_m86_required_payment_rollout.ps1'; Check='tools\check_m86_required_payment_rollout_repo_contract.ps1'; Runtime='backend\scripts\m86_required_payment_rollout_check.js'; Runbook='docs\RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md' },
  @{ Id='M87'; Script='tools\pack_m87_payment_account_readiness.ps1'; Check='tools\check_m87_payment_account_readiness_repo_contract.ps1'; Runtime='backend\scripts\m87_payment_account_readiness_check.js'; Runbook='docs\RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md' },
  @{ Id='M88'; Script='tools\pack_m88_settlement_operations_console.ps1'; Check='tools\check_m88_settlement_operations_console_repo_contract.ps1'; Runtime='backend\scripts\m88_settlement_operations_console_check.js'; Runbook='docs\RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md' },
  @{ Id='M89'; Script='tools\pack_m89_settlement_reconciliation_desk.ps1'; Check='tools\check_m89_settlement_reconciliation_desk_repo_contract.ps1'; Runtime='backend\scripts\m89_settlement_reconciliation_desk_check.js'; Runbook='docs\RUNBOOK_M89_SETTLEMENT_RECONCILIATION_DESK.md' }
)

foreach ($item in $required) {
  Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $item.Script
  Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $item.Check
  if (-not [string]::IsNullOrWhiteSpace($item.Runtime)) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $item.Runtime }
  Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $item.Runbook

  $stage = @($manifest.stages | Where-Object { $_.id -eq $item.Id })[0]
  if ($null -eq $stage) { throw "FAIL manifest missing stage $($item.Id)" }
  Write-Host "OK manifest contains $($item.Id)"
}

Write-Host "=== M80-M89 CONTRACT SWEEP PASS ==="
