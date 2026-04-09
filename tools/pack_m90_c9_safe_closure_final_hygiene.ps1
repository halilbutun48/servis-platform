param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)
$ErrorActionPreference = 'Stop'

powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\check_m90_c9_safe_closure_final_hygiene_repo_contract.ps1') -RepoRoot $RepoRoot
if (-not $?) { throw 'M90C.9 repo contract failed.' }

Push-Location $RepoRoot
try {
  npm run verify:final
  if (-not $?) { throw 'npm run verify:final failed during M90C.9 pack.' }

  $shell = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($shell) {
    & $shell.Source -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\pack_m90_c7_export_package_hygiene.ps1') -RepoRoot $RepoRoot
  } else {
    powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot 'tools\pack_m90_c7_export_package_hygiene.ps1') -RepoRoot $RepoRoot
  }
  if (-not $?) { throw 'M90C.7 export hygiene pack failed during M90C.9 pack.' }

  node (Join-Path $RepoRoot 'backend\scripts\m90_c9_safe_closure_final_hygiene_check.js')
  if (-not $?) { throw 'M90C.9 safe closure / final hygiene check failed.' }
} finally {
  Pop-Location
}

Write-Host 'M90C.9 safe closure / final hygiene PACK PASS'
