param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack -RepoRoot $RepoRoot -Title 'M66 OPERATION REASSIGNMENT' -Info 'This pack verifies M66 repo contract and feature skeleton.' -RepoContractScript 'tools/check_m66_operation_reassignment_repo_contract.ps1' -NodeScript 'backend/scripts/m66check.js' -SuccessTitle 'M66 OPERATION REASSIGNMENT' -SuccessInfo 'M66 verification/smoke can run after broader repo cleanup if desired.'
