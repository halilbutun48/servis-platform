param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function MustContain($p,$needle,$label){
  $txt = Get-Content -LiteralPath $p -Raw -Encoding UTF8
  if (-not $txt.Contains($needle)) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M46.6-C files"
$files = @(
  "backend\scripts\m46_6_c_ai_screen_help_check.js",
  "tools\pack_m46_6_c_ai_screen_help.ps1",
  "tools\check_m46_6_c_ai_screen_help_repo_contract.ps1",
  "docs\RUNBOOK_M46_6_C_AI_SCREEN_HELP.md",
  "backend\src\ai\jobGuide\screenCatalog.js",
  "backend\src\ai\jobGuide\jobs\screenMenuGuide.js",
  "backend\src\ai\jobGuide\jobs\buttonActionGuide.js",
  "backend\src\ai\jobGuide\jobs\roleHelpGuide.js",
  "web\src\components\copilot\MenuPurposeCard.jsx",
  "web\src\components\copilot\ButtonGuidesCard.jsx",
  "web\src\components\copilot\ScreenMenusCard.jsx"
)
foreach($f in $files){
  if (!(Test-Path (Join-Path $RepoRoot $f))) { throw "FAIL missing $f" }
  Write-Host "OK $f exists"
}

Write-Host "INFO Checking backend screen help wiring"
$schema = Join-Path $RepoRoot "backend\src\ai\schemas.js"
$registry = Join-Path $RepoRoot "backend\src\ai\jobGuide\registry.js"
$service = Join-Path $RepoRoot "backend\src\ai\service.js"
$index = Join-Path $RepoRoot "backend\src\ai\jobGuide\index.js"
$router = Join-Path $RepoRoot "backend\src\routes\ai.js"
MustContain $schema '"screen"' "schema accepts screen entity type"
MustContain $registry "SCREEN_MENU_GUIDE" "registry has screen menu guide"
MustContain $registry "BUTTON_ACTION_GUIDE" "registry has button action guide"
MustContain $registry "ROLE_HELP_GUIDE" "registry has role help guide"
MustContain $service "screenCatalog" "service imports screen catalog"
MustContain $index "M46.6-C" "job guide index exposes M46.6-C version"
MustContain $router "driver" "route allows driver screen guides"
MustContain $router "personel" "route allows personel screen guides"
MustContain $router "parent" "route allows parent screen guides"

Write-Host "INFO Checking web screen help wiring"
$panel = Join-Path $RepoRoot "web\src\panels\shared\CopilotPanel.jsx"
$panelTxt = Get-Content -LiteralPath $panel -Raw -Encoding UTF8
if (($panelTxt -match "SCREEN_MENU_GUIDE") -or ($panelTxt -match "Bu ekran ne için var\?")) { Write-Host "OK panel supports screen menu guide" } else { throw "FAIL panel supports screen menu guide" }
if (($panelTxt -match "BUTTON_ACTION_GUIDE") -or ($panelTxt -match "Bu ekrandaki butonlar")) { Write-Host "OK panel supports button action guide" } else { throw "FAIL panel supports button action guide" }
if (($panelTxt -match "ROLE_HELP_GUIDE") -or ($panelTxt -match "Bu rolde ne yapabilirim\?")) { Write-Host "OK panel supports role help guide" } else { throw "FAIL panel supports role help guide" }
if (($panelTxt -match "ButtonGuidesCard") -or ($panelTxt -match "Bu ekrandaki butonlar")) { Write-Host "OK panel renders button guide section" } else { throw "FAIL panel renders button guide section" }
if (($panelTxt -match "MenuPurposeCard") -or ($panelTxt -match "Bu ekran ne için var\?") -or ($panelTxt -match "Bu menü ne için var\?")) { Write-Host "OK panel renders menu purpose section" } else { throw "FAIL panel renders menu purpose section" }

Write-Host "M46.6-C AI SCREEN HELP REPO CONTRACT PASS"
