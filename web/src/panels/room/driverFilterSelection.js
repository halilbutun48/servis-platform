export function shouldKeepDriverContext({
  focusDriverId,
  filteredDrivers = [],
  visibleStatusDrivers = [],
  tab = "status",
  q = "",
  statusFilter = "ALL",
  boundFilter = "ALL",
  statusColFilter = {},
} = {}) {
  const columnFilterActive = Object.values(statusColFilter || {}).some((value) => {
    if (value == null || value === "") return false;
    return String(value).toUpperCase() !== "ALL";
  });
  const filterActive = Boolean(String(q || "").trim())
    || statusFilter !== "ALL"
    || boundFilter !== "ALL"
    || columnFilterActive;
  if (!filterActive) return true;

  const visible = tab === "status" ? visibleStatusDrivers : filteredDrivers;
  return Array.isArray(visible) && visible.some((driver) => Number(driver?.id) === Number(focusDriverId));
}
