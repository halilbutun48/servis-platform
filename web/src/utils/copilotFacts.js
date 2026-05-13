function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function pushIf(rows, condition, value) {
  if (condition && value) rows.push(value);
}

function actionRule({
  key,
  label,
  enabled,
  reason = '',
  purpose = '',
  whenToUse = '',
  whatHappens = '',
  riskNote = '',
  required = [],
  blockedBy = [],
}) {
  const row = {
    key: key || normalizeText(label).replace(/[^a-z0-9çğıöşü]+/gi, '_'),
    label,
    enabled: Boolean(enabled),
    purpose,
    whenToUse,
    whatHappens,
    riskNote,
    required: (Array.isArray(required) ? required : []).filter(Boolean),
    blockedBy: (Array.isArray(blockedBy) ? blockedBy : []).filter(Boolean),
  };
  if (!enabled) row.reason = reason || 'Bu işlem için ön koşullar tamamlanmamış olabilir.';
  if (enabled && reason) row.reason = reason;
  return row;
}

function splitActions(actions = []) {
  const rows = (Array.isArray(actions) ? actions : []).filter((row) => row && row.label);
  return {
    allowedActions: rows.filter((row) => row.enabled !== false),
    blockedActions: rows.filter((row) => row.enabled === false),
  };
}

function compactText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || String(fallback || '').trim();
}

function compactList(items = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item);
    if (!text) continue;
    const key = text.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function normalizeCopilotSignal(signal, fallbackId = '') {
  if (!signal) return null;
  if (typeof signal === 'string') {
    const text = compactText(signal);
    if (!text) return null;
    return {
      id: compactText(fallbackId || text || 'signal'),
      label: text,
      value: text,
      note: '',
    };
  }
  if (typeof signal !== 'object') return null;
  const id = compactText(signal.id || signal.key || fallbackId || signal.label || 'signal');
  const label = compactText(signal.label || signal.title || signal.name || id || 'Sinyal');
  const value = compactText(signal.value || signal.text || signal.state || signal.status || signal.summary || '-');
  const note = compactText(signal.note || signal.help || signal.reason || '');
  return {
    id,
    label: label || id,
    value: value || '-',
    note,
  };
}

export function buildCopilotSignalSummary(signals = [], limit = 3) {
  const rows = compactList(
    (Array.isArray(signals) ? signals : [])
      .map((signal) => normalizeCopilotSignal(signal))
      .filter(Boolean)
      .map((signal) => `${signal.label}: ${signal.value}`),
    limit,
  );
  return rows.join(' • ');
}

function signalText(value) {
  return compactText(value, '');
}

function normalizeSignalText(value) {
  return normalizeText(compactText(value, ''));
}

function scoreSignalTerms(text, terms = []) {
  const normalized = normalizeSignalText(text);
  if (!normalized) return 0;
  let score = 0;
  for (const term of Array.isArray(terms) ? terms : []) {
    const needle = normalizeSignalText(term);
    if (!needle) continue;
    if (normalized.includes(needle)) {
      score += 3;
      continue;
    }
    if (needle.split(' ').some((part) => part && normalized.includes(part))) {
      score += 1;
    }
  }
  return score;
}

function pickSignalNote(id) {
  switch (id) {
    case 'missing-vehicle-driver':
      return 'Önce seçili araç ve sürücü bağını doğrula.';
    case 'route-stop':
      return 'Rota ve durak bilgisini birlikte oku.';
    case 'shift-status':
      return 'Durum satırını ve bağlı vardiyayı birlikte kontrol et.';
    case 'gps-old':
      return 'Son GPS zamanını ve konum kaynağını kontrol et.';
    case 'operation-proof':
      return 'Kanıt kartını ve görünürlük satırını aç.';
    case 'contract-shift':
      return 'Sözleşme ile vardiya üretimi bağını kontrol et.';
    case 'payment-info':
      return 'Hakediş önizleme, ödeme hesabı ve komisyonu birlikte oku.';
    case 'kvkk-access':
      return 'Rol ve görünürlük sınırını kontrol et.';
    case 'quality-signal':
      return 'Kanıt, taslak skor ve inceleme kararını birlikte oku.';
    case 'feedback-open':
      return 'Açık veya kritik durumu önce ayır.';
    case 'notification-source':
      return 'Bildirimin bağlı olduğu olay kaydına git.';
    default:
      return '';
  }
}

export function buildLiveFactConfidence({
  screenType = '',
  stage = '',
  readiness = '',
  readinessScore = 0,
  summary = '',
  blockers = [],
  evidence = [],
  selectedRecordStatus = '',
  copilotSignals = [],
} = {}) {
  const evidenceText = compactList([...compactList(blockers, 4), ...compactList(evidence, 4)], 4).join(' • ');
  const signalCount = Array.isArray(copilotSignals) ? copilotSignals.length : 0;
  const screenSignal = signalCount > 0 || evidenceText ? 'Görünüyor' : 'Sınırlı';
  const selectedSignal = signalText(selectedRecordStatus || stage || readiness || 'Seçili kayıt yok');
  const workflowSignal = /READY/.test(normalizeSignalText(readiness)) || /READY/.test(normalizeSignalText(stage))
    ? 'Hazır'
    : Number.isFinite(Number(readinessScore)) && Number(readinessScore) >= 65
      ? 'Kontrollü'
      : 'Kısmi';
  const combined = normalizeSignalText([screenType, stage, readiness, summary, evidenceText, selectedSignal].join(' '));
  let missingSignal = 'Belirgin eksik yok';
  if (/(kvkk|yetki|rol|gizli|görünmüyor|gorunmuyor)/.test(combined)) missingSignal = 'Yetki sınırı';
  else if (/(gps|konum|telefon gps|son gps|offline)/.test(combined)) missingSignal = 'GPS bekleniyor';
  else if (/(hakediş|hakedis|ödeme hesabı|odeme hesabi|komisyon|csv|önizleme|onizleme|eksik bilgi)/.test(combined)) missingSignal = 'Hakediş eksik bilgi';
  else if (/(sözleşme|sozlesme|vardiya üretimi|vardiya uretimi|vardiya)/.test(combined)) missingSignal = 'Sözleşme/vardiya kontrolü';
  else if (/(geri bildirim|feedback|açık|acik|kritik|tekrarlayan)/.test(combined)) missingSignal = 'Geri bildirim açık';
  else if (/(bildirim|notification|olay kaynağı|olay kaynagi)/.test(combined)) missingSignal = 'Bildirim kaynağı';
  else if (/(kalite|quality|sağlayıcı|saglayici|provider)/.test(combined)) missingSignal = 'Kalite sinyali';
  else if (/(araç|arac|sürücü|surucu|durak|rota)/.test(combined)) missingSignal = 'Eksik veri';
  const summaryText = selectedSignal && selectedSignal !== 'Seçili kayıt yok'
    ? `Seçili kayıt: ${selectedSignal}. Ekrandaki sinyal ${screenSignal}. Genel workflow ${workflowSignal}. Eksik sinyal: ${missingSignal}.`
    : `Ekrandaki sinyal ${screenSignal}. Genel workflow ${workflowSignal}. Eksik sinyal: ${missingSignal}.`;
  return {
    summary: summaryText,
    rows: [
      normalizeCopilotSignal({
        id: 'screen_signal',
        label: 'Ekrandaki sinyal',
        value: screenSignal,
        note: signalCount ? 'Ekrandan okunan sinyal var.' : 'Sinyal az.',
      }),
      normalizeCopilotSignal({
        id: 'selected_record',
        label: 'Seçili kayıt',
        value: selectedSignal,
        note: selectedSignal && selectedSignal !== 'Seçili kayıt yok' ? 'Seçili satırdan geliyor.' : 'Seçili kayıt görünmüyor.',
      }),
      normalizeCopilotSignal({
        id: 'workflow_signal',
        label: 'Genel workflow',
        value: workflowSignal,
        note: `Durum: ${signalText(readiness || stage || 'REVIEW_NEEDED')}`,
      }),
      normalizeCopilotSignal({
        id: 'missing_signal',
        label: 'Sinyal eksik',
        value: missingSignal,
        note: evidenceText || 'Belirgin boşluk görünmüyor.',
      }),
    ].filter(Boolean),
  };
}

export function buildDiagnosticPriority({
  screenType = '',
  stage = '',
  readiness = '',
  selectedRecordStatus = '',
  summary = '',
  blockers = [],
  evidence = [],
  copilotSignals = [],
} = {}) {
  const signalTextParts = [
    screenType,
    stage,
    readiness,
    selectedRecordStatus,
    summary,
    ...compactList(blockers, 4),
    ...compactList(evidence, 6),
    ...compactList(
      (Array.isArray(copilotSignals) ? copilotSignals : []).map((signal) => {
        const normalized = normalizeCopilotSignal(signal);
        return normalized ? `${normalized.label} ${normalized.value} ${normalized.note}` : '';
      }),
      8,
    ),
  ];
  const text = normalizeSignalText(signalTextParts.join(' '));
  const candidates = [
    { id: 'missing-vehicle-driver', label: 'Eksik araç/sürücü', terms: ['araç', 'sürücü', 'driver', 'vehicle', 'plaka'] },
    { id: 'route-stop', label: 'Rota/durak eksik', terms: ['rota', 'durak', 'route', 'stop'] },
    { id: 'shift-status', label: 'Görev/vardiya durumu uygun değil', terms: ['vardiya', 'shift', 'approved', 'active', 'durum', 'status', 'hazır değil', 'hazir degil'] },
    { id: 'gps-old', label: 'GPS yok/eski', terms: ['gps', 'konum', 'telefon gps', 'son gps', 'offline', 'eski'] },
    { id: 'operation-proof', label: 'OperationProof eksik', terms: ['operationproof', 'kanıt', 'kanit', 'proof'] },
    { id: 'contract-shift', label: 'Sözleşme/vardiya üretimi yok', terms: ['sözleşme', 'sozlesme', 'vardiya üretimi', 'vardiya uretimi', 'üretildi mi', 'uretildi mi'] },
    { id: 'payment-info', label: 'Hakediş eksik bilgi', terms: ['hakediş', 'hakedis', 'ödeme hesabı', 'odeme hesabi', 'komisyon', 'csv', 'önizleme', 'onizleme', 'eksik bilgi'] },
    { id: 'kvkk-access', label: 'KVKK/yetki nedeniyle görünmüyor', terms: ['kvkk', 'yetki', 'rol', 'görünmüyor', 'gorunmuyor', 'gizli'] },
    { id: 'quality-signal', label: 'Kalite sinyali', terms: ['kalite', 'quality', 'sağlayıcı', 'saglayici', 'provider', 'değerlendirme', 'degerlendirme'] },
    { id: 'feedback-open', label: 'Geri bildirim açık', terms: ['geri bildirim', 'feedback', 'açık', 'acik', 'kritik', 'tekrarlayan'] },
    { id: 'notification-source', label: 'Bildirim kaynağı', terms: ['bildirim', 'notification', 'olay', 'kaynak'] },
  ];
  const boostedIds = new Set(
    screenType === 'PAYMENT_READINESS'
      ? ['payment-info', 'contract-shift', 'shift-status', 'kvkk-access']
      : screenType === 'TRUST_QUALITY'
        ? ['quality-signal', 'feedback-open', 'operation-proof']
        : screenType === 'FEEDBACK'
          ? ['feedback-open', 'notification-source', 'kvkk-access']
          : screenType === 'MAP'
            ? ['gps-old', 'missing-vehicle-driver', 'route-stop']
            : screenType === 'SHIFTS'
              ? ['missing-vehicle-driver', 'route-stop', 'shift-status', 'operation-proof']
              : screenType === 'COMMERCIAL_FLOW'
                ? ['payment-info', 'contract-shift', 'shift-status']
                : [],
  );
  const ranked = candidates
    .map((candidate, index) => {
      const keywordScore = scoreSignalTerms(text, candidate.terms);
      const screenScore = boostedIds.has(candidate.id) ? 2 : 0;
      return {
        ...candidate,
        index,
        score: keywordScore + screenScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = ranked.slice(0, 4);
  const prioritySummary = picked.length
    ? `En olası sıra: ${picked.map((item) => item.label).join(' • ')}`
    : 'Belirgin öncelik ayrımı yok';
  return {
    summary: prioritySummary,
    rows: picked.map((item, idx) => normalizeCopilotSignal({
      id: item.id,
      label: `${idx + 1}. öncelik`,
      value: item.label,
      note: pickSignalNote(item.id),
    })).filter(Boolean),
  };
}

export function buildActionSimulationWording({
  screenType = '',
  stage = '',
  readiness = '',
  selectedRecordStatus = '',
  diagnosticPriority = null,
  roleBoundary = '',
} = {}) {
  const topPriority = compactText(diagnosticPriority?.rows?.[0]?.value || diagnosticPriority?.rows?.[0]?.label || '', '');
  const normalizedScreenType = normalizeSignalText(screenType);
  let text = 'Bu durumda doğru aksiyon şu olurdu: önce en güçlü sinyali doğrula, sonra ilgili ekranı aç; gerçek write yok.';
  if (normalizedScreenType === 'PAYMENT_READINESS' || normalizedScreenType === 'COMMERCIAL_FLOW') {
    text = 'Bu durumda doğru aksiyon şu olurdu: hakediş önizleme, eksik bilgi, ödeme hesabı ve komisyon satırlarını kontrol et; gerçek write yok.';
  } else if (normalizedScreenType === 'TRUST_QUALITY') {
    text = 'Bu durumda doğru aksiyon şu olurdu: kanıt, taslak skor, inceleme kararı ve denetim izini birlikte kontrol et; kesin sıralama yapma.';
  } else if (normalizedScreenType === 'FEEDBACK') {
    text = 'Bu durumda doğru aksiyon şu olurdu: açık veya kritik kaydı ve sorumlu rolü kontrol et; yönetim aksiyonu yapma.';
  } else if (normalizedScreenType === 'MAP' || normalizedScreenType === 'SHIFTS' || normalizedScreenType === 'OPERATION_PROOF') {
    text = 'Bu durumda doğru aksiyon şu olurdu: araç, sürücü, rota/durak ve GPS sinyalini birlikte kontrol et; sonra doğru ekranı aç.';
  } else if (normalizedScreenType === 'KVKK' || normalizedScreenType === 'ROLE_HELP') {
    text = 'Bu durumda doğru aksiyon şu olurdu: rol ve görünürlük sınırını kontrol et; yetkisiz yönetim aksiyonu önermem.';
  } else if (topPriority) {
    text = `Bu durumda doğru aksiyon şu olurdu: önce ${topPriority.toLocaleLowerCase('tr-TR')} kontrol edilir, sonra uygun ekran açılır; gerçek write yok.`;
  }
  if (roleBoundary) {
    text += ' Bu rolde yönetim aksiyonu önermem.';
  }
  if (selectedRecordStatus && !text.includes(selectedRecordStatus)) {
    text += ` Seçili kayıt durumu: ${selectedRecordStatus}.`;
  }
  if (stage && !text.includes(stage)) {
    text += ` Aşama: ${stage}.`;
  }
  if (readiness && !text.includes(readiness)) {
    text += ` Hazırlık: ${readiness}.`;
  }
  return text.trim();
}

function buildReadonlyCopilotFacts({
  screenType = '',
  stage = '',
  readiness = 'REVIEW_NEEDED',
  readinessScore = 0,
  summary = '',
  blockers = [],
  evidence = [],
  nextBestAction = '',
  safestNextStep = '',
  compareHint = '',
  counters = {},
  copilotSignals = [],
  boundaryNotes = [],
  selectedRecordStatus = '',
  liveFactConfidence = null,
  diagnosticPriority = null,
  actionSimulation = '',
}) {
  const signals = (Array.isArray(copilotSignals) ? copilotSignals : [])
    .map((signal, idx) => normalizeCopilotSignal(signal, `signal_${idx + 1}`))
    .filter(Boolean)
    .slice(0, 8);
  const selectedRecordStatusText = compactText(selectedRecordStatus, compactText(stage || readiness || summary || 'Seçili kayıt yok', 'Seçili kayıt yok'));
  const liveFactConfidenceValue = liveFactConfidence && typeof liveFactConfidence === 'object'
    ? {
      summary: compactText(liveFactConfidence.summary || ''),
      rows: Array.isArray(liveFactConfidence.rows)
        ? liveFactConfidence.rows.map((row, idx) => normalizeCopilotSignal(row, `live_fact_${idx + 1}`)).filter(Boolean)
        : [],
    }
    : buildLiveFactConfidence({
      screenType: compactText(screenType, 'SCREEN'),
      stage,
      readiness,
      readinessScore,
      summary,
      blockers,
      evidence,
      selectedRecordStatus: selectedRecordStatusText,
      copilotSignals: signals,
    });
  const diagnosticPriorityValue = diagnosticPriority && typeof diagnosticPriority === 'object'
    ? {
      summary: compactText(diagnosticPriority.summary || ''),
      rows: Array.isArray(diagnosticPriority.rows)
        ? diagnosticPriority.rows.map((row, idx) => normalizeCopilotSignal(row, `diagnostic_${idx + 1}`)).filter(Boolean)
        : [],
    }
    : buildDiagnosticPriority({
      screenType: compactText(screenType, 'SCREEN'),
      stage,
      readiness,
      selectedRecordStatus: selectedRecordStatusText,
      summary,
      blockers,
      evidence,
      copilotSignals: signals,
    });
  const actionSimulationText = compactText(
    actionSimulation
      || buildActionSimulationWording({
        screenType: compactText(screenType, 'SCREEN'),
        stage,
        readiness,
        selectedRecordStatus: selectedRecordStatusText,
        diagnosticPriority: diagnosticPriorityValue,
      }),
    '',
  );
  return {
    screenType: compactText(screenType, 'SCREEN'),
    stage: compactText(stage, '-'),
    readiness: compactText(readiness, 'REVIEW_NEEDED'),
    readinessScore: Number.isFinite(Number(readinessScore)) ? Number(readinessScore) : 0,
    selectedRecordStatus: selectedRecordStatusText,
    liveFactConfidence: liveFactConfidenceValue,
    diagnosticPriority: diagnosticPriorityValue,
    actionSimulation: actionSimulationText,
    blockers: compactList(blockers, 5),
    evidence: compactList(evidence, 6),
    nextBestAction: compactText(nextBestAction),
    safestNextStep: compactText(safestNextStep),
    compareHint: compactText(compareHint),
    counters: Object.fromEntries(
      Object.entries(counters && typeof counters === 'object' ? counters : {})
        .map(([key, value]) => [key, value == null || value === '' ? 0 : value]),
    ),
    copilotSignals: signals,
    copilotSummary: compactList([
      summary,
      buildCopilotSignalSummary(signals, 3),
      selectedRecordStatusText,
      liveFactConfidenceValue?.summary || '',
      diagnosticPriorityValue?.summary || '',
      ...compactList(boundaryNotes, 3),
    ], 3).join(' • '),
    copilotBoundary: compactList(boundaryNotes, 4),
  };
}

export function buildOperationsCopilotFacts({
  operationProofSummary,
  auditCount = 0,
  notificationCount = 0,
  eventCount = 0,
}) {
  const statusText = compactText(operationProofSummary?.statusText || operationProofSummary?.summaryText || operationProofSummary?.title || operationProofSummary?.status || 'Bekliyor', 'Bekliyor');
  const summaryText = compactText(operationProofSummary?.summaryText || operationProofSummary?.visibilityNote || operationProofSummary?.nextAction || '', '');
  const nonFinalText = compactText(operationProofSummary?.nonFinalText || 'Hakediş için nihai karar değildir.', 'Hakediş için nihai karar değildir.');
  const gpsVisibility = compactText(
    operationProofSummary?.visibilityNote
    || (Array.isArray(operationProofSummary?.signals) && operationProofSummary.signals.some((signal) => /gps|telefon/i.test(compactText(signal?.id || signal?.label || signal?.value || ''))) ? 'Görünüyor' : 'Kontrol gerekli'),
    'Kontrol gerekli',
  );
  const blockerText = compactList(
    [
      ...(Array.isArray(operationProofSummary?.checklist) ? operationProofSummary.checklist.filter((row) => row && row.done === false).map((row) => row?.note || row?.label || '') : []),
      operationProofSummary?.nextAction || '',
      summaryText,
    ],
    3,
  ).join(' • ');
  return buildReadonlyCopilotFacts({
    screenType: 'OPERATION_PROOF',
    stage: statusText,
    readiness: /READY|EVIDENCE_READY|COMPLETED|REVIEWED/.test(statusText.toUpperCase()) ? 'READY' : /PARTIAL|NEEDS_REVIEW|NOT_READY/.test(statusText.toUpperCase()) ? 'REVIEW_NEEDED' : 'REVIEW_NEEDED',
    readinessScore: /READY|EVIDENCE_READY|COMPLETED|REVIEWED/.test(statusText.toUpperCase()) ? 86 : /PARTIAL|NEEDS_REVIEW/.test(statusText.toUpperCase()) ? 58 : 40,
    summary: summaryText || nonFinalText,
    blockers: blockerText ? [blockerText] : [],
    evidence: [
      `operationProof: ${statusText}`,
      `gpsSourceVisibility: ${gpsVisibility}`,
      `audit/notification/event: ${auditCount}/${notificationCount}/${eventCount}`,
    ],
    nextBestAction: compactText(operationProofSummary?.nextAction || 'İlk bakılacak yer: Servis Kanıtı kartı.', 'İlk bakılacak yer: Servis Kanıtı kartı.'),
    safestNextStep: 'Önce Servis Kanıtı kartındaki durum ve eksik/engel satırını oku.',
    compareHint: 'Servis Kanıtı operasyon görünürlüğü sağlar; hakediş için nihai karar değildir.',
    counters: {
      auditCount: Number(auditCount || 0),
      notificationCount: Number(notificationCount || 0),
      eventCount: Number(eventCount || 0),
    },
    copilotSignals: [
      { id: 'operationProof', label: 'Servis kanıtı', value: statusText, note: nonFinalText },
      { id: 'gpsSourceVisibility', label: 'GPS görünürlüğü', value: gpsVisibility, note: 'Sürücünün telefon GPS’i ve araç görünürlüğü okunur.' },
      { id: 'operationProofBlocker', label: 'Eksik / engel', value: blockerText || 'Yok', note: summaryText || nonFinalText },
      { id: 'auditSummary', label: 'Denetim / bildirim / olay', value: `${auditCount} / ${notificationCount} / ${eventCount}`, note: 'Son denetim, bildirim ve olay özetleri.' },
    ],
    boundaryNotes: [nonFinalText, 'Sürücünün telefon GPS’i güvenli sinyal olarak görünür.'],
  });
}

export function buildTrustQualityCopilotFacts({
  proofSummary,
  draftScoreSummary,
  reviewDecisionSummary,
  reviewHistorySummary,
  providerSignal,
  summary,
  evaluation,
}) {
  const proofStatus = compactText(proofSummary?.statusText || proofSummary?.summaryText || proofSummary?.title || proofSummary?.status || 'Bekliyor', 'Bekliyor');
  const draftBand = compactText(draftScoreSummary?.scoreBand || draftScoreSummary?.status || draftScoreSummary?.title || 'NO_SCORE', 'NO_SCORE');
  const draftScore = draftScoreSummary?.draftScore != null ? `${Number(draftScoreSummary.draftScore)} / 100` : 'Skor yok';
  const reviewStatus = compactText(reviewDecisionSummary?.reviewStatus || reviewDecisionSummary?.status || reviewDecisionSummary?.title || 'REVIEW_PENDING', 'REVIEW_PENDING');
  const historyText = compactText(reviewHistorySummary?.latestDecision?.statusText || reviewHistorySummary?.summaryText || reviewHistorySummary?.title || 'Henüz geçmiş yok.', 'Henüz geçmiş yok.');
  const providerCompare = compactText(providerSignal?.summary || summary?.summaryText || 'Sağlayıcı karşılaştırması için hazırlık', 'Sağlayıcı karşılaştırması için hazırlık');
  const nonFinal = compactText(draftScoreSummary?.nonFinalText || reviewDecisionSummary?.nonFinalText || reviewHistorySummary?.nonFinalText || 'Bu bilgi kesin kalite puanı değildir.', 'Bu bilgi kesin kalite puanı değildir.');
  return buildReadonlyCopilotFacts({
    screenType: 'TRUST_QUALITY',
    stage: reviewStatus,
    readiness: /REVIEWED|READY_FOR_REVIEW/.test(reviewStatus.toUpperCase()) ? 'READY' : 'REVIEW_NEEDED',
    readinessScore: /REVIEWED|READY_FOR_REVIEW/.test(reviewStatus.toUpperCase()) ? 82 : 54,
    summary: providerCompare,
    blockers: [nonFinal, 'Sağlayıcı sıralaması değildir.'],
    evidence: [
      `qualitySignal: ${draftBand}`,
      `draftScore: ${draftScore}`,
      `reviewDecision: ${reviewStatus}`,
      `reviewHistory: ${historyText}`,
    ],
    nextBestAction: compactText(reviewDecisionSummary?.nextAction || draftScoreSummary?.nextAction || 'Önce kanıt, taslak skor ve inceleme kararını birlikte oku.', 'Önce kanıt, taslak skor ve inceleme kararını birlikte oku.'),
    safestNextStep: 'Önce kanıt özetini aç, sonra taslak skor ve karar geçmişine geç.',
    compareHint: compactText(providerCompare || 'Taslak skor ile inceleme kararı birlikte okunur.', 'Taslak skor ile inceleme kararı birlikte okunur.'),
    counters: {
      proofChecklist: Array.isArray(proofSummary?.checklist) ? proofSummary.checklist.length : 0,
      draftChecklist: Array.isArray(draftScoreSummary?.checklist) ? draftScoreSummary.checklist.length : 0,
      reviewChecklist: Array.isArray(reviewDecisionSummary?.checklist) ? reviewDecisionSummary.checklist.length : 0,
      historyItems: Array.isArray(reviewHistorySummary?.items) ? reviewHistorySummary.items.length : 0,
      evaluationFields: Array.isArray(evaluation?.fields) ? evaluation.fields.length : 0,
    },
    copilotSignals: [
      { id: 'operationProof', label: 'Servis kanıtı', value: proofStatus, note: 'Kalite değerlendirmesine yardımcı olur.' },
      { id: 'qualitySignal', label: 'Kalite sinyali', value: `${draftBand} • ${draftScore}`, note: nonFinal },
      { id: 'reviewDecision', label: 'İnceleme kararı', value: reviewStatus, note: reviewDecisionSummary?.paymentImpactText || 'Hakediş veya komisyon hesabını etkilemez.' },
      { id: 'reviewHistory', label: 'Denetim izi', value: historyText, note: reviewHistorySummary?.paymentImpactText || 'Bu geçmiş kesin kalite puanı değildir.' },
      { id: 'providerComparison', label: 'Sağlayıcı karşılaştırma', value: providerCompare, note: 'Sağlayıcı sıralaması değildir.' },
    ],
    boundaryNotes: [nonFinal, 'Sağlayıcı sıralaması değildir.', reviewDecisionSummary?.paymentImpactText || 'Bu bilgi hakediş veya komisyon hesabını etkilemez.'],
  });
}

export function buildCommercialCoreCopilotFacts({
  paymentPreviewSummary,
  paymentBackbone,
  settings,
  settlementStatus,
  accountStatus,
  operationProofSummary,
  paymentSourcesMeta,
  lifecycle,
}) {
  const previewTitle = compactText(paymentPreviewSummary?.title || paymentPreviewSummary?.summaryText || 'Hakediş önizlemesi', 'Hakediş önizlemesi');
  const previewStatus = compactText(paymentPreviewSummary?.statusText || paymentPreviewSummary?.status || 'Taslak', 'Taslak');
  const previewReason = compactText(paymentPreviewSummary?.detailReason || paymentPreviewSummary?.summaryText || paymentPreviewSummary?.nextAction || 'Önizleme verisi okunuyor.', 'Önizleme verisi okunuyor.');
  const settlementText = compactText(settlementStatus?.summaryText || settlementStatus?.status || 'Kontrol gerekli', 'Kontrol gerekli');
  const commissionText = compactText(
    paymentBackbone?.activeRule ? `${paymentBackbone.activeRule.paymentMode || 'OFF'} • ${paymentBackbone.activeRule.commissionBps != null ? `${Number(paymentBackbone.activeRule.commissionBps)} bps` : '-'}` : 'Komisyon kuralı tanımlı değil',
    'Komisyon kuralı tanımlı değil',
  );
  const accountText = compactText(
    paymentPreviewSummary?.paymentAccountStatus || accountStatus?.summaryText || accountStatus?.summary || settings?.globalRule?.paymentMode || 'Eksik bilgi',
    'Eksik bilgi',
  );
  const contractShiftText = compactText(
    paymentPreviewSummary?.contractOrShiftSummary || lifecycle?.summary || operationProofSummary?.summaryText || 'Sözleşmeden vardiya üretimi ayrıca kontrol edilmeli.',
    'Sözleşmeden vardiya üretimi ayrıca kontrol edilmeli.',
  );
  const csvBoundary = compactText(paymentPreviewSummary?.nonFinalText || 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.', 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.');
  const auditSummary = compactText(paymentSourcesMeta?.summary || 'Önizleme kaynakları özetleniyor.', 'Önizleme kaynakları özetleniyor.');
  return buildReadonlyCopilotFacts({
    screenType: 'PAYMENT_READINESS',
    stage: previewStatus,
    readiness: /READY|PREVIEW_READY|EVIDENCE_READY/.test(previewStatus.toUpperCase()) ? 'READY' : /NEEDS_REVIEW|PARTIAL|MISSING|EKSIK/.test(previewStatus.toUpperCase()) ? 'REVIEW_NEEDED' : 'REVIEW_NEEDED',
    readinessScore: /READY|PREVIEW_READY|EVIDENCE_READY/.test(previewStatus.toUpperCase()) ? 80 : /NEEDS_REVIEW|PARTIAL/.test(previewStatus.toUpperCase()) ? 56 : 40,
    summary: `${previewTitle} • ${previewStatus}`,
    blockers: [previewReason, csvBoundary],
    evidence: [
      `hakediş önizleme: ${previewStatus}`,
      `komisyon: ${commissionText}`,
      `ödeme hesabı: ${accountText}`,
      `sözleşme / vardiya: ${contractShiftText}`,
      `settlement: ${settlementText}`,
      `kaynak özeti: ${auditSummary}`,
    ],
    nextBestAction: compactText(paymentPreviewSummary?.nextAction || 'Önce hazır görünen kayıtları doğrula, sonra CSV taslağını indir.', 'Önce hazır görünen kayıtları doğrula, sonra CSV taslağını indir.'),
    safestNextStep: 'Önce hakediş önizleme kartındaki neden hazır / neden eksik satırını oku.',
    compareHint: 'Hakediş önizlemesi yalnızca kontrol içindir; ödeme başlatılmaz.',
    counters: {
      previewCount: Number(paymentPreviewSummary?.totalDraftCount || paymentBackbone?.cards?.commercialSources || 0),
      readyCount: Number(paymentPreviewSummary?.readyCount || 0),
      missingCount: Number(paymentPreviewSummary?.missingCount || 0),
      reviewCount: Number(paymentPreviewSummary?.reviewCount || 0),
      sourceCount: Number(paymentSourcesMeta?.summary?.total || paymentSourcesMeta?.total || 0),
    },
    copilotSignals: [
      { id: 'paymentPreviewStatus', label: 'Hakediş önizleme', value: previewStatus, note: previewReason },
      { id: 'paymentPreviewMissingInfo', label: 'Eksik / kontrol gerekli', value: `${Number(paymentPreviewSummary?.missingCount || 0)} / ${Number(paymentPreviewSummary?.reviewCount || 0)}`, note: previewReason },
      { id: 'commissionStatus', label: 'Komisyon durumu', value: commissionText, note: 'Aktif ödeme kapalı; sadece hazırlık görünümü.' },
      { id: 'paymentAccountStatus', label: 'Ödeme hesabı durumu', value: accountText, note: 'Eksik bilgi veya kontrol gerekli olabilir.' },
      { id: 'settlementStatus', label: 'Settlement durumu', value: settlementText, note: 'Aktif ödeme kapalı; settlement execute çalışmaz.' },
      { id: 'contractShiftGeneration', label: 'Sözleşme / vardiya', value: contractShiftText, note: 'Sözleşmeden vardiya üretimi ayrıca kontrol edilir.' },
    ],
    boundaryNotes: [csvBoundary, 'Ödeme başlatılmaz.', 'Sadece önizleme verisi indirilir.', auditSummary],
  });
}

export function buildGeoReviewFacts({ selected, counts, scopeMode = 'ALL', hasPlanningScope = false }) {
  const hasCoordinates = Number.isFinite(Number(selected?.homeLat)) && Number.isFinite(Number(selected?.homeLng));
  const hasAddress = Boolean(String(selected?.homeAddress || '').trim());
  const status = String(selected?.geoStatus || '').toUpperCase();
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasCoordinates, 'Koordinat yok');
  pushIf(missing, !hasAddress, 'Adres yok');
  pushIf(blockers, !hasCoordinates && !hasAddress, 'Adres ve koordinat birlikte boş; bu kayıt üretime hazır değil.');
  pushIf(blockers, status === 'FAILED', 'Konum üretimi başarısız görünüyor; önce neden alanını okuyup yeniden üretmek gerekir.');
  const canSave = hasCoordinates;
  const actions = [
    actionRule({
      key: 'geo_open_big_map',
      label: 'Büyük Haritada İşaretle',
      enabled: true,
      purpose: 'Küçük önizleme yerine rahat seçim yapmak için büyük harita modalını açar.',
      whenToUse: 'Adres güven vermiyorsa veya lat/lon elle düzeltilecekse kullanılır.',
      whatHappens: 'Büyük haritada pin seçilir; OK Yap ile küçük önizlemeye dönülür.',
      riskNote: 'OK Yap tek başına veritabanına yazmaz; dönüşten sonra Kaydet gerekir.',
    }),
    actionRule({
      key: 'geo_save',
      label: 'Kaydet',
      enabled: canSave,
      reason: 'Kaydetmeden önce lat/lon üretmek veya büyük haritada işaretlemek gerekir.',
      purpose: 'Seçili kişideki koordinatı veritabanına sabitler.',
      whenToUse: 'Sağ panelde doğru kişi seçiliyken ve koordinat görünüyorken kullanılır.',
      whatHappens: 'Mevcut kişideki lat/lon kalıcı hale gelir.',
      riskNote: 'Yanlış kişi seçiliyse doğru koordinat yanlış kayda yazılabilir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_save_next',
      label: 'Kaydet + Sonraki',
      enabled: canSave,
      reason: 'Seri ilerlemek için önce mevcut kişi kaydının koordinatı oluşmalı.',
      purpose: 'Koordinatı kaydeder ve listedeki bir sonraki kişiye geçer.',
      whenToUse: 'Seri kontrol yaparken ve mevcut kayıt doğrulanmışken kullanılır.',
      whatHappens: 'Mevcut kayıt kaydedilir; sonra sıradaki satır seçili hale gelir.',
      riskNote: 'Seçim state’i doğru taşınmıyorsa hangi kişinin seçili olduğuna yeniden bakmak gerekir.',
      required: ['Seçili kişi doğru olmalı', 'Koordinat oluşmuş olmalı'],
      blockedBy: canSave ? [] : ['Koordinat yok'],
    }),
    actionRule({
      key: 'geo_clear_addresses',
      label: 'Tüm Adresleri Temizle',
      enabled: true,
      purpose: 'KVKK için geçici adres metnini toplu temizler.',
      whenToUse: 'Lat/lon üretimi bittiğinde ve metin adres artık gerekmiyorsa kullanılır.',
      whatHappens: 'Görünür kapsamdaki adres metinleri temizlenir; lat/lon kalır.',
      riskNote: 'Adres silindikten sonra metin adres üstünden yeniden üretim yapmak zorlaşır.',
    }),
    actionRule({
      key: 'geo_clear_phones',
      label: 'Tüm Telefonları Temizle',
      enabled: true,
      purpose: 'KVKK için gereksiz telefon bilgisini toplu temizler.',
      whenToUse: 'Telefonun operasyon için artık gerekmediği durumda kullanılır.',
      whatHappens: 'Görünür kapsamdaki telefon alanları temizlenir.',
      riskNote: 'Telefon tekrar gerekecekse önce dış kaynaktan doğrulama gerekir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'GEOREVIEW',
    stage: status || '-',
    readinessScore: canSave ? 82 : 38,
    readiness: canSave ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing,
    blockers,
    ...actionMatrix,
    counters: {
      visible: Number(counts?.visible || 0),
      ok: Number(counts?.ok || 0),
      review: Number(counts?.review || 0),
      failed: Number(counts?.failed || 0),
      noCoord: Number(counts?.noCoord || 0),
      planningScope: hasPlanningScope ? (scopeMode === 'SESSION' ? 'SESSION' : 'ALL') : 'ALL',
    },
    evidence: [
      `Durum: ${status || '-'}`,
      `Koordinat: ${hasCoordinates ? `${Number(selected?.homeLat).toFixed(5)}, ${Number(selected?.homeLng).toFixed(5)}` : 'Yok'}`,
      `Adres: ${hasAddress ? 'Var' : 'Yok'}`,
      `Görünür kayıt: ${Number(counts?.visible || 0)}`,
    ],
    reasoningLead: canSave
      ? 'Bu kayıtta ana karar, koordinatın doğru kişide sabitlenip sabitlenmediğidir.'
      : 'Bu kayıtta ana blokaj koordinat eksikliği tarafında görünüyor.',
    nextBestAction: canSave
      ? 'Önce seçili kişi adını doğrula. Sonra Kaydet ile sabitle; seri gidiyorsan Kaydet + Sonraki kullan.'
      : hasAddress
        ? 'Önce büyük haritada pin koy veya adresten bul ile lat/lon üret. Sonra Kaydet de.'
        : 'Önce büyük haritada işaretle. Sonra OK ile dönüp Kaydet de.',
    safestNextStep: 'En risksiz adım, sağ panelde seçili kişi adı ile listede seçili satırın aynı olduğunu doğrulamaktır.',
    compareHint: 'OK Yap yalnız büyük harita seçim modalını onaylar; Kaydet veritabanına yazar.',
  };
}

export function buildShiftFacts({ shift, itemCount = 0 }) {
  const status = String(shift?.status || '-').toUpperCase();
  const hasVehicle = Boolean(shift?.vehicle?.plate || Number(shift?.vehicleId || 0));
  const hasDriver = Boolean(shift?.driver?.fullName || Number(shift?.driverId || 0));
  const stopCount = Array.isArray(shift?.stops) ? shift.stops.length : 0;
  const offerCount = Number(shift?.offers?.length || shift?.openOfferCount || 0);
  const approvedLike = ['APPROVED', 'ACCEPTED', 'ACTIVE'].includes(status);
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasVehicle, 'Araç yok');
  pushIf(missing, !hasDriver, 'Sürücü yok');
  pushIf(missing, stopCount <= 0, 'Durak yok');
  pushIf(blockers, approvedLike && (!hasVehicle || !hasDriver), 'Durum onaylı görünse de araç veya sürücü boş; saha için tam hazır değil.');
  pushIf(blockers, offerCount > 0 && !approvedLike, 'Teklif/karar tarafı açık görünüyor; atama yorumu erken olabilir.');
  const actions = [
    actionRule({
      key: 'shift_open_list',
      label: 'Listeyi aç',
      enabled: Boolean(shift?.id),
      reason: 'Önce seçili bir vardiya gerekir.',
      purpose: 'Seçili vardiyanın detay veya bağlı akış ekranını açar.',
      whenToUse: 'Satır seçiliyse ve detay okumak gerekiyorsa kullanılır.',
      whatHappens: 'İlgili vardiya için daha detaylı görünüm veya bağlı liste açılır.',
      required: ['Seçili vardiya'],
    }),
    actionRule({
      key: 'shift_open_offers',
      label: 'Teklifleri aç',
      enabled: offerCount > 0,
      reason: 'Bu kayıtta görünen açık teklif yok.',
      purpose: 'Bu vardiyaya bağlı teklif veya karar akışını açar.',
      whenToUse: 'Karar kapanmadıysa ve room/company teklifi incelenecekse kullanılır.',
      whatHappens: 'Teklif listesi veya teklif modalı açılır.',
      required: ['Görünen teklif olmalı'],
      blockedBy: offerCount > 0 ? [] : ['Açık teklif yok'],
    }),
    actionRule({
      key: 'shift_assign_vehicle',
      label: 'Araç ata',
      enabled: Boolean(shift?.id) && !hasVehicle,
      reason: 'Araç alanı zaten doluysa yeniden araç ata öncelikli değildir.',
      purpose: 'Vardiyaya araç bağı ekler veya eksik aracı tamamlatır.',
      whenToUse: 'Araç alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya araç seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasVehicle ? [] : ['Araç zaten bağlı'],
    }),
    actionRule({
      key: 'shift_assign_driver',
      label: 'Sürücü ata',
      enabled: Boolean(shift?.id) && !hasDriver,
      reason: 'Sürücü alanı zaten doluysa bu adım zorunlu değildir.',
      purpose: 'Vardiyaya sürücü bağı ekler veya eksik sürücüyü tamamlatır.',
      whenToUse: 'Sürücü alanı boşsa kullanılır.',
      whatHappens: 'Seçili vardiyaya sürücü seçme akışı açılır.',
      required: ['Seçili vardiya'],
      blockedBy: !hasDriver ? [] : ['Sürücü zaten bağlı'],
    }),
    actionRule({
      key: 'shift_operate',
      label: 'Operasyona geç',
      enabled: approvedLike && hasVehicle && hasDriver && stopCount > 0,
      reason: offerCount > 0 && !approvedLike
        ? 'Teklif/karar tarafı kapanmadan operasyon yorumu erken olur.'
        : stopCount <= 0
          ? 'Durak olmadan operasyon güvenilir ilerlemez.'
          : (!hasVehicle || !hasDriver)
            ? 'Araç ve sürücü bağı tamamlanmadan operasyona geçmek risklidir.'
            : 'Bu kayıt henüz operasyon için tam hazır görünmüyor.',
      purpose: 'Vardiyayı saha akışına taşımak için son hazırlık kontrolünü temsil eder.',
      whenToUse: 'Durum onaylı, araç-sürücü dolu ve duraklar hazır olduğunda anlamlıdır.',
      whatHappens: 'Kayıt operasyon veya canlı takip tarafında okunabilir hale gelir.',
      riskNote: 'Durum onaylı olsa bile araç veya sürücü boşsa sahada zincir kırılır.',
      required: ['Durum onaylı olmalı', 'Araç bağlı olmalı', 'Sürücü bağlı olmalı', 'Durak olmalı'],
      blockedBy: [
        ...(!approvedLike ? ['Durum henüz onaylı değil'] : []),
        ...(!hasVehicle ? ['Araç yok'] : []),
        ...(!hasDriver ? ['Sürücü yok'] : []),
        ...(stopCount <= 0 ? ['Durak yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'SHIFTS',
    stage: status,
    readinessScore: approvedLike && hasVehicle && hasDriver ? (stopCount > 0 ? 88 : 74) : 42,
    readiness: approvedLike && hasVehicle && hasDriver && stopCount > 0 ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    missing,
    blockers,
    ...actionMatrix,
    counters: { visible: Number(itemCount || 0), offers: offerCount, stops: stopCount },
    evidence: [
      `Durum: ${status}`,
      `Araç: ${hasVehicle ? (shift?.vehicle?.plate || `#${shift?.vehicleId}`) : 'Yok'}`,
      `Sürücü: ${hasDriver ? (shift?.driver?.fullName || `#${shift?.driverId}`) : 'Yok'}`,
      `Durak: ${stopCount}`,
      `Teklif: ${offerCount}`,
    ],
    reasoningLead: blockers.length
      ? 'Bu vardiyada ana blokaj atama veya teklif tarafında görünüyor.'
      : 'Bu vardiyada önce durum, sonra araç-sürücü bağı ve durak hazır mı ona bakılır.',
    nextBestAction: blockers.length
      ? (offerCount > 0 && !approvedLike ? 'Önce teklif kararını kapat. Sonra araç ve sürücü alanlarını tekrar kontrol et.' : 'Önce araç ve sürücü bağını tamamla. Sonra durak ve sonraki adım alanlarını yeniden oku.')
      : 'Önce seçili vardiyanın araç, sürücü ve durak alanlarını birlikte kontrol et.',
    safestNextStep: 'En risksiz adım, seçili satırda araç ve sürücü gerçekten dolu mu onu doğrulamaktır.',
    compareHint: 'APPROVED ile tam atama aynı şey değildir; araç veya sürücü boşsa iş saha için eksiktir.',
  };
}

export function buildMapFacts({ selected, selectedShift, selectedNext, selectedEta, selectedStats, gpsStatus, gpsAge, vehicleCount = 0 }) {
  const status = String(selectedShift?.status || '-').toUpperCase();
  const etaReady = Number.isFinite(Number(selectedEta));
  const nextReady = Boolean(selectedNext?.name);
  const gpsFresh = !/eski|stale|unknown|bilinmiyor|offline/i.test(String(gpsAge || '') + ' ' + String(gpsStatus || ''));
  const hasShift = Boolean(selectedShift?.id);
  const hasSelectedVehicle = Boolean(selected?.id || selected?.plate);
  const totalStops = Number(selectedStats?.total || 0);
  const missing = [];
  const blockers = [];
  pushIf(missing, !hasSelectedVehicle, 'Seçili araç yok');
  pushIf(missing, !nextReady, 'Sıradaki durak yok');
  pushIf(missing, !etaReady, 'ETA yok');
  pushIf(blockers, !hasSelectedVehicle, "Önce marker'dan araç seçilmeden bu kaydı başka ekranla karşılaştırmak erken olur.");
  pushIf(blockers, !gpsFresh, 'Son GPS eski görünüyor; canlı karar vermeden önce veri akışı doğrulanmalı.');
  pushIf(blockers, hasSelectedVehicle && !hasShift, 'Araç seçili olsa bile bağlı aktif vardiya görünmüyor.');
  const actions = [
    actionRule({
      key: 'map_show_all',
      label: 'Tümünü Göster',
      enabled: true,
      purpose: 'Haritayı tüm rota ve araç görünümüyle yeniden çerçeveler.',
      whenToUse: 'Manuel sürükleme sonrası harita dağınık kaldıysa kullanılır.',
      whatHappens: 'Harita görünümü tekrar genel kapsama alınır.',
    }),
    actionRule({
      key: 'map_next_navigation',
      label: 'Sonraki durağa navigasyon',
      enabled: nextReady,
      reason: 'Önce sıradaki durak oluşmalı.',
      purpose: 'Sıradaki durak için dış navigasyonu başlatır.',
      whenToUse: 'Sıradaki durak net ve GPS canlı ise kullanılır.',
      whatHappens: 'Haritadan dış navigasyon uygulamasına geçilir.',
      required: ['Sıradaki durak olmalı'],
      blockedBy: nextReady ? [] : ['Sıradaki durak yok'],
    }),
    actionRule({
      key: 'map_open_full_route',
      label: 'Tam rotayı dış navigasyonda aç',
      enabled: hasShift,
      reason: 'Önce vardiya ve rota görünmeli.',
      purpose: 'Bağlı vardiyanın tam rota çizgisini dış navigasyona verir.',
      whenToUse: 'Aktif vardiya ve rota bağının doğrulandığı durumda kullanılır.',
      whatHappens: 'Tam rota dış navigasyon uygulamasında açılır.',
      required: ['Bağlı vardiya'],
      blockedBy: hasShift ? [] : ['Bağlı vardiya yok'],
    }),
    actionRule({
      key: 'map_eta_follow',
      label: 'ETA takibi',
      enabled: etaReady && gpsFresh,
      reason: !gpsFresh ? 'GPS eskiyse ETA güven vermeyebilir.' : 'ETA bilgisi güncel değil.',
      purpose: 'ETA zincirinin güvenilir okunup okunmadığını temsil eder.',
      whenToUse: 'Canlı konum akışı sürüyor ve sonraki durak doluysa anlamlıdır.',
      whatHappens: 'Kullanıcı ETA ve kalan durak bilgisini karar için baz alır.',
      required: ['GPS güncel olmalı', 'ETA görünmeli'],
      blockedBy: [
        ...(!gpsFresh ? ['Son GPS eski'] : []),
        ...(!etaReady ? ['ETA yok'] : []),
      ],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'MAP',
    stage: status,
    hasSelectedVehicle,
    hasShift,
    gpsFresh,
    etaReady,
    nextReady,
    totalStops,
    emptyState: !hasSelectedVehicle || (!hasShift && totalStops <= 0 && !nextReady),
    readinessScore: hasSelectedVehicle && gpsFresh && nextReady ? 84 : 46,
    readiness: hasSelectedVehicle && gpsFresh && nextReady ? 'READY' : blockers.length ? 'NOT_READY' : 'REVIEW_NEEDED',
    missing,
    blockers,
    ...actionMatrix,
    counters: {
      vehicles: Number(vehicleCount || 0),
      totalStops: Number(selectedStats?.total || 0),
      remainingStops: Number(selectedStats?.remaining || 0),
      completedStops: Number(selectedStats?.completed || 0),
    },
    evidence: [
      `Araç: ${selected?.plate || `#${selected?.id || '-'}`}`,
      `Son GPS: ${gpsAge || gpsStatus || '-'}`,
      `Sıradaki durak: ${selectedNext?.name || 'Yok'}`,
      `ETA: ${etaReady ? `${Number(selectedEta)} dk` : 'Yok'}`,
      `Kalan durak: ${Number(selectedStats?.remaining || 0)}`,
    ],
    reasoningLead: !hasSelectedVehicle
      ? 'Bu haritada önce seçili araç oluşmadan sonraki ekran kararı vermek erken olur.'
      : blockers.length
        ? 'Bu haritadaki ana sorun canlılık veya rota bağının eksik görünmesi.'
        : 'Bu haritada önce canlılık, sonra sıradaki durak ve ETA birlikte okunmalı.',
    nextBestAction: !hasSelectedVehicle
      ? "Önce marker'a tıklayıp aracı seç. Sonra üst kartta Shift, Son GPS ve Sıradaki durak dolu mu bak."
      : blockers.length
        ? (!gpsFresh ? 'Önce Son GPS zamanını kontrol et. Sonra aynı kaydı Vardiyalar ekranında açıp atama/rota bağını doğrula.' : 'Önce bağlı vardiyayı açıp rota ve durak bilgisini kontrol et.')
        : 'Önce seçili araç için Son GPS, ETA ve kalan durak sayısını birlikte kontrol et.',
    safestNextStep: !hasSelectedVehicle
      ? "En risksiz adım, önce marker'dan doğru aracı seçmektir."
      : 'En risksiz adım, doğru aracı seçip Son GPS eski mi değil mi onu doğrulamaktır.',
    compareHint: 'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; görsel yorumla canlı karar yorumunu karıştırmamak gerekir.',
  };
}

export function buildCommercialFlowFacts({ selectedItem, marketCount = 0, acceptedCount = 0, listCount = 0 }) {
  const status = String(selectedItem?.statusLabel || '-').toUpperCase();
  const section = String(selectedItem?.section || 'market');
  const isMarket = section === 'market';
  const isPending = section === 'pending';
  const isList = section === 'list';
  const blockers = [];
  pushIf(blockers, isMarket, 'Ticari karar henüz market/pazarlık tarafında; operasyon yorumu erken olabilir.');
  pushIf(blockers, isPending, 'Pazarlık bitmiş olsa bile operasyon bağlantısı ayrıca doğrulanmalıdır.');
  const actions = [
    actionRule({
      key: 'commercial_open_market',
      label: 'Marketi aç',
      enabled: isMarket,
      reason: 'Kayıt market aşamasında değil.',
      purpose: 'Pazarlık ve teklif karşılaştırma tarafını açar.',
      whenToUse: 'Kayıt hâlâ market bölümündeyse kullanılır.',
      whatHappens: 'Market satırları veya ilgili teklif görünümü açılır.',
      blockedBy: isMarket ? [] : ['Kayıt market aşamasında değil'],
    }),
    actionRule({
      key: 'commercial_open_pending',
      label: 'Bekleyeni aç',
      enabled: isPending,
      reason: 'Kayıt kabul edilmiş bekleyen aşamada değil.',
      purpose: 'Kabul edilmiş ama operasyona tam bağlanmamış kayıtları açar.',
      whenToUse: 'Kayıt pending/bekleyen bölümündeyse kullanılır.',
      whatHappens: 'Bekleyenler görünümü açılır.',
      blockedBy: isPending ? [] : ['Kayıt bekleyen aşamada değil'],
    }),
    actionRule({
      key: 'commercial_open_list',
      label: 'Listeyi aç',
      enabled: isList || Boolean(selectedItem?.shiftId),
      reason: 'Bağlı vardiya görünmüyor.',
      purpose: 'Bağlı operasyon veya vardiya listesini açar.',
      whenToUse: 'Kayıt operasyon/liste tarafına geçtiyse kullanılır.',
      whatHappens: 'Bağlı vardiya veya operasyon kaydı açılır.',
      blockedBy: isList || selectedItem?.shiftId ? [] : ['Bağlı vardiya yok'],
    }),
  ];
  const actionMatrix = splitActions(actions);
  return {
    screenType: 'COMMERCIAL_FLOW',
    stage: `${section}:${status}`,
    readinessScore: isList ? 82 : isPending ? 61 : 39,
    readiness: isList ? 'READY' : isPending ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing: [],
    blockers,
    ...actionMatrix,
    counters: { market: Number(marketCount || 0), accepted: Number(acceptedCount || 0), list: Number(listCount || 0) },
    evidence: [
      `Karşı taraf: ${selectedItem?.counterparty || '-'}`,
      `Akış: ${selectedItem?.flowLabel || '-'}`,
      `Durum: ${status}`,
      `Sonraki adım: ${selectedItem?.nextStep || '-'}`,
    ],
    reasoningLead: isMarket
      ? 'Bu kayıt hâlâ ticari pazarlık tarafında görünüyor.'
      : isPending
        ? 'Bu kayıt kabul edilmiş ama operasyon hazırlığı ayrıca kontrol edilmelidir.'
        : 'Bu kayıt operasyon tarafına geçmiş görünüyor.',
    nextBestAction: isMarket
      ? 'Önce Marketi aç veya teklif tarafını tamamla. Sonra operasyon hazırlığına bak.'
      : isPending
        ? 'Önce Bekleyeni aç ve bağlı vardiyayı kontrol et. Araç-sürücü ataması tamam mı bak.'
        : 'Önce Listeyi aç ve bağlı vardiyanın hazır olup olmadığını kontrol et.',
    safestNextStep: 'En risksiz adım, önce bu kaydın market mi kabul mü liste mi olduğuna bakmaktır.',
    compareHint: 'Marketi aç pazarlık tarafını gösterir; Listeyi aç operasyon tarafına götürür.',
  };
}

export function buildServiceEvaluationFacts({ item, summary }) {
  const status = String(item?.statusLabel || '-').toUpperCase();
  const evalStatus = String(item?.evaluationStatus || '-').toUpperCase();
  const hasProviderScore = Number(item?.providerScore?.evaluationCount || 0) > 0;
  const canEvaluate = /BEK|PENDING|DEĞERLENDIR|DEGERLENDIR/.test(evalStatus) || /DONE|COMPLETED/.test(status);
  const blockers = [];
  pushIf(blockers, !/DONE|COMPLETED|ACTIVE|APPROVED/.test(status), 'Hizmet operasyon durumu değerlendirme için net görünmüyor.');
  pushIf(blockers, !canEvaluate, 'Değerlendirme durumu henüz puan vermeye açık görünmüyor.');
  const actions = [
    actionRule({
      key: 'service_evaluate',
      label: 'Değerlendir',
      enabled: canEvaluate,
      reason: 'Bu kayıt için değerlendirme akışı açık görünmüyor.',
      purpose: 'Seçili hizmet için puan ve kısa değerlendirme kaydı açar.',
      whenToUse: 'Hizmet tamamlandıysa ve değerlendirme rozeti uygunsa kullanılır.',
      whatHappens: 'Puan ve not kaydı alınır.',
      blockedBy: canEvaluate ? [] : ['Değerlendirme durumu açık değil'],
    }),
    actionRule({
      key: 'service_open_services',
      label: 'Hizmetleri aç',
      enabled: true,
      purpose: 'Bağlı hizmet veya operasyon kayıtlarını açar.',
      whenToUse: 'Sonucun kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'İlgili hizmet listesi açılır.',
    }),
    actionRule({
      key: 'service_open_agreements',
      label: 'Sözleşmeleri aç',
      enabled: true,
      purpose: 'Bağlı sözleşme veya ilişkiyi doğrulamak için ilgili görünümü açar.',
      whenToUse: 'Hizmetin ticari kaynağını görmek gerektiğinde kullanılır.',
      whatHappens: 'Sözleşme tarafına geçilir.',
    }),
  ];
  const actionMatrix = splitActions(actions);
  const providerScoreText = hasProviderScore ? `${Number(item?.providerScore?.averageScore || 0).toFixed(1)} ★ (${item?.providerScore?.evaluationCount || 0})` : 'Henüz puan yok';
  const copilotSignals = [
    { id: 'qualitySignal', label: 'Kalite sinyali', value: `${status} • ${evalStatus}`, note: 'Bu kayıt kalite değerlendirmesine yardımcı olur.' },
    { id: 'providerComparison', label: 'Sağlayıcı karşılaştırma', value: providerScoreText, note: 'Sağlayıcı sıralaması değildir.' },
    { id: 'contractShiftGeneration', label: 'Sözleşme / vardiya', value: item?.contractShiftStatus || item?.shiftStatus || 'Kontrol gerekli', note: 'Sözleşmeden vardiya üretimi ayrıca okunur.' },
  ];
  const copilotSummary = [
    item?.providerName || null,
    item?.serviceLabel || null,
    item?.statusLabel || null,
    item?.evaluationStatus || null,
    providerScoreText,
  ].filter(Boolean).join(' • ');
  return {
    screenType: 'SERVICE_EVALUATION',
    stage: `${status}:${evalStatus}`,
    readinessScore: canEvaluate ? 79 : 44,
    readiness: canEvaluate ? 'REVIEW_NEEDED' : 'NOT_READY',
    missing: [],
    blockers,
    ...actionMatrix,
    counters: {
      completedServices: Number(summary?.cards?.completedServices || 0),
      pendingEvaluation: Number(summary?.cards?.pendingEvaluation || 0),
      activeServices: Number(summary?.cards?.activeServices || 0),
    },
    evidence: [
      `Sağlayıcı: ${item?.providerName || '-'}`,
      `Hizmet: ${item?.serviceLabel || '-'}`,
      `Durum: ${status}`,
      `Değerlendirme: ${evalStatus}`,
      `Sağlayıcı puanı: ${hasProviderScore ? `${Number(item?.providerScore?.averageScore || 0).toFixed(1)} ★` : 'Henüz puan yok'}`,
    ],
    reasoningLead: canEvaluate
      ? 'Bu kayıtta ana karar, değerlendirmenin gerçekten açılıp açılmayacağı tarafında.'
      : 'Bu kayıtta değerlendirme akışı henüz net hazır görünmüyor.',
    nextBestAction: canEvaluate
      ? 'Önce hizmet satırını aç. Sonra Değerlendir ile kısa puan ve notu kaydet.'
      : 'Önce hizmetin operasyon durumu ve değerlendirme rozetini kontrol et. Gerekirse Hizmetleri aç ile bağlı kayda git.',
    safestNextStep: 'En risksiz adım, seçili hizmet satırında değerlendirme rozetini ve tarih bilgisini birlikte doğrulamaktır.',
    compareHint: 'Durum rozeti hizmetin operasyon halini, Değerlendirme rozeti puan verilebilir mi bilgisini gösterir.',
    copilotSignals,
    copilotSummary,
    boundaryNotes: [
      'Bu bilgi kesin kalite puanı değildir.',
      'Sağlayıcı sıralaması değildir.',
    ],
  };
}
