function positiveId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function readCompanyFinancialFocusFromHash(hash = "") {
  const query = new URLSearchParams(String(hash || "").split("?")[1] || "");
  const agreementId = positiveId(query.get("focusAgreementId") || query.get("agreementId"));
  const shiftId = positiveId(query.get("focusShiftId") || query.get("shiftId"));
  const invoiceId = positiveId(query.get("focusInvoiceId") || query.get("invoiceId"));

  return {
    ...(agreementId ? { focusAgreementId: String(agreementId) } : {}),
    ...(shiftId ? { focusShiftId: String(shiftId) } : {}),
    ...(invoiceId ? { focusInvoiceId: String(invoiceId) } : {}),
  };
}
