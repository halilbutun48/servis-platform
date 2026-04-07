param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host '=== LIVE GATE POLISH V2 HOTFIX CHECK ==='

$checks = @(
  @{ Path = 'backend/src/routes/observability.js'; Needle = '/recent-events'; Msg = 'observability recent-events route missing' },
  @{ Path = 'web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle = 'Canlı Sağlık ve Risk Özeti'; Msg = 'observability title missing' },
  @{ Path = 'web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle = 'Son canlı olaylar'; Msg = 'observability recent events section missing' },
  @{ Path = 'web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle = 'Henüz canlı olay yok.'; Msg = 'observability empty state missing' },
  @{ Path = 'web/src/panels/superadmin/PilotLaunchGatePanel.jsx'; Needle = 'Sahaya Çıkış Kontrolü'; Msg = 'pilot gate title missing' },
  @{ Path = 'web/src/panels/superadmin/PilotLaunchGatePanel.jsx'; Needle = 'Kritik risk listesi'; Msg = 'pilot gate risk summary missing' },
  @{ Path = 'web/src/panels/superadmin/PilotLaunchGatePanel.jsx'; Needle = 'Henüz kritik risk yok.'; Msg = 'pilot gate empty risk state missing' }
)

foreach ($c in $checks) {
  $full = Join-Path $RepoRoot $c.Path
  if (!(Test-Path $full)) { throw "missing file: $($c.Path)" }
  $text = Get-Content -Path $full -Raw -Encoding UTF8
  if ($text -notmatch [regex]::Escape($c.Needle)) { throw $c.Msg }
  Write-Host "OK $($c.Msg -replace ' missing','')"
}

Write-Host '=== LIVE GATE POLISH V2 HOTFIX CHECK PASS ==='
