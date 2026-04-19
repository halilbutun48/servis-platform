<#
TUR3_ALIAS_STATUS_V1
COMPATIBILITY ROOT ENTRY
Bu dosya compatibility/living static doğrulama girişi olarak korunur. Wrapper-first yön için tools/wrappers/verify_living_static.ps1 de eklenmiştir; ancak eski çağrılar kırılmaz.
#>
param(
  [Parameter(Mandatory=$false)][string]$RepoRoot = ''
)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..')).Path
}


& (Join-Path $ScriptRoot 'checks\living\check_static_repo.ps1') -RepoRoot $RepoRoot
Push-Location $RepoRoot
try {
  node .\backend\scripts\run_m0_m66.js --static-only --to M66 --continue
  if ($LASTEXITCODE -ne 0) { throw 'run_m0_m66 static-only failed' }
}
finally { Pop-Location }

& (Join-Path $ScriptRoot 'checks\living\check_m67_m75_static.ps1') -RepoRoot $RepoRoot
& (Join-Path $ScriptRoot 'checks\living\check_living_matrix.ps1') -RepoRoot $RepoRoot
& (Join-Path $ScriptRoot 'checks\living\check_m76_m81_static.ps1') -RepoRoot $RepoRoot
Write-Host 'LIVING STATIC VERIFY PASS'
