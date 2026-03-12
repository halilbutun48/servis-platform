param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== M46.6-C AI SCREEN HELP PACK ==="

& (Join-Path $RepoRoot "tools/pack_m46_6_t_ai_location_source_guide.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "m46.6-t pack failed" }

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @(
  "compose", "-f", $compose, "exec", "-T", "api",
  "sh", "-lc", "cd /app/backend && node scripts/m46_6_c_ai_screen_help_check.js"
)

Write-Host ""
Write-StatusLine "=== M46.6-C Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== M46.6-C Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m46_6_c_ai_screen_help_repo_contract.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== M46.6-C AI SCREEN HELP PACK PASS OK ==="
