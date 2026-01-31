# gate.ps1
param(
  [ValidateRange(0,12)]
  [int]$To = 9,                  # M0..M$To

  # Repo-relative defaults (portable)
  [string]$ComposeDir = (Join-Path $PSScriptRoot "..\infra"),
  [string]$RepoDir    = (Join-Path $PSScriptRoot ".."),
  [string]$ApiService = "api",
  [int]$SleepSec = 8
)

$ErrorActionPreference = "Stop"

function Run($title, [scriptblock]$cmd) {
  Write-Host "`n=== $title ==="
  $global:LASTEXITCODE = 0
  & $cmd

  # cmdlet hataları
  if(-not $?) { throw "FAILED: $title" }

  # external exe exit code
  if($global:LASTEXITCODE -ne 0) {
    throw "FAILED: $title (exit=$global:LASTEXITCODE)"
  }
}

try {
  # Normalize/resolve (helps if called from different working dirs)
  $ComposeDir = (Resolve-Path $ComposeDir).Path
  $RepoDir    = (Resolve-Path $RepoDir).Path

  if(-not (Test-Path $ComposeDir)) { throw "ComposeDir not found: $ComposeDir" }
  Set-Location $ComposeDir

  Run "docker compose up (api)" {
    docker compose up -d --build $ApiService
  }

  # API container may need extra time for Prisma generate/db push before it starts listening.
  # Instead of a single sleep, retry /health for a short window.
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
  if (-not $healthOk) {
    throw "FAILED: health (exit=52)"
  }

  # M0..M9 her zaman listede
  $checks = @(
    @{ n = 0; name="M0"; cmd="node scripts/m0check.js" },
    @{ n = 1; name="M1"; cmd="node scripts/m1check.js" },
    @{ n = 2; name="M2"; cmd="node scripts/m2check.js" },
    @{ n = 3; name="M3"; cmd="node scripts/m3check.js" },
    @{ n = 4; name="M4"; cmd="node scripts/m4check.js" },
    @{ n = 5; name="M5"; cmd="node scripts/m5check.js" },
    @{ n = 6; name="M6"; cmd="node scripts/m6check.js" },
    @{ n = 7; name="M7"; cmd="node scripts/m7check.js" },
    @{ n = 8; name="M8"; cmd="node scripts/m8check.js" },
    @{ n = 9; name="M9"; cmd="node scripts/m9check.js" }
  )

  # M10..M12: sadece dosya varsa ekle (M9 tekrar eklenmesin diye10'den başlıyor)
  foreach($n in 10..12){
    $p = Join-Path $RepoDir ("backend\scripts\m{0}check.js" -f $n)
    if(Test-Path $p){
      $checks += @{ n = $n; name=("M{0}" -f $n); cmd=("node scripts/m{0}check.js" -f $n) }
    }
  }

  $runList = $checks | Where-Object { $_.n -le $To } | Sort-Object n

  foreach($c in $runList){
    Run $c.name {
      docker compose exec -T $ApiService sh -lc $c.cmd
    }
  }

  # Sonda: FULLCHECK sonra SMOKE (izolasyon daha iyi)
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
