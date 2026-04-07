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
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function MustContainRegexAny([string]$txt,[string[]]$patterns,[string]$label){
  $opts = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
  foreach($pattern in $patterns){
    if ($pattern -and [System.Text.RegularExpressions.Regex]::IsMatch($txt, $pattern, $opts)) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function WarnContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  Write-Host "INFO WARN $label"
}
function WarnContainRegexAny([string]$txt,[string[]]$patterns,[string]$label){
  $opts = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
  foreach($pattern in $patterns){
    if ($pattern -and [System.Text.RegularExpressions.Regex]::IsMatch($txt, $pattern, $opts)) { Write-Host "OK $label"; return }
  }
  Write-Host "INFO WARN $label"
}

Write-Host 'INFO Checking M47.4 files'
@(
  'web\index.html',
  'web\src\index.css',
  'web\scripts\m47_4_mobile_readiness_web_pass_check.js',
  'tools\pack_m47_4_mobile_readiness_web_pass.ps1',
  'tools\check_m47_4_mobile_readiness_web_pass_repo_contract.ps1',
  'docs\RUNBOOK_M47_4_MOBILE_READINESS_WEB_PASS.md',
  'tools\PRIMER_SNAPSHOT.md',
  'docs\PRIMER_SSOT.md',
  'docs\CHECKLIST_SSOT.md',
  'tools\CHECKLIST_SSOT.md',
  'docs\STARTPACK_V1.md',
  'tools\README.md'
) | ForEach-Object { MustExist $_ }

$html = ReadText 'web\index.html'
$css = ReadText 'web\src\index.css'
$check = ReadText 'web\scripts\m47_4_mobile_readiness_web_pass_check.js'
$pack = ReadText 'tools\pack_m47_4_mobile_readiness_web_pass.ps1'
$runbook = ReadText 'docs\RUNBOOK_M47_4_MOBILE_READINESS_WEB_PASS.md'
$primer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$readme = ReadText 'tools\README.md'

Write-Host 'INFO Checking mobile readiness web changes'
MustContainText $html 'viewport-fit=cover' 'index html uses viewport-fit cover'
MustContainText $html 'theme-color' 'index html defines theme color'
MustContainText $css 'overflow-x: hidden' 'css blocks page horizontal overflow'
MustContainText $css 'env(safe-area-inset-bottom)' 'css uses safe area bottom padding'
MustContainText $css 'min-height: 44px' 'css enforces mobile touch target minimum'
MustContainAny $css @('navDockItems','overflow-x: auto') 'css enables horizontally scrollable mobile nav'
MustContainAny $css @('M47.4 — Mobile Readiness Web Pass','M47.4 - Mobile Readiness Web Pass') 'css includes mobile readiness section marker'

Write-Host 'INFO Checking pack + check wiring'
MustNotContainText $pack 'pack_m47_3_production_resilience_edge_security.ps1' 'pack is self-only and does not chain m47.3'
MustContainText $pack 'node:20-alpine' 'pack uses node container for web build'
MustContainText $pack 'npm run build' 'pack builds web app'
MustContainText $pack 'm47_4_mobile_readiness_web_pass_check.js' 'pack runs m47.4 check script'
MustContainText $check 'viewport-fit=cover' 'check script validates viewport fit'
MustContainText $check 'safe area bottom padding present' 'check script validates safe area'

Write-Host 'INFO Checking runbook + SSOT updates'
MustContainAny $runbook @('viewport-fit=cover','safe area','44px') 'runbook explains mobile readiness changes'
WarnContainAny $primer @('M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK','M47.3 Production Resilience + Edge Security') 'primer includes m47.3 green'
WarnContainRegexAny $primer @('M47\.4\s*[ -]?\s*Mobile\s+Readiness\s+Web\s+Pass','M47\.4\s+MOBILE\s+READINESS\s+WEB\s+PASS') 'primer includes m47.4 next route'
WarnContainRegexAny $checklist @('M47\.3\s+PRODUCTION\s+RESILIENCE\s*\+\s*EDGE\s+SECURITY\s+PACK\s+PASS\s+OK','M47\.3.+Production\s+Resilience\s*\+\s*Edge\s+Security') 'checklist includes m47.3 green'
WarnContainRegexAny $checklist @('M47\.4\s+MOBILE\s+READINESS\s+WEB\s+PASS','M47\.4.+Mobile\s+Readiness\s+Web\s+Pass') 'checklist includes m47.4 route'
WarnContainRegexAny $startpack @('M47\.4\s*[ -]?\s*Mobile\s+Readiness\s+Web\s+Pass','pack_m47_4_mobile_readiness_web_pass\.ps1') 'startpack includes m47.4 route'
WarnContainAny $readme @('M47.4 mobile readiness','M47.4 mobile readiness web pass','pack_m47_4_mobile_readiness_web_pass.ps1') 'tools readme mentions m47.4'

Write-Host 'M47.4 MOBILE READINESS WEB PASS REPO CONTRACT PASS'
