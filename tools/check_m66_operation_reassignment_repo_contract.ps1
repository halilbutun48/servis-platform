param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function NormalizeText([string]$s) {
  if ($null -eq $s) { return "" }
  $t = [string]$s
  $pairs = @(
    @([string][char]0x0130,'I'), @([string][char]0x0131,'i'),
    @([string][char]0x015E,'S'), @([string][char]0x015F,'s'),
    @([string][char]0x011E,'G'), @([string][char]0x011F,'g'),
    @([string][char]0x00DC,'U'), @([string][char]0x00FC,'u'),
    @([string][char]0x00D6,'O'), @([string][char]0x00F6,'o'),
    @([string][char]0x00C7,'C'), @([string][char]0x00E7,'c'),
    @([string][char]0x2014,'-'), @([string][char]0x2013,'-'),
    @([string][char]0x2192,'->'), @('`','')
  )
  foreach ($pair in $pairs) { $t = $t.Replace($pair[0], $pair[1]) }
  $t = $t.ToLowerInvariant()
  $t = [regex]::Replace($t, '\s+', ' ')
  return $t.Trim()
}
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8) }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ $nTxt = NormalizeText $txt; foreach ($n in $needles) { if ($nTxt.Contains((NormalizeText ([string]$n)))) { Write-Host "OK $label"; return } }; throw "FAIL $label" }

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
) | ForEach-Object { MustExist $_ }

$roomRoute = ReadText 'backend\src\routes\shifts\room.js'
$sharedRoute = ReadText 'backend\src\routes\shifts\shared.js'
$roomPanel = ReadText 'web\src\panels\room\ShiftsPanel.jsx'
$companyPanel = ReadText 'web\src\panels\company\ShiftsPanel.jsx'
$reassignModal = ReadText 'web\src\components\ShiftReassignModal.jsx'
$eventsModal = ReadText 'web\src\components\ShiftOperationEventsModal.jsx'
$runbook = ReadText 'docs\RUNBOOK_M66_OPERATION_REASSIGNMENT.md'
$pack = ReadText 'tools\pack_m66_operation_reassignment.ps1'
$script = ReadText 'backend\scripts\m66check.js'
$pkg = ReadText 'backend\package.json'

MustContainAny $roomRoute @('/:id/reassign','only approved/active shifts can be reassigned','shift_reassign') 'room route exposes reassign flow'
MustContainAny $roomRoute @('reassign-removed','route:plan','shift:update') 'room route emits handoff events'
MustContainAny $sharedRoute @('/:id/operation-events','shift_reassign') 'shared route exposes operation events'
MustContainAny $roomPanel @('atamayi degistir','shiftreassignmodal','islem kaydi') 'room shifts panel exposes reassign ui'
MustContainAny $companyPanel @('operasyon kaydi','shiftoperationeventsmodal') 'company shifts panel exposes operation log ui'
MustContainAny $reassignModal @('degisikligi kaydet ve paketi yenile','rota / gorev paketi yenilenir') 'reassign modal explains package refresh'
MustContainAny $eventsModal @('operasyon akisi','arac arizasi') 'operation events modal maps turkish reason labels'
MustContainAny $runbook @('operasyonel atama degisikligi','atamayi degistir','operasyon kaydi','yeni surucu') 'runbook documents M66 flow'
MustContainAny $pack @('check_m66_operation_reassignment_repo_contract.ps1','backend/scripts/m66check.js','pack pass ok') 'pack wires repo contract and runtime check'
MustContainAny $script @('m66 operation reassignment check','shiftreassignmodal','operasyon akisi') 'm66 runtime script describes current scope'
MustContainAny $pkg @('"m66check": "node scripts/m66check.js"') 'backend package exposes m66check'

Write-Host 'M66 OPERATION REASSIGNMENT REPO CONTRACT PASS'
