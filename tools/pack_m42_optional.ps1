param(
  [Parameter(Mandatory=$false)]
  [string]$ComposeDir = "infra",

  [Parameter(Mandatory=$false)]
  [string]$RepoDir = ".",

  [Parameter(Mandatory=$false)]
  [string]$ApiService = "api",

  [Parameter(Mandatory=$false)]
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")

$repo = (Resolve-Path $RepoDir).Path
$pack = Join-Path $repo "tools/pack.ps1"
$composeFile = Join-Path (Join-Path $repo $ComposeDir) "docker-compose.yml"

if (-not (Test-Path $pack)) { throw "pack.ps1 not found: $pack" }
if (-not (Test-Path $composeFile)) { throw "compose file not found: $composeFile" }

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$dockerComposeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue

$dc = $null
$dcBaseArgs = @()

if ($dockerCmd) {
  $dc = $dockerCmd.Source
  $dcBaseArgs = @("compose")
} elseif ($dockerComposeCmd) {
  $dc = $dockerComposeCmd.Source
  $dcBaseArgs = @()
} else {
  throw "Docker not found. Install Docker Desktop (docker) or docker-compose."
}

function Dc {
  param([Parameter(ValueFromRemainingArguments=$true)] $Args)
  $code = Invoke-ExternalColor -FilePath $dc -ArgumentList (@($dcBaseArgs) + @($Args))
  if ($code -ne 0) {
    throw "Docker compose command failed: $dc $($dcBaseArgs -join ' ') $($Args -join ' ')"
  }
}

$prevFeature = $env:FEATURE_CHECKIN
$prevDedupe = $env:CHECKIN_DEDUPE_SEC

try {
  $env:FEATURE_CHECKIN = "1"
  if (-not $env:CHECKIN_DEDUPE_SEC) { $env:CHECKIN_DEDUPE_SEC = "60" }

  Write-Host ""
  Write-StatusLine "=== M42 OPTIONAL PACK ==="
  Write-StatusLine "INFO Mode: base M41 pack + optional M42 check (FEATURE_CHECKIN=1)"
  Write-Host ""

  & $pack -To 41 -ComposeDir $ComposeDir -RepoDir $RepoDir -ApiService $ApiService -NoBuild:$NoBuild

  Write-StatusLine "=== M42 Optional Check ==="
  Dc -f $composeFile exec -T $ApiService sh -lc "cd /app/backend && node scripts/m42_optional_check.js"

  Write-Host ""
  Write-StatusLine "=== M42 OPTIONAL PACK PASS OK ==="
  Write-Host ""
}
finally {
  if ($null -eq $prevFeature) { Remove-Item Env:FEATURE_CHECKIN -ErrorAction SilentlyContinue } else { $env:FEATURE_CHECKIN = $prevFeature }
  if ($null -eq $prevDedupe) { Remove-Item Env:CHECKIN_DEDUPE_SEC -ErrorAction SilentlyContinue } else { $env:CHECKIN_DEDUPE_SEC = $prevDedupe }
}
