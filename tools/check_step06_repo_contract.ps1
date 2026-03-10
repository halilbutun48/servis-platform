param(
  [Parameter(Mandatory=$false)]
  [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

function Must-Contain {
  param(
    [string]$File,
    [string]$Needle,
    [string]$Label
  )
  if (-not (Test-Path $File)) { throw "missing file: $File" }
  $raw = [System.IO.File]::ReadAllText($File, [System.Text.Encoding]::UTF8)
  if ($raw.IndexOf($Needle, [System.StringComparison]::Ordinal) -lt 0) {
    throw "repo contract fail: $Label :: missing '$Needle' in $File"
  }
  Write-Host "OK $Label" -ForegroundColor Green
}

$repo = (Resolve-Path $RepoRoot).Path

$routePreview = Join-Path $repo "web/src/components/RoutePreviewModal.jsx"
$navUtil = Join-Path $repo "web/src/utils/navigation.js"
$companyShifts = Join-Path $repo "web/src/panels/company/ShiftsPanel.jsx"
$roomShifts = Join-Path $repo "web/src/panels/room/ShiftsPanel.jsx"
$navDock = Join-Path $repo "web/src/layout/NavDock.jsx"
$app = Join-Path $repo "web/src/App.jsx"
$schoolInvite = Join-Path $repo "web/src/panels/school/ParentInvitePanel.jsx"
$acceptInvite = Join-Path $repo "web/src/panels/public/AcceptParentInvitePanel.jsx"

Write-Host ""
Write-Host "=== STEP06 REPO CONTRACT CHECK ===" -ForegroundColor Cyan
Write-Host ""

Must-Contain $routePreview "Tam Rotayı Dış Navigasyonda Aç" "route preview external nav button"
Must-Contain $routePreview "Bu önizleme kuş uçuşu/mini görünüm mantığındadır." "route preview explanatory note"
Must-Contain $routePreview "openFullRouteNavigation(previewNavStops, null);" "route preview calls external nav utility"
Must-Contain $navUtil "Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9" "navigation util filters 0,0 coords"
Must-Contain $navUtil 'window.open(url,' "navigation util opens external route call"
Must-Contain $navUtil '"_blank"' "navigation util opens in new tab"
Must-Contain $navUtil 'noopener,noreferrer' "navigation util sets noopener noreferrer"

Must-Contain $companyShifts "openVehicleDetail(s)" "company list vehicle click detail handler"
Must-Contain $companyShifts "openDriverDetail(s)" "company list driver click detail handler"
Must-Contain $companyShifts "Araç Bilgileri" "company vehicle detail modal title"
Must-Contain $companyShifts "Sürücü Bilgileri" "company driver detail modal title"
Must-Contain $companyShifts 'const isSplitRoot = status === "SPLIT" && !Number(s?.splitRootId || 0);' "company split parent cleanup filter logic"

Must-Contain $roomShifts 'items.filter((s) => !(String(s?.status || "") === "SPLIT" && !Number(s?.splitRootId || 0)))' "room split parent cleanup filter logic"

Must-Contain $navDock "Parent Link" "school nav parent link label"
Must-Contain $navDock 'path: "/school/parents"' "school nav parent link path"
Must-Contain $schoolInvite "/api/school/parent-invites" "school parent invite panel endpoint"
Must-Contain $schoolInvite "#/accept-parent-invite?token=" "school invite public link builder"
Must-Contain $acceptInvite "/api/auth/parent-invite/accept" "public accept parent invite endpoint"
Must-Contain $app "AcceptParentInvitePanel" "public accept panel registered"
Must-Contain $app '"/accept-parent-invite"' "public accept route registered"

Write-Host ""
Write-Host "=== STEP06 REPO CONTRACT PASS OK ===" -ForegroundColor Green
Write-Host ""
