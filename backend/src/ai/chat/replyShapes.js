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

export function firstNonEmpty(...values) {
  for (const value of values) {
    const s = String(value || '').trim();
    if (s) return s;
  }
  return '';
}
