param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host 'INFO Checking M66 files'
@(
 'backend\scripts\m66check.js',
 'backend\src\routes\shifts\room.js',
 'backend\src\routes\shifts\shared.js',
 'web\src\components\ShiftReassignModal.jsx',
 'web\src\components\ShiftOperationEventsModal.jsx',
 'web\src\panels\room\ShiftsPanel.jsx',
 'web\src\panels\company\ShiftsPanel.jsx',
 'tools\pack_m66_operation_reassignment.ps1',
 'tools\check_m66_operation_reassignment_repo_contract.ps1',
 'docs\RUNBOOK_M66_OPERATION_REASSIGNMENT.md',
 'backend\package.json'
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$roomRoute = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\shifts\room.js'
$sharedRoute = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\shifts\shared.js'
$roomPanel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\room\ShiftsPanel.jsx'
$companyPanel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\company\ShiftsPanel.jsx'
$reassignModal = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\components\ShiftReassignModal.jsx'
$eventsModal = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\components\ShiftOperationEventsModal.jsx'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M66_OPERATION_REASSIGNMENT.md'
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\pack_m66_operation_reassignment.ps1'
$script = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\scripts\m66check.js'
$pkg = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\package.json'

Assert-RepoContractContainsAny $roomRoute @('/:id/reassign','only approved/active shifts can be reassigned','shift_reassign') 'room route exposes reassign flow'
Assert-RepoContractContainsAny $roomRoute @('reassign-removed','route:plan','shift:update') 'room route emits handoff events'
Assert-RepoContractContainsAny $sharedRoute @('/:id/operation-events','shift_reassign') 'shared route exposes operation events'
Assert-RepoContractContainsAny $roomPanel @('atamayi degistir','shiftreassignmodal','islem kaydi') 'room shifts panel exposes reassign ui'
Assert-RepoContractContainsAny $companyPanel @('operasyon kaydi','shiftoperationeventsmodal') 'company shifts panel exposes operation log ui'
Assert-RepoContractContainsAny $reassignModal @('degisikligi kaydet ve paketi yenile','rota / gorev paketi yenilenir') 'reassign modal explains package refresh'
Assert-RepoContractContainsAny $eventsModal @('operasyon akisi','arac arizasi') 'operation events modal maps turkish reason labels'
Assert-RepoContractContainsAny $runbook @('operasyonel atama degisikligi','atamayi degistir','operasyon kaydi','yeni surucu') 'runbook documents M66 flow'
Assert-RepoContractContainsAny $pack @('check_m66_operation_reassignment_repo_contract.ps1','backend/scripts/m66check.js','pack pass ok') 'pack wires repo contract and runtime check'
Assert-RepoContractContainsAny $script @('m66 operation reassignment check','shiftreassignmodal','operasyon akisi') 'm66 runtime script describes current scope'
Assert-RepoContractContainsAny $pkg @('"m66check": "node scripts/m66check.js"') 'backend package exposes m66check'

Write-Host 'M66 OPERATION REASSIGNMENT REPO CONTRACT PASS'
