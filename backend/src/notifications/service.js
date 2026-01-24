import { prisma } from "../prisma.js";

// PRIMER uyumlu: scope bazlı notifikasyon
// scope: ROOM | COMPANY | DRIVER
// payloadJson: serbest Json (örn: {title,message,vehicleId,speed,...})
export async function createNotification({
  type,
  scope,
  payloadJson,
  companyId = null,
  roomId = null,
  driverId = null,
  vehicleId = null,
  shiftId = null,
}) {
  return prisma.notification.create({
    data: { type, scope, payloadJson, companyId, roomId, driverId, vehicleId, shiftId },
  });
}
