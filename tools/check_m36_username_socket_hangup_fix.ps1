param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = "Stop"
Write-Host "=== M36 USERNAME SOCKET HANGUP FIX CHECK ==="
Push-Location $RepoRoot
try {
  $admin = Get-Content (Join-Path $RepoRoot 'backend\src\routes\admin.js') -Raw
  if ($admin -notmatch 'slice\(0,\s*24\)' -and $admin -notmatch 'substring\(0,\s*24\)') { throw 'username fallback length guard missing' }
  if ($admin -notmatch 'username') { throw 'username handling missing in admin route' }
  Write-Host 'OK username fallback length guard exists'
  Write-Host '=== M36 USERNAME SOCKET HANGUP FIX CHECK PASS ===' 
} finally {
  Pop-Location
}
