param(
  [Parameter(Mandatory = $true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
Write-Host '=== M36 USERNAME COMPAT FIX CHECK ==='
$backend = Join-Path $RepoRoot 'backend/src/routes/admin.js'
if (-not (Test-Path $backend)) { throw 'admin.js missing' }
$text = Get-Content $backend -Raw
if ($text -notmatch 'username:\s*z\.string\(\)\.trim\(\)\.min\(4\)\.max\(24\)\.regex\(/\^\[a-z0-9_\.\]\+\$/\)\.optional\(\)') { throw 'createUserSchema username is not optional' }
if ($text -notmatch 'const usernameSeed = String\(parsed\.data\.username \|\| ""\)\.trim\(\) \|\| \(publicEmail \? publicEmail\.split\("@"\)\[0\] : ""\);') { throw 'username seed fallback missing' }
if ($text -notmatch 'if \(!usernameSeed\) \{') { throw 'username required guard missing' }
if ($text -notmatch 'const username = validateUsernameOrThrow\(usernameSeed\);') { throw 'validateUsernameOrThrow on seed missing' }
Write-Host 'PASS m36_username_compat_fix'
Write-Host '=== M36 USERNAME COMPAT FIX CHECK PASS ==='
