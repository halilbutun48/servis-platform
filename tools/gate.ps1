# tools/gate.ps1
param(
  [ValidateRange(0,15)]
  [int]$To = 15,                 # ✅ default: M0..M15

  # Repo-relative defaults (portable)
  [string]$ComposeDir = (Join-Path $PSScriptRoot "..\infra"),
  [string]$RepoDir    = (Join-Path $PSScriptRoot ".."),
  [string]$ApiService = "api"
)

$ErrorActionPreference = "Stop"

function Run($title, [scriptblock]$cmd) {
  Write-Host "`n=== $title ==="
  $global:LASTEXITCODE = 0
  & $cmd

  if(-not $?) { throw "FAILED: $title" }
  if($global:LASTEXITCODE -ne 0) { throw "FAILED: $title (exit=$global:LASTEXITCODE)" }
}

try {
  # Resolve paths (works regardless of current working dir)
  $ComposeDir = (Resolve-Path $ComposeDir).Path
  $RepoDir    = (Resolve-Path $RepoDir).Path

  if(-not (Test-Path $ComposeDir)) { throw "ComposeDir not found: $ComposeDir" }
  if(-not (Test-Path $RepoDir))    { throw "RepoDir not found: $RepoDir" }

  Set-Location $ComposeDir

  Run "docker compose up (api)" {
    docker compose up -d --build $ApiService
  }

  # Wait for /health
  $healthOk = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $r = curl.exe -s http://127.0.0.1:3000/health
      if ($LASTEXITCODE -eq 0 -and $r) {
        $healthOk = $true
        Write-Host "=== health ===" -ForegroundColor Cyan
        $r | Out-Host
        break
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  if (-not $healthOk) { throw "FAILED: health (exit=52)" }

  # Milestone checks (M0..M15) — ✅ single source
  $checks = @(
    @{ n = 0;  name="M0";  cmd="node scripts/m0check.js"  },
    @{ n = 1;  name="M1";  cmd="node scripts/m1check.js"  },
    @{ n = 2;  name="M2";  cmd="node scripts/m2check.js"  },
    @{ n = 3;  name="M3";  cmd="node scripts/m3check.js"  },
    @{ n = 4;  name="M4";  cmd="node scripts/m4check.js"  },
    @{ n = 5;  name="M5";  cmd="node scripts/m5check.js"  },
    @{ n = 6;  name="M6";  cmd="node scripts/m6check.js"  },
    @{ n = 7;  name="M7";  cmd="node scripts/m7check.js"  },
    @{ n = 8;  name="M8";  cmd="node scripts/m8check.js"  },
    @{ n = 9;  name="M9";  cmd="node scripts/m9check.js"  },
    @{ n = 10; name="M10"; cmd="node scripts/m10check.js" },
    @{ n = 11; name="M11"; cmd="node scripts/m11check.js" },
    @{ n = 12; name="M12"; cmd="node scripts/m12check.js" },
    @{ n = 13; name="M13"; cmd="node scripts/m13check.js" },
    @{ n = 14; name="M14"; cmd="node scripts/m14check.js" },
    @{ n = 15; name="M15"; cmd="node scripts/m15check.js" }
  )

  # ✅ Only include checks that exist on host (defensive)
  $runList = @()
  foreach ($c in $checks | Where-Object { $_.n -le $To } | Sort-Object n) {
    $hostPath = Join-Path $RepoDir ("backend\scripts\m{0}check.js" -f $c.n)
    if (Test-Path $hostPath) {
      $runList += $c
    } else {
      Write-Host "ℹ️ skip $($c.name): file missing on host ($hostPath)" -ForegroundColor DarkYellow
    }
  }

  foreach ($c in $runList) {
    Run $c.name {
      docker compose exec -T $ApiService sh -lc $c.cmd
    }
  }

  # Sonda: FULLCHECK sonra SMOKE
  Run "FULLCHECK" {
    docker compose exec -T $ApiService sh -lc "node scripts/fullcheck.js"
  }

  Run "SMOKE" {
    docker compose exec -T $ApiService sh -lc "npm run smoke"
  }

  Write-Host "`n✅ GATE PASS (M0..M$To + FULLCHECK + SMOKE)"
  exit 0
}
catch {
  Write-Host "`n❌ GATE FAIL: $($_.Exception.Message)"
  exit 1
}
