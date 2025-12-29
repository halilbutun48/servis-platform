# tools/pack.ps1
param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpectedBuild = "20251225_175033",
  [int]$VehicleId = 1,
  [int]$SchoolId = 1,
  [int]$RouteId = 1
)

$ErrorActionPreference="Stop"
function Pass($m){ Write-Host ("PASS  " + $m) -ForegroundColor Green }
function Warn($m){ Write-Host ("WARN  " + $m) -ForegroundColor Yellow }
function Fail($m){ Write-Host ("FAIL  " + $m) -ForegroundColor Red }

# find repo root
$cwd = (Get-Location).Path
if (Test-Path (Join-Path $cwd "backend")) { $root = $cwd }
elseif (Test-Path (Join-Path $cwd "..\backend")) { $root = (Resolve-Path "..").Path }
else { throw "Repo root not found (backend folder missing)." }

Set-Location $root

$stamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$artDir = Join-Path $root ("artifacts\pack_" + $stamp)
New-Item -Force -ItemType Directory -Path $artDir | Out-Null

$steps = @()
$anyFail = $false

function Run-Step([string]$name,[scriptblock]$sb,[string]$outFile){
  Write-Host ""
  Write-Host ("== " + $name + " ==")
  $status="PASS"
  try {
    & $sb *>&1 | Tee-Object -FilePath $outFile
  } catch {
    $status="FAIL"
    $script:anyFail = $true
    ("CRASH: " + $_.Exception.Message) | Out-File -FilePath $outFile -Append -Encoding utf8
    Warn ($name + " crashed: " + $_.Exception.Message)
  }

  $txt = [string](Get-Content -LiteralPath $outFile -Raw -ErrorAction SilentlyContinue)

  if($txt -match "ENCODING CHECK:\s*FAIL"){ $status="FAIL"; $script:anyFail=$true }
  if($txt -match "VERIFY_V2 SUMMARY" -and $txt -match "FAILED:\s*True"){ $status="FAIL"; $script:anyFail=$true }
  if($txt -match "(?m)^\s*FAIL\b"){ $status="FAIL"; $script:anyFail=$true }

  $script:steps += [pscustomobject]@{ name=$name; status=$status; file=(Split-Path $outFile -Leaf) }
}

Run-Step "encoding-check" { powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\encoding-check.ps1 } (Join-Path $artDir "00_encoding.out.txt")

if(Test-Path .\tools\verify-v2.ps1){
  Run-Step "verify-v2" { powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\verify-v2.ps1 -BaseUrl $BaseUrl -ExpectedBuild $ExpectedBuild } (Join-Path $artDir "10_verify_v2.out.txt")
} else { Warn "missing tools/verify-v2.ps1" }

if(Test-Path .\tools\live-test-pack.ps1){
  Run-Step "live-test-pack" { powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\live-test-pack.ps1 -BaseUrl $BaseUrl -ExpectedBuild $ExpectedBuild -VehicleId $VehicleId -SchoolId $SchoolId -RouteId $RouteId } (Join-Path $artDir "20_live_test_pack.out.txt")
} else { Warn "missing tools/live-test-pack.ps1" }

if(Test-Path .\tools\panel-proof.ps1){
  Run-Step "panel-proof" { powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\panel-proof.ps1 -BaseUrl $BaseUrl -ExpectedBuild $ExpectedBuild } (Join-Path $artDir "30_panel_proof.out.txt")
} else { Warn "missing tools/panel-proof.ps1" }

$sum = @()
$sum += "PACK SUMMARY"
$sum += ("DIR: " + $artDir)
$sum += ("TIME: " + $stamp)
$sum += ("BASE: " + $BaseUrl)
$sum += ("EXPECTED_BUILD: " + $ExpectedBuild)
$sum += ("FAILED: " + $anyFail)
$sum += ""
$sum += "STEPS:"
foreach($s in $steps){ $sum += ("- " + $s.status + " " + $s.name + " => " + $s.file) }
$sum += ""
$sum += "FILES:"
Get-ChildItem -LiteralPath $artDir -File | Sort-Object Name | ForEach-Object { $sum += ("- " + $_.Name + " (" + $_.Length + " bytes)") }

$sum | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $artDir "SUMMARY.txt")

Write-Host ""
Write-Host ("DIR => " + $artDir)
Get-Content (Join-Path $artDir "SUMMARY.txt")

# --- STATUS_CURRENT.md (auto) ---
try {
  $statusScript = Join-Path $root "tools\status-current.ps1"
  if(Test-Path $statusScript){
    & $statusScript -BaseUrl $BaseUrl -ExpectedBuild $ExpectedBuild -VehicleId $VehicleId -SchoolId $SchoolId -RouteId $RouteId -PackDir $artDir
  } else {
    Write-Host "WARN status-current.ps1 missing" -ForegroundColor Yellow
  }
} catch {
  Write-Host ("WARN status-current failed: " + $_.Exception.Message) -ForegroundColor Yellow
}
