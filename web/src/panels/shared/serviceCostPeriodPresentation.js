function dateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export function serviceCostSourcePeriodLabel(entries = []) {
  const source = Array.isArray(entries)
    ? entries.find((entry) => entry?.periodStart || entry?.periodEnd)
    : null;
  if (!source) return null;
  const start = dateLabel(source.periodStart);
  const end = dateLabel(source.periodEnd);
  if (start && end) return `${start} – ${end}`;
  return start || end || null;
}
