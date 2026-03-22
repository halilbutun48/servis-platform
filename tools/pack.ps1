# tools/pack.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,199)]
  [int]$To = 0,

  [Parameter(Mandatory=$false)]
  [string]$ComposeDir = "infra",

  [Parameter(Mandatory=$false)]
  [string]$RepoDir = ".",

  [Parameter(Mandatory=$false)]
  [string]$ApiService = "api",

  [Parameter(Mandatory=$false)]
  [switch]$NoBuild,

  [Parameter(Mandatory=$false)]
  [switch]$SkipStaticRepoChecks,

  [Parameter(Mandatory=$false)]
  [switch]$SkipRepoAudit
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")

$repo = (Resolve-Path $RepoDir).Path
$toolsDir = Join-Path $repo "tools"
$scriptsDir = Join-Path $repo "backend\scripts"

function Get-MaxGateMilestone {
  param([string]$ScriptsDir)
  if (-not (Test-Path $ScriptsDir)) { return 41 }

  $max = -1
  for ($i = 0; $i -lt 300; $i++) {
    $p = Join-Path $ScriptsDir ("m{0}check.js" -f $i)
    if (Test-Path $p) { $max = $i } else { break }
  }

  if ($max -lt 0) { return 41 }
  return $max
}

function Get-MaxPackMilestone {
  param([string]$ToolsDir, [int]$GateMax)

  $max = $GateMax
  if (-not (Test-Path $ToolsDir)) { return $max }

  Get-ChildItem -Path $ToolsDir -Filter "pack_m*.ps1" -File | ForEach-Object {
    if ($_.BaseName -match '^pack_m(\d+)') {
      $n = [int]$matches[1]
      if ($n -gt $max) { $max = $n }
    }
  }

  return $max
}

function Invoke-ToolScript {
  param(
    [string]$ScriptRel,
    [object[]]$Arguments = @()
  )

  $scriptPath = Join-Path $repo $ScriptRel
  if (-not (Test-Path $scriptPath)) {
    throw "Missing tool script: $ScriptRel"
  }

  & $scriptPath @Arguments
  if (-not $?) {
    throw "Tool script failed: $ScriptRel"
  }
}

function Run-StaticRepoChecks {
  Write-Host ""
  Write-StatusLine "=== STATIC REPO CHECKS ==="

  $checks = @(
    "tools\check_repo_cleanup_m104.ps1",
    "tools\check_tools_hygiene_m105.ps1",
    "tools\check_repo_hygiene_m106.ps1"
  )

  foreach ($checkRel in $checks) {
    $checkPath = Join-Path $repo $checkRel
    if (-not (Test-Path $checkPath)) {
      Write-StatusLine ("WARN skipped missing static check: {0}" -f $checkRel)
      continue
    }

    Write-Host ""
    Write-StatusLine ("--- {0} ---" -f (Split-Path $checkRel -Leaf))
    & $checkPath -RepoRoot $repo
    if (-not $?) { throw ("Static repo check failed: {0}" -f $checkRel) }
  }
}

function Run-RepoAudit {
  $auditScript = Join-Path $repo "tools\check_repo_audit_master.ps1"
  if (-not (Test-Path $auditScript)) {
    Write-StatusLine "WARN repo audit script missing; skipped."
    return
  }

  Write-Host ""
  Write-StatusLine "=== REPO AUDIT ==="
  & $auditScript -RepoRoot $repo
  if (-not $?) { throw "Repo audit script failed." }
}

$gateMax = Get-MaxGateMilestone -ScriptsDir $scriptsDir
$packMax = Get-MaxPackMilestone -ToolsDir $toolsDir -GateMax $gateMax

if ($To -le 0) {
  $To = $packMax
  Write-StatusLine ("INFO Auto -To: M{0}" -f $To)
}

Write-Host ""
Write-StatusLine ("=== PERSONEL-SERVIS V1 - MASTER PACK (M0->M{0}) ===" -f $To)
Write-StatusLine ("INFO Gate max: M{0}" -f $gateMax)
Write-StatusLine ("INFO Pack max: M{0}" -f $packMax)
Write-Host ""

if ($To -lt 0) { throw "Invalid -To value." }

if (-not $SkipStaticRepoChecks) {
  Run-StaticRepoChecks
}

if ($To -le $gateMax) {
  Write-Host ""
  Write-StatusLine ("=== RANGE: M0 -> M{0} (gate) ===" -f $To)
  Invoke-ToolScript -ScriptRel "tools\gate.ps1" -Arguments (@("-To", $To, "-ComposeDir", $ComposeDir, "-RepoDir", $RepoDir, "-ApiService", $ApiService) + @($(if ($NoBuild) { "-NoBuild" })))
} else {
  Write-Host ""
  Write-StatusLine ("=== RANGE: M0 -> M{0} (gate) ===" -f $gateMax)
  Invoke-ToolScript -ScriptRel "tools\gate.ps1" -Arguments (@("-To", $gateMax, "-ComposeDir", $ComposeDir, "-RepoDir", $RepoDir, "-ApiService", $ApiService) + @($(if ($NoBuild) { "-NoBuild" })))

  $steps = @(
    @{ Major = 42; Minor = 0; Name = "M42 OPTIONAL"; Script = "tools\pack_m42_optional.ps1"; Args = @("-RepoDir", $repo, "-ComposeDir", $ComposeDir) + @($(if ($NoBuild) { "-NoBuild" })) },
    @{ Major = 43; Minor = 1; Name = "STEP1 SECURITY FOUNDATION"; Script = "tools\pack_step1_security_foundation.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 43; Minor = 2; Name = "STEP1 TOTP STEP-UP"; Script = "tools\pack_step1_totp_stepup.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 43; Minor = 3; Name = "M43 GOOGLE AUTH INVITE GATE"; Script = "tools\pack_m43_google_auth_invite_gate.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 44; Minor = 0; Name = "M44 TELEMATICS"; Script = "tools\pack_m44_telematics.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 45; Minor = 0; Name = "M45 RETENTION BACKUP"; Script = "tools\pack_m45_retention_backup.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 0; Name = "M46 AI COPILOT FOUNDATION"; Script = "tools\pack_m46_ai_copilot.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 1; Name = "M46.1 AI COPILOT ENRICHMENT"; Script = "tools\pack_m46_1_ai_copilot_enrichment.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 2; Name = "M46.2 AI COPILOT INTENT EXPANSION"; Script = "tools\pack_m46_2_ai_copilot_intent_expansion.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 3; Name = "M46.3 AI COPILOT QUALITY EVIDENCE"; Script = "tools\pack_m46_3_ai_copilot_quality_evidence.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 4; Name = "M46.4 AI COPILOT DECISION CONSISTENCY"; Script = "tools\pack_m46_4_ai_copilot_decision_consistency.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 5; Name = "M46.5 AI COPILOT ACTION PRIORITIZATION"; Script = "tools\pack_m46_5_ai_copilot_action_prioritization.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 6; Name = "M46.6-A AI JOB GUIDE"; Script = "tools\pack_m46_6_a_ai_job_guide.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 7; Name = "M46.6-B AI JOB GUIDE PRECHECK"; Script = "tools\pack_m46_6_b_ai_job_guide_precheck.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 8; Name = "M46.6-C AI SCREEN HELP"; Script = "tools\pack_m46_6_c_ai_screen_help.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 9; Name = "M46.6-C2 SCREEN COVERAGE TERMINOLOGY"; Script = "tools\pack_m46_6_c2_screen_coverage_terminology.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 10; Name = "M46.6-D AI CHAT SHELL"; Script = "tools\pack_m46_6_d_ai_chat_shell.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 11; Name = "M46.6-D2 AI CONTEXT CHAT"; Script = "tools\pack_m46_6_d2_ai_context_chat.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 12; Name = "M46.6-D3 AI ACTIONABLE CHAT"; Script = "tools\pack_m46_6_d3_ai_actionable_chat.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 13; Name = "M46.6-D4 SIMPLE ROLE MODE"; Script = "tools\pack_m46_6_d4_simple_role_mode.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 14; Name = "M46.6-T AI LOCATION SOURCE GUIDE"; Script = "tools\pack_m46_6_t_ai_location_source_guide.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 15; Name = "M46.7 DRIVER CODE LOGIN REHBER FIRST"; Script = "tools\pack_m46_7_driver_code_login_rehber_first.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 16; Name = "M46.8 DRIVER ACCESS HARDENING"; Script = "tools\pack_m46_8_driver_access_hardening.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 46; Minor = 17; Name = "M46.9 SESSION REFRESH SECURITY"; Script = "tools\pack_m46_9_session_refresh_security.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 47; Minor = 0; Name = "M47 KVKK NOTICE CONSENT FRAMEWORK"; Script = "tools\pack_m47_kvkk_notice_consent_framework.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 47; Minor = 2; Name = "M47.2 CAPACITY LOAD BASELINE"; Script = "tools\pack_m47_2_capacity_load_baseline.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 47; Minor = 3; Name = "M47.3 PRODUCTION RESILIENCE EDGE SECURITY"; Script = "tools\pack_m47_3_production_resilience_edge_security.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 47; Minor = 4; Name = "M47.4 MOBILE READINESS WEB PASS"; Script = "tools\pack_m47_4_mobile_readiness_web_pass.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 48; Minor = 0; Name = "M48 DRIVER MOBILE FOUNDATION"; Script = "tools\pack_m48_driver_mobile_foundation.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 48; Minor = 5; Name = "M48.5 ROOM COMPANY TABLET READINESS"; Script = "tools\pack_m48_5_room_company_tablet_readiness.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 49; Minor = 0; Name = "M49 MOBILE BETA HARDENING"; Script = "tools\pack_m49_mobile_beta_hardening.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 49; Minor = 1; Name = "M49.1 DRIVER VOICE GUIDANCE STOP ETA"; Script = "tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 50; Minor = 0; Name = "M50 MOBILE RELEASE READINESS"; Script = "tools\pack_m50_mobile_release_readiness.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 51; Minor = 53; Name = "M51-M53 BACKFILL VERIFICATION"; Script = "tools\pack_m51_53_backfill_verification.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 54; Minor = 3; Name = "M54.3 DISPATCH APPROVE REPACK"; Script = "tools\pack_m54_3_dispatch_approve_repack.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 54; Minor = 4; Name = "M54.4 DRIVER ROUTE DELIVERY"; Script = "tools\pack_m54_4_driver_route_delivery.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 55; Minor = 0; Name = "M55 REPORTS NO_SHOW"; Script = "tools\pack_m55_reports_no_show.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 56; Minor = 0; Name = "M56 KVKK MATRIX ETA QUALITY"; Script = "tools\pack_m56_kvkk_eta_quality.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 57; Minor = 0; Name = "M57 MOBILE HARDENING"; Script = "tools\pack_m57_mobile_hardening.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 58; Minor = 0; Name = "M58 FINAL PILOT READINESS"; Script = "tools\pack_m58_final_pilot_readiness.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 59; Minor = 0; Name = "M59 OBSERVABILITY FIELD DIAGNOSTICS"; Script = "tools\pack_m59_observability_field_diagnostics.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 60; Minor = 0; Name = "M60 FIELD ACCEPTANCE CENTER"; Script = "tools\pack_m60_field_acceptance_center.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 61; Minor = 0; Name = "M61 SSOT MILESTONE ALIGNMENT"; Script = "tools\pack_m61_ssot_milestone_alignment.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 62; Minor = 0; Name = "M62 COMMERCIAL CORE STRENGTHENING"; Script = "tools\pack_m62_commercial_core_strengthening.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 63; Minor = 0; Name = "M63 TRUST QUALITY SERVICE EVALUATION"; Script = "tools\pack_m63_trust_quality_service_evaluation.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 64; Minor = 0; Name = "M64 NATURAL COPILOT LAYER"; Script = "tools\pack_m64_natural_copilot_layer.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 65; Minor = 0; Name = "M65 PILOT LAUNCH GATE"; Script = "tools\pack_m65_pilot_launch_gate.ps1"; Args = @("-RepoRoot", $repo) },
    @{ Major = 66; Minor = 0; Name = "M66 OPERATION REASSIGNMENT"; Script = "tools\pack_m66_operation_reassignment.ps1"; Args = @("-RepoRoot", $repo) }
  )

  foreach ($step in $steps | Sort-Object Major, Minor) {
    if ($step.Major -gt $To) { continue }

    Write-Host ""
    Write-StatusLine ("=== RUNNING: {0} ===" -f $step.Name)
    Invoke-ToolScript -ScriptRel $step.Script -Arguments $step.Args
  }
}

if (-not $SkipRepoAudit) {
  Run-RepoAudit
}

Write-Host ""
Write-StatusLine ("=== MASTER PACK PASS OK (M0->M{0}) ===" -f $To)
Write-Host ""
