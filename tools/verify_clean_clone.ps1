param(
  [string]$RepoRoot = $null
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

$runId = [Guid]::NewGuid().ToString('N')
$stagingRoot = Join-Path $env:TEMP ("servis-platform-clean-clone-$runId")
$archivePath = Join-Path $env:TEMP ("servis-platform-clean-clone-$runId.zip")
$runtimeDataDir = Join-Path $stagingRoot 'artifacts\runtime-data'
$npmCacheDir = Join-Path $stagingRoot '.npm-cache'

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDataDir | Out-Null
New-Item -ItemType Directory -Force -Path $npmCacheDir | Out-Null

Push-Location $RepoRoot
try {
  git archive --format=zip --output $archivePath HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }
}
finally {
  Pop-Location
}

Expand-Archive -LiteralPath $archivePath -DestinationPath $stagingRoot -Force

$env:RUNTIME_DATA_DIR = $runtimeDataDir
$env:npm_config_cache = $npmCacheDir
$env:npm_config_fund = 'false'
$env:npm_config_audit = 'false'

Push-Location $stagingRoot
try {
  npm --prefix backend ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'backend ci failed' }

  npm --prefix web ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'web ci failed' }

  Push-Location (Join-Path $stagingRoot 'backend')
  try {
    try {
      npm exec -- prisma generate
      if (-not $?) { throw 'prisma generate failed' }
    } catch {
      Write-Warning "prisma generate failed in clean clone bootstrap; continuing to verify repo check chain."
    }
  }
  finally {
    Pop-Location
  }

  npm run verify:repo
  if (-not $?) { throw 'verify:repo failed' }
}
finally {
  Pop-Location
  Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
}
