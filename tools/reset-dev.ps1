param(
  [switch]$SkipOsrm
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ComposeFile = Join-Path $RepoRoot "infra\docker-compose.yml"
$RouteRefreshStoreFiles = @(
  (Join-Path $RepoRoot "backend\data\agreement-route-refresh-requests.json"),
  (Join-Path $RepoRoot "backend\data\agreement-route-refresh-requests.json.bak")
)

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "docker-compose file not found: $ComposeFile"
}

Write-Host "=== DEV RESET ==="
Write-Host "Repo: $RepoRoot"
Write-Host "Compose: $ComposeFile"

Push-Location $RepoRoot
try {
  Write-Host "INFO docker compose down -v"
  & docker compose -f $ComposeFile down -v
  if ($LASTEXITCODE -ne 0) { throw "docker compose down -v failed" }

  foreach ($path in $RouteRefreshStoreFiles) {
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Force
      Write-Host "CLEAN removed $path"
    } else {
      Write-Host "OK missing $path"
    }
  }

  Write-Host "INFO docker compose up -d --build"
  & docker compose -f $ComposeFile up -d --build
  if ($LASTEXITCODE -ne 0) { throw "docker compose up -d --build failed" }

  if (-not $SkipOsrm) {
    Write-Host "INFO docker compose --profile osrm up -d"
    & docker compose -f $ComposeFile --profile osrm up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose --profile osrm up -d failed" }
  }

  Write-Host "=== DEV RESET PASS ==="
} finally {
  Pop-Location
}
