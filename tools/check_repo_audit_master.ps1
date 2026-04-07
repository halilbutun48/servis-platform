param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host ""
Write-Host "=== REPO AUDIT MASTER ==="

$scriptPath = Join-Path $RepoRoot "backend\scripts\repo_audit.js"
if (-not (Test-Path $scriptPath)) {
  throw "FAIL backend\scripts\repo_audit.js missing"
}

$args = @($scriptPath)
if ($Strict) { $args += "--strict" }

node @args
if (-not $?) { throw "FAIL repo audit script failed" }

Write-Host "OK REPO AUDIT MASTER PASS"
