import { createAndEmitNotification } from "../../notifications/service.js";
import { buildNotifPayloadV1 } from "../../notifications/payloadV1.js";

const REASSIGN_REASON_TR = {
  VEHICLE_BREAKDOWN: "Araç arızası",
  VEHICLE_UNAVAILABLE: "Araç kullanılamıyor",
  DRIVER_SICK: "Sürücü hastalandı",
  DRIVER_UNAVAILABLE: "Sürücü müsait değil",
  OPS_REALLOCATION: "Operasyon yeniden planlandı",
  OTHER: "Diğer",
};

export async function emitReassignNotifications({ io, before, after, reason, note }) {
  const reasonLabel = REASSIGN_REASON_TR[String(reason || "OTHER")] || "Operasyon değişikliği";
  const shiftLabel = `Shift #${after.id}`;
  const vehicleBefore = before?.vehicle?.plate || (before?.vehicleId ? `#${before.vehicleId}` : "-");
  const vehicleAfter = after?.vehicle?.plate || (after?.vehicleId ? `#${after.vehicleId}` : "-");
  const driverBefore = before?.driver?.fullName || (before?.driverId ? `#${before.driverId}` : "-");
  const driverAfter = after?.driver?.fullName || (after?.driverId ? `#${after.driverId}` : "-");
  const baseMessage = `${shiftLabel}: ${reasonLabel}. Araç ${vehicleBefore} → ${vehicleAfter}, sürücü ${driverBefore} → ${driverAfter}${note ? ` • ${note}` : ""}`;

  await createAndEmitNotification({
    io,
    type: "SHIFT_REASSIGN",
    scope: "COMPANY",
    companyId: after.companyId,
    roomId: after.roomId || null,
    shiftId: after.id,
    vehicleId: after.vehicleId || null,
    payload: buildNotifPayloadV1({
      title: "Vardiya ataması değişti",
      message: baseMessage,
      vehicleId: after.vehicleId || null,
      kind: "SHIFT_REASSIGN",
    }),
  });

  if (after.roomId) {
    await createAndEmitNotification({
      io,
      type: "SHIFT_REASSIGN",
      scope: "ROOM",
      companyId: after.companyId,
      roomId: after.roomId,
      shiftId: after.id,
      vehicleId: after.vehicleId || null,
      payload: buildNotifPayloadV1({
        title: "Vardiya ataması güncellendi",
        message: baseMessage,
        vehicleId: after.vehicleId || null,
        kind: "SHIFT_REASSIGN",
      }),
    });
  }

  const beforeDriverUserId = Number(before?.driver?.userId || 0) || null;
  const afterDriverUserId = Number(after?.driver?.userId || 0) || null;

  if (afterDriverUserId) {
    await createAndEmitNotification({
      io,
      type: "SHIFT_REASSIGN",
      scope: "DRIVER",
      companyId: after.companyId,
      roomId: after.roomId || null,
      driverId: after.driverId || null,
      shiftId: after.id,
      vehicleId: after.vehicleId || null,
      userId: afterDriverUserId,
      payload: buildNotifPayloadV1({
        title: "Yeni görev atandı",
        message: `${shiftLabel}: ${vehicleAfter} aracı ve görev bilgileri size aktarıldı.${note ? ` • ${note}` : ""}`,
        vehicleId: after.vehicleId || null,
        kind: "SHIFT_REASSIGN",
      }),
    });
    io?.to?.(`user:${afterDriverUserId}`)?.emit?.("shift:update", { shiftId: after.id, action: "reassign", kind: "shift:update" });
    io?.to?.(`user:${afterDriverUserId}`)?.emit?.("route:plan", { shiftId: after.id, action: "reassign", kind: "route:plan" });
  }

  if (beforeDriverUserId && beforeDriverUserId !== afterDriverUserId) {
    await createAndEmitNotification({
      io,
      type: "SHIFT_REASSIGN",
      scope: "DRIVER",
      companyId: after.companyId,
      roomId: after.roomId || null,
      driverId: before.driverId || null,
      shiftId: after.id,
      vehicleId: before.vehicleId || null,
      userId: beforeDriverUserId,
      payload: buildNotifPayloadV1({
        title: "Görev sizden alındı",
        message: `${shiftLabel}: görev başka sürücüye aktarıldı. Neden: ${reasonLabel}${note ? ` • ${note}` : ""}`,
        vehicleId: before.vehicleId || null,
        kind: "SHIFT_REASSIGN",
      }),
    });
    io?.to?.(`user:${beforeDriverUserId}`)?.emit?.("shift:update", { shiftId: after.id, action: "reassign-removed", kind: "shift:update" });
    io?.to?.(`user:${beforeDriverUserId}`)?.emit?.("route:plan", { shiftId: after.id, action: "reassign-removed", kind: "route:plan" });
  }
}
