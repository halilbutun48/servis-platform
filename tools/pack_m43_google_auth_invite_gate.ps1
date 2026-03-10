param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
Set-Location $RepoRoot

Write-Host ""
Write-StatusLine "=== M43 GOOGLE AUTH + INVITE GATE PACK ==="

& (Join-Path $RepoRoot "tools/pack_step1_totp_stepup.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "step1 totp pack failed" }

$dc = "docker"
$compose = Join-Path $RepoRoot "infra/docker-compose.yml"
$dcArgs = @("compose", "-f", $compose, "exec", "-T", "api", "sh", "-lc", "cd /app/backend && node scripts/m43_google_auth_invite_gate_check.js")

Write-Host ""
Write-StatusLine "=== M43 Runtime Check ==="
$code = Invoke-ExternalColor -FilePath $dc -ArgumentList $dcArgs
if ($code -ne 0) { throw "Docker compose command failed: $dc $($dcArgs -join ' ')" }

Write-Host ""
Write-StatusLine "=== M43 Repo Contract ==="
& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m43_google_auth_invite_gate_repo_contract.ps1") -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "repo contract check failed" }

Write-Host ""
Write-StatusLine "=== M43 GOOGLE AUTH + INVITE GATE PACK PASS OK ==="
