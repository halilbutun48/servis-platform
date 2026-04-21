param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack -RepoRoot $RepoRoot -Title 'M64 DOGAL COPILOT YOL HARITASI' -Info 'This pack opens M64 as a roadmap / planned surface with docs, repo-contract, and backend/web skeleton verification.' -RepoContractScript 'tools/check_m64_natural_copilot_layer_repo_contract.ps1' -NodeScript 'backend/scripts/m64_natural_copilot_layer_check.js' -SuccessTitle 'M64 DOGAL COPILOT YOL HARITASI' -SuccessInfo 'M64 green olmadan M65 acilmaz.'
