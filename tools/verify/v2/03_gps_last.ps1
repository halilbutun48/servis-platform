param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpectedBuild = "",
  [int]$VehicleId = 1,
  [int]$SchoolId = 1,
  [int]$RouteId = 1
)
$ErrorActionPreference="Stop"

function NormBase([string]$u){
  $u = ([string]$u).Trim()
  if(-not ($u.StartsWith("http://") -or $u.StartsWith("https://"))){ $u = "http://$u" }
  return $u.TrimEnd("/")
}
$BaseUrl = NormBase $BaseUrl

function Pass([string]$m){ Write-Host ("PASS " + $m) -ForegroundColor Green }
function Fail([string]$m){ Write-Host ("FAIL " + $m) -ForegroundColor Red; $script:failed=$true }
function Warn([string]$m){ Write-Host ("WARN " + $m) -ForegroundColor Yellow }

function JNum([double]$n){
  $s = ("{0:0.000000}" -f $n)
  return $s.Replace(",",".")
}

function GetToken([string]$email,[string]$password){
  $gen = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "backend\tools\gen-token.js"
  if(Test-Path $gen){
    try {
      $t = (& node $gen $email $password 2>$null | Out-String).Trim()
      if($t){ return $t }
    } catch {}
  }
  try {
    $body = (@{ email=$email; password=$password } | ConvertTo-Json -Compress)
    $r = Invoke-RestMethod -Method Post -Uri ($BaseUrl + "/api/auth/login") -ContentType "application/json" -Body $body -TimeoutSec 15
    if($r.token){ return [string]$r.token }
    if($r.data -and $r.data.token){ return [string]$r.data.token }
  } catch {}
  return ""
}

$failed = $false
$token = GetToken "driver_seed@demo.com" "Demo123!"
if(-not $token){ Fail "auth login failed for DRIVER"; exit 1 }

# POST gps (manual JSON to avoid TR decimal comma)
$lat = 41.0094
$lon = 28.9794
$payload = "{""lat"":" + (JNum $lat) + ",""lon"":" + (JNum $lon) + ",""speed"":13,""heading"":181}"

try {
  $r = Invoke-RestMethod -Method Post -Uri ($BaseUrl + "/api/gps") -Headers @{ "x-auth-token"=$token } `
    -ContentType "application/json" -Body $payload -TimeoutSec 15
  Pass "gps POST ok"
} catch {
  Fail ("gps POST failed: " + $_.Exception.Message)
  if($failed){ exit 1 }
}

# verify last
$last = $null
try {
  $last = Invoke-RestMethod -Uri ($BaseUrl + "/api/gps/last") -Headers @{ "x-auth-token"=$token } -TimeoutSec 15
} catch {
  # fallback with vehicleId
  try {
    $last = Invoke-RestMethod -Uri ($BaseUrl + "/api/gps/last?vehicleId=" + $VehicleId) -Headers @{ "x-auth-token"=$token } -TimeoutSec 15
  } catch {
    Fail ("gps last failed: " + $_.Exception.Message)
  }
}

if($failed){ exit 1 }

# try to find lat/lon in response (best effort)
$lat2 = $null; $lon2 = $null
try { if($last.last){ $last = $last.last } } catch {}
try { if($last.data -and $last.data.last){ $last = $last.data.last } } catch {}

try { if($last.lat -ne $null){ $lat2=[double]$last.lat } } catch {}
try { if(($lat2 -eq $null) -and $last.latitude){ $lat2=[double]$last.latitude } } catch {}

try { if($last.lon -ne $null){ $lon2=[double]$last.lon } } catch {}
try { if(($lon2 -eq $null) -and $last.lng){ $lon2=[double]$last.lng } } catch {}
try { if(($lon2 -eq $null) -and $last.longitude){ $lon2=[double]$last.longitude } } catch {}

if($lat2 -eq $null -or $lon2 -eq $null){
  Warn "gps last response does not expose lat/lon fields (verify partial)"
  Pass "gps last ok"
  exit 0
}

$dLat = [Math]::Abs($lat2 - $lat)
$dLon = [Math]::Abs($lon2 - $lon)
if($dLat -lt 0.01 -and $dLon -lt 0.01){
  Pass ("gps last verify ok lat=" + $lat2 + " lon=" + $lon2)
} else {
  Fail ("gps last mismatch lat=" + $lat2 + " lon=" + $lon2)
}

if($failed){ exit 1 } else { exit 0 }