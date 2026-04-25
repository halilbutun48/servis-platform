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
$env:npm_config_update_notifier = 'false'
$env:NO_UPDATE_NOTIFIER = '1'

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/servis_platform_clean_clone?schema=public'
}

Push-Location $stagingRoot
try {
  npm --prefix backend ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'backend ci failed' }

  npm --prefix web ci --ignore-scripts --cache $npmCacheDir --no-audit --no-fund
  if (-not $?) { throw 'web ci failed' }

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
}
