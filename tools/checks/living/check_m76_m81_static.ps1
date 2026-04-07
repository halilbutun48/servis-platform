param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\..\check_m76a_2_final_normalization_archiving_repo_contract.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot '..\..\check_m77_kvkk_uyum_katmani_repo_contract.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot '..\..\check_m78_checklist_operasyon_dogrulama_repo_contract.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot '..\..\check_m82_1_backend_correctness_repo_contract.ps1') -RepoRoot $RepoRoot
Write-Host 'M76-M82 living static check PASS'
