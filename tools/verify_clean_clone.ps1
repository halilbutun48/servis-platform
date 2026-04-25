param(
  [string]$RepoRoot = $null
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

Push-Location $RepoRoot
try {
  npm --prefix backend ci
  if (-not $?) { throw 'backend ci failed' }

  npm --prefix web ci
  if (-not $?) { throw 'web ci failed' }

  npm --prefix backend exec -- prisma generate
  if (-not $?) { throw 'prisma generate failed' }

  npm run verify:repo
  if (-not $?) { throw 'verify:repo failed' }
}
finally {
  Pop-Location
}
