param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_console_status.ps1')

function Invoke-StandardPack {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string]$Info,
    [Parameter(Mandatory=$true)][string]$RepoContractScript,
    [Parameter(Mandatory=$true)][string]$NodeScript,
    [Parameter(Mandatory=$true)][string]$SuccessTitle,
    [Parameter(Mandatory=$true)][string]$SuccessInfo,
    [Parameter()][string]$NodeWorkingDir = 'backend'
  )

  $resolvedRepo = (Resolve-Path $RepoRoot).Path
  $contractPath = Join-Path $resolvedRepo $RepoContractScript
  $nodePath = Join-Path $resolvedRepo $NodeScript
  $nodeWorkDir = Join-Path $resolvedRepo $NodeWorkingDir

  if (-not (Test-Path $contractPath)) { throw "Missing repo contract script: $RepoContractScript" }
  if (-not (Test-Path $nodePath)) { throw "Missing node script: $NodeScript" }
  if (-not (Test-Path $nodeWorkDir)) { throw "Missing node working dir: $NodeWorkingDir" }

  Write-Host ''
  Write-StatusLine ("=== {0} ===" -f $Title)
  Write-StatusLine ("INFO {0}" -f $Info)

  & $contractPath -RepoRoot $resolvedRepo
  if (-not $?) { throw 'repo contract check failed' }

  Push-Location $nodeWorkDir
  try {
    $nodeScriptName = Split-Path $nodePath -Leaf
    node (Join-Path 'scripts' $nodeScriptName)
    if (-not $?) { throw ("backend check failed: {0}" -f $nodeScriptName) }
  }
  finally {
    Pop-Location
  }

  Write-Host ''
  Write-StatusLine ("=== {0} PACK PASS OK ===" -f $SuccessTitle)
  Write-StatusLine ("INFO {0}" -f $SuccessInfo)
}

function Invoke-ComposeNodePack {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$PackTitle,
    [Parameter(Mandatory=$true)][string]$RuntimeTitle,
    [Parameter(Mandatory=$true)][string]$RepoContractTitle,
    [Parameter(Mandatory=$true)][string]$SuccessTitle,
    [Parameter(Mandatory=$true)][string]$NodeScript,
    [Parameter(Mandatory=$true)][string]$RepoContractScript,
    [Parameter()][string]$ComposeFile,
    [Parameter()][string]$ApiService = 'api',
    [Parameter()][string]$ContainerBackendDir = '/app/backend'
  )

  $resolvedRepo = (Resolve-Path $RepoRoot).Path
  if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
    $ComposeFile = Join-Path $resolvedRepo 'infra/docker-compose.yml'
  }

  $contractPath = Join-Path $resolvedRepo $RepoContractScript
  $nodePath = Join-Path $resolvedRepo $NodeScript
  if (-not (Test-Path $contractPath)) { throw "Missing repo contract script: $RepoContractScript" }
  if (-not (Test-Path $nodePath)) { throw "Missing node script: $NodeScript" }
  if (-not (Test-Path $ComposeFile)) { throw "Missing compose file: $ComposeFile" }

  $nodeScriptName = Split-Path $nodePath -Leaf

  Write-Host ''
  Write-StatusLine ("=== {0} ===" -f $PackTitle)

  Write-Host ''
  Write-StatusLine ("=== {0} ===" -f $RuntimeTitle)
  $dockerArgs = @(
    'compose', '-f', $ComposeFile, 'exec', '-T', $ApiService,
    'sh', '-lc', ("cd {0} && node scripts/{1}" -f $ContainerBackendDir, $nodeScriptName)
  )
  $code = Invoke-ExternalColor -FilePath 'docker' -ArgumentList $dockerArgs
  if ($code -ne 0) { throw "Docker compose command failed: docker $($dockerArgs -join ' ')" }

  Write-Host ''
  Write-StatusLine ("=== {0} ===" -f $RepoContractTitle)
  & powershell -ExecutionPolicy Bypass -File $contractPath -RepoRoot $resolvedRepo
  if (-not $?) { throw 'repo contract check failed' }

  Write-Host ''
  Write-StatusLine ("=== {0} PACK PASS OK ===" -f $SuccessTitle)
}

function Invoke-ComposeNodePackWithScaffold {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][bool]$ScaffoldOnly,
    [Parameter(Mandatory=$true)][string]$ScaffoldTitle,
    [Parameter(Mandatory=$true)][string]$FilesReadyTitle,
    [Parameter(Mandatory=$true)][string]$PackTitle,
    [Parameter(Mandatory=$true)][string]$RuntimeTitle,
    [Parameter(Mandatory=$true)][string]$RepoContractTitle,
    [Parameter(Mandatory=$true)][string]$SuccessTitle,
    [Parameter(Mandatory=$true)][string]$NodeScript,
    [Parameter(Mandatory=$true)][string]$RepoContractScript,
    [Parameter()][string]$ComposeFile,
    [Parameter()][string]$ApiService = 'api',
    [Parameter()][string]$ContainerBackendDir = '/app/backend'
  )

  $resolvedRepo = (Resolve-Path $RepoRoot).Path
  $contractPath = Join-Path $resolvedRepo $RepoContractScript
  if (-not (Test-Path $contractPath)) { throw "Missing repo contract script: $RepoContractScript" }

  if ($ScaffoldOnly) {
    Write-Host ''
    Write-StatusLine ("=== {0} ===" -f $ScaffoldTitle)
    & powershell -ExecutionPolicy Bypass -File $contractPath -RepoRoot $resolvedRepo
    if (-not $?) { throw 'repo contract check failed' }
    Write-Host ''
    Write-StatusLine ("=== {0} ===" -f $FilesReadyTitle)
    return
  }

  Invoke-ComposeNodePack `
    -RepoRoot $resolvedRepo `
    -PackTitle $PackTitle `
    -RuntimeTitle $RuntimeTitle `
    -RepoContractTitle $RepoContractTitle `
    -SuccessTitle $SuccessTitle `
    -NodeScript $NodeScript `
    -RepoContractScript $RepoContractScript `
    -ComposeFile $ComposeFile `
    -ApiService $ApiService `
    -ContainerBackendDir $ContainerBackendDir
}
