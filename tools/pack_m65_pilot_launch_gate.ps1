param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack -RepoRoot $RepoRoot -Title 'M65 PILOT LAUNCH GATE' -Info 'This pack opens M65 with docs, repo-contract, and backend/web skeleton verification.' -RepoContractScript 'tools/check_m65_pilot_launch_gate_repo_contract.ps1' -NodeScript 'backend/scripts/m65_pilot_launch_gate_check.js' -SuccessTitle 'M65 PILOT LAUNCH GATE' -SuccessInfo 'M65 green olmadan sahaya cikilmaz.'
