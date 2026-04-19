<#
TUR3_ALIAS_STATUS_V1
COMPATIBILITY ROOT ENTRY
Bu dosya compatibility/living runtime doğrulama girişi olarak korunur. Wrapper-first yön için tools/wrappers/verify_living_runtime.ps1 de eklenmiştir; ancak eski çağrılar kırılmaz.
#>
param(
  [Parameter(Mandatory=$false)][ValidateRange(67,199)][int]$To = 89,
  [Parameter(Mandatory=$false)][string]$RepoRoot = '',
  [Parameter(Mandatory=$false)][string]$ComposeDir = 'infra',
  [Parameter(Mandatory=$false)][string]$ApiService = 'api',
  [Parameter(Mandatory=$false)][switch]$NoBuild
)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..')).Path
}

& (Join-Path $ScriptRoot 'pack_living.ps1') -To $To -RepoRoot $RepoRoot -ComposeDir $ComposeDir -ApiService $ApiService -NoBuild:$NoBuild
