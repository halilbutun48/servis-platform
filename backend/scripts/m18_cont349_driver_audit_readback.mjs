import prisma from "../src/prisma.js";

const rows = await prisma.auditLog.findMany({
  where: { entity: "Driver", entityId: 8, action: { in: ["AUTH_DRIVER_PIN_RESET", "AUTH_DRIVER_DEVICE_RESET", "AUTH_LOGIN_DEVICE_MISMATCH", "AUTH_LOGIN_FAIL"] } },
  orderBy: { id: "desc" },
  take: 20,
  select: { id: true, action: true, actorRole: true, actorUserId: true, entity: true, entityId: true, meta: true, createdAt: true },
});

console.log(JSON.stringify({
  count: rows.length,
  rows: rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorRole: row.actorRole,
    actorUserId: row.actorUserId,
    entity: row.entity,
    entityId: row.entityId,
    createdAt: row.createdAt,
    metaKeys: Object.keys(row.meta || {}),
    sessionVersionBumpedTo: row.meta?.sessionVersionBumpedTo ?? null,
    revokedSessions: row.meta?.revokedSessions ?? null,
  })),
}, null, 2));

await prisma.$disconnect();
