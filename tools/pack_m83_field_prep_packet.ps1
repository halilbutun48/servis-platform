param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M83 FIELD PREP PACK ==="
Write-StatusLine "INFO Bu pack saha gunu oncesi operator sirasi, senaryo listesi ve role/device checklistini tek pakette dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m83_field_prep_packet_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M83 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m83_field_prep_packet_check.js
  if (-not $?) { throw "M83 field prep packet check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M83 FIELD PREP PACK PACK PASS OK ==="
Write-StatusLine "INFO Saha gunu oncesi canli ortam, operator sirasi, senaryo ve checklist tek kapida gorunur."
