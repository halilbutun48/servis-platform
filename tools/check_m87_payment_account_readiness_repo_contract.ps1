param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Write-Host "=== M87 Repo Contract ==="

$required = @(
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\commercialCore.js",
  "backend\scripts\m87_payment_account_readiness_check.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "docs\RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md",
  "tools\pack_m87_payment_account_readiness.ps1"
)

foreach ($rel in $required) {
  $full = Join-Path $RepoRoot $rel
  if (-not (Test-Path $full)) { throw "Missing required file: $rel" }
}

Write-Host "=== M87 Repo Contract PASS ==="
