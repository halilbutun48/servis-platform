param(
  [string]$Phase = "all",
  [switch]$Continue
)
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $RepoRoot "backend\scripts\run_repo_check_chain.js"
$argsList = @($runner, "--phase", $Phase)
if ($Continue) { $argsList += "--continue" }

Push-Location $RepoRoot
try {
  node @argsList
  if (-not $?) { throw "repo check chain failed." }
} finally {
  Pop-Location
}
