param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

& (Join-Path $RepoRoot "tools\check_m91_shift_agreement_route_preview_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M91 route preview repo contract failed." }

Write-Host "M91 shift/agreement route preview PACK PASS"
