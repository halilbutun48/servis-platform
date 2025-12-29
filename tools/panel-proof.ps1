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
$OutDir = Join-Path $Artifacts ("proof_" + (NowTs))
New-Item -ItemType Directory -Force $OutDir | Out-Null

function WriteUtf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  if($null -eq $text){ $text = "" }
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

$logPath = Join-Path $OutDir "verify.log.txt"
$log = @()
$failed = $false

# Try to run an existing panel verifier if present; else do minimal proof.
$candidates = @(
  (Join-Path $Repo "tools\verify-panels.ps1"),
  (Join-Path $Repo "tools\panel-smoke.ps1"),
  (Join-Path $Repo "tools\smoke.ps1")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if($candidates){
  $log += ("INFO using verifier: " + $candidates)
  $out = & powershell -NoProfile -ExecutionPolicy Bypass -File $candidates -BaseUrl $BaseUrl -ExpectedBuild $ExpectedBuild 2>&1 | Out-String
  $log += $out
  if($LASTEXITCODE -ne 0){ $failed = $true }
} else {
  $log += "WARN no panel verifier found; running minimal checks"
  try { Invoke-RestMethod -Uri ($BaseUrl + "/api/_build") -TimeoutSec 10 | Out-Null; $log += "PASS _build ok" } catch { $log += ("FAIL _build: " + $_.Exception.Message); $failed=$true }
  try { Invoke-RestMethod -Uri ($BaseUrl + "/api/_ping") -TimeoutSec 10 | Out-Null; $log += "PASS _ping ok" } catch { $log += ("FAIL _ping: " + $_.Exception.Message); $failed=$true }
}

WriteUtf8NoBom $logPath (($log -join "`r`n") + "`r`n")
Write-Host ("DONE -> " + ($(if($failed){"RED"}else{"GREEN"})) + " | log=" + $logPath) -ForegroundColor Cyan

if($failed){ exit 1 } else { exit 0 }