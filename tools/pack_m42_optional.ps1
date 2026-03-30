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
$composeFile = Join-Path (Join-Path $repo $ComposeDir) "docker-compose.yml"

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

function Wait-ApiHealth {
  param(
    [string]$Url = "http://127.0.0.1:3000/health",
    [int]$MaxSeconds = 60
  )

  Write-StatusLine "INFO waiting for api health on $Url"
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 3 -UseBasicParsing
      if ($resp.StatusCode -eq 200) { return }
    } catch {
      Start-Sleep -Seconds 1
      continue
    }
    Start-Sleep -Seconds 1
  }
  throw "API health timeout on $Url"
}

$prevDedupe = $env:CHECKIN_DEDUPE_SEC

try {
  if (-not $env:CHECKIN_DEDUPE_SEC) { $env:CHECKIN_DEDUPE_SEC = "60" }

  Write-Host ""
  Write-StatusLine "=== M42 OPTIONAL PACK ==="
  Write-StatusLine "INFO Mode: always-on optional check-in baseline"
  Write-Host ""

  $upArgs = @('-f', $composeFile, 'up', '-d', '--force-recreate')
  if ($NoBuild) { $upArgs += '--no-build' }
  $upArgs += $ApiService
  Dc @upArgs

  Wait-ApiHealth

  Write-StatusLine "=== M42 Optional Check ==="
  Dc -f $composeFile exec -T $ApiService sh -lc "cd /app/backend && CHECKIN_DEDUPE_SEC=$($env:CHECKIN_DEDUPE_SEC) node scripts/m42_optional_check.js"

  Write-Host ""
  Write-StatusLine "=== M42 OPTIONAL PACK PASS OK ==="
  Write-Host ""
}
finally {
  if ($null -eq $prevDedupe) { Remove-Item Env:CHECKIN_DEDUPE_SEC -ErrorAction SilentlyContinue } else { $env:CHECKIN_DEDUPE_SEC = $prevDedupe }
}
