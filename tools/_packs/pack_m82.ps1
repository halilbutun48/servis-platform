param(
  [Parameter(Mandatory=$false)][ValidateRange(82,89)][int]$To = 89,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '_repo_hygiene_preflight.ps1')
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..')).Path
}
. (Join-Path $ScriptRoot '_pack_phase_common.ps1')

Set-Location $RepoRoot
Write-Host ''
Write-StatusLine ("=== SUBPACK: M82 -> M{0} ===" -f $To)
Write-StatusLine 'INFO Canonical upper-route pack: M82 bandi once kapanir, ardindan M83->M89 sirali ilerler.'
Write-Host ''

function Invoke-UpperRoutePack {
  param([string]$ScriptRel, [string]$FailMessage)
  & (Join-Path $RepoRoot $ScriptRel) -RepoRoot $RepoRoot -NoBuild:$NoBuild
  if (-not $?) { throw $FailMessage }
}

if ($To -ge 82) {
  Invoke-UpperRoutePack -ScriptRel 'tools\pack_m82_1_backend_correctness.ps1' -FailMessage 'm82.1 pack failed'
  Invoke-UpperRoutePack -ScriptRel 'tools\pack_m82_8_verification_2_0.ps1' -FailMessage 'm82.8 pack failed'
  Invoke-UpperRoutePack -ScriptRel 'tools\pack_m82_9_dormant_payment_backbone.ps1' -FailMessage 'm82.9 pack failed'
  Invoke-UpperRoutePack -ScriptRel 'tools\pack_m82_10_super_admin_commercial_settings.ps1' -FailMessage 'm82.10 pack failed'
  Invoke-UpperRoutePack -ScriptRel 'tools\pack_m82_11_payment_readonly_surface.ps1' -FailMessage 'm82.11 pack failed'
}
if ($To -ge 83) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m83_field_prep_packet.ps1' -FailMessage 'm83 pack failed' }
if ($To -ge 84) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m84_field_feedback_loop.ps1' -FailMessage 'm84 pack failed' }
if ($To -ge 85) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m85_optional_payment_pilot.ps1' -FailMessage 'm85 pack failed' }
if ($To -ge 86) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m86_required_payment_rollout.ps1' -FailMessage 'm86 pack failed' }
if ($To -ge 87) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m87_payment_account_readiness.ps1' -FailMessage 'm87 pack failed' }
if ($To -ge 88) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m88_settlement_operations_console.ps1' -FailMessage 'm88 pack failed' }
if ($To -ge 89) { Invoke-UpperRoutePack -ScriptRel 'tools\pack_m89_settlement_reconciliation_desk.ps1' -FailMessage 'm89 pack failed' }

