param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
function Ok([string]$m){ Write-Host "OK $m" }
function NeedExists([string]$file){
  $p = Join-Path $RepoRoot $file
  if (-not (Test-Path -LiteralPath $p)) { throw "FAIL $file exists" }
  Ok "$file exists"
}
function NeedContains([string]$file, [string]$needle, [string]$label){
  $p = Join-Path $RepoRoot $file
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Normalize().Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Ok $label
}
function NeedAnyFileContains([string[]]$files, [string[]]$needles, [string]$label){
  foreach ($file in $files) {
    $p = Join-Path $RepoRoot $file
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $txt = (Get-Content -LiteralPath $p -Raw -Encoding UTF8).Normalize()
    foreach ($needle in $needles) {
      if ($txt.Contains(([string]$needle).Normalize())) { Ok $label; return }
    }
  }
  throw "FAIL $label"
}

Write-Host "INFO Checking M55 files"
@(
  'backend\src\routes\reports.js',
  'backend\src\routes\penalties.js',
  'backend\src\lib\reports.js',
  'backend\src\lib\penalties.js',
  'backend\scripts\m55_reports_no_show_check.js',
  'web\src\panels\shared\ReportsPanel.jsx',
  'web\src\components\driver\DriverPenaltyBadge.jsx',
  'web\src\components\driver\DriverPenaltyForm.jsx',
  'tools\pack_m55_reports_no_show.ps1',
  'tools\check_m55_reports_no_show_repo_contract.ps1',
  'docs\RUNBOOK_M55_REPORTS_NO_SHOW.md'
) | ForEach-Object { NeedExists $_ }

NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('/api/reports') 'server mounts reports route'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('/api/penalties') 'server mounts penalties route'
NeedContains 'tools\pack_m55_reports_no_show.ps1' 'm55_reports_no_show_check.js' 'pack runs M55 runtime check'

Write-Host 'M55 REPORTS + NO_SHOW REPO CONTRACT PASS'
