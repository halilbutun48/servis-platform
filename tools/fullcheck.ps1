$ErrorActionPreference = "Stop"

function Pass([string]$m){ Write-Host ("PASS  " + $m) -ForegroundColor Green }
function Fail([string]$m){ Write-Host ("FAIL  " + $m) -ForegroundColor Red; throw $m }

function Test-Listener([int]$port){
  $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return [bool]$c
}

function Get-Json([string]$url, [hashtable]$headers=@{}){
  return Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 10
}

function Get-BuildId($x){
  if ($null -eq $x) { return "" }
  if ($x -is [string]) { return $x.Trim() }
  if ($x.PSObject.Properties.Name -contains "buildId") { return [string]$x.buildId }
  if ($x.PSObject.Properties.Name -contains "build")   { return [string]$x.build }
  if ($x.PSObject.Properties.Name -contains "id")      { return [string]$x.id }
  return ($x | ConvertTo-Json -Compress)
}

$root = Split-Path -Parent $PSScriptRoot

# Docker container check
$names = docker ps --format "{{.Names}}" 2>$null
if ($LASTEXITCODE -ne 0) { Fail "Docker not available" }
if ($names -match "(?m)^servis_postgres$") { Pass "Docker container servis_postgres UP" } else { Fail "Docker container servis_postgres DOWN" }

# Postgres ready
docker exec servis_postgres pg_isready -U postgres 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Pass "Postgres pg_isready OK" } else { Fail "Postgres pg_isready FAIL" }

# Ports
if (Test-Listener 3000) { Pass "Port 3000 LISTEN" } else { Fail "Port 3000 not listening" }
if (Test-Listener 5173) { Pass "Port 5173 LISTEN" } else { Fail "Port 5173 not listening" }

$be  = "http://localhost:3000"
$web = "http://localhost:5173"

# Basic endpoints
Get-Json "$be/api/_ping" | Out-Null
Pass "GET BE /api/_ping"

$beBuildObj  = Get-Json "$be/api/_build"
Pass "GET BE /api/_build"

$webBuildObj = Get-Json "$web/api/_build"
Pass "GET WEB proxy /api/_build"

$beBuild  = Get-BuildId $beBuildObj
$webBuild = Get-BuildId $webBuildObj
if ($beBuild -and $webBuild -and ($beBuild -eq $webBuild)) {
  Pass ("Build match (" + $beBuild + ")")
} else {
  Fail ("Build mismatch: BE=" + $beBuild + " WEB=" + $webBuild)
}

# GPS last (vehicleId=1)
$gpsOk = $false
try {
  Get-Json "$be/api/gps/last?vehicleId=1" | Out-Null
  $gpsOk = $true
} catch {
  try {
    Get-Json "$be/api/gps/latest?vehicleId=1" | Out-Null
    $gpsOk = $true
  } catch {
    $gpsOk = $false
  }
}
if ($gpsOk) { Pass "GET BE gps last (vehicleId=1)" } else { Fail "GET BE gps last failed" }

# Auth /me
$raw = $env:SERVIS_TOKEN
if (-not $raw) { Fail "SERVIS_TOKEN missing (set: `$env:SERVIS_TOKEN = <JWT>)" }

# extract JWT even if wrapped like <...>
$m = [regex]::Match($raw, 'eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+')
if (-not $m.Success) { Fail "SERVIS_TOKEN invalid (no JWT found)" }

$token = $m.Value
$headers = @{ "x-auth-token" = $token }

Get-Json "$be/api/me" $headers | Out-Null
Pass "GET AUTH /me"

# --- Artifact check (bak/patch/dump etc) ---
$art = Join-Path -Path $root -ChildPath "tools\snap-move-artifacts.ps1"
if (-not (Test-Path $art)) { Fail "snap-move-artifacts.ps1 missing (tools\snap-move-artifacts.ps1)" }

powershell -NoProfile -ExecutionPolicy Bypass -File $art -DryRun -FailIfFound
if ($LASTEXITCODE -ne 0) {
  throw "ARTIFACT CHECK FAIL (run: powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\snap-move-artifacts.ps1)"
}
Pass "ARTIFACT CHECK: OK"

# --- Encoding check ---
$enc = Join-Path -Path $root -ChildPath "tools\encoding-check.ps1"
if (-not (Test-Path $enc)) { Fail "encoding-check.ps1 missing (tools\encoding-check.ps1)" }

powershell -NoProfile -ExecutionPolicy Bypass -File $enc
if ($LASTEXITCODE -ne 0) { throw "ENCODING CHECK FAIL" }
Pass "ENCODING CHECK: PASS"

Pass "FULLCHECK: ALL GREEN"
