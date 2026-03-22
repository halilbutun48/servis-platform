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
