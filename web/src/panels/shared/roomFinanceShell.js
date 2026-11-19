const REALIZED_ROOM_FINANCE_VIEWS = new Set(["overview", "expenses", "service-cost"]);

export function isRealizedRoomFinanceView(financeView) {
  return REALIZED_ROOM_FINANCE_VIEWS.has(String(financeView || ""));
}

export function roomFinanceShellCopy({ financeView, roomName = "Taşımacılık Firması" } = {}) {
  if (!isRealizedRoomFinanceView(financeView)) return null;
  const normalizedRoomName = String(roomName || "Taşımacılık Firması").trim() || "Taşımacılık Firması";
  return {
    eyebrow: "ROOM FİNANS",
    title: "Finans Kontrol Merkezi",
    subtitle: `${normalizedRoomName} · Dönem ve araç kapsamı tek finans görünümünden yönetilir`,
  };
}
