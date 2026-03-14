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
$repoContract = Join-Path $repo "tools/check_step06_repo_contract.ps1"
$composeFile = Join-Path (Join-Path $repo $ComposeDir) "docker-compose.yml"

if (-not (Test-Path $pack)) { throw "pack.ps1 not found: $pack" }
if (-not (Test-Path $repoContract)) { throw "repo contract script not found: $repoContract" }
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

Write-Host ""
Write-StatusLine "=== STEP 0.6 STABIL PACK ==="
Write-StatusLine "INFO Mode: base M41 pack + Step 0.6 runtime mini-check + repo contract smoke"
Write-Host ""

& $pack -To 41 -ComposeDir $ComposeDir -RepoDir $RepoDir -ApiService $ApiService -NoBuild:$NoBuild

Write-StatusLine "=== Step 0.6 Runtime Mini-Check ==="
Dc -f $composeFile exec -T $ApiService sh -lc "cd /app/backend && node scripts/step06_stabil_check.js"

Write-StatusLine "=== Step 0.6 Repo Contract ==="
& $repoContract -RepoRoot $RepoDir

Write-Host ""
Write-StatusLine "=== STEP 0.6 STABIL PACK PASS OK ==="
Write-Host ""

