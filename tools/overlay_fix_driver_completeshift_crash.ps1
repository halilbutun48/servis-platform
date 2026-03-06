# tools/overlay_fix_driver_completeshift_crash.ps1
# Fix: backend/src/routes/driver.js has corrupted "prisma.$transaction" due to PS expansion,
# causing SyntaxError and API not starting.
# This script rewrites completeShift() block safely (no regex, no $ expansion).

$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

Write-Host ""
Write-Host "=== APPLY FIX: Driver completeShift crash (prisma.$transaction corruption) ===" -ForegroundColor Cyan

$fp = Join-Path $PSScriptRoot "..\backend\src\routes\driver.js"
$fp = [System.IO.Path]::GetFullPath($fp)

$raw = ReadText $fp
$raw = $raw.Replace("`r`n","`n")

$startMarker = "async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {"
$endMarker = "`nexport function driverRouter(io) {"

$i = $raw.IndexOf($startMarker)
if ($i -lt 0) { throw "Start marker not found in driver.js: completeShift()" }

$j = $raw.IndexOf($endMarker, $i)
if ($j -lt 0) { throw "End marker not found in driver.js: export function driverRouter" }

$replacement = @'
async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {
  const now = new Date();

  // ✅ Atomik tamamlama: progress.completedAt + shift.status DONE
  // (fixes partial writes and makes behavior deterministic)
  const [, freshShift] = await prisma.$transaction([
    prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { completedAt: now },
      create: { shiftId, lastReachedOrder: 0, completedAt: now },
    }),
    prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } }),
  ]);

  // NOTE: Kept as-is to avoid breaking clients.
  const payload = { shiftId, completed: true, nextStop: null };
  io?.to(`shift:${shiftId}`).emit("route:progress", payload);
  io?.to(`room:${roomId}`).emit("route:progress", payload);
  io?.to(`company:${companyId}`).emit("route:progress", payload);
  if (vehicleId) io?.to(`vehicle:${vehicleId}`).emit("route:progress", { ...payload, vehicleId });

  // ✅ Refresh panels: shift:update (Company/Room lists)
  try {
    emitShift(io, freshShift, "shift:update", { action: "complete", status: "DONE" });
  } catch {}
}

'@

$raw2 = $raw.Substring(0, $i) + $replacement + $raw.Substring($j + 1)  # keep the leading newline of endMarker in file

WriteText $fp $raw2
Write-Host "✅ Patched: $fp" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
