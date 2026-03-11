param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK ==="

& (Join-Path $RepoRoot "tools/pack_m46_3_ai_copilot_quality_evidence.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "m46.3 pack failed" }

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "api",
  "sh", "-lc", "cd /app/backend && node scripts/m46_4_ai_copilot_decision_consistency_check.js"
)

Write-Host ""
Write-StatusLine "=== M46.4 Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== M46.4 Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK ==="
