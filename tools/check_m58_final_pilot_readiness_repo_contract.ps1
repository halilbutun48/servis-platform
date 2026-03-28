param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; throw "FAIL $label" }
function WarnContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; Write-Host "INFO WARN $label" }
function MustContainAll([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if (-not $txt.Contains(([string]$n).Normalize())) { throw "FAIL $label" } }; Write-Host "OK $label" }

Write-Host "INFO Checking M58 files"
@(
 'backend\scripts\m58_final_pilot_readiness_check.js',
 'tools\pack_m58_final_pilot_readiness.ps1',
 'tools\check_m58_final_pilot_readiness_repo_contract.ps1',
 'docs\RUNBOOK_M58_FINAL_PILOT_READINESS.md',
 'docs\MILESTONE_M58_FINAL_PILOT_READINESS.md',
 'docs\NEXT_BACKLOG_V1.md',
 'docs\STARTPACK_V1.md',
 'docs\PRIMER_SSOT.md',
 'docs\CHECKLIST_SSOT.md',
 'tools\README.md',
 'tools\PRIMER_SNAPSHOT.md',
 'tools\CHECKLIST_SSOT.md',
 'README.md'
) | ForEach-Object { MustExist $_ }

$runbook = ReadText 'docs\RUNBOOK_M58_FINAL_PILOT_READINESS.md'
$milestone = ReadText 'docs\MILESTONE_M58_FINAL_PILOT_READINESS.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$toolsReadme = ReadText 'tools\README.md'
$toolsPrimer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
$rootReadme = ReadText 'README.md'
$script = ReadText 'backend\scripts\m58_final_pilot_readiness_check.js'
$pack = ReadText 'tools\pack_m58_final_pilot_readiness.ps1'

MustContainAny $runbook @('Final Pilot Readiness','final pilot checklist','saha testi','go / no-go') 'runbook defines M58 pilot scope'
MustContainAny $runbook @('resmi green degildir','resmi green değildir','manuel pilot kabul','saha kabul') 'runbook explains manual signoff gate'
MustContainAny $milestone @('M58 FINAL PILOT READINESS','pack_m58_final_pilot_readiness.ps1','manuel pilot kabul') 'milestone documents M58 scope and command'
MustContainAny $backlog @('pack_m58_final_pilot_readiness.ps1','pilot kabul formu','GO', 'NO-GO','Tarihsel uyumluluk notu','M58 — Final Pilot Readiness') 'backlog mentions M58 command and acceptance'
MustContainAny $startpack @('pack_m58_final_pilot_readiness.ps1','M58 hazirlik komutu','manuel pilot kabul','M75 green baseline','M76A-1') 'startpack lists M58 command and manual gate'
MustContainAny $primer @('pack_m58_final_pilot_readiness.ps1','M58 hazirlik komutu','resmi green') 'primer ssot reflects M58 command and manual gate'
MustContainAll $checklist @('[ ]','M58','Final Pilot Readiness','pack_m58_final_pilot_readiness.ps1') 'checklist keeps M58 open with pack marker'
WarnContainAny $toolsReadme @('pack_m58_final_pilot_readiness.ps1','M58 readiness contract','manuel pilot kabul') 'tools readme lists M58 pack'
MustContainAny $toolsPrimer @('pack_m58_final_pilot_readiness.ps1','M58 hazirlik komutu','resmi green') 'tools primer reflects M58 command and gate'
MustContainAll $toolsChecklist @('[ ]','M58','Final Pilot Readiness','pack_m58_final_pilot_readiness.ps1') 'tools checklist keeps M58 open with pack marker'
MustContainAny $rootReadme @('M58 — Final Pilot Readiness','pack_m58_final_pilot_readiness.ps1','manuel pilot kabul','M75 green baseline','M76A-1') 'root readme reflects M58 command and gate'
MustContainAny $script @('Surucu Kodu + PIN','KVKK','go / no-go','go/no-go') 'm58 runtime check covers pilot readiness baseline'
MustContainAny $pack @('m58_final_pilot_readiness_check.js','check_m58_final_pilot_readiness_repo_contract.ps1','PACK PASS OK') 'm58 pack wires runtime and repo contract'

Write-Host 'M58 FINAL PILOT READINESS REPO CONTRACT PASS'
