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

export function makeQuickAction(label, routeKey, reason = '', extras = {}) {
  return {
    label: String(label || 'Buradan aç'),
    routeKey: String(routeKey || ''),
    reason: String(reason || '').trim(),
    actionKind: String(extras?.actionKind || 'OPEN_ROUTE'),
    routeParams: extras?.routeParams && typeof extras.routeParams === 'object' ? extras.routeParams : undefined,
    guide: extras?.guide && typeof extras.guide === 'object' ? extras.guide : undefined,
    askText: typeof extras?.askText === 'string' ? extras.askText : undefined,
    copyText: typeof extras?.copyText === 'string' ? extras.copyText : undefined,
    accent: typeof extras?.accent === 'string' ? extras.accent : undefined,
  };
}

export function makeGuideAction(label, guide, reason = '') {
  return makeQuickAction(label, '', reason, { actionKind: 'OPEN_GUIDE', guide });
}

export function makeAskAction(label, askText, reason = '') {
  return makeQuickAction(label, '', reason, { actionKind: 'ASK', askText });
}

export function makeCopyAction(label, copyText, reason = '') {
  return makeQuickAction(label, '', reason, { actionKind: 'COPY_TEXT', copyText });
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
      if (!item?.label) continue;
      const actionKind = String(item?.actionKind || 'OPEN_ROUTE');
      if (actionKind === 'OPEN_ROUTE' && !item?.routeKey) continue;
      rows.push({
        label: String(item.label || '').trim(),
        routeKey: String(item.routeKey || '').trim(),
        reason: String(item.reason || item.purpose || '').trim(),
        actionKind: String(item.actionKind || 'OPEN_ROUTE').trim(),
        routeParams: item.routeParams && typeof item.routeParams === 'object' ? item.routeParams : undefined,
        guide: item.guide && typeof item.guide === 'object' ? item.guide : undefined,
        askText: typeof item.askText === 'string' ? item.askText : undefined,
        copyText: typeof item.copyText === 'string' ? item.copyText : undefined,
        accent: typeof item.accent === 'string' ? item.accent : undefined,
      });
    }
  }
  const deduped = [];
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.label}|${row.routeKey}|${row.actionKind}|${row.askText || ''}|${row.copyText || ''}|${row.guide?.jobType || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}
