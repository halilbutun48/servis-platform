// backend/src/jobs/agreementMonitor.js
import { prisma } from "../prisma.js";
import { computeFinalEndAtUTC, computeFirstStartAtUTC } from "../services/agreementConflict.js";

export function startAgreementMonitor(io, opts = {}) {
  const intervalMs = opts.intervalMs ?? 5000; // test/deterministic için kısa
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const now = new Date();

      const items = await prisma.agreement.findMany({
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
      });

      for (const ag of items) {
        const endAt = computeFinalEndAtUTC(ag);
        const startAt = computeFirstStartAtUTC(ag);

        if (ag.status === "APPROVED" && now >= startAt) {
          const u = await prisma.agreement.update({ where: { id: ag.id }, data: { status: "ACTIVE" } });
          io?.to?.(`company:${u.companyId}`)?.emit?.("agreement:update", { id: u.id, kind: "active" });
          io?.to?.(`room:${u.roomId}`)?.emit?.("agreement:update", { id: u.id, kind: "active" });
        }

        if (now > endAt) {
          const u = await prisma.agreement.update({ where: { id: ag.id }, data: { status: "DONE" } });
          io?.to?.(`company:${u.companyId}`)?.emit?.("agreement:update", { id: u.id, kind: "done" });
          io?.to?.(`room:${u.roomId}`)?.emit?.("agreement:update", { id: u.id, kind: "done" });
        }
      }
    } finally {
      running = false;
    }
  }

  // run once on start
  tick().catch(() => {});
  const t = setInterval(() => tick().catch(() => {}), intervalMs);

  return () => clearInterval(t);
}