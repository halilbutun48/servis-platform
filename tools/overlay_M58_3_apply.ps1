# tools/overlay_M58_3_apply.ps1
# APPLY OVERLAY M58.3 — Fix Room Agreements "Uzatma Talepleri" detection (robust extend fields)
# - Normalizes line endings
# - Removes accidental "\r\n" literal artifacts if present
# - Rewrites the loadAll() items block to compute extendItems robustly

$ErrorActionPreference = "Stop"

function ReadText($p) { return [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

Write-Host ""
Write-Host "=== APPLY OVERLAY M58.3: Fix Room extend list filter ===" -ForegroundColor Cyan

$roomFile = Join-Path $PSScriptRoot "..\web\src\panels\room\AgreementsPanel.jsx"
$roomFile = [System.IO.Path]::GetFullPath($roomFile)

$raw = ReadText $roomFile
$raw = $raw.Replace("`r`n", "`n")
# Remove literal backslash r n sequences that can break Babel
$raw = $raw.Replace("\r\n", "`n")
$raw = $raw.Replace("\\r\\n", "")

$start = '      const items = all?.items ?? [];'
$end   = '      setPending('

$i = $raw.IndexOf($start)
if ($i -lt 0) { throw "Anchor not found: const items = all?.items ?? [];" }
$j = $raw.IndexOf($end, $i + $start.Length)
if ($j -lt 0) { throw "Anchor not found: setPending(" }

$replacement = @"

      const items = all?.items ?? [];

      // ✅ M58.3: robust extend request detection (handles older/variant field names)
      const extend = items.filter((x) => {
        const es = String(x?.extendStatus || "NONE").toUpperCase();
        const reqEnd = x?.extendRequestedEndDate ?? x?.extendRequestedEndAt ?? x?.extendRequestedEnd ?? null;
        // REQUESTED/COUNTERED are canonical. PENDING is tolerated as alias for safety.
        return !!reqEnd && ["REQUESTED", "COUNTERED", "PENDING"].includes(es);
      });
      setExtendItems(extend);

"@

$raw = $raw.Substring(0, $i + $start.Length) + $replacement + $raw.Substring($j)

# Remove accidental duplicated setExtendItems lines if any remain later
$lines = $raw.Split("`n")
$out = New-Object System.Collections.Generic.List[string]
$seen = 0
foreach ($ln in $lines) {
  if ($ln -match '^\s*setExtendItems\(') {
    $seen++
    if ($seen -gt 1) { continue }
  }
  $out.Add($ln)
}
$raw = ($out -join "`n")

WriteText $roomFile $raw
Write-Host "✅ Patched: $roomFile" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Restart web dev server if open, then refresh Room Agreements." -ForegroundColor Cyan
