[CmdletBinding()]
param(
  [string]$ApiImage,
  [string]$FrontendImage,
  [string]$EnvFile,
  [string]$PublicBaseUrl = "https://plenty-rss-scenario-connected.trycloudflare.com",
  [int]$HealthTimeoutSec = 120,
  [switch]$DryRun,
  [switch]$FinalizePreviousContainers,
  [switch]$RoleAccessVerified
)

$ErrorActionPreference = "Stop"
$projectName = "seferpakt"
$composeRelativePath = "infra/docker-compose.clean-demo.yml"
$lifecycleLabel = "canonical-compose-v1"
$stableApiName = "seferpakt-api"
$stableFrontendName = "seferpakt-frontend"
$legacyApiPrefix = "seferpakt-clean-demo-api-"
$legacyFrontendPrefix = "seferpakt-frontend-"
$repoRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $repoRoot $composeRelativePath

function Invoke-DockerCommand {
  param([Parameter(Mandatory)][string[]]$Arguments)
  if ($DryRun) {
    Write-Host ("DRY-RUN docker " + ($Arguments -join " "))
    return ""
  }
  # Compose writes normal lifecycle progress to stderr. Do not let the
  # repository-wide Stop preference treat a successful "Running/Started"
  # status line as a deployment exception; the native exit code is the
  # authoritative result.
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $result = & docker @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    throw "docker $($Arguments -join ' ') failed: $($result -join [Environment]::NewLine)"
  }
  return ($result -join [Environment]::NewLine)
}

function Invoke-ComposeCommand {
  param([Parameter(Mandatory)][string[]]$Arguments)
  # Canonical command form: docker compose -p seferpakt --profile routing -f infra/docker-compose.clean-demo.yml
  $base = @("compose", "-p", $projectName, "--profile", "routing", "-f", $composePath)
  if (-not [string]::IsNullOrWhiteSpace($resolvedEnvFile)) {
    $base += @("--env-file", $resolvedEnvFile)
  }
  return Invoke-DockerCommand -Arguments ($base + $Arguments)
}

function Get-ContainerNames {
  if ($DryRun) { return @() }
  $names = & docker ps -a --format "{{.Names}}"
  if ($LASTEXITCODE -ne 0) { throw "docker container listing failed" }
  return @($names | Where-Object { $_ })
}

function Get-ContainerInspection {
  param([Parameter(Mandatory)][string]$Name)
  if ($DryRun) { return $null }
  $raw = & docker inspect $Name 2>&1
  if ($LASTEXITCODE -ne 0) { return $null }
  return ($raw -join "") | ConvertFrom-Json | Select-Object -First 1
}

function Get-ContainerByExactName {
  param([Parameter(Mandatory)][string]$Name)
  if ($DryRun) { return $null }
  if ((Get-ContainerNames) -notcontains $Name) { return $null }
  return Get-ContainerInspection -Name $Name
}

function Get-ActiveNamesByPrefix {
  param([Parameter(Mandatory)][string]$Prefix)
  if ($DryRun) { return @() }
  return @((Get-ContainerNames | Where-Object { $_.StartsWith($Prefix) -and $_ -ne $stableFrontendName }) | Where-Object {
    $inspection = Get-ContainerInspection -Name $_
    $inspection -and $inspection.State.Running -eq $true
  })
}

function Get-ImageReference {
  param([Parameter(Mandatory)]$Inspection)
  if ($null -eq $Inspection) { return $null }
  return [string]$Inspection.Config.Image
}

function Assert-ImageExists {
  param([Parameter(Mandatory)][string]$Image)
  if ($DryRun) { return }
  & docker image inspect $Image *> $null
  if ($LASTEXITCODE -ne 0) { throw "Rollback/deployment image is not available locally: $Image" }
}

function Assert-StableContainerOwnership {
  param(
    [AllowNull()]$Inspection,
    [Parameter(Mandatory)][string]$Service,
    [Parameter(Mandatory)][string]$Name
  )
  if ($null -eq $Inspection) { return }
  $labels = $Inspection.Config.Labels
  if ($labels.'com.docker.compose.project' -ne $projectName -or
      $labels.'com.docker.compose.service' -ne $Service -or
      $labels.'com.seferpakt.lifecycle' -ne $lifecycleLabel) {
    throw "Stable container $Name exists but is not owned by canonical Compose lifecycle; refusing takeover."
  }
}

function Wait-HttpJson {
  param(
    [Parameter(Mandatory)][string]$Url,
    [Parameter(Mandatory)][scriptblock]$Accept,
    [Parameter(Mandatory)][string]$Description
  )
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
  $lastError = "not attempted"
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
      $json = $response.Content | ConvertFrom-Json
      if (& $Accept $response $json) {
        return [pscustomobject]@{ status = [int]$response.StatusCode; body = $json }
      }
      $lastError = "HTTP $($response.StatusCode) returned an unexpected body"
    } catch {
      $lastError = $_.Exception.Message
    }
    if (-not $DryRun) { Start-Sleep -Seconds 2 }
  } while ((Get-Date) -lt $deadline)
  throw "$Description did not become healthy: $lastError"
}

function Get-AssetFingerprint {
  param([Parameter(Mandatory)][string]$BaseUrl)
  $page = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd("/") + "/") -UseBasicParsing -TimeoutSec 20
  $matches = [regex]::Matches($page.Content, '(?:src|href)=["'']([^"'']+\.js)["'']')
  $asset = $matches | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -match "index|assets" } | Select-Object -First 1
  if (-not $asset) { throw "No frontend JavaScript asset fingerprint found at $BaseUrl" }
  return [pscustomobject]@{ url = $BaseUrl; asset = $asset; status = [int]$page.StatusCode }
}

function Assert-FrontendAssetGraph {
  param([Parameter(Mandatory)][string]$BaseUrl)
  $fingerprint = Get-AssetFingerprint -BaseUrl $BaseUrl
  $entryUrl = $BaseUrl.TrimEnd("/") + "/" + $fingerprint.asset.TrimStart("/")
  $entry = Invoke-WebRequest -Uri $entryUrl -UseBasicParsing -TimeoutSec 20
  if ([int]$entry.StatusCode -ne 200 -or $entry.Content -match "(?is)^\s*<!doctype\s+html") {
    throw "Frontend entry asset is not JavaScript at $entryUrl"
  }

  $entryUri = [Uri]$entryUrl
  $references = [regex]::Matches($entry.Content, 'import\(["'']([^"'']+\.js)["'']\)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
  $checked = @()
  foreach ($reference in $references) {
    $assetUri = ([Uri]::new($entryUri, $reference)).AbsoluteUri
    $assetResponse = Invoke-WebRequest -Uri $assetUri -UseBasicParsing -TimeoutSec 20
    if ([int]$assetResponse.StatusCode -ne 200 -or $assetResponse.Content -match "(?is)^\s*<!doctype\s+html") {
      throw "Frontend dynamic asset is missing or served as HTML: $assetUri"
    }
    $checked += $assetUri
  }
  return [pscustomobject]@{
    entry = $fingerprint.asset
    dynamicAssetCount = $checked.Count
    pass = $true
  }
}

function Get-CanonicalContainerSummary {
  $names = @($stableApiName, $stableFrontendName, "seferpakt-db-1", "seferpakt-redis-1", "seferpakt-osrm-1", "seferpakt-solver-1")
  if ($DryRun) { return @($names | ForEach-Object { [pscustomobject]@{ name = $_; present = "DRY_RUN" } }) }
  return @($names | ForEach-Object {
    $inspection = Get-ContainerInspection -Name $_
    [pscustomobject]@{
      name = $_
      present = $null -ne $inspection
      running = $null -ne $inspection -and $inspection.State.Running -eq $true
      image = if ($inspection) { Get-ImageReference -Inspection $inspection } else { $null }
      id = if ($inspection) { $inspection.Id.Substring(0, 12) } else { $null }
    }
  })
}

if (-not (Test-Path -LiteralPath $composePath)) { throw "Canonical Compose file not found: $composePath" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "docker is required" }

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $dbInspection = Get-ContainerByExactName -Name "seferpakt-db-1"
  if ($dbInspection) {
    $EnvFile = $dbInspection.Config.Labels.'com.docker.compose.project.environment_file'
  }
}
$resolvedEnvFile = $null
if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
  $resolvedEnvFile = if ([IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $repoRoot $EnvFile }
  if (-not (Test-Path -LiteralPath $resolvedEnvFile)) { throw "Canonical Compose environment file not found: $resolvedEnvFile" }
} else {
  # Existing canonical containers may have been created from process-injected secrets
  # rather than a persisted env file. Reuse only those exact runtime values in memory.
  # Prefer the stable canonical API container. Older deployments used a
  # versioned name, but the fixed Compose project must be able to redeploy
  # without requiring a persisted env file or a legacy container.
  $runtimeApi = Get-ContainerByExactName -Name $stableApiName
  if (-not $runtimeApi) {
    $runtimeApi = Get-ContainerByExactName -Name "seferpakt-clean-demo-api-cont233-finance-semantic-v4"
  }
  if (-not $runtimeApi) {
    $runtimeApi = Get-ActiveNamesByPrefix -Prefix $legacyApiPrefix | Select-Object -First 1 | ForEach-Object { Get-ContainerInspection -Name $_ }
  }
  if (-not $runtimeApi) { throw "No canonical runtime env file or active API container was available to recover required Compose secrets." }
  $runtimeEnv = @{}
  foreach ($entry in @($runtimeApi.Config.Env)) {
    $parts = $entry -split "=", 2
    if ($parts.Count -eq 2) { $runtimeEnv[$parts[0]] = $parts[1] }
  }
  if (-not $runtimeEnv.DATABASE_URL -or -not $runtimeEnv.WORKER_DATABASE_URL) {
    throw "Canonical API container did not expose both required database runtime values; refusing deployment."
  }
  $env:CLEAN_DEMO_APP_DATABASE_URL = $runtimeEnv.DATABASE_URL
  $env:CLEAN_DEMO_WORKER_DATABASE_URL = $runtimeEnv.WORKER_DATABASE_URL
}

$mutex = [Threading.Mutex]::new($false, "Global\SeferPaktCanonicalComposeDeploy")
if (-not $mutex.WaitOne(0)) { throw "Another canonical API/frontend deployment is already running." }

$oldApiEnv = $env:CLEAN_DEMO_API_IMAGE
$oldFrontendEnv = $env:CLEAN_DEMO_FRONTEND_IMAGE
$oldAppDatabaseEnv = $env:CLEAN_DEMO_APP_DATABASE_URL
$oldWorkerDatabaseEnv = $env:CLEAN_DEMO_WORKER_DATABASE_URL
$oldApiContainers = @()
$oldFrontendContainers = @()
$previousApiImage = $null
$previousFrontendImage = $null
$deploymentSucceeded = $false

try {
  $serviceText = Invoke-ComposeCommand -Arguments @("config", "--services")
  $services = @($serviceText -split "\r?\n" | Where-Object { $_ } | Sort-Object)
  $expectedServices = @("api", "db", "frontend", "osrm", "redis", "solver") | Sort-Object
  if ((Compare-Object -ReferenceObject $expectedServices -DifferenceObject $services).Count -gt 0) {
    throw "Canonical Compose service set changed unexpectedly: $($services -join ', ')"
  }

  $stableApi = Get-ContainerByExactName -Name $stableApiName
  $stableFrontend = Get-ContainerByExactName -Name $stableFrontendName
  Assert-StableContainerOwnership -Inspection $stableApi -Service "api" -Name $stableApiName
  Assert-StableContainerOwnership -Inspection $stableFrontend -Service "frontend" -Name $stableFrontendName

  if ($stableApi) { $previousApiImage = Get-ImageReference -Inspection $stableApi }
  if ($stableFrontend) { $previousFrontendImage = Get-ImageReference -Inspection $stableFrontend }

  $oldApiContainers = @(Get-ActiveNamesByPrefix -Prefix $legacyApiPrefix)
  $oldFrontendContainers = @(Get-ActiveNamesByPrefix -Prefix $legacyFrontendPrefix)
  if (-not $stableApi -and $oldApiContainers.Count -ne 1) {
    throw "Stable API is absent and exactly one active legacy API container is required for safe cutover; found $($oldApiContainers.Count)."
  }
  if (-not $stableFrontend -and $oldFrontendContainers.Count -ne 1) {
    throw "Stable frontend is absent and exactly one active legacy frontend container is required for safe cutover; found $($oldFrontendContainers.Count)."
  }

  if ([string]::IsNullOrWhiteSpace($ApiImage)) {
    $ApiImage = if ($stableApi) { $previousApiImage } else { Get-ImageReference -Inspection (Get-ContainerInspection -Name $oldApiContainers[0]) }
  }
  if ([string]::IsNullOrWhiteSpace($FrontendImage)) {
    $FrontendImage = if ($stableFrontend) { $previousFrontendImage } else { Get-ImageReference -Inspection (Get-ContainerInspection -Name $oldFrontendContainers[0]) }
  }
  Assert-ImageExists -Image $ApiImage
  Assert-ImageExists -Image $FrontendImage

  $env:CLEAN_DEMO_API_IMAGE = $ApiImage
  $env:CLEAN_DEMO_FRONTEND_IMAGE = $FrontendImage

  if (-not $stableApi -and -not $DryRun) {
    Invoke-DockerCommand -Arguments @("stop", $oldFrontendContainers[0]) | Out-Null
    Invoke-DockerCommand -Arguments @("stop", $oldApiContainers[0]) | Out-Null
  }

  Invoke-ComposeCommand -Arguments @("up", "-d", "--no-build", "--no-deps", "api") | Out-Null
  $localApiHealth = Wait-HttpJson -Url "http://localhost:3300/health" -Description "local API health" -Accept {
    param($response, $json) $response.StatusCode -eq 200 -and $json.ok -eq $true -and $json.dbOk -eq $true
  }

  Invoke-ComposeCommand -Arguments @("up", "-d", "--no-build", "--no-deps", "frontend") | Out-Null
  $localFrontendHealth = Wait-HttpJson -Url "http://localhost:5273/health" -Description "local frontend health" -Accept {
    param($response, $json) $response.StatusCode -eq 200 -and $json.ok -eq $true
  }

  $publicHealth = Wait-HttpJson -Url ($PublicBaseUrl.TrimEnd("/") + "/health") -Description "public health" -Accept {
    param($response, $json) $response.StatusCode -eq 200 -and ($json.ok -eq $true -or $json.dbOk -eq $true)
  }
  $localAsset = Get-AssetFingerprint -BaseUrl "http://localhost:5273"
  $publicAsset = Get-AssetFingerprint -BaseUrl $PublicBaseUrl
  if ($localAsset.asset -ne $publicAsset.asset) {
    throw "Local/public frontend asset mismatch: local=$($localAsset.asset), public=$($publicAsset.asset)"
  }
  $localAssetGraph = Assert-FrontendAssetGraph -BaseUrl "http://localhost:5273"
  $publicAssetGraph = Assert-FrontendAssetGraph -BaseUrl $PublicBaseUrl

  $deploymentSucceeded = $true
  $summary = [ordered]@{
    project = $projectName
    compose = $composeRelativePath
    envFile = $resolvedEnvFile
    apiImage = $ApiImage
    frontendImage = $FrontendImage
    previousApiImage = $previousApiImage
    previousFrontendImage = $previousFrontendImage
    localApiHealth = @{ status = $localApiHealth.status; dbOk = [bool]$localApiHealth.body.dbOk }
    localFrontendHealth = @{ status = $localFrontendHealth.status; ok = [bool]$localFrontendHealth.body.ok }
    publicHealth = @{ status = $publicHealth.status; dbOk = if ($null -ne $publicHealth.body.dbOk) { [bool]$publicHealth.body.dbOk } else { $null }; ok = if ($null -ne $publicHealth.body.ok) { [bool]$publicHealth.body.ok } else { $null } }
    localPublicAssetParity = @{ local = $localAsset.asset; public = $publicAsset.asset; pass = $true }
    frontendAssetGraph = @{
      local = $localAssetGraph
      public = $publicAssetGraph
      pass = $localAssetGraph.pass -and $publicAssetGraph.pass -and $localAssetGraph.dynamicAssetCount -eq $publicAssetGraph.dynamicAssetCount
    }
    roleAccess = if ($RoleAccessVerified) { "VERIFIED_BY_CALLER" } else { "REQUIRES_REAL_CHROMIUM_SMOKE_BEFORE_FINALIZE" }
    previousContainersRetained = @($oldApiContainers + $oldFrontendContainers)
    canonicalContainers = Get-CanonicalContainerSummary
    destructiveCleanup = "NOT_PERFORMED"
  }
  $summary | ConvertTo-Json -Depth 8

  if ($FinalizePreviousContainers) {
    if (-not $RoleAccessVerified) { throw "Refusing to remove previous containers without -RoleAccessVerified." }
    foreach ($name in @($oldApiContainers + $oldFrontendContainers)) {
      if ($name -and (Get-ContainerNames) -contains $name) {
        $inspection = Get-ContainerInspection -Name $name
        if ($inspection.State.Running) { throw "Previous container is still running; refusing cleanup: $name" }
        Invoke-DockerCommand -Arguments @("rm", $name) | Out-Null
      }
    }
  }
} catch {
  $deploymentFailure = $_.Exception.Message
  if (-not $deploymentSucceeded -and -not $DryRun) {
    try {
      $stableApiNow = Get-ContainerByExactName -Name $stableApiName
      $stableFrontendNow = Get-ContainerByExactName -Name $stableFrontendName
      if ($stableApiNow -and $stableApiNow.State.Running) { Invoke-DockerCommand -Arguments @("stop", $stableApiName) | Out-Null }
      if ($stableFrontendNow -and $stableFrontendNow.State.Running) { Invoke-DockerCommand -Arguments @("stop", $stableFrontendName) | Out-Null }
      if (-not $stableApi -and $oldApiContainers.Count -eq 1) { Invoke-DockerCommand -Arguments @("start", $oldApiContainers[0]) | Out-Null }
      if (-not $stableFrontend -and $oldFrontendContainers.Count -eq 1) { Invoke-DockerCommand -Arguments @("start", $oldFrontendContainers[0]) | Out-Null }
      if ($stableApi -and $previousApiImage) {
        $env:CLEAN_DEMO_API_IMAGE = $previousApiImage
        Invoke-ComposeCommand -Arguments @("up", "-d", "--no-build", "--no-deps", "api") | Out-Null
      }
      if ($stableFrontend -and $previousFrontendImage) {
        $env:CLEAN_DEMO_FRONTEND_IMAGE = $previousFrontendImage
        Invoke-ComposeCommand -Arguments @("up", "-d", "--no-build", "--no-deps", "frontend") | Out-Null
      }
    } catch {
      Write-Error "Rollback attempt also failed: $($_.Exception.Message); original deployment failure: $deploymentFailure"
    }
  }
  throw
} finally {
  $env:CLEAN_DEMO_API_IMAGE = $oldApiEnv
  $env:CLEAN_DEMO_FRONTEND_IMAGE = $oldFrontendEnv
  $env:CLEAN_DEMO_APP_DATABASE_URL = $oldAppDatabaseEnv
  $env:CLEAN_DEMO_WORKER_DATABASE_URL = $oldWorkerDatabaseEnv
  $mutex.ReleaseMutex()
  $mutex.Dispose()
}
