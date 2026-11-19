function normalizedBudgetInput(value) {
  const text = String(value ?? "").trim().replace(/\s+/gu, "");
  if (!text) return "";

  const commaIndex = text.lastIndexOf(",");
  const dotIndex = text.lastIndexOf(".");
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    return text.replaceAll(groupingSeparator, "").replace(decimalSeparator, ".");
  }
  if (commaIndex >= 0) return text.replace(",", ".");
  return text;
}

export function formatBudgetAmountInputFromMinor(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const minor = Number(value);
  if (!Number.isSafeInteger(minor) || minor < 0) return "";
  const major = minor / 100;
  return minor % 100 === 0 ? String(major) : major.toFixed(2);
}

export function parseBudgetAmountInputToMinor(value) {
  const normalized = normalizedBudgetInput(value);
  if (!normalized) return "";
  const major = Number(normalized);
  if (!Number.isFinite(major) || major < 0 || major > Number.MAX_SAFE_INTEGER / 100) return "";
  const minor = Math.round(major * 100);
  return Number.isSafeInteger(minor) ? String(minor) : "";
}
