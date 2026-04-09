param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}
function Canon([string]$s){
  if ($null -eq $s) { return '' }
  $map = @{
    'ı'='i'; 'İ'='i'; 'ş'='s'; 'Ş'='s'; 'ğ'='g'; 'Ğ'='g';
    'ç'='c'; 'Ç'='c'; 'ö'='o'; 'Ö'='o'; 'ü'='u'; 'Ü'='u'
  }
  $sb0 = New-Object System.Text.StringBuilder
  foreach($ch in $s.ToCharArray()){
    $c = [string]$ch
    if($map.ContainsKey($c)){ [void]$sb0.Append($map[$c]) } else { [void]$sb0.Append($c) }
  }
  $x = $sb0.ToString().Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach($ch in $x.ToCharArray()){
    $cat = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
    if($cat -ne [Globalization.UnicodeCategory]::NonSpacingMark){
      [void]$sb.Append($ch)
    }
  }
  return $sb.ToString().ToLowerInvariant().Normalize([Text.NormalizationForm]::FormC)
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not (Canon $txt).Contains((Canon $needle))) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function WarnContainText([string]$txt,[string]$needle,[string]$label){
  if (-not (Canon $txt).Contains((Canon $needle))) { Write-Host "INFO WARN $label"; return }
  Write-Host "OK $label"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  $canonTxt = Canon $txt
  foreach($needle in $needles){
    if($canonTxt.Contains((Canon $needle))){
      Write-Host "OK $label"
      return
    }
  }
  throw "FAIL $label"
}
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ((Canon $txt).Contains((Canon $needle))) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustExplainNoNativeTabletYet([string]$txt,[string]$label){
  $canonTxt = Canon $txt
  $ok = $false
  if($canonTxt.Contains('ayri native room/company uygulamasi acmaz')){ $ok = $true }
  if($canonTxt.Contains('henuz ayri native room/company uygulamasi acmaz')){ $ok = $true }
  if($canonTxt.Contains('ayri native tablet app henuz acilmaz')){ $ok = $true }
  if($canonTxt.Contains('native tablet app yet')){ $ok = $true }
  if((($canonTxt.Contains('same web app')) -or ($canonTxt.Contains('ayni web uygulamasi'))) -and
     $canonTxt.Contains('tablet') -and
     $canonTxt.Contains('native') -and
     (($canonTxt.Contains('henuz acilmaz')) -or ($canonTxt.Contains('acmaz')))){
    $ok = $true
  }
  if(-not $ok){ throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M48.5 files'
@(
  'web\src\layout\AppShell.jsx',
  'web\src\components\TabletOpsQuickBar.jsx',
  'web\src\index.css',
  'web\scripts\m48_5_room_company_tablet_readiness_check.js',
  'tools\pack_m48_5_room_company_tablet_readiness.ps1',
  'tools\check_m48_5_room_company_tablet_readiness_repo_contract.ps1',
  'docs\RUNBOOK_M48_5_ROOM_COMPANY_TABLET_READINESS.md',
  'tools\README.md'
) | ForEach-Object { MustExist $_ }

$appShell = ReadText 'web\src\layout\AppShell.jsx'
$quickBar = ReadText 'web\src\components\TabletOpsQuickBar.jsx'
$css = ReadText 'web\src\index.css'
$pack = ReadText 'tools\pack_m48_5_room_company_tablet_readiness.ps1'
$runbook = ReadText 'docs\RUNBOOK_M48_5_ROOM_COMPANY_TABLET_READINESS.md'
$toolsReadme = ReadText 'tools\README.md'

Write-Host 'INFO Checking tablet readiness wiring'
MustContainText $appShell 'TabletOpsQuickBar' 'app shell imports tablet quick bar'
MustContainText $appShell 'shell--tablet-ops' 'app shell enables tablet ops shell'
MustContainText $appShell 'isTabletOpsRole' 'app shell scopes tablet mode to room/company'
MustContainAny $quickBar @('Tablet kısa işlemler','Tablet kisa islemler','tabletquicktitle') 'quick bar includes room tablet label'
MustContainAny $quickBar @('Tablet hızlı işlemler','Tablet hizli islemler','tabletquicktitle') 'quick bar includes company tablet label'
MustContainText $quickBar '/room/map' 'quick bar includes room map action'
MustContainText $quickBar '/room/shifts' 'quick bar includes room shifts action'
MustContainText $quickBar 'base + "/map"' 'quick bar includes company map action'
MustContainText $quickBar 'base + "/checkin"' 'quick bar includes company checkin action'
MustContainAny $css @('M48.5 — Room / Company Tablet Readiness','M48.5 - Room / Company Tablet Readiness') 'css includes tablet marker'
MustContainText $css '@media (min-width: 768px) and (max-width: 1180px)' 'css includes tablet breakpoint'
MustContainText $css '.tabletQuickGrid' 'css includes tablet quick grid'

Write-Host 'INFO Checking pack + runbook'
MustNotContainText $pack 'pack_m48_driver_mobile_foundation.ps1' 'pack is self-only and does not chain m48'
MustContainText $pack 'm48_5_room_company_tablet_readiness_check.js' 'pack runs m48.5 static check'
MustContainAny $runbook @(
  'aynı web uygulaması tablet kullanımında optimize edilir',
  'ayni web uygulamasi tablet kullaniminda optimize edilir',
  'same web app tablet scope'
) 'runbook explains same web app tablet scope'
MustExplainNoNativeTabletYet $runbook 'runbook explains no native tablet app yet'
MustContainAny $toolsReadme @('TOOLS_README_ROUTE_M48_5_TABLET_READINESS_V1') 'tools readme lists m48.5 pack'

Write-Host 'M48.5 ROOM / COMPANY TABLET READINESS REPO CONTRACT PASS'
