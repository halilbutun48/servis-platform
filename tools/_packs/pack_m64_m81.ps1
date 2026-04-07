param([string]$RepoRoot = '', [string]$ComposeDir = 'infra', [switch]$NoBuild, [ValidateRange(64,81)][int]$To = 81)
$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = (Resolve-Path (Join-Path $ScriptRoot '..\..')).Path }
Set-Location $RepoRoot
Write-Host ''
Write-Host ('=== SUBPACK: M64 -> M{0} ===' -f $To)
Write-Host 'INFO Compatibility wrapper: runs M64-M66 directly, then canonical M67-M75 and M76+ subpacks.'
Write-Host ''
foreach ($pack in @('tools\pack_m64_natural_copilot_layer.ps1','tools\pack_m65_pilot_launch_gate.ps1','tools\pack_m66_operation_reassignment.ps1')) {
  & powershell -ExecutionPolicy Bypass -File $pack -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if ($To -ge 67) { & powershell -ExecutionPolicy Bypass -File (Join-Path $ScriptRoot 'pack_m67_m75.ps1') -RepoRoot $RepoRoot -ComposeDir $ComposeDir -NoBuild:$NoBuild -To ([Math]::Min($To,75)); if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
if ($To -ge 76) { & powershell -ExecutionPolicy Bypass -File (Join-Path $ScriptRoot 'pack_m76_m81.ps1') -RepoRoot $RepoRoot -ComposeDir $ComposeDir -NoBuild:$NoBuild -To ([Math]::Min($To,81)); if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
