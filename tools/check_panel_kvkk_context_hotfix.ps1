param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host '=== PANEL KVKK CONTEXT HOTFIX CHECK ==='
$files = @(
  'web/src/panels/shared/PanelKvkkHint.jsx',
  'web/src/panels/superadmin/UsersPanel.jsx',
  'web/src/panels/superadmin/CompaniesPanel.jsx',
  'web/src/panels/superadmin/RoomsPanel.jsx',
  'web/src/panels/superadmin/ObservabilityPanel.jsx',
  'web/src/panels/superadmin/AuditLogsPanel.jsx',
  'web/src/panels/superadmin/OperationVerificationPanel.jsx'
)
foreach ($rel in $files) {
  $p = Join-Path $RepoRoot $rel
  if (!(Test-Path $p)) { throw "Missing $rel" }
  Write-Host "OK $rel exists"
}

$checks = @(
  @{ File='web/src/panels/superadmin/UsersPanel.jsx'; Needle='panelKey="users"'; Msg='users panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/CompaniesPanel.jsx'; Needle='panelKey="companies"'; Msg='companies panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/RoomsPanel.jsx'; Needle='panelKey="rooms"'; Msg='rooms panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle='panelKey="observability"'; Msg='observability panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/AuditLogsPanel.jsx'; Needle='panelKey="auditLogs"'; Msg='audit logs panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/OperationVerificationPanel.jsx'; Needle='panelKey="operationVerification"'; Msg='operation verification panel has KVKK hint' },
  @{ File='web/src/panels/superadmin/OperationVerificationPanel.jsx'; Needle='effectiveRole={selectedRole}'; Msg='operation verification uses selected role' },
  @{ File='web/src/panels/shared/PanelKvkkHint.jsx'; Needle='Matrix v'; Msg='shared hint renders matrix version' },
  @{ File='web/src/panels/shared/PanelKvkkHint.jsx'; Needle='Burada görünmez'; Msg='shared hint explains hidden data' }
)
foreach ($c in $checks) {
  $text = Get-Content (Join-Path $RepoRoot $c.File) -Raw
  if ($text -notmatch [regex]::Escape($c.Needle)) { throw $c.Msg }
  Write-Host "OK $($c.Msg)"
}
Write-Host '=== PANEL KVKK CONTEXT HOTFIX CHECK PASS ==='
