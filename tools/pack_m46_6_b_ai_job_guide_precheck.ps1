param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== M46.6-B AI JOB GUIDE PRECHECK PACK ==="

& (Join-Path $RepoRoot "tools/pack_m46_6_a_ai_job_guide.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "m46.6-a pack failed" }

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "api",
  "sh", "-lc", "cd /app/backend && node scripts/m46_6_b_ai_job_guide_precheck_check.js"
)

Write-Host ""
Write-StatusLine "=== M46.6-B Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== M46.6-B Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m46_6_b_ai_job_guide_precheck_repo_contract.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK ==="
