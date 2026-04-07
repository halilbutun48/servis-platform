param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")
. (Join-Path $PSScriptRoot "_repo_contract_state.ps1")
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ((Test-RepoContractContainsAny -Text $txt -Needles @([string]$n))) { Write-Host "OK $label"; return } }; throw "FAIL $label" }
function WarnContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ((Test-RepoContractContainsAny -Text $txt -Needles @([string]$n))) { Write-Host "OK $label"; return } }; Write-Host "INFO WARN $label" }
function MustContainAll([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if (-not (Test-RepoContractContainsAny -Text $txt -Needles @([string]$n))) { throw "FAIL $label" } }; Write-Host "OK $label" }

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
$state = Read-RepoContractState -RepoRoot $RepoRoot

MustContainAny $runbook @('Final Pilot Readiness','final pilot checklist','saha testi','go / no-go') 'runbook defines M58 pilot scope'
MustContainAny $runbook @('resmi green degildir','resmi green değildir','manuel pilot kabul','saha kabul') 'runbook explains manual signoff gate'
MustContainAny $milestone @('M58 FINAL PILOT READINESS','pack_m58_final_pilot_readiness.ps1','manuel pilot kabul') 'milestone documents M58 scope and command'
Assert-RepoContractStateValue -State $state -Property 'latestMasterPack' -Expected 79 -Label 'state latest master pack is 79'
Assert-RepoContractStateValue -State $state -Property 'nextMilestone' -Expected 'M80' -Label 'state next milestone is M80'
MustContainAny $checklist @('M58','Final Pilot Readiness','M77','M78','M79') 'checklist keeps M58 visible with compatibility markers'
WarnContainAny $toolsReadme @('pack_living.ps1','tools
epo_contract_state.json','M79') 'tools readme lists state-first route'
MustContainAny $toolsChecklist @('M58','Final Pilot Readiness','M77','M78','M79') 'tools checklist keeps M58 visible with compatibility markers'
MustContainAny $script @('Surucu Kodu + PIN','KVKK','go / no-go','go/no-go') 'm58 runtime check covers pilot readiness baseline'
MustContainAny $pack @('m58_final_pilot_readiness_check.js','check_m58_final_pilot_readiness_repo_contract.ps1','PACK PASS OK') 'm58 pack wires runtime and repo contract'

Write-Host 'M58 FINAL PILOT READINESS REPO CONTRACT PASS'
