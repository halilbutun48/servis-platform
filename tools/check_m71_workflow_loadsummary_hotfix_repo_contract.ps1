param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host '=== M71 WORKFLOW LOADSUMMARY HOTFIX CHECK ==='
$relative = 'web\src\panels\company\WorkflowPanel.jsx'
Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $relative
$content = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath $relative

if ($content -match 'onClick=\{loadStats\}') {
  throw 'FAIL legacy loadStats click removed'
}
Write-Host 'OK legacy loadStats click removed'

if ($content -match 'onClick=\{\(\) => loadSummary\(\)\}') {
  Write-Host 'OK reload button uses loadSummary wrapper'
}
else {
  throw 'FAIL reload button uses loadSummary wrapper'
}

if ($content -match 'async function loadSummary\(') {
  Write-Host 'OK loadSummary function exists'
}
else {
  throw 'FAIL loadSummary function exists'
}

Write-Host '=== M71 WORKFLOW LOADSUMMARY HOTFIX CHECK PASS ==='
