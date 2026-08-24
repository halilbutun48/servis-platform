param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host "=== M88 Repo Contract ==="
$required = @(
  "backend\scripts\m88_settlement_operations_console_check.js",
  "backend\src\routes\commercialCorePaymentRoutes.js",
  "backend\src\services\paymentBackbone.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "docs\RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md",
  "tools\pack_m88_settlement_operations_console.ps1"
)
foreach ($rel in $required) {
  $path = Join-Path $RepoRoot $rel
  if (-not (Test-Path $path)) { throw "Missing required file: $rel" }
}
Write-Host "=== M88 Repo Contract PASS ==="
