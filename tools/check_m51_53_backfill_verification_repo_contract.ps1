param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function WarnContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { Write-Host "INFO WARN $label"; return }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M51-M53 backfill files'
@(
  'backend\scripts\m51_53_backfill_verification_check.js',
  'backend\src\routes\shifts\people.js',
  'backend\src\routes\companyPersonels.js',
  'backend\src\routes\organization.js',
  'web\src\panels\company\GuidedPlanModal.jsx',
  'web\src\panels\organization\PlansPanel.jsx',
  'tools\pack_m51_53_backfill_verification.ps1',
  'tools\check_m51_53_backfill_verification_repo_contract.ps1',
  'docs\RUNBOOK_M51_53_BACKFILL_VERIFICATION.md',
  'tools\README.md'
) | ForEach-Object { MustExist $_ }

$runtime = ReadText 'backend\scripts\m51_53_backfill_verification_check.js'
$people = ReadText 'backend\src\routes\shifts\people.js'
$companyPeople = ReadText 'backend\src\routes\companyPersonels.js'
$org = ReadText 'backend\src\routes\organization.js'
$guided = ReadText 'web\src\panels\company\GuidedPlanModal.jsx'
$plans = ReadText 'web\src\panels\organization\PlansPanel.jsx'
$pack = ReadText 'tools\pack_m51_53_backfill_verification.ps1'
$runbook = ReadText 'docs\RUNBOOK_M51_53_BACKFILL_VERIFICATION.md'
$toolsReadme = ReadText 'tools\README.md'

Write-Host 'INFO Checking M52 import + geo wiring'
MustContainText $people '/:id/people/import' 'shift people import route exists'
MustContainText $people 'GEO_NEEDS_REVIEW' 'import route emits geo review warning'
MustContainText $people '/:id/stops/generate' 'stops generate route exists'
MustContainText $people '/:id/route-preview' 'route preview route exists'
MustContainText $companyPeople 'geoStatus=NEEDS_REVIEW' 'company geo review filter exists'
MustContainText $companyPeople '/:id/location' 'company geo review update route exists'

Write-Host 'INFO Checking M53 organization/gezi wiring'
MustContainText $org 'r.get("/rooms"' 'organization rooms route exists'
MustContainText $org 'r.get("/plans"' 'organization plans route exists'
MustContainText $org '/create-agreement' 'organization agreement route exists'
MustContainText $org '/send-offers' 'organization send offers route exists'
MustContainText $org '/publish-shift' 'organization publish shift route exists'
MustContainText $guided 'orgDestinations' 'guided modal stores destinations state'
MustContainText $guided 'openDestinationMapPicker(' 'guided modal supports map picker'
MustContainText $guided 'openDestinationNavigation(' 'guided modal supports navigation'
MustContainText $guided 'orgEstimatedPax' 'guided modal supports estimated pax'
MustContainText $plans '/api/organization/plans' 'plans panel calls organization plans api'
MustContainText $plans '/api/organization/rooms' 'plans panel calls organization rooms api'
MustContainText $plans 'send-offers' 'plans panel can send offers'
MustContainText $plans 'create-agreement' 'plans panel can create agreement'

Write-Host 'INFO Checking runtime + pack + docs'
MustContainText $runtime '/api/shifts/${shiftId}/people/import' 'runtime checks import flow'
MustContainText $runtime '/api/company/personels?geoStatus=NEEDS_REVIEW' 'runtime checks geo review list'
MustContainText $runtime '/api/shifts/${shiftId}/route-preview' 'runtime checks route preview'
MustContainText $runtime '/api/organization/plans' 'runtime checks organization endpoint reachability'
MustContainText $pack 'm51_53_backfill_verification_check.js' 'pack runs m51-m53 runtime script'
MustContainText $runbook 'M52' 'runbook explains M52 scope'
MustContainText $runbook 'M53' 'runbook explains M53 scope'
MustContainText $runbook 'geo review' 'runbook explains geo review proof'
MustContainText $runbook 'route-preview' 'runbook explains route preview proof'
WarnContainText $toolsReadme 'tools\pack_m51_53_backfill_verification.ps1' 'tools readme lists m51-m53 pack'
WarnContainText $toolsReadme 'tools\check_m51_53_backfill_verification_repo_contract.ps1' 'tools readme lists m51-m53 repo contract'

Write-Host 'M51-M53 BACKFILL VERIFICATION REPO CONTRACT PASS'
