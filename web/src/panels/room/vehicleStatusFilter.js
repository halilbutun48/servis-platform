export function matchesVehicleStatusFilter(vehicle, { query = "", statusFilter = "ALL", resolveStatus } = {}) {
  if (!vehicle || vehicle.archivedAt) return false;
  const ui = typeof resolveStatus === "function" ? resolveStatus(vehicle) : String(vehicle.status || "").toUpperCase();
  if (statusFilter !== "ALL" && ui !== statusFilter) return false;
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return !normalizedQuery || String(vehicle.plate || "").toLowerCase().includes(normalizedQuery);
}
