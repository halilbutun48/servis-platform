param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = 'Stop'

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

MustContainAny $readme @('m61 green','m62 - ticari omurga guclendirme','pack_m62_commercial_core_strengthening.ps1') 'root readme reflects M62 route'
MustContainAny $projectSpec @('talep karti','teklif yasam dongusu','pazarlik gecmisi','uzlasma ozeti') 'project spec reflects commercial layer'
MustContainAny $primer @('m61 - ssot + milestone hizasi','m62 - ticari omurga guclendirme','pack_m62_commercial_core_strengthening.ps1') 'primer ssot reflects M61 green and M62 active'
MustContainAny $startpack @('m62 - ticari omurga guclendirme','m62 baslangic notu','m62 bitmeden m63') 'startpack reflects M62 opening'
MustContainAny $checklist @('[x] m61 - ssot + milestone hizasi','[ ] m62 - ticari omurga guclendirme','pack_m62_commercial_core_strengthening.ps1') 'checklist marks M61 green and keeps M62 open'
MustContainAny $backlog @('m61 ssot + milestone hizasi pack pass ok','m62 - ticari omurga guclendirme','commercial core strengthening') 'backlog points to M62'
MustContainAny $toolsPrimer @('m61 - ssot + milestone hizasi','m62 - ticari omurga guclendirme','pack_m62_commercial_core_strengthening.ps1') 'tools primer reflects M62 route'
MustContainAny $toolsChecklist @('[x] m61 - ssot + milestone hizasi','[ ] m62 - ticari omurga guclendirme','pack_m62_commercial_core_strengthening.ps1') 'tools checklist marks M61 green and keeps M62 open'
MustContainAny $toolsReadme @('pack_m62_commercial_core_strengthening.ps1','m62 green olmadan m63 acilmaz','aktif hat m62') 'tools readme lists M62 pack and sequencing rule'
MustContainAny $registry @('m61 - ssot + milestone hizasi','m62 - ticari omurga guclendirme','aktif') 'registry lists current official route'
MustContainAny $runbook @('m62 ticari omurga guclendirme','talep / ihtiyac karti','m62 green olmadan m63') 'runbook defines M62 scope'
MustContainAny $milestone @('m62 ticari omurga guclendirme','commercialcorepanel.jsx','pack_m62_commercial_core_strengthening.ps1') 'milestone documents M62 outputs'
MustContainAny $route @('/manifest','/lifecycle-template','/rules') 'commercial core route exposes summary endpoints'
MustContainAny $manifest @('commercial_core_steps','talep karti','sozlesmeye gecis kapisi') 'manifest defines M62 trade steps'
MustContainAny $panel @('m62 ticari omurga guclendirme','izlenen ticari adimlar','sozlesmeye gecis') 'web panel shows M62 cards'
MustContainAny $pack @('m62_commercial_core_strengthening_check.js','check_m62_commercial_core_strengthening_repo_contract.ps1','pack pass ok') 'm62 pack wires runtime and repo contract'
MustContainAny $script @('m62 ticari omurga guclendirme check','/api/commercial-core') 'm62 runtime check covers skeleton baseline'

Write-Host 'M62 TICARI OMURGA GUCLENDIRME REPO CONTRACT PASS'
