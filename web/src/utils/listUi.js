export function normalizeFilterText(value) {
  return String(value || '').trim().toLowerCase();
}

export function includesFilter(values, query) {
  const q = normalizeFilterText(query);
  if (!q) return true;
  const hay = (Array.isArray(values) ? values : [values])
    .filter((value) => value != null && value !== '')
    .map((value) => String(value).toLowerCase())
    .join(' ');
  return hay.includes(q);
}

export function rowSelectionStyle(isSelected) {
  return {
    cursor: 'pointer',
    background: isSelected ? 'rgba(61, 122, 255, 0.10)' : 'transparent',
    outline: isSelected ? '1px solid rgba(59,130,246,.35)' : undefined,
  };
}
