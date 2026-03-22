param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function MustExist([string]$rel) {
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}

function ReadText([string]$rel) {
  return [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8)
}

$manifestPath = Join-Path $RepoRoot 'tools\milestone_pack_manifest.json'
MustExist 'tools\milestone_pack_manifest.json'
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

Write-Host 'INFO checking core docs'
$manifest.coreDocs.PSObject.Properties.Value | ForEach-Object { MustExist ([string]$_) }
MustExist 'tools\pack.ps1'
MustExist 'tools\pack_docs_ssot.ps1'
MustExist 'tools\check_docs_ssot_repo_contract.ps1'
MustExist 'backend\scripts\docs_ssot_pack_check.js'

Write-Host 'INFO checking manifest referenced files'
foreach ($stage in $manifest.stages) {
  MustExist ([string]$stage.script)
  if ($stage.PSObject.Properties.Name -contains 'check') { MustExist ([string]$stage.check) }
  if ($stage.PSObject.Properties.Name -contains 'runtime') { MustExist ([string]$stage.runtime) }
  if ($stage.PSObject.Properties.Name -contains 'runbook') { MustExist ([string]$stage.runbook) }
  if ($stage.PSObject.Properties.Name -contains 'checklist') { MustExist ([string]$stage.checklist) }
}

Write-Host 'INFO checking mirrored checklist sync'
$docsChecklist = ReadText 'docs\CHECKLIST_SSOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
if ($docsChecklist -ne $toolsChecklist) { throw 'FAIL tools/docs checklist mirror drift' }
Write-Host 'OK tools/docs checklist mirror synced'

Write-Host 'DOCS SSOT REPO CONTRACT PASS'
