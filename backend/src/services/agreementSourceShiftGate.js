import { httpError } from "../errors/http.js";

export const SOURCE_SHIFT_AGREEMENT_BLOCKING_STATUSES = ["REQUESTED", "COUNTERED", "APPROVED", "ACTIVE", "DONE"];

function directCreateBlockedMessage() {
  return "Doğrudan sözleşme açma kapalı. Önce vardiya oluşturup “Sözleşmeye Dönüştür” kullan.";
}

export async function findBlockingAgreementForSourceShift(tx, { sourceShiftId, companyId, roomId }) {
  const id = Number(sourceShiftId || 0);
  if (id <= 0) return null;
  return tx.commercialSource.findFirst({
    where: {
      sourceType: "AGREEMENT",
      shiftRootId: id,
      companyId: Number(companyId || 0),
      roomId: Number(roomId || 0) > 0 ? Number(roomId || 0) : undefined,
      agreement: {
        is: {
          companyId: Number(companyId || 0),
          roomId: Number(roomId || 0) > 0 ? Number(roomId || 0) : undefined,
          status: { in: SOURCE_SHIFT_AGREEMENT_BLOCKING_STATUSES },
        },
      },
    },
    orderBy: { id: "desc" },
    select: {
      agreementId: true,
      agreement: { select: { id: true, status: true } },
    },
  });
}

export async function requireSourceShiftForAgreementCreate(tx, { sourceShiftId, companyId, roomId }) {
  const id = Number(sourceShiftId || 0);
  if (id <= 0) throw httpError(400, "SOURCE_SHIFT_REQUIRED", directCreateBlockedMessage());
  const shift = await tx.shift.findUnique({
    where: { id },
    select: { id: true, companyId: true, roomId: true, status: true },
  });
  if (!shift || Number(shift.companyId || 0) !== Number(companyId || 0)) {
    throw httpError(400, "SOURCE_SHIFT_INVALID", "Kaynak vardiya bulunamadı.");
  }
  if (Number(roomId || 0) > 0 && Number(shift.roomId || 0) !== Number(roomId || 0)) {
    throw httpError(400, "SOURCE_SHIFT_ROOM_MISMATCH", "Kaynak vardiya ile seçilen oda aynı olmalı.");
  }
  if (String(shift.status || "").toUpperCase() === "DRAFT") {
    throw httpError(400, "SOURCE_SHIFT_INVALID_STATUS", "Taslak vardiyadan sözleşme açılamaz.");
  }
  const existing = await findBlockingAgreementForSourceShift(tx, { sourceShiftId: id, companyId, roomId });
  if (existing?.agreement) {
    const existingId = Number(existing.agreement.id || existing.agreementId || 0);
    const existingStatus = String(existing.agreement.status || "").toUpperCase();
    throw httpError(
      409,
      "SOURCE_SHIFT_AGREEMENT_ALREADY_OPEN",
      `Bu vardiya için sözleşme süreci zaten açık: Sözleşme #${existingId} (${existingStatus}).`
    );
  }
  return shift;
}
