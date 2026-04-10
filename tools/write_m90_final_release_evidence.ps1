param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

function Read-JsonOrNull {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  return (Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Write-Utf8File {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Content
  )
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $enc = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

$state = Read-JsonOrNull (Join-Path $RepoRoot 'tools\repo_contract_state.json')
$audit = Read-JsonOrNull (Join-Path $RepoRoot 'artifacts\repo-audit\repo_audit_latest.json')
$lintPath = Join-Path $RepoRoot 'artifacts\lint\web_lint_latest.txt'

$branch = ''
$commit = ''
$tag = ''
try { $branch = (git -C $RepoRoot rev-parse --abbrev-ref HEAD 2>$null).Trim() } catch {}
try { $commit = (git -C $RepoRoot rev-parse --short HEAD 2>$null).Trim() } catch {}
try { $tag = (git -C $RepoRoot describe --tags --abbrev=0 2>$null).Trim() } catch {}

$generatedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
$livingUpperRoute = if ($state -and $state.phaseDefaults -and $state.phaseDefaults.livingMasterUpperBound) { [string]$state.phaseDefaults.livingMasterUpperBound } else { 'M89' }
$nextMilestone = if ($state -and $state.nextMilestone) { [string]$state.nextMilestone } else { '' }
$docsContractMode = if ($state -and $state.docsContractMode) { [string]$state.docsContractMode } else { '' }

$lintSummary = 'see artifacts/lint/web_lint_latest.txt'
if (Test-Path $lintPath) {
  $lintContent = Get-Content $lintPath -Raw -Encoding UTF8
  if ($lintContent -match 'âœ–\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)') {
    $lintSummary = "$($matches[2]) error / $($matches[3]) warning"
  } elseif (($lintContent -notmatch 'warning') -and ($lintContent -notmatch 'error') -and ($lintContent -match 'eslint \.')) {
    $lintSummary = '0 error / 0 warning'
  }
}

$summary = $null
if ($audit -and $audit.summary) { $summary = $audit.summary }

function CountOrBlank {
  param($Value)
  if ($null -eq $Value) { return '' }
  return [string]$Value
}

$exactDuplicateGroups = CountOrBlank $(if ($summary) { $summary.exactDuplicateGroupCount } else { $null })
$duplicatePackGroups = CountOrBlank $(if ($summary) { $summary.duplicatePackGroupCount } else { $null })
$duplicateCheckGroups = CountOrBlank $(if ($summary) { $summary.duplicateCheckGroupCount } else { $null })
$orphanCandidates = CountOrBlank $(if ($summary) { $summary.orphanCandidateCount } else { $null })
$tinyFiles = CountOrBlank $(if ($summary) { $summary.tinyFileCount } else { $null })
$hotFiles = CountOrBlank $(if ($summary) { $summary.largeFileWarningCount } else { $null })
$largeFiles = CountOrBlank $(if ($summary) { $summary.largeFileCount } else { $null })
$docRefs = CountOrBlank $(if ($summary) { $summary.activeDocContractRefCount } else { $null })
$runtimeJson = CountOrBlank $(if ($summary) { $summary.runtimeJsonFileCount } else { $null })

$lines = @(
  '# FINAL RELEASE EVIDENCE - M90',
  '',
  'This file collects the M90 final closure evidence in one place.',
  '',
  '## Git references',
  "- Branch: $branch",
  "- Commit: $commit",
  "- Tag: $tag",
  "- Generated at: $generatedAt",
  '',
  '## Closure summary',
  '- Canonical master pack baseline: M0->M89 green',
  "- Living upper route baseline: $livingUpperRoute",
  "- State next milestone: $nextMilestone",
  "- Docs contract mode: $docsContractMode",
  '- Canonical final verification: `npm run verify:final`',
  '- Canonical CI verification: `npm run verify:ci`',
  "- Web lint summary: $lintSummary",
  '',
  '## Repo audit summary',
  "- exact duplicate groups: $exactDuplicateGroups",
  "- duplicate pack groups: $duplicatePackGroups",
  "- duplicate check groups: $duplicateCheckGroups",
  "- orphan candidates: $orphanCandidates",
  "- tiny files: $tinyFiles",
  "- hot files >=1000 and <1200: $hotFiles",
  "- large files >=1200: $largeFiles",
  "- active docs-contract refs: $docRefs",
  "- runtime json files tracked: $runtimeJson",
  '',
  '## Canonical evidence paths',
  '- This file: `docs/FINAL_RELEASE_EVIDENCE_M90.md`',
  '- Web lint evidence: `artifacts/lint/web_lint_latest.txt`',
  '- Repo audit evidence: `artifacts/repo-audit/repo_audit_latest.json`',
  '- CI workflow: `.github/workflows/vardis_verification_visibility.yml`',
  '- Primer: `docs/PRIMER_SSOT.md`',
  '- Tools guide: `tools/README.md`',
  '',
  '## Shareable export summary',
  '- Canonical command: `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`',
  '- Hygiene gate: `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`',
  '- Note: the shareable export output is generated at runtime. This file keeps the command and process reference, not the output artifact itself.',
  '',
  '## CI visibility summary',
  '- Workflow: `.github/workflows/vardis_verification_visibility.yml`',
  '- Expected jobs: `repo-verification`, `shareable-export`',
  '- The root verify chain includes the web lint evidence step.',
  '',
  '## Final closure order',
  '1. `npm run verify:final`',
  '2. `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`',
  '3. `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`',
  '4. `git status --short`',
  '5. If there are no unexpected changes, continue with commit / tag / push',
  '',
  '## Note',
  '- This file does not replace the raw logs. Open the canonical evidence paths above for the source artifacts.',
  '- This file is the primary single-entry summary for the M90 closure decision.'
)

$evidencePath = Join-Path $RepoRoot 'docs\FINAL_RELEASE_EVIDENCE_M90.md'
Write-Utf8File -Path $evidencePath -Content ($lines -join [Environment]::NewLine)
Write-Host "OK $evidencePath generated"