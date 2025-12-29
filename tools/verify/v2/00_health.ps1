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

$failed = $false

try {
  $b = Invoke-RestMethod -Uri ($BaseUrl + "/api/_build") -TimeoutSec 10
  $buildNow = $b.build
  if(-not $buildNow){ $buildNow = [string]$b }
  Write-Host ("PASS _build ok build=" + $buildNow)
  if($ExpectedBuild -and ($buildNow -ne $ExpectedBuild)){
    Write-Host ("FAIL build mismatch expected=" + $ExpectedBuild + " got=" + $buildNow) -ForegroundColor Red
    $failed = $true
  }
} catch {
  Write-Host ("FAIL _build: " + $_.Exception.Message) -ForegroundColor Red
  $failed = $true
}

try {
  Invoke-RestMethod -Uri ($BaseUrl + "/api/_ping") -TimeoutSec 10 | Out-Null
  Write-Host "PASS _ping ok"
} catch {
  Write-Host ("FAIL _ping: " + $_.Exception.Message) -ForegroundColor Red
  $failed = $true
}

# optional _routes (varsa kontrol et, yoksa WARN)
try {
  $r = Invoke-RestMethod -Uri ($BaseUrl + "/api/_routes") -TimeoutSec 10
  if($r -and $r.count){
    Write-Host ("PASS _routes ok count=" + $r.count)
  } else {
    Write-Host "WARN _routes returned empty (skipped)"
  }
} catch {
  Write-Host "WARN _routes missing (skipped)"
}

if($failed){ exit 1 } else { exit 0 }