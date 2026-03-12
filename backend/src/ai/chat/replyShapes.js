export function uniqueStrings(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map((x) => String(x || '').trim()).filter(Boolean)));
}

export function toReply(text, fallback = 'Bu konuda yardımcı olabilirim.') {
  const value = String(text || '').trim();
  return value || fallback;
}

export function makeLinkedGuide(jobType, label, guideLevel = 'SHORT', reason = '') {
  return {
    jobType: String(jobType || ''),
    label: String(label || jobType || 'Rehberi aç'),
    guideLevel: String(guideLevel || 'SHORT'),
    reason: String(reason || '').trim(),
  };
}

export function makeQuickAction(label, routeKey, reason = '') {
  return {
    label: String(label || 'Buradan aç'),
    routeKey: String(routeKey || ''),
    reason: String(reason || '').trim(),
  };
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    const s = String(value || '').trim();
    if (s) return s;
  }
  return '';
}

export function mergeQuickActions(...groups) {
  const rows = [];
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      if (!item?.label || !item?.routeKey) continue;
      rows.push({
        label: String(item.label || '').trim(),
        routeKey: String(item.routeKey || '').trim(),
        reason: String(item.reason || item.purpose || '').trim(),
      });
    }
  }
  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.label}|${row.routeKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}
