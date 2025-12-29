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
  try { return [double]::Parse($s, [Globalization.CultureInfo]::InvariantCulture) } catch { return $null }
}

function ToDt($v){
  if($null -eq $v){ return $null }
  try { return [DateTime]::Parse([string]$v, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal) } catch {}
  try { return [DateTime]$v } catch {}
  return $null
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

function UnwrapLast($obj){
  if($null -eq $obj){ return $null }
  try { if($obj.last){ return $obj.last } } catch {}
  try { if($obj.data -and $obj.data.last){ return $obj.data.last } } catch {}
  return $obj
}

function Pick($obj,[string[]]$keys){
  foreach($k in $keys){
    try{
      if($obj -and ($obj.PSObject.Properties.Name -contains $k)){
        $v = $obj.$k
        if($v -ne $null -and "$v" -ne ""){ return $v }
      }
    } catch {}
  }
  return $null
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

# Extract vehicleId + recordedAt from POST response if available
$postLast = UnwrapLast $post.body
$postVehicleId = $null
try { $v = Pick $postLast @("vehicleId","vehicle_id"); if($v -ne $null){ $postVehicleId = [int]$v } } catch {}
if(-not $postVehicleId){ $postVehicleId = $VehicleId }

$postRecordedAt = $null
try { $t = Pick $postLast @("recordedAt","createdAt","ts","time"); if($t){ $postRecordedAt = ToDt $t } } catch {}

# Poll /api/gps/last until it reflects our POST (or timeout)
$maxTry = 12
$ok = $false
$last = $null

for($i=1; $i -le $maxTry; $i++){
  $res = TryReq "GET" ($BaseUrl + "/api/gps/last") $h ""
  if(-not $res.ok){
    $res = TryReq "GET" ($BaseUrl + "/api/gps/last?vehicleId=" + $postVehicleId) $h ""
  }
  if($res.ok){
    $last = UnwrapLast $res.body
    if($last -is [array] -and $last.Count -gt 0){ $last = $last[0] }

    $lat2 = ToD (Pick $last @("lat","latitude"))
    $lon2 = ToD (Pick $last @("lon","lng","longitude"))
    $t2   = ToDt (Pick $last @("recordedAt","createdAt","ts","time"))

    if($lat2 -ne $null -and $lon2 -ne $null){
      $dLat = [Math]::Abs($lat2 - $lat)
      $dLon = [Math]::Abs($lon2 - $lon)

      $timeOk = $true
      if($postRecordedAt -and $t2){
        # allow small skew
        $timeOk = ($t2 -ge $postRecordedAt.AddSeconds(-10))
      }

      if($dLat -lt 0.02 -and $dLon -lt 0.02 -and $timeOk){
        Pass ("gps last verify ok try=" + $i + " lat=" + $lat2 + " lon=" + $lon2)
        $ok = $true
        break
      }
    }
  }

  Start-Sleep -Seconds 1
}

if(-not $ok){
  # final diagnostics
  if($last){
    $latX = Pick $last @("lat","latitude")
    $lonX = Pick $last @("lon","lng","longitude")
    $tX   = Pick $last @("recordedAt","createdAt","ts","time")
    Fail ("gps last did not converge after " + $maxTry + " tries. last.lat=" + $latX + " last.lon=" + $lonX + " last.time=" + $tX)
  } else {
    Fail ("gps last failed: no usable response after " + $maxTry + " tries")
  }
}

if($failed){ exit 1 } else { exit 0 }