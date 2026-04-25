param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)

$ErrorActionPreference = "Stop"
Write-Host "=== M93 QUEUE DURABILITY PROOF PACK ==="
Push-Location $RepoRoot
try {
  node .\backend\scripts\m93_queue_durability_proof_check.js --repo-root $RepoRoot
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "=== M93 QUEUE DURABILITY PROOF PACK PASS ==="
}
finally {
  Pop-Location
}
