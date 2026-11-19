export function normalizeRouteEvidenceReturnPath(value) {
  const text = String(value || "").trim();
  return text.startsWith("/room/financial-operations?") ? text : "";
}
