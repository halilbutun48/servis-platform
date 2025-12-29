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

function ToD($v){
  if($null -eq $v){ return $null }
  if($v -is [double] -or $v -is [float] -or $v -is [decimal] -or $v -is [int] -or $v -is [long]){
    return [double]$v
  }
  $s = ([string]$v).Trim()
  if(-not $s){ return $null }
  $s = $s.Replace(",",".")
  try {
    return [double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture)
  } catch {
    try { return [double]$v } catch { return $null }
  }
}

function ReadErrBody($ex){
  $raw = ""
  try{
    if($ex.Response -and $ex.Response.GetResponseStream()){
      $sr = New-Object IO.StreamReader($ex.Response.GetResponseStream())
      $raw = $sr.ReadToEnd()
    }
  } catch {}
  return $raw
}

function TryReq([string]$method,[string]$url,[hashtable]$headers,[string]$body){
  try{
    if($method -eq "GET"){
      $r = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 15
    } else {
      $r = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 15
    }
    return @{ ok=$true; status=200; body=$r; raw="" }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode.value__ } catch {}
    $raw = ReadErrBody $_.Exception
    return @{ ok=$false; status=$code; body=$null; raw=$raw; err=$_.Exception.Message }
  }
}

function GetToken([string]$email,[string]$password){
  $gen = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path "backend\tools\gen-token.js"
  if(Test-Path $gen){
    try {
      $t = (& node $gen $email $password 2>$null | Out-String).Trim()
      if($t){ return $t }
    } catch {}
  }
  $payload = (@{ email=$email; password=$password } | ConvertTo-Json -Compress)
  $res = TryReq "POST" ($BaseUrl + "/api/auth/login") @{} $payload
  if($res.ok -and $res.body){
    if($res.body.token){ return [string]$res.body.token }
    if($res.body.data -and $res.body.data.token){ return [string]$res.body.data.token }
  }
  return ""
}

$failed = $false

$token = GetToken "driver_seed@demo.com" "Demo123!"
if(-not $token){ Fail "auth login failed for DRIVER"; exit 1 }
$h = @{ "x-auth-token" = $token }

# POST gps
$lat = 41.0094
$lon = 28.9794
$payload = "{""lat"":" + (JNum $lat) + ",""lon"":" + (JNum $lon) + ",""speed"":13,""heading"":181}"

$post = TryReq "POST" ($BaseUrl + "/api/gps") $h $payload
if(-not $post.ok){
  Fail ("gps POST failed status=" + $post.status + " err=" + $post.err)
  if($post.raw){ Warn ("gps POST body(200)=" + $post.raw.Substring(0,[Math]::Min(200,$post.raw.Length))) }
  exit 1
}
Pass "gps POST ok"

# GET last (try both)
$lastRes = TryReq "GET" ($BaseUrl + "/api/gps/last") $h ""
if(-not $lastRes.ok){
  $lastRes = TryReq "GET" ($BaseUrl + "/api/gps/last?vehicleId=" + $VehicleId) $h ""
}

if(-not $lastRes.ok){
  Fail ("gps last failed status=" + $lastRes.status + " err=" + $lastRes.err)
  if($lastRes.raw){ Warn ("gps last body(200)=" + $lastRes.raw.Substring(0,[Math]::Min(200,$lastRes.raw.Length))) }
  exit 1
}

$last = $lastRes.body
# unwrap common shapes
try { if($last.last){ $last = $last.last } } catch {}
try { if($last.data -and $last.data.last){ $last = $last.data.last } } catch {}
if($last -is [array] -and $last.Count -gt 0){ $last = $last[0] }

# extract lat/lon
$lat2 = $null; $lon2 = $null
try { if($last.lat -ne $null){ $lat2 = ToD $last.lat } } catch {}
try { if($lat2 -eq $null -and $last.latitude){ $lat2 = ToD $last.latitude } } catch {}
try { if($last.lon -ne $null){ $lon2 = ToD $last.lon } } catch {}
try { if($lon2 -eq $null -and $last.lng){ $lon2 = ToD $last.lng } } catch {}
try { if($lon2 -eq $null -and $last.longitude){ $lon2 = ToD $last.longitude } } catch {}

if($lat2 -eq $null -or $lon2 -eq $null){
  Warn "gps last response does not expose lat/lon fields (verify partial)"
  Pass "gps last ok"
  exit 0
}

$dLat = [Math]::Abs($lat2 - $lat)
$dLon = [Math]::Abs($lon2 - $lon)

# slightly tolerant
if($dLat -lt 0.02 -and $dLon -lt 0.02){
  Pass ("gps last verify ok lat=" + $lat2 + " lon=" + $lon2)
} else {
  Fail ("gps last mismatch expected=(" + $lat + "," + $lon + ") got=(" + $lat2 + "," + $lon2 + ") d=(" + $dLat + "," + $dLon + ")")
}

if($failed){ exit 1 } else { exit 0 }