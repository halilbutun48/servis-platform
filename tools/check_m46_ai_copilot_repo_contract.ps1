param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'

function Ok([string]$m) { Write-Host "OK $m" }
function NeedExists([string]$file) {
  $p = Join-Path $RepoRoot $file
  if (-not (Test-Path -LiteralPath $p)) { throw "FAIL $file exists" }
  Ok "$file exists"
}
function NeedContains([string]$file, [string]$needle, [string]$label) {
  $p = Join-Path $RepoRoot $file
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Ok $label
}
function NeedAnyFileContains([string[]]$files, [string[]]$needles, [string]$label) {
  foreach ($file in $files) {
    $p = Join-Path $RepoRoot $file
    if (-not (Test-Path -LiteralPath $p)) { continue }
    $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
    foreach ($needle in $needles) {
      if ($txt.Contains($needle)) { Ok $label; return }
    }
  }
  throw "FAIL $label"
}

Write-Host "INFO Checking backend AI files"
@(
  'backend\src\ai\schemas.js',
  'backend\src\ai\service.js',
  'backend\src\ai\tools.js',
  'backend\src\routes\ai.js',
  'backend\scripts\m46_ai_copilot_check.js',
  'tools\pack_m46_ai_copilot.ps1',
  'tools\check_m46_ai_copilot_repo_contract.ps1',
  'docs\RUNBOOK_M46_AI_COPILOT.md',
  'web\src\panels\shared\CopilotPanel.jsx'
) | ForEach-Object { NeedExists $_ }

Write-Host "INFO Checking backend wiring"
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeFactories.js','backend\src\bootstrap\routeMounts.js') @('aiRouter','createAiRouter','routes/ai') 'server imports ai route'
NeedAnyFileContains @('backend\src\server.js','backend\src\bootstrap\routeMounts.js') @('/api/ai') 'server mounts /api/ai'

Write-Host "INFO Checking web wiring"
NeedContains 'web\src\panels\shared\CopilotPanel.jsx' 'CopilotPanel' 'copilot panel exists'
NeedAnyFileContains @('docs\RUNBOOK_M46_AI_COPILOT.md') @('AI COPILOT','AI Copilot','Copilot') 'runbook exists'

Write-Host 'M46 AI COPILOT REPO CONTRACT PASS'
