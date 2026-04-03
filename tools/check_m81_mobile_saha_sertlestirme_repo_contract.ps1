param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M81 Repo Contract ==="
@(
  "mobile\package.json",
  "mobile\app.json",
  "mobile\eas.json",
  "mobile\.env.example",
  "mobile\App.js",
  "mobile\M81_RELEASE_ENV_RUNBOOK.md",
  "mobile\src\lib\backgroundGps.js",
  "mobile\src\lib\gps.js",
  "mobile\src\lib\api.js",
  "mobile\src\lib\storage.js",
  "mobile\src\screens\LoginScreen.js",
  "mobile\src\screens\PinChangeScreen.js",
  "mobile\src\screens\TodayScreen.js",
  "mobile\scripts\m81_2_background_runtime_check.js",
  "mobile\scripts\m81_2b_bundle_chain_check.js",
  "mobile\scripts\m81_2c_appjs_syntax_fix_check.js",
  "mobile\scripts\m81_3_ios_readiness_check.js",
  "mobile\scripts\m81_4_release_env_discipline_check.js",
  "tools\pack_m81_mobile_saha_sertlestirme.ps1",
  "tools\check_m81_mobile_saha_sertlestirme_repo_contract.ps1",
  "docs\RUNBOOK_M81_MOBILE_SAHA_SERTLESTIRME.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$pkg = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\package.json"
$appJson = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\app.json"
$eas = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\eas.json"
$env = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\.env.example"
$app = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\App.js"
$bg = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\src\lib\backgroundGps.js"
$gps = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\src\lib\gps.js"
$api = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\src\lib\api.js"
$today = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\src\screens\TodayScreen.js"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M81_MOBILE_SAHA_SERTLESTIRME.md"
$mobileRunbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "mobile\M81_RELEASE_ENV_RUNBOOK.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"

Assert-RepoContractContainsAny -Text $pkg -Needles @("check:m81.2","check:m81.2b","check:m81.3","check:m81.4","build:preview:ios","build:production:ios") -Label "package exposes M81 checks and ios build scripts"
Assert-RepoContractContainsAny -Text $appJson -Needles @('"releaseStage": "m81-mobile-saha-sertlestirme"','UIBackgroundModes','"location"','ACCESS_BACKGROUND_LOCATION') -Label "app config carries M81 release and background location wiring"
Assert-RepoContractContainsAny -Text $eas -Needles @('"preview"','"production"','"preview-simulator"','"ios"','"android"','EXPO_PUBLIC_RELEASE_STAGE') -Label "eas defines android and ios release matrix"
Assert-RepoContractContainsAny -Text $env -Needles @('EXPO_PUBLIC_API_BASE_URL','EXPO_PUBLIC_RELEASE_STAGE') -Label "env example exposes release matrix vars"
Assert-RepoContractContainsAny -Text $app -Needles @('backgroundPermissionStatus','backgroundTaskState','readGpsRuntimeSnapshot','sessionFailure','kvkk') -Label "app exposes runtime surface and failure visibility"
Assert-RepoContractContainsAny -Text $bg -Needles @('TaskManager.defineTask','startLocationUpdatesAsync','stopLocationUpdatesAsync','foregroundService') -Label "background gps helper defines task lifecycle"
Assert-RepoContractContainsAny -Text $gps -Needles @('publishGps','resolveGpsPublishTarget','APPROVED','ACTIVE') -Label "gps helper keeps publish gate"
Assert-RepoContractContainsAny -Text $api -Needles @('markSessionFailure','fetchHealth','fetchKvkkCurrent','acceptKvkkRequiredMany','logoutDriver') -Label "api helper keeps session and kvkk resilience"
Assert-RepoContractContainsAny -Text $today -Needles @('KVKK','Baglanti','Son senkron','Arka plan','Yayin') -Label "today screen keeps saha runtime cards"
Assert-RepoContractContainsAny -Text $runbook -Needles @('Android background GPS','iOS build readiness','release / env / version','checker + pack') -Label "runbook defines M81 scope"
Assert-RepoContractContainsAny -Text $mobileRunbook -Needles @('release','env','preview','production') -Label "mobile runbook keeps release env guidance"
Assert-RepoContractContainsAny -Text $registry -Needles @('M81','mobil saha sertleştirme','mobil saha sertlestirme') -Label "registry still tracks M81"
Assert-RepoContractContainsAny -Text $primer -Needles @('M81','mobil saha sertleştirme','mobil saha sertlestirme') -Label "primer still tracks M81 route"
Assert-RepoContractContainsAny -Text $backlog -Needles @('M81','mobil saha sertleştirme','mobil saha sertlestirme') -Label "backlog still tracks M81 route"

Write-Host "=== M81 Repo Contract PASS ==="
