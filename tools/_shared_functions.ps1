$ErrorActionPreference = 'Stop'

$consoleStatusPath = Join-Path $PSScriptRoot '_console_status.ps1'
if (-not (Test-Path $consoleStatusPath)) {
  throw "FAIL missing tools helper: $consoleStatusPath"
}
. $consoleStatusPath

function Invoke-RepoNodeScript {
  param(
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [string]$FailureMessage = 'Node script failed.'
  )

  Push-Location $WorkingDirectory
  try {
    & node $ScriptPath
    if (-not $?) { throw $FailureMessage }
  }
  finally {
    Pop-Location
  }
}
