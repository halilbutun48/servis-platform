param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpectedBuild = "",
  [int]$VehicleId = 1,
  [int]$SchoolId = 1,
  [int]$RouteId = 1,
  [switch]$VerboseOut
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
$OutDir = Join-Path $Artifacts ("verify_v2_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  if($null -eq $text){ $text = "" }
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

WriteUtf8NoBom (Join-Path $OutDir "ENV.txt") (
  "BASE=" + $BaseUrl + "`r`n" +
  "EXPECTED_BUILD=" + $ExpectedBuild + "`r`n" +
  "VEHICLE_ID=" + $VehicleId + "`r`n" +
  "SCHOOL_ID=" + $SchoolId + "`r`n" +
  "ROUTE_ID=" + $RouteId + "`r`n"
)

$v2Dir = Join-Path $Repo "tools\verify\v2"
if(-not (Test-Path $v2Dir)){
  Write-Host ("FAIL missing dir: " + $v2Dir) -ForegroundColor Red
  exit 1
}

$scripts = Get-ChildItem $v2Dir -File -Filter "*.ps1" | Sort-Object Name
if(-not $scripts){
  Write-Host ("FAIL no scripts under: " + $v2Dir) -ForegroundColor Red
  exit 1
}

$failed = $false

foreach($s in $scripts){
  $name = [IO.Path]::GetFileNameWithoutExtension($s.Name)
  $outPath = Join-Path $OutDir ($name + ".out.txt")

  $cmd = @("-NoProfile","-ExecutionPolicy","Bypass","-File",$s.FullName,"-BaseUrl",$BaseUrl)
  if($ExpectedBuild){ $cmd += @("-ExpectedBuild",$ExpectedBuild) }
  $cmd += @("-VehicleId",$VehicleId,"-SchoolId",$SchoolId,"-RouteId",$RouteId)

  Write-Host ("== " + $s.Name + " ==") -ForegroundColor Cyan
  $out = & powershell @cmd 2>&1 | Out-String
  WriteUtf8NoBom $outPath $out

  if($LASTEXITCODE -ne 0){
    Write-Host ("FAIL " + $s.Name + " (exit=" + $LASTEXITCODE + ")") -ForegroundColor Red
    $failed = $true
  } else {
    Write-Host ("PASS " + $s.Name) -ForegroundColor Green
  }
}

Write-Host ("DIR => " + $OutDir) -ForegroundColor Cyan
if($failed){ exit 1 } else { exit 0 }