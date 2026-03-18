param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== M46.1 AI COPILOT ENRICHMENT PACK ==="


$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "api",
  "sh", "-lc", "cd /app/backend && node scripts/m46_1_ai_copilot_enrichment_check.js"
)

Write-Host ""
Write-StatusLine "=== M46.1 Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== M46.1 Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m46_1_ai_copilot_enrichment_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== M46.1 AI COPILOT ENRICHMENT PACK PASS OK ==="

