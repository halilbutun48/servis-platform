import { STATUS_LABELS, userFacingStatusLabel } from "./terminology.js";

export { STATUS_LABELS };

export function displayStatusLabel(status) {
  return String(status ?? "").trim() ? userFacingStatusLabel(status) : "-";
}
