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

Write-Host 'INFO Checking M63 files'
@(
 'backend\scripts\m63_trust_quality_service_evaluation_check.js',
 'backend\src\ops\trustQualityManifest.js',
 'backend\src\routes\trustQuality.js',
 'web\src\panels\superadmin\TrustQualityPanel.jsx',
 'docs\RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md',
 'docs\MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md',
 'tools\pack_m63_trust_quality_service_evaluation.ps1',
 'tools\check_m63_trust_quality_service_evaluation_repo_contract.ps1',
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
$runbook = ReadText 'docs\RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md'
$milestone = ReadText 'docs\MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md'
$route = ReadText 'backend\src\routes\trustQuality.js'
$manifest = ReadText 'backend\src\ops\trustQualityManifest.js'
$panel = ReadText 'web\src\panels\superadmin\TrustQualityPanel.jsx'
$pack = ReadText 'tools\pack_m63_trust_quality_service_evaluation.ps1'
$script = ReadText 'backend\scripts\m63_trust_quality_service_evaluation_check.js'

MustContainAny $readme @('m62 green','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1') 'root readme reflects M63 route'
MustContainAny $projectSpec @('hizmet alan kurum degerlendirmesi','saglayici kalite','karar destek') 'project spec reflects trust and evaluation layer'
MustContainAny $primer @('m62 - ticari omurga guclendirme','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1') 'primer ssot reflects M62 green and M63 active'
MustContainAny $startpack @('m63 - guven + kalite + hizmet degerlendirme','m63 baslangic notu','m63 bitmeden m64') 'startpack reflects M63 opening'
MustContainAny $checklist @('[x] m62 - ticari omurga guclendirme','[ ] m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1') 'checklist marks M62 green and keeps M63 open'
MustContainAny $backlog @('m62 ticari omurga guclendirme pack pass ok','m63 - guven + kalite + hizmet degerlendirme','trust quality service evaluation') 'backlog points to M63'
MustContainAny $toolsPrimer @('m62 - ticari omurga guclendirme','m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1') 'tools primer reflects M63 route'
MustContainAny $toolsChecklist @('[x] m62 - ticari omurga guclendirme','[ ] m63 - guven + kalite + hizmet degerlendirme','pack_m63_trust_quality_service_evaluation.ps1') 'tools checklist marks M62 green and keeps M63 open'
MustContainAny $toolsReadme @('pack_m63_trust_quality_service_evaluation.ps1','m63 green olmadan m64 acilmaz','aktif hat m63') 'tools readme lists M63 pack and sequencing rule'
MustContainAny $registry @('m62 - ticari omurga guclendirme - green','m63 - guven + kalite + hizmet degerlendirme - aktif') 'registry lists current official route'
MustContainAny $runbook @('m63 guven + kalite + hizmet degerlendirme','hizmet alan kurum degerlendirmesi','m63 green olmadan m64') 'runbook defines M63 scope'
MustContainAny $milestone @('m63 guven + kalite + hizmet degerlendirme','trustqualitypanel.jsx','pack_m63_trust_quality_service_evaluation.ps1') 'milestone documents M63 outputs'
MustContainAny $route @('/manifest','/evaluation-template','/provider-signal-template') 'trust quality route exposes summary endpoints'
MustContainAny $manifest @('trust_quality_dimensions','hizmet alan degerlendirmesi','karar destek yuzeyi') 'manifest defines M63 trust dimensions'
MustContainAny $panel @('m63 guven + kalite + hizmet degerlendirme','hizmet alan degerlendirmesi','saglayici kalite sinyali') 'web panel shows M63 cards'
MustContainAny $pack @('m63_trust_quality_service_evaluation_check.js','check_m63_trust_quality_service_evaluation_repo_contract.ps1','pack pass ok') 'm63 pack wires runtime and repo contract'
MustContainAny $script @('m63 guven + kalite + hizmet degerlendirme check','/api/trust-quality') 'm63 runtime check covers skeleton baseline'

Write-Host 'M63 GUVEN + KALITE + HIZMET DEGERLENDIRME REPO CONTRACT PASS'
