param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize() }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ foreach ($n in $needles) { if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return } }; throw "FAIL $label" }
Write-Host "INFO Checking M56 files"
@(
 'backend\src\routes\eta.js',
 'backend\src\kvkk\matrix.js',
 'backend\src\routes\kvkk.js',
 'backend\scripts\m56_kvkk_eta_quality_check.js',
 'web\src\panels\shared\KvkkPanel.jsx',
 'web\src\panels\personel\LivePanel.jsx',
 'web\src\panels\personel\MyRidePanel.jsx',
 'tools\pack_m56_kvkk_eta_quality.ps1',
 'tools\check_m56_kvkk_eta_quality_repo_contract.ps1',
 'docs\RUNBOOK_M56_KVKK_ETA_QUALITY.md'
) | ForEach-Object { MustExist $_ }
$eta = ReadText 'backend\src\routes\eta.js'
$kvkk = ReadText 'backend\src\routes\kvkk.js'
$app = ReadText 'web\src\App.jsx'
$nav = ReadText 'web\src\layout\NavDock.jsx'
$api = ReadText 'docs\API_SPEC_V1.md'
$tools = ReadText 'tools\README.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
MustContainAny $kvkk @('/matrix') 'kvkk route exposes matrix endpoint'
MustContainAny $eta @('routeProgressState') 'eta exposes route progress state'
MustContainAny $eta @('rerouteSuggested') 'eta exposes reroute suggested'
MustContainAny $eta @('skippedStops') 'eta exposes skipped stops list'
MustContainAny $eta @('lastResolvedStop') 'eta exposes last resolved stop'
MustContainAny $app @('/shared/kvkk') 'app shared kvkk route exists'
MustContainAny $nav @('KVKK') 'nav includes kvkk label'
MustContainAny $api @('M56','KVKK MATRIX + ETA QUALITY') 'api spec mentions M56 milestone'
MustContainAny $api @('/api/kvkk/matrix') 'api spec lists kvkk matrix endpoint'
MustContainAny $api @('/api/eta/vehicle/:id') 'api spec lists eta vehicle endpoint'
MustContainAny $tools @('pack_m56_kvkk_eta_quality.ps1') 'tools readme lists M56 pack'
MustContainAny $primer @('M56 KVKK MATRIX + ETA QUALITY PACK PASS OK') 'primer mentions M56 pack pass'
MustContainAny $checklist @('M56','pack_m56_kvkk_eta_quality.ps1','KVKK Matrix + ETA/Navigation Quality','KVKK MATRIX + ETA QUALITY PACK PASS OK') 'checklist mentions M56 milestone'
Write-Host 'M56 KVKK MATRIX + ETA QUALITY REPO CONTRACT PASS'
