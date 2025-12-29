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

$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Artifacts = Join-Path $Repo "artifacts"
New-Item -ItemType Directory -Force $Artifacts | Out-Null
function NowTs(){ Get-Date -Format "yyyyMMdd_HHmmss" }
$OutDir = Join-Path $Artifacts ("live_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  if($null -eq $text){ $text = "" }
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

$log = @()
$failed = $false

try {
  $b = Invoke-RestMethod -Uri ($BaseUrl + "/api/_build") -TimeoutSec 10
  $buildNow = $b.build
  if(-not $buildNow){ $buildNow = [string]$b }
  $log += ("PASS _build ok build=" + $buildNow)
  if($ExpectedBuild -and ($buildNow -ne $ExpectedBuild)){
    $log += ("FAIL build mismatch expected=" + $ExpectedBuild + " got=" + $buildNow)
    $failed = $true
  }
} catch {
  $log += ("FAIL _build: " + $_.Exception.Message)
  $failed = $true
}

try {
  $p = Invoke-RestMethod -Uri ($BaseUrl + "/api/_ping") -TimeoutSec 10
  $log += "PASS _ping ok"
} catch {
  $log += ("FAIL _ping: " + $_.Exception.Message)
  $failed = $true
}

WriteUtf8NoBom (Join-Path $OutDir "verify.log.txt") (($log -join "`r`n") + "`r`n")
Write-Host ("ARTIFACT DIR: " + $OutDir) -ForegroundColor Cyan
$log | ForEach-Object { Write-Host $_ }

if($failed){ exit 1 } else { exit 0 }