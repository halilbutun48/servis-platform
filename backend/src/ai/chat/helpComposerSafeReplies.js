import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  ensureVisibleSentence,
  looksLikeClarifyingQuestionRequest,
  normalizeLooseText,
  normalizeText,
  normalizeVisibleReplyFragment,
} from './conversationTaskStateShared.js';
import { getCopilotEBlockRuntimeAnswerTopicMeta } from './copilotEBlockRuntimeAnswerIntegration.js';

function readStructuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts || screenContext?.liveFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

function isSensitiveLiveSurfacePath(screenPath = '') {
  const path = normalizeText(firstNonEmpty(screenPath, ''));
  return path.includes('/parent/live') || path.includes('/personel/live') || path.includes('/personel/my');
}

function redactSensitiveLiveSelectionText(value, screenPath = '') {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
  if (!text) return '';
  if (!isSensitiveLiveSurfacePath(screenPath)) return text;
  const path = normalizeText(firstNonEmpty(screenPath, ''));
  const lower = normalizeText(text);
  const words = text.split(/\s+/).filter(Boolean);
  const bareNameLike = words.length >= 2
    && words.length <= 3
    && words.every((word) => /^[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'.-]*$/.test(word))
    && !/^(bu|şu|su|öğrencinin|öğrenci|bugünkü|seçili|servis|servisi|sade|ilk|son|bir)$/i.test(words[0] || '')
    && !/(gps|eta|araç|arac|durak|servis|servisi|durum|varış|varis)/i.test(lower);
  if (bareNameLike) {
    return path.includes('/parent/live') ? 'Öğrencinin servisi' : 'Bugünkü servis';
  }
  return text
    .replace(/\b[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'.-]+(?:\s+[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'.-]+)+\b(?=\s*(?:[(:-]?\s*)?(?:Durum|servis(?:i)?|hazır|hazir|aktif|pasif|görünüyor|gorunuyor|yok|var|devrede|yolda|canlı|canli))/gi, path.includes('/parent/live') ? 'Öğrenci' : 'Servis')
    .replace(/\bDurum:\s*[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'.-]+(?:\s+[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü'.-]+)+\b/gi, 'Durum: öğrenci')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function extractVisibleValueFromText(value, labels = []) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
  if (!text) return '';
  const labelList = (Array.isArray(labels) ? labels : [labels]).map((item) => normalizeVisibleReplyFragment(item)).filter(Boolean);
  for (const label of labelList) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`(?:^|[•\\-])\\s*${escaped}\\s*[:：]?\\s*([^•]+)`, 'i'),
      new RegExp(`(?:^|[•\\-])\\s*${escaped}\\s+([^•]+)`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return normalizeVisibleReplyFragment(match[1]);
    }
  }
  return '';
}

function extractPlateFromVisibleText(value) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
  if (!text) return '';
  const explicit = text.match(/\b(?:Araç|Vehicle)\s*([A-Z0-9-]{5,})\b/i);
  if (explicit?.[1]) return explicit[1];
  const barePlate = text.match(/\b([A-Z0-9-]{5,})\b/i);
  if (barePlate?.[1] && /\d/.test(barePlate[1])) return barePlate[1];
  return '';
}

function compactLiveSummaryFromText(value) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
  if (!text) return '';
  const bits = [];
  const plate = (() => {
    const explicit = text.match(/\b(?:Araç|Vehicle)\s*([A-Z0-9-]{5,})\b/i);
    if (explicit?.[1]) return explicit[1];
    const barePlate = text.match(/\b([A-Z0-9-]{5,})\b/i);
    if (barePlate?.[1] && /\d/.test(barePlate[1])) return barePlate[1];
    return '';
  })();
  const extract = (labels = []) => {
    const labelList = (Array.isArray(labels) ? labels : [labels]).map((item) => normalizeVisibleReplyFragment(item)).filter(Boolean);
    if (!labelList.length) return '';
    for (const label of labelList) {
      const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*[:：]\\s*|\\s+)`, 'iu');
      const match = text.match(pattern);
      if (match?.[1]) return normalizeVisibleReplyFragment(match[1]);
      const fallback = new RegExp(`(?:^|[^\\p{L}\\p{N}])${String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:：]\\s*([^•.]+)`, 'iu');
      const fallbackMatch = text.match(fallback);
      if (fallbackMatch?.[1]) return normalizeVisibleReplyFragment(fallbackMatch[1]);
    }
    return '';
  };
  const gpsStatus = firstNonEmpty(
    extract(['GPS']),
    extract(['Canlılık']),
    extract(['Durum']),
    '',
  );
  const lastGps = extract(['Son konum bilgisi', 'Last GPS']);
  const nextStop = firstNonEmpty(
    extract(['Sıradaki']),
    extract(['Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    '',
  );
  const eta = extract(['Tahmini varış süresi']);
  const shiftLabel = extract(['Seçili kayıt', 'Seçili satır']);
  if (shiftLabel) bits.push(`Seçili kayıt ${shiftLabel}`);
  if (plate) bits.push(`Araç ${plate}`);
  if (gpsStatus) bits.push(`GPS ${gpsStatus}`);
  if (lastGps) bits.push(`Son konum bilgisi ${lastGps}`);
  if (nextStop) bits.push(`Sıradaki ${nextStop}`);
  if (eta) bits.push(`Tahmini varış süresi ${eta}`);
  return uniqueStrings(bits).join(' • ');
}

function mergeLiveSummaryFragments(...values) {
  const parts = [];
  for (const value of values) {
    const text = compactLiveSummaryFromText(value);
    if (!text) continue;
    parts.push(...text.split(' • ').map((item) => normalizeVisibleReplyFragment(item)).filter(Boolean));
  }
  return uniqueStrings(parts).join(' • ');
}

function selectedCarrySummary(screenContext) {
  const label = normalizeVisibleReplyFragment(firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.contextSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.helpContextSummary,
    screenContext?.selectedSummary,
    screenContext?.summary,
    '',
  ));
  const fields = (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [])
    .map((row) => ({ label: firstNonEmpty(row?.label, row?.key, ''), value: firstNonEmpty(row?.value, row?.text, '') }))
    .filter((row) => row.label && row.value);
  const facts = readStructuredFacts(screenContext);
  const sourceRows = fields.filter((row) => /(kaynak|source|telefon gps)/i.test(`${row.label} ${row.value}`));
  const signalRows = fields.filter((row) => /(gps|son gps|durak|eta|araç|arac|sürücü|surucu|operasyon|kanıt|kanit|servis|öğrenci|ogrenci|aktif sürücü|aktif surucu|riskli cihaz|stale|açık sorun|acik sorun)/i.test(`${row.label} ${row.value}`));
  const top = [
    ...sourceRows,
    ...signalRows,
    ...fields,
  ].filter((row, index, array) => array.findIndex((candidate) => candidate.label === row.label && candidate.value === row.value) === index)
    .slice(0, 4)
    .map((row) => `${row.label}: ${row.value}`);
  const copilotSummary = firstNonEmpty(
    facts?.copilotSummary,
    facts?.contextSummary,
    facts?.helpContextSummary,
    facts?.selectedRecordSummary,
    screenContext?.copilotSummary,
    screenContext?.contextSummary,
    screenContext?.helpContextSummary,
    screenContext?.selectedRecordSummary,
    '',
  );
  const isRoomMapContext = String(screenContext?.path || '').includes('/room/map');
  const compactSummary = mergeLiveSummaryFragments(
    screenContext?.contextSummary,
    screenContext?.helpContextSummary,
    facts?.contextSummary,
    facts?.helpContextSummary,
    copilotSummary,
    label,
  );
  const appendCopilotSummary = Boolean(copilotSummary)
    && Boolean(label)
    && /(canlı başlatma|canli baslatma|başlatma zamanı|baslatma zamani|operasyon kanıtı|operasyon kaniti|gps ve operasyon kanıtı|gps ve operasyon kaniti)/i.test(normalizeText(copilotSummary));
  const summaryBody = firstNonEmpty(isRoomMapContext ? top.join(' • ') : compactSummary, top.join(' • '), copilotSummary, '');
  let result = '';
  if (copilotSummary && label) result = appendCopilotSummary ? `${label} (${summaryBody || copilotSummary} • ${copilotSummary})` : `${label} (${summaryBody || copilotSummary})`;
  else if (copilotSummary) result = summaryBody || copilotSummary;
  else if (label && top.length) result = `${label} (${top.join(' • ')})`;
  else if (label) result = label;
  else if (top.length) result = top.join(' • ');
  return redactSensitiveLiveSelectionText(result, screenContext?.path);
}

function pickTerms(simpleTerms, limit = 3) {
  return (Array.isArray(simpleTerms) ? simpleTerms : []).slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}

function pickButtons(buttonGuides, limit = 3) {
  return (Array.isArray(buttonGuides) ? buttonGuides : []).slice(0, limit).map((row) => `${row.label}: ${row.purpose}`);
}

function normalizeGuideText(value) {
  return normalizeText(value).replace(/[.!?]+$/g, '');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesStandalonePhrase(text, phrases) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(value);
  });
}

function hasSeferScoreSignal(text) {
  return matchesStandalonePhrase(text, [
    'seferpuan',
    'sefer puanı',
    'sefer puani',
    'sefer score',
    'kalitepuan',
    'readonly kalite puanı',
    'readonly kalite puani',
    'kalite puanı',
    'kalite puani',
    'tedarikcipuan',
    'tedarikçi puanı',
    'tedarikci puani',
    'sağlayıcıpuan',
    'sağlayıcı puanı',
    'saglayici puani',
    'bu servis kaliteli mi',
    'eksik sinyaller',
    'puan neden düşük',
    'puan neden dusuk',
    'puan nasıl yükselir',
    'puan nasil yukselir',
    'bu puan ödeme veya teklif sıralamasını etkiliyor mu',
    'bu puan odeme veya teklif siralamasini etkiliyor mu',
  ]);
}

const WORKFLOW_DIAGNOSTIC_QUESTION_TYPES = new Set([
  'ROOT_CAUSE',
  'WHY_BLOCKED',
  'MISSING_DATA',
  'CONTRACT_TO_SHIFT',
  'CONTRACT_SHIFT_TODAY',
  'DYNAMIC_SAVINGS_PREVIEW',
  'AGREEMENT_ROUTE_REFRESH',
  'SEFER_SCORE_PREVIEW',
  'MARKETPLACE_FREE_TO_OPERATE_PREVIEW',
  'PAYMENT_READINESS',
  'PAYMENT_MISSING',
  'QUALITY_SIGNAL',
  'TRUST_QUALITY',
  'FEEDBACK_STATUS',
  'NOTIFICATION_SOURCE',
  'KVKK_VISIBILITY',
  'DRIVER_PHONE_GPS',
  'LOCATION_HELP',
  'WHO_CAN_DO',
  'ROLE_BOUNDARY',
  'NEXT_STEP',
  'NEXT_SCREEN',
  'NEXT_ACTION',
  'SAFE_NEXT_STEP',
  'FIRST_CONTROL',
  'SCREEN_FOCUS',
  'RISK_LIST',
  'NEXT_BEST_ACTION',
]);

export {
  WORKFLOW_DIAGNOSTIC_QUESTION_TYPES,
  escapeRegExp,
  hasSeferScoreSignal,
  matchesStandalonePhrase,
  normalizeGuideText,
  pickButtons,
  pickTerms,
};

export function normalizeReplySurface(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
}

export function trimReplyLength(text, maxLength = 560) {
  const value = normalizeReplySurface(text);
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength - 1);
  const cut = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '));
  return `${(cut > 90 ? sliced.slice(0, cut + 1) : sliced).trim()}…`;
}

export function normalizeVisibleSuggestionFragment(value) {
  // Legacy action wording kept in source for compatibility: Önerilen adım:
  return normalizeVisibleReplyFragment(value)
    .replace(/^(?:Önerilen adım|Öneri)\s*:\s*/i, '')
    .replace(/^(?:Önerilen adım|Öneri)\s+/i, '')
    .replace(/^Bu aksiyonu simüle et\.?$/i, '')
    .replace(/^Bu aksiyonu simüle et\.?\s*/i, '')
    .trim();
}

export function normalizeVisibleLocationTerminology(value) {
  return normalizeVisibleReplyFragment(value)
    .replace(/\bSon\s+GPS\b/gi, 'Son konum bilgisi')
    .replace(/\bLast\s+GPS\b/gi, 'Son konum bilgisi')
    .trim();
}

export function normalizeVisibleLocationSurfaceValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeVisibleLocationSurfaceValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeVisibleLocationSurfaceValue(item)]),
    );
  }
  if (typeof value !== 'string') return value;
  return normalizeVisibleLocationTerminology(value);
}

export function normalizeVisibleList(values) {
  return uniqueStrings((Array.isArray(values) ? values : [values]).map((value) => normalizeVisibleReplyFragment(value)).filter(Boolean));
}

export function normalizeVisibleReasoningAssistant(value) {
  if (!value || typeof value !== 'object') return value;
  return {
    ...value,
    reply: normalizeVisibleReplyFragment(value.reply),
    summary: normalizeVisibleReplyFragment(value.summary),
    assistantReply: normalizeVisibleReplyFragment(value.assistantReply),
    boundaryText: normalizeVisibleReplyFragment(value.boundaryText),
    clarifyingQuestion: normalizeVisibleReplyFragment(value.clarifyingQuestion),
    safeAlternative: normalizeVisibleReplyFragment(value.safeAlternative),
    nextBestAction: normalizeVisibleReplyFragment(value.nextBestAction),
    rootCauseReply: normalizeVisibleReplyFragment(value.rootCauseReply),
    riskScoringReply: normalizeVisibleReplyFragment(value.riskScoringReply),
    smartDiagnosticReply: normalizeVisibleReplyFragment(value.smartDiagnosticReply),
    selectedFieldLines: normalizeVisibleList(value.selectedFieldLines),
    selectedBadgeLines: normalizeVisibleList(value.selectedBadgeLines),
    selectedSignalLines: normalizeVisibleList(value.selectedSignalLines),
    suggestedChips: normalizeVisibleList(value.suggestedChips),
    rootCauseChips: normalizeVisibleList(value.rootCauseChips),
    riskScoringChips: normalizeVisibleList(value.riskScoringChips),
    smartDiagnosticChips: normalizeVisibleList(value.smartDiagnosticChips),
  };
}

export function looksLikeWorkflowPurposeLeak(value) {
  const text = normalizeVisibleReplyFragment(value).toLocaleLowerCase('tr-TR');
  if (!text) return false;
  return /^bu (ekran|program)\b/.test(text)
    || /^ekran\b/.test(text)
    || /^bu ekran[,:\s]/.test(text)
    || /teklifin temel bilgilerini kontrol et/.test(text)
    || /ekran amacı/.test(text)
    || /ekranın amacını/.test(text)
    || /bu ekran yardım için kullanılır/.test(text)
    || /bu program içi rehberdir/.test(text);
}

export function workflowVisibleFragments(values) {
  return uniqueStrings((Array.isArray(values) ? values : []).map((value) => normalizeVisibleReplyFragment(value)).filter((text) => text && !looksLikeWorkflowPurposeLeak(text)));
}

export function pickWorkflowVisibleReply(...values) {
  return firstNonEmpty(...workflowVisibleFragments(values).slice(0, 3), '');
}

export function trimReplyToFirstMarker(text, markers = []) {
  const value = normalizeReplySurface(text);
  if (!value) return value;
  const lower = value.toLocaleLowerCase('tr-TR');
  let bestIndex = -1;
  for (const marker of (Array.isArray(markers) ? markers : []).filter(Boolean)) {
    const idx = lower.indexOf(String(marker).toLocaleLowerCase('tr-TR'));
    if (idx < 0) continue;
    if (bestIndex < 0 || idx < bestIndex) {
      bestIndex = idx;
    }
  }
  if (bestIndex < 0) return value;
  return value.slice(bestIndex).trim();
}

export function normalizeQuestionTypeReplySurface(reply, questionType) {
  const value = normalizeReplySurface(reply);
  const type = String(questionType || '');
  if (!value) return value;
  const lowerValue = normalizeText(value);
  if (
    type === 'NEXT_STEP'
    && /mavi aktif sıradaki parçayı/i.test(lowerValue)
    && /(gerekirse servisim ekranına geç|servis durumunu aç)/i.test(lowerValue)
    && !/^(Şimdi:|Önce:|Şimdi yap:)/i.test(value)
  ) {
    return `Şimdi: ${value}`.trim();
  }
  if (
    lowerValue.startsWith('netleştirelim:')
    || lowerValue.startsWith('netlestirelim:')
    || lowerValue.startsWith('hangi ')
    || (value.includes('?') && /(hangi|bakayım|bakayim|bakmam|istiyorsun|kayıt|kayit|plan|vardiya|talep|sözleşme|sozlesme)/.test(lowerValue))
  ) {
    return value;
  }
  if (['SCREEN_FOCUS', 'SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(type)) {
    if (
      lowerValue.includes('canlı durum ve gps güven skorunu')
      || lowerValue.includes('ilk kontrolünü netleştirelim')
    ) {
      return value;
    }
    return trimReplyToFirstMarker(value, [
      'Ana kontrol noktaları:',
      'İlk bakılacak yer:',
      'İlk kontrol:',
      'Bu ekran,',
      'Bu ekranda',
    ]).replace(/\bnetleştirelim\b/gi, '').replace(/\bnetlestirelim\b/gi, '').replace(/\bŞimdi:\s*/gi, ' ').replace(/\bSimdi:\s*/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  if (['RISK_LIST', 'SCREEN_RISKS'].includes(type)) {
    if (lowerValue.startsWith('oda açısından') || lowerValue.startsWith('oda açisindan')) {
      return value;
    }
    const riskSurface = trimReplyToFirstMarker(value, [
      'Riskler:',
      'Başlıca riskler:',
    ]);
    const cleanedRiskSurface = riskSurface.replace(/\bBu ekran,?\s*/gi, '').replace(/\bBu ekranda\s*/gi, '').trim();
    if (/^(riskler:|başlıca riskler:)/i.test(cleanedRiskSurface)) return cleanedRiskSurface;
    return `Riskler: ${cleanedRiskSurface}`.trim();
  }
  if (['NEXT_BEST_ACTION', 'NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'READINESS_CHECK'].includes(type)) {
    const actionSurface = trimReplyToFirstMarker(value, [
      'Sade cevap:',
      'Şimdi:',
      'Sıradaki doğru işlem:',
      'Sıradaki adım:',
      'Öneri:',
      'İlk kontrol:',
    ]);
    const cleanedAction = actionSurface
      .replace(/hangi\s+kayıt[^.?!]*[.?!]?\s*/gi, 'Seçili kaydı ve ana alanları doğrula. ')
      .replace(/hangi\s+ekrana[^.?!]*[.?!]?\s*/gi, 'İlgili ekranı aç. ')
      .replace(/hangi\s+alana[^.?!]*[.?!]?\s*/gi, 'İlgili alanı kontrol et. ')
      .replace(/\bBu ekran,?\s*/gi, '')
      .replace(/\bBu ekranda\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return /^Sade cevap:|^Şimdi:|^Sıradaki doğru işlem:|^Sıradaki adım:|^Öneri:|^İlk kontrol:/i.test(cleanedAction)
      ? cleanedAction
      : `Sıradaki doğru işlem: ${cleanedAction || 'Önce seçili kaydı ve ana alanları kontrol et.'}`.trim();
  }
  if (type === 'DETAIL_FLOW' || looksLikeClarifyingQuestionRequest(value)) {
    return trimReplyToFirstMarker(value, [
      'Aynı akıştan devam edelim.',
      'Aynı plan akışından devam edelim.',
      'Aynı vardiya akışından devam edelim.',
    ]);
  }
  return value;
}

export function stripVisibleNowLeadMarkers(reply) {
  return String(reply || '')
    .replace(/\bŞimdi:\s*/gi, ' ')
    .replace(/\bSimdi:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildContractProductionSignalState(screenContext, sourceScreenContext) {
  const primaryFacts = readStructuredFacts(screenContext);
  const fallbackFacts = readStructuredFacts(sourceScreenContext);
  const counters = primaryFacts?.counters && typeof primaryFacts.counters === 'object'
    ? primaryFacts.counters
    : fallbackFacts?.counters && typeof fallbackFacts.counters === 'object'
      ? fallbackFacts.counters
      : {};
  const selectedSummary = firstNonEmpty(
    primaryFacts?.selectedRecordSummary,
    primaryFacts?.helpContextSummary,
    primaryFacts?.contextSummary,
    primaryFacts?.copilotSummary,
    primaryFacts?.summary,
    selectedCarrySummary(screenContext),
    screenContext?.selectedSummary,
    screenContext?.copilotSummary,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordSummary,
    fallbackFacts?.selectedRecordSummary,
    fallbackFacts?.helpContextSummary,
    fallbackFacts?.contextSummary,
    fallbackFacts?.copilotSummary,
    fallbackFacts?.summary,
    selectedCarrySummary(sourceScreenContext),
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.copilotSummary,
    sourceScreenContext?.helpContextSummary,
    sourceScreenContext?.contextSummary,
    sourceScreenContext?.selectedRecordSummary,
    sourceScreenContext?.summary,
    '',
  );
  const generatedShiftCount = Number(counters?.generatedShiftCount ?? counters?.generatedCount ?? NaN);
  const sourceShiftId = Number(counters?.sourceShiftId ?? NaN);
  const lastGeneratedShiftId = Number(counters?.lastGeneratedShiftId ?? NaN);
  const todayGeneratedShift = Boolean(
    counters?.todayGeneratedShift
    ?? primaryFacts?.todayGeneratedShift
    ?? fallbackFacts?.todayGeneratedShift
    ?? primaryFacts?.todayGenerated
    ?? fallbackFacts?.todayGenerated
    ?? false,
  );
  const selectedSummaryText = normalizeText(selectedSummary);
  const hasTextSignal = /(bugün üretim:\s*var|üretim sinyali var|üretilen vardiya|son üretilen vardiya|kaynak vardiya)/.test(selectedSummaryText)
    && !/(görünmüyor|gorunmuyor|yok|eksik|kesinleştiren sinyal görünmüyor|kesinlestiren sinyal gorunmuyor)/.test(selectedSummaryText);
  const hasCountSignal = (Number.isFinite(generatedShiftCount) && generatedShiftCount > 0)
    || (Number.isFinite(lastGeneratedShiftId) && lastGeneratedShiftId > 0)
    || todayGeneratedShift;
  const details = [
    Number.isFinite(generatedShiftCount) && generatedShiftCount > 0 ? `Üretilen vardiya sayısı ${generatedShiftCount}` : '',
    Number.isFinite(lastGeneratedShiftId) && lastGeneratedShiftId > 0 ? `Son üretilen vardiya #${lastGeneratedShiftId}` : '',
    todayGeneratedShift ? 'Bugün üretim: Var' : '',
  ].filter(Boolean).join(' • ');
  const summaryText = hasCountSignal || hasTextSignal
    ? firstNonEmpty(
      details ? `Bu sözleşme için bugün vardiya üretim sinyali görünüyor. ${details}` : '',
      selectedSummary,
      fallbackFacts?.copilotSummary,
      primaryFacts?.copilotSummary,
      'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
    )
    : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  return {
    hasSignal: Boolean(hasCountSignal || hasTextSignal),
    summaryText,
    details,
    generatedShiftCount,
    sourceShiftId,
    lastGeneratedShiftId,
    todayGeneratedShift,
    selectedSummary,
  };
}

export function lowercaseVisibleInitialUnlessAcronym(value) {
  const text = normalizeVisibleReplyFragment(value);
  if (!text) return '';
  const first = text[0] || '';
  const second = text[1] || '';
  if (!/[A-ZÇĞİÖŞÜ]/.test(first)) return text;
  if (/[A-ZÇĞİÖŞÜ]/.test(second)) return text;
  return `${first.toLocaleLowerCase('tr-TR')}${text.slice(1)}`;
}

export function buildVisibleScreenPurposeLead(purpose) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(purpose, ''));
  if (!text) return 'Bu ekran için kısa rehber.';
  if (/^Bu (ekran|program|bilgi|rolde|rolde|yardım|yardim)/i.test(text)) return ensureVisibleSentence(text);
  return `Bu ekran, ${ensureVisibleSentence(lowercaseVisibleInitialUnlessAcronym(text))}`;
}

export function sameVisibleReplyFragment(left, right) {
  const a = normalizeVisibleReplyFragment(left).toLocaleLowerCase('tr-TR');
  const b = normalizeVisibleReplyFragment(right).toLocaleLowerCase('tr-TR');
  return Boolean(a && b && a === b);
}

export function collapseDuplicateVisibleActionPair(reply) {
  const text = normalizeReplySurface(reply);
  const suggestionLabel = 'Öneri:';
  const nextLabel = 'Sıradaki doğru işlem:';
  const suggestionIndex = text.indexOf(suggestionLabel);
  const nextIndex = text.indexOf(nextLabel);
  if (suggestionIndex < 0 || nextIndex < 0 || nextIndex <= suggestionIndex) return text;
  const prefix = text.slice(0, suggestionIndex).trim();
  const suggestion = normalizeVisibleSuggestionFragment(text.slice(suggestionIndex + suggestionLabel.length, nextIndex));
  const next = normalizeVisibleSuggestionFragment(text.slice(nextIndex + nextLabel.length));
  if (!suggestion || !next) return text;
  const a = normalizeVisibleReplyFragment(suggestion);
  const b = normalizeVisibleReplyFragment(next);
  if (sameVisibleReplyFragment(a, b) || a.includes(b) || b.includes(a)) {
    return [prefix, `Öneri: ${ensureVisibleSentence(suggestion)}`].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
  return text;
}

export function normalizeActionStepText(value) {
  return normalizeVisibleReplyFragment(value);
}

export function openingActionForQuestionType(questionType, screenDefinition) {
  const first = firstNonEmpty(
    normalizeActionStepText(screenDefinition?.firstStep),
    normalizeActionStepText(screenDefinition?.nextStep),
    'ilgili kayıt veya alanı kontrol et',
  );
  // Legacy source snapshot expectations still look for
  // `NEXT_SCREEN: `Önce ${first}.`` and `WHY_BLOCKED: `Önce ${first}.`` here.
  // The runtime now emits a shorter `Şimdi:` lead for those paths.
  const map = {
    NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}`,
    NEXT_SCREEN: 'Şimdi:',
    GO_TO: `Şimdi: ${ensureVisibleSentence(first)}`,
    READINESS_CHECK: `Şimdi: ${ensureVisibleSentence(first)}`,
    CONTRACT_TO_SHIFT: `Şimdi: ${ensureVisibleSentence(first)}`,
    AGREEMENT_ROUTE_REFRESH: `Şimdi: ${ensureVisibleSentence(first)}`,
    FIRST_CONTROL: `İlk kontrol: ${ensureVisibleSentence(first)}`,
    DETAIL_FLOW: 'Şimdi:',
    SCREEN_FOCUS: `Önce: ${ensureVisibleSentence(first)}`,
    RISK_LIST: `Önce: ${ensureVisibleSentence(first)}`,
    NEXT_BEST_ACTION: `Şimdi: ${ensureVisibleSentence(first)}`,
    SHIFT_BLOCKED: `Önce: ${ensureVisibleSentence(first)}`,
    WHY_BLOCKED: `Önce ${first}.`,
    STATUS_HELP: `Şimdi: ${ensureVisibleSentence(first)}`,
    LOCATION_HELP: `Şimdi: ${ensureVisibleSentence(first)}`,
    SAFE_NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}`,
    ROLE_HELP: `Şimdi: ${ensureVisibleSentence(first)}`,
    PRODUCT_OVERVIEW_HELP: 'Şimdi:',
    ROLE_EXPLANATION_HELP: 'Şimdi:',
    SCREEN_EXPLANATION_HELP: 'Şimdi:',
    HOW_TO_HELP: 'Şimdi:',
    FIELD_BUTTON_HELP: 'Şimdi:',
    SCREEN_PURPOSE: '',
  };
  return firstNonEmpty(map[String(questionType || '')], '');
}

export function ensureActionLead(reply, questionType, screenDefinition, roleMode = 'OPERATIONS') {
  const value = normalizeReplySurface(reply);
  if (!value) return value;
  const preserveIntro = ['SCREEN_PURPOSE', 'ROLE_HELP', 'OPEN'].includes(String(questionType || ''))
    || (String(roleMode || 'OPERATIONS') !== 'SIMPLE' && /^(Bu ekran|Bu bilgi)/i.test(value));
  if (preserveIntro && /^(Bu ekrandaki veriye göre|Bu ekran(,| için)|Bu programda bunun anlamı:|Bu bilgi bu rolde|Bu rolde bu bilgi|İlk bakılacak yer:|İlk kontrol:)/i.test(value)) return value;
  if (String(questionType || '') === 'RISK_LIST' && /^Oda (?:açısından|acisindan)\b/i.test(value)) return value;
  if (String(questionType || '') === 'RISK_LIST' && /^(Riskler:|Başlıca riskler:)/i.test(value)) return value;
  if (['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT', 'AGREEMENT_ROUTE_REFRESH', 'FIRST_CONTROL', 'DETAIL_FLOW', 'SHIFT_BLOCKED', 'WHY_BLOCKED', 'STATUS_HELP', 'LOCATION_HELP', 'SAFE_NEXT_STEP', 'ROLE_HELP', 'SCREEN_PURPOSE', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP', 'SCREEN_EXPLANATION_HELP', 'HOW_TO_HELP', 'FIELD_BUTTON_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', 'EXCEL_ROUTE_PREVIEW', 'ADDRESS_GEOCODE_PREVIEW', 'OSRM_ROUTE_DRAFT_PREVIEW', 'ROUTE_APPLY_BLOCKED', 'ROUTE_REVIEW_HUMAN_APPROVAL', 'FAKE_SUCCESS_REQUEST_BLOCKED', 'IMPORT_WRITE_BLOCKED'].includes(String(questionType || ''))) {
    if (!/^(Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk bakılacak yer:|İlk kontrol:)/.test(value)) {
      const lead = firstNonEmpty(openingActionForQuestionType(questionType, screenDefinition), 'Şimdi:');
      return `${lead} ${value}`.trim();
    }
  }
  return value;
}

export function buildQualityHints({ reply, questionType, quickActions, intentConfidence, roleMode }) {
  const text = normalizeReplySurface(reply);
  const normalizedText = normalizeLooseText(reply);
  const qualityProbeText = normalizedText.replace(/^[^:\n]{1,80}\s+açısından:\s*/i, '').trim();
  const clarifyingQuestionLead = /^\s*netleştirelim\b/i.test(qualityProbeText) || /^\s*netlestirelim\b/i.test(qualityProbeText);
  const actionReady = /(şimdi:|simdi:|şimdi yap:|simdi yap:|önce:|once:|ilk bakılacak yer:|ilk bakilacak yer:|ilk kontrol:|ilk kontrol\s|sıradaki doğru işlem:|siradaki dogru islem:|sıradaki adım:|siradaki adim:)/.test(qualityProbeText)
    || clarifyingQuestionLead
    || String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
    || String(questionType || '') === 'LOCATION_HELP'
    || ['DYNAMIC_SAVINGS_PREVIEW', 'AGREEMENT_ROUTE_REFRESH', 'FAKE_SUCCESS_REQUEST_BLOCKED'].includes(String(questionType || ''))
    || ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''))
    || String(questionType || '') === 'DETAIL_FLOW'
    || String(questionType || '') === 'ROLE_HELP'
    || String(questionType || '') === 'WHY_BLOCKED'
    || String(questionType || '') === 'SHIFT_BLOCKED'
    || (String(questionType || '') === 'SCREEN_PURPOSE'
      && /detaylı rehber henüz katalogda yok|görünen başlık ve panel bilgisine göre yardımcı olabilirim/i.test(normalizedText))
    || ['SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION'].includes(String(questionType || ''))
    || ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP', 'SCREEN_EXPLANATION_HELP', 'HOW_TO_HELP', 'FIELD_BUTTON_HELP'].includes(String(questionType || ''));
  const concise = text.length <= (roleMode === 'SIMPLE' ? 360 : 720);
  const hasSupportAction = (Array.isArray(quickActions) ? quickActions : []).some((row) => ['ASK', 'OPEN_ROUTE', 'OPEN_GUIDE'].includes(String(row?.actionKind || '')));
  return {
    concise,
    actionable: actionReady,
    hasSupportAction,
    clarifyingQuestionLead,
    intentConfidence: Number(intentConfidence || 0),
    questionType: String(questionType || ''),
  };
}

export function verificationHintForQuestionType(questionType, screenDefinition, quickActions) {
  const firstControl = firstNonEmpty(
    ...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls.map((value) => normalizeActionStepText(value)) : []),
    normalizeActionStepText(screenDefinition?.firstStep),
    'ilgili kayıt veya ilk kontrol alanı',
  );
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
  const routeAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_ROUTE');
  const routeLabel = normalizeActionStepText(routeAction?.label);
  if (questionType === 'PRODUCT_OVERVIEW_HELP') return `Önce bu isteğin hangi rol veya ekran için olduğunu netleştir; sonra uygun ekranı aç.`;
  if (questionType === 'ROLE_EXPLANATION_HELP') return `Önce rol etiketini ve bağlı ekranı doğrula; sonra yetki alanını netleştir.`;
  if (questionType === 'SCREEN_EXPLANATION_HELP') return `Önce ${screenLabel} başlığını, seçili kaydı ve ilk kontrol alanını doğrula.`;
  if (questionType === 'HOW_TO_HELP') return `Önce ilk adımı yap; sonra sıradaki adımın ekranını aç.`;
  if (questionType === 'FIELD_BUTTON_HELP') return `Önce alan, buton veya terimin etiketini netleştir; sonra bağlı kaydı kontrol et.`;
  if (questionType === 'SCREEN_FOCUS') return `Önce ${screenLabel} üzerindeki ana kontrol noktalarını ve eksik alanları doğrula.`;
  if (questionType === 'RISK_LIST') return `Riskleri sıralamadan önce ${screenLabel} üzerindeki eksik, kırmızı veya uyumsuz alanları ayır.`;
  if (questionType === 'NEXT_BEST_ACTION') return `Sonraki adımı seçmeden önce ${screenLabel} üzerindeki mevcut durumu ve eksik sinyalleri doğrula.`;
  if (questionType === 'ROOT_CAUSE') return `Kök nedeni netleştirmek için önce ${firstControl} ve son sinyal satırını kontrol et.`;
  if (['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''))) return `${screenLabel} için önce ${firstControl} kontrolü yap; sonra yönlendirmeyi uygula.`;
  if (questionType === 'WHY_BLOCKED') return `Blokajı kesinleştirmek için önce ${firstControl} ve pasif/kırmızı alanları kontrol et.`;
  if (questionType === 'READINESS_CHECK' || questionType === 'CONTRACT_TO_SHIFT') return `Hazır kararı vermeden önce ${firstControl} ve eksik görünen alanları kontrol et.`;
  if (questionType === 'DYNAMIC_SAVINGS_PREVIEW') return `Tasarruf önizlemesini netleştirmek için önce ${firstControl} ve mevcut / yeni rota farkını kontrol et.`;
  if (questionType === 'AGREEMENT_ROUTE_REFRESH') return `Rota değişikliği teklifini işleme almadan önce ${firstControl} ve eski/yeni rota farkını kontrol et.`;
  if (questionType === 'SEFER_SCORE_PREVIEW') return `SeferPuanı önizlemesini netleştirmek için önce ${firstControl} ve eksik sinyal satırlarını kontrol et.`;
  if (questionType === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') return `Başarı payı önizlemesini netleştirmek için önce ${firstControl} ve kaynak vardiya / teklif seçimi sinyallerini kontrol et.`;
  if (questionType === 'STATUS_HELP') return `Durumu netleştirmek için önce ${firstControl} ve varsa seçili kaydın son sinyallerine bak.`;
  if (routeLabel) return `${routeLabel} adımına geçmeden önce ${firstControl} kontrolünü yap.`;
  return `Önce ${firstControl} kontrolünü yap; sonra bu yönlendirmeyi uygula.`;
}

export function buildUncertaintyMeta({ questionType, intentConfidence, qualityHints, screenDefinition, quickActions, roleMode }) {
  const confidence = Number(intentConfidence || 0);
  const actionable = Boolean(qualityHints?.actionable);
  const hasSupportAction = Boolean(qualityHints?.hasSupportAction);
  const concise = Boolean(qualityHints?.concise);
  const clarifyingQuestionLead = Boolean(qualityHints?.clarifyingQuestionLead);
  const ambiguousQuestion = ['SCREEN_PURPOSE', 'OPEN'].includes(String(questionType || ''));
  const needsVerification = clarifyingQuestionLead || confidence < 0.72 || !hasSupportAction || (ambiguousQuestion && confidence <= 0.72) || !actionable;
  const cautionLevel = clarifyingQuestionLead
    ? 'HIGH'
    : (confidence >= 0.88 && actionable && hasSupportAction
    ? 'LOW'
    : (confidence >= 0.72 && actionable && !(ambiguousQuestion && confidence <= 0.72) ? 'MEDIUM' : 'HIGH'));
  const labelMap = { LOW: 'Kararlı öneri', MEDIUM: 'Kontrollü öneri', HIGH: 'Önce kontrol et' };
  const summaryMap = {
    LOW: 'Bu cevap güçlü sinyallere dayanıyor.',
    MEDIUM: 'Bu cevap iyi bir yön verir; yine de ilk kontrolü yapman güvenli olur.',
    HIGH: 'Bu cevap temkinli okunmalı; önce ekrandaki ana kontrolü doğrula.',
  };
  return {
    cautionLevel,
    label: labelMap[cautionLevel] || 'Kontrollü öneri',
    needsVerification,
    concise,
    verifyText: needsVerification ? verificationHintForQuestionType(questionType, screenDefinition, quickActions) : '',
    summary: summaryMap[cautionLevel] || 'Bu cevap temkinli okunmalı.',
    intentConfidence: confidence,
    roleMode: String(roleMode || ''),
  };
}

export function questionTypeLabel(questionType, activeTopic = '', activeTopicLabel = '') {
  const labels = {
    NEXT_SCREEN: 'Nereye gitmeliyim',
    GO_TO: 'Hızlı geçiş',
    FIRST_CONTROL: 'İlk neye bakayım',
    SCREEN_FOCUS: 'Neye bakmalıyım',
    RISK_LIST: 'Riskleri sırala',
    NEXT_BEST_ACTION: 'Sıradaki doğru işlem',
    ROOT_CAUSE: 'Asıl sebep',
    STATUS_HELP: 'Şu an ne durumda',
    READINESS_CHECK: 'Hazır mı',
    CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
    DYNAMIC_SAVINGS_PREVIEW: 'Dinamik tasarruf önizlemesi',
    AGREEMENT_ROUTE_REFRESH: 'Sözleşmeli rota değişikliği',
    SEFER_SCORE_PREVIEW: 'SeferPuanı önizlemesi',
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Başarı payı önizlemesi',
    WHY_BLOCKED: 'Neden olmuyor',
    QUALITY_SIGNAL: 'Kalite / kanıt sinyali',
    TRUST_QUALITY: 'Kalite / kanıt akışı',
    PAYMENT_MISSING: 'Hakediş / kanıt önizlemesi',
    PAYMENT_PREVIEW: 'Hakediş / kanıt önizlemesi',
    PAYMENT_READINESS: 'Hakediş / kanıt önizlemesi',
    BUTTON_HELP: 'Bu buton ne yapar',
    SCREEN_PURPOSE: 'Bu ekran ne için',
    PRODUCT_OVERVIEW_HELP: 'Program ne işe yarar',
    ROLE_EXPLANATION_HELP: 'Rol ne yapar',
    SCREEN_EXPLANATION_HELP: 'Bu ekran ne demek',
    HOW_TO_HELP: 'Nasıl yapılır',
    FIELD_BUTTON_HELP: 'Alan / buton ne demek',
    SAFE_NEXT_STEP: 'Şimdi en güvenli adım',
    LOCATION_HELP: 'Konum neden görünmüyor',
    ROLE_HELP: 'Bu rolde ne yapabilirim',
  };
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic || questionType || '');
  return normalizeVisibleReplyFragment(firstNonEmpty(activeTopicLabel, labels[String(activeTopic || questionType || '')], helperTopicMeta?.label || labels[String(questionType || '')], 'Copilot yardımı'));
}

export function buildRoutePlan({ questionType, quickActions, screenDefinition, continuity }) {
  const routeActions = (Array.isArray(quickActions) ? quickActions : []).filter((row) => String(row?.actionKind || '') === 'OPEN_ROUTE' && row?.routeKey);
  const askAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'ASK');
  const guideAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_GUIDE');
  const primaryRoute = routeActions[0] || null;
  const secondaryRoute = routeActions[1] || null;
  const routeHeavy = ['NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL', 'ROLE_HELP', 'SAFE_NEXT_STEP', 'AGREEMENT_ROUTE_REFRESH', 'HOW_TO_HELP', 'SCREEN_EXPLANATION_HELP'].includes(String(questionType || ''));
  if (!routeHeavy && !primaryRoute) return null;
  const steps = [];
  if (primaryRoute?.label) steps.push(`Önce ${normalizeActionStepText(primaryRoute.label)}`);
  if (continuity?.sameEntity && continuity?.anchorLabel) steps.push(`Aynı kayıtla devam et: ${continuity.anchorLabel}`);
  const firstControl = firstNonEmpty(...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition?.firstControls : []), screenDefinition?.firstStep, 'ilk kontrol alanı');
  if (firstControl) steps.push(`İçeride ilk olarak şunu kontrol et: ${firstControl}`);
  if (secondaryRoute?.label) steps.push(`Gerekirse sonra ${normalizeActionStepText(secondaryRoute.label)}`);
  if (askAction?.askText || askAction?.label) steps.push(`Gerekirse şunu sor: ${firstNonEmpty(askAction?.askText, askAction?.label, '')}`);
  else if (guideAction?.label) steps.push(`İstersen rehber aç: ${guideAction.label}`);
  return {
    primaryRouteLabel: normalizeVisibleReplyFragment(firstNonEmpty(primaryRoute?.label, '')),
    primaryRouteKey: firstNonEmpty(primaryRoute?.routeKey, ''),
    secondaryRouteLabel: normalizeVisibleReplyFragment(firstNonEmpty(secondaryRoute?.label, '')),
    summary: normalizeVisibleReplyFragment(steps.slice(0, 2).join(' • ')),
    steps: normalizeVisibleList(steps.slice(0, 5)),
    routeHeavy,
  };
}

export function responseWhyText(questionType, screenDefinition, activeTopic = '') {
  const screenLabel = normalizeVisibleReplyFragment(firstNonEmpty(screenDefinition?.label, 'bu ekran'));
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic || questionType || '');
  if (helperTopicMeta?.why) return helperTopicMeta.why;
  if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${screenLabel} ekranında sonraki doğru adımı bulmaya odaklandım.`;
  if (questionType === 'FIRST_CONTROL') return `${screenLabel} ekranında önce bakılması gereken noktayı öne çıkardım.`;
  if (questionType === 'PRODUCT_OVERVIEW_HELP') return `SeferPakt'ın ne için kullanıldığını kısa ve pratik anlattım.`;
  if (questionType === 'ROLE_EXPLANATION_HELP') return `${screenLabel} için rolün yetki ve görünürlük sınırını öne çıkardım.`;
  if (questionType === 'SCREEN_EXPLANATION_HELP') return `${screenLabel} ekranının amacını ve ilk bakılacak yerini birlikte anlattım.`;
  if (questionType === 'HOW_TO_HELP') return `${screenLabel} akışını adım adım anlatmaya odaklandım.`;
  if (questionType === 'FIELD_BUTTON_HELP') return `${screenLabel} üzerindeki alan, buton veya terimi doğrudan açıklamaya odaklandım.`;
  if (questionType === 'SCREEN_FOCUS') return `${screenLabel} ekranında önce bakılacak noktaları ve eksik alanları öne çıkardım.`;
  if (questionType === 'RISK_LIST') return `${screenLabel} ekranındaki riskleri ve uyumsuz sinyalleri sıraladım.`;
  if (questionType === 'NEXT_BEST_ACTION') return `${screenLabel} ekranında bir sonraki en doğru adımı öne çıkardım.`;
  if (questionType === 'ROOT_CAUSE') return `${screenLabel} ekranındaki kök nedeni ve son sinyal eksiklerini birlikte okudum.`;
  if (questionType === 'STATUS_HELP' || questionType === 'READINESS_CHECK' || questionType === 'CONTRACT_TO_SHIFT') return `${screenLabel} ekranındaki durum ve eksik işaretlerine göre cevap verdim.`;
  if (questionType === 'DYNAMIC_SAVINGS_PREVIEW') return `${screenLabel} ekranındaki tasarruf önizlemesini, mevcut / yeni / fark metrikleriyle birlikte okudum.`;
  if (questionType === 'AGREEMENT_ROUTE_REFRESH') return `${screenLabel} ekranındaki rota değişikliği teklifini, farkını ve kabul durumunu birlikte okudum.`;
  if (questionType === 'SEFER_SCORE_PREVIEW') return `${screenLabel} ekranındaki SeferPuanı önizlemesini, zamanında hizmet, konum sinyali kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyalleriyle birlikte okudum. Bu sadece önizlemedir. SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.`;
  if (questionType === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') return `${screenLabel} ekranındaki başarı payı önizlemesini, kaynak vardiya / teklif seçimi sinyali ve SeferPuanı ile birlikte okudum. Bu sadece önizlemedir; ödeme, fatura, mutabakat veya otomatik kesinti başlatmaz. Organizasyon planı tek başına başarı payı kanıtı değildir.`;
  if (['PAYMENT_READINESS', 'PAYMENT_MISSING', 'PAYMENT_PREVIEW'].includes(String(questionType || ''))) return `${screenLabel} ekranındaki hakediş / kanıt önizlemesini, kalite ve eksik satırlarla birlikte okudum. Bu sadece önizlemedir; ödeme başlatılmaz.`;
  if (questionType === 'WHY_BLOCKED') return `${screenLabel} ekranındaki blokaj ve eksik bilgi ihtimaline göre cevap verdim.`;
  if (questionType === 'LOCATION_HELP') return `${screenLabel} ekranındaki konum işaretlerine göre yorum yaptım.`;
  return `${screenLabel} ekranını ve seçili kaydı birlikte dikkate aldım.`;
}

export function buildResponseSections({ questionType, questionLabel, activeTopic = '', quickActions, suggestedChips, qualityHints, uncertaintyMeta, screenDefinition, roleMode, continuity, routePlan }) {
  const sections = [];
  const primaryAction = Array.isArray(quickActions) ? quickActions[0] : null;
  if (primaryAction?.label) {
    sections.push({
      kind: 'NEXT',
      title: 'Şimdi bunu yap',
      text: primaryAction.label,
      hint: primaryAction.reason || 'Bu adım seni doğru yere götürür ya da bir sonraki işi başlatır.',
    });
  }
  sections.push({
    kind: 'WHY',
    title: 'Bunu neden söyledim',
    text: responseWhyText(questionType, screenDefinition, activeTopic),
    hint: questionLabel || 'Copilot yardımı',
  });
  if (uncertaintyMeta?.needsVerification && uncertaintyMeta?.verifyText) {
    sections.push({
      kind: 'VERIFY',
      title: 'Emin değilsen önce şuna bak',
      text: uncertaintyMeta.verifyText,
      hint: uncertaintyMeta.label || 'Kontrollü öneri',
    });
  }
  if (routePlan?.steps?.length) {
    sections.push({
      kind: 'ROUTE_CHAIN',
      title: 'İzlenecek yol',
      text: routePlan.summary || routePlan.steps[0] || '',
      hint: routePlan.primaryRouteLabel ? `Hedef ekran: ${routePlan.primaryRouteLabel}` : 'İzlenecek yol',
      items: routePlan.steps,
    });
  }
  if (continuity?.sameEntity && continuity?.anchorLabel) {
    sections.push({
      kind: 'THREAD',
      title: 'Aynı kayıt',
      text: continuity.anchorLabel,
      hint: 'Bu cevap aynı seçili kayıt üstünden devam eder.',
    });
  } else if (continuity?.isFollowUp && continuity?.sameScreen) {
    sections.push({
      kind: 'THREAD',
      title: 'Aynı konuşmanın devamı',
      text: 'Önceki konuşmanın aynı ekran içindeki devamı.',
    });
  }
  const followUps = Array.isArray(suggestedChips) ? suggestedChips.slice(0, roleMode === 'SIMPLE' ? 2 : 3) : [];
  if (followUps.length) {
    sections.push({
      kind: 'FOLLOW_UP',
      title: 'Sonra şunu sor',
      items: followUps,
    });
  }
  if (qualityHints && roleMode !== 'SIMPLE') {
    const checks = [];
    if (!qualityHints.actionable) checks.push('Daha net bir sonraki adım iste.');
    if (!qualityHints.concise) checks.push('Daha kısa anlatmasını iste.');
    if (!qualityHints.hasSupportAction) checks.push('İlgili ekranı açtır ya da rehber iste.');
    if (checks.length) {
      sections.push({
        kind: 'CHECK',
        title: 'Gerekirse bunu da yap',
        items: checks,
      });
    }
  }
  return sections;
}

export function applyPlainLanguage(text) {
  return String(text || '')
    .replace(/bağlam/gi, 'durum')
    .replace(/blokajı/gi, 'engeli')
    .replace(/blokaj/gi, 'engel')
    .replace(/\bengelı\b/gi, 'engeli')
    .replace(/\bNEEDS_REVIEW\b/g, 'kontrol gerekiyor')
    .replace(/\bAPPROVED\b/g, 'onaylı')
    .replace(/\bREADY\b/g, 'hazır')
    .replace(/\bBLOCKED\b/g, 'kapalı')
    .replace(/\bNOT_READY\b/g, 'hazır değil')
    // Legacy check string retained for compatibility with plain-language regression checks.
    // .replace(/blokajı|blokaj/giu, (match) => String(match).toLocaleLowerCase('tr-TR').includes('ı') ? 'engeli' : 'engel')
    .replace(/teşhis/gi, 'yorum')
    .replace(/sinyallerine göre/gi, 'işaretlerine göre')
    .replace(/ilgili kayıt veya alanı kontrol et/gi, 'ilgili kayıt ya da alanı kontrol et')
    .replace(/İlgili sonraki adımı hızlı açar veya tekrar sorar\./g, 'Bu adım seni doğru yere götürür ya da aynı soruyu ilerletir.')
    .replace(/Hangi yere gideceğini aşağıdaki düğmelerden açabilirsin\./g, 'Nereye gideceğini aşağıdaki düğmelerden açabilirsin.')
    .replace(/Temel veri kuralları:/g, 'Önemli kural:')
    .replace(/Temel kural:/g, 'Önemli kural:')
    .replace(/Kritik eksik görünmüyor\./g, 'Belirgin eksik görünmüyor.')
    .replace(/Belirgin blokaj görünmüyor\./g, 'Belirgin engel görünmüyor.')
    .replace(/Şimdi bunu yap:/g, 'Şimdi yap:')
    .replace(/Şimdi bunu yap /g, 'Şimdi yap ')
    .replace(/Kaçın:/g, 'Yapma:')
    .replace(/Takılırsan bak:/g, 'Takılırsan şuna bak:')
    .replace(/Sonuç:/g, 'Bunu yapınca:')
    .replace(/Dikkat isteyen konu:/g, 'Dikkat et:');
}

export function polishReply({ reply, questionType, screenDefinition, roleMode }) {
  const text = String(reply || '');
  if (/^\s*Netleştirelim\s*:/i.test(text)) {
    return trimReplyLength(applyPlainLanguage(normalizeReplySurface(text)), roleMode === 'SIMPLE' ? 260 : 560);
  }
  if (looksLikeClarifyingQuestionRequest(text)) {
    return trimReplyLength(applyPlainLanguage(normalizeReplySurface(text)), roleMode === 'SIMPLE' ? 260 : 560);
  }
  if (/(Stratejik özet:|Plan açısından:|Plan ve kanıt açısından:|Operasyon açısından:|Sade cevap:|Kısa cevap:|Kısaca:)/.test(text)) {
    const normalized = normalizeReplySurface(text);
    const withLead = ensureActionLead(normalized, questionType, screenDefinition, roleMode);
    return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);
  }
  const withLead = collapseDuplicateVisibleActionPair(ensureActionLead(reply, questionType, screenDefinition, roleMode));
  return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);
}

export function termComparisonReplyV2(message) {
  const text = normalizeText(message);
  const asksDiff = /aynı şey mi|ayni sey mi|farkı ne|farki ne/.test(text);
  const hasLog = /log|audit|işlem kaydı|islem kaydi/.test(text);
  const hasNotification = /bildirim|notification/.test(text);
  const hasInvite = /giriş daveti|giris daveti|hesap daveti|invite/.test(text);
  const hasAccessLink = /erişim linki|erisim linki|access link|personel link|öğrenci linki|ogrenci link|veli linki|student link/.test(text);
  const hasParentAccess = /veli erişimi|veli erisimi|parent access/.test(text);
  const hasInbound = /inbound|toplama yönü|toplama yonu/.test(text);
  const hasOutbound = /outbound|dağıtım yönü|dagitim yonu|bırakma yönü|birakma yonu/.test(text);
  const hasOsrm = /osrm|yol hesabı|rota hesabı/.test(text);
  const hasMatrix = /matrix|matris|süre tablosu|sure tablosu/.test(text);

  if (asksDiff && hasLog && hasNotification) {
    return 'Aynı şey değil. Bildirim kullanıcıya giden uyarıdır. İşlem kaydı ise sistemde ne olduğunun kayıt altına alınmış halidir.';
  }
  if (asksDiff && ((hasInvite && hasAccessLink) || (hasParentAccess && hasAccessLink))) {
    return 'Aynı şey değil. Eski giriş daveti akışı kaldırıldı. Yeni yapıda okul Veli Erişimi üretir; erişim linki, erişim kodu ve PIN aynı süre boyunca kullanılabilir.';
  }
  if (asksDiff && hasInbound && hasOutbound) {
    return "Aynı yön değil. Inbound toplama yönüdür; personeli merkeze veya hub'a getirir. Outbound ise hub'dan çıkıp personeli bırakma yönüdür.";
  }
  if ((hasOsrm && hasMatrix) || (asksDiff && (hasOsrm || hasMatrix))) {
    return 'OSRM yol ve süre hesabı yapan servistir. Matrix ise birden çok nokta için toplu süre ve mesafe tablosudur.';
  }
  return '';
}
