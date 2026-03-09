// backend/src/audit.js
import { prisma } from "./prisma.js";

export async function audit(req, { action, entity, entityId = null, meta = null }) {
  try {
    const u = req.user || null;
    await prisma.auditLog.create({
      data: {
        actorUserId: u?.id || null,
        actorRole: u?.role || null,
        action,
        entity,
        entityId: entityId ?? null,
        meta,
      },
    });
  } catch {
    // swallow
  }
}
