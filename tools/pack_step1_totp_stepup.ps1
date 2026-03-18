param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== STEP 1 TOTP STEP-UP PACK ==="


$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @("compose", "-f", $compose, "exec", "-T", "api", "sh", "-lc", "cd /app/backend && node scripts/step1_totp_stepup_check.js")

Write-Host ""
Write-StatusLine "=== Step 1 TOTP Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== Step 1 TOTP Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_step1_totp_stepup_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== STEP 1 TOTP STEP-UP PACK PASS OK ==="

