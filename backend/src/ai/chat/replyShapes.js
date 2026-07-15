export function uniqueStrings(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map((x) => String(x || '').trim()).filter(Boolean)));
}

export function toReply(text, fallback = 'Bu konuda yardımcı olabilirim.') {
  const value = String(text || '').trim();
  return value || fallback;
}

export function normalizeVisibleTerminology(value) {
  const text = String(value || '');
  if (/filtre\/status farkı/i.test(text)) {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }
  return text
    .replace(/\bETA\b/gi, 'Tahmini varış süresi')
    .replace(/\boffline\b/gi, 'çevrim dışı')
    .replace(/\bSürücünün\s+telefon\s+GPS['’]i\b/gi, 'Sürücünün telefonundan konum sinyali')
    .replace(/\bAraç\s+GPS['’]i\b/gi, 'Araç konum sinyali')
    .replace(/\bSon\s+GPS\b/gi, 'Son konum bilgisi')
    .replace(/\bLast\s+GPS\b/gi, 'Son konum bilgisi')
    .replace(/\bGPS:\s*Çevrim dışı\b/gi, 'Konum sinyali: Çevrim dışı')
    .replace(/\bGPS\b/gi, 'konum sinyali')
    .replace(/\bfallback\b/gi, 'Yedek')
    .replace(/\bselected record\b/gi, 'Seçili kayıt')
    .replace(/\bsafe alternative\b/gi, 'Önce şunu kontrol et')
    .replace(/\bGüvenli alternatif\b/gi, 'Önce şunu kontrol et')
    .replace(/\blive decision\b/gi, 'Anlık operasyon kararı')
    .replace(/\broute binding\b/gi, 'Rota bağlantısı')
    .replace(/\btask-state\b/gi, 'Devam eden işlem')
    .replace(/\bassignment\b/gi, 'Atama')
    .replace(/\bactive segment\b/gi, 'Sıradaki yol bölümü')
    .replace(/\bcompleted segment\b/gi, 'Tamamlanan yol bölümü')
    .replace(/\bnext best action\b/gi, 'Sıradaki en doğru adım')
    .replace(/\bscreen purpose\b/gi, 'Ekranın amacı')
    .replace(/\bcurrent step\b/gi, 'Geçerli adım')
    .replace(/\bworkflow\b/gi, 'İşlem akışı')
    .replace(/\broot cause\b/gi, 'Olası ana neden')
    .replace(/\bdiagnostic\b/gi, 'Sorun kontrolü')
    .replace(/\brisk scoring\b/gi, 'Risk değerlendirmesi')
    .replace(/\bintent\b/gi, 'Kullanıcının isteği')
    .replace(/\bchip\b/gi, 'Hızlı seçenek')
    .replace(/\bcontext\b/gi, 'Bağlam')
    .replace(/\bstatus\b/gi, 'Durum')
    .replace(/\bwarning\b/gi, 'Uyarı')
    .replace(/\berror\b/gi, 'Hata')
    .replace(/\bblocker\b/gi, 'Engel')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeLinkedGuide(jobType, label, guideLevel = 'SHORT', reason = '') {
  return {
    jobType: String(jobType || ''),
    label: normalizeVisibleTerminology(String(label || jobType || 'Rehberi aç')),
    guideLevel: String(guideLevel || 'SHORT'),
    reason: normalizeVisibleTerminology(String(reason || '').trim()),
  };
}

export function makeQuickAction(label, routeKey, reason = '', extras = {}) {
  return {
    label: normalizeVisibleTerminology(String(label || 'Buradan aç')),
    routeKey: String(routeKey || ''),
    reason: normalizeVisibleTerminology(String(reason || '').trim()),
    actionKind: String(extras?.actionKind || 'OPEN_ROUTE'),
    routeParams: extras?.routeParams && typeof extras.routeParams === 'object' ? extras.routeParams : undefined,
    guide: extras?.guide && typeof extras.guide === 'object' ? extras.guide : undefined,
    askText: typeof extras?.askText === 'string' ? normalizeVisibleTerminology(extras.askText) : undefined,
    copyText: typeof extras?.copyText === 'string' ? normalizeVisibleTerminology(extras.copyText) : undefined,
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
