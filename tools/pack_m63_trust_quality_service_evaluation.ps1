param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack -RepoRoot $RepoRoot -Title 'M63 GUVEN + KALITE + HIZMET DEGERLENDIRME' -Info 'This pack opens M63 with docs, repo-contract, and backend/web skeleton verification.' -RepoContractScript 'tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1' -NodeScript 'backend/scripts/m63_trust_quality_service_evaluation_check.js' -SuccessTitle 'M63 GUVEN + KALITE + HIZMET DEGERLENDIRME' -SuccessInfo 'M63 green olmadan M64 acilmaz.'
