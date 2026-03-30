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
    background: isSelected ? 'rgba(61, 122, 255, 0.12)' : 'transparent',
    outline: isSelected ? '1px solid rgba(59,130,246,.42)' : undefined,
    boxShadow: isSelected ? 'inset 3px 0 0 rgba(96,165,250,.95)' : undefined,
    transition: 'background-color .15s ease, outline-color .15s ease, box-shadow .15s ease',
  };
}
