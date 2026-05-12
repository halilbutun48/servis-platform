function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item || '').trim();
    if (!text) continue;
    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function selectedFieldRows(screenContext) {
  return (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}

function selectedBadgeRows(screenContext) {
  return (Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.key, ''),
    value: firstNonEmpty(row?.value, row?.text, '-'),
    help: firstNonEmpty(row?.help, row?.meaning, row?.purpose, ''),
  })).filter((row) => row.label);
}



function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

function structuredActionRows(screenContext, key) {
  const facts = structuredFacts(screenContext);
  const rows = Array.isArray(facts?.[key]) ? facts[key] : [];
  return rows.map((row) => typeof row === 'string'
    ? { label: row, reason: '', disabled: key === 'blockedActions', purpose: '', required: [], blockedBy: [] }
    : {
        label: firstNonEmpty(row?.label, row?.title, row?.text, ''),
        reason: firstNonEmpty(row?.reason, row?.help, row?.disabledReason, ''),
        purpose: firstNonEmpty(row?.purpose, row?.meaning, ''),
        required: Array.isArray(row?.required) ? row.required.filter(Boolean) : [],
        blockedBy: Array.isArray(row?.blockedBy) ? row.blockedBy.filter(Boolean) : [],
        disabled: key === 'blockedActions' || row?.enabled === false,
      }).filter((row) => row.label);
}

function applyStructuredFacts(result, screenContext) {
  const facts = structuredFacts(screenContext);
  if (!facts) return;
  result.reasoningLead = firstNonEmpty(facts?.reasoningLead, result.reasoningLead, '');
  result.nextBestAction = firstNonEmpty(facts?.nextBestAction, result.nextBestAction, '');
  result.safestNextStep = firstNonEmpty(facts?.safestNextStep, result.safestNextStep, '');
  result.changedHint = firstNonEmpty(facts?.changedHint, result.changedHint, '');
  result.compareHint = firstNonEmpty(facts?.compareHint, result.compareHint, '');
  if (Number.isFinite(Number(facts?.readinessScore))) { result.readinessScore = Math.max(18, Math.min(97, Math.round(Number(facts.readinessScore)))); result.explicitScore = true; }
  if (facts?.readiness) { result.readiness = String(facts.readiness); result.explicitReadiness = true; }
  if (Number.isFinite(Number(facts?.healthScore))) { result.healthScore = Math.max(0.18, Math.min(0.97, Number(facts.healthScore))); result.explicitHealth = true; }
  result.blockers.push(...(Array.isArray(facts?.blockers) ? facts.blockers : []));
  result.missingData.push(...(Array.isArray(facts?.missing) ? facts.missing : []));
  result.evidence.push(...(Array.isArray(facts?.evidence) ? facts.evidence : []));
  const counters = facts?.counters && typeof facts.counters === 'object' ? facts.counters : null;
  if (counters) {
    const parts = Object.entries(counters)
      .filter(([, value]) => value != null && value !== '' && value !== false)
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${value}`);
    if (parts.length) result.evidence.push(`Panel verisi: ${parts.join(' • ')}`);
  }
  const blocked = structuredActionRows(screenContext, 'blockedActions');
  const allowed = structuredActionRows(screenContext, 'allowedActions');
  if (blocked.length) {
    result.disabledHints.push(...blocked.map((row) => {
      const tail = [row.reason, ...(row.blockedBy || [])].filter(Boolean).join(' • ');
      return `${row.label}${tail ? `: ${tail}` : ''}`;
    }));
    const firstBlocked = blocked[0];
    if (firstBlocked?.purpose) result.evidence.push(`Kapalı aksiyon amacı: ${firstBlocked.label} → ${firstBlocked.purpose}`);
  }
  if (allowed.length) {
    result.evidence.push(`İzinli aksiyonlar: ${allowed.slice(0, 4).map((row) => row.label).join(', ')}`);
    const firstAllowed = allowed[0];
    if (firstAllowed?.required?.length) result.evidence.push(`Aksiyon ön koşulu: ${firstAllowed.required.slice(0, 3).join(' • ')}`);
  }
}

function uiHintRows(screenContext, key) {
  return (Array.isArray(screenContext?.uiHints?.[key]) ? screenContext.uiHints[key] : []).map((row) => {
    if (typeof row === 'string') return { label: row, value: row, reason: '' };
    return {
      label: firstNonEmpty(row?.label, row?.title, row?.text, ''),
      value: firstNonEmpty(row?.value, row?.text, row?.label, ''),
      reason: firstNonEmpty(row?.reason, row?.help, ''),
      disabled: Boolean(row?.disabled),
    };
  }).filter((row) => row.label);
}

function findValue(rows, labels) {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map((x) => normalizeText(x));
  const hit = (Array.isArray(rows) ? rows : []).find((row) => wanted.some((label) => normalizeText(row?.label).includes(label)));
  return hit ? String(hit.value || '').trim() : '';
}

function hasBlankish(value) {
  const text = normalizeText(value);
  return !text || ['-', 'yok', 'boş', 'bos', 'null', 'undefined', 'n/a', 'na', 'henüz puan yok'].includes(text);
}

function hasOldGps(value) {
  const text = normalizeText(value);
  if (!text) return false;
  return /stale|eski|dakika|dk|saat|unknown|bilinmiyor/.test(text) && !/şimdi|simdi|az önce|az once|1 dk|0 dk/.test(text);
}

function badgeHas(badges, labelsOrValues) {
  const wanted = (Array.isArray(labelsOrValues) ? labelsOrValues : [labelsOrValues]).map((x) => normalizeText(x));
  return (Array.isArray(badges) ? badges : []).some((row) => wanted.some((val) => normalizeText(row?.label).includes(val) || normalizeText(row?.value).includes(val)));
}

const SURFACE_ANALYSIS_RULES = {
  KVKK: {
    surfaceLabel: 'KVKK',
    reasoningLead: 'Bu ekran veri görünürlüğü, yetki sınırı, maskeleme ve saklama kuralını gösterir.',
    nextBestAction: 'Önce bu rolde hangi bilginin görünür olduğunu kontrol et. Sonra maskeleme, retention ve log/export izini oku.',
    safestNextStep: 'En risksiz adım, önce bu rolde görünür alanları ve saklama sınırını okumaktır.',
    compareHint: 'KVKK ekranı ham veri açmaz; görünürlük sınırını anlatır.',
    blocker: 'Önce bu rolde hangi bilginin görünür olduğunu kontrol et.',
    missingData: 'Ekrandaki görünürlük, maskeleme veya retention özetleri boş görünüyor.',
    fieldGroups: [
      { label: 'Görünürlük', needles: ['görünür', 'görunur', 'visibility'] },
      { label: 'Maskeleme', needles: ['maskele', 'mask'] },
      { label: 'Saklama', needles: ['saklama', 'retention'] },
      { label: 'Log / Export', needles: ['log', 'export'] },
      { label: 'Yetki', needles: ['yetki', 'rol'] },
    ],
  },
  NOTIFICATIONS: {
    surfaceLabel: 'Bildirimler',
    reasoningLead: 'Bu ekran kullanıcıya giden operasyon, görev, servis ve sistem uyarılarını toplar.',
    nextBestAction: 'Önce okunmamış veya kritik bildirim var mı bak. Sonra ilgili kayda veya ekrana geç.',
    safestNextStep: 'En risksiz adım, önce kritik veya okunmamış bildirimi ayırmaktır.',
    compareHint: 'Bildirimler ekranı işlem kaydı değil; kullanıcıyı yönlendiren uyarı yüzeyidir.',
    blocker: 'Önce okunmamış veya kritik bildirim var mı bak.',
    missingData: 'Bildirim türü veya ilgili olay bilgisi görünmüyor.',
    fieldGroups: [
      { label: 'Durum', needles: ['durum', 'state', 'status'] },
      { label: 'Öncelik', needles: ['öncelik', 'oncelik', 'kritik', 'priority'] },
      { label: 'İlgili kayıt', needles: ['ilgili', 'related', 'ekran'] },
      { label: 'Rol', needles: ['rol', 'sorumlu'] },
    ],
  },
  LOG_EXPORT: {
    surfaceLabel: 'Log Dışa Aktarımı',
    reasoningLead: 'Bu ekran işlem kayıtlarını, denetim izini ve export geçmişini izler.',
    nextBestAction: 'Önce hangi kaydı aradığını netleştir. Sonra filtre, yetki ve export geçmişini kontrol et.',
    safestNextStep: 'En risksiz adım, önce aranan olay veya export kaydını doğrulamaktır.',
    compareHint: 'Log ekranı ham payload göstermek için değil, işlem izini karşılaştırmak içindir.',
    blocker: 'Önce hangi olay kaydını aradığını netleştir.',
    missingData: 'İşlem, export veya audit izleri görünmüyor.',
    fieldGroups: [
      { label: 'Audit', needles: ['audit', 'iz', 'trace'] },
      { label: 'Export', needles: ['export', 'dışa', 'disa'] },
      { label: 'Son olay', needles: ['olay', 'event'] },
      { label: 'Yetki', needles: ['yetki', 'rol'] },
    ],
  },
  OPERATIONS: {
    surfaceLabel: 'Operasyon Paneli',
    reasoningLead: 'Bu ekran açık, riskli veya değişiklik isteyen işleri ve sonraki adımı gösterir.',
    nextBestAction: 'Önce açık veya riskli kayıt var mı bak. Sonra sorumlu rol ve otomatik kabul durumunu kontrol et.',
    safestNextStep: 'En risksiz adım, önce açık veya riskli kayıtları ayırmaktır.',
    compareHint: 'Operasyon paneli karar yüzeyidir; harita veya ticari akış ekranı değildir.',
    blocker: 'Önce açık veya riskli kayıt var mı bak.',
    missingData: 'Açık iş, risk veya sorumlu rol özeti görünmüyor.',
    fieldGroups: [
      { label: 'Açık', needles: ['açık', 'open'] },
      { label: 'Riskli', needles: ['risk', 'kritik', 'problem'] },
      { label: 'Otomatik', needles: ['otomatik', 'auto'] },
      { label: 'Sorumlu', needles: ['sorumlu', 'rol'] },
    ],
  },
  COMMERCIAL_CORE: {
    surfaceLabel: 'Ticari Akış',
    reasoningLead: 'Bu ekran hakediş hazırlığı, önizleme, CSV taslağı ve readonly ödeme durumunu gösterir.',
    nextBestAction: 'Önce hazırlık, önizleme ve güvenli mod durumunu oku. Sonra hakediş önizleme veya CSV taslağına geç.',
    safestNextStep: 'En risksiz adım, önce ödeme başlatılmadığını ve sadece taslak veriyi okumaktır.',
    compareHint: 'Ticari akış ekranı ödeme başlatmaz; hazırlanmış veriyi gösterir.',
    blocker: 'Önce hazırlık, önizleme ve güvenli mod durumunu oku.',
    missingData: 'Hakediş hazırlığı veya ödeme hesabı özeti görünmüyor.',
    fieldGroups: [
      { label: 'Hazırlık', needles: ['hazırlık', 'hazirlik'] },
      { label: 'Önizleme', needles: ['önizleme', 'onizleme', 'preview'] },
      { label: 'CSV', needles: ['csv', 'taslak'] },
      { label: 'Ödeme', needles: ['ödeme', 'odeme', 'kapalı', 'kapali'] },
      { label: 'Hakediş', needles: ['hakediş', 'hakedis'] },
    ],
  },
  ROOM_COMMERCIAL_FLOW: {
    surfaceLabel: 'Ticari Akışım',
    reasoningLead: 'Bu ekran oda tarafındaki ticari akışı, teklif ve sözleşme ilişkisini gösterir.',
    nextBestAction: 'Önce akış durumunu ve teklif kararını oku. Sonra sözleşme veya ilgili sağlayıcı adımına geç.',
    safestNextStep: 'En risksiz adım, önce kaydın hangi aşamada olduğunu doğrulamaktır.',
    compareHint: 'Bu ekran aktif ödeme başlatma ekranı değildir; ticari görünürlük sağlar.',
    blocker: 'Önce kaydın hangi aşamada olduğunu oku.',
    missingData: 'Teklif, sözleşme veya sağlayıcı özeti görünmüyor.',
    fieldGroups: [
      { label: 'Teklif', needles: ['teklif', 'offer'] },
      { label: 'Sözleşme', needles: ['sözleşme', 'sozlesme'] },
      { label: 'Sağlayıcı', needles: ['sağlayıcı', 'saglayici', 'provider'] },
      { label: 'Sonraki adım', needles: ['sonraki', 'next'] },
    ],
  },
  REPORTS: {
    surfaceLabel: 'Raporlar',
    reasoningLead: 'Bu ekran rapor, özet, filtre ve dışa aktarılan sonuçları toplar.',
    nextBestAction: 'Önce hangi rapora baktığını seç. Sonra filtre ve özet alanlarını kontrol et.',
    safestNextStep: 'En risksiz adım, önce rapor türünü ve filtreyi doğrulamaktır.',
    compareHint: 'Rapor ekranı operasyon ve özet okuma yüzeyidir; canlı görev ekranı değildir.',
    blocker: 'Önce hangi rapor türüne baktığını seç.',
    missingData: 'Rapor türü, filtre veya özet başlığı görünmüyor.',
    fieldGroups: [
      { label: 'Rapor', needles: ['rapor', 'report'] },
      { label: 'Özet', needles: ['özet', 'ozet', 'summary'] },
      { label: 'Filtre', needles: ['filtre', 'filter'] },
      { label: 'Export', needles: ['export', 'dışa', 'disa'] },
    ],
  },
  DRIVER_PIN: {
    surfaceLabel: 'PIN Değiştir',
    reasoningLead: 'Bu ekran kullanıcı kodu, PIN veya ilk şifre değiştirme akışını yönetir.',
    nextBestAction: 'Önce mevcut PIN veya ilk şifreyi doğrula. Sonra yeni PIN belirle ve girişini yenile.',
    safestNextStep: 'En risksiz adım, önce mevcut PIN veya ilk şifreyi doğrulamaktır.',
    compareHint: 'Bu ekran güvenlik yüzeyidir; token, hash veya canlı takip alanı değildir.',
    blocker: 'Önce mevcut PIN veya ilk şifreyi doğrula.',
    missingData: 'PIN veya doğrulama alanı görünmüyor.',
    fieldGroups: [
      { label: 'PIN', needles: ['pin'] },
      { label: 'Şifre', needles: ['şifre', 'sifre', 'password'] },
      { label: 'İlk giriş', needles: ['ilk giriş', 'ilk giris', 'first login'] },
      { label: 'Doğrulama', needles: ['doğrula', 'verification'] },
    ],
  },
  PILOT_LAUNCH_GATE: {
    surfaceLabel: 'Sahaya Çıkış Kontrolü',
    reasoningLead: 'Bu ekran sahaya çıkış öncesi kabul checklist, readiness ve kapı kontrolünü gösterir.',
    nextBestAction: 'Önce checklist ve readiness durumunu oku. Sonra saha öncesi eksikleri kapat.',
    safestNextStep: 'En risksiz adım, önce kabul checklistindeki açık maddeleri kapatmaktır.',
    compareHint: 'Bu ekran canlı saha başlatma değil; çıkış öncesi kapı kontrolüdür.',
    blocker: 'Önce checklist ve readiness durumunu oku.',
    missingData: 'Kabul checklisti veya readiness özeti görünmüyor.',
    fieldGroups: [
      { label: 'Checklist', needles: ['checklist', 'kabul'] },
      { label: 'Readiness', needles: ['readiness', 'hazır', 'hazir'] },
      { label: 'Saha', needles: ['saha', 'field'] },
      { label: 'Kapı', needles: ['gate', 'kapı', 'kapi'] },
    ],
  },
  REGIONS: {
    surfaceLabel: 'Bölgeler',
    reasoningLead: 'Bu ekran bölge, kapasite ve operasyon alanı görünürlüğünü gösterir.',
    nextBestAction: 'Önce bölge ve kapasite durumunu oku. Sonra alan veya kapsama detayına geç.',
    safestNextStep: 'En risksiz adım, önce hangi bölgeye baktığını netleştirmektir.',
    compareHint: 'Bu ekran operasyon haritası değildir; bölge kapasitesini anlatır.',
    blocker: 'Önce hangi bölgeyi kontrol ettiğini netleştir.',
    missingData: 'Bölge, kapasite veya kapsama özeti görünmüyor.',
    fieldGroups: [
      { label: 'Bölge', needles: ['bölge', 'bolge', 'region'] },
      { label: 'Kapasite', needles: ['kapasite', 'capacity'] },
      { label: 'Alan', needles: ['alan', 'area'] },
      { label: 'Kapsama', needles: ['kapsama', 'coverage'] },
    ],
  },
  SSOT_ALIGNMENT: {
    surfaceLabel: 'Sistem Standartları',
    reasoningLead: 'Bu ekran SSOT, milestone, repo ve doğrulama hizasını gösterir.',
    nextBestAction: 'Önce SSOT ve milestone hizasını oku. Sonra repo/proje durumunu doğrula.',
    safestNextStep: 'En risksiz adım, önce hangi hizanın bozulduğunu netleştirmektir.',
    compareHint: 'Bu ekran ürün kararı değil; doğrulama ve hizalama yüzeyidir.',
    blocker: 'Önce SSOT ve milestone hizasını kontrol et.',
    missingData: 'SSOT, milestone veya doğrulama özetleri görünmüyor.',
    fieldGroups: [
      { label: 'SSOT', needles: ['ssot'] },
      { label: 'Milestone', needles: ['milestone'] },
      { label: 'Repo', needles: ['repo'] },
      { label: 'Doğrulama', needles: ['verify', 'doğrulama'] },
    ],
  },
  NATURAL_COPILOT: {
    surfaceLabel: 'Doğal Copilot',
    reasoningLead: 'Bu ekran Copilot rehber yüzeyini ve planlanan kabiliyetleri gösterir.',
    nextBestAction: 'Önce mevcut yardım yüzeyini ve planlanan kabiliyeti ayır. Sonra ilgili ürün ekranına git.',
    safestNextStep: 'En risksiz adım, önce mevcut rehber mi planlanan özellik mi olduğunu doğrulamaktır.',
    compareHint: 'Bu ekran kullanıcı rehberi yüzeyidir; operasyon verisi veya ödeme ekranı değildir.',
    blocker: 'Önce mevcut yardım yüzeyini ve planlanan kabiliyeti ayır.',
    missingData: 'Rehber, planlanan kabiliyet veya mevcut ekran özeti görünmüyor.',
    fieldGroups: [
      { label: 'Rehber', needles: ['rehber', 'guide', 'copilot'] },
      { label: 'Planlanan', needles: ['planlanan', 'planned'] },
      { label: 'Ekran', needles: ['ekran', 'screen'] },
      { label: 'Rol', needles: ['rol', 'role'] },
    ],
  },
};

function classifyScreenPath(path = '') {
  const p = normalizeText(path);
  if (p.includes('/georeview')) return 'GEOREVIEW';
  if (p.includes('/shared/feedback')) return 'FEEDBACK';
  if (p.includes('/shared/kvkk')) return 'KVKK';
  if (p.includes('/shared/notifications')) return 'NOTIFICATIONS';
  if (p.includes('/shared/logs')) return 'LOG_EXPORT';
  if (p.includes('/company/operations') || p.includes('/school/operations') || p.includes('/organization/operations') || p.includes('/superadmin/operations')) return 'OPERATIONS';
  if (p.includes('/room/commercial-flow')) return 'ROOM_COMMERCIAL_FLOW';
  if (p.includes('/room/reports')) return 'REPORTS';
  if (p.includes('/driver/change-pin')) return 'DRIVER_PIN';
  if (p.includes('/superadmin/commercial-core')) return 'COMMERCIAL_CORE';
  if (p.includes('/superadmin/pilot-launch-gate')) return 'PILOT_LAUNCH_GATE';
  if (p.includes('/superadmin/regions')) return 'REGIONS';
  if (p.includes('/superadmin/ssot-alignment')) return 'SSOT_ALIGNMENT';
  if (p.includes('/superadmin/natural-copilot')) return 'NATURAL_COPILOT';
  if (p.includes('/commercial-flow')) return 'COMMERCIAL_FLOW';
  if (p.includes('/service-evaluation')) return 'SERVICE_EVALUATION';
  if (p.includes('/agreements')) return 'AGREEMENTS';
  if (p.includes('/operation-health')) return 'OPERATION_HEALTH';
  if (p.includes('/operation-verification')) return 'OPERATION_VERIFICATION';
  if (p.includes('/acceptance')) return 'FIELD_ACCEPTANCE';
  if (p.includes('/trust-quality')) return 'TRUST_QUALITY';
  if (p.includes('/observability')) return 'OBSERVABILITY';
  if (p.includes('/shifts')) return 'SHIFTS';
  if (p === '/company' || p === '/organization' || p === '/school') return 'PLANNING_CENTER';
  if (p.includes('/driver/today')) return 'DRIVER_TODAY';
  if (p.includes('/driver/map') || p.includes('/driver/route')) return 'DRIVER_MAP';
  if (p.includes('/map') || p.includes('/live')) return 'MAP';
  return 'GENERIC';
}

function makeResult(type, screenContext, screenDefinition) {
  return {
    type,
    screenPath: String(screenDefinition?.path || screenContext?.path || ''),
    screenLabel: firstNonEmpty(screenDefinition?.label, screenContext?.label, 'Ekran'),
    selectedLabel: firstNonEmpty(screenContext?.selectedLabel, ''),
    healthScore: 0.72,
    readinessScore: 72,
    readiness: 'REVIEW_NEEDED',
    confidence: 0.76,
    reasoningLead: '',
    blockers: [],
    missingData: [],
    evidence: [],
    nextBestAction: '',
    safestNextStep: '',
    changedHint: '',
    compareHint: '',
    disabledHints: [],
    explicitReadiness: false,
    explicitScore: false,
    explicitHealth: false,
  };
}

function applyUiSurface(result, screenContext) {
  const disabled = [...structuredActionRows(screenContext, 'blockedActions'), ...uiHintRows(screenContext, 'disabledButtons')];
  const visible = [...structuredActionRows(screenContext, 'allowedActions'), ...uiHintRows(screenContext, 'visibleButtons')];
  const headers = uiHintRows(screenContext, 'tableHeaders').map((row) => row.label);
  const modals = uiHintRows(screenContext, 'modalTitles').map((row) => row.label);
  const tabs = uiHintRows(screenContext, 'activeTabs').map((row) => row.label);
  const pages = uiHintRows(screenContext, 'pageTitles').map((row) => row.label);
  if (disabled.length) {
    result.disabledHints = disabled.slice(0, 4).map((row) => `${row.label}${row.reason ? `: ${row.reason}` : ''}`);
    const first = disabled[0];
    result.evidence.push(`Pasif buton: ${first.label}`);
    if (first.reason) result.evidence.push(`Pasif sebep: ${first.reason}`);
  }
  if (visible.length) result.evidence.push(`Görünen butonlar: ${visible.slice(0, 4).map((row) => row.label).join(', ')}`);
  if (headers.length) result.evidence.push(`Tablo başlıkları: ${headers.slice(0, 4).join(', ')}`);
  if (modals.length) result.evidence.push(`Açık modal: ${modals.slice(0, 2).join(', ')}`);
  if (tabs.length) result.evidence.push(`Aktif sekme: ${tabs.slice(0, 2).join(', ')}`);
  if (pages.length) result.evidence.push(`Sayfa başlığı: ${pages.slice(0, 2).join(', ')}`);
}

function finalize(result) {
  const blockerCount = result.blockers.length;
  const missingCount = result.missingData.length;
  const disabledCount = result.disabledHints.length;
  const penalty = blockerCount * 0.18 + missingCount * 0.08 + Math.min(0.12, disabledCount * 0.03);
  if (!result.explicitHealth) result.healthScore = Math.max(0.18, Math.min(0.97, Number((0.92 - penalty).toFixed(2))));
  if (!result.explicitScore) result.readinessScore = Math.max(18, Math.min(97, Math.round(result.healthScore * 100)));
  if (!result.explicitReadiness) {
    if (blockerCount >= 2) result.readiness = 'NOT_READY';
    else if (blockerCount || missingCount) result.readiness = 'REVIEW_NEEDED';
    else result.readiness = 'READY';
  }
  result.confidence = Math.max(0.58, Math.min(0.94, Number((0.62 + Math.min(0.24, result.evidence.length * 0.04)).toFixed(2))));
  result.evidence = uniqueStrings(result.evidence).slice(0, 6);
  result.blockers = uniqueStrings(result.blockers).slice(0, 5);
  result.missingData = uniqueStrings(result.missingData).slice(0, 5);
  result.disabledHints = uniqueStrings(result.disabledHints).slice(0, 4);
  return result;
}

function analyzeGeoReview(screenContext, screenDefinition, conversationState) {
  const result = makeResult('GEOREVIEW', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const coord = findValue(fields, ['koordinat', 'lat', 'lng']);
  const address = findValue(fields, ['adres']);
  const status = findValue(fields, ['durum']);
  const reason = findValue(fields, ['neden']);
  if (!result.selectedLabel) result.blockers.push('Önce listeden bir kişi seçilmeden sağ panel güvenilir okunmaz.');
  if (hasBlankish(coord)) result.missingData.push('Koordinat boş görünüyor.');
  if (hasBlankish(coord) && hasBlankish(address)) result.blockers.push('Hem adres hem koordinat boşsa otomatik üretim ve manuel kaydetme akışı ilerlemez.');
  if (badgeHas(badges, ['needs_review', 'failed']) || /review|incele/.test(normalizeText(status))) result.reasoningLead = 'Bu kayıt hâlâ konum doğrulama istiyor.';
  else result.reasoningLead = 'Bu kayıtta ana karar koordinatın gerçekten doğrulanıp kaydedilmediği.';
  if (coord) result.evidence.push(`Koordinat: ${coord}`);
  if (address) result.evidence.push(`Adres: ${address}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (reason) result.evidence.push(`Neden: ${reason}`);
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/kaydet \+ sonraki|kaydet ve sonraki|siradaki/.test(lastQuestion) && result.selectedLabel) result.changedHint = 'Az önce seri ilerleme konuşulduysa Seç butonu ile aktif kişinin gerçekten değiştiğini doğrulamak gerekir.';
  result.nextBestAction = hasBlankish(coord)
    ? (address ? 'Önce büyük haritada noktayı işaretle veya adresten bul ile koordinat üret. Sonra Kaydet de.' : 'Önce büyük haritada noktayı işaretle. Sonra OK ile dönüp Kaydet de.')
    : 'Koordinat doğruysa Kaydet ile sabitle. Seri gidiyorsan sonra Kaydet + Sonraki kullan.';
  result.safestNextStep = 'En risksiz adım, seçili kişi adını sağ panelde doğrulayıp sadece o kayıt üzerinde işaretleme yapmak.';
  result.compareHint = 'Kaydet veritabanına yazar. OK Yap yalnız büyük harita seçim modalını onaylar.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeFeedback(screenContext, screenDefinition, _conversationState) {
  const result = makeResult('FEEDBACK', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const status = findValue(fields, ['durum', 'state', 'status']);
  const priority = findValue(fields, ['öncelik', 'oncelik', 'kritik', 'critical']);
  const category = findValue(fields, ['kategori', 'category']);
  const responsibleRole = findValue(fields, ['sorumlu rol', 'sorumlu', 'rol']);
  const rating = findValue(fields, ['yıldız', 'yildiz', 'puan', 'rating']);
  const relatedScreen = findValue(fields, ['ilgili ekran', 'ekran', 'screen']);
  const repeated = findValue(fields, ['tekrarlayan', 'repeat', 'tekrar']);
  const resolution = findValue(fields, ['çözüldü', 'cozuldu', 'kapandı', 'kapandi', 'resolved', 'closed']);
  const note = findValue(fields, ['yorum', 'not', 'açıklama', 'aciklama', 'açiklama']);

  if (!status && !priority && !category && !responsibleRole && !rating && !relatedScreen && !repeated && !resolution) {
    result.blockers.push('Önce açık veya kritik kayıt var mı bak.');
  }
  if (hasBlankish(status) && hasBlankish(priority)) result.missingData.push('Açık/kritik durumu görünmüyor.');
  if (status) result.evidence.push(`Durum: ${status}`);
  if (priority) result.evidence.push(`Öncelik: ${priority}`);
  if (category) result.evidence.push(`Kategori: ${category}`);
  if (responsibleRole) result.evidence.push(`Sorumlu rol: ${responsibleRole}`);
  if (rating) result.evidence.push(`Yıldız / Puan: ${rating}`);
  if (relatedScreen) result.evidence.push(`İlgili ekran: ${relatedScreen}`);
  if (repeated) result.evidence.push(`Tekrar eden: ${repeated}`);
  if (resolution) result.evidence.push(`Kapanış: ${resolution}`);
  if (note) result.evidence.push(`Not: ${note}`);
  if (badgeHas(badges, ['open', 'kritik', 'critical', 'repeat', 'resolved', 'closed'])) {
    const visible = badges.slice(0, 3).map((row) => `${row.label}: ${row.value}`).join(' • ');
    if (visible) result.evidence.push(`Rozetler: ${visible}`);
  }
  result.reasoningLead = 'Bu ekran saha geri bildirimlerini, kullanıcı yorumlarını ve değerlendirme kayıtlarını toplar; harita veya araç seçme ekranı değildir.';
  result.nextBestAction = 'Önce açık veya kritik kayıt var mı bak. Sonra tekrarlayan kayıtları ve sorumlu rolü kontrol et.';
  result.safestNextStep = 'En risksiz adım, önce açık/kritik kayıtları ayırıp ardından sorumlu rol ve yıldız değerlendirmeyi okumaktır.';
  result.compareHint = 'Geri Bildirim ekranı harita, araç seçme veya canlı takip ekranı değildir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeConfiguredSurface(type, screenContext, screenDefinition, conversationState, rule) {
  const result = makeResult(type, screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const hits = [];

  for (const group of Array.isArray(rule?.fieldGroups) ? rule.fieldGroups : []) {
    const value = findValue(fields, group.needles || []);
    if (!hasBlankish(value)) {
      result.evidence.push(`${group.label}: ${value}`);
      hits.push(value);
    }
  }

  for (const group of Array.isArray(rule?.badgeGroups) ? rule.badgeGroups : []) {
    const value = findValue(badges, group.needles || []);
    if (!hasBlankish(value)) {
      result.evidence.push(`${group.label}: ${value}`);
      hits.push(value);
    }
  }

  if (!result.selectedLabel && !hits.length) result.blockers.push(firstNonEmpty(rule?.blocker, 'Önce ilgili kayıt veya özet satırı seç.'));
  if (!hits.length) result.missingData.push(firstNonEmpty(rule?.missingData, 'Ekrandaki özet alanları boş görünüyor.'));
  result.reasoningLead = firstNonEmpty(rule?.reasoningLead, `Bu ekran ${rule?.surfaceLabel || screenDefinition?.label || 'bu yüzey'} için kullanılır.`);
  result.nextBestAction = firstNonEmpty(rule?.nextBestAction, 'Önce görünen başlık ve açık kayıtları kontrol et.');
  result.safestNextStep = firstNonEmpty(rule?.safestNextStep, 'En risksiz adım, önce seçili kayıt ve görünür özetleri birlikte okumaktır.');
  result.compareHint = firstNonEmpty(rule?.compareHint, '');
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (rule?.followUpPattern && rule?.followUpHint && rule.followUpPattern.test(lastQuestion)) result.changedHint = rule.followUpHint;
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeMap(screenContext, screenDefinition, conversationState) {
  const result = makeResult('MAP', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const gps = findValue(fields, ['son gps', 'gps']);
  const eta = findValue(fields, ['eta']);
  const nextStop = findValue(fields, ['sıradaki durak', 'siradaki durak', 'sonraki durak']);
  const remaining = findValue(fields, ['kalan']);
  const totalStops = findValue(fields, ['toplam durak']);
  if (!result.selectedLabel) result.blockers.push('Önce araç veya vardiya seçilmeden üst kart ve Copilot bağlamı eksik kalır.');
  if (hasBlankish(nextStop)) result.missingData.push('Sıradaki durak boş görünüyor.');
  if (hasBlankish(eta) && !hasBlankish(nextStop)) result.missingData.push('ETA boş veya güncel değil görünüyor.');
  if (hasOldGps(gps) || badgeHas(badges, ['stale', 'old'])) result.blockers.push('Son GPS eski görünüyor; bu ekrana bakarak tek başına canlı karar vermek riskli.');
  if (gps) result.evidence.push(`Son GPS: ${gps}`);
  if (eta) result.evidence.push(`ETA: ${eta}`);
  if (nextStop) result.evidence.push(`Sıradaki durak: ${nextStop}`);
  if (remaining) result.evidence.push(`Kalan: ${remaining}`);
  if (totalStops) result.evidence.push(`Toplam durak: ${totalStops}`);
  result.reasoningLead = result.blockers.length ? 'Bu haritadaki ana sorun canlılığın zayıf veya eksik görünmesi.' : 'Bu haritada önce canlılık, sonra sıradaki durak ve ETA birlikte okunmalı.';
  result.nextBestAction = result.blockers.length
    ? 'Önce Son GPS zamanını ve seçili aracı doğrula. Sonra gerekirse Vardiyalar ekranından aynı kaydı aç.'
    : (hasBlankish(eta) ? 'Önce hareket geldikçe ETA yenileniyor mu kontrol et. Sonra sıradaki durak navigasyonunu gerekirse aç.' : 'Önce seçili araç için son GPS, ETA ve kalan durak sayısını birlikte kontrol et.');
  result.safestNextStep = 'En risksiz adım, doğru aracı seçip Son GPS eski mi değil mi onu kontrol etmektir.';
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/neden mavi|legend|altta/.test(lastQuestion)) result.changedHint = 'Az önce rota renkleri veya alt legend konuşulduysa görsel yorumla canlı karar yorumunu karıştırmamak gerekir.';
  result.compareHint = 'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; tek renk görmek her zaman hata anlamına gelmez.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeShifts(screenContext, screenDefinition, conversationState) {
  const result = makeResult('SHIFTS', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const status = findValue(fields, ['durum', 'status']);
  const vehicle = findValue(fields, ['araç', 'arac']);
  const driver = findValue(fields, ['sürücü', 'surucu']);
  const stops = findValue(fields, ['durak']);
  const offer = findValue(fields, ['room teklifi', 'teklif']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  if (!result.selectedLabel) result.blockers.push('Önce listeden bir vardiya seçmeden yorum genel kalır.');
  if (hasBlankish(vehicle)) result.missingData.push('Araç alanı boş görünüyor.');
  if (hasBlankish(driver)) result.missingData.push('Sürücü alanı boş görünüyor.');
  if (hasBlankish(stops)) result.missingData.push('Durak bilgisi boş görünüyor.');
  if ((/approved|accepted|onay/i.test(status) || badgeHas(badges, ['approved', 'accepted'])) && (hasBlankish(vehicle) || hasBlankish(driver))) result.blockers.push('Kayıt onaylı görünse de araç veya sürücü boşsa saha için tam hazır değildir.');
  if (/pending|bekliyor|open|counter/i.test(normalizeText(offer))) result.blockers.push('Teklif kararı kapanmadan atama yorumu yarım kalır.');
  if (status) result.evidence.push(`Durum: ${status}`);
  if (vehicle) result.evidence.push(`Araç: ${vehicle}`);
  if (driver) result.evidence.push(`Sürücü: ${driver}`);
  if (offer) result.evidence.push(`Teklif: ${offer}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.reasoningLead = result.blockers.length ? 'Bu vardiyada ana blokaj atama veya teklif tarafında görünüyor.' : 'Bu vardiyada önce durum, sonra araç-sürücü bağı, en son sonraki adım okunmalı.';
  if (result.blockers.length) {
    result.nextBestAction = result.blockers[0].includes('Teklif') ? 'Önce teklif kararını kapat. Sonra araç ve sürücü alanını tekrar kontrol et.' : 'Önce araç ve sürücü bağını tamamla. Sonra durak ve sonraki adım alanını tekrar oku.';
  } else {
    result.nextBestAction = nextStep || 'Önce seçili vardiyanın araç, sürücü ve durak alanlarını birlikte kontrol et.';
  }
  result.safestNextStep = 'En risksiz adım, seçili satırda araç ve sürücü gerçekten dolu mu onu doğrulamaktır.';
  const lastQuestion = normalizeText(conversationState?.lastUserMessage || '');
  if (/kayıt ne durumda|hazır mı|atama/.test(lastQuestion)) result.changedHint = 'Az önce hazır mı sorulduysa yalnız durum rozetine değil araç-sürücü boşluklarına da bakmak gerekir.';
  result.compareHint = 'APPROVED ile tam atama aynı şey değildir; araç ve sürücü boşsa iş hâlâ saha için eksiktir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeCommercialFlow(screenContext, screenDefinition) {
  const result = makeResult('COMMERCIAL_FLOW', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const flow = findValue(fields, ['akış', 'akis']);
  const status = findValue(fields, ['durum']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  const counterparty = findValue(fields, ['karşı taraf', 'karsi taraf', 'sağlayıcı', 'saglayici']);
  const amount = findValue(fields, ['tutar', 'fiyat']);
  if (!result.selectedLabel) result.blockers.push('Önce ticari satır seçilmeden hangi aşamada olduğunu net okumak zordur.');
  if (hasBlankish(nextStep)) result.missingData.push('Sonraki Adım boş görünüyor.');
  if (/open|countered|market|teklif/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt henüz market veya pazarlık tarafında görünüyor.';
    result.nextBestAction = 'Önce Marketi aç veya Bekleyeni aç ile karar tarafını netleştir.';
  } else if (/accepted|approved/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt kabul edilmiş ama operasyon hazırlığı kontrol edilmelidir.';
    result.nextBestAction = 'Önce Listeyi aç ile bağlı vardiyayı aç. Sonra atama ve operasyon alanlarını kontrol et.';
  } else if (/active|done/.test(normalizeText(status + ' ' + flow))) {
    result.reasoningLead = 'Bu kayıt artık operasyon veya sonuç tarafına inmiş görünüyor.';
    result.nextBestAction = 'Önce Listeyi aç ile bağlı işi gör. Bitti ise Hizmet Değerlendirme ekranına geç.';
  } else {
    result.reasoningLead = 'Bu kayıtta önce akış, sonra durum, en son sonraki adım okunmalı.';
    result.nextBestAction = nextStep || 'Önce akış ve durum sütununu birlikte oku.';
  }
  if (flow) result.evidence.push(`Akış: ${flow}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (counterparty) result.evidence.push(`Karşı taraf: ${counterparty}`);
  if (amount) result.evidence.push(`Tutar: ${amount}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.safestNextStep = 'En risksiz adım, akış ve durum alanını okuyup uygun butonu ona göre açmaktır.';
  result.compareHint = 'Marketi aç pazarlık tarafına gider. Listeyi aç ise kayıt operasyon/liste tarafına ilerlediyse doğru ekrana götürür.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeServiceEvaluation(screenContext, screenDefinition) {
  const result = makeResult('SERVICE_EVALUATION', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const service = findValue(fields, ['hizmet']);
  const provider = findValue(fields, ['sağlayıcı', 'saglayici']);
  const score = findValue(fields, ['puan']);
  const nextStep = findValue(fields, ['sonraki adım', 'sonraki adim']);
  const status = findValue(fields, ['durum']);
  if (!result.selectedLabel) result.blockers.push('Önce hizmet satırı seçilmeden kalite yorumu genelde yüzeyde kalır.');
  if (hasBlankish(nextStep)) result.missingData.push('Sonraki Adım boş görünüyor.');
  if (!service) result.missingData.push('Hizmet alanı boş görünüyor.');
  if (service) result.evidence.push(`Hizmet: ${service}`);
  if (provider) result.evidence.push(`Sağlayıcı: ${provider}`);
  if (score) result.evidence.push(`Puan: ${score}`);
  if (status) result.evidence.push(`Durum: ${status}`);
  if (nextStep) result.evidence.push(`Sonraki adım: ${nextStep}`);
  result.reasoningLead = 'Bu ekranda önce hizmet sonucu, sonra değerlendirme ve sonraki adım birlikte okunur.';
  result.nextBestAction = nextStep || (badgeHas(badges, ['done']) ? 'Önce değerlendirme veya sonuç alanını netleştir. Gerekirse bağlı vardiyayı aç.' : 'Önce hizmet durumu bitmiş mi kontrol et.');
  result.safestNextStep = 'En risksiz adım, seçili hizmet satırında durum ve sonraki adımı birlikte okumaktır.';
  result.compareHint = 'Bu ekran kalite takibidir; yeni plan veya pazarlık başlatma ekranı değildir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}


function analyzeAgreements(screenContext, screenDefinition) {
  const result = makeResult('AGREEMENTS', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const status = findValue(fields, ['durum']);
  const start = findValue(fields, ['başlangıç', 'baslangic']);
  const end = findValue(fields, ['bitiş', 'bitis']);
  const vehicle = findValue(fields, ['araç', 'arac']);
  const driver = findValue(fields, ['sürücü', 'surucu']);
  const amount = findValue(fields, ['tutar']);
  if (!result.selectedLabel) result.blockers.push('Önce sözleşme odağı seçilmeden yorum genel kalır.');
  if (hasBlankish(vehicle)) result.missingData.push('Araç alanı boş görünüyor.');
  if (hasBlankish(driver)) result.missingData.push('Sürücü alanı boş görünüyor.');
  if (/requested|countered|bekleyen/.test(normalizeText(status))) result.blockers.push('Karar bekleyen sözleşmede önce onay veya karşı teklif yönü netleşmelidir.');
  if (/active|approved/.test(normalizeText(status)) && (hasBlankish(vehicle) || hasBlankish(driver))) result.blockers.push('Sözleşme aktif görünse de araç veya sürücü eksikse saha hazırlığı tamam değildir.');
  if (status) result.evidence.push(`Durum: ${status}`);
  if (start || end) result.evidence.push(`Tarih: ${start || '-'} → ${end || '-'}`);
  if (amount) result.evidence.push(`Tutar: ${amount}`);
  if (vehicle) result.evidence.push(`Araç: ${vehicle}`);
  if (driver) result.evidence.push(`Sürücü: ${driver}`);
  result.reasoningLead = result.blockers.length
    ? 'Bu sözleşmede ana dikkat noktası karar veya atama tarafında görünüyor.'
    : 'Bu ekranda önce durum, sonra tarih ve araç-sürücü bağı okunmalıdır.';
  result.nextBestAction = /requested|countered|bekleyen/.test(normalizeText(status))
    ? 'Önce karar yönünü netleştir. Onay vereceksen araç ve sürücüyü kontrol et; karşı teklif vereceksen tutarı ve notu tekrar oku.'
    : 'Önce bağlı vardiya veya ufuk bilgisini kontrol et. Sonra sözleşmenin saha etkisini değerlendir.';
  result.safestNextStep = 'En risksiz adım, seçili sözleşmenin tarih aralığı ile araç-sürücü bağını birlikte doğrulamaktır.';
  result.compareHint = 'Sözleşme onayı ile saha hazırlığı aynı şey değildir; araç ve sürücü eksikse iş hâlâ operasyona tam hazır sayılmaz.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeOperationHealth(screenContext, screenDefinition) {
  const result = makeResult('OPERATION_HEALTH', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const live = findValue(fields, ['stale / offline', 'stale', 'offline']);
  const risky = findValue(fields, ['riskli cihaz']);
  const issues = findValue(fields, ['açık sorun', 'acik sorun']);
  const sampleDriver = findValue(fields, ['örnek sürücü', 'ornek surucu']);
  const sampleIssue = findValue(fields, ['örnek sorun', 'ornek sorun']);
  if (hasBlankish(live) && hasBlankish(issues) && hasBlankish(risky)) result.blockers.push('Operasyon sağlığı özeti boş görünüyor.');
  if (!hasBlankish(issues) && Number(String(issues).replace(/[^\d]/g, '') || 0) > 0) result.blockers.push('Açık sorun sayısı sıfır değil; önce risk satırlarına inmek gerekir.');
  if (!hasBlankish(live) && Number(String(live).replace(/[^\d]/g, '') || 0) > 0) result.blockers.push('Stale veya offline sürücü sayısı sıfır değil.');
  if (live) result.evidence.push(`Stale/Offline: ${live}`);
  if (risky) result.evidence.push(`Riskli cihaz: ${risky}`);
  if (issues) result.evidence.push(`Açık sorun: ${issues}`);
  if (sampleDriver) result.evidence.push(`Örnek sürücü: ${sampleDriver}`);
  if (sampleIssue) result.evidence.push(`Örnek sorun: ${sampleIssue}`);
  result.reasoningLead = result.blockers.length
    ? 'Bu ekranda ana konu açık sorunları ve canlılık risklerini azaltmaktır.'
    : 'Bu ekranda önce özet kartlar, sonra sorunlu sürücüler ve açık sorunlar birlikte okunur.';
  result.nextBestAction = sampleIssue
    ? 'Önce örnek sorunu aç. Sonra hangi ekrana gitmen gerektiğini netleştir.'
    : sampleDriver
      ? 'Önce örnek sürücünün canlılık, izin ve oturum durumunu birlikte kontrol et.'
      : 'Önce özet kartlardan hangi riskin yüksek olduğunu belirle. Sonra ilgili ekrana geç.';
  result.safestNextStep = 'En risksiz adım, açık sorun sayısı ile stale/offline sayısını birlikte okuyup önce en riskli satıra inmektir.';
  result.compareHint = 'Operasyon Sağlığı sorun bulma ekranıdır; tek başına atama veya sözleşme kararı ekranı değildir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeOperationVerification(screenContext, screenDefinition) {
  const result = makeResult('OPERATION_VERIFICATION', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const role = findValue(fields, ['rol']);
  const saved = findValue(fields, ['kayıtlı kontrol', 'kayitli kontrol']);
  const total = findValue(fields, ['toplam kontrol']);
  const firstCheck = findValue(fields, ['ilk kontrol']);
  const defaultDecision = findValue(fields, ['varsayılan karar', 'varsayilan karar']);
  const savedN = Number(String(saved).replace(/[^\d]/g, '') || 0);
  const totalN = Number(String(total).replace(/[^\d]/g, '') || 0);
  if (totalN > 0 && savedN < totalN) result.blockers.push('Tüm kontrol maddeleri kaydedilmeden rol yüzeyi tam kapanmış sayılmaz.');
  if (role) result.evidence.push(`Rol: ${role}`);
  if (defaultDecision) result.evidence.push(`Varsayılan karar: ${defaultDecision}`);
  if (saved) result.evidence.push(`Kayıtlı kontrol: ${saved}`);
  if (total) result.evidence.push(`Toplam kontrol: ${total}`);
  if (firstCheck) result.evidence.push(`İlk kontrol: ${firstCheck}`);
  result.reasoningLead = 'Bu ekranda amaç rol bazlı operasyon kontrollerini kanıt ve kısa notla kayıt altına almaktır.';
  result.nextBestAction = totalN > 0 && savedN < totalN
    ? 'Önce kaydı eksik kalan kontrol maddelerini tamamla. Sonra role surface özetini tekrar gözden geçir.'
    : 'Önce seçili rolde kanıt tipi ve notların tutarlı olduğunu kontrol et.';
  result.safestNextStep = 'En risksiz adım, önce seçili rolü netleştirip kontrol maddelerini tek tek kaydetmektir.';
  result.compareHint = 'Varsayılan karar ile manuel kayıt aynı şey değildir; manuel kayıt yapıldıysa son kaydedilen durum esas alınır.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeFieldAcceptance(screenContext, screenDefinition) {
  const result = makeResult('FIELD_ACCEPTANCE', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const decision = findValue(fields, ['karar']);
  const checklist = findValue(fields, ['checklist']);
  const pending = findValue(fields, ['bekleyen']);
  const firstOpen = findValue(fields, ['ilk açık madde', 'ilk acik madde']);
  const pendingN = Number(String(pending).replace(/[^\d]/g, '') || 0);
  if (pendingN > 0) result.blockers.push('Checklist içinde henüz PASS olmayan maddeler var.');
  if (decision) result.evidence.push(`Karar: ${decision}`);
  if (checklist) result.evidence.push(`Checklist: ${checklist}`);
  if (pending) result.evidence.push(`Bekleyen: ${pending}`);
  if (firstOpen) result.evidence.push(`İlk açık madde: ${firstOpen}`);
  result.reasoningLead = 'Bu ekranda saha kabul kararı checklist ve test oturumu ile birlikte okunur.';
  result.nextBestAction = pendingN > 0
    ? 'Önce PASS olmayan ilk maddeyi netleştir. Sonra kabul kararını tekrar değerlendir.'
    : 'Önce test oturumu kararını ve checklist özetini birlikte doğrula.';
  result.safestNextStep = 'En risksiz adım, PASS olmayan maddeleri kapatıp kabul kararını en son vermektir.';
  result.compareHint = 'Checklist PASS olması ile kabul kararının ACCEPT olması aynı şey değildir; ikisi birlikte okunmalıdır.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeTrustQuality(screenContext, screenDefinition) {
  const result = makeResult('TRUST_QUALITY', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const evalCount = findValue(fields, ['değerlendirme alanı', 'degerlendirme alani']);
  const signalCount = findValue(fields, ['sağlayıcı sinyali', 'saglayici sinyali']);
  const firstSignal = findValue(fields, ['ilk sinyal']);
  if (Number(String(signalCount).replace(/[^\d]/g, '') || 0) <= 0) result.blockers.push('Sağlayıcı kalite sinyali henüz oluşmamış veya boş görünüyor.');
  if (evalCount) result.evidence.push(`Değerlendirme alanı: ${evalCount}`);
  if (signalCount) result.evidence.push(`Sağlayıcı sinyali: ${signalCount}`);
  if (firstSignal) result.evidence.push(`İlk sinyal: ${firstSignal}`);
  result.reasoningLead = 'Bu ekranda hizmet değerlendirmesi ile sağlayıcı sinyali birlikte okunur.';
  result.nextBestAction = result.blockers.length
    ? 'Önce hangi kalite sinyalinin eksik kaldığını netleştir. Sonra hizmet değerlendirme hattına geri dön.'
    : 'Önce değerlendirme alanları ile sağlayıcı sinyal özetini birlikte oku.';
  result.safestNextStep = 'En risksiz adım, değerlendirme alanları ile sağlayıcı sinyal setini aynı anda okumaktır.';
  result.compareHint = 'Hizmet puanı ile sağlayıcı sinyali aynı şey değildir; karar desteği için ikisi birlikte okunur.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeObservability(screenContext, screenDefinition) {
  const result = makeResult('OBSERVABILITY', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const live = findValue(fields, ['canlı durum', 'canli durum']);
  const gps = findValue(fields, ['gps skoru']);
  const risk = findValue(fields, ['cihaz riski']);
  const lastEvent = findValue(fields, ['son olay']);
  if (/unknown|risk|warn|high|kritik/i.test(normalizeText(risk))) result.blockers.push(`Cihaz sağlık riski dikkat istiyor: ${risk}`);
  if (Number(String(gps).replace(/[^\d]/g, '') || 0) > 0 && Number(String(gps).replace(/[^\d]/g, '') || 0) < 60) result.blockers.push('GPS güven skoru düşük görünüyor.');
  if (live) result.evidence.push(`Canlı durum: ${live}`);
  if (gps) result.evidence.push(`GPS skoru: ${gps}`);
  if (risk) result.evidence.push(`Cihaz riski: ${risk}`);
  if (lastEvent) result.evidence.push(`Son olay: ${lastEvent}`);
  result.reasoningLead = 'Bu ekranda canlı sağlık, GPS güveni ve son olaylar birlikte okunmalıdır.';
  result.nextBestAction = lastEvent
    ? 'Önce son canlı olayın önemini ve zamanını oku. Sonra cihaz sağlık notlarıyla birlikte değerlendir.'
    : 'Önce canlı durum ile GPS güven notlarını oku. Sonra event type ve son sync alanlarını kontrol et.';
  result.safestNextStep = 'En risksiz adım, canlı durum ile GPS skorunu birlikte okuyup sonra son olaya inmektir.';
  result.compareHint = 'Canlı durum ile GPS güven skoru aynı şey değildir; biri saha akışını, diğeri veri kalitesini özetler.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzePlanningCenter(screenContext, screenDefinition) {
  const result = makeResult('PLANNING_CENTER', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const focus = firstNonEmpty(findValue(fields, ['seçili kayıt', 'secili kayit', 'plan', 'paket']), screenContext?.selectedLabel, '');
  const needsReview = badgeHas(badges, ['needs_review']) || badgeHas(badges, ['review']) || (Array.isArray(fields) && fields.some((row) => /needs_review|incele|eksik koordinat|konum sorunu/i.test(String(row?.value || ''))));
  if (focus) result.evidence.push(`Seçili odak: ${focus}`);
  if (needsReview) result.blockers.push('Konum veya veri sorunu çözülmeden plan çıktısı güvenilmez.');
  result.reasoningLead = 'Planlama Merkezi yeni iş veya vardiya kurma ekranıdır; mevcut işin teklif ve operasyon takibi Vardiyalar ekranında yapılır.';
  result.nextBestAction = needsReview
    ? 'Önce Konum İncele ekranında eksik koordinat veya review gerektiren kayıtları düzelt. Sonra Rehberi Başlat ile plan akışını aç.'
    : 'Önce Rehberi Başlat ile plan akışını aç. Paket, tarih ve günleri seç; çözüm ve tekliften sonra takibi Vardiyalar ekranında sürdür.';
  result.safestNextStep = needsReview
    ? 'En risksiz adım, plan kurmadan önce konum sorunlarını kapatmaktır.'
    : 'En risksiz adım, Guided/Rehber akışı ile planı kurup çıktıyı sonra Vardiyalar ekranında takip etmektir.';
  result.compareHint = 'Planlama Merkezi yeni iş kurar; Vardiyalar mevcut işin teklif, atama ve operasyon takibini yapar.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeDriver(screenContext, screenDefinition) {
  const result = makeResult(classifyScreenPath(screenDefinition?.path || screenContext?.path || ''), screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  const nextStop = findValue(fields, ['sıradaki durak', 'siradaki durak']);
  const eta = findValue(fields, ['eta']);
  const gps = findValue(fields, ['gps', 'son gps']);
  const task = findValue(fields, ['görev', 'gorev', 'iş', 'is']);
  if (!result.selectedLabel && !task) result.blockers.push('Aktif görev veya seçili kayıt görünmüyor.');
  if (hasBlankish(nextStop)) result.missingData.push('Sıradaki durak görünmüyor.');
  if (hasBlankish(eta) && !hasBlankish(nextStop)) result.missingData.push('ETA güncel görünmüyor.');
  if (hasOldGps(gps) || badgeHas(badges, ['stale'])) result.blockers.push('Konum akışı eski görünüyor.');
  if (task) result.evidence.push(`Görev: ${task}`);
  if (nextStop) result.evidence.push(`Sıradaki durak: ${nextStop}`);
  if (eta) result.evidence.push(`ETA: ${eta}`);
  if (gps) result.evidence.push(`GPS: ${gps}`);
  result.reasoningLead = result.blockers.length ? 'Sürücü tarafında ana risk canlı konum zincirinin zayıflaması.' : 'Sürücü ekranında önce aktif görev, sonra sıradaki durak ve ETA okunmalı.';
  result.nextBestAction = result.blockers.length ? 'Önce konum akışı sürüyor mu kontrol et. Sonra bugünkü iş ekranına dönüp sıradaki durağı tekrar doğrula.' : 'Önce sıradaki durağı ve ETA bilgisini kontrol et. Sonra navigasyon veya görev akışına devam et.';
  result.safestNextStep = 'En risksiz adım, aktif görev açık mı ve sıradaki durak dolu mu bunu doğrulamaktır.';
  result.compareHint = 'Sürücünün telefon GPS\'i akmıyorsa ETA ve reached zinciri de geri düşebilir.';
  applyUiSurface(result, screenContext);
  return finalize(result);
}

function analyzeGeneric(screenContext, screenDefinition) {
  const result = makeResult('GENERIC', screenContext, screenDefinition);
  const fields = selectedFieldRows(screenContext);
  const badges = selectedBadgeRows(screenContext);
  if (!result.selectedLabel && !fields.length && !badges.length) result.blockers.push('Henüz seçili kayıt bağlamı görünmüyor.');
  const blankLabels = fields.filter((row) => hasBlankish(row.value)).map((row) => row.label);
  if (blankLabels.length) result.missingData.push(`${blankLabels.slice(0, 3).join(', ')} alanları boş görünüyor.`);
  result.evidence = fields.slice(0, 3).map((row) => `${row.label}: ${row.value}`).concat(badges.slice(0, 2).map((row) => `${row.label}: ${row.value}`));
  result.reasoningLead = 'Bu ekranda önce seçili kayıt ve boş alanlar okunmalı.';
  result.nextBestAction = 'Önce seçili kayıt veya ana alanları doğrula. Sonra buton veya sonraki ekran kararını ver.';
  result.safestNextStep = 'En risksiz adım, yorum yapmadan önce seçili satırı gerçekten değiştirdiğini kontrol etmektir.';
  applyStructuredFacts(result, screenContext);
  applyUiSurface(result, screenContext);
  return finalize(result);
}

export function analyzeScreenState({ screenContext = null, screenDefinition = null, conversationState = null }) {
  const path = String(screenDefinition?.path || screenContext?.path || '');
  const type = classifyScreenPath(path);
  if (type === 'GEOREVIEW') return analyzeGeoReview(screenContext, screenDefinition, conversationState);
  if (type === 'FEEDBACK') return analyzeFeedback(screenContext, screenDefinition, conversationState);
  if (type === 'KVKK') return analyzeConfiguredSurface('KVKK', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.KVKK);
  if (type === 'NOTIFICATIONS') return analyzeConfiguredSurface('NOTIFICATIONS', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.NOTIFICATIONS);
  if (type === 'LOG_EXPORT') return analyzeConfiguredSurface('LOG_EXPORT', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.LOG_EXPORT);
  if (type === 'OPERATIONS') return analyzeConfiguredSurface('OPERATIONS', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.OPERATIONS);
  if (type === 'COMMERCIAL_CORE') return analyzeConfiguredSurface('COMMERCIAL_CORE', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.COMMERCIAL_CORE);
  if (type === 'ROOM_COMMERCIAL_FLOW') return analyzeConfiguredSurface('ROOM_COMMERCIAL_FLOW', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.ROOM_COMMERCIAL_FLOW);
  if (type === 'REPORTS') return analyzeConfiguredSurface('REPORTS', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.REPORTS);
  if (type === 'DRIVER_PIN') return analyzeConfiguredSurface('DRIVER_PIN', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.DRIVER_PIN);
  if (type === 'PILOT_LAUNCH_GATE') return analyzeConfiguredSurface('PILOT_LAUNCH_GATE', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.PILOT_LAUNCH_GATE);
  if (type === 'REGIONS') return analyzeConfiguredSurface('REGIONS', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.REGIONS);
  if (type === 'SSOT_ALIGNMENT') return analyzeConfiguredSurface('SSOT_ALIGNMENT', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.SSOT_ALIGNMENT);
  if (type === 'NATURAL_COPILOT') return analyzeConfiguredSurface('NATURAL_COPILOT', screenContext, screenDefinition, conversationState, SURFACE_ANALYSIS_RULES.NATURAL_COPILOT);
  if (type === 'MAP') return analyzeMap(screenContext, screenDefinition, conversationState);
  if (type === 'SHIFTS') return analyzeShifts(screenContext, screenDefinition, conversationState);
  if (type === 'COMMERCIAL_FLOW') return analyzeCommercialFlow(screenContext, screenDefinition, conversationState);
  if (type === 'SERVICE_EVALUATION') return analyzeServiceEvaluation(screenContext, screenDefinition, conversationState);
  if (type === 'AGREEMENTS') return analyzeAgreements(screenContext, screenDefinition, conversationState);
  if (type === 'OPERATION_HEALTH') return analyzeOperationHealth(screenContext, screenDefinition, conversationState);
  if (type === 'OPERATION_VERIFICATION') return analyzeOperationVerification(screenContext, screenDefinition, conversationState);
  if (type === 'FIELD_ACCEPTANCE') return analyzeFieldAcceptance(screenContext, screenDefinition, conversationState);
  if (type === 'TRUST_QUALITY') return analyzeTrustQuality(screenContext, screenDefinition, conversationState);
  if (type === 'OBSERVABILITY') return analyzeObservability(screenContext, screenDefinition, conversationState);
  if (type === 'PLANNING_CENTER') return analyzePlanningCenter(screenContext, screenDefinition, conversationState);
  if (type === 'DRIVER_TODAY' || type === 'DRIVER_MAP') return analyzeDriver(screenContext, screenDefinition, conversationState);
  return analyzeGeneric(screenContext, screenDefinition, conversationState);
}
