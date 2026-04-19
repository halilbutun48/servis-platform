param(
  [string]$RepoRoot = ''
)
$ErrorActionPreference = 'Stop'
$ToolsRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $ToolsRoot '..')).Path
}
Push-Location $RepoRoot
try {
  npm run verify:final
  if (-not $?) { throw 'verify:final failed.' }
} finally {
  Pop-Location
}
