param(
  [int]$HealthTimeoutSec = 30
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$healthUrl = "http://127.0.0.1:3000/health"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host ""
  Write-Host "=== $Label ==="
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

function Test-BackendHealth {
  try {
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -ne 200) { return $false }
    $json = $resp.Content | ConvertFrom-Json
    return [bool]$json.ok
  } catch {
    return $false
  }
}

function Wait-BackendHealth {
  param([int]$TimeoutSec)

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-BackendHealth) { return $true }
    Start-Sleep -Seconds 2
  }

  return $false
}

Push-Location $RepoRoot
try {
  Write-Host "Repo root: $RepoRoot"
  Write-Host "Health URL: $healthUrl"

  Invoke-Step -Label "verify:final" -Action { npm run verify:final }

  $previousBackupFallback = $env:BACKUP_ARCHIVE_ALLOW_PLACEHOLDER
  try {
    if ([string]::IsNullOrWhiteSpace($env:BACKUP_ARCHIVE_ALLOW_PLACEHOLDER)) {
      $env:BACKUP_ARCHIVE_ALLOW_PLACEHOLDER = "1"
    }
    Invoke-Step -Label "verify:milestones" -Action { npm run verify:milestones }
  } finally {
    if ($null -eq $previousBackupFallback) {
      Remove-Item Env:\BACKUP_ARCHIVE_ALLOW_PLACEHOLDER -ErrorAction SilentlyContinue
    } else {
      $env:BACKUP_ARCHIVE_ALLOW_PLACEHOLDER = $previousBackupFallback
    }
  }

  if (-not (Wait-BackendHealth -TimeoutSec $HealthTimeoutSec)) {
    throw "Backend health endpoint is not ready at $healthUrl. Start the API with: npm --prefix backend run dev"
  }

  Invoke-Step -Label "backend fullcheck" -Action { npm --prefix backend run fullcheck }

  Write-Host ""
  Write-Host "ALL CHECKS PASS"
} finally {
  Pop-Location
}
