# tools\run.ps1
# One-liner entry: auto-token + auto-artifact-move + fullcheck
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\run.ps1
# Optional overrides:
#   $env:FULLCHECK_TOKEN_EMAIL="admin@demo.com"
#   $env:FULLCHECK_TOKEN_PASS ="Demo123!"
#   $env:FULLCHECK_AUTOTOKEN="1"
#   $env:FULLCHECK_AUTOFIX="1"

$ErrorActionPreference = "Stop"

Set-ExecutionPolicy -Scope Process Bypass -Force | Out-Null

if (-not $env:FULLCHECK_AUTOTOKEN) { $env:FULLCHECK_AUTOTOKEN = "1" }
if (-not $env:FULLCHECK_AUTOFIX)   { $env:FULLCHECK_AUTOFIX   = "1" }

$root = Split-Path -Parent $PSScriptRoot
$fc   = Join-Path $root "tools\fullcheck.ps1"

if (-not (Test-Path $fc)) { throw "Missing: tools\fullcheck.ps1" }

& powershell -NoProfile -ExecutionPolicy Bypass -File $fc
exit $LASTEXITCODE
