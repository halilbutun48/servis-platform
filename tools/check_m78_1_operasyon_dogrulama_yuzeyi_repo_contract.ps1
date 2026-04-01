param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')

Write-Host '=== M78.1 Repo Contract ==='
$files = @(
  'backend\scripts\m78_1_operasyon_dogrulama_yuzeyi_check.js',
  'backend\src\ops\operationVerificationManifest.js',
  'backend\src\routes\operationVerification.js',
  'web\src\panels\superadmin\OperationVerificationPanel.jsx',
  'tools\pack_m78_1_operasyon_dogrulama_yuzeyi.ps1',
  'tools\check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1',
  'tools\milestone_pack_manifest.json',
  'tools\STABLE_TO.txt',
  'docs\RUNBOOK_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md',
  'docs\MILESTONE_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md',
  'docs\NEXT_BACKLOG_V1.md',
  'docs\MILESTONE_REGISTRY_V1.md',
  'tools\README.md',
  'tools\PRIMER_SNAPSHOT.md',
  'README.md'
)
foreach ($rel in $files) { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $rel }

$server = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\server.js'
$mounts = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\bootstrap\routeMounts.js'
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'backend\src\routes\operationVerification.js'
$app = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\App.jsx'
$nav = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\layout\NavDock.jsx'
$superPanel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\SuperAdminPanel.jsx'
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'web\src\panels\superadmin\OperationVerificationPanel.jsx'
$readme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'README.md'
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\NEXT_BACKLOG_V1.md'
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_REGISTRY_V1.md'
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\README.md'
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\PRIMER_SNAPSHOT.md'
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\RUNBOOK_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md'
$milestone = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'docs\MILESTONE_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md'
$stable = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath 'tools\STABLE_TO.txt'

Assert-RepoContractContainsAny -Text ($server + "`n" + $mounts) -Needles @('operationverificationrouter','/api/operation-verification') -Label 'server mounts operation verification route'
Assert-RepoContractContainsAny -Text $route -Needles @('requirerole("super_admin")','/role-surface','/status-options','/proof-options') -Label 'route exposes minimal m78.1 endpoints'
Assert-RepoContractContainsAny -Text $app -Needles @('operationverificationpanel','/superadmin/operation-verification') -Label 'app registers operation verification panel'
Assert-RepoContractContainsAny -Text $nav -Needles @('operasyon doğrulama','/superadmin/operation-verification') -Label 'nav exposes operation verification'
Assert-RepoContractContainsAny -Text $superPanel -Needles @('/superadmin/operation-verification','operasyon doğrulama') -Label 'super admin quick access exposes operation verification'
Assert-RepoContractContainsAny -Text $panel -Needles @('m78.1 operasyon doğrulama yüzeyi','kanıt türleri','durum özeti','stable_to yine 78') -Label 'panel reflects m78.1 surface'
Assert-RepoContractContainsAny -Text $readme -Needles @('pack_m78_1_operasyon_dogrulama_yuzeyi.ps1','m78.1 minimal ürün yüzeyi','stable_to yine 78') -Label 'README reflects M78.1'
Assert-RepoContractContainsAny -Text $backlog -Needles @('m78.1','m79','kalıcı kayıt') -Label 'backlog moves after M78.1'
Assert-RepoContractContainsAny -Text $registry -Needles @('m78.1 - operasyon doğrulama yüzeyi','read-only yüzey','stable_to 78') -Label 'registry reflects M78.1'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('m78.1 pack','pack_m78_1_operasyon_dogrulama_yuzeyi.ps1','stable_to 78') -Label 'tools readme reflects M78.1'
Assert-RepoContractContainsAny -Text $toolsPrimer -Needles @('m78.1 minimal operasyon doğrulama yüzeyi','stable_to.txt`: `78`','sonraki odak: m79') -Label 'tools primer reflects M78.1'
Assert-RepoContractContainsAny -Text $runbook -Needles @('super admin','read-only','stable_to değeri değişmeden `78` kalmalı','m79') -Label 'runbook defines M78.1 scope'
Assert-RepoContractContainsAny -Text $milestone -Needles @('minimum bir ekran','stable_to','rol seçimi') -Label 'milestone defines M78.1 outputs'
Assert-RepoContractContainsAny -Text $stable -Needles @('78') -Label 'STABLE_TO remains 78'
Write-Host '=== M78.1 Repo Contract PASS ==='
