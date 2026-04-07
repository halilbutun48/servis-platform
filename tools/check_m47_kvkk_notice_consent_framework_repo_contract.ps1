param([string]$RepoRoot = (Resolve-Path '.').Path)
$ErrorActionPreference = 'Stop'


. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

function ReadText([string]$rel){
  $path = Join-Path $RepoRoot $rel
  return [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel){
  if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){
  foreach($needle in $needles){
    if ($needle -and $txt.Contains(([string]$needle).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function MustContainText([string]$txt,[string]$needle,[string]$label){
  if (-not $txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}
function MustNotContainText([string]$txt,[string]$needle,[string]$label){
  if ($txt.Contains(([string]$needle).Normalize())) { throw "FAIL $label" }
  Write-Host "OK $label"
}

Write-Host 'INFO Checking M47 files'
@(
  'backend\src\kvkk\documents.js',
  'backend\src\routes\kvkk.js',
  'backend\src\routes\me.js',
  'web\src\layout\AppShell.jsx',
  'web\src\panels\shared\KvkkConsentGate.jsx',
  'backend\scripts\m47_kvkk_notice_consent_framework_check.js',
  'tools\pack_m47_kvkk_notice_consent_framework.ps1',
  'tools\check_m47_kvkk_notice_consent_framework_repo_contract.ps1',
  'docs\RUNBOOK_M47_KVKK_NOTICE_CONSENT_FRAMEWORK.md'
) | ForEach-Object { MustExist $_ }

$docs = ReadText 'backend\src\kvkk\documents.js'
$kvkk = ReadText 'backend\src\routes\kvkk.js'
$me = ReadText 'backend\src\routes\me.js'
$appShell = ReadText 'web\src\layout\AppShell.jsx'
$gate = ReadText 'web\src\panels\shared\KvkkConsentGate.jsx'
$pack = ReadText 'tools\pack_m47_kvkk_notice_consent_framework.ps1'
$runtime = ReadText 'backend\scripts\m47_kvkk_notice_consent_framework_check.js'
$runbook = ReadText 'docs\RUNBOOK_M47_KVKK_NOTICE_CONSENT_FRAMEWORK.md'

Write-Host 'INFO Checking KVKK document registry'
MustContainText $docs 'LOCATION_NOTICE' 'kvkk docs include location notice'
MustContainText $docs 'LOCATION_CONSENT' 'kvkk docs include location consent'
MustContainAny $docs @('getKvkkSummaryForUser','requiredCount','blocking') 'kvkk docs expose summary helper'

Write-Host 'INFO Checking KVKK routes'
MustContainText $kvkk '/documents/current' 'kvkk current documents endpoint exists'
MustContainText $kvkk '/summary' 'kvkk summary endpoint exists'
MustContainText $kvkk '/consents/accept-many' 'kvkk bulk accept endpoint exists'
MustContainAny $kvkk @('KVKK_DOC_ACCEPT','KVKK_DOC_REVOKE') 'kvkk audit actions exist'

Write-Host 'INFO Checking me + UI gate'
MustContainAny $me @('kvkk: {','pendingDocKeys','acceptedCount') 'me response includes kvkk summary'
MustContainText $appShell '<KvkkConsentGate />' 'app shell renders kvkk gate'
MustContainAny $gate @('/api/kvkk/documents/current','/api/kvkk/consents/accept-many') 'kvkk gate uses new endpoints'

Write-Host 'INFO Checking pack/runtime/runbook'
MustNotContainText $pack 'pack_m46_9_session_refresh_security.ps1' 'pack is self-only and does not chain m46.9'
MustContainText $pack 'node scripts/m47_kvkk_notice_consent_framework_check.js' 'pack runs m47 runtime check'
MustContainAny $runtime @('LOCATION_NOTICE','LOCATION_CONSENT','KVKK_DOC_ACCEPT') 'runtime checks kvkk docs and audit'
MustContainAny $runbook @('Aydınlatma','KVKK') 'runbook mentions kvkk notice'
MustContainAny $runbook @('Açık rıza','consent') 'runbook mentions consent'

Write-Host 'M47 KVKK NOTICE / CONSENT FRAMEWORK REPO CONTRACT PASS'
