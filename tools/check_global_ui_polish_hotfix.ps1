param(
  [Parameter(Mandatory = $true)]
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
Write-Host '=== GLOBAL UI POLISH HOTFIX CHECK ==='

$checks = @(
  @{ Path = 'web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle = 'Canlı Sağlık ve Risk Özeti'; Msg = 'observability title' },
  @{ Path = 'web/src/panels/superadmin/ObservabilityPanel.jsx'; Needle = 'Henüz canlı olay yok.'; Msg = 'observability empty state' },
  @{ Path = 'web/src/panels/superadmin/PilotLaunchGatePanel.jsx'; Needle = 'Sahaya Çıkış Kontrolü'; Msg = 'pilot gate title' },
  @{ Path = 'web/src/panels/superadmin/FieldAcceptanceCenter.jsx'; Needle = 'Saha Kabul Merkezi'; Msg = 'field acceptance title' },
  @{ Path = 'web/src/panels/superadmin/SsotAlignmentPanel.jsx'; Needle = 'Sistem Standartları'; Msg = 'ssot title' },
  @{ Path = 'web/src/panels/superadmin/CommercialCorePanel.jsx'; Needle = 'Ticari Akış'; Msg = 'commercial title' },
  @{ Path = 'web/src/panels/superadmin/TrustQualityPanel.jsx'; Needle = 'Güven ve Kalite'; Msg = 'trust title' },
  @{ Path = 'web/src/panels/superadmin/NaturalCopilotPanel.jsx'; Needle = 'Yardımcı Altyapısı'; Msg = 'natural copilot title' },
  @{ Path = 'web/src/panels/superadmin/OperationVerificationPanel.jsx'; Needle = 'Operasyon Doğrulama'; Msg = 'operation verification title' }
)

foreach ($c in $checks) {
  $full = Join-Path $RepoRoot $c.Path
  if (!(Test-Path $full)) { throw "missing file: $($c.Path)" }
  $text = Get-Content -Path $full -Raw -Encoding UTF8
  if ($text -notmatch [regex]::Escape($c.Needle)) { throw "missing text: $($c.Msg)" }
  Write-Host "OK $($c.Msg)"
}

$noMilestone = @(
  'web/src/panels/superadmin/ObservabilityPanel.jsx',
  'web/src/panels/superadmin/PilotLaunchGatePanel.jsx',
  'web/src/panels/superadmin/FieldAcceptanceCenter.jsx',
  'web/src/panels/superadmin/SsotAlignmentPanel.jsx',
  'web/src/panels/superadmin/CommercialCorePanel.jsx',
  'web/src/panels/superadmin/TrustQualityPanel.jsx',
  'web/src/panels/superadmin/NaturalCopilotPanel.jsx',
  'web/src/panels/superadmin/OperationVerificationPanel.jsx'
)

foreach ($rel in $noMilestone) {
  $full = Join-Path $RepoRoot $rel
  $text = Get-Content -Path $full -Raw -Encoding UTF8
  if ($text -match 'M\d{2}(?:\.\d+)?') { throw "milestone text still visible: $rel" }
  Write-Host "OK cleaned milestone text in $rel"
}

Write-Host '=== GLOBAL UI POLISH HOTFIX CHECK PASS ==='
