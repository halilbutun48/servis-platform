# tools/overlay_M58_6_apply.ps1
# APPLY OVERLAY M58.6
# 1) backend/src/routes/driver.js -> rewrite completeShift() to be atomic + emit shift:update
# 2) web agreements panels -> add clear note: Agreement ACTIVE/DONE is time-based (endDate/endMin), not per-shift completion

$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

function ReplaceBlock {
  param(
    [Parameter(Mandatory=$true)][string]$raw,
    [Parameter(Mandatory=$true)][string]$startMarker,
    [Parameter(Mandatory=$true)][string]$endMarker,
    [Parameter(Mandatory=$true)][string]$replacement
  )
  $i = $raw.IndexOf($startMarker)
  if ($i -lt 0) { throw "Start marker not found: $startMarker" }
  $j = $raw.IndexOf($endMarker, $i + $startMarker.Length)
  if ($j -lt 0) { throw "End marker not found: $endMarker" }
  return $raw.Substring(0, $i) + $replacement + $raw.Substring($j)
}

Write-Host ""
Write-Host "=== APPLY OVERLAY M58.6: Shift DONE WS + Agreement status note ===" -ForegroundColor Cyan

# --- 1) backend/src/routes/driver.js ---
$driverFile = Join-Path $PSScriptRoot "..\backend\src\routes\driver.js"
$driverFile = [System.IO.Path]::GetFullPath($driverFile)

$raw = ReadText $driverFile
$raw = $raw.Replace("`r`n","`n")

$start = "async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {"
$end   = "`nexport function driverRouter(io) {"

$replacement = @'
async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {
  const now = new Date();

  // ✅ Atomik tamamlama: completedAt + shift.status DONE
  // (fixes partial writes and makes behavior deterministic)
  const [, freshShift] = await prisma.$transaction([
    prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { completedAt: now, pausedAt: null },
      create: { shiftId, lastReachedOrder: 0, startedAt: now, pausedAt: null, completedAt: now },
    }),
    prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } }),
  ]);

  // NOTE: route:progress retained for backward compatibility.
  const payload = { shiftId, completed: true, nextStop: null };
  io?.to(`shift:${shiftId}`).emit("route:progress", payload);
  io?.to(`room:${roomId}`).emit("route:progress", payload);
  io?.to(`company:${companyId}`).emit("route:progress", payload);
  if (vehicleId) io?.to(`vehicle:${vehicleId}`).emit("route:progress", { ...payload, vehicleId });

  // ✅ Refresh panels/lists: shift:update
  try {
    emitShift(io, freshShift, "shift:update", { action: "complete", status: "DONE" });
  } catch {}
}

export function driverRouter(io) {
'@

$raw2 = ReplaceBlock -raw $raw -startMarker $start -endMarker $end -replacement $replacement
WriteText $driverFile $raw2
Write-Host "✅ Patched: $driverFile" -ForegroundColor Green

# --- 2) web notes (Company/Room Agreements panels) ---
$companyPanel = Join-Path $PSScriptRoot "..\web\src\panels\company\AgreementsPanel.jsx"
$companyPanel = [System.IO.Path]::GetFullPath($companyPanel)
if (Test-Path $companyPanel) {
  $raw = ReadText $companyPanel
  $raw = $raw.Replace("`r`n","`n")
  if ($raw -notmatch "Agreement status.*time-based") {
    # Find the "Bu sayfa ne?" card body line and append note
    $needle = "Sözleşme (Agreement) rota/durak üretmez."
    if ($raw.Contains($needle)) {
      $raw = $raw.Replace($needle, $needle + " **Durum (ACTIVE/DONE) vardiya tamamlanınca değişmez; sözleşme, bitiş zamanı (endDate+endMin) geçince DONE olur.** Vardiyaların DONE durumunu Vardiyalar ekranından takip et.")
      WriteText $companyPanel $raw
      Write-Host "✅ Patched: $companyPanel" -ForegroundColor Green
    }
  }
}

$roomPanel = Join-Path $PSScriptRoot "..\web\src\panels\room\AgreementsPanel.jsx"
$roomPanel = [System.IO.Path]::GetFullPath($roomPanel)
if (Test-Path $roomPanel) {
  $raw = ReadText $roomPanel
  $raw = $raw.Replace("`r`n","`n")
  $needle = "Pending onay (REQUESTED)"
  if ($raw.Contains($needle) -and ($raw -notmatch "endDate\+endMin")) {
    $raw = $raw.Replace($needle, $needle + " • Not: Agreement ACTIVE/DONE **zaman bazlıdır** (endDate+endMin). Driver vardiyayı bitirse bile sözleşme endDate geçene kadar ACTIVE kalabilir.")
    WriteText $roomPanel $raw
    Write-Host "✅ Patched: $roomPanel" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
