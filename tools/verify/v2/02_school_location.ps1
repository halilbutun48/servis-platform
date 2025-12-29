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

function ExtractSchool($resp){
  if($null -eq $resp){ return $null }
  if($resp.school){ return $resp.school }
  if($resp.data -and $resp.data.school){ return $resp.data.school }
  if($resp.me -and $resp.me.school){ return $resp.me.school }
  return $resp
}

function PickNum($obj,[string[]]$keys){
  foreach($k in $keys){
    try{
      if($obj -and ($obj.PSObject.Properties.Name -contains $k)){
        $v = $obj.$k
        if($v -ne $null -and "$v" -ne ""){ return [double]$v }
      }
    } catch {}
  }
  return $null
}

function JNum([double]$n){
  # invariant-ish: ensure dot
  $s = ("{0:0.000000}" -f $n)
  return $s.Replace(",",".")
}

$failed = $false

$token = GetToken "school_admin@demo.com" "Demo123!"
if(-not $token){ Fail "auth login failed for SCHOOL_ADMIN"; if($failed){ exit 1 } }

# 1) school/me
$me = $null
try { $me = Invoke-RestMethod -Uri ($BaseUrl + "/api/school/me") -Headers @{ "x-auth-token"=$token } -TimeoutSec 15 }
catch { Fail ("/api/school/me failed: " + $_.Exception.Message) }

if($failed){ exit 1 }

$school = ExtractSchool $me
if(-not $school){ Fail "cannot extract school object from /api/school/me"; exit 1 }

$sid = $null
try { if($school.id){ $sid = [int]$school.id } } catch {}
try { if(-not $sid -and $school.schoolId){ $sid = [int]$school.schoolId } } catch {}
if(-not $sid){ $sid = $SchoolId }
if(-not $sid){ Fail "schoolId missing"; exit 1 }

# 2) read current lat/lon if present
$curLat = $null; $curLon = $null

# direct fields
$curLat = PickNum $school @("lat","latitude","locationLat","latDeg")
$curLon = PickNum $school @("lon","lng","longitude","locationLon","lonDeg")

# nested location
if(($curLat -eq $null -or $curLon -eq $null) -and ($school.location)){
  $curLat = PickNum $school.location @("lat","latitude")
  $curLon = PickNum $school.location @("lon","lng","longitude")
}

if($curLat -eq $null -or $curLon -eq $null){
  Warn "current location not found on /api/school/me; will still try PUT+verify via /api/school/me"
  # pick a sane default (Istanbul-ish)
  $curLat = 41.0082
  $curLon = 28.9784
}

# 3) set new location (small delta)
$newLat = $curLat + 0.0003
$newLon = $curLon + 0.0003

$payload = "{""lat"":" + (JNum $newLat) + ",""lon"":" + (JNum $newLon) + "}"

try {
  Invoke-RestMethod -Method Put -Uri ($BaseUrl + "/api/school/" + $sid + "/location") `
    -Headers @{ "x-auth-token"=$token } -ContentType "application/json" -Body $payload -TimeoutSec 15 | Out-Null
  Pass ("location PUT ok schoolId=" + $sid)
} catch {
  Fail ("location PUT failed: " + $_.Exception.Message)
  if($failed){ exit 1 }
}

# 4) verify by reading school/me again
$me2 = $null
try { $me2 = Invoke-RestMethod -Uri ($BaseUrl + "/api/school/me") -Headers @{ "x-auth-token"=$token } -TimeoutSec 15 }
catch { Fail ("/api/school/me (after PUT) failed: " + $_.Exception.Message) }

if($failed){ exit 1 }

$school2 = ExtractSchool $me2
$lat2 = PickNum $school2 @("lat","latitude","locationLat","latDeg")
$lon2 = PickNum $school2 @("lon","lng","longitude","locationLon","lonDeg")
if(($lat2 -eq $null -or $lon2 -eq $null) -and ($school2.location)){
  $lat2 = PickNum $school2.location @("lat","latitude")
  $lon2 = PickNum $school2.location @("lon","lng","longitude")
}

if($lat2 -eq $null -or $lon2 -eq $null){
  Warn "verify skipped: school/me does not return location fields"
} else {
  $dLat = [Math]::Abs($lat2 - $newLat)
  $dLon = [Math]::Abs($lon2 - $newLon)
  if($dLat -lt 0.001 -and $dLon -lt 0.001){
    Pass ("location verify ok lat=" + $lat2 + " lon=" + $lon2)
  } else {
    Fail ("location verify mismatch lat=" + $lat2 + " lon=" + $lon2)
  }
}

# 5) restore old location (best effort)
$restore = "{""lat"":" + (JNum $curLat) + ",""lon"":" + (JNum $curLon) + "}"
try {
  Invoke-RestMethod -Method Put -Uri ($BaseUrl + "/api/school/" + $sid + "/location") `
    -Headers @{ "x-auth-token"=$token } -ContentType "application/json" -Body $restore -TimeoutSec 15 | Out-Null
  Pass "location restored"
} catch {
  Warn ("restore failed (non-fatal): " + $_.Exception.Message)
}

if($failed){ exit 1 } else { exit 0 }