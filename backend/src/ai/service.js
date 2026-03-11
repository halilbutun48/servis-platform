import { buildCopilotPayload, getShiftContext, getVehicleContext } from "./tools.js";

export async function runCopilotFoundation({ intent, entityType, entityId, user }) {
  let context = null;
  if (entityType === "shift") {
    context = await getShiftContext(user, entityId);
  } else if (entityType === "vehicle") {
    context = await getVehicleContext(user, entityId);
  } else {
    const e = new Error("UNSUPPORTED_ENTITY_TYPE");
    e.status = 400;
    e.code = "UNSUPPORTED_ENTITY_TYPE";
    throw e;
  }

  const base = buildCopilotPayload(intent, context);
  return {
    ok: true,
    copilotVersion: "M46.1",
    generatedAt: new Date().toISOString(),
    intent,
    entityType,
    entityId: Number(entityId),
    provider: "local-foundation",
    mode: "RULE_BASED",
    scope: {
      role: String(user.role || ""),
      roomId: user.roomId ?? null,
      companyId: user.companyId ?? null,
    },
    ...base,
  };
}
