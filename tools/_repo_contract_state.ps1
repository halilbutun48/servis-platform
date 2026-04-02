param()
$ErrorActionPreference = 'Stop'

function Read-RepoContractState {
  param([Parameter(Mandatory=$true)][string]$RepoRoot)
  $path = Join-Path $RepoRoot 'tools\repo_contract_state.json'
  return (Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Assert-RepoContractStateValue {
  param(
    [Parameter(Mandatory=$true)]$State,
    [Parameter(Mandatory=$true)][string]$Property,
    [Parameter(Mandatory=$true)]$Expected,
    [Parameter(Mandatory=$true)][string]$Label
  )
  $actual = $State.$Property
  if ([string]$actual -ne [string]$Expected) { throw "FAIL $Label" }
  Write-Host "OK $Label"
}

function Assert-RepoContractStateArrayContains {
  param(
    [Parameter(Mandatory=$true)]$State,
    [Parameter(Mandatory=$true)][string]$Property,
    [Parameter(Mandatory=$true)][string]$Expected,
    [Parameter(Mandatory=$true)][string]$Label
  )
  $arr = @($State.$Property)
  if (-not ($arr -contains $Expected)) { throw "FAIL $Label" }
  Write-Host "OK $Label"
}
