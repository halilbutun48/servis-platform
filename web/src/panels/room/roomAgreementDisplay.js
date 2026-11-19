const INTERNAL_FIXTURE_NOTE = /(?:M18_DEMO|DEMO_FIXTURE|HAKEDIS_COVERAGE|FINANCE_REVIEW_REQUIRED|FINANCE_MISSING|\bINVOICE\b)/i;

export function isInternalFixtureNote(note) {
  return INTERNAL_FIXTURE_NOTE.test(String(note || "").trim());
}

export function friendlyAgreementNote(note) {
  const normalized = String(note || "").trim();
  if (!normalized) return "";
  return isInternalFixtureNote(normalized) ? "Demo/test kaydı" : normalized;
}

export function formatAgreementMoney(value) {
  if (value == null || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  // Agreement offer amounts are canonical minor units at the API boundary.
  // Notes are presentation-only and must not change the monetary scale.
  const amountInTl = numeric / 100;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInTl);
}

export function formatAgreementPriceImpact(currentAmount, nextAmount) {
  const current = Number(currentAmount || 0);
  const next = Number(nextAmount ?? currentAmount ?? 0);
  const diff = next - current;
  const diffPrefix = diff > 0 ? "+" : "";
  return `${formatAgreementMoney(current)} → ${formatAgreementMoney(next)} (${diffPrefix}${formatAgreementMoney(diff)})`;
}
