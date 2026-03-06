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
