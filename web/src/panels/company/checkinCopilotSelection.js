import { displayStatusLabel } from "../../utils/displayStatus.js";

export function buildCompanyCheckinCopilotSelection({ shift = null, counts = {}, scopeKey = "/company/checkin" } = {}) {
  const shiftId = Number(shift?.id || 0);
  if (!Number.isInteger(shiftId) || shiftId <= 0) return null;

  const status = String(shift?.status || "").toUpperCase();
  const boardCount = Number(counts?.BOARD || 0);
  const alightCount = Number(counts?.ALIGHT || 0);
  const vehiclePlate = String(shift?.vehicle?.plate || "").trim();
  const driverName = String(shift?.driver?.fullName || "").trim();

  return {
    scopeKey: String(scopeKey || "/company/checkin"),
    entityType: "shift",
    entityId: shiftId,
    selectedRecordType: "shift",
    selectedRecordId: shiftId,
    label: `Vardiya ${shiftId}`,
    summary: [
      displayStatusLabel(status),
      vehiclePlate ? `Araç ${vehiclePlate}` : "Araç bilgisi yok",
      driverName ? `Sürücü ${driverName}` : "Sürücü bilgisi yok",
      `Biniş ${boardCount}`,
      `İniş ${alightCount}`,
    ].filter(Boolean).join(" • "),
    fields: [
      { label: "Durum", value: displayStatusLabel(status), help: "Seçili vardiyanın güncel durumunu gösterir." },
      { label: "Araç", value: vehiclePlate || "-", help: "Seçili vardiyaya bağlı aracı gösterir." },
      { label: "Sürücü", value: driverName || "-", help: "Seçili vardiyaya bağlı sürücüyü gösterir." },
      { label: "Biniş", value: String(boardCount), help: "Yetkili biniş olaylarının sayısını gösterir." },
      { label: "İniş", value: String(alightCount), help: "Yetkili iniş olaylarının sayısını gösterir." },
    ],
    facts: {
      screenType: "CHECKIN",
      selectedRecordType: "shift",
      selectedRecordId: shiftId,
      selectedShiftId: shiftId,
      status,
      vehiclePlate,
      driverName,
      boardingCount: boardCount,
      alightingCount: alightCount,
    },
  };
}
