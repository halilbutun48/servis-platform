param([string]$RepoRoot = ".")
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host "=== SYSTEM PANELS POLISH HOTFIX CHECK ==="

$checks = @(
  @{ Path = "web/src/panels/superadmin/SsotAlignmentPanel.jsx"; Needle = "<h2 style={{ margin: 0 }}>Sistem Standartları</h2>"; Msg = "ssot title missing" },
  @{ Path = "web/src/panels/superadmin/CommercialCorePanel.jsx"; Needle = "<h2 style={{ margin: 0 }}>Ticari Akış</h2>"; Msg = "commercial title missing" },
  @{ Path = "web/src/panels/superadmin/TrustQualityPanel.jsx"; Needle = "<h2 style={{ margin: 0 }}>Güven ve Kalite</h2>"; Msg = "trust title missing" },
  @{ Path = "web/src/panels/superadmin/NaturalCopilotPanel.jsx"; Needle = "<h2 style={{ margin: 0 }}>Yardımcı Altyapısı</h2>"; Msg = "copilot infra title missing" },
  @{ Path = "web/src/panels/superadmin/SsotAlignmentPanel.jsx"; Needle = 'api("/api/ssot-alignment/manifest")'; Msg = "ssot api token cleanup missing" },
  @{ Path = "web/src/panels/superadmin/CommercialCorePanel.jsx"; Needle = 'api("/api/commercial-core/manifest")'; Msg = "commercial api token cleanup missing" },
  @{ Path = "web/src/panels/superadmin/TrustQualityPanel.jsx"; Needle = 'api("/api/trust-quality/manifest")'; Msg = "trust api token cleanup missing" },
  @{ Path = "web/src/panels/superadmin/NaturalCopilotPanel.jsx"; Needle = 'api("/api/natural-copilot/manifest")'; Msg = "copilot api token cleanup missing" }
)

foreach ($c in $checks) {
  $full = Join-Path $RepoRoot $c.Path
  if (-not (Test-Path $full)) { throw "missing file: $($c.Path)" }
  $text = Get-Content $full -Raw
  if ($text -notmatch [regex]::Escape($c.Needle)) { throw $c.Msg }
  if ($text -match "useSession") { throw "session dependency still present in $($c.Path)" }
  Write-Host "OK $($c.Path)"
}
Write-Host "=== SYSTEM PANELS POLISH HOTFIX CHECK PASS ==="
