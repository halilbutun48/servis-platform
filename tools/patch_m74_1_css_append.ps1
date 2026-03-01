# tools/patch_m74_1_css_append.ps1
$ErrorActionPreference = "Stop"

$cssFile = Join-Path (Get-Location) "web\src\index.css"
if (!(Test-Path $cssFile)) { throw "Missing web/src/index.css" }

$marker = "/* M74.1 — Stop timeline pill statuses */"
$txt = Get-Content $cssFile -Raw
if ($txt -like "*$marker*") {
  Write-Host "OK: CSS already patched"
  exit 0
}

Add-Content -Path $cssFile -Value "`n`n$marker`n" -Encoding utf8
Add-Content -Path $cssFile -Value @'
/* M74.1 — Stop timeline pill statuses */
.stopTimeline {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
}
.stopTimeline.compact .stopPill { padding: 2px 9px; font-weight: 900; }
.stopPill { white-space: nowrap; }

.pill[data-status="PENDING"] {
  border-color: #475569;
  background: rgba(148, 163, 184, .10);
  color: #e2e8f0;
}
.pill[data-status="NEXT"] {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, .18);
  color: #fde68a;
}
.pill[data-status="REACHED"] {
  border-color: #22c55e;
  background: rgba(34, 197, 94, .18);
  color: #bbf7d0;
}
.pill[data-status="SKIPPED"] {
  border-color: #ef4444;
  background: rgba(239, 68, 68, .18);
  color: #fecaca;
}

'@ -Encoding utf8

Write-Host "PATCHED: web/src/index.css (appended statuses)"
