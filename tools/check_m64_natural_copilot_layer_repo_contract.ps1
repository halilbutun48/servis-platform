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

Write-Host 'INFO Checking M64 files'
@(
 'backend\scripts\m64_natural_copilot_layer_check.js',
 'backend\src\ops\naturalCopilotManifest.js',
 'backend\src\routes\naturalCopilot.js',
 'web\src\panels\superadmin\NaturalCopilotPanel.jsx',
 'docs\RUNBOOK_M64_NATURAL_COPILOT_LAYER.md',
 'docs\MILESTONE_M64_NATURAL_COPILOT_LAYER.md',
 'tools\pack_m64_natural_copilot_layer.ps1',
 'tools\check_m64_natural_copilot_layer_repo_contract.ps1',
 'README.md',
 'docs\PROJECT_SPEC_V1.md',
 'docs\PRIMER_SSOT.md',
 'docs\STARTPACK_V1.md',
 'docs\CHECKLIST_SSOT.md',
 'docs\NEXT_BACKLOG_V1.md',
 'tools\PRIMER_SNAPSHOT.md',
 'tools\CHECKLIST_SSOT.md',
 'tools\README.md',
 'docs\MILESTONE_REGISTRY_V1.md'
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
$runbook = ReadText 'docs\RUNBOOK_M64_NATURAL_COPILOT_LAYER.md'
$milestone = ReadText 'docs\MILESTONE_M64_NATURAL_COPILOT_LAYER.md'
$route = ReadText 'backend\src\routes\naturalCopilot.js'
$manifest = ReadText 'backend\src\ops\naturalCopilotManifest.js'
$panel = ReadText 'web\src\panels\superadmin\NaturalCopilotPanel.jsx'
$pack = ReadText 'tools\pack_m64_natural_copilot_layer.ps1'
$script = ReadText 'backend\scripts\m64_natural_copilot_layer_check.js'

MustContainAny $readme @('m63 green','m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1') 'root readme reflects M64 route'
MustContainAny $projectSpec @('daha dogal turkce cevap katmani','kisa konusma hafizasi','daha basit anlat') 'project spec reflects natural copilot layer'
MustContainAny $primer @('m63 - guven + kalite + hizmet degerlendirme','m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1') 'primer ssot reflects M63 green and M64 active'
MustContainAny $startpack @('m64 - dogal copilot katmani','m64 baslangic notu','m64 bitmeden m65') 'startpack reflects M64 opening'
MustContainAny $checklist @('[x] m63 - guven + kalite + hizmet degerlendirme','[ ] m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1') 'checklist marks M63 green and keeps M64 open'
MustContainAny $backlog @('m64 - dogal copilot katmani','dogal turkce cevap katmani','pack_m64_natural_copilot_layer.ps1') 'backlog points to M64'
MustContainAny $toolsPrimer @('m63 - guven + kalite + hizmet degerlendirme','m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1') 'tools primer reflects M64 route'
MustContainAny $toolsChecklist @('[x] m63 - guven + kalite + hizmet degerlendirme','[ ] m64 - dogal copilot katmani','pack_m64_natural_copilot_layer.ps1') 'tools checklist marks M63 green and keeps M64 open'
MustContainAny $toolsReadme @('pack_m64_natural_copilot_layer.ps1','m64 green olmadan m65 acilmaz','aktif hat m64') 'tools readme lists M64 pack and sequencing rule'
MustContainAny $registry @('m63 - guven + kalite + hizmet degerlendirme - green','m64 - dogal copilot katmani - aktif') 'registry lists current official route'
MustContainAny $runbook @('m64 dogal copilot katmani','dogal cevap katmani','m64 green olmadan m65') 'runbook defines M64 scope'
MustContainAny $milestone @('m64 - dogal copilot katmani','naturalcopilotpanel.jsx','pack_m64_natural_copilot_layer.ps1') 'milestone documents M64 outputs'
MustContainAny $route @('/manifest','/reply-template','/feedback-template') 'natural copilot route exposes summary endpoints'
MustContainAny $manifest @('natural_copilot_capabilities','dogal turkce cevap katmani','copilot geri bildirim zemini') 'manifest defines M64 copilot capabilities'
MustContainAny $panel @('m64 dogal copilot katmani','dogal cevap','geri bildirim') 'web panel shows M64 cards'
MustContainAny $pack @('m64_natural_copilot_layer_check.js','check_m64_natural_copilot_layer_repo_contract.ps1','pack pass ok') 'm64 pack wires runtime and repo contract'
MustContainAny $script @('m64 dogal copilot katmani check','/api/natural-copilot') 'm64 runtime check covers skeleton baseline'

Write-Host 'M64 DOGAL COPILOT KATMANI REPO CONTRACT PASS'
