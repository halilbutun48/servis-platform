export function broadcastAgreementUpdate(io, {
  companyId = null,
  roomId = null,
  payload = {},
} = {}) {
  if (!io?.to) return;

  const nextPayload = payload && typeof payload === "object" ? payload : {};
  if (companyId != null) {
    io?.to?.(`company:${companyId}`)?.emit?.("agreement:update", nextPayload);
  }
  if (roomId != null) {
    io?.to?.(`room:${roomId}`)?.emit?.("agreement:update", nextPayload);
  }
}
