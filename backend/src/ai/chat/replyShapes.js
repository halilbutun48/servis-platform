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
    .replace(/\bCOMPANY\b/gi, 'Hizmet Alan Firma')
    .replace(/\bROOM\b/gi, 'Turizm/Taşımacılık Firması')
    .replace(/\bCompany\b/gi, 'Hizmet Alan Firma')
    .replace(/\bRoom\b/gi, 'Taşımacılık Firması')
    .replace(/\bOdalara\b/giu, 'Taşımacılık Firmalarına')
    .replace(/\bOdaları\b/giu, 'Taşımacılık Firmaları')
    .replace(/\bOdanın\b/giu, 'Taşımacılık Firmasının')
    .replace(/\bOdayı\b/giu, 'Taşımacılık Firmasını')
    .replace(/\bOdaya\b/giu, 'Taşımacılık Firmasına')
    .replace(/\bOdadan\b/giu, 'Taşımacılık Firmasından')
    .replace(/\bOdası\b/giu, 'Taşımacılık Firması')
    .replace(/\bOda\b/gi, 'Taşımacılık Firması')
    .replace(/\bŞirketlerin\b/giu, 'Hizmet Alan Firmaların')
    .replace(/\bŞirketler\b/giu, 'Hizmet Alan Firmalar')
    .replace(/\bŞirketin\b/giu, 'Hizmet Alan Firmanın')
    .replace(/\bŞirketi\b/giu, 'Hizmet Alan Firmayı')
    .replace(/\bŞirkete\b/giu, 'Hizmet Alan Firmaya')
    .replace(/\bŞirketten\b/giu, 'Hizmet Alan Firmadan')
    .replace(/\bŞirketle\b/giu, 'Hizmet Alan Firmayla')
    .replace(/(^|[^\p{L}])Şirket(?=$|[^\p{L}])/giu, '$1Hizmet Alan Firma')
    .replace(/([,;:]\s*)Hizmet Alan Firma(?=\s+taraf)/g, '$1hizmet alan firma')
    .replace(/(^|[^\p{L}])İnsan onayı gerekir(?=$|[^\p{L}])/giu, '$1Onayınız gerekli')
    .replace(/(^|[^\p{L}])insan onayı gerekir(?=$|[^\p{L}])/gu, '$1Onayınız gerekli')
    .replace(/\bİnsan onayına\b/giu, 'kullanıcı onayına')
    .replace(/\bİnsan onayını\b/giu, 'kullanıcı onayını')
    .replace(/\bİnsan onayının\b/giu, 'kullanıcı onayının')
    .replace(/(^|[^\p{L}])İnsan onayı(?=$|[^\p{L}])/giu, '$1Kullanıcı onayı')
    .replace(/(^|[^\p{L}])insan onayı(?=$|[^\p{L}])/gu, '$1Kullanıcı onayı')
    .replace(/\bhuman approval\b/gi, 'kullanıcı onayı')
    .replace(/\bhuman confirmation\b/gi, 'kullanıcı onayı')
    .replace(/\bhuman[- ]in[- ]the[- ]loop\b/gi, 'kullanıcı onayı')
    .replace(/\bETA\b/gi, 'Tahmini varış süresi')
    .replace(/\bstale\b/gi, 'güncel değil')
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
    .replace(/^(?:(?:Taşımacılık Firması açısından:|Taşımacılık Firması rolünde)\s*){2,}/, 'Taşımacılık Firması açısından: ')
    .replace(/(Rol:\s*Turizm\/Taşımacılık Firması\s*•\s*Yetki:\s*Sınırlı)(?:\s*•\s*\1)+/g, '$1')
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
