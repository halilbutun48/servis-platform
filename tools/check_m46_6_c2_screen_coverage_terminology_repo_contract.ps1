param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  $norm = [string]$txt
  foreach($needle in $needles){
    if ($needle -and $norm.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M46.6-C2 files'
@(
  'backend\scripts\m46_6_c2_screen_coverage_terminology_check.js',
  'tools\pack_m46_6_c2_screen_coverage_terminology.ps1',
  'tools\check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1',
  'docs\RUNBOOK_M46_6_C2_SCREEN_COVERAGE_TERMINOLOGY.md',
  'backend\src\ai\jobGuide\glossary.js',
  'backend\src\ai\jobGuide\screenCatalog.js',
  'backend\src\ai\jobGuide\screenCatalog.roomCompany.js',
  'backend\src\ai\chat\helpComposer.js',
  'backend\src\ai\chat\intentRouter.js',
  'web\src\panels\shared\CopilotPanel.jsx',
  'web\src\copilot\screenRegistry.js'
) | ForEach-Object { MustExist $_ }

Write-Host 'INFO Checking terminology glossary wiring'
$glossary = ReadText 'backend\src\ai\jobGuide\glossary.js'
MustContainText $glossary 'hub' 'glossary includes hub term'
MustContainText $glossary 'inbound' 'glossary includes inbound term'
MustContainText $glossary 'outbound' 'glossary includes outbound term'
MustContainText $glossary 'veliErisimi' 'glossary includes parent access term'
MustContainText $glossary 'erisimLinki' 'glossary includes access link term'
MustContainText $glossary 'konumIncele' 'glossary includes georeview term'
MustContainText $glossary 'osrm' 'glossary includes osrm term'
MustContainText $glossary 'matrix' 'glossary includes matrix term'
MustContainText $glossary 'checkin' 'glossary includes check-in term'
MustContainText $glossary 'explainTermsFromText' 'glossary exposes text term resolver'

Write-Host 'INFO Checking screen coverage catalog'
$catalog = @(
  (ReadText 'backend\src\ai\jobGuide\screenCatalog.js'),
  (ReadText 'backend\src\ai\jobGuide\screenCatalog.roomCompany.js')
) -join "`n"
MustContainText $catalog '/room/hub' 'catalog includes room hub'
MustContainText $catalog '/room/checkin' 'catalog includes room checkin'
MustContainText $catalog '/company/hub' 'catalog includes company hub'
MustContainText $catalog '/company/georeview' 'catalog includes company georeview'
MustContainText $catalog '/company/checkin' 'catalog includes company checkin'
MustContainText $catalog '/shared/notifications' 'catalog includes shared notifications'
MustContainText $catalog '/shared/logs' 'catalog includes shared logs'
MustContainText $catalog "/school/parents" 'catalog includes school parent access'
MustContainAny $catalog @('Veli Erişimi','Veli Erisimi','pickTerms(["veliErisimi", "erisimLinki"])') 'catalog uses parent access terminology'
MustContainText $catalog '/driver/checkin' 'catalog includes driver checkin'
MustContainText $catalog 'pickTerms(["hub", "inbound", "outbound"])' 'catalog binds hub terms'
MustContainText $catalog 'pickTerms(["konumIncele", "osrm", "matrix", "sureHesabi"])' 'catalog binds georeview terms'

Write-Host 'INFO Checking shared screen registry wiring'
$panel = ReadText 'web\src\panels\shared\CopilotPanel.jsx'
$registry = ReadText 'web\src\copilot\screenRegistry.js'
MustContainAny $panel @('screenRegistry','getCopilotScreenOptions') 'panel uses shared screen registry'
MustContainText $registry '/room/hub' 'registry includes room hub option'
MustContainText $registry '/room/checkin' 'registry includes room checkin option'
MustContainText $registry '/company/hub' 'registry includes company hub option'
MustContainText $registry '/company/checkin' 'registry includes company checkin option'
MustContainText $registry '/company/georeview' 'registry includes company georeview option'
MustContainText $registry '/shared/notifications' 'registry includes shared notifications option'
MustContainText $registry '/shared/logs' 'registry includes shared logs option'
MustContainText $registry '/school/hub' 'registry includes school hub option'
MustContainText $registry '/school/parents' 'registry includes school parent access option'
MustContainText $registry '/organization/hub' 'registry includes organization hub option'
MustContainText $registry '/driver/checkin' 'registry includes driver checkin option'

Write-Host 'INFO Checking chat term help wiring'
Write-Host 'INFO Checking chat term help wiring'
$composer = ReadText 'backend\src\ai\chat\helpComposer.js'
$router = ReadText 'backend\src\ai\chat\intentRouter.js'
MustContainText $composer 'explainTermsFromText' 'chat imports term resolver'
MustContainText $composer 'termComparisonReply' 'chat compares similar terms'
MustContainAny $composer @('Eski giriş daveti akışı kaldırıldı.','Bildirim kullanıcıya giden uyarıdır.','hasNotification = /bildirim|notification/','hasAccessLink = /erişim linki|erisim linki|public link|erişim/','termComparisonReply') 'chat explains access/log differences'
MustContainText $router 'Hub ne demek?' 'chips include hub help'
MustContainAny $router @('OSRM nedir?','Rota nasıl hesaplanıyor?','Konum neden görünmüyor?') 'chips include georeview help'
MustContainText $router 'Check-in ne demek?' 'chips include check-in help'
if ($router.Contains('Log ile fark') -or $router.Contains('Bildirimle fark')) {
  Write-Host 'OK chips include notification/log difference'
} else {
  throw 'FAIL chips include notification/log difference'
}

Write-Host 'M46.6-C2 SCREEN COVERAGE + TERMINOLOGY REPO CONTRACT PASS'
