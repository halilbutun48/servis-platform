function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function buildRoomAgreementApprovalReplayKey({ agreementId, vehicleId, driverId, finalStatus } = {}) {
  return [
    "room-agreement-approval-v1",
    positiveInteger(agreementId) || "-",
    positiveInteger(vehicleId) || "-",
    positiveInteger(driverId) || "-",
    String(finalStatus || "").trim().toUpperCase() || "-",
  ].join(":");
}

export function buildRoomAgreementApprovalAuditMeta({
  agreementId,
  roomId,
  companyId,
  vehicleId,
  driverId,
  finalStatus,
  idempotent = false,
} = {}) {
  const normalizedStatus = String(finalStatus || "").trim().toUpperCase();
  return {
    replayKey: buildRoomAgreementApprovalReplayKey({ agreementId, vehicleId, driverId, finalStatus: normalizedStatus }),
    agreementId: positiveInteger(agreementId),
    roomId: positiveInteger(roomId),
    companyId: positiveInteger(companyId),
    vehicleId: positiveInteger(vehicleId),
    driverId: positiveInteger(driverId),
    finalStatus: normalizedStatus || null,
    idempotent: idempotent === true,
  };
}
