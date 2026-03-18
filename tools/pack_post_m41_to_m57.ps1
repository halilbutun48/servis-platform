param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$ComposeDir = 'infra',
  [switch]$NoBuild,
  [switch]$SkipM57Scaffold
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')
Set-Location $RepoRoot

Write-Host ''
Write-StatusLine '=== POST-M41 EXTERNAL PACK RUNNER (M42 -> M56 + optional M57 scaffold) ==='
Write-StatusLine 'INFO Packs are self-only; this script orchestrates the full post-M41 line externally.'
if ($SkipM57Scaffold) {
  Write-StatusLine 'INFO M57 scaffold step skipped by caller.'
} else {
  Write-StatusLine 'INFO M57 is not green yet; scaffold/files check is included by default.'
}
Write-Host ''

$steps = @(
  @{ Name = 'M42 OPTIONAL'; Script = 'tools/pack_m42_optional.ps1'; Args = @('-RepoDir', $RepoRoot, '-ComposeDir', $ComposeDir) + @($(if ($NoBuild) { '-NoBuild' })) },
  @{ Name = 'STEP1 SECURITY FOUNDATION'; Script = 'tools/pack_step1_security_foundation.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'STEP1 TOTP STEP-UP'; Script = 'tools/pack_step1_totp_stepup.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M43 GOOGLE AUTH INVITE GATE'; Script = 'tools/pack_m43_google_auth_invite_gate.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M44 TELEMATICS'; Script = 'tools/pack_m44_telematics.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M45 RETENTION BACKUP'; Script = 'tools/pack_m45_retention_backup.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46 AI COPILOT FOUNDATION'; Script = 'tools/pack_m46_ai_copilot.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.1 AI COPILOT ENRICHMENT'; Script = 'tools/pack_m46_1_ai_copilot_enrichment.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.2 AI COPILOT INTENT EXPANSION'; Script = 'tools/pack_m46_2_ai_copilot_intent_expansion.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.3 AI COPILOT QUALITY EVIDENCE'; Script = 'tools/pack_m46_3_ai_copilot_quality_evidence.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.4 AI COPILOT DECISION CONSISTENCY'; Script = 'tools/pack_m46_4_ai_copilot_decision_consistency.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.5 AI COPILOT ACTION PRIORITIZATION'; Script = 'tools/pack_m46_5_ai_copilot_action_prioritization.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-A AI JOB GUIDE'; Script = 'tools/pack_m46_6_a_ai_job_guide.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-B AI JOB GUIDE PRECHECK'; Script = 'tools/pack_m46_6_b_ai_job_guide_precheck.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-C AI SCREEN HELP'; Script = 'tools/pack_m46_6_c_ai_screen_help.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-C2 SCREEN COVERAGE TERMINOLOGY'; Script = 'tools/pack_m46_6_c2_screen_coverage_terminology.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-D AI CHAT SHELL'; Script = 'tools/pack_m46_6_d_ai_chat_shell.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-D2 AI CONTEXT CHAT'; Script = 'tools/pack_m46_6_d2_ai_context_chat.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-D3 AI ACTIONABLE CHAT'; Script = 'tools/pack_m46_6_d3_ai_actionable_chat.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-D4 SIMPLE ROLE MODE'; Script = 'tools/pack_m46_6_d4_simple_role_mode.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.6-T AI LOCATION SOURCE GUIDE'; Script = 'tools/pack_m46_6_t_ai_location_source_guide.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.7 DRIVER CODE LOGIN REHBER FIRST'; Script = 'tools/pack_m46_7_driver_code_login_rehber_first.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.8 DRIVER ACCESS HARDENING'; Script = 'tools/pack_m46_8_driver_access_hardening.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M46.9 SESSION REFRESH SECURITY'; Script = 'tools/pack_m46_9_session_refresh_security.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M47 KVKK NOTICE CONSENT FRAMEWORK'; Script = 'tools/pack_m47_kvkk_notice_consent_framework.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M47.2 CAPACITY LOAD BASELINE'; Script = 'tools/pack_m47_2_capacity_load_baseline.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M47.3 PRODUCTION RESILIENCE EDGE SECURITY'; Script = 'tools/pack_m47_3_production_resilience_edge_security.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M47.4 MOBILE READINESS WEB PASS'; Script = 'tools/pack_m47_4_mobile_readiness_web_pass.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M48 DRIVER MOBILE FOUNDATION'; Script = 'tools/pack_m48_driver_mobile_foundation.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M48.5 ROOM COMPANY TABLET READINESS'; Script = 'tools/pack_m48_5_room_company_tablet_readiness.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M49 MOBILE BETA HARDENING'; Script = 'tools/pack_m49_mobile_beta_hardening.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M49.1 DRIVER VOICE GUIDANCE STOP ETA'; Script = 'tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M50 MOBILE RELEASE READINESS'; Script = 'tools/pack_m50_mobile_release_readiness.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M51-M53 BACKFILL VERIFICATION'; Script = 'tools/pack_m51_53_backfill_verification.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M54.3 DISPATCH APPROVE REPACK'; Script = 'tools/pack_m54_3_dispatch_approve_repack.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M54.4 DRIVER ROUTE DELIVERY'; Script = 'tools/pack_m54_4_driver_route_delivery.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M55 REPORTS NO_SHOW'; Script = 'tools/pack_m55_reports_no_show.ps1'; Args = @('-RepoRoot', $RepoRoot) },
  @{ Name = 'M56 KVKK MATRIX ETA QUALITY'; Script = 'tools/pack_m56_kvkk_eta_quality.ps1'; Args = @('-RepoRoot', $RepoRoot) }
)

if (-not $SkipM57Scaffold) {
  $steps += @{
    Name = 'M57 MOBILE HARDENING SCAFFOLD'
    Script = 'tools/pack_m57_mobile_hardening.ps1'
    Args = @('-RepoRoot', $RepoRoot, '-ScaffoldOnly')
  }
}

foreach ($step in $steps) {
  Write-Host ''
  Write-StatusLine ("=== RUNNING: {0} ===" -f $step.Name)
  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot $step.Script) @($step.Args)
  if (-not $?) { throw ("Step failed: {0}" -f $step.Name) }
}

Write-Host ''
if ($SkipM57Scaffold) {
  Write-StatusLine '=== POST-M41 EXTERNAL PACK RUNNER (M42 -> M56) PASS OK ==='
} else {
  Write-StatusLine '=== POST-M41 EXTERNAL PACK RUNNER (M42 -> M56 + M57 scaffold) PASS OK ==='
}
Write-Host ''
