# tools/overlay_M58_4_apply.ps1
# APPLY OVERLAY M58.4 — Driver complete => emit shift:update (Company/Room refresh)
# No regex. Safe string insertion.
$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

Write-Host ""
Write-Host "=== APPLY OVERLAY M58.4: Driver DONE emits shift:update ===" -ForegroundColor Cyan

$fp = Join-Path $PSScriptRoot "..\backend\src\routes\driver.js"
$fp = [System.IO.Path]::GetFullPath($fp)

$raw = ReadText $fp
$raw = $raw.Replace("`r`n","`n")

# Insert after the last route:progress emit line inside completeShift()
$anchor = '  if (vehicleId) io?.to(`vehicle:${vehicleId}`).emit("route:progress", { ...payload, vehicleId });'
if (-not $raw.Contains($anchor)) {
  throw "Anchor not found in driver.js (completeShift route:progress line)."
}

if ($raw -match 'emitShift\(io,\s*freshShift,\s*"shift:update"') {
  Write-Host "ℹ️ shift:update emit already present. Skipping." -ForegroundColor Yellow
} else {
  $insert = @"

  // ✅ M58.4: refresh Company/Room panels — emit shift:update on completion
  try {
    const freshShift = await prisma.shift.findUnique({ where: { id: shiftId } });
    emitShift(io, freshShift, "shift:update", { action: "complete", status: "DONE" });
  } catch {}

"@
  $raw = $raw.Replace($anchor, $anchor + $insert)
  WriteText $fp $raw
  Write-Host "✅ Patched: $fp" -ForegroundColor Green
}

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
