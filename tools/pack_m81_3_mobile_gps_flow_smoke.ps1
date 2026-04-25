param(
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$Strict
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $RepoRoot).Path
Write-Host "=== M81.3 MOBILE GPS FLOW SMOKE PACK ==="
Set-Location $root
$script = Join-Path $root "backend/scripts/m81_3_mobile_gps_flow_smoke.cjs"
if (-not (Test-Path $script)) { throw "FAIL missing backend/scripts/m81_3_mobile_gps_flow_smoke.cjs" }
if ($Strict) {
  node $script --strict
} else {
  node $script
}
Write-Host "=== M81.3 PACK PASS ==="
