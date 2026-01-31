param(
  [ValidateSet(0,1,2,3,4,5,6,7,8,9,10,11,12)]
  [int]$To = 12,
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"

function Section($title){
  Write-Host "\n=== $title ===" -ForegroundColor Cyan
}

Section "PERSONEL-SERVIS V1 — PACK (M0→M12)"
Write-Host "Target stage: M$To"

if (-not $NoInstall) {
  Section "Install (backend)"
  Push-Location "$PSScriptRoot\..\backend"
  if (-not (Test-Path "node_modules")) { npm i }
  Pop-Location

  Section "Install (web)"
  Push-Location "$PSScriptRoot\..\web"
  if (-not (Test-Path "node_modules")) { npm i }
  Pop-Location
}

Section "Gate"
& "$PSScriptRoot\gate.ps1" -To $To
if ($LASTEXITCODE -ne 0) { throw "GATE FAIL (exit=$LASTEXITCODE)" }

Section "Backend checks"
Push-Location "$PSScriptRoot\..\backend"
npm run smoke
if ($LASTEXITCODE -ne 0) { throw "SMOKE FAIL (exit=$LASTEXITCODE)" }

npm run fullcheck
if ($LASTEXITCODE -ne 0) { throw "FULLCHECK FAIL (exit=$LASTEXITCODE)" }

if ($To -ge 11) {
  npm run m11check
  if ($LASTEXITCODE -ne 0) { throw "M11CHECK FAIL (exit=$LASTEXITCODE)" }
}

if ($To -ge 12) {
  npm run m12check
  if ($LASTEXITCODE -ne 0) { throw "M12CHECK FAIL (exit=$LASTEXITCODE)" }
}
Pop-Location

Section "DONE"
Write-Host "✅ PACK PASS" -ForegroundColor Green
