$ErrorActionPreference = "Stop"

function Pass($msg){ Write-Host ("PASS  " + $msg) -ForegroundColor Green }
function Fail($msg){ Write-Host ("FAIL  " + $msg) -ForegroundColor Red; throw $msg }

function Get-JwtFromEnv {
  $raw = $env:SERVIS_TOKEN
  if (-not $raw) { return $null }

  # Env bazen multi-line / log karışık olabiliyor: sadece JWT'yi ayıkla
  $m = [regex]::Match($raw, 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
  if ($m.Success) { return $m.Value }

  # fallback: whitespace temizle
  return (($raw -replace '\s+','').Trim('"'))
}

# --- Docker / Postgres ---
$pg = docker ps -a --filter "name=servis_postgres" --format "{{.Status}}"
if ($pg -match "^Up") { Pass "Docker container servis_postgres UP" } else { Fail "Docker container servis_postgres DOWN" }

$ready = docker exec servis_postgres pg_isready -U postgres -d servisdb 2>$null
if ($ready -match "accepting connections") { Pass "Postgres pg_isready OK" } else { Fail "Postgres pg_isready FAIL" }

# --- Ports ---
$ls3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ls3000) { Pass "Port 3000 LISTEN" } else { Fail "Port 3000 NOT LISTEN" }

$ls5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ls5173) { Pass "Port 5173 LISTEN" } else { Fail "Port 5173 NOT LISTEN" }

# --- Public endpoints ---
$r = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/_ping" -TimeoutSec 6
if ($r.ok) { Pass "GET BE /_ping" } else { Fail "GET BE /_ping (ok=false)" }

$beBuild = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/_build" -TimeoutSec 6
if ($beBuild.ok) { Pass "GET BE /_build" } else { Fail "GET BE /_build (ok=false)" }

$webBuild = Invoke-RestMethod -Uri "http://127.0.0.1:5173/api/_build" -TimeoutSec 6
if ($webBuild.ok) { Pass "GET WEB proxy /_build" } else { Fail "GET WEB proxy /_build (ok=false)" }

if ($beBuild.build -eq $webBuild.build) { Pass "Build match ($($beBuild.build))" } else { Fail "Build mismatch (BE=$($beBuild.build) WEB=$($webBuild.build))" }

$gps = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/gps/last?vehicleId=1" -TimeoutSec 6
if ($gps.ok) { Pass "GET BE gps last (vehicleId=1)" } else { Fail "GET BE gps last (ok=false)" }

# --- Auth endpoints ---
$jwt = Get-JwtFromEnv
if (-not $jwt) { Fail "SERVIS_TOKEN yok (set et: `$env:SERVIS_TOKEN = <JWT>)" }

if (($jwt.Split('.').Count) -ne 3) { Fail "SERVIS_TOKEN JWT degil (parts=$($jwt.Split('.').Count))" }

$h = @{ "x-auth-token" = $jwt }

$me = Invoke-RestMethod -Headers $h -Uri "http://127.0.0.1:3000/api/me" -TimeoutSec 6
if ($me.ok) { Pass "GET AUTH /me" } else { Fail "GET AUTH /me (ok=false)" }

Pass "FULLCHECK: ALL GREEN"
