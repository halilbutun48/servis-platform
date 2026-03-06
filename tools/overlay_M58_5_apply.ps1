# tools/overlay_M58_5_apply.ps1
# APPLY OVERLAY M58.5 — Shift DONE reconcile monitor + transactional completeShift
# - Adds backend/src/jobs/shiftCompletionMonitor.js
# - Wires it into backend/src/jobs/index.js
# - Makes completeShift update progress+status in a transaction and always emits shift:update

$ErrorActionPreference = "Stop"

function ReadText($p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteText($p, $s) { [System.IO.File]::WriteAllText($p, $s, [System.Text.Encoding]::UTF8) }

$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Write-Host ""
Write-Host "=== APPLY OVERLAY M58.5: Shift DONE reconcile + completeShift transaction ===" -ForegroundColor Cyan
Write-Host "Repo: $repo" -ForegroundColor DarkGray

# 1) Add job file
$jobPath = Join-Path $repo "backend\src\jobs\shiftCompletionMonitor.js"
if (-not (Test-Path $jobPath)) {
  $content = @'
// backend/src/jobs/shiftCompletionMonitor.js
import { prisma } from "../prisma.js";

/**
 * If a shift has shiftProgress.completedAt set but shift.status is not DONE,
 * reconcile it to DONE and emit shift:update so UI refreshes.
 *
 * This protects against partial failures (progress updated but shift status not)
 * and ensures Company/Room does not show stale ACTIVE for completed shifts.
 */
export function startShiftCompletionMonitor(io, opts = {}) {
  const intervalMs = opts.intervalMs ?? 5000;
  let running = false;
  let timer = null;

  async function emitShiftUpdate(shift, payload = {}) {
    if (!io || !shift) return;
    const base = { shiftId: shift.id, ...payload };
    io?.to?.(`company:${shift.companyId}`)?.emit?.("shift:update", base);
    if (shift.roomId) io?.to?.(`room:${shift.roomId}`)?.emit?.("shift:update", base);
    io?.to?.(`shift:${shift.id}`)?.emit?.("shift:update", base);
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      const rows = await prisma.shiftProgress.findMany({
        where: {
          completedAt: { not: null },
          shift: { status: { not: "DONE" } },
        },
        take: 50,
        orderBy: { completedAt: "asc" },
        select: { shiftId: true },
      });

      for (const r of rows) {
        const shiftId = Number(r.shiftId);
        if (!shiftId) continue;

        // idempotent update
        const upd = await prisma.shift.updateMany({
          where: { id: shiftId, NOT: { status: "DONE" } },
          data: { status: "DONE" },
        });

        if (upd.count > 0) {
          const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
          await emitShiftUpdate(shift, { action: "reconcile", status: "DONE" });
        }
      }
    } catch (e) {
      // don't crash monitors
      console.error("[shiftCompletionMonitor] tick error:", e?.message || e);
    } finally {
      running = false;
    }
  }

  // run once on start
  tick().catch(() => {});

  timer = setInterval(tick, intervalMs);

  return () => {
    try { clearInterval(timer); } catch {}
  };
}
'@
  WriteText $jobPath ($content -replace "`r`n", "`n")
  Write-Host "✅ Added: $jobPath" -ForegroundColor Green
} else {
  Write-Host "ℹ️ Exists: $jobPath (skipped)" -ForegroundColor Yellow
}

# 2) Wire job into jobs/index.js
$idxPath = Join-Path $repo "backend\src\jobs\index.js"
$raw = ReadText $idxPath
$raw = $raw.Replace("`r`n","`n")

if ($raw -notmatch 'startShiftCompletionMonitor') {
  # insert import after routeLearnMonitor import
  $anchorImport = 'import { startRouteLearnMonitor } from "./routeLearnMonitor.js";'
  if ($raw -notmatch [regex]::Escape($anchorImport)) { throw "Anchor import not found in jobs/index.js" }

  $raw = $raw.Replace($anchorImport, $anchorImport + "`nimport { startShiftCompletionMonitor } from `"./shiftCompletionMonitor.js`";")

  # insert stopFns.push after startRouteLearnMonitor
  $anchorPush = 'stopFns.push(startRouteLearnMonitor(io, { intervalMs: opts.routeLearnIntervalMs }));'
  if ($raw -notmatch [regex]::Escape($anchorPush)) { throw "Anchor push not found in jobs/index.js" }

  $raw = $raw.Replace($anchorPush, $anchorPush + "`n`n  // ✅ M58.5: reconcile shifts that are completed (progress.completedAt) but still not DONE`n  stopFns.push(startShiftCompletionMonitor(io, { intervalMs: opts.shiftCompletionIntervalMs }));")

  WriteText $idxPath $raw
  Write-Host "✅ Patched: $idxPath" -ForegroundColor Green
} else {
  Write-Host "ℹ️ jobs/index.js already wired (skipped)" -ForegroundColor Yellow
}

# 3) Make completeShift transactional (backend/src/routes/driver.js)
$drvPath = Join-Path $repo "backend\src\routes\driver.js"
$raw = ReadText $drvPath
$raw = $raw.Replace("`r`n","`n")

$start = 'async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {'
$end   = '  // NOTE: Kept as-is to avoid breaking clients.'
$i = $raw.IndexOf($start)
if ($i -lt 0) { throw "completeShift start not found in driver.js" }
$j = $raw.IndexOf($end, $i)
if ($j -lt 0) { throw "completeShift end marker not found in driver.js" }

$newFn = @"
async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {
  const now = new Date();

  // ✅ M58.5: atomic completion (progress + status) to avoid partial states
  const [, updatedShift] = await prisma.\$transaction([
    prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { completedAt: now },
      create: { shiftId, lastReachedOrder: 0, completedAt: now },
    }),
    prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } }),
  ]);

  // ✅ Refresh lists
  try {
    emitShift(io, updatedShift, "shift:update", { action: "complete", status: "DONE" });
  } catch {}

  // NOTE: Kept as-is to avoid breaking clients.
"@

$raw = $raw.Substring(0, $i) + $newFn + $raw.Substring($j)

WriteText $drvPath $raw
Write-Host "✅ Patched: $drvPath" -ForegroundColor Green

Write-Host ""
Write-Host "DONE ✅  Now run: .\tools\pack.ps1 -To 41" -ForegroundColor Cyan
