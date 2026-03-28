param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host '=== M77 Repo Contract ==='
$files = @(
  'backend\scripts\m77_kvkk_uyum_katmani_check.js',
  'backend\src\kvkk\matrix.js',
  'backend\src\kvkk\enforcement.js',
  'backend\src\kvkk\retention.js',
  'backend\src\routes\kvkk.js',
  'backend\src\routes\live.js',
  'backend\src\routes\parent.js',
  'backend\src\routes\me.js',
  'backend\src\routes\schoolParentInvites.js',
  'backend\src\routes\companyPersonels.js',
  'backend\src\routes\vehicles.js',
  'backend\src\routes\auth_step2.js',
  'backend\src\routes\logs.js',
  'backend\src\routes\admin_logs.js',
  'backend\src\routes\shifts\shared.js',
  'tools\pack_m77_kvkk_uyum_katmani.ps1',
  'tools\check_m77_kvkk_uyum_katmani_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\verify_living_static.ps1',
  'tools\checks\living\check_m76_m81_static.ps1',
  'tools\packs\living\pack_phase_m76_m81.ps1',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'docs\RUNBOOK_M77_KVKK_UYUM_KATMANI.md',
  'docs\MILESTONE_M77_KVKK_UYUM_KATMANI.md',
  'docs\KVKK_VERI_GORUNURLUK_MATRISI_V1.md',
  'docs\KVKK_AYDINLATMA_ENVANTERI_V1.md',
  'docs\KVKK_RETENTION_ANONIMLESTIRME_V1.md',
  'docs\KVKK_AUDIT_ERISIM_IZI_V1.md',
  'docs\KVKK_ENFORCEMENT_YUZEYI_V1.md',
  'docs\KVKK_REDACTION_ENFORCEMENT_V1.md',
  'docs\KVKK_ROLE_PAYLOAD_DARALTMA_V1.md',
  'docs\KVKK_RETENTION_ENFORCEMENT_V1.md',
  'docs\KVKK_EXPORT_ERISIM_IZI_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'docs\STARTPACK_V1.md',
  'docs\NEXT_BACKLOG_V1.md',
  'README.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }
Write-Host '=== M77 Repo Contract PASS ==='
