param(
  [int]$HealthTimeoutSec = 30,
  [switch]$Deep
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

  Invoke-Step -Label "backend current surface pack" -Action { npm --prefix backend run current:surface }
  Invoke-Step -Label "backend fullcheck" -Action { npm --prefix backend run fullcheck }

  if ($Deep) {
    Write-Host ""
    Write-Host "=== deep surface diagnostic pack ==="

    $deepFailures = New-Object System.Collections.Generic.List[string]

    function Invoke-DeepStep {
      param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Action
      )

      Write-Host ""
      Write-Host "=== $Label ==="
      try {
        & $Action
        if ($LASTEXITCODE -ne 0) {
          throw "$Label failed with exit code $LASTEXITCODE"
        }
      } catch {
        Write-Host "FAIL $Label -> $($_.Exception.Message)"
        [void]$deepFailures.Add($Label)
      }
    }

    Invoke-DeepStep -Label "legacy surface: m37 school-parent e2e" -Action { node backend\scripts\m37check.js }
    Invoke-DeepStep -Label "legacy surface: m38 kvkk consent gate" -Action { node backend\scripts\m38check.js }
    Invoke-DeepStep -Label "legacy surface: m43 parent invite cleanup" -Action { node backend\scripts\m43_google_auth_invite_gate_check.js }

    $telematicsEnabled = $env:TELEMATICS_ENABLED
    if (-not [string]::IsNullOrWhiteSpace($telematicsEnabled) -and $telematicsEnabled -notin @("0", "false", "False")) {
      Invoke-DeepStep -Label "legacy surface: m44 telematics" -Action { node backend\scripts\m44_telematics_check.js }
    } else {
      Write-Host "SKIP legacy surface: m44 telematics disabled by TELEMATICS_ENABLED"
    }

    Invoke-DeepStep -Label "legacy surface: m45 retention + backup" -Action { node backend\scripts\m45_retention_backup_check.js }

    if ($deepFailures.Count -gt 0) {
      throw "Deep surface diagnostic pack failed: $($deepFailures -join ', ')"
    }
  }

  Write-Host ""
  Write-Host "ALL CHECKS PASS"
} finally {
  Pop-Location
}
