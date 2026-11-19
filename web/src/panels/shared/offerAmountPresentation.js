export function formatOfferAmountMinor(value) {
  if (value == null || value === "") return "-";
  const minor = Number(value);
  if (!Number.isFinite(minor)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function parseOfferAmountInput(value) {
  const raw = String(value ?? "").trim().replace(/\s+/gu, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/u.test(raw)
      ? raw.replace(/\./g, "")
      : raw;
  const major = Number(normalized);
  if (!Number.isFinite(major) || major <= 0) return null;
  const minorUnitScale = 100;
  const parsed = Math.round(major * minorUnitScale);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
