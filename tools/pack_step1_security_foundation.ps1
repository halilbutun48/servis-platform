param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

Write-Host ""
Write-Host "=== STEP 1 SECURITY FOUNDATION PACK ==="

& (Join-Path $RepoRoot "tools/pack.ps1") -To 41
if ($LASTEXITCODE -ne 0) { throw "base M41 pack failed" }

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcBaseArgs = @("compose", "-f", $compose)

Write-Host ""
Write-Host "=== Step 1 Runtime Check ==="
& $dc $dcBaseArgs[0] $dcBaseArgs[1] $dcBaseArgs[2] "exec" "-T" "api" "sh" "-lc" "cd /app/backend && node scripts/step1_security_foundation_check.js"
if ($LASTEXITCODE -ne 0) { throw "Docker compose command failed: $dc $($dcBaseArgs -join ' ') exec -T api sh -lc cd /app/backend && node scripts/step1_security_foundation_check.js" }

Write-Host ""
Write-Host "=== Step 1 Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_step1_security_foundation_repo_contract.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "repo contract check failed" }

Write-Host ""
Write-Host "=== STEP 1 SECURITY FOUNDATION PACK PASS ✅ ==="
