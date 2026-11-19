const normalize = (value) => String(value || "").trim().toLocaleLowerCase("tr-TR");

export function resolveShiftActionPath(path = "") {
  const normalizedPath = normalize(path).split("?")[0];
  if (normalizedPath === "/school" || normalizedPath.startsWith("/school/")) return "/school/shifts";
  if (normalizedPath === "/organization" || normalizedPath.startsWith("/organization/")) return "/organization/shifts";
  if (normalizedPath === "/company" || normalizedPath.startsWith("/company/")) return "/company/shifts";
  return "/room/shifts";
}

function selectionFacts(selection) {
  return selection?.facts || selection?.liveFacts || selection?.structuredFacts || {};
}

function statusText(selection, facts) {
  return normalize([
    selection?.selectedRecordStatus,
    selection?.status,
    facts?.selectedRecordStatus,
    facts?.summary,
    facts?.copilotSummary,
  ].filter(Boolean).join(" • "));
}

function hasMissingCost(selection, facts, path) {
  if (!path.includes("/financial-operations")) return false;
  const missing = [facts?.missing, facts?.missingCosts, facts?.missingOptionalCosts, selection?.missingCosts]
    .find((value) => Array.isArray(value) && value.length > 0);
  if (missing) return true;
  const text = statusText(selection, facts);
  return /(maliyet|gider).*(eksik|tamamla|bekliyor)|eksik.*(maliyet|gider)/i.test(text);
}

function hasMissingAssignment(selection, facts) {
  if (String(facts?.screenType || "").toUpperCase() !== "SHIFTS") return false;
  if (Number(facts?.driverId || facts?.selectedDriverId || 0) > 0) return false;
  const text = statusText(selection, facts);
  return /(sürücü|driver)\s*:\s*(yok|belirtilmedi|eksik)|(araç|vehicle)\s*:\s*(yok|belirtilmedi|eksik)/i.test(text);
}

function hasVerifiedSuccess(selection, facts) {
  const text = statusText(selection, facts);
  return /(işlem|kayıt|vardiya|sözleşme|teklif).*(tamamlandı|başarılı|onaylandı)|\b(pass|success|completed)\b/i.test(text)
    || [selection?.operationStatus, facts?.operationStatus, facts?.verifiedStatus].some((value) => /^(PASS|SUCCESS|COMPLETED)$/i.test(String(value || "").trim()));
}

export function resolveSeferAbiContextCue({ path = "", selection = null } = {}) {
  const normalizedPath = normalize(path);
  if (!selection || typeof selection !== "object") return null;
  const facts = selectionFacts(selection);
  if (hasMissingAssignment(selection, facts)) {
    return {
      kind: "missing-assignment",
      tone: "warning",
      title: "Eksik atama",
      text: "Bu vardiyanın sürücüsü henüz atanmadı.",
      suggestion: "İstersen ilgili kaydı birlikte inceleyelim.",
      action: { actionKind: "OPEN_ROUTE", path: resolveShiftActionPath(path), label: "Vardiyaya git" },
    };
  }
  if (hasMissingCost(selection, facts, normalizedPath)) {
    return {
      kind: "missing-cost",
      tone: "warning",
      title: "Eksik maliyet",
      text: "Bu teklifin bazı maliyet bilgileri eksik.",
      suggestion: "İstersen ilgili kaydı birlikte inceleyelim.",
      action: { actionKind: "OPEN_ROUTE", path: "/room/financial-operations?view=quote-profitability", label: "Maliyeti incele" },
    };
  }
  if (hasVerifiedSuccess(selection, facts)) {
    return {
      kind: "success",
      tone: "success",
      title: "Tamamlandı",
      text: "İşlem tamamlandı.",
      suggestion: "İstersen ilgili kaydı birlikte inceleyelim.",
      action: null,
    };
  }
  return null;
}
