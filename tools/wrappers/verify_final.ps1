$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $RepoRoot
try {
  npm run verify:final
  if ($LASTEXITCODE -ne 0) { throw 'verify:final failed' }
} finally { Pop-Location }
