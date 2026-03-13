param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "INFO $m" }
function Ok($m){ Write-Host "OK $m" }
function MustExist($rel){ $p = Join-Path $RepoRoot $rel; if (!(Test-Path -LiteralPath $p)) { throw "FAIL $rel missing" }; Ok "$rel exists" }
function MustContain($rel, $needle, $label){
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Ok $label
}
function MustContainAny($rel, $needles, $label){
  $p = Join-Path $RepoRoot $rel
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  foreach($needle in $needles){
    if ($needle -and $txt.Contains($needle)) { Ok $label; return }
  }
  throw "FAIL $label"
}

Info 'Checking backend AI files'
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
) | ForEach-Object { MustExist $_ }

Info 'Checking backend wiring'
MustContain 'backend\src\server.js' './routes/ai.js' 'server imports ai route'
MustContain 'backend\src\server.js' '/api/ai' 'server mounts /api/ai'
MustContain 'backend\src\routes\ai.js' 'AI_COPILOT_QUERY' 'ai route audits copilot queries'
MustContain 'backend\src\routes\ai.js' 'requireStepUp("SUPER_ADMIN", "ROOM")' 'ai route enforces step-up for room/superadmin'
MustContain 'backend\src\env.js' 'AI_COPILOT_ENABLED' 'env has AI_COPILOT_ENABLED'
MustContain '.env.example' 'AI_COPILOT_ENABLED=1' '.env example has AI_COPILOT_ENABLED'
MustContain 'infra\docker-compose.yml' 'AI_COPILOT_ENABLED' 'docker compose passes AI_COPILOT_ENABLED'

Info 'Checking web wiring'
MustContain 'web\src\App.jsx' 'CopilotPanel' 'App imports CopilotPanel'
MustContain 'web\src\App.jsx' '/room/copilot' 'App routes room copilot'
MustContain 'web\src\App.jsx' '/company/copilot' 'App routes company copilot'
MustContain 'web\src\App.jsx' '/superadmin/copilot' 'App routes superadmin copilot'
MustContainAny 'web\src\layout\NavDock.jsx' @('Copilot','Rehber') 'NavDock mentions Copilot/Rehber'

Info 'Checking docs/tool pointers'
MustContain 'tools\README.md' 'pack_m46_ai_copilot.ps1' 'tools readme mentions m46 pack'
MustContain 'tools\README.md' 'check_m46_ai_copilot_repo_contract.ps1' 'tools readme mentions m46 repo-contract'
MustContain 'docs\RUNBOOK_M46_AI_COPILOT.md' '/api/ai/copilot' 'runbook documents /api/ai/copilot'

Write-Host 'M46 AI COPILOT FOUNDATION REPO CONTRACT PASS'
