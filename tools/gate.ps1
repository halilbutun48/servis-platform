param(
  [int]$To = 5,                 # o ana kadar kaçıncı milestone'a kadar koşulsun (M0..M$To)
  [string]$ComposeDir = "D:\personel-servis-v1\infra",
  [string]$RepoDir    = "D:\personel-servis-v1",
  [string]$ApiService = "api",
  [int]$SleepSec = 8
)

$ErrorActionPreference = "Stop"

function Run($title, $cmd) {
  Write-Host "`n=== $title ==="
  & $cmd
}

Set-Location $ComposeDir

Run "docker compose up (api)" { docker compose up -d --build $ApiService }
Start-Sleep -Seconds $SleepSec

Run "health" { curl.exe -s http://127.0.0.1:3000/health | Out-Host }

# Mevcut check'ler (M0..M5)
$checks = @(
  @{ n = 0; name="M0"; cmd="node scripts/m0check.js" },
  @{ n = 1; name="M1"; cmd="node scripts/m1check.js" },
  @{ n = 2; name="M2"; cmd="node scripts/m2check.js" },
  @{ n = 3; name="M3"; cmd="node scripts/m3check.js" },
  @{ n = 4; name="M4"; cmd="node scripts/m4check.js" },
  @{ n = 5; name="M5"; cmd="node scripts/m5check.js" }
)

# İleride ekleyeceklerimiz için yer tutucu: m6check.js ... m12check.js
foreach($n in 6..12){
  $p = Join-Path $RepoDir ("backend\scripts\m{0}check.js" -f $n)
  if(Test-Path $p){
    $checks += @{ n = $n; name=("M{0}" -f $n); cmd=("node scripts/m{0}check.js" -f $n) }
  }
}

# Seçilen milestone'a kadar çalıştır
$runList = $checks | Where-Object { $_.n -le $To } | Sort-Object n
foreach($c in $runList){
  Run $c.name { docker compose exec -T $ApiService sh -lc $c.cmd }
}

# Her zaman en sonda: smoke + fullcheck
Run "SMOKE"    { docker compose exec -T $ApiService sh -lc "npm run smoke" }
Run "FULLCHECK"{ docker compose exec -T $ApiService sh -lc "node scripts/fullcheck.js" }

Write-Host "`n✅ GATE PASS (M0..M$To + SMOKE + FULLCHECK)"
