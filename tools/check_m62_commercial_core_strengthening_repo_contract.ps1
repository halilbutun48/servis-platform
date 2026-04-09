param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function NormalizeText([string]$s) {
  if ($null -eq $s) { return '' }
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
  $t = [regex]::Replace($t, '\\s+', ' ')
  return $t.Trim()
}

function ReadText([string]$rel) {
  return [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8)
}

function MustExist([string]$rel) {
  if (-not (Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}

function MustContainAny([string]$txt,[string[]]$needles,[string]$label) {
  $nTxt = NormalizeText $txt
  foreach ($n in $needles) {
    if ($nTxt.Contains((NormalizeText ([string]$n)))) {
      Write-Host "OK $label"
      return
    }
  }
  throw "FAIL $label"
}

Write-Host 'INFO Checking M62 files'
@(
 'backend\scripts\m62_commercial_core_strengthening_check.js',
 'backend\src\ops\commercialCoreManifest.js',
 'backend\src\routes\commercialCore.js',
 'web\src\panels\superadmin\CommercialCorePanel.jsx',
 'docs\RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md',
 'docs\MILESTONE_M62_COMMERCIAL_CORE_STRENGTHENING.md',
 'tools\pack_m62_commercial_core_strengthening.ps1',
 'tools\check_m62_commercial_core_strengthening_repo_contract.ps1',
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
$runbook = ReadText 'docs\RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md'
$milestone = ReadText 'docs\MILESTONE_M62_COMMERCIAL_CORE_STRENGTHENING.md'
$route = ReadText 'backend\src\routes\commercialCore.js'
$manifest = ReadText 'backend\src\ops\commercialCoreManifest.js'
$panel = ReadText 'web\src\panels\superadmin\CommercialCorePanel.jsx'
$pack = ReadText 'tools\pack_m62_commercial_core_strengthening.ps1'
$script = ReadText 'backend\scripts\m62_commercial_core_strengthening_check.js'
MustContainAny $projectSpec @('PROJECT_SPEC_M62_COMMERCIAL_CORE_V1') 'project spec reflects commercial layer'
MustContainAny $readme @('README_ROUTE_M62_COMMERCIAL_CORE_V1') 'root readme reflects m62 route'
MustContainAny $primer @('PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1') 'primer reflects m62 route'
MustContainAny $startpack @('STARTPACK_ROUTE_M62_COMMERCIAL_CORE_V1') 'startpack reflects m62 route'
MustContainAny $checklist @('CHECKLIST_ROUTE_M62_COMMERCIAL_CORE_V1') 'checklist reflects m62 route'
MustContainAny $backlog @('BACKLOG_ROUTE_M62_COMMERCIAL_CORE_V1') 'backlog reflects m62 route'
MustContainAny $toolsPrimer @('TOOLS_PRIMER_ROUTE_M62_COMMERCIAL_CORE_V1') 'tools primer reflects m62 route'
MustContainAny $toolsChecklist @('TOOLS_CHECKLIST_ROUTE_M62_COMMERCIAL_CORE_V1') 'tools checklist reflects m62 route'
MustContainAny $toolsReadme @('TOOLS_README_ROUTE_M62_COMMERCIAL_CORE_V1') 'tools readme reflects m62 route'
MustContainAny $registry @('m61 - ssot + milestone hizasi','m62 - ticari omurga guclendirme','aktif','m75 - living baseline','m76a-1 - minimum normalization','m77 - kvkk + uyum katmani') 'registry lists current official route'
MustContainAny $runbook @('m62 ticari omurga guclendirme','talep / ihtiyac karti','m62 green olmadan m63') 'runbook defines M62 scope'
MustContainAny $milestone @('m62 ticari omurga guclendirme','commercialcorepanel.jsx','pack_m62_commercial_core_strengthening.ps1') 'milestone documents M62 outputs'
MustContainAny $route @('/manifest','/lifecycle-template','/rules') 'commercial core route exposes summary endpoints'
MustContainAny $manifest @('commercial_core_steps','talep karti','sozlesmeye gecis kapisi') 'manifest defines M62 trade steps'
MustContainAny $panel @('m62 ticari omurga guclendirme','izlenen ticari adimlar','sozlesmeye gecis') 'web panel shows M62 cards'
MustContainAny $pack @('m62_commercial_core_strengthening_check.js','check_m62_commercial_core_strengthening_repo_contract.ps1','pack pass ok') 'm62 pack wires runtime and repo contract'
MustContainAny $script @('m62 ticari omurga guclendirme check','/api/commercial-core') 'm62 runtime check covers skeleton baseline'

Write-Host 'M62 TICARI OMURGA GUCLENDIRME REPO CONTRACT PASS'

