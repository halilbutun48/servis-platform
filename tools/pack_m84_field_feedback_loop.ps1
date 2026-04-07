param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$NoBuild
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared_functions.ps1")

Write-StatusLine "=== M84 FIELD FEEDBACK LOOP PACK ==="
Write-StatusLine "INFO Bu pack saha gunu kayitlarini, durum akisina gore kapanis takibini ve Super Admin geri bildirim yuzeyini dogrular."

& powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "tools/check_m84_field_feedback_loop_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw "M84 repo contract failed." }

Push-Location (Join-Path $RepoRoot "backend")
try {
  node .\scripts\m84_field_feedback_loop_check.js
  if (-not $?) { throw "M84 field feedback loop check failed." }
}
finally {
  Pop-Location
}

Write-StatusLine "=== M84 FIELD FEEDBACK LOOP PACK PASS OK ==="
Write-StatusLine "INFO Saha gozlemleri tek loop icinde gorulur; goruldu/tekrarlandi/cozuldu/kapandi akisi kayda doner."
