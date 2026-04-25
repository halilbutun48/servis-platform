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
$tempDir = Join-Path $stagingRoot '.temp'

$previousTemp = $env:TEMP
$previousTmp = $env:TMP
$previousNpmCache = $env:npm_config_cache
$previousNpmFund = $env:npm_config_fund
$previousNpmAudit = $env:npm_config_audit
$previousNpmNotifier = $env:npm_config_update_notifier
$previousNoUpdateNotifier = $env:NO_UPDATE_NOTIFIER
$previousDatabaseUrl = $env:DATABASE_URL
$previousRuntimeDataDir = $env:RUNTIME_DATA_DIR

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDataDir | Out-Null
New-Item -ItemType Directory -Force -Path $npmCacheDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:npm_config_cache = $npmCacheDir
$env:npm_config_fund = 'false'
$env:npm_config_audit = 'false'
$env:npm_config_update_notifier = 'false'
$env:NO_UPDATE_NOTIFIER = '1'
$env:RUNTIME_DATA_DIR = $runtimeDataDir

Push-Location $RepoRoot
try {
  git archive --format=zip --output $archivePath HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }
}
finally {
  Pop-Location
}

Expand-Archive -LiteralPath $archivePath -DestinationPath $stagingRoot -Force

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/servis_platform_clean_clone?schema=public'
}

Push-Location $stagingRoot
try {
  npm --prefix backend ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'backend ci failed' }

  npm --prefix web ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'web ci failed' }

  $espreePath = Join-Path $stagingRoot 'web\node_modules\espree\dist\espree.cjs'
  if (-not (Test-Path -LiteralPath $espreePath)) {
    throw 'bootstrap dependency missing: web/node_modules/espree/dist/espree.cjs. Run npm --prefix web ci before verify:repo.'
  }

  Push-Location (Join-Path $stagingRoot 'backend')
  try {
    try {
      $prismaCli = Join-Path $PWD 'node_modules\prisma\build\index.js'
      $prismaStdout = Join-Path $stagingRoot 'prisma-generate.stdout.log'
      $prismaStderr = Join-Path $stagingRoot 'prisma-generate.stderr.log'
      if (Test-Path $prismaCli) {
        & node $prismaCli generate 1> $prismaStdout 2> $prismaStderr
      } else {
        & npm exec -- prisma generate 1> $prismaStdout 2> $prismaStderr
      }
      $prismaExitCode = $LASTEXITCODE

      if (Test-Path -LiteralPath $prismaStdout) {
        $prismaStdoutText = Get-Content -LiteralPath $prismaStdout -Raw
        if ($prismaStdoutText) {
          Write-Host $prismaStdoutText -NoNewline
        }
      }

      $prismaStderrText = ''
      if (Test-Path -LiteralPath $prismaStderr) {
        $prismaStderrText = Get-Content -LiteralPath $prismaStderr -Raw
      }

      if ($prismaExitCode -ne 0) {
        if ($prismaStderrText) {
          Write-Host $prismaStderrText -NoNewline
        }
        throw 'prisma generate failed'
      }

      if ($prismaStderrText) {
        $filteredPrismaStderr = @(
          $prismaStderrText -split "`r?`n" |
            Where-Object { $_ -and $_ -notmatch 'spawn EPERM' }
        )

        if ($filteredPrismaStderr.Count -gt 0) {
          foreach ($line in $filteredPrismaStderr) {
            Write-Host $line
          }
        }
      }
    } catch {
      if ($env:CLEAN_CLONE_VERBOSE -eq '1') {
        Write-Verbose "prisma generate best-effort step failed in clean clone bootstrap; continuing to verify repo check chain."
      }
    }
  }
  finally {
    Pop-Location
  }

  $repoCheckStdout = Join-Path $stagingRoot 'repo-check.stdout.log'
  $repoCheckStderr = Join-Path $stagingRoot 'repo-check.stderr.log'
  & node backend/scripts/run_repo_check_chain.js --phase all 1> $repoCheckStdout 2> $repoCheckStderr
  $repoCheckExitCode = $LASTEXITCODE

  if (Test-Path -LiteralPath $repoCheckStdout) {
    $repoCheckStdoutText = Get-Content -LiteralPath $repoCheckStdout -Raw
    if ($repoCheckStdoutText) {
      Write-Host $repoCheckStdoutText -NoNewline
    }
  }

  $repoCheckStderrText = ''
  if (Test-Path -LiteralPath $repoCheckStderr) {
    $repoCheckStderrText = Get-Content -LiteralPath $repoCheckStderr -Raw
  }

  if ($repoCheckExitCode -ne 0) {
    if ($repoCheckStderrText) {
      Write-Host $repoCheckStderrText -NoNewline
    }
    throw 'verify:repo failed'
  }

  if ($repoCheckStderrText) {
    $filteredStderr = @(
      $repoCheckStderrText -split "`r?`n" |
        Where-Object { $_ -and $_ -notmatch 'spawn EPERM' }
    )

    if ($filteredStderr.Count -gt 0) {
      foreach ($line in $filteredStderr) {
        Write-Host $line
      }
    }
  }
}
finally {
  Pop-Location
  Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
  if ($null -eq $previousTemp) { Remove-Item Env:\TEMP -ErrorAction SilentlyContinue } else { $env:TEMP = $previousTemp }
  if ($null -eq $previousTmp) { Remove-Item Env:\TMP -ErrorAction SilentlyContinue } else { $env:TMP = $previousTmp }
  if ($null -eq $previousNpmCache) { Remove-Item Env:\npm_config_cache -ErrorAction SilentlyContinue } else { $env:npm_config_cache = $previousNpmCache }
  if ($null -eq $previousNpmFund) { Remove-Item Env:\npm_config_fund -ErrorAction SilentlyContinue } else { $env:npm_config_fund = $previousNpmFund }
  if ($null -eq $previousNpmAudit) { Remove-Item Env:\npm_config_audit -ErrorAction SilentlyContinue } else { $env:npm_config_audit = $previousNpmAudit }
  if ($null -eq $previousNpmNotifier) { Remove-Item Env:\npm_config_update_notifier -ErrorAction SilentlyContinue } else { $env:npm_config_update_notifier = $previousNpmNotifier }
  if ($null -eq $previousNoUpdateNotifier) { Remove-Item Env:\NO_UPDATE_NOTIFIER -ErrorAction SilentlyContinue } else { $env:NO_UPDATE_NOTIFIER = $previousNoUpdateNotifier }
  if ($null -eq $previousDatabaseUrl) { Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue } else { $env:DATABASE_URL = $previousDatabaseUrl }
  if ($null -eq $previousRuntimeDataDir) { Remove-Item Env:\RUNTIME_DATA_DIR -ErrorAction SilentlyContinue } else { $env:RUNTIME_DATA_DIR = $previousRuntimeDataDir }
}
