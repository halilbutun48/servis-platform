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
    @([string][char]0x2014,'-'), @([string][char]0x2013,'-')
  )
  foreach ($pair in $pairs) { $t = $t.Replace($pair[0], $pair[1]) }
  $t = $t.ToLowerInvariant()
  $t = [regex]::Replace($t, '\s+', ' ')
  return $t.Trim()
}
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8) }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ $nTxt = NormalizeText $txt; foreach ($n in $needles) { if ($nTxt.Contains((NormalizeText ([string]$n)))) { Write-Host "OK $label"; return } }; throw "FAIL $label" }

Write-Host 'INFO Checking M65 files'
@(
 'backend\scripts\m65_pilot_launch_gate_check.js',
 'backend\src\ops\pilotLaunchGateManifest.js',
 'backend\src\routes\pilotLaunchGate.js',
 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx',
 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md',
 'docs\MILESTONE_M65_PILOT_LAUNCH_GATE.md',
 'tools\pack_m65_pilot_launch_gate.ps1',
 'tools\check_m65_pilot_launch_gate_repo_contract.ps1',
 'README.md', 'docs\PROJECT_SPEC_V1.md', 'docs\PRIMER_SSOT.md', 'docs\STARTPACK_V1.md', 'docs\CHECKLIST_SSOT.md', 'docs\NEXT_BACKLOG_V1.md', 'tools\PRIMER_SNAPSHOT.md', 'tools\CHECKLIST_SSOT.md', 'tools\README.md', 'docs\MILESTONE_REGISTRY_V1.md'
) | ForEach-Object { MustExist $_ }

$readme = ReadText 'README.md'
$projectSpec = ReadText 'docs\PROJECT_SPEC_V1.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$toolsPrimer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
$toolsReadme = ReadText 'tools\README.md'
$registry = ReadText 'docs\MILESTONE_REGISTRY_V1.md'
$route = ReadText 'backend\src\routes\pilotLaunchGate.js'
$manifest = ReadText 'backend\src\ops\pilotLaunchGateManifest.js'
$panel = ReadText 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx'
$runbook = ReadText 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md'

MustContainAny $readme @('M65 — Pilot Launch Gate','M66','tools\pack.ps1 -To 66') 'root readme reflects M65/M66 route'
MustContainAny $projectSpec @('Pilot Launch Gate','GO / LIMITED GO / NO-GO','M59 → M65') 'project spec reflects launch gate layer'
MustContainAny $primer @('M65 — Pilot Launch Gate','M66','pack_m66_operation_reassignment.ps1') 'primer ssot reflects M65 green and M66 functional'
MustContainAny $startpack @('M65 — Pilot Launch Gate','M66','tools\pack_docs_ssot.ps1') 'startpack reflects post-M65/M66 state'
MustContainAny $checklist @('[x] `M65 — Pilot Launch Gate`','[ ] `M66 — Operasyonel Reassignment`') 'checklist marks M65 green and keeps M66 open'
MustContainAny $backlog @('M0-M66','cleanup','saha testi') 'backlog points to rerun after M65'
MustContainAny $toolsPrimer @('M65 — Pilot Launch Gate','M66','fonksiyonel') 'tools primer reflects M65 green and M66 functional'
if ((NormalizeText $checklist) -ne (NormalizeText $toolsChecklist)) { throw 'FAIL tools checklist mirrors docs checklist' } else { Write-Host 'OK tools checklist mirrors docs checklist' }
MustContainAny $toolsReadme @('tools\pack.ps1 -To 66','tools\pack_docs_ssot.ps1') 'tools readme lists master/docs pack'
MustContainAny $registry @('M65 - Pilot Launch Gate - green-base','M65 - Pilot Launch Gate - green','M66 - Operasyonel Reassignment - functional-open','M66 - Operasyonel Reassignment - fonksiyonel / tekrar test acik') 'registry includes M65 green and M66 open'

MustContainAny $route @('/manifest','/decision-template','/summary') 'pilot launch gate route exposes summary endpoints'
MustContainAny $manifest @('PILOT_LAUNCH_GATE_CAPABILITIES','GO / LIMITED GO / NO-GO','riskMatrix') 'manifest defines M65 gate capabilities'
MustContainAny $panel @('M65 Pilot Launch Gate','Launch checklist','GO / LIMITED GO / NO-GO') 'web panel shows M65 cards'
MustContainAny $runbook @('Pilot Launch Gate','kritik risk listesi','M65 green olmadan sahaya çıkılmaz') 'runbook defines M65 scope'

Write-Host 'M65 PILOT LAUNCH GATE REPO CONTRACT PASS'
