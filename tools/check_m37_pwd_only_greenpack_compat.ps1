param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
Write-Host '=== M37 PWD-ONLY GREENPACK COMPAT CHECK ==='
$authPath = Join-Path $RepoRoot 'backend\src\routes\auth.js'
if (-not (Test-Path $authPath)) { throw 'auth.js missing' }
$text = Get-Content $authPath -Raw -Encoding UTF8
$needle = 'if (mustChangePassword && !isGreenpackStepUpBypass(req)) loginExtra.pwdChangeOnly = true;'
if ($text -notmatch [regex]::Escape($needle)) { throw 'greenpack compat condition missing in auth.js' }
Write-Host 'PASS m37_pwd_only_greenpack_compat'
Write-Host '=== M37 PWD-ONLY GREENPACK COMPAT CHECK PASS ==='
