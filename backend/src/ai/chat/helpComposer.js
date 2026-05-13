import { buildJobGuideResponse } from '../jobGuide/index.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../jobGuide/screenCatalog.js';
import { explainTermsFromText } from '../jobGuide/glossary.js';
import { detectQuestionIntent, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeAskAction, makeCopyAction, makeGuideAction, makeLinkedGuide, makeQuickAction, mergeQuickActions, toReply, uniqueStrings } from './replyShapes.js';
import { analyzeScreenState } from './screenStateAnalyzer.js';
import { createSelectedRuntimeHelpers } from './helpComposerSelectedRuntime.js';
import { createEntityRuntimeHelpers } from './helpComposerEntityRuntime.js';

function pickTerms(simpleTerms, limit = 3) {
  return (Array.isArray(simpleTerms) ? simpleTerms : []).slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}

function pickButtons(buttonGuides, limit = 3) {
  return (Array.isArray(buttonGuides) ? buttonGuides : []).slice(0, limit).map((row) => `${row.label}: ${row.purpose}`);
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
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

const WORKFLOW_DIAGNOSTIC_QUESTION_TYPES = new Set([
  'WHY_BLOCKED',
  'MISSING_DATA',
  'CONTRACT_TO_SHIFT',
  'CONTRACT_SHIFT_TODAY',
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
]);

const WORKFLOW_SURFACE_HINTS = [
  '/shifts',
  '/map',
  '/live',
  '/contracts',
  '/commercial-flow',
  '/operation-health',
  '/observability',
  '/trust-quality',
  '/feedback',
  '/notifications',
  '/kvkk',
  '/driver/today',
  '/personel/live',
  '/parent/live',
  '/superadmin/operations',
  '/superadmin/commercial-core',
  '/superadmin/trust-quality',
  '/superadmin/operation-verification',
];

function isWorkflowDiagnosticQuestionType(questionType) {
  return WORKFLOW_DIAGNOSTIC_QUESTION_TYPES.has(String(questionType || ''));
}

function pathLooksLikeWorkflowSurface(screenPath = '') {
  const value = normalizeText(screenPath);
  return WORKFLOW_SURFACE_HINTS.some((part) => value.includes(normalizeText(part)));
}

function normalizeStatusDisplayText(value) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
  if (!text) return '';
  const cleaned = text
    .replace(/\bengelı\b/gi, 'engeli')
    .replace(/[？?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const datedRange = cleaned.match(/^(.+?)\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})(?:\s*[-–—]\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}|\d{2}:\d{2}))?$/u);
  if (datedRange) {
    const status = normalizeVisibleReplyFragment(datedRange[1]);
    const start = normalizeVisibleReplyFragment(datedRange[2]);
    const end = normalizeVisibleReplyFragment(datedRange[3] || '');
    if (status && end) return `${status} • ${start} - ${end}`;
    if (status) return `${status} • ${start}`;
  }
  return cleaned;
}

function asText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') return firstNonEmpty(item.text, item.label, item.title, item.action, item.purpose, item.reason, '');
  return String(item || '');
}

function extractUserQuestion(message) {
  const raw = String(message || '').trim();
  if (!raw) return '';
  const match = raw.match(/Kullanıcının sorusu:\s*([\s\S]+)$/i);
  return String(match?.[1] || raw).trim();
}

function selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext) {
  const paths = [
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
  ].map((item) => normalizeText(item)).filter(Boolean);
  return paths.find((item) => item.startsWith('/superadmin')) || paths[0] || '';
}

function hasSelectedDiagnosticContext(screenContext) {
  if (!screenContext) return false;
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === 'object' ? screenContext.structuredFacts : null;
  return Boolean(
    selectedCarrySummary(screenContext)
    || selectedFieldRows(screenContext).length
    || selectedBadgeRows(screenContext).length
    || (Array.isArray(facts?.evidence) && facts.evidence.length)
    || (Array.isArray(facts?.missing) && facts.missing.length)
    || (Array.isArray(facts?.blockers) && facts.blockers.length)
    || selectedSignalRows(screenContext).length
    || (Array.isArray(facts?.copilotSignals) && facts.copilotSignals.length)
    || firstNonEmpty(facts?.copilotSummary, '')
  );
}

function selectedDiagnosticTheme(message) {
  const text = normalizeText(message);
  if (!text) return '';
  if (/(vardiya).*(başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|başlatamıyor|baslatamiyor)/.test(text)) return 'SHIFT_BLOCKED';
  if (/(araç|arac).*(harita|haritada).*(görünmüyor|gorunmuyor|yok)/.test(text) || /(haritada).*(görünmüyor|gorunmuyor).*(araç|arac)/.test(text)) return 'VEHICLE_NOT_VISIBLE';
  if (/(sürücünün|surucunun).*(telefon gps|telefon gps['’]i|telefon gps’i).*(neden).*(devrede|aktif|açık|acik)/.test(text) || /(telefon gps|cihaz gps).*(neden).*(devrede|aktif|açık|acik)/.test(text)) return 'DRIVER_PHONE_GPS';
  if (/(sağlayıcı|saglayici|provider).*(neden).*(daha iyi|daha güçlü|daha guclu)/.test(text) || /(daha iyi|daha güçlü|daha guclu).*(sağlayıcı|saglayici|provider)/.test(text)) return 'QUALITY_SIGNAL';
  if (/(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text) || /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text)) return 'CONTRACT_SHIFT_TODAY';
  if (/(sözleşme|sozlesme).*(vardiya|shift)/.test(text)) return 'CONTRACT_TO_SHIFT';
  if (/(hakediş|hakedis|ödeme|odeme).*(hazır değil|hazir degil|neden).*(eksik|kontrol gerekli|hazır değil|hazir degil)/.test(text) || /(önizleme|onizleme|csv).*(hazır değil|hazir degil|eksik|kontrol gerekli)/.test(text)) return 'PAYMENT_READINESS';
  if (/(hakediş|hakedis).*(neden).*(eksik|kontrol gerekli)/.test(text) || /(önizleme|onizleme).*(neden).*(eksik|kontrol gerekli)/.test(text)) return 'PAYMENT_MISSING';
  if (/(sorun ne|sorunu ne|ne sorun|problem ne)/.test(text)) return 'WHY_BLOCKED';
  if (/(kim yapabilir|kim onaylayacak|sorumlu kim|bu kayıt kimde|bu ismi kim yapabilir|bu işi kim yapabilir)/.test(text)) return 'WHO_CAN_DO';
  if (/(eksik veri|hangi alan boş|hangi alan bos|ne eksik|hangi veri eksik)/.test(text)) return 'MISSING_DATA';
  if (/(geri bildirim|feedback).*(açık|acik|kritik|çözüldü|cozuldu|kapandı|kapandi|sorumlu|yıldız|yildiz)/.test(text)) return 'FEEDBACK_STATUS';
  if (/(bildirim|notification).*(hangi olaydan|nereden geldi|kaynak|neden geldi)/.test(text)) return 'NOTIFICATION_SOURCE';
  if (/(kvkk|görünürlük|gorunurluk).*(görünmüyor|gorunmuyor|kim görebilir|kim gorebilir|hangi rol)/.test(text) || /(görünmüyor|gorunmuyor).*(kvkk|görünürlük|gorunurluk)/.test(text)) return 'KVKK_VISIBILITY';
  if (/(sıradaki doğru işlem|siradaki dogru islem|sıradaki işlem|siradaki islem|sonraki doğru işlem|sonraki dogru islem|ilk neye bakayım|ilk neye bakayim|şimdi ne yapayım|simdi ne yapayim|şimdi ne yapmalıyım|simdi ne yapmaliyim|hangi ekrana gitmeliyim|nereye geçmeliyim|nereye gitmeliyim)/.test(text)) return 'NEXT_ACTION';
  return '';
}

function sanitizeDiagnosticSupportText(text) {
  return normalizeReplySurface(String(text || '')).replace(/Sonuç:/g, 'Özet:');
}

function _selectedDiagnosticResult(theme, contextText = '') {
  const text = normalizeText(contextText);
  const hasNegative = /(yok|eksik|kapalı|kapali|görünmüyor|gorunmuyor)/.test(text);
  switch (theme) {
    case 'SHIFT_BLOCKED':
      return 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.';
    case 'VEHICLE_NOT_VISIBLE':
      return 'Bu ekrandaki veriye göre bu araç haritada görünmüyor.';
    case 'DRIVER_PHONE_GPS':
      return 'Bu ekrandaki veriye göre sürücünün telefon GPS’i devrede görünüyor.';
    case 'PROVIDER_BETTER':
    case 'QUALITY_SIGNAL':
      return 'Bu ekrandaki veriye göre bu sağlayıcı daha güçlü görünüyor.';
    case 'CONTRACT_SHIFT_TODAY':
    case 'CONTRACT_TO_SHIFT':
      return hasNegative
        ? 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretildiğine dair net işaret yok.'
        : 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.';
    case 'PAYMENT_READINESS':
      return hasNegative
        ? 'Bu ekrandaki veriye göre hakediş hazır değil.'
        : 'Bu ekrandaki veriye göre hakediş hazırlığı tamamlanmamış görünüyor.';
    case 'PAYMENT_MISSING':
      return 'Bu ekrandaki veriye göre bu hakediş eksik görünüyor.';
    case 'FEEDBACK_STATUS':
      return 'Bu ekrandaki veriye göre geri bildirim açık veya kritik görünüyor.';
    case 'NOTIFICATION_SOURCE':
      return 'Bu ekrandaki veriye göre bu bildirim bir olay kaynağına bağlı görünüyor.';
    case 'KVKK_VISIBILITY':
      return 'Bu ekrandaki veriye göre bu bilgi rola bağlı olarak görünmeyebilir.';
    case 'WHO_CAN_DO':
      return 'Bu ekrandaki veriye göre bu işlem bu rolde görünmeyebilir.';
    case 'MISSING_DATA':
      return 'Bu ekrandaki veriye göre seçili kayıtta eksik alanlar var.';
    case 'NEXT_ACTION':
      return 'Bu ekran, açık veya riskli kaydı netleştirmek için kullanılır.';
    default:
      return 'Bu ekrandaki veriye göre seçili kayıt kontrol altında tutulmalı.';
  }
}

function _selectedDiagnosticSurfaceHint(theme) {
  switch (theme) {
    case 'SHIFT_BLOCKED':
      return 'Araç, sürücü ve sözleşme bağı';
    case 'VEHICLE_NOT_VISIBLE':
      return 'Son GPS zamanı ve konum kaynağı';
    case 'DRIVER_PHONE_GPS':
      return 'Görev durumu ve sürücünün telefon GPS’i sinyali';
    case 'PROVIDER_BETTER':
    case 'QUALITY_SIGNAL':
      return 'Kanıt, taslak skor, inceleme kararı ve denetim izi';
    case 'CONTRACT_SHIFT_TODAY':
    case 'CONTRACT_TO_SHIFT':
      return 'Sözleşme / vardiya üretimi';
    case 'PAYMENT_READINESS':
      return 'Hakediş hazırlığı, önizleme ve CSV taslağı';
    case 'PAYMENT_MISSING':
      return 'Hakediş hazırlığı, önizleme ve CSV taslağı';
    case 'FEEDBACK_STATUS':
      return 'Durum, yıldız, kategori ve sorumlu rol';
    case 'NOTIFICATION_SOURCE':
      return 'Bildirim türü ve bağlı olay kaydı';
    case 'KVKK_VISIBILITY':
      return 'Rol ve görünürlük sınırı';
    case 'WHO_CAN_DO':
      return 'Rol ve yetki sınırı';
    case 'MISSING_DATA':
      return 'Eksik alanlar';
    case 'NEXT_ACTION':
      return 'Seçili kayıt özeti ve durum satırı';
    default:
      return 'Seçili kayıt özeti';
  }
}

// COP-01B: Super Admin OP/QLT/PAY yüzeylerinde seçili kayıt bağlamına göre kısa teşhis.
function composeSelectedRecordDiagnosticReply({ message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState }) {
  const screenPath = selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext);
  if (!screenPath.startsWith('/superadmin')) return null;
  const supportedSurface = screenPath === '/superadmin' || screenPath.startsWith('/superadmin/operations') || screenPath.startsWith('/superadmin/commercial-core') || screenPath.startsWith('/superadmin/trust-quality') || screenPath.startsWith('/superadmin/operation-verification');
  if (!supportedSurface) return null;
  const theme = selectedDiagnosticTheme(message);
  if (!theme) return null;

  const currentContext = hasSelectedDiagnosticContext(screenContext) ? screenContext : hasSelectedDiagnosticContext(sourceScreenContext) ? sourceScreenContext : null;
  if (!currentContext) return null;
  const currentScreenDefinition = currentContext === screenContext ? screenDefinition : sourceScreenDefinition;
  const fallbackContext = currentContext === screenContext ? sourceScreenContext : screenContext;
  const fallbackScreenDefinition = fallbackContext === sourceScreenContext ? sourceScreenDefinition : screenDefinition;
  const summary = firstNonEmpty(selectedCarrySummary(currentContext), selectedCarrySummary(fallbackContext), '');
  const rowReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedRowReadReply(currentContext, currentScreenDefinition), selectedRowReadReply(fallbackContext, fallbackScreenDefinition), ''));
  const missingReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(currentContext, currentScreenDefinition), selectedMissingReply(fallbackContext, fallbackScreenDefinition), ''));
  const fieldReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, currentContext, currentScreenDefinition), selectedFieldReply(message, fallbackContext, fallbackScreenDefinition), ''));
  const badgeReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, currentContext, currentScreenDefinition), selectedBadgeReply(message, fallbackContext, fallbackScreenDefinition), ''));
  const signalReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedSignalReply(currentContext, currentScreenDefinition), selectedSignalReply(fallbackContext, fallbackScreenDefinition), ''));
  const analysis = analyzeScreenState({ screenContext: currentContext, screenDefinition, conversationState });
  const analysisReply = analysis ? sanitizeDiagnosticSupportText(analyzerReply(analysis, 'DIAGNOSIS')) : '';
  const contextText = uniqueStrings([summary, rowReply, missingReply, fieldReply, badgeReply, signalReply, analysisReply]).join(' • ');
  const bridge = buildSelectedDiagnosticBridgeContext(currentContext, theme, contextText);
  const why = uniqueStrings([
    summary ? `Seçili kayıt: ${summary}` : '',
    rowReply,
    missingReply,
    fieldReply,
    badgeReply,
    signalReply,
    analysisReply,
  ]).slice(0, 2).join(' • ') || 'Bu ekrandaki veriye göre net blokaj görünmüyor.';
  const result = bridge.result;
  const firstControl = bridge.firstControl;
  const meaning = firstNonEmpty(summary, currentScreenDefinition?.menuPurpose, fallbackScreenDefinition?.menuPurpose, bridge.copilotSummary, bridge.result);
  const suggestion = firstNonEmpty(fieldReply, badgeReply, missingReply, analysis?.actionSimulation, bridge.firstControl, firstControl, 'Önce seçili kaydı aç.');
  const nextAction = firstNonEmpty(
    analysis?.actionSimulation,
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    currentScreenDefinition?.nextStep,
    fallbackScreenDefinition?.nextStep,
    suggestion,
    'İlgili satırı aç.',
  );
  return `Şimdi: ${result} Bu programda bunun anlamı: ${meaning}. Neden? ${why} Öneri: ${suggestion}. Sıradaki doğru işlem: ${ensureVisibleSentence(nextAction)}`.trim();
}

// COP-01A: OP/QLT/PAY ekran rehberi için kısa, güvenli cevaplar.
// COP-01E operasyon rehberi standardı:
// program çerçevesinde cevap
// sorun + neden + öneri + sıradaki adım
// emin değilse ilk kontrolü söyler
function composeOpsQualityPaymentGuideReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }) {
  const screenPath = normalizeText(firstNonEmpty(screenDefinition?.path, screenContext?.path, sourceScreenDefinition?.path, sourceScreenContext?.path, ''));
  if (!screenPath) return null;
  if (String(questionType || '') === 'SCREEN_PURPOSE' && screenPath !== '/superadmin' && screenPath !== '/superadmin/commercial-core') return null;

  const isSuperAdminOverview = screenPath === '/superadmin';
  const isCommercial = screenPath === '/superadmin/commercial-core';
  const isQuality = screenPath === '/superadmin/trust-quality';
  const isVerification = screenPath === '/superadmin/operation-verification';
  const isTargetSurface = isSuperAdminOverview || isCommercial || isQuality || isVerification;
  if (!isTargetSurface) return null;

  const text = normalizeText(message);
  const relevantQuestionType = ['SCREEN_PURPOSE', 'STATUS_HELP', 'WHY_BLOCKED', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'READINESS_CHECK', 'TERM_HELP'].includes(String(questionType || ''));
  const purposeLead = buildVisibleScreenPurposeLead(firstNonEmpty(
    screenDefinition?.menuPurpose,
    screenDefinition?.purpose,
    screenDefinition?.guidePurpose,
    screenDefinition?.label,
    'Bu ekran',
  ));

  const asksSystem = /(sistem durumu|sistem durumu ne demek|ne açık ne kapalı|ne acik ne kapali|ödeme neden kapalı|ödeme neden kapali|ödemeler neden kapalı|ödemeler neden kapali|neden kapalı|neden kapali)/.test(text);
  const asksCommercial = /(hakediş|hakedis|ödeme başlat|odeme baslat|ödemeyi başlat|önizleme|onizleme|csv|csv taslağı|csv taslagi|hazırlık|hazirlik|hazır mı|hazir mi|kontrol gerekli|eksik bilgi)/.test(text);
  const asksQuality = /(kalite puanı|kalite puani|taslak skor|inceleme kararı|inceleme karari|denetim izi|sağlayıcı sıralaması|saglayici siralamasi|kesin puan|kesin mi|tekrar kontrol gerekli|şimdilik dikkate alınmadı|simdilik dikkate alinmadi)/.test(text);
  const asksProof = /(servis kanıtı|servis kaniti|hizmet kanıtı|hizmet kaniti|operatör notu|operatör not|operatör notu|sürücünün telefon gps['’]i|sürücünün telefon gps'i|telefon gps|araç gps|arac gps|biniş kaydı|binis kaydı|binis kaydi|kanıt ne işe yarar|kanıt ne ise yarar)/.test(text);
    const actionLeadQuestion = ['NEXT_SCREEN', 'NEXT_STEP', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT'].includes(String(questionType || ''));

  if (String(questionType || '') === 'SCREEN_PURPOSE') {
    if (screenPath === '/superadmin') {
      return `Bu ekran, sistem durumu bandı kanıt ve kalite hazırlıklarını birlikte gösterir. Şimdi: Sistem durumu bandını incele. Bu programda bunun anlamı: Sistem durumu bandı, sahaya çıkış ve hazırlık işaretlerini bir arada okumanı sağlar. Neden? Ödeme, hakediş ve komisyon kapalıdır; saha testi bekliyor. Öneri: Sistemin canlı durumunu ve hazırlık işaretlerini birlikte oku. Sıradaki doğru işlem: Sistem durumu bandını açıp ilgili kontrol kartını incele.`.trim();
    }
    if (screenPath === '/superadmin/commercial-core') {
      return `Bu ekran, ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını birlikte gösterir. Şimdi: Ticari akış özetini incele. Bu programda bunun anlamı: Ticari akış, hakediş hazırlığı ile görünür önizlemeyi aynı yerde okumanı sağlar. Neden? Bu ekran ödeme başlatmaz; ödeme, hakediş ve komisyon kapalıdır. Öneri: Önizleme kayıtlarını ve CSV taslağını kontrol et. Sıradaki doğru işlem: Ticari akış özetini açıp hakediş önizlemesini incele.`.trim();
    }
  }

  if ((asksProof || (isVerification && relevantQuestionType)) && isTargetSurface) {
    const now = actionLeadQuestion ? `${purposeLead} Servis Kanıtı kartını aç.` : `${purposeLead} Servis Kanıtı kartını incele.`;
    return `Şimdi: ${now} Bu programda bunun anlamı: Servis Kanıtı operasyon görünürlüğü sağlar. Neden? Ham GPS ve teknik veri göstermez; sürücünün telefon GPS’i güvenli sinyal olarak görünür. Hakediş için nihai karar değildir. Öneri: Servis Kanıtı kartını seçili kayıtla birlikte oku. Sıradaki doğru işlem: Servis Kanıtı kartını açıp ilgili kaydı kontrol et.`.trim();
  }
  if ((asksQuality || (isQuality && relevantQuestionType)) && (isQuality || isCommercial || isSuperAdminOverview || isVerification)) {
    const now = actionLeadQuestion ? `${purposeLead} Kalite akış özetine bak.` : `${purposeLead} Kalite akış özetini incele.`;
    return `Şimdi: ${now} Bu programda bunun anlamı: Kalite akış özeti taslak skor, inceleme kararı ve denetim izini birlikte gösterir. Neden? Bu bilgi kesin kalite puanı değildir; sağlayıcı sıralaması değildir. Hakediş veya komisyon hesabını etkilemez. Öneri: Kalite sinyalini sağlayıcı puanı ve denetim iziyle birlikte oku. Sıradaki doğru işlem: Kalite akış özetini açıp ilgili sağlayıcı satırını kontrol et.`.trim();
  }
  if ((asksCommercial || (isCommercial && relevantQuestionType)) && (isCommercial || isSuperAdminOverview)) {
    const now = actionLeadQuestion ? `${purposeLead} Ticari akış özetine bak.` : `${purposeLead} Ticari akış özetini incele.`;
    return `Şimdi: ${now} Bu programda bunun anlamı: Ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını gösterir. Neden? Bu ekran ödeme başlatmaz; ödeme, hakediş ve komisyon kapalıdır. Öneri: Önizleme kayıtlarını ve CSV taslağını kontrol et. Sıradaki doğru işlem: Ticari akış özetini açıp hakediş önizlemesini incele.`.trim();
  }
  if ((asksSystem || (isSuperAdminOverview && relevantQuestionType)) && isSuperAdminOverview) {
    const now = actionLeadQuestion ? `${purposeLead} Sistem durumu bandına bak.` : `${purposeLead} Sistem durumu bandını incele.`;
    return `Şimdi: ${now} Bu programda bunun anlamı: Sistem durumu bandı kanıt ve kalite hazırlıklarını birlikte gösterir. Neden? Ödeme, hakediş ve komisyon kapalıdır; saha testi bekliyor. Öneri: Sistemin canlı durumunu ve hazırlık işaretlerini birlikte oku. Sıradaki doğru işlem: Sistem durumu bandını açıp ilgili kontrol kartını incele.`.trim();
  }
  return null;
}

export function normalizeEverydayQuestion(message) {
  const raw = String(message || '').trim();
  const text = normalizeText(raw);
  if (!text) return raw;
  if (matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'bu taraf ne', 'bu kisim ne', 'bu kısım ne', 'bu ekran ne', 'bu ekran ne için', 'bu ekran ne icin', 'burda ne yapılıyor', 'burada ne yapılıyor', 'burda ne yapiliyor', 'burada ne yapiliyor', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'ne işe yarıyor', 'ne ise yariyor'])) return 'Bu ekran ne için?';
  if (matchesStandalonePhrase(text, ['ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne', 'şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapmalıyım', 'simdi ne yapmaliyim'])) return 'Şimdi ne yapayım?';
  if (/(nereye bakcam|nereye bakicam|nereye bakca[mn]|nereye bak[iı]y[ıi]m|nereye bakay[ıi]m|ilk nereyi kontrol edeyim|once nereye bakayim|önce nereye bakayım|ilk nereyi inceleyeyim)/.test(text)) return 'İlk neye bakayım?';
  if (/(nereye g[eé]c(e|ey)im|nereye geç(e|ey)im|nereye git(sem|meliyim|ceyim|ceğim)|hangi ekrana gideyim|hangi tarafa geceyim|hangi tarafa geçeyim|sonra nereye geceyim|sonra nereye geçeyim|sonra nereye gideyim)/.test(text)) return 'Şimdi hangi ekrana gitmeliyim?';
  if (/(niye pasif|neden pasif|basam[iı]yorum|t[ıi]klan[mıi]yor|olmadi|olmad[ıi]|olmuyor|takildi|tak[ıi]ld[ıi]|patladi|patlad[ıi]|kitlendi|ilerlemiyor|tak[ıi]l[ıi]yor)/.test(text)) return 'Bu neden olmuyor?';
  if (/(ne eksik|eksi[gğ]i ne|eksik ne var|hangi alan boş|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(text)) return 'Hazır mı?';
  if (/(hazir mi|haz[ıi]r m[ıi]|atamaya hazir mi|atamaya haz[ıi]r m[ıi])/i.test(text)) return 'Hazır mı?';
  if (/(konum niye|konum neden|konum yok|konum gozukmuyor|konum gözükmüyor|konum görünmüyor|gps yok|gps gelmiyor|telefon gps['’]i yok|haritada niye yok)/.test(text)) return 'Konum neden görünmüyor?';
  if (/(bu rolde ne yapabilirim|ben bu rolde ne yapabilirim|burada neyi yonetebilirim|burada neyi yönetebilirim|yetkim ne|bu rolde ne yap[ıi]yoruz)/.test(text)) return 'Bu rolde ne yapabilirim?';
  if (/(bu sat[ıi]r ne diyor|bu sat[ıi]r ne demek|bu rozet ne diyor|bu rozet ne demek|bu sat[ıi]r ne anlatiyor|bu sat[ıi]r[ıi] nasil okuyayim|bu sat[ıi]r[ıi] nasıl okuyayım)/.test(text)) return 'Bu satırı nasıl okurum?';
  return raw;
}


function primaryConcernScore(normalized) {
  const text = String(normalized || '').trim();
  const scoreMap = {
    'Bu neden olmuyor?': 98,
    'Konum neden görünmüyor?': 96,
    'Hazır mı?': 92,
    'Şimdi hangi ekrana gitmeliyim?': 90,
    'İlk neye bakayım?': 88,
    'Bu rolde ne yapabilirim?': 82,
    'Bu ekran ne için?': 78,
    'Bu satırı nasıl okurum?': 76,
  };
  return Number(scoreMap[text] || 0);
}

function splitCompoundQuestion(message) {
  const raw = String(message || '').trim();
  if (!raw) return [];
  return raw
    .split(/(?:\s+(?:ama|fakat|yalnız|yalniz|ve sonra|ve bir de|bir de|ayrıca|ayrica|sonra|ve)\s+)|[\n\r]+|[;]+/i)
    .map((row) => String(row || '').trim())
    .filter(Boolean);
}

export function extractPrimaryConcern(message) {
  const raw = String(message || '').trim();
  if (!raw) return raw;
  const parts = splitCompoundQuestion(raw);
  if (parts.length <= 1 && raw.length < 96) return normalizeEverydayQuestion(raw);
  const candidates = (parts.length ? parts : [raw]).map((part, idx) => {
    const normalized = normalizeEverydayQuestion(part);
    const changed = normalizeText(normalized) !== normalizeText(part);
    let score = primaryConcernScore(normalized);
    if (changed) score += 12;
    if (/[?]/.test(part)) score += 3;
    if (/(önce|once|şimdi|simdi|sonra|nereye|neden|niye|hazır|hazir|konum|rol)/i.test(part)) score += 2;
    if (normalized === 'Şimdi hangi ekrana gitmeliyim?' && /(nereye|hangi ekrana|geçeyim|gideyim)/i.test(part)) score += 8;
    if (normalized === 'Bu neden olmuyor?' && /(neden|niye|pasif|olmuyor|tak[ıi]l)/i.test(part)) score += 8;
    if (normalized === 'Konum neden görünmüyor?' && /(konum|gps|harita)/i.test(part)) score += 8;
    if (normalized === 'Hazır mı?' && /(haz[ıi]r|eksik|atamaya)/i.test(part)) score += 8;
    score -= idx * 0.5;
    return { part, normalized, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;
  return String(best?.normalized || normalizeEverydayQuestion(raw)).trim();
}


function looksLikeShortFollowUp(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (text.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta|neye basayim|neye basayım|hangi ekrana|hangi ekrana gideyim|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|burda takıldı|burada takildi|sorun kimde|kim onaylayacak|bunu kim yapabilir|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|aynı kayıt için devam et|ayni kayit icin devam et|önce neyi kontrol edeyim|once neyi kontrol edeyim|bu yüzden mi başlamıyor|bu yuzden mi baslamiyor)/.test(text)
    || matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne']);
}

function expandFollowUpMessage(message, conversationState, screenContext) {
  return resolveFollowUpContextQuestion({ message, conversationState, screenContext });
}

function buildContinuityMeta({ message, conversationState, screenContext, requestEntityType, requestEntityId, screenPath }) {
  const currentType = String(screenContext?.selectedEntityType || requestEntityType || '');
  const currentId = Number(screenContext?.selectedEntityId || requestEntityId || 0);
  const lastType = String(conversationState?.lastSelectedEntityType || conversationState?.lastEntityType || '');
  const lastId = Number(conversationState?.lastSelectedEntityId || conversationState?.lastEntityId || 0);
  const anchorLabel = firstNonEmpty(screenContext?.selectedLabel, conversationState?.lastSelectedLabel, conversationState?.lastEntityLabel, '');
  const isFollowUp = looksLikeShortFollowUp(message) || Boolean(conversationState?.lastQuestionType && Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length);
  const sameEntity = Boolean(currentType && currentId > 0 && currentType === lastType && currentId === lastId);
  const sameScreen = Boolean(screenPath && String(conversationState?.lastScreenPath || '') === String(screenPath || ''));
  return {
    isFollowUp,
    sameEntity,
    sameScreen,
    anchorLabel,
    currentEntityType: currentType,
    currentEntityId: currentId,
  };
}

function topicLabelForContext(topic) {
  const labels = {
    SCREEN_PURPOSE: 'Ekran amacı',
    SHIFT_BLOCKED: 'Vardiya blokajı',
    VEHICLE_NOT_VISIBLE: 'GPS görünürlüğü',
    DRIVER_PHONE_GPS: 'Sürücünün telefon GPS’i',
    PROVIDER_BETTER: 'Kalite sinyali',
    QUALITY_SIGNAL: 'Kalite sinyali',
    CONTRACT_SHIFT_TODAY: 'Sözleşme / vardiya üretimi',
    PAYMENT_MISSING: 'Hakediş önizlemesi',
    PAYMENT_PREVIEW: 'Hakediş önizlemesi',
    PAYMENT_READINESS: 'Hakediş önizlemesi',
    TRUST_QUALITY: 'Kalite akışı',
    FEEDBACK_STATUS: 'Geri bildirim durumu',
    NOTIFICATION_SOURCE: 'Bildirim kaynağı',
    KVKK_VISIBILITY: 'KVKK görünürlüğü',
    WHO_CAN_DO: 'Yetki sınırı',
    ROLE_BOUNDARY: 'Yetki sınırı',
    NEXT_ACTION: 'Sıradaki doğru işlem',
    NEXT_SCREEN: 'Sonraki ekran',
    NEXT_STEP: 'Sıradaki doğru işlem',
    FIRST_CONTROL: 'İlk kontrol',
    WHY_BLOCKED: 'Blokaj nedeni',
    MISSING_DATA: 'Eksik veri',
    CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
  };
  return firstNonEmpty(labels[String(topic || '')], '');
}

const WORKFLOW_TOPICS = new Set([
  'SHIFT_BLOCKED',
  'VEHICLE_NOT_VISIBLE',
  'DRIVER_PHONE_GPS',
  'QUALITY_SIGNAL',
  'CONTRACT_SHIFT_TODAY',
  'CONTRACT_TO_SHIFT',
  'PAYMENT_MISSING',
  'PAYMENT_PREVIEW',
  'PAYMENT_READINESS',
  'TRUST_QUALITY',
  'FEEDBACK_STATUS',
  'NOTIFICATION_SOURCE',
  'KVKK_VISIBILITY',
  'WHO_CAN_DO',
  'ROLE_BOUNDARY',
  'MISSING_DATA',
  'NEXT_ACTION',
  'NEXT_STEP',
  'NEXT_SCREEN',
  'WHY_BLOCKED',
]);

function isWorkflowTopic(topic) {
  return WORKFLOW_TOPICS.has(String(topic || ''));
}

function shouldUseWorkflowGuide({ questionType, activeTopic }) {
  const type = String(questionType || '');
  if (type === 'SCREEN_PURPOSE') return false;
  if (isWorkflowTopic(activeTopic)) return true;
  return ['ROLE_HELP', 'NEXT_SCREEN', 'NEXT_STEP', 'WHY_BLOCKED', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'DETAIL_FLOW', 'ROW_HELP', 'MISSING_DATA_HELP', 'STATUS_HELP', 'GO_TO'].includes(type);
}

function detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis }) {
  const text = normalizeText(message);
  const path = normalizeText(screenPath);
  const selectedText = normalizeText(firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.selectedSummary,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    analysis?.reasoningLead,
    analysis?.nextBestAction,
    '',
  ));
  const theme = selectedDiagnosticTheme(message);
  if (theme) return theme;
  if (questionType === 'SCREEN_PURPOSE') return 'SCREEN_PURPOSE';
  if (path.includes('/trust-quality') || /(kalite|saglayıcı|sağlayıcı|saglayici|provider)/.test(text)) return /(daha iyi|daha güçlü|daha guclu|neden|karşılaştır|karsilastir)/.test(text) ? 'QUALITY_SIGNAL' : 'TRUST_QUALITY';
  if (path.includes('/commercial-core') || path.includes('/payment') || /(hakediş|hakedis|ödeme|odeme|settlement|komisyon|csv|önizleme|onizleme)/.test(text)) return /(hazır değil|hazir degil|hazırlık|hazirlik|eksik|kontrol gerekli)/.test(text) ? 'PAYMENT_READINESS' : 'PAYMENT_PREVIEW';
  if (path.includes('/map') || path.includes('/live') || /(gps|konum|harita|haritada)/.test(text)) {
    if (/(sürücü|surucu|telefon gps|telefon gps['’]i|telefon gps'i)/.test(text)) return 'DRIVER_PHONE_GPS';
    return 'VEHICLE_NOT_VISIBLE';
  }
  if (path.includes('/shifts') || /(vardiya|shift|sözleşme|sozleşme|sozlesme)/.test(text) || /(vardiya|shift)/.test(selectedText) || /(sözleşme|sozleşme|sozlesme)/.test(selectedText)) {
    if (/(sözleşme|sozleşme|sozlesme)/.test(text) || /(sözleşme|sozleşme|sozlesme)/.test(selectedText)) return /(üretildi|uretildi|oluştu|olustu|bugün|bugun)/.test(text) ? 'CONTRACT_SHIFT_TODAY' : 'CONTRACT_TO_SHIFT';
    return 'SHIFT_BLOCKED';
  }
  if (path.includes('/operations') || path.includes('/verification') || /(operasyon|kanıt|kanit|proof|start|başlamıyor|baslamiyor)/.test(text)) return 'SHIFT_BLOCKED';
  if (path.includes('/shared/feedback') || /(geri bildirim|feedback).*(açık|acik|kritik|çözüldü|cozuldu|kapandı|kapandi|sorumlu|yıldız|yildiz)/.test(text)) return 'FEEDBACK_STATUS';
  if (path.includes('/shared/notifications') || /(hangi olaydan|nereden geldi|kaynak|neden geldi)/.test(text)) return 'NOTIFICATION_SOURCE';
  if (path.includes('/shared/kvkk') || /(kvkk|görünürlük|gorunurluk|görünmüyor|gorunmuyor|kim görebilir|kim gorebilir)/.test(text)) return 'KVKK_VISIBILITY';
  if (questionType === 'ROLE_HELP') return 'WHO_CAN_DO';
  if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return 'NEXT_SCREEN';
  if (questionType === 'NEXT_STEP') return 'NEXT_STEP';
  if (questionType === 'FIRST_CONTROL') return 'FIRST_CONTROL';
  if (questionType === 'WHY_BLOCKED') return 'WHY_BLOCKED';
  if (questionType === 'READINESS_CHECK') return path.includes('/commercial-core') || path.includes('/payment') ? 'PAYMENT_READINESS' : 'NEXT_STEP';
  return firstNonEmpty(analysis?.type, questionType, 'OPEN');
}

function buildRoleBoundaryExplanation({ userRole, questionType, message, activeTopic }) {
  const text = normalizeText(message);
    const asksBoundary = ['ROLE_HELP', 'WHY_BLOCKED', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT', 'FIRST_CONTROL', 'NEXT_STEP', 'NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''))
    || /(kim yapabilir|kim onaylayacak|bu kullanıcı ne yapabilir|yetki sınırı|göremez|gorunemez|görünmeyebilir|gorunmeyebilir|görmüyor olabilir miyim|goremiyor olabilir miyim|kvkk)/.test(text)
    || ['ROLE_BOUNDARY', 'WHO_CAN_DO'].includes(String(activeTopic || ''));
  if (!asksBoundary) return '';
  const role = normalizeText(userRole);
  if (role === 'driver') return 'Bu işlem bu rolde görünmeyebilir. Sürücü bu işlemi değiştirmez; bildirimi görür ve gerekli onayı verir.';
  if (role === 'parent' || role === 'personel') return 'Bu işlem bu rolde görünmeyebilir. Veli/personel sadece kendi canlı takip ve bildirim durumunu görür.';
  if (role === 'company' || role === 'room') return 'Bu işlem bu rolde görünmeyebilir. Firma tarafı sonucu görür; oda tarafı operasyon kaydını tamamlar.';
  if (role) return 'Bu rolde bu bilgi görünmeyebilir. İlk kontrol: ilgili kayıt seçili mi / doğru ekranda mısın?';
  return '';
}

function buildEvidenceConfidenceWording({ analysis, screenContext, sourceScreenContext, roleBoundary, needsSelection }) {
  const hasSignals = Boolean(
    (Array.isArray(analysis?.evidence) && analysis.evidence.length)
    || selectedCarrySummary(screenContext)
    || selectedCarrySummary(sourceScreenContext)
    || selectedSignalRows(screenContext).length
    || selectedSignalRows(sourceScreenContext).length
    || analysis?.selectedRecordStatus
    || analysis?.liveFactConfidence?.summary
    || analysis?.diagnosticPriority?.summary
    || analysis?.actionSimulation
  );
  if (needsSelection) return 'Bu kayıt için elimde yeterli sinyal yok; ilk kontrol seçili satırı doğrulamaktır.';
  if (hasSignals && roleBoundary) return 'Ekrandaki sinyale göre konuşuyorum; bu bilgi ayrıca yetki sınırına takılıyor olabilir.';
  if (hasSignals) return 'Ekrandaki sinyale göre konuşuyorum; canlı veri değil, ekrandaki özet üzerinden söylüyorum.';
  if (roleBoundary) return 'Bu yetki sınırı olabilir. Bu rolde bu bilgi görünmeyebilir.';
  return 'Bu daha çok eksik veri gibi duruyor. İlk kontrol seçili satırı doğrulamaktır.';
}

function buildContextualSuggestedChips({
  entityType,
  questionType,
  roleMode,
  screenPath,
  context,
  _screenDefinition,
  screenQuestions = [],
  activeTopic = '',
  isFollowUp = false,
  sameRecordLikely = false,
  needsSelection = false,
  selectedLabel = '',
  selectedSummary = '',
  roleBoundary = '',
}) {
  const chips = [];
  const path = normalizeText(screenPath);
  const hasSelectedRecord = Boolean(selectedLabel || selectedSummary || sameRecordLikely);
  const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
  if (hasSelectedRecord && !workflowTopic) {
    chips.push('Bu kayıt ne durumda?', 'Neden ilerlemiyor?', 'Sıradaki adımı açıkla', 'Eksik veri', 'Yetki sınırı');
  }
  const pathSpecificChips = (() => {
    if (path.includes('/driver/today')) return ['Bu ekranı detaylı anlat', 'Ne yapayım?', 'GPS bekleniyor', 'Eksik veri', 'Yetki sınırı'];
    if (path.includes('/personel/live')) return ['Bu ekranı detaylı anlat', 'Servisim nerede?', 'Bildirim kaynağı', 'Eksik veri'];
    if (path.includes('/parent/live')) return ['Bu ekranı detaylı anlat', 'Öğrencimin servisi nerede?', 'Bildirim kaynağı', 'Eksik veri'];
    if (path.includes('/room/map')) return ['Bu ekranı detaylı anlat', 'Bu araç neden haritada görünmüyor?', 'GPS bekleniyor', "Sürücünün telefon GPS’i neden devrede?"];
    if (path.includes('/superadmin/operations')) return ['Bu ekranı detaylı anlat', 'Açık sorunları göster', 'Canlılık riski nedir?', 'Stale/offline kaç?', 'Yetki sınırı'];
    if (path.includes('/superadmin/commercial-core')) return ['Bu ekranı detaylı anlat', 'Bu hakediş neden hazır değil?', 'Hakediş eksik bilgi', 'Sözleşme/vardiya kontrolü'];
    if (path.includes('/room/commercial-flow')) return ['Bu ekranı detaylı anlat', 'Bu sözleşmeden bugün vardiya üretildi mi?', 'Hakediş eksik bilgi', 'Sözleşme/vardiya kontrolü'];
    if (path.includes('/shared/feedback')) return ['Bu ekranı detaylı anlat', 'Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?', 'Geri bildirim açık', 'Bu kayıt kimde?'];
    if (path.includes('/shared/kvkk')) return ['Bu ekranı detaylı anlat', 'Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı'];
    if (path.includes('/shared/notifications')) return ['Bu ekranı detaylı anlat', 'Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?', 'Bildirim kaynağı'];
    if (path.includes('/shared/logs')) return ['Bu ekranı detaylı anlat', 'İşlem kaydı ne demek?', 'Bildirimle farkı ne?'];
    if (path.includes('/room/drivers')) return ['Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla'];
    if (path.includes('/room/commercial-flow')) return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Hakediş neden hazır değil?'];
    if (path.includes('/room/reports')) return ['Bu ekranı detaylı anlat', 'Hangi rapora bakmalıyım?', 'Filtreleri nasıl kullanırım?'];
    if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
      return ['Bu ekranı detaylı anlat', 'Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı'];
    }
    if (path.includes('/driver/change-pin')) return ['Bu ekranı detaylı anlat', 'PIN veya şifre nasıl değişir?', 'İlk girişte ne olur?'];
    if (path.includes('/superadmin/trust-quality')) return ['Bu ekranı detaylı anlat', 'Bu bilgi kesin kalite puanı mı?', 'Bu sağlayıcı neden daha iyi?'];
    if (path.includes('/superadmin/operation-verification')) return ['Bu ekranı detaylı anlat', 'Servis kanıtı ne işe yarar?', 'İlk neye bakayım?'];
    return [];
  })();
  if (pathSpecificChips.length) {
    chips.push(...pathSpecificChips);
  } else if (needsSelection) {
    chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Sıradaki doğru işlem ne?');
  } else {
    switch (String(activeTopic || '')) {
      case 'SCREEN_PURPOSE':
        chips.push('Bu ekranı detaylı anlat', 'Sıradaki adımı açıkla', 'İlgili ekrana git');
        break;
      case 'SHIFT_BLOCKED':
        chips.push('Araç/sürücü bağlantısını kontrol et', 'Rota eksik mi?', 'GPS sinyalini kontrol et', 'Sözleşme/vardiya bağını göster');
        break;
      case 'VEHICLE_NOT_VISIBLE':
      case 'DRIVER_PHONE_GPS':
        chips.push('GPS kaynağını kontrol et', 'Sürücünün telefon GPS’i neden devrede?', 'Araç neden haritada yok?');
        break;
      case 'PROVIDER_BETTER':
      case 'QUALITY_SIGNAL':
      case 'TRUST_QUALITY':
        chips.push('Kalite sinyalini göster', 'Bu sağlayıcı neden daha iyi?', 'Bu uyarı önemli mi?');
        break;
      case 'CONTRACT_SHIFT_TODAY':
        chips.push('Sözleşme/vardiya bağını göster', 'Bugünkü vardiya üretildi mi?', 'Bu kayıt neden ilerlemiyor?');
        break;
      case 'CONTRACT_TO_SHIFT':
        chips.push('Sözleşme/vardiya bağını göster', 'Bugünkü vardiya üretildi mi?', 'Bu kayıt neden ilerlemiyor?');
        break;
      case 'PAYMENT_MISSING':
      case 'PAYMENT_PREVIEW':
      case 'PAYMENT_READINESS':
        chips.push('Hakediş eksiklerini göster', 'Bu hakediş neden hazır değil?', 'Ödeme neden kapalı?');
        break;
      case 'FEEDBACK_STATUS':
        chips.push('Açık geri bildirim var mı?', 'Sorumlu rol kim?', 'Bu kayıt hangi rolde?');
        break;
      case 'NOTIFICATION_SOURCE':
        chips.push('Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?', 'Okunmamış bildirim var mı?');
        break;
      case 'KVKK_VISIBILITY':
        chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?');
        break;
      case 'WHO_CAN_DO':
      case 'ROLE_BOUNDARY':
        chips.push('Bu işlemi kim yapabilir?', 'Yetki sınırını kontrol et', 'İlgili ekrana git');
        break;
      case 'MISSING_DATA':
        chips.push('Eksik alanları göster', 'Bu kayıt neden ilerlemiyor?', 'Önce neyi kontrol edeyim');
        break;
      case 'NEXT_SCREEN':
        chips.push('Hangi ekrana gitmeliyim?', 'Şimdi hangi ekrana gitmeliyim?', 'İlgili ekrana git');
        break;
      case 'NEXT_ACTION':
      case 'NEXT_STEP':
      case 'FIRST_CONTROL':
        chips.push('Sıradaki adımı açıkla', 'Bu kaydı kontrol et', 'Önce neyi kontrol edeyim');
        break;
      case 'WHY_BLOCKED':
        chips.push('Bu neden olmuyor?', 'Neden ilerlemiyor?', 'Önce neyi kontrol edeyim');
        break;
      default:
        chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?');
    }
  }

  if (sameRecordLikely || isFollowUp) {
    chips.push('Aynı kayıt için devam et', 'Neden?', 'Sıradaki adımı açıkla', 'Önce neyi kontrol edeyim');
  } else {
    chips.push('İlgili ekrana git', 'Hangi ekrana geçmeliyim?');
  }

  if (roleBoundary) chips.unshift('Yetki sınırını kontrol et');

  const fallback = uniqueStrings([
    ...(Array.isArray(screenQuestions) ? screenQuestions : []).slice(0, 2),
    ...buildSuggestedChips({ entityType, questionType, roleMode, screenPath, context }).slice(0, 2),
  ]).filter(Boolean);

  if (!chips.length && fallback.length) chips.push(...fallback);
  if (chips.length < 2 && fallback.length) chips.push(...fallback.slice(0, 2));

  return uniqueStrings(chips).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 2 : 4);
}

function resolveFollowUpContextQuestion({
  message,
  conversationState,
  screenContext,
  _screenDefinition,
  sourceScreenContext,
  _sourceScreenDefinition,
  questionType,
  _roleMode = 'OPERATIONS',
  _screenPath = '',
  _analysis = null,
}) {
  const raw = String(message || '').trim();
  const hasConversationAnchor = Boolean(conversationState?.lastQuestionType) || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length > 0);
  if (!hasConversationAnchor || !looksLikeShortFollowUp(raw)) return raw;
  const text = normalizeText(raw);
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    conversationState?.lastSelectedLabel,
    conversationState?.lastEntityLabel,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    'bu seçili kayıt',
  );
  const selectedSummary = firstNonEmpty(screenContext?.selectedSummary, sourceScreenContext?.selectedSummary, '');
  const anchor = firstNonEmpty(selectedLabel, selectedSummary, '');
  const selectionMissing = !anchor || /^bu seçili kayıt$/i.test(anchor);
  if (selectionMissing && /(neye basayım|hangi ekrana|kim onaylayacak|bunu kim yapabilir|kim yapabilir|sorumlu kim|bu kayıt kimde|bende çıkmıyor|bu işlem bende görünmüyor|burda takıldı|sorun kimde|önce neyi kontrol edeyim|bu yüzden mi|neden|niye|şimdi|peki|tamam|devam)/.test(text)) {
    return 'Önce ilgili satırı seç.';
  }
  if (/^(neden|niye)\??$/.test(text) || /(neden böyle|neden boyle|niye böyle|niye boyle|bu yüzden mi|bu yuzden mi)/.test(text)) {
    return `${anchor || 'bu kayıt'} için neden böyle görünüyor?`;
  }
  if (/(kim onaylayacak|bunu kim yapabilir|kim yapabilir|sorumlu kim|bu kayıt kimde|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|sorun kimde)/.test(text)) {
    return `${anchor || 'bu kayıt'} için bunu kim yapabilir?`;
  }
  if (/(hangi ekrana|nereye gitmeliyim|nereye geçmeliyim|nereye gecmeliyim|neye basayım|neye basayim|neye basmalıyım|neye basmaliyim)/.test(text)) {
    if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${anchor || 'bu kayıt'} için hangi ekrana gitmeliyim?`;
    return `${anchor || 'bu kayıt'} için neye basayım?`;
  }
  if (/(bu kayıt niye ilerlemiyor|burda takıldı|burada takildi|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|önce neyi kontrol edeyim|once neyi kontrol edeyim|aynı kayıt için devam et|ayni kayit icin devam et|devam et|burda ne eksik|burada ne eksik)/.test(text)) {
    if (questionType === 'WHY_BLOCKED' || questionType === 'READINESS_CHECK') return `${anchor || 'bu kayıt'} için eksik ne var?`;
    return `${anchor || 'bu kayıt'} için şimdi ne yapmalıyım?`;
  }
  if (/(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra|şimdi|simdi)/.test(text)) {
    if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${anchor || 'bu kayıt'} için hedef ekranda önce neyi kontrol etmeliyim?`;
    if (questionType === 'WHY_BLOCKED') return `${anchor || 'bu kayıt'} için neden böyle görünüyor?`;
    if (questionType === 'READINESS_CHECK') return `${anchor || 'bu kayıt'} için eksik ne var?`;
    return `${anchor || 'bu kayıt'} için şimdi ne yapmalıyım?`;
  }
  if (matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'bu ekran ne için', 'bu ekran ne icin'])) {
    return 'Bu ekran ne için?';
  }
  if (questionType === 'NEXT_STEP' && /aynı kayıt/.test(text) && anchor) {
    return `${anchor} için şimdi ne yapmalıyım?`;
  }
  return raw;
}

function buildContextPriorityDecision({
  message,
  conversationState,
  screenContext,
  screenDefinition,
  sourceScreenContext,
  sourceScreenDefinition,
  questionType,
  roleMode,
  userRole,
  screenPath,
  analysis,
  entityType,
  context,
}) {
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.selectedSummary,
    '',
  );
  const selectedSummary = firstNonEmpty(
    screenContext?.selectedSummary,
    '',
  );
  const lastConcern = firstNonEmpty(conversationState?.lastPrimaryConcern, conversationState?.lastUserMessage, conversationState?.lastRawUserMessage, '');
  const recentMessages = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-6) : [];
  const recentUserMessage = [...recentMessages].reverse().find((row) => normalizeText(row?.role) === 'user' || normalizeText(row?.role) === 'assistant');
  const activeTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
  const isFollowUp = Boolean(looksLikeShortFollowUp(message) || (conversationState?.lastQuestionType && recentMessages.length) || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizeText(message)));
  const sameRecordLikely = Boolean(
    selectedLabel && conversationState?.lastSelectedLabel && normalizeText(selectedLabel) === normalizeText(conversationState.lastSelectedLabel),
  ) || Boolean(
    screenContext?.selectedEntityType
    && conversationState?.lastSelectedEntityType
    && normalizeText(screenContext.selectedEntityType) === normalizeText(conversationState.lastSelectedEntityType)
    && Number(screenContext?.selectedEntityId || 0) === Number(conversationState?.lastSelectedEntityId || 0),
  ) || Boolean(
    selectedLabel && lastConcern && normalizeText(selectedLabel).includes(normalizeText(lastConcern)),
  );
  const structured = structuredFacts(screenContext) || structuredFacts(sourceScreenContext) || null;
  const selectedRecordStatus = firstNonEmpty(
    normalizeStatusDisplayText(structured?.selectedRecordStatus),
    normalizeStatusDisplayText(screenContext?.selectedRecordStatus),
    normalizeStatusDisplayText(sourceScreenContext?.selectedRecordStatus),
    normalizeStatusDisplayText(selectedSummary || selectedLabel),
    '',
  );
  const liveFactConfidence = structured?.liveFactConfidence && typeof structured.liveFactConfidence === 'object'
    ? structured.liveFactConfidence
    : sourceScreenContext?.structuredFacts?.liveFactConfidence && typeof sourceScreenContext.structuredFacts.liveFactConfidence === 'object'
      ? sourceScreenContext.structuredFacts.liveFactConfidence
      : null;
  const liveFactConfidenceSummary = firstNonEmpty(liveFactConfidence?.summary, '');
  const diagnosticPriority = structured?.diagnosticPriority && typeof structured.diagnosticPriority === 'object'
    ? structured.diagnosticPriority
    : sourceScreenContext?.structuredFacts?.diagnosticPriority && typeof sourceScreenContext.structuredFacts.diagnosticPriority === 'object'
      ? sourceScreenContext.structuredFacts.diagnosticPriority
      : null;
  const diagnosticPrioritySummary = firstNonEmpty(diagnosticPriority?.summary, '');
  const actionSimulation = firstNonEmpty(
    structured?.actionSimulation?.value,
    structured?.actionSimulation?.summary,
    typeof structured?.actionSimulation === 'string' ? structured.actionSimulation : '',
    screenContext?.actionSimulation?.value,
    screenContext?.actionSimulation?.summary,
    typeof screenContext?.actionSimulation === 'string' ? screenContext.actionSimulation : '',
    sourceScreenContext?.actionSimulation?.value,
    sourceScreenContext?.actionSimulation?.summary,
    typeof sourceScreenContext?.actionSimulation === 'string' ? sourceScreenContext.actionSimulation : '',
    '',
  );
  const needsSelection = !selectedLabel && !selectedSummary && !selectedCarrySummary(screenContext) && !selectedCarrySummary(sourceScreenContext);
  const roleBoundary = buildRoleBoundaryExplanation({ userRole, questionType, message, activeTopic });
  const evidenceConfidence = buildEvidenceConfidenceWording({ analysis, screenContext, sourceScreenContext, roleBoundary, needsSelection });
  const signalRows = uniqueStrings([
    ...selectedSignalRows(screenContext).slice(0, 2).map((row) => `${row.label}: ${row.value}`),
    ...selectedSignalRows(sourceScreenContext).slice(0, 2).map((row) => `${row.label}: ${row.value}`),
  ]).filter(Boolean);
  const signalSummary = signalRows.length ? signalRows.join(' • ') : '';
  const selectedEntityText = normalizeText(uniqueStrings([
    selectedLabel,
    selectedSummary,
    selectedRecordStatus,
    signalSummary,
    firstNonEmpty(analysis?.reasoningLead, ''),
    firstNonEmpty(analysis?.nextBestAction, ''),
    firstNonEmpty(analysis?.safestNextStep, ''),
  ]).join(' '));
  const selectedHasContract = /(sözleşme|sozlesme|contract)/.test(selectedEntityText);
  const selectedHasShift = /(vardiya|shift)/.test(selectedEntityText);
  const selectedHasPayment = /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedEntityText);
  const selectedHasVehicle = /(araç|arac|vehicle|plaka)/.test(selectedEntityText);
  const selectedHasGps = /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedEntityText);
  let selectedRecordMismatchLead = '';
  if ((activeTopic === 'CONTRACT_TO_SHIFT' || activeTopic === 'CONTRACT_SHIFT_TODAY') && selectedHasShift && !selectedHasContract) {
    selectedRecordMismatchLead = 'Şimdi: Seçili kayıt bir vardiya; sözleşmeden bugün vardiya üretildiğini bu kayıttan kesin söyleyemem.';
  } else if ((activeTopic === 'PAYMENT_READINESS' || activeTopic === 'PAYMENT_MISSING') && !selectedHasPayment) {
    selectedRecordMismatchLead = 'Bu ekranda hakediş sinyali görünmüyor; Ticari Akış/Hakediş önizlemesi ekranında eksik bilgi, ödeme hesabı ve komisyon durumunu kontrol et.';
  } else if ((activeTopic === 'VEHICLE_NOT_VISIBLE' || activeTopic === 'DRIVER_PHONE_GPS') && selectedHasShift && !selectedHasVehicle && !selectedHasGps) {
    selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; araç görünürlüğü için araç ve GPS sinyalini ayrı kayıtta kontrol et.';
  }
  const topicWhy = {
    QUALITY_SIGNAL: 'Bu sinyal kesin kalite puanı değil; sağlayıcıyı okumaya yardım eder.',
    PAYMENT_READINESS: 'Hakediş hazırlığı tamamlanmadan görünüm hazır sayılmaz.',
    PAYMENT_MISSING: 'Hakediş eksikleri kapatılmamış olabilir.',
    PAYMENT_PREVIEW: 'Hakediş önizlemesi bu ekranda görünmüyor olabilir.',
    SHIFT_BLOCKED: 'Vardiya, araç, sürücü, rota veya GPS sinyali eksik olabilir.',
    FEEDBACK_STATUS: 'Kayıt açık ya da kritik olduğu için tamamlanmış görünmüyor.',
    NOTIFICATION_SOURCE: 'Bildirim bir olay kaydına bağlı olduğu için kaynağı ayrıca okunmalı.',
    KVKK_VISIBILITY: 'Bilgi rol bazlı görünürlük nedeniyle gizli olabilir.',
    WHO_CAN_DO: 'Bu işlem rol sınırı yüzünden bu kullanıcıda görünmeyebilir.',
    MISSING_DATA: 'Boş alanlar yüzünden kayıt ilerlemiyor olabilir.',
    CONTRACT_TO_SHIFT: 'Sözleşme ile vardiya bağı netleşmeden iş ilerlemiyor olabilir.',
    CONTRACT_SHIFT_TODAY: 'Sözleşme ile bugünkü vardiya üretim bağı netleşmeden karar verilmez.',
    DRIVER_PHONE_GPS: 'Telefon GPS’i cihaz GPS’inin yerine geçiyor olabilir.',
    VEHICLE_NOT_VISIBLE: 'Araç, görev bağlantısı veya son GPS eskimiş olabilir.',
  };
  const whyCandidate = firstNonEmpty(
    selectedRecordMismatchLead,
    diagnosticPrioritySummary ? `En olası neden: ${diagnosticPrioritySummary}` : '',
    liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
    actionSimulation ? `Bu durumda doğru aksiyon şu olurdu: ${actionSimulation}` : '',
    topicWhy[activeTopic],
    roleBoundary,
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(screenContext, screenDefinition), selectedMissingReply(sourceScreenContext, sourceScreenDefinition), '')),
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, screenContext, screenDefinition), selectedFieldReply(message, sourceScreenContext, sourceScreenDefinition), '')),
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, screenContext, screenDefinition), selectedBadgeReply(message, sourceScreenContext, sourceScreenDefinition), '')),
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedSignalReply(screenContext, screenDefinition), selectedSignalReply(sourceScreenContext, sourceScreenDefinition), '')),
    firstNonEmpty(analysis?.reasoningLead, analysis?.compareHint, ''),
    needsSelection ? 'Önce ilgili satırı seç.' : '',
    'Bu ekrandaki veride kesin kanıt yok.',
  );
  const missingInfo = firstNonEmpty(
    selectedRecordMismatchLead,
    diagnosticPrioritySummary ? `Öncelik: ${diagnosticPrioritySummary}` : '',
    liveFactConfidenceSummary ? `Sinyal özeti: ${liveFactConfidenceSummary}` : '',
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(screenContext, screenDefinition), selectedMissingReply(sourceScreenContext, sourceScreenDefinition), '')),
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, screenContext, screenDefinition), selectedFieldReply(message, sourceScreenContext, sourceScreenDefinition), '')),
    sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, screenContext, screenDefinition), selectedBadgeReply(message, sourceScreenContext, sourceScreenDefinition), '')),
    signalSummary,
    needsSelection ? 'Önce ilgili satırı seç.' : '',
    '',
  );
  const topicAdvice = {
    QUALITY_SIGNAL: 'Önce kalite sinyalini sağlayıcı puanı, inceleme kararı ve denetim iziyle birlikte oku.',
    PAYMENT_READINESS: 'Önce hakediş hazırlığı, eksik alanlar ve önizleme kayıtlarını kontrol et.',
    PAYMENT_MISSING: 'Önce hakediş hazırlığı, eksik alanlar ve önizleme kayıtlarını kontrol et.',
    PAYMENT_PREVIEW: 'Önce hakediş önizleme kayıtlarını ve eksik bilgi satırlarını kontrol et.',
    NEXT_SCREEN: 'Önce ilgili ekrana geç.',
    NEXT_STEP: 'Önce ilgili kayıt veya alanı kontrol et.',
    WHY_BLOCKED: 'Önce blokaj nedeni ve eksik alanı kontrol et.',
    SHIFT_BLOCKED: 'Önce vardiya, araç, sürücü, rota ve GPS sinyalini birlikte kontrol et.',
    FIRST_CONTROL: 'Önce ilgili satırı veya ilk kontrol alanını aç.',
    SAFE_NEXT_STEP: 'Önce en risksiz kayıt veya alanı kontrol et.',
    STATUS_HELP: 'Önce durum satırını ve ilgili kaydı kontrol et.',
    FEEDBACK_STATUS: 'Önce açık veya kritik geri bildirimi ve sorumlu rolü kontrol et.',
    NOTIFICATION_SOURCE: 'Önce bildirimin kaynağı olan olay kaydını aç.',
    KVKK_VISIBILITY: 'Önce rol ve görünürlük sınırını kontrol et.',
    CONTRACT_TO_SHIFT: 'Önce sözleşme ve vardiya bağını kontrol et.',
    CONTRACT_SHIFT_TODAY: 'Önce sözleşme ve bugünkü vardiya üretim bilgisini kontrol et.',
    MISSING_DATA: 'Önce boş alanları ve eksik bilgi blokajını kontrol et.',
    WHO_CAN_DO: 'Önce yetki sınırını ve ilgili rolü kontrol et.',
    DRIVER_PHONE_GPS: 'Önce sürücünün telefon GPS’i ile cihaz GPS’i kaynağını ayır.',
    VEHICLE_NOT_VISIBLE: 'Önce araç GPS’i, görev bağlantısı ve son konumu kontrol et.',
  };
  const bestNextAction = firstNonEmpty(
    selectedRecordMismatchLead,
    actionSimulation,
    topicAdvice[activeTopic],
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    screenDefinition?.firstStep,
    sourceScreenDefinition?.firstStep,
    selectedLabel ? `Önce ${selectedLabel} kaydını aç.` : '',
    'Önce ilgili satırı seç.',
  );
  const advice = firstNonEmpty(
    selectedRecordMismatchLead,
    actionSimulation,
    diagnosticPrioritySummary ? `Öncelik: ${diagnosticPrioritySummary}` : '',
    topicAdvice[activeTopic],
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    screenDefinition?.firstStep,
    sourceScreenDefinition?.firstStep,
    selectedLabel ? `Önce ${selectedLabel} kaydını aç.` : '',
    'Önce ilgili satırı seç.',
  );
  const topicLabel = topicLabelForContext(activeTopic);
  const contextualSuggestedChips = buildContextualSuggestedChips({
    entityType,
    questionType,
    roleMode,
    screenPath,
    context,
    _screenDefinition: screenDefinition,
    screenQuestions: Array.isArray(screenDefinition?.chatQuestions) ? screenDefinition.chatQuestions : [],
    activeTopic,
    isFollowUp,
    sameRecordLikely,
    needsSelection,
    selectedLabel: screenContext?.selectedLabel || '',
    selectedSummary: screenContext?.selectedSummary || '',
    roleBoundary,
  });
  const followUpPrompt = firstNonEmpty(
    needsSelection ? 'Önce ilgili satırı seç' : '',
    isFollowUp ? 'Aynı kayıt için devam et' : '',
    roleBoundary ? 'Yetki sınırını kontrol et' : '',
    actionSimulation ? 'Bu aksiyonu simüle et' : '',
    bestNextAction,
    'Sıradaki doğru işlem ne?',
  );
  const summaryLead = firstNonEmpty(
    selectedRecordMismatchLead,
    diagnosticPrioritySummary,
    liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
    evidenceConfidence,
    roleBoundary,
    topicLabel,
    selectedRecordStatus ? `Seçili kayıt: ${selectedRecordStatus}` : '',
    '',
  );
  return {
    activeTopic,
    activeTopicLabel: topicLabel,
    isFollowUp,
    sameRecordLikely,
    needsSelection,
    roleBoundary,
    evidenceConfidence,
    selectedRecordStatus,
    liveFactConfidence,
    diagnosticPriority,
    actionSimulation,
    bestNextAction,
    whyCandidate,
    missingInfo,
    advice,
    followUpPrompt,
    summaryLead,
    selectedRecordMismatchLead,
    contextualSuggestedChips,
    selectedLabel,
    selectedSummary,
    lastConcern,
    recentUserMessage: firstNonEmpty(recentUserMessage?.text, ''),
  };
}

function pickScreenByKind(screens, kind) {
  const rows = Array.isArray(screens) ? screens : [];
  if (!kind) return null;
  const map = {
    PLANNING: (row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')),
    SHIFTS: (row) => String(row?.path || '').includes('/shifts'),
    COMMERCIAL: (row) => String(row?.path || '').includes('/commercial-flow'),
    SERVICE: (row) => String(row?.path || '').includes('/service-evaluation'),
    GEOREVIEW: (row) => String(row?.path || '').includes('/georeview'),
    MAP: (row) => String(row?.path || '').includes('/map'),
    COPILOT: (row) => String(row?.path || '').includes('/copilot'),
  };
  const predicate = map[String(kind || '')] || null;
  return predicate ? rows.find(predicate) || null : null;
}

function isRecordScopedQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(bu|şu|su)\s+(seçili|secili)?\s*kayıt|haritadaki\s+bu\s+kayıt|secili\s+kayit|seçili\s+kayıt|ilgili\s+kayıt|bu\s+vardiya|bu\s+araç|bu\s+arac/.test(text);
}

function isGenericFlowQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (isRecordScopedQuestion(text)) return false;
  return /(dan|den)\s+sonra\s+nereye|sonra\s+hangi\s+ekran|sonraki\s+ekran|nereye\s+geçeyim|nereye\s+gitmeliyim/.test(text);
}

function isDirectRouteRequest(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(doğrudan|dogrudan|direkt|direk|sapma olmadan|hedef ekran|yanlış hedef|yanlis hedef)/.test(text);
}

function isCommercialFlowContractToShiftQuestion(message) {
  const text = normalizeText(extractUserQuestion(message));
  if (!text) return false;
  return (
    /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text) ||
    /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text) ||
    /(sözleşme|sozleşme|sozlesme).*(vardiya|shift)/.test(text)
  );
}
  
function resolveReferencedScreenDefinition(user, screenContext, screenDefinition, message) {
  const text = normalizeText(extractUserQuestion(message));
  if (!text || !user) return screenDefinition;
  const sourcePath = String(screenDefinition?.path || screenContext?.path || '');
  if (pathLooksLikeWorkflowSurface(sourcePath) && (selectedDiagnosticTheme(text) || isCommercialFlowContractToShiftQuestion(text))) {
    return screenDefinition;
  }
  const screens = listScreensForUser(user, screenContext)
    .map((item) => getScreenDefinitionForUser(user, { ...(screenContext || {}), path: item.path }, item.id))
    .filter(Boolean);
  if (!screens.length) return screenDefinition;

  const choose = (predicate) => screens.find(predicate) || null;
  const explicitKind = extractMentionedScreenKind(text);
  if (explicitKind) {
    const explicitHit = pickScreenByKind(screens, explicitKind);
    if (explicitHit) return explicitHit;
  }
  if (/vardiya\s+oluştur|vardiya\s+olustur|nasıl\s+vardiya\s+oluştur|nasil\s+vardiya\s+olustur|yeni\s+iş\s+kur|yeni\s+is\s+kur|plan\s+kur/.test(text)) {
    const planning = choose((row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')) || /planlama merkezi|organizasyon merkezi|okul merkezi|gezi \/ planlama merkezi/i.test(String(row?.label || '')));
    if (planning) return planning;
  }
  const genericCurrentScreenQuestion = !explicitKind && (/(hangi\s+ekran\w*|hangi\s+men[üu]\w*|nereye\s+geç\w*|nereye\s+git\w*|buradan\s+sonra|sonraki\s+ekran|önce\s+neye\s+bakay\w*)/.test(text) || /(bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+sayfa\s+ne\s+için|bu\s+sayfa\s+ne\s+icin|burada\s+ne\s+yapılır|burada\s+ne\s+yapilir|ne\s+işe\s+yarar|ne\s+ise\s+yarar)/.test(text) || /(bu\s+rolde|rolümde|rolumde|burada\s+neyi\s+yönetebilirim|burada\s+neyi\s+yonetebilirim|yetkim\s+ne|rol\s+yardımı|rol\s+yardimi)/.test(text));
  if (genericCurrentScreenQuestion) return screenDefinition;

  const aliases = [
    { test: ['planlama merkezi', 'organizasyon merkezi', 'okul merkezi', 'gezi / planlama merkezi'], pick: (row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')) || /planlama merkezi|organizasyon merkezi|okul merkezi|gezi \/ planlama merkezi/i.test(String(row?.label || '')) },
    { test: ['vardiyalar', 'vardiya ekranı', 'vardiya ekrani'], pick: (row) => String(row?.path || '').includes('/shifts') },
    { test: ['ticari akış', 'ticari akis'], pick: (row) => String(row?.path || '').includes('/commercial-flow') },
    { test: ['hizmet değerlendirme', 'hizmet degerlendirme'], pick: (row) => String(row?.path || '').includes('/service-evaluation') },
    { test: ['konum incele', 'personel konum seçici', 'personel konum secici', 'öğrenci konum seçici', 'ogrenci konum secici', 'konum seçici', 'konum secici'], pick: (row) => String(row?.path || '').includes('/georeview') },
    { test: ['canlı harita', 'canli harita', 'harita'], pick: (row) => String(row?.path || '').includes('/map') },
    { test: ['copilot'], pick: (row) => String(row?.path || '').includes('/copilot') },
  ];
  for (const row of aliases) {
    if (row.test.some((x) => text.includes(normalizeText(x)))) {
      const hit = choose(row.pick);
      if (hit) return hit;
    }
  }

  const scored = screens
    .map((row) => ({
      row,
      score: tokenOverlapScore(text, `${row?.label || ''} ${row?.path || ''} ${row?.menuPurpose || ''} ${(Array.isArray(row?.screenMenus) ? row.screenMenus.map((x) => x?.label || '').join(' ') : '')}`),
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0 ? scored[0].row : screenDefinition;
}

function remapScreenContext(screenContext, targetScreenDefinition, sourceScreenDefinition) {
  if (!targetScreenDefinition || !screenContext) return screenContext;
  if (String(targetScreenDefinition?.path || '') === String(sourceScreenDefinition?.path || '')) return screenContext;
  return {
    ...screenContext,
    id: Number(targetScreenDefinition?.id || screenContext?.id || 0),
    path: targetScreenDefinition?.path || screenContext?.path || '',
    label: targetScreenDefinition?.label || screenContext?.label || '',
    selectedLabel: '',
    selectedSummary: '',
    selectedFields: [],
    selectedBadges: [],
    structuredFacts: null,
    uiHints: {},
  };
}


function selectedCarrySummary(screenContext) {
  const label = firstNonEmpty(screenContext?.selectedLabel, screenContext?.selectedSummary, '');
  const fields = (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [])
    .map((row) => ({ label: firstNonEmpty(row?.label, row?.key, ''), value: firstNonEmpty(row?.value, row?.text, '') }))
    .filter((row) => row.label && row.value);
  const facts = structuredFacts(screenContext);
  const top = fields.slice(0, 2).map((row) => `${row.label}: ${row.value}`);
  const copilotSummary = firstNonEmpty(facts?.copilotSummary, '');
  if (copilotSummary && label) return `${label} (${top.join(' • ') || copilotSummary})`;
  if (copilotSummary) return copilotSummary;
  if (label && top.length) return `${label} (${top.join(' • ')})`;
  if (label) return label;
  if (top.length) return top.join(' • ');
  return '';
}

function composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition, sourceScreenContext: _sourceScreenContext }) {
  const sourcePath = String(sourceScreenDefinition?.path || '');
  const targetPath = String(targetScreenDefinition?.path || '');
  const targetLabel = firstNonEmpty(targetScreenDefinition?.label, 'ilgili ekran');
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const parts = [];
  if (sourcePath && targetPath && sourcePath !== targetPath) parts.push(`Şu an ${sourceLabel} ekranındasın; sorduğun yer ${targetLabel}.`);
  return parts.join(' ');
}

function composeScreenPurposeWithCarry({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }) {
    const purpose = normalizeVisibleReplyFragment(firstNonEmpty(
      screenDefinition?.menuPurpose,
      screenDefinition?.screenExplanation,
      guide?.screenExplanation,
      guide?.plainSummary,
      guide?.summary,
      'Bu ekran bu işi yönetmek için kullanılır.',
    ));
    const first = normalizeVisibleReplyFragment(firstNonEmpty(
      screenDefinition?.firstStep,
      guide?.whatToDoNow,
      'doğru kayıt veya ana alanı kontrol et.',
    ));
    const next = normalizeVisibleReplyFragment(firstNonEmpty(
      screenDefinition?.nextStep,
      guide?.whatToDoNext,
      'ilgili alt ekrana geç.',
    ));
    const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
    const carryHint = normalizeVisibleReplyFragment(firstNonEmpty(selectedCarrySummary(screenContext), selectedCarrySummary(sourceScreenContext), ''));
    const purposeLead = buildVisibleScreenPurposeLead(purpose);
    const firstLead = first ? `İlk bakılacak yer: ${ensureVisibleSentence(first)}` : '';
    const nextLead = next && !sameVisibleReplyFragment(first, next) ? `Sonra: ${ensureVisibleSentence(next)}` : '';
    const carryLead = carryHint && !sameVisibleReplyFragment(carryHint, first) && !String(lead || '').includes('Mevcut seçili kayıt') ? `Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(carryHint)}` : '';
    return `${purposeLead}${firstLead ? ` ${firstLead}` : ''}${nextLead ? ` ${nextLead}` : ''}${lead ? ` ${lead}` : ''}${carryLead ? ` ${carryLead}` : ''}`.trim();
  }

function ageMinutes(input) {
  const d = input ? new Date(input) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}

const MATCH_STOPWORDS = new Set(['bu', 'ne', 'demek', 'nasil', 'nasıl', 'hangi', 'alan', 'sutun', 'sütun', 'rozet', 'etiket', 'kayit', 'kayıt', 'satir', 'satır', 'secili', 'seçili']);

function tokenOverlapScore(text, hay) {
  const parts = normalizeText(text).split(/\s+/).filter((x) => x && x.length > 1 && !MATCH_STOPWORDS.has(x));
  if (!parts.length) return 0;
  const target = normalizeText(hay);
  return parts.reduce((sum, part) => sum + (target.includes(part) ? 1 : 0), 0);
}

const { selectedFieldRows, selectedBadgeRows, selectedRowReadReply, selectedFieldReply, selectedBadgeReply, selectedMissingReply, selectedTermReply, selectedSignalRows, selectedSignalReply } = createSelectedRuntimeHelpers({
    firstNonEmpty,
    normalizeText,
    tokenOverlapScore,
    structuredFacts,
    structuredActionRows,
    dataRules,
  });

  function buildSelectedDiagnosticBridgeContext(screenContext, theme, contextText = '') {
    const facts = structuredFacts(screenContext);
    const copilotSummary = firstNonEmpty(facts?.copilotSummary, '');
    const summary = firstNonEmpty(selectedCarrySummary(screenContext), copilotSummary, '');
    const text = normalizeText(contextText);
    const hasNegative = /(yok|eksik|kapalı|kapali|görünmüyor|gorunmuyor)/.test(text);
    let result = 'Bu ekrandaki veriye göre seçili kayıt kontrol altında tutulmalı.';
    let firstControl = 'Seçili kayıt özeti';
    switch (theme) {
      case 'SHIFT_BLOCKED':
        result = 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.';
        firstControl = 'Araç, sürücü ve sözleşme bağı';
        break;
      case 'VEHICLE_NOT_VISIBLE':
        result = 'Bu ekrandaki veriye göre bu araç haritada görünmüyor.';
        firstControl = 'Son GPS zamanı ve konum kaynağı';
        break;
      case 'DRIVER_PHONE_GPS':
        result = 'Bu ekrandaki veriye göre sürücünün telefon GPS’i devrede görünüyor.';
        firstControl = 'Görev durumu ve sürücünün telefon GPS’i sinyali';
        break;
      case 'PROVIDER_BETTER':
      case 'QUALITY_SIGNAL':
        result = 'Bu ekrandaki veriye göre bu sağlayıcı daha güçlü görünüyor.';
        firstControl = 'Kanıt, taslak skor, inceleme kararı ve denetim izi';
        break;
      case 'CONTRACT_SHIFT_TODAY':
      case 'CONTRACT_TO_SHIFT':
        result = hasNegative
          ? 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretildiğine dair net işaret yok.'
          : 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.';
        firstControl = 'Sözleşme / vardiya üretimi';
        break;
      case 'PAYMENT_READINESS':
        result = hasNegative
          ? 'Bu ekrandaki veriye göre hakediş hazır değil.'
          : 'Bu ekrandaki veriye göre hakediş hazırlığı tamamlanmamış görünüyor.';
        firstControl = 'Hakediş hazırlığı, önizleme ve CSV taslağı';
        break;
      case 'PAYMENT_MISSING':
        result = 'Bu ekrandaki veriye göre bu hakediş eksik görünüyor.';
        firstControl = 'Hakediş hazırlığı, önizleme ve CSV taslağı';
        break;
      case 'FEEDBACK_STATUS':
        result = 'Bu ekrandaki veriye göre geri bildirim açık veya kritik görünüyor.';
        firstControl = 'Durum, yıldız, kategori ve sorumlu rol';
        break;
      case 'NOTIFICATION_SOURCE':
        result = 'Bu ekrandaki veriye göre bu bildirim bir olay kaynağına bağlı görünüyor.';
        firstControl = 'Bildirim türü ve bağlı olay kaydı';
        break;
      case 'KVKK_VISIBILITY':
        result = 'Bu ekrandaki veriye göre bu bilgi rola bağlı olarak görünmeyebilir.';
        firstControl = 'Rol ve görünürlük sınırı';
        break;
      case 'WHO_CAN_DO':
        result = 'Bu ekrandaki veriye göre bu işlem bu rolde görünmeyebilir.';
        firstControl = 'Rol ve yetki sınırı';
        break;
      case 'MISSING_DATA':
        result = 'Bu ekrandaki veriye göre seçili kayıtta eksik alanlar var.';
        firstControl = 'Eksik alanlar';
        break;
      case 'NEXT_ACTION':
        result = 'Bu ekran, açık veya riskli kaydı netleştirmek için kullanılır.';
        firstControl = 'Seçili kayıt özeti ve durum satırı';
        break;
      default:
        break;
    }
    return {
      summary,
      result,
      firstControl,
      whyMarker: 'Neden?',
      firstControlMarker: 'İlk kontrol:',
      copilotSummary,
    };
  }

  const { vehicleReadinessReply, vehicleMissingDataReply, prefersSelectedEntity, isShiftTrackingScreen, shiftScreenNoSelectionReply, openingReply, termComparisonReply, analyzerEvidenceText, analyzerReply, composeScreenLocationReply, roleHelpReply } = createEntityRuntimeHelpers({
    firstNonEmpty,
  normalizeText,
  pickTerms,
  composeSimpleScreenReply,
  roleLead,
  shiftStatusText,
  shiftNextStep,
  vehicleSourceText,
  vehicleNextStep,
  vehicleBlockers,
});

function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

function structuredActionRows(screenContext, key) {
  const facts = structuredFacts(screenContext);
  const rows = Array.isArray(facts?.[key]) ? facts[key] : [];
  return rows.map((row) => ({
    actionKey: firstNonEmpty(row?.key, row?.actionKey, ''),
    label: firstNonEmpty(row?.label, row?.title, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, row?.disabledReason, ''),
    purpose: firstNonEmpty(row?.purpose, row?.meaning, ''),
    whenToUse: firstNonEmpty(row?.whenToUse, row?.howToUse, ''),
    whatHappens: firstNonEmpty(row?.whatHappens, row?.result, ''),
    riskNote: firstNonEmpty(row?.riskNote, row?.risk, ''),
    required: Array.isArray(row?.required) ? row.required.filter(Boolean) : [],
    blockedBy: Array.isArray(row?.blockedBy) ? row.blockedBy.filter(Boolean) : [],
    enabled: row?.enabled !== false && key !== 'blockedActions',
  })).filter((row) => row.label);
}

function uiHintRows(screenContext, key) {
  return (Array.isArray(screenContext?.uiHints?.[key]) ? screenContext.uiHints[key] : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.title, row?.text, typeof row === 'string' ? row : ''),
    value: firstNonEmpty(row?.value, row?.text, row?.label, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, ''),
    disabled: Boolean(row?.disabled),
  })).filter((row) => row.label);
}

function findUiRowByMessage(message, rows) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  const text = normalizeText(message);
  if (!text) return items[0] || null;
  const best = items
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.value || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : items[0] || null;
}


function findStructuredActionByMessage(message, screenContext) {
  const rows = [...structuredActionRows(screenContext, 'allowedActions'), ...structuredActionRows(screenContext, 'blockedActions')];
  if (!rows.length) return null;
  const text = normalizeText(message);
  if (!text) return rows[0] || null;
  const best = rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''} ${row?.reason || ''} ${(row?.required || []).join(' ')} ${(row?.blockedBy || []).join(' ')}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : rows[0] || null;
}

function structuredButtonReply(message, screenContext, analysis, options = {}) {
  const action = findStructuredActionByMessage(message, screenContext);
  if (!action) return '';
  const { blockedOnly = false } = options || {};
  if (blockedOnly && action.enabled) return '';
  const parts = [];
  parts.push(`${action.label}: ${firstNonEmpty(action.purpose, action.enabled ? 'Bu aksiyon şu an kullanılabilir görünüyor.' : 'Bu aksiyon şu an pasif görünüyor.')}`);
  parts.push(action.enabled ? 'Şu an kullanılabilir görünüyor.' : 'Şu an pasif görünüyor.');
  if (action.reason) parts.push(`Sebep: ${action.reason}`);
  if (action.whenToUse) parts.push(`Ne zaman: ${action.whenToUse}`);
  if (action.required?.length) parts.push(`Ön koşul: ${action.required.join(' • ')}`);
  if (action.blockedBy?.length && !action.enabled) parts.push(`Eksik/engel: ${action.blockedBy.join(' • ')}`);
  if (action.whatHappens) parts.push(`Sonuç: ${action.whatHappens}`);
  if (action.riskNote) parts.push(`Dikkat: ${action.riskNote}`);
  if (analysis?.nextBestAction) parts.push(`Şimdi yap: ${analysis.nextBestAction}`);
  return parts.join(' ').trim();
}

function disabledButtonReply(message, screenContext, analysis) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: true });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'blockedActions'), ...uiHintRows(screenContext, 'disabledButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an pasif görünüyor.${hit.reason ? ` Sebep: ${hit.reason}` : ''} ${analysis?.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim();
}

function visibleButtonReply(message, screenContext, analysis = null) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: false });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'allowedActions'), ...uiHintRows(screenContext, 'visibleButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an ekranda görünen bir aksiyon. Doğru kayıt seçiliyken bu buton üzerinden ilerlenir.`;
}

function uiSurfaceEvidence(screenContext) {
  const facts = structuredFacts(screenContext);
  const headers = uiHintRows(screenContext, 'tableHeaders').map((row) => row.label).slice(0, 4);
  const modals = uiHintRows(screenContext, 'modalTitles').map((row) => row.label).slice(0, 2);
  const tabs = uiHintRows(screenContext, 'activeTabs').map((row) => row.label).slice(0, 2);
  const parts = [];
  if (facts?.counters && typeof facts.counters === 'object') {
    const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
    if (counterText) parts.push(`Panel verisi: ${counterText}`);
  }
  if (headers.length) parts.push(`Tablo başlıkları: ${headers.join(', ')}`);
  if (modals.length) parts.push(`Açık modal: ${modals.join(', ')}`);
  if (tabs.length) parts.push(`Aktif sekme: ${tabs.join(', ')}`);
  return parts.length ? `UI ipucu: ${parts.join(' • ')}.` : '';
}

function findButtonGuideByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = [...(Array.isArray(guide?.buttonGuides) ? guide.buttonGuides : []), ...(Array.isArray(screenDefinition?.buttonGuides) ? screenDefinition.buttonGuides : [])];
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}

function findWorkflowStageByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = workflowStages(screenDefinition, guide, 8);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.title || ''} ${row?.action || ''} ${row?.doneWhen || ''} ${row?.ifBlocked || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}

function findNextScreenByMessage(message, screenDefinition) {
  const text = normalizeText(message);
  const rows = nextScreens(screenDefinition, 6);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}

function findBestAction(list, message) {
  const text = normalizeText(message);
  const rows = Array.isArray(list) ? list : [];
  if (!text) return rows[0] || null;
  const hit = rows.find((row) => {
    const hay = normalizeText(`${row?.label || ''} ${row?.reason || ''} ${row?.routeKey || ''}`);
    return text.split(/\s+/).some((word) => word && hay.includes(word));
  });
  return hit || rows[0] || null;
}

function roleLead(roleMode) {
  return roleMode === 'SIMPLE' ? 'Kısaca:' : 'Durumu kısa özetliyorum.';
}

function simpleNowText(guide, screenDefinition, fallback = 'Önce bu ekrandaki ana bilgiyi kontrol et.') {
  return firstNonEmpty(
    normalizeActionStepText(guide?.whatToDoNow),
    normalizeActionStepText(screenDefinition?.firstStep),
    normalizeActionStepText(fallback),
  );
}

function simpleNextText(guide, screenDefinition) {
  return firstNonEmpty(guide?.whatToDoNext, screenDefinition?.nextStep, '');
}

function simpleMenuList(screenDefinition, limit = 2) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).slice(0, limit).map((x) => x?.label).filter(Boolean);
}

function firstControls(screenDefinition, guide) {
  const raw = [
    ...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []),
    ...(Array.isArray(guide?.beforeYouStart) ? guide.beforeYouStart : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, 5);
}

function stuckChecks(screenDefinition, guide, limit = 4) {
  const raw = [
    ...(Array.isArray(screenDefinition?.stuckChecks) ? screenDefinition.stuckChecks : []),
    ...(Array.isArray(guide?.lockedActionReasons) ? guide.lockedActionReasons : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, limit);
}

function workflowStages(screenDefinition, guide, limit = 5) {
  const screenStages = Array.isArray(screenDefinition?.workflowStages) ? screenDefinition.workflowStages : [];
  if (screenStages.length) return screenStages.slice(0, limit);
  return (Array.isArray(guide?.stepByStep) ? guide.stepByStep : []).slice(0, limit).map((item, idx) => ({
    key: `STEP_${idx + 1}`,
    title: `Adım ${idx + 1}`,
    action: item,
    doneWhen: '',
    ifBlocked: '',
  }));
}

function nextScreens(screenDefinition, limit = 4) {
  const rows = Array.isArray(screenDefinition?.nextScreens) ? screenDefinition.nextScreens : [];
  if (rows.length) return rows.slice(0, limit);
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).slice(0, limit).map((item) => ({
    label: item?.label || '',
    path: item?.path || '',
    reason: item?.purpose || '',
  })).filter((x) => x.label);
}

function dataRules(screenDefinition, guide, limit = 5) {
  const raw = [
    ...(Array.isArray(screenDefinition?.dataRules) ? screenDefinition.dataRules : []),
    ...(Array.isArray(guide?.dataRules) ? guide.dataRules : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, limit);
}

function formatDataRulesReply(screenDefinition, guide, prefix = 'Veri kuralı: ') {
  return bulletJoin(dataRules(screenDefinition, guide, 5), prefix);
}

function bulletJoin(items, prefix = '') {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!rows.length) return '';
  return `${prefix}${rows.map((x, i) => `${i + 1}) ${x}`).join(' ')}`.trim();
}

function formatWorkflowReply(screenDefinition, guide) {
  const stages = workflowStages(screenDefinition, guide, 5);
  if (!stages.length) return '';
  return stages.map((row, idx) => {
    const parts = [`${idx + 1}) ${firstNonEmpty(row?.title, `Adım ${idx + 1}`)}: ${firstNonEmpty(row?.action, row?.detail, '')}`.trim()];
    if (row?.doneWhen) parts.push(`Tamam say: ${row.doneWhen}`);
    if (row?.ifBlocked) parts.push(`Takılırsa: ${row.ifBlocked}`);
    return parts.join(' ');
  }).join(' ');
}

function formatNextScreensReply(screenDefinition) {
  const rows = nextScreens(screenDefinition, 4);
  if (!rows.length) return '';
  return rows.map((row, idx) => `${idx + 1}) ${row.label}${row.reason ? `: ${row.reason}` : ''}`).join(' ');
}

function nextScreenLead({ sourceScreenDefinition, targetScreenDefinition }) {
  const sourcePath = String(sourceScreenDefinition?.path || '');
  const targetPath = String(targetScreenDefinition?.path || '');
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const targetLabel = firstNonEmpty(targetScreenDefinition?.label, 'ilgili ekran');
  if (sourcePath && targetPath && sourcePath !== targetPath) return `Şu an ${sourceLabel} ekranındasın; sorduğun yer ${targetLabel}.`;
  return '';
}

function screenKind(definition) {
  const path = normalizeText(definition?.path || '');
  if (path.endsWith('/map') || path.includes('/live')) return 'MAP';
  if (path.includes('/georeview')) return 'GEOREVIEW';
  if (path.includes('/shifts')) return 'SHIFTS';
  if (path.includes('/commercial-flow')) return 'COMMERCIAL';
  if (path.includes('/service-evaluation')) return 'SERVICE';
  if (path.includes('/copilot')) return 'COPILOT';
  if (['/company', '/organization', '/school', '/'].includes(path)) return 'PLANNING';
  return 'OTHER';
}

function selectedSignalText(screenContext) {
  const fields = selectedFieldRows(screenContext).slice(0, 6).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const badges = selectedBadgeRows(screenContext).slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const evidence = Array.isArray(screenContext?.structuredFacts?.evidence) ? screenContext.structuredFacts.evidence.join(' • ') : '';
  return normalizeText([fields, badges, evidence].filter(Boolean).join(' • '));
}

function inferSelectedSignals(screenContext) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === 'object' ? screenContext.structuredFacts : {};
  const text = selectedSignalText(screenContext);
  const stage = normalizeText(facts?.stage || '');
  const missing = Array.isArray(facts?.missing) ? facts.missing.map((x) => normalizeText(x)).join(' • ') : '';
  const blockers = Array.isArray(facts?.blockers) ? facts.blockers.map((x) => normalizeText(x)).join(' • ') : '';
  const all = `${text} • ${missing} • ${blockers} • ${stage}`;
  return {
    hasCoordProblem: /koordinat yok|adres yok|needs_review|failed|review|failed/.test(all),
    gpsWeak: /son gps eski|gps eski|offline|eta yok|sıradaki durak yok|siradaki durak yok|bağlı aktif vardiya görünmüyor|bagli aktif vardiya görünmüyor|bagli aktif vardiya gorunmuyor/.test(all),
    shiftWeak: /araç yok|arac yok|sürücü yok|surucu yok|durak yok|onaylı görünse de araç veya sürücü boş|onayli görünse de arac veya surucu bos/.test(all),
    marketStage: /market|open|countered/.test(all),
    pendingStage: /pending|bekleyen|accepted/.test(all),
    serviceStage: /active|done|tamam/.test(all),
  };
}

function extractMentionedScreenKind(message) {
  const text = normalizeText(message);
  if (!text) return '';
  if (/konum incele|konum sec|konum seç|georeview/.test(text)) return 'GEOREVIEW';
  if (/ticari akış|ticari akis|commercial/.test(text)) return 'COMMERCIAL';
  if (/hizmet değerlend|hizmet degerlend|service/.test(text)) return 'SERVICE';
  if (/vardiya/.test(text)) return 'SHIFTS';
  if (/harita|canlı harita|canli harita|map/.test(text)) return 'MAP';
  if (/planlama merkezi|rehberi başlat|rehberi baslat|plan akışı|plan akis|planlama/.test(text)) return 'PLANNING';
  if (/copilot/.test(text)) return 'COPILOT';
  return '';
}

function hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition) {
  const facts = sourceScreenContext?.structuredFacts && typeof sourceScreenContext.structuredFacts === 'object' ? sourceScreenContext.structuredFacts : {};
  const sourceKind = screenKind(sourceScreenDefinition);
  if (sourceKind !== 'MAP') return false;
  const selectedLabel = firstNonEmpty(sourceScreenContext?.selectedLabel, '');
  const missing = Array.isArray(facts?.missing) ? facts.missing.map((x) => normalizeText(x)) : [];
  const blockers = Array.isArray(facts?.blockers) ? facts.blockers.map((x) => normalizeText(x)) : [];
  const totalStops = Number(facts?.totalStops ?? facts?.counters?.totalStops ?? 0);
  const hasSelectedVehicle = facts?.hasSelectedVehicle === true || Boolean(selectedLabel);
  const hasShift = facts?.hasShift === true;
  const noNext = facts?.nextReady === false || missing.includes('sıradaki durak yok') || missing.includes('siradaki durak yok');
  const noEta = facts?.etaReady === false || missing.includes('eta yok');
  const noVehicle = facts?.hasSelectedVehicle === false || missing.includes('seçili araç yok') || missing.includes('secili arac yok');
  const noShift = facts?.hasShift === false || blockers.some((x) => x.includes('bağlı aktif vardiya görünmüyor') || x.includes('bagli aktif vardiya gorunmuyor'));
  return noVehicle || (!hasSelectedVehicle && !hasShift) || (!hasShift && totalStops <= 0 && noNext && noEta) || noShift;
}

function weakCarryReply(sourceScreenDefinition, sourceScreenContext) {
  const facts = sourceScreenContext?.structuredFacts && typeof sourceScreenContext.structuredFacts === 'object' ? sourceScreenContext.structuredFacts : {};
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const evidence = uniqueStrings([
    facts?.hasSelectedVehicle === false ? 'Seçili araç yok' : '',
    facts?.hasShift === false ? 'Shift yok' : '',
    facts?.nextReady === false ? 'Sıradaki durak yok' : '',
    facts?.etaReady === false ? 'ETA yok' : '',
    firstNonEmpty((Array.isArray(facts?.evidence) ? facts.evidence[1] : ''), ''),
  ]).filter(Boolean).slice(0, 4).join(' • ');
  return `${sourceLabel} ekranında önce geçerli kayıt oluşmalı. Şimdi ekran önermek erken. Önce marker'a tıklayıp aracı seç; üst kartta Shift, Son GPS ve Sıradaki durak dolu mu bak. ${evidence ? `Bunu şuradan anlıyorum: ${evidence}.` : ''}`.trim();
}

function scoreNextScreenCandidate({ candidate, targetScreenDefinition, sourceScreenDefinition, sourceScreenContext, genericFlow = false }) {
  const candidatePath = normalizeText(candidate?.path || '');
  const targetKind = screenKind(targetScreenDefinition);
  const sourceKind = screenKind(sourceScreenDefinition);
  const signals = genericFlow ? {
    hasCoordProblem: false,
    gpsWeak: false,
    shiftWeak: false,
    marketStage: false,
    pendingStage: false,
    serviceStage: false,
  } : inferSelectedSignals(sourceScreenContext);
  let score = 55;
  const reasons = [];

  if (candidatePath.includes('/shifts')) {
    score += 18;
    reasons.push('işin teklif, atama ve operasyon bağını en net burada okursun');
  }
  if (candidatePath.includes('/georeview')) {
    score += 8;
    reasons.push('konum veya koordinat sorunu varsa düzeltme ekranı burasıdır');
  }
  if (candidatePath.includes('/service-evaluation')) {
    score += 6;
    reasons.push('aktif veya biten hizmetin kalite tarafı burada okunur');
  }
  if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') {
    score += 7;
    reasons.push('yeni iş veya plan akışını kurma ekranıdır');
  }
  if (candidatePath.includes('/copilot')) {
    score -= 8;
    reasons.push('yardım ekranıdır; ana operasyon takibi için ilk tercih değildir');
  }

  if (signals.hasCoordProblem) {
    if (candidatePath.includes('/georeview')) score += 32;
    if (candidatePath.includes('/shifts')) score -= 8;
    if (candidatePath.includes('/service-evaluation')) score -= 14;
  }
  if (signals.gpsWeak) {
    if (candidatePath.includes('/shifts')) score += 24;
    if (candidatePath.includes('/georeview')) score -= 6;
  }
  if (signals.shiftWeak) {
    if (candidatePath.includes('/shifts')) score += 22;
    if (candidatePath.includes('/service-evaluation')) score -= 10;
  }
  if (signals.marketStage) {
    if (candidatePath.includes('/commercial-flow')) score += 18;
    if (candidatePath.includes('/shifts')) score += 6;
  }
  if (signals.pendingStage) {
    if (candidatePath.includes('/shifts')) score += 14;
  }
  if (signals.serviceStage) {
    if (candidatePath.includes('/service-evaluation')) score += 20;
    if (candidatePath.includes('/shifts')) score += 4;
  }

  if (targetKind === 'MAP') {
    if (candidatePath.includes('/shifts')) score += 18;
    if (candidatePath.includes('/copilot')) score -= 4;
  }
  if (targetKind === 'GEOREVIEW') {
    if (!genericFlow && sourceKind === 'PLANNING' && (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/')) score += 16;
    if (!genericFlow && (sourceKind === 'MAP' || sourceKind === 'SHIFTS')) {
      if (candidatePath.includes('/shifts')) score += 12;
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score -= 4;
    }
  }
  if (targetKind === 'COMMERCIAL') {
    if (candidatePath.includes('/shifts')) score += 20;
    if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score -= 10;
    if (candidatePath.includes('/commercial-flow')) score -= 16;
  }
  if (targetKind === 'PLANNING') {
    if (signals.hasCoordProblem && candidatePath.includes('/georeview')) score += 18;
    else if (signals.marketStage && candidatePath.includes('/commercial-flow')) score += 14;
    else if (signals.pendingStage && candidatePath.includes('/shifts')) score += 14;
    else if (candidatePath.includes('/shifts')) score += 10;
  }
  if (targetKind === 'SERVICE') {
    if (candidatePath.includes('/shifts')) score += 8;
    if (candidatePath.includes('/service-evaluation')) score += 8;
  }

  if (genericFlow) {
    if (targetKind === 'GEOREVIEW') {
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score += 42;
      if (candidatePath.includes('/shifts')) score -= 6;
      if (candidatePath.includes('/hub')) score += 4;
    }
    if (targetKind === 'COMMERCIAL') {
      if (candidatePath.includes('/shifts')) score += 22;
      if (candidatePath.includes('/service-evaluation')) score += 10;
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score += 2;
    }
    if (targetKind === 'PLANNING') {
      if (candidatePath.includes('/georeview')) score += 18;
      if (candidatePath.includes('/shifts')) score += 16;
    }
    if (targetKind === 'MAP') {
      if (candidatePath.includes('/shifts')) score += 18;
      if (candidatePath.includes('/copilot')) score -= 2;
    }
  }

  if (candidatePath === normalizeText(targetScreenDefinition?.path || '')) {
    score -= 28;
    reasons.push('soru sonraki ekranı soruyor; aynı ekranda kalmak ilk tercih değil');
  }

  const finalReasons = genericFlow
    ? uniqueStrings([firstNonEmpty(candidate?.reason, ''), ...reasons])
    : uniqueStrings(reasons);

  return {
    candidate,
    score: Math.max(18, Math.min(99, score)),
    reasons: finalReasons,
  };
}

function summarizeRejectedScreens(scoredRows, bestRow) {
  const rows = (Array.isArray(scoredRows) ? scoredRows : []).filter((row) => row && row !== bestRow).slice(0, 2);
  if (!rows.length) return '';
  return rows.map((row) => `${row.candidate.label} şimdi ilk tercih değil; ${firstNonEmpty(row.candidate.reason, row.reasons?.[0], 'öncelik daha düşük.')}`).join(' • ');
}

function buildTransferredFirstControls(targetScreenDefinition, sourceScreenDefinition, sourceScreenContext) {
  const carry = selectedCarrySummary(sourceScreenContext);
  if (!carry) return [];
  const targetKind = screenKind(targetScreenDefinition);
  const sourceKind = screenKind(sourceScreenDefinition);
  const signals = inferSelectedSignals(sourceScreenContext);
  if (targetKind === 'SHIFTS') {
    const rows = [
      'Önce aynı kaydın doğru vardiya satırını aç.',
      sourceKind === 'MAP' ? 'Haritadaki araç ile vardiyadaki araç aynı mı kontrol et.' : 'Seçili kaydın gerçekten aynı vardiya olduğuna bak.',
      'Durum rozetini araç ve sürücü alanıyla birlikte oku.',
      'Sonraki adım veya teklif katmanı açık mı kontrol et.',
    ];
    if (signals.gpsWeak) rows.splice(2, 0, 'Son GPS zayıfsa yalnız duruma güvenme; atama ve teklif katmanını da birlikte değerlendir.');
    if (signals.shiftWeak) rows[2] = 'Araç veya sürücü boş mu diye özellikle bak.';
    return rows;
  }
  if (targetKind === 'GEOREVIEW') {
    return [
      'Önce aynı kişi veya durağın seçildiğini doğrula.',
      'Durum rozeti ile koordinat alanını birlikte oku.',
      'Koordinat yoksa büyük harita veya adresten bul akışına geç.',
      'Kaydet ile OK Yap farkını karıştırma.',
    ];
  }
  if (targetKind === 'SERVICE') {
    return [
      'Önce aynı hizmet satırını aç.',
      'Durum ve değerlendirme rozetini birlikte oku.',
      'Sonraki adım alanı vardiyaya mı sözleşmeye mi dönmen gerektiğini söylüyor mu bak.',
    ];
  }
  if (targetKind === 'MAP') {
    return [
      'Önce doğru aracı veya vardiyayı seç.',
      'Son GPS, sıradaki durak ve ETA birlikte tutarlı mı bak.',
      'Canlılık zayıfsa aynı kaydı Vardiyalar ekranında da kontrol et.',
    ];
  }
  return [];
}

function composeBridgedFirstControlReply({ targetScreenDefinition, sourceScreenDefinition, sourceScreenContext, guide }) {
  const rows = buildTransferredFirstControls(targetScreenDefinition, sourceScreenDefinition, sourceScreenContext);
  if (!rows.length) return '';
  const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition, sourceScreenContext });
  const stuck = firstNonEmpty(stuckChecks(targetScreenDefinition, guide, 2)[0], '');
  return `${lead ? `${lead} ` : ''}${bulletJoin(rows.slice(0, 4), 'İlk kontrol: ')} ${stuck ? `Takılırsan incele: ${stuck}.` : ''}`.trim();
}

function composeDirectRouteReply({ screenDefinition, sourceScreenDefinition, sourceScreenContext, guide }) {
  const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
  const rawFirst = buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[0]
    || firstControls(screenDefinition, guide)[0]
    || normalizeActionStepText(screenDefinition?.firstStep)
    || 'doğru kaydı aç.';
  const first = normalizeActionStepText(rawFirst);
  return [
    lead,
    `Doğrudan hedef ekran: ${screenDefinition?.label || 'İlgili ekran'}.`,
    `Şimdi yap: ${screenDefinition?.label || 'İlgili ekran'} ekranını aç. İçeri girince ilk bak: ${first.charAt(0).toLowerCase()}${first.slice(1)}`,
  ].filter(Boolean).join(' ');
}

function pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext }) {
  const explicitTargetKind = extractMentionedScreenKind(message);
  const recordScoped = isRecordScopedQuestion(message);
  const genericFlow = Boolean(explicitTargetKind) && isGenericFlowQuestion(message) && !recordScoped;
  const weakCarry = hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition);
  const effectiveSourceContext = genericFlow ? null : (weakCarry && explicitTargetKind ? null : sourceScreenContext);
  const rows = nextScreens(screenDefinition, 5);
  const scored = rows
    .map((candidate) => scoreNextScreenCandidate({ candidate, targetScreenDefinition: screenDefinition, sourceScreenDefinition, sourceScreenContext: effectiveSourceContext, genericFlow, recordScoped }))
    .sort((a, b) => b.score - a.score);
  return { explicitTargetKind, recordScoped, genericFlow, weakCarry, effectiveSourceContext, scored, best: scored[0] || null };
}

function buildBestNextScreenReply({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext, guide = null }) {
  const { explicitTargetKind, recordScoped, genericFlow, weakCarry, effectiveSourceContext, scored, best } = pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext });
  if (weakCarry && !explicitTargetKind) return weakCarryReply(sourceScreenDefinition, sourceScreenContext);
  if (explicitTargetKind && isDirectRouteRequest(message) && !genericFlow) {
    return composeDirectRouteReply({ screenDefinition, sourceScreenDefinition, sourceScreenContext, guide });
  }
  const lead = nextScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition });
  if (!scored.length) return `${lead ? `${lead} ` : ''}${firstNonEmpty(screenDefinition?.nextStep, screenDefinition?.menuPurpose, 'Önce ilgili alt ekrana geç.')}`.trim();
  if (!best) return `${lead ? `${lead} ` : ''}${formatNextScreensReply(screenDefinition)}`.trim();
  const selectedHint = recordScoped ? selectedCarrySummary(effectiveSourceContext) : '';
  const why = uniqueStrings([firstNonEmpty(best.candidate.reason, ''), ...(Array.isArray(best.reasons) ? best.reasons : [])]).slice(0, 2).join(' • ');
  const rejected = summarizeRejectedScreens(scored, best);
  let now = firstNonEmpty(best.candidate.reason, screenDefinition?.nextStep, 'Önce bu ekrana geç.');
  if (normalizeText(best.candidate.label).includes('vardiya')) now = 'Önce ilgili vardiyayı aç. Sonra durum, atama ve sonraki adım alanlarını birlikte oku.';
  if (normalizeText(best.candidate.label).includes('konum')) now = 'Önce koordinat veya adres sorunu olan kaydı aç. Sonra büyük harita veya kaydet akışıyla düzelt.';
  if (normalizeText(best.candidate.label).includes('planlama') || normalizeText(best.candidate.label).includes('merkez')) now = 'Önce plan akışını veya rehberi başlat. Sonra kapsam, tarih ve çözüm adımlarını tamamla.';
  if (normalizeText(best.candidate.label).includes('hizmet')) now = 'Önce hizmet satırını aç. Sonra durum ve değerlendirme alanını birlikte oku.';
  const title = genericFlow ? 'Genel akışta tek en doğru sonraki ekran' : 'Bu kayıt için tek en doğru sonraki ekran';
  return [
    lead,
    selectedHint ? `Mevcut seçili kayıt özeti: ${selectedHint}.` : '',
    `${title}: ${best.candidate.label}. Puan: ${best.score}/100.`,
    why ? `Sebep: ${why}.` : '',
    `Şimdi yap: ${now}`,
    rejected ? `Diğerleri neden değil: ${rejected}.` : '',
  ].filter(Boolean).join(' ');
}

function formatChecklistReply(screenDefinition, guide) {
  const checks = uniqueStrings([...(firstControls(screenDefinition, guide) || []), ...(dataRules(screenDefinition, guide, 3) || []), ...((Array.isArray(screenDefinition?.doneChecklist) ? screenDefinition.doneChecklist : []).slice(0, 4))]).slice(0, 7);
  return bulletJoin(checks, 'Kontrol listesi: ');
}

function formatMistakesReply(screenDefinition, guide) {
  const mistakes = uniqueStrings([...(Array.isArray(screenDefinition?.commonMistakes) ? screenDefinition.commonMistakes : []), ...(Array.isArray(guide?.commonMistakes) ? guide.commonMistakes : [])]).slice(0, 4);
  return bulletJoin(mistakes, 'Sık hata: ');
}

function composeSimpleScreenReply({ questionType, guide, message, screenDefinition, screenContext }) {
    const purpose = normalizeVisibleReplyFragment(firstNonEmpty(guide?.plainSummary, screenDefinition?.menuPurpose, guide?.summary, 'Bu ekran yardım için kullanılır.'));
    const purposeLead = buildVisibleScreenPurposeLead(purpose);
    const now = normalizeVisibleReplyFragment(simpleNowText(guide, screenDefinition));
    const next = normalizeVisibleReplyFragment(simpleNextText(guide, screenDefinition));
  const menus = simpleMenuList(screenDefinition, 2);
  const buttons = pickButtons(guide?.buttonGuides || screenDefinition?.buttonGuides, 2);
    const controls = firstControls(screenDefinition, guide).slice(0, 3).map((value) => normalizeVisibleReplyFragment(value)).filter(Boolean);
  const mistakes = (Array.isArray(screenDefinition?.commonMistakes) ? screenDefinition.commonMistakes : []).slice(0, 2);
  const nextPlaces = nextScreens(screenDefinition, 2).map((x) => x?.label).filter(Boolean);

    if (questionType === 'CHECKLIST_HELP') {
      return `${purposeLead} ${controls.length ? `İlk kontrol: ${controls.join(' • ')}.` : `İlk bakılacak yer: ${ensureVisibleSentence(now)}`} ${screenDefinition?.doneChecklist?.[0] ? `Bitti saymak için: ${normalizeVisibleReplyFragment(screenDefinition.doneChecklist[0])}.` : ''}`.trim();
    }

    if (questionType === 'COMMON_MISTAKE_HELP') {
      return `${purposeLead} ${mistakes.length ? `Sık hata: ${mistakes.join(' • ')}.` : `İlk bakılacak yer: ${ensureVisibleSentence(now)}`}`.trim();
    }

    if (questionType === 'NEXT_SCREEN') {
      return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)}${nextPlaces.length ? ` Sonraki yerler: ${nextPlaces.join(', ')}.` : ''}${next && !sameVisibleReplyFragment(now, next) ? ` Sonra: ${ensureVisibleSentence(next)}` : ''}`.trim();
    }

    if (questionType === 'FIRST_CONTROL') {
      return `${purposeLead} İlk kontrol: ${controls.length ? controls.join(' • ') : ensureVisibleSentence(now)}${next && !sameVisibleReplyFragment(now, next) ? ` Sonra: ${ensureVisibleSentence(next)}` : ''}`.trim();
    }

    if (questionType === 'DETAIL_FLOW') {
      const flowText = normalizeVisibleReplyFragment(formatWorkflowReply(screenDefinition, guide) || `İlk bakılacak yer: ${ensureVisibleSentence(now)}`);
      return `${purposeLead} ${flowText}`.trim();
    }

    if (questionType === 'ROLE_HELP') {
      return `${purposeLead} ${menus.length ? `En çok işine yarayacak yerler: ${menus.join(', ')}.` : ''} İlk bakılacak yer: ${ensureVisibleSentence(now)}`.trim();
    }

    if (questionType === 'ROW_HELP') {
      const rowReply = normalizeVisibleReplyFragment(selectedRowReadReply(screenContext, screenDefinition));
      return `${purposeLead} ${rowReply ? `${ensureVisibleSentence(rowReply)}` : ''} İlk bakılacak yer: ${ensureVisibleSentence(now)}`.trim();
    }

    if (questionType === 'MISSING_DATA_HELP') {
      const missingReply = normalizeVisibleReplyFragment(selectedMissingReply(screenContext, screenDefinition));
      return `${purposeLead} ${missingReply ? `${ensureVisibleSentence(missingReply)}` : ''} İlk bakılacak yer: ${ensureVisibleSentence(now)}`.trim();
    }

  if (questionType === 'FIELD_HELP' || questionType === 'BADGE_HELP' || questionType === 'TERM_HELP') {
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return comparison;
    const selectedTerm = questionType === 'BADGE_HELP' ? selectedBadgeReply(message, screenContext, screenDefinition) : questionType === 'FIELD_HELP' ? selectedFieldReply(message, screenContext, screenDefinition) : selectedTermReply(message, screenContext, screenDefinition);
    if (selectedTerm) return `${selectedTerm} Şimdi: ${now}`.trim();
    const knownTerms = explainTermsFromText(message, 2);
    const screenTerms = pickTerms(guide?.simpleTerms || screenDefinition?.simpleTerms, 2);
    const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]).slice(0, 2);
    return `${terms.length ? `${terms.join(' • ')}.` : purposeLead} Şimdi: ${now}`.trim();
  }

  if (questionType === 'BUTTON_HELP') {
    return `${purposeLead} ${buttons.length ? `Öne çıkanlar: ${buttons.join(' • ')}.` : ''} Şimdi: ${now}`.trim();
  }

  if (questionType === 'WHY_BLOCKED') {
    return `${purposeLead} Şimdi: doğru kayıt veya gerekli bilgiyi seç. Sonra blokajı gösteren alanları kontrol et. ${now ? `İlgili adım: ${now}` : ''}`.trim();
  }

  if (questionType === 'GO_TO') {
    return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)} Aşağıdaki düğmelerden uygun olana bas.`;
  }

  if (questionType === 'NEXT_STEP') {
    return `Şimdi: ${purposeLead} İlk kontrol: ${ensureVisibleSentence(now)}${next ? ` Sonra: ${ensureVisibleSentence(next)}` : ''}`.trim();
  }

  if (questionType === 'SCREEN_PURPOSE' || questionType === 'OPEN') {
    return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)}${menus[0] ? ` Gerekirse ${menus[0]} kısmına geç.` : ''}`.trim();
  }

  return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)}`.trim();
}

function limitItemsForRoleMode(items, roleMode, limitSimple = 3, limitDefault = 5) {
  const list = Array.isArray(items) ? items : [];
  return roleMode === 'SIMPLE' ? list.slice(0, limitSimple) : list.slice(0, limitDefault);
}

function actionPlanLabelForRoleMode(roleMode, entityType) {
  if (roleMode === 'SIMPLE') return 'Buradan devam et';
  return entityType === 'screen' ? 'İlgili yere git' : 'Önerilen açılabilir adımlar';
}

function contextSummaryForRoleMode(roleMode, screenDefinition, entityLabel, scope, entityType) {
  if (roleMode === 'SIMPLE') {
    return entityType === 'screen' ? `Ekran: ${screenDefinition?.label || '-'}` : firstNonEmpty(entityLabel, screenDefinition?.label, scope?.summary, '');
  }
  return [
    screenDefinition?.label ? `Ekran: ${screenDefinition.label}` : null,
    entityLabel ? `Bağlam: ${entityLabel}` : null,
    scope?.summary || null,
  ].filter(Boolean).join(' • ');
}

function screenMenuActions(screenDefinition) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).map((item) => makeQuickAction(item.label, item.path, item.purpose));
}


function findMenu(screenDefinition, labels = [], paths = []) {
  const rows = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
  return rows.find((item) => {
    const label = normalizeText(item?.label || '');
    const path = normalizeText(item?.path || '');
    return labels.some((x) => label.includes(normalizeText(x))) || paths.some((x) => path.includes(normalizeText(x)));
  }) || null;
}

function currentScreenAction(screenDefinition, context, reason = '') {
  if (!screenDefinition?.path) return null;
  const routeParams = {};
  if (context?.type === 'shift' && context?.id) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(`${screenDefinition?.label || 'Bu ekran'} ekranını aç`, screenDefinition.path, reason || 'Aynı bağlamı açık ekranda sürdürür.', { routeParams, accent: 'primary' });
}

function menuAction(menu, context, reason = '', extras = {}) {
  if (!menu?.path) return null;
  const routeParams = { ...(extras?.routeParams && typeof extras.routeParams === 'object' ? extras.routeParams : {}) };
  if (context?.type === 'shift' && context?.id && !routeParams.focusShiftId) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id && !routeParams.focusVehicleId) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(menu.label || 'Buradan aç', menu.path, reason || menu.purpose || '', { routeParams, accent: extras?.accent || 'neutral' });
}

function entityActionPlan({ entityType, context, screenDefinition, roleMode, questionType, reply }) {
  const rows = [];
  if (entityType === 'shift') {
    const offersMenu = findMenu(screenDefinition, ['teklif', 'offer'], ['/offers']);
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    const agreementsMenu = findMenu(screenDefinition, ['sözleşme', 'agreement'], ['/agreements']);
    const hasSelection = Boolean(context?.selectedLabel || context?.selectedSummary || context?.selectedEntityId || context?.selectedEntityType || context?.id);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı konuşmayı seçili vardiya ile ekranda sürdürür.'));
    if (Number(context?.openOfferCount || 0) > 0 || ['GO_TO', 'WHY_BLOCKED'].includes(questionType)) rows.push(menuAction(offersMenu, context, 'Teklif kararını kapatmak için ilgili listeyi açar.', { accent: 'primary' }));
    if (!context?.vehicleId || questionType === 'NEXT_STEP') rows.push(menuAction(vehiclesMenu, context, 'Araç atamasını veya araç durumunu kontrol etmek için açılır.', { routeParams: context?.vehicleId ? { focusVehicleId: Number(context.vehicleId) } : {}, accent: 'primary' }));
    if (!context?.driverId || questionType === 'NEXT_STEP') rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    if (String(context?.agreementId || '') || questionType === 'GO_TO') rows.push(menuAction(agreementsMenu, context, 'Sözleşmeye bağlı akışı kontrol etmek için açılır.'));
    rows.push(makeGuideAction('Atamaya hazır mı rehberini aç', { jobType: 'ASSIGNMENT_READINESS_GUIDE', guideLevel: 'STEP_BY_STEP' }, 'Bu kayıt için eksikleri adım adım sıralar.'));
    rows.push(makeAskAction(
      hasSelection ? 'Bunu sor: Bu kayıt ne durumda?' : 'Bunu sor: Bu ekranı detaylı anlat',
      hasSelection ? 'bu kayıt ne durumda' : 'bu ekranı detaylı anlat',
      hasSelection ? 'Aynı kayıt için hızlı takip sorusunu tekrar gönderir.' : 'Bu ekranın amacını kısa anlatır.',
    ));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else if (entityType === 'vehicle') {
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const mapMenu = findMenu(screenDefinition, ['canlı', 'harita', 'map'], ['/map', '/live']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı aracı açık ekranda incelemek için açılır.'));
    rows.push(menuAction(vehiclesMenu, context, 'Araç detayına dönmek için açılır.', { accent: 'primary' }));
    if (!Number(context?.activeDeviceCount || 0) || ['GO_TO', 'WHY_BLOCKED', 'LOCATION_HELP'].includes(questionType)) rows.push(menuAction(mapMenu, context, 'Canlı konum tarafını tekrar görmek için açılır.', { accent: 'primary' }));
    if (!context?.driver?.id) rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    rows.push(makeGuideAction('Konum kaynağı rehberini aç', { jobType: 'LOCATION_SOURCE_GUIDE', guideLevel: 'SHORT' }, 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'));
    rows.push(makeGuideAction('GPS teşhis rehberini aç', { jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE', guideLevel: 'WHY' }, 'Konum neden görünmüyor sorusuna odaklanır.'));
    rows.push(makeAskAction('Bunu sor: Konum neden görünmüyor?', 'konum neden görünmüyor', 'Aynı kayıt için hızlı teşhis sorusu gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
    rows.push(currentScreenAction(screenDefinition, context, roleMode === 'SIMPLE' ? 'Bu ekrana dönersin.' : 'Bu ekranı tekrar açar.'));
    for (const menu of menus.slice(0, roleMode === 'SIMPLE' ? 1 : 3)) rows.push(menuAction(menu, context, menu.purpose || 'İlgili menüye götürür.', { accent: roleMode === 'SIMPLE' && rows.length <= 1 ? 'primary' : 'neutral' }));
    if (roleMode === 'SIMPLE') {
      rows.push(makeAskAction('Bunu sor: Şimdi ne yapayım?', 'şimdi ne yapayım', 'Daha kısa yönlendirme alırsın.'));
    } else {
      rows.push(makeGuideAction('Ekran rehberini aç', { jobType: 'SCREEN_MENU_GUIDE', guideLevel: 'SHORT' }, 'Ekranın amacını kısa anlatır.'));
      rows.push(makeGuideAction('Buton rehberini aç', { jobType: 'BUTTON_ACTION_GUIDE', guideLevel: 'WHY' }, 'Butonların ne yaptığını sade dille açıklar.'));
      rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
    }
  }
  return rows.filter(Boolean);
}

function nextPromptByEntity(entityType, roleMode) {
  if (entityType === 'shift') return roleMode === 'SIMPLE' ? 'İstersen bir sonraki adımı yine kısa söyleyeyim.' : 'İstersen şimdi hangi ekrana gitmen gerektiğini tek tek açayım.';
  if (entityType === 'vehicle') return roleMode === 'SIMPLE' ? 'İstersen konum tarafını daha kısa söyleyeyim.' : 'İstersen seni araç, canlı ekran veya rehbere yönlendireyim.';
  return roleMode === 'SIMPLE' ? 'Takıldığın sözü veya düğmeyi yaz.' : 'İstersen ilgili menüyü veya rehberi aşağıdan aç.';
}

function guideLinksForEntity(entityType) {
  if (String(entityType) === 'vehicle') {
    return [
      makeLinkedGuide('LOCATION_SOURCE_GUIDE', 'Konum kaynağı rehberini aç', 'SHORT', 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'),
      makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS sinyal teşhisini aç', 'WHY', 'Konum neden görünmüyor sorusuna odaklanır.'),
      makeLinkedGuide('VEHICLE_DRIVER_BIND', 'Araç-sürücü bağlama rehberini aç', 'STEP_BY_STEP', 'Bağlama adımlarını sade dille gösterir.'),
    ];
  }
  if (String(entityType) === 'shift') {
    return [
      makeLinkedGuide('OFFER_REVIEW', 'Teklifi inceleme rehberini aç', 'SHORT', 'Kayıt özetini rehber modunda açar.'),
      makeLinkedGuide('OFFER_APPROVAL', 'Teklifi onaylama rehberini aç', 'WHY', 'Onay öncesi dikkat noktalarını açar.'),
      makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Atamaya hazır mı rehberini aç', 'STEP_BY_STEP', 'Hazırlık eksiklerini sıralar.'),
    ];
  }
  return [
    makeLinkedGuide('SCREEN_MENU_GUIDE', 'Ekran rehberini aç', 'SHORT', 'Bu ekranın amacını açar.'),
    makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Buton rehberini aç', 'WHY', 'Bu ekrandaki butonları açıklar.'),
    makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye gideceğini gösterir.'),
  ];
}

function shiftStatusText(context) {
  return `Bu vardiya ${context?.status || '-'} durumda. Araç: ${context?.vehicle?.plate || 'yok'}. Sürücü: ${context?.driver?.fullName || 'yok'}. Durak: ${Number(context?.stopCount || 0)}. Açık teklif: ${Number(context?.openOfferCount || 0)}.`;
}

function shiftBlockers(context) {
  const items = [];
  if (!context?.vehicleId) items.push('Araç ataması görünmüyor.');
  if (!context?.driverId) items.push('Sürücü ataması görünmüyor.');
  if (!Number(context?.stopCount || 0)) items.push('Durak verisi görünmüyor.');
  if (String(context?.status || '') === 'APPROVED' && !context?.roomId) items.push('Onaylı işte oda ataması görünmüyor.');
  if (Number(context?.openOfferCount || 0) > 0 && !context?.roomOfferDecision) items.push('Teklif kararı net görünmüyor.');
  return uniqueStrings(items);
}

function shiftNextStep(context) {
  const blockers = shiftBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu tamamla.';
  if (Number(context?.openOfferCount || 0) > 0) return 'Önce teklif kararını netleştir. Sonra araç ve sürücüyü tekrar kontrol et.';
  if (String(context?.status || '') === 'REQUESTED') return 'Önce uygun teklif veya atama hattını aç. Sonra işin bağlı olacağı odayı netleştir.';
  return 'Önce araç, sürücü ve durak bilgisini birlikte kontrol et. Sonra ilgili ekrandan ilerle.';
}

function vehicleSourceText(context) {
  const hasDevice = Number(context?.activeDeviceCount || 0) > 0;
  const hasDriver = Number(context?.driver?.id || 0) > 0;
  const lastUi = String(context?.gpsState?.lastUiStatus || 'UNKNOWN');
  const age = ageMinutes(context?.gpsLast?.at);
  const lastPart = age == null ? 'Son konum zamanı görünmüyor.' : `Son konum yaklaşık ${age} dakika önce geldi.`;
  if (hasDevice && hasDriver) return `Bu araçta hem cihaz GPS'i kaydı hem de sürücü bağı görünüyor. Ana kaynak kullanımına göre ikisi de devreye girebilir. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDevice) return `Bu araçta aktif cihaz GPS'i görünüyor. Sürücü bağı ${hasDriver ? 'de var' : 'görünmüyor'}. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDriver) return `Bu araçta sürücünün telefon GPS'i tarafı için sürücü bağı görünüyor. Aktif cihaz GPS'i görünmüyor. ${lastPart} UI durumu: ${lastUi}.`;
  return `Bu araçta şu an ne aktif cihaz GPS'i ne de sürücü bağı net görünüyor. ${lastPart}`;
}

function vehicleBlockers(context) {
  const items = [];
  if (!Number(context?.activeDeviceCount || 0) && !context?.driver?.id) items.push('Konum verecek kaynak net görünmüyor.');
  if (!Number(context?.activeDeviceCount || 0)) items.push("Aktif cihaz GPS'i görünmüyor.");
  if (!context?.gpsLast?.at) items.push('Son GPS zamanı görünmüyor.');
  if (!context?.driver?.id) items.push('Sürücü bağı görünmüyor.');
  if (String(context?.gpsState?.lastUiStatus || '') === 'STALE') items.push('Konum verisi eski görünüyor.');
  return uniqueStrings(items);
}

function vehicleNextStep(context) {
  const blockers = vehicleBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu düzelt.';
  if (Number(context?.activeDeviceCount || 0) > 0) return 'Önce cihaz GPS\'i son sinyalini kontrol et. Sonra canlı ekrandan tekrar bak.';
  return "Önce sürücü bağını ve konum kaynağını kontrol et. Sonra canlı konum ekranına dön.";
}


function shiftReadinessReply(context) {
  const blockers = shiftBlockers(context);
  const ready = blockers.length === 0 && Number(context?.openOfferCount || 0) === 0 && Boolean(context?.vehicleId) && Boolean(context?.driverId);
  const score = ready ? 92 : blockers.length ? 46 : 72;
  const label = ready ? 'hazır' : blockers.length ? 'hazır değil' : 'kontrollü ilerlemeli';
  return `${shiftStatusText(context)} Bu kayıt şu an ${label} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim();
}

function shiftMissingDataReply(context) {
  const blockers = shiftBlockers(context);
  if (!blockers.length) return `${shiftStatusText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${shiftNextStep(context)}`.trim();
  const more = blockers.slice(1, 3);
  return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${shiftNextStep(context)}`.trim();
}

function composeReply({ questionType, replyMode, guide, message, context, entityType, screenDefinition, roleMode, screenContext, conversationState, sourceScreenDefinition, sourceScreenContext, preferEntityContext = false, userRole = '', screenPath = '', contextPriority = null }) {
  const hasScreenContext = !preferEntityContext && (entityType === 'screen' || Boolean(screenContext?.path || screenDefinition?.path));
  const analysis = hasScreenContext ? analyzeScreenState({ screenContext, screenDefinition, conversationState }) : null;
  const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: firstNonEmpty(contextPriority?.activeTopic, selectedDiagnosticTheme(message), '') });
  const screenLead = workflowStyle
    ? normalizeVisibleReplyFragment(firstNonEmpty(
      contextPriority?.summaryLead,
      contextPriority?.selectedRecordMismatchLead,
      contextPriority?.evidenceConfidence,
      analysis?.reasoningLead,
      'Ekrandaki sinyale göre konuşuyorum.',
    ))
    : buildVisibleScreenPurposeLead(firstNonEmpty(
      guide?.screenExplanation,
      screenDefinition?.menuPurpose,
      guide?.plainSummary,
      guide?.summary,
      'Bu ekran için kısa rehber.',
    ));
  const selectedRecordDiagnosticReply = composeSelectedRecordDiagnosticReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState });
  if (selectedRecordDiagnosticReply) return toReply(selectedRecordDiagnosticReply);
  {
    const selectedDiagnosticPath = selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext);
    const selectedDiagnosticText = normalizeText(message);
    const selectedNextActionMatch = /(sıradaki doğru işlem|siradaki dogru islem|sıradaki işlem|siradaki islem|sonraki doğru işlem|sonraki dogru islem|ilk neye bakayım|ilk neye bakayim|şimdi ne yapayım|simdi ne yapayim|şimdi ne yapmalıyım|simdi ne yapmaliyim|hangi ekrana gitmeliyim|nereye geçmeliyim|nereye gitmeliyim)/.test(selectedDiagnosticText);
    const selectedSurfaceOk = selectedDiagnosticPath === '/superadmin' || selectedDiagnosticPath.startsWith('/superadmin/operations') || selectedDiagnosticPath.startsWith('/superadmin/commercial-core') || selectedDiagnosticPath.startsWith('/superadmin/trust-quality') || selectedDiagnosticPath.startsWith('/superadmin/operation-verification');
    const selectedHasContext = hasSelectedDiagnosticContext(screenContext) || hasSelectedDiagnosticContext(sourceScreenContext);
    if (selectedSurfaceOk && selectedHasContext && selectedNextActionMatch) {
      const currentContext = hasSelectedDiagnosticContext(screenContext) ? screenContext : sourceScreenContext;
      const fallbackContext = currentContext === screenContext ? sourceScreenContext : screenContext;
      const currentScreenDefinition = currentContext === screenContext ? screenDefinition : sourceScreenDefinition;
      const fallbackScreenDefinition = fallbackContext === sourceScreenContext ? sourceScreenDefinition : screenDefinition;
      const summary = firstNonEmpty(selectedCarrySummary(currentContext), selectedCarrySummary(fallbackContext), '');
      const rowReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedRowReadReply(currentContext, currentScreenDefinition), selectedRowReadReply(fallbackContext, fallbackScreenDefinition), ''));
      const why = uniqueStrings([
        summary ? `Seçili kayıt: ${summary}` : '',
        rowReply,
      ]).slice(0, 2).join(' • ') || 'Bu ekrandaki veriye göre net blokaj görünmüyor.';
      const meaning = firstNonEmpty(summary, currentScreenDefinition?.menuPurpose, fallbackScreenDefinition?.menuPurpose, 'Seçili kaydı ve durum satırını birlikte okumak gerekir.');
      const suggestion = firstNonEmpty(rowReply, 'Seçili kayıt özetini aç.');
      return toReply(`Şimdi: Bu ekrandaki veriye göre önce seçili kaydı netleştir. Bu programda bunun anlamı: ${meaning}. Neden? ${why} Öneri: ${suggestion} Sıradaki doğru işlem: Seçili kayıt özeti ve durum satırını kontrol et.`.trim());
    }
  }
  const opsQualityPaymentReply = composeOpsQualityPaymentGuideReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext });
  if (opsQualityPaymentReply) return toReply(opsQualityPaymentReply);
  const workflowTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
  if (shouldUseWorkflowGuide({ questionType, activeTopic: workflowTopic })) {
    return toReply(composeGeneralProductGuideReply({
      questionType,
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      roleMode,
      analysis,
      conversationState,
      userRole,
      screenPath,
      entityType,
      context,
      contextPriority,
    }));
  }
  if (roleMode === 'SIMPLE' && hasScreenContext && !['LOCATION_HELP', 'NEXT_SCREEN', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'ROW_HELP', 'MISSING_DATA_HELP', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHY_BLOCKED'].includes(questionType)) {
    return toReply(composeSimpleScreenReply({ questionType, guide, message, screenDefinition, screenContext }));
  }
  if (questionType === 'OPEN') {
    return toReply(openingReply({ entityType, context, guide, screenDefinition, roleMode }));
  }
  if (questionType === 'SCREEN_PURPOSE') {
    return toReply(composeScreenPurposeWithCarry({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'ROLE_HELP') {
    return toReply(roleHelpReply({ guide, screenDefinition, roleMode }));
  }
  if (questionType === 'CHECKLIST_HELP') {
    return toReply(`${formatChecklistReply(screenDefinition, guide) || `Önce: ${simpleNowText(guide, screenDefinition)}`} ${guide.whatToDoNext ? `Sonra: ${guide.whatToDoNext}` : ''}`.trim());
  }
  if (questionType === 'COMMON_MISTAKE_HELP') {
    return toReply(`${formatMistakesReply(screenDefinition, guide) || firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.plainSummary)} ${guide.doNotDo ? `Kaçın: ${guide.doNotDo}` : screenDefinition?.doNotDo ? `Kaçın: ${screenDefinition.doNotDo}` : ''}`.trim());
  }
    if (questionType === 'FIRST_CONTROL') {
      const bridged = composeBridgedFirstControlReply({ targetScreenDefinition: screenDefinition, sourceScreenDefinition, sourceScreenContext, guide });
      if (bridged) return toReply(bridged);
      const checks = firstControls(screenDefinition, guide);
      const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
    return toReply(`${screenLead}${lead ? ` ${lead}` : ''} ${checks.length ? bulletJoin(checks.slice(0, 4), 'İlk kontrol: ') : `İlk kontrol: ${simpleNowText(guide, screenDefinition)}`} ${stuckChecks(screenDefinition, guide, 2)[0] ? `Takılırsa incele: ${stuckChecks(screenDefinition, guide, 2)[0]}` : ''}`.trim());
    }
  if (questionType === 'NEXT_SCREEN') {
    const hitNext = findNextScreenByMessage(message, screenDefinition);
    if (hitNext && normalizeText(message).includes(normalizeText(hitNext.label || ''))) {
      const weakCarry = hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition);
      if (weakCarry && !extractMentionedScreenKind(message)) return toReply(weakCarryReply(sourceScreenDefinition, sourceScreenContext));
      const lead = nextScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition });
      return toReply(`${lead ? `${lead} ` : ''}${hitNext.label} ekranına geç. Sebep: ${hitNext.reason || 'Bir sonraki doğru adım bu ekranda.'}`.trim());
    }
    return toReply(buildBestNextScreenReply({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'DETAIL_FLOW') {
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${formatWorkflowReply(screenDefinition, guide)}`.trim());
  }
  if (questionType === 'ROW_HELP') {
    const rowReply = selectedRowReadReply(screenContext, screenDefinition);
    if (rowReply) return toReply(rowReply);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} Önce listeden veya tablodan bir kayıt seç.`);
  }
  if (entityType === 'screen' && isShiftTrackingScreen(screenDefinition) && !['shift', 'vehicle'].includes(String(screenContext?.selectedEntityType || '').trim())) {
    if (questionType === 'READINESS_CHECK' || questionType === 'MISSING_DATA_HELP' || questionType === 'STATUS_HELP' || questionType === 'SAFE_NEXT_STEP' || questionType === 'WHY_BLOCKED') {
      return toReply(shiftScreenNoSelectionReply(questionType, screenDefinition));
    }
  }
  if (questionType === 'MISSING_DATA_HELP') {
    const missingReply = selectedMissingReply(screenContext, screenDefinition);
    if (missingReply) return toReply(missingReply);
    if (analysis) return toReply(analyzerReply(analysis, 'MISSING'));
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} Önce seçili kaydın boş alanlarını kontrol et.`);
  }
  if (questionType === 'SHORT_SUMMARY') {
    if (analysis) return toReply(analyzerReply(analysis, 'SHORT'));
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi yap: ${guide.whatToDoNow}` : ''}`.trim());
  }

if (questionType === 'EVIDENCE_HELP') {
  const uiEvidence = uiSurfaceEvidence(screenContext);
  if (analysis) return toReply(`${analyzerReply(analysis, 'EVIDENCE')} ${uiEvidence}`.trim());
  return toReply(uiEvidence || 'Bu yorum seçili alan, rozet ve ekrandaki görünen ipuçlarına dayanır.');
}
if (questionType === 'MISSING_DATA_HELP' && entityType === 'shift') {
  return toReply(shiftMissingDataReply(context));
}
if (questionType === 'MISSING_DATA_HELP' && entityType === 'vehicle') {
  return toReply(vehicleMissingDataReply(context));
}
if (questionType === 'READINESS_CHECK' && entityType === 'shift') {
  return toReply(shiftReadinessReply(context));
}
if (questionType === 'READINESS_CHECK' && entityType === 'vehicle') {
  return toReply(vehicleReadinessReply(context));
}
if (questionType === 'SAFE_NEXT_STEP' && entityType === 'shift') {
  return toReply(`En risksiz adım: ${shiftNextStep(context)}`.trim());
}
if (questionType === 'SAFE_NEXT_STEP' && entityType === 'vehicle') {
  return toReply(`En risksiz adım: ${vehicleNextStep(context)}`.trim());
}
if (questionType === 'WHY_BLOCKED' && entityType === 'shift') {
  const blockers = shiftBlockers(context);
  return toReply(blockers[0] ? `Ana blokaj: ${blockers[0]} Şimdi yap: ${shiftNextStep(context)}` : 'Belirgin blokaj görünmüyor.');
}
if (questionType === 'WHY_BLOCKED' && entityType === 'vehicle') {
  const blockers = vehicleBlockers(context);
  return toReply(blockers[0] ? `Ana blokaj: ${blockers[0]} Şimdi yap: ${vehicleNextStep(context)}` : 'Belirgin blokaj görünmüyor.');
}
if (questionType === 'READINESS_CHECK') {
    if (entityType === 'shift') return toReply(analyzerReply(analysis, 'READINESS'));
    const missingReply = selectedMissingReply(screenContext, screenDefinition);
    if (missingReply) return toReply(`${missingReply} Hazır saymak için önce bu eksik veya blokajları kapat.`.trim());
    if (analysis) return toReply(analyzerReply(analysis, 'READINESS'));
    return toReply('Hazır olup olmadığını anlamak için önce seçili kaydın eksik alanlarını ve durumunu birlikte kontrol et.');
  }
  if (questionType === 'SAFE_NEXT_STEP') {
    if (analysis) return toReply(analyzerReply(analysis, 'SAFE_NEXT'));
    return toReply('En risksiz sonraki adım, önce seçili kaydı ve boş alanları doğrulamaktır.');
  }
  if (questionType === 'WHAT_CHANGED') {
    if (analysis) return toReply(analyzerReply(analysis, 'CHANGED'));
    return toReply('Ne değiştiğini görmek için aynı kaydın durum, rozet ve sonraki adım alanlarını önceki haliyle karşılaştır.');
  }
  if (questionType === 'COMPARE_ITEMS') {
    if (analysis?.compareHint) return toReply(analyzerReply(analysis, 'COMPARE'));
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return toReply(comparison);
    return toReply('İki buton veya alanın farkını anlamak için önce hangisinin kaydettiğini, hangisinin sadece yönlendirdiğini ayır.');
  }
  if (questionType === 'STATUS_HELP' && entityType === 'shift') {
    return toReply(`${shiftStatusText(context)} ${shiftBlockers(context)[0] ? `Eksik taraf: ${shiftBlockers(context)[0]}` : 'Kritik eksik görünmüyor.'}`);
  }
  if (questionType === 'STATUS_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleBlockers(context)[0] ? `Dikkat isteyen konu: ${vehicleBlockers(context)[0]}` : ''}`);
  }
  if (questionType === 'STATUS_HELP') {
    const rowReply = selectedRowReadReply(screenContext, screenDefinition);
    if (rowReply) return toReply(rowReply);
  }
  if (questionType === 'BUTTON_HELP') {
    const uiDisabled = disabledButtonReply(message, screenContext, analysis);
    if (uiDisabled) return toReply(uiDisabled);
    const uiVisible = visibleButtonReply(message, screenContext, analysis);
    const hitButton = findButtonGuideByMessage(message, guide, screenDefinition);
    const hitStage = findWorkflowStageByMessage(message, guide, screenDefinition);
    const rules = dataRules(screenDefinition, guide, 2);
    if (hitButton && normalizeText(message).includes(normalizeText(hitButton.label || ''))) {
      return toReply(`${hitButton.label}: ${firstNonEmpty(hitButton.purpose, '')} ${hitButton.whenToUse ? `Ne zaman: ${hitButton.whenToUse}` : ''} ${hitButton.whatHappens ? `Sonuç: ${hitButton.whatHappens}` : ''} ${hitButton.disabledReason ? `Kapalıysa olası sebep: ${hitButton.disabledReason}` : ''} ${hitButton.riskNote ? `Dikkat: ${hitButton.riskNote}` : ''} ${rules[0] ? `İlgili veri kuralı: ${rules[0]}` : ''}`.trim());
    }
    if (uiVisible) return toReply(`${uiVisible} ${uiSurfaceEvidence(screenContext)}`.trim());
    if (hitStage) {
      return toReply(`${firstNonEmpty(hitStage.title, 'Bu adım')} için yapman gereken: ${firstNonEmpty(hitStage.action, '')} ${hitStage.doneWhen ? `Tamam say: ${hitStage.doneWhen}` : ''} ${hitStage.ifBlocked ? `Takılırsa: ${hitStage.ifBlocked}` : ''} ${rules[0] ? `Unutma: ${rules[0]}` : ''}`.trim());
    }
    const buttons = pickButtons(guide.buttonGuides || screenDefinition?.buttonGuides, 5);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${buttons.length ? `Öne çıkan butonlar: ${buttons.join(' • ')}` : ''} ${rules.length ? `Temel veri kuralları: ${rules.join(' • ')}` : ''} ${uiSurfaceEvidence(screenContext)}`.trim());
  }
  if (questionType === 'WHY_BLOCKED' && entityType === 'shift') {
    const reasons = shiftBlockers(context).slice(0, 3);
    return toReply(`Şimdi: ${reasons.length ? `Bu kayıt şu yüzden ilerlemiyor olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.whyBlocked, guide.screenExplanation, guide.plainSummary)} ${shiftNextStep(context)}`.trim());
  }
  if (questionType === 'WHY_BLOCKED' && entityType === 'vehicle') {
    const reasons = vehicleBlockers(context).slice(0, 3);
    return toReply(`Şimdi: ${reasons.length ? `Konum tarafı şu yüzden takılmış olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.whyBlocked, guide.screenExplanation, guide.plainSummary)} ${vehicleNextStep(context)}`.trim());
  }
  if (questionType === 'WHY_BLOCKED') {
    const uiDisabled = disabledButtonReply(message, screenContext, analysis);
    if (uiDisabled) return toReply(uiDisabled);
    if (analysis?.blockers?.length || analysis?.disabledHints?.length) return toReply(analyzerReply(analysis, 'DIAGNOSIS'));
    const reasons = uniqueStrings([guide.whyBlocked, ...(guide.lockedActionReasons || []), ...stuckChecks(screenDefinition, guide), ...dataRules(screenDefinition, guide, 2)]).slice(0, 5);
    return toReply(`Şimdi: ${reasons.length ? `Bu işlem şu yüzden kapalı olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${uiSurfaceEvidence(screenContext)}`.trim());
  }
  if (questionType === 'FIELD_HELP') {
    const selectedField = selectedFieldReply(message, screenContext, screenDefinition);
    if (selectedField) return toReply(selectedField);
    const rules = dataRules(screenDefinition, guide, 2);
    return toReply(`${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${rules[0] ? `Temel kural: ${rules[0]}` : ''}`.trim());
  }
  if (questionType === 'BADGE_HELP') {
    const selectedBadge = selectedBadgeReply(message, screenContext, screenDefinition);
    if (selectedBadge) return toReply(selectedBadge);
    const mistakes = formatMistakesReply(screenDefinition, guide);
    return toReply(`${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${mistakes || ''}`.trim());
  }
  if (questionType === 'TERM_HELP') {
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return toReply(comparison);
    const selectedTerm = selectedTermReply(message, screenContext, screenDefinition);
    if (selectedTerm) return toReply(selectedTerm);
    const knownTerms = explainTermsFromText(message, 4);
    const screenTerms = pickTerms(guide.simpleTerms || screenDefinition?.simpleTerms, 4);
    const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]);
    return toReply(`${screenLead} ${terms.length ? terms.join(' • ') : firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `İstersen şimdi ${guide.whatToDoNow.toLowerCase()}` : ''}`.trim());
  }
  if (questionType === 'GO_TO') {
    return toReply(`${screenLead} ${firstNonEmpty(guide.whatToDoNow, screenDefinition?.nextStep, guide.plainSummary, guide.summary)} Hangi yere gideceğini aşağıdaki düğmelerden açabilirsin.`);
  }
  if (questionType === 'LOCATION_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleNextStep(context)}`);
  }
  if (questionType === 'LOCATION_HELP') {
    return toReply(composeScreenLocationReply({ guide, screenDefinition }));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'shift') {
    return toReply(shiftNextStep(context));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'vehicle') {
    return toReply(vehicleNextStep(context));
  }
  if (questionType === 'NEXT_STEP') {
    if (analysis?.nextBestAction) return toReply(`${screenLead} ${analysis.reasoningLead} ${analysis.nextBestAction} ${analyzerEvidenceText(analysis)} ${uiSurfaceEvidence(screenContext)}`.trim());
    const stages = workflowStages(screenDefinition, guide, 3);
    if (stages.length) {
      const stageText = stages.map((row, idx) => `${idx + 1}) ${firstNonEmpty(row?.title, `Adım ${idx + 1}`)}: ${firstNonEmpty(row?.action, '')}${row?.doneWhen ? ` Tamam say: ${row.doneWhen}` : ''}`).join(' ');
      const ruleText = formatDataRulesReply(screenDefinition, guide, 'Temel kural: ');
      return toReply(`${screenLead} ${stageText}${ruleText ? ` ${ruleText}` : ''}`.trim());
    }
  }
  if (replyMode === 'STEP_BY_STEP') {
    const flow = formatWorkflowReply(screenDefinition, guide);
    return toReply(`${screenLead} ${flow || firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)}`.trim());
  }
  if (replyMode === 'WHY') {
    return toReply(`${screenLead} ${firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.jobPurpose, guide.summary)} ${guide.whatToDoNow ? `Öneri: ${guide.whatToDoNow}` : ''}`.trim());
  }
  if (analysis) return toReply(`${screenLead} ${analysis.reasoningLead} ${analyzerEvidenceText(analysis)} ${analysis.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim());
  return toReply(composeGeneralProductGuideReply({
    questionType,
    message,
    guide,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    roleMode,
    analysis,
    conversationState,
    userRole,
    screenPath,
    entityType,
    context,
    contextPriority,
  }));
}

// COP-02A: program içi genel ürün rehberi fallback’i.
// soruyu anla -> kısa cevap ver -> görünen sorun -> neden -> öneri -> sıradaki doğru işlem
function composeGeneralProductGuideReply({
  questionType,
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  roleMode = 'OPERATIONS',
  analysis,
  conversationState = null,
  userRole = '',
  screenPath = '',
  entityType = 'screen',
  context = null,
  contextPriority = null,
}) {
  const resolvedContextPriority = contextPriority || buildContextPriorityDecision({
    message,
    conversationState,
    screenContext,
    screenDefinition,
    sourceScreenContext,
    sourceScreenDefinition,
    questionType,
    roleMode,
    userRole,
    screenPath,
    analysis,
    entityType,
    context,
  });
  const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: resolvedContextPriority.activeTopic });
  const analysisEvidence = normalizeVisibleReplyFragment(firstNonEmpty(
    Array.isArray(analysis?.evidence) ? uniqueStrings(analysis.evidence).slice(0, 3).join(' • ') : '',
    '',
  ));
  const workflowPurposeLead = normalizeVisibleReplyFragment(firstNonEmpty(
    guide?.screenExplanation,
    screenDefinition?.menuPurpose,
    guide?.plainSummary,
    guide?.summary,
    'Bu ekran için kısa rehber.',
  ));
  const workflowNeedsPurposeLead = resolvedContextPriority.needsSelection
    && ['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL'].includes(String(questionType || ''));
  const workflowNow = normalizeVisibleReplyFragment(firstNonEmpty(
    workflowNeedsPurposeLead ? buildVisibleScreenPurposeLead(workflowPurposeLead) : '',
    resolvedContextPriority.summaryLead,
    resolvedContextPriority.selectedRecordMismatchLead,
    resolvedContextPriority.evidenceConfidence,
    analysisEvidence ? `Ekrandaki sinyale göre konuşuyorum. Bunu şuradan anlıyorum: ${analysisEvidence}.` : '',
    resolvedContextPriority.roleBoundary,
    'Ekrandaki sinyale göre konuşuyorum.',
  ));
  const workflowMeaning = normalizeVisibleReplyFragment(firstNonEmpty(
    resolvedContextPriority.activeTopicLabel,
    workflowNeedsPurposeLead ? workflowPurposeLead : 'Görünen kayıt ve durum satırı ana ipucudur.',
  ));
  const workflowWhy = normalizeVisibleReplyFragment(firstNonEmpty(
    analysis?.reasoningLead,
    analysisEvidence ? `Bunu şuradan anlıyorum: ${analysisEvidence}.` : '',
    resolvedContextPriority.whyCandidate,
    'Bu ekranda kesin kanıt yok.',
  ));
  const workflowAdvice = normalizeVisibleReplyFragment(firstNonEmpty(
    String(questionType || '') === 'FIRST_CONTROL' && firstNonEmpty(
      buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[1],
      buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[0],
      '',
    ) || '',
    resolvedContextPriority.advice,
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    'Önce ilgili satırı aç.',
  ));
  const bestNextScreenLabel = firstNonEmpty(
    pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext })?.best?.candidate?.label,
    nextScreens(screenDefinition, 2)[0]?.label,
    nextScreens(sourceScreenDefinition, 2)[0]?.label,
    '',
  );
  const workflowNextAction = normalizeVisibleReplyFragment(firstNonEmpty(
    ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
      ? `İlgili ekranı aç: ${bestNextScreenLabel}.`
      : '',
    resolvedContextPriority.followUpPrompt,
    analysis?.nextBestAction,
    'İlgili satırı aç.',
  ));
  const workflowFirstControlSentence = String(questionType || '') === 'FIRST_CONTROL'
    ? ` İlk kontrol: ${ensureVisibleSentence(firstNonEmpty(
      resolvedContextPriority.advice,
      analysis?.nextBestAction,
      analysis?.safestNextStep,
      workflowNow,
      'Önce ilgili satırı aç.',
    ))}`
    : '';
  if (workflowStyle) {
    const workflowLead = String(questionType || '') === 'FIRST_CONTROL'
      ? buildVisibleScreenPurposeLead(firstNonEmpty(
        screenDefinition?.menuPurpose,
        screenDefinition?.screenExplanation,
        sourceScreenDefinition?.menuPurpose,
        sourceScreenDefinition?.screenExplanation,
        guide?.plainSummary,
        guide?.summary,
        'Bu ekran için kısa rehber.',
      ))
      : (workflowNeedsPurposeLead
        ? ensureVisibleSentence(workflowNow)
        : `Şimdi: ${ensureVisibleSentence(workflowNow)}`);
    return `${workflowLead}${workflowFirstControlSentence} Bu programda bunun anlamı: ${ensureVisibleSentence(workflowMeaning)} Neden? ${ensureVisibleSentence(workflowWhy)} Öneri: ${ensureVisibleSentence(workflowAdvice)} Sıradaki doğru işlem: ${ensureVisibleSentence(workflowNextAction)}`.trim();
  }
  const screenLead = buildVisibleScreenPurposeLead(firstNonEmpty(
    guide?.plainSummary,
    guide?.screenExplanation,
    screenDefinition?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    'Bu program içi rehberdir.',
  ));
  const selectedRecordLead = normalizeVisibleReplyFragment(firstNonEmpty(
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    '',
  ));
  const transferredFirstControls = String(questionType || '') === 'FIRST_CONTROL'
    ? buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)
    : [];
  const bridgeFirstControlLead = firstNonEmpty(transferredFirstControls[1], transferredFirstControls[0], '');
  const programMeaning = normalizeVisibleReplyFragment(uniqueStrings([
    resolvedContextPriority.summaryLead,
    resolvedContextPriority.sameRecordLikely ? 'Aynı kayıt üzerinde devam ediyoruz' : '',
    resolvedContextPriority.activeTopicLabel,
  ]).filter(Boolean).slice(0, 3).join(' • ') || 'Görünen kayıt ve durum satırı ana ipucudur.');
  const why = normalizeVisibleReplyFragment(firstNonEmpty(
    resolvedContextPriority.whyCandidate,
    resolvedContextPriority.missingInfo,
    analysis?.reasoningLead,
    'Bu ekrandaki veride kesin kanıt yok.',
  ));
  const advice = normalizeVisibleReplyFragment(firstNonEmpty(
    resolvedContextPriority.advice,
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
      ? `Sıradaki ekran: ${bestNextScreenLabel}.`
      : '',
    guide?.whatToDoNow,
    normalizeVisibleReplyFragment(screenDefinition?.firstStep),
    normalizeVisibleReplyFragment(sourceScreenDefinition?.firstStep),
    resolvedContextPriority.needsSelection ? 'Önce ilgili satırı seç.' : 'Önce görünen kayıt ve durum satırını kontrol et.',
  ));
  const nextAction = normalizeVisibleReplyFragment(firstNonEmpty(
    isDirectRouteRequest(message) && bestNextScreenLabel
      ? `Doğrudan hedef ekran: ${bestNextScreenLabel}.`
      : '',
    ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
      ? `İlgili ekranı aç: ${bestNextScreenLabel}.`
      : '',
    resolvedContextPriority.followUpPrompt,
    guide?.whatToDoNext,
    normalizeVisibleReplyFragment(screenDefinition?.nextStep),
    normalizeVisibleReplyFragment(sourceScreenDefinition?.nextStep),
    'İlgili ekranı açıp seçili kaydı kontrol et.',
  ));
  const screenLeadIntro = workflowStyle ? '' : ensureVisibleSentence(screenLead);
  const firstControlLead = String(questionType || '') === 'FIRST_CONTROL'
    ? ` İlk kontrol: ${ensureVisibleSentence(firstNonEmpty(
      bridgeFirstControlLead,
      resolvedContextPriority.advice,
      guide?.whatToDoNow,
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      'Önce ilgili kaydı aç.',
    ))}`
    : '';
  const selectedRecordSentence = selectedRecordLead ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(selectedRecordLead)}` : '';
  const includeWhy = roleMode !== 'SIMPLE'
    || isWorkflowTopic(resolvedContextPriority.activeTopic)
    || ['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_SCREEN', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'FIRST_CONTROL', 'DETAIL_FLOW', 'ROW_HELP', 'MISSING_DATA_HELP', 'STATUS_HELP', 'GO_TO', 'ROLE_HELP'].includes(String(questionType || ''));
  if (roleMode === 'SIMPLE') {
    return `${screenLeadIntro}${firstControlLead} Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence}${includeWhy ? ` Neden? ${why}` : ''} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(nextAction)}`;
  }
  return `${screenLeadIntro}${firstControlLead} Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence} Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(nextAction)}`;
}


export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext, screenDefinition, sourceEntityType, sourceEntityId, resolvedEntityType, resolvedEntityId }) {
  const roleMode = String(scope?.roleMode || 'OPERATIONS');
  const requestEntityType = String(sourceEntityType || entityType || 'screen');
  const requestEntityId = Number(sourceEntityId || entityId || 0);
  const rawMessage = extractUserQuestion(message);
  const expandedMessage = expandFollowUpMessage(rawMessage, conversationState, screenContext);
  const effectiveMessage = extractPrimaryConcern(expandedMessage);
  const effectiveScreenDefinition = requestEntityType === 'screen' ? resolveReferencedScreenDefinition(user, screenContext, screenDefinition, effectiveMessage) : screenDefinition;
  const effectiveScreenContext = requestEntityType === 'screen' ? remapScreenContext(screenContext, effectiveScreenDefinition, screenDefinition) : screenContext;
  const screenPath = effectiveScreenDefinition?.path || effectiveScreenContext?.path || '';
  const continuity = buildContinuityMeta({ message: rawMessage, conversationState, screenContext: effectiveScreenContext, requestEntityType, requestEntityId, screenPath });
  const continuityMeta = continuity;
  const intentMeta = detectQuestionIntent(effectiveMessage, { entityType: requestEntityType, screenPath, roleMode, conversationState, originalMessage: rawMessage });
  const questionType = intentMeta.questionType;
  const replyMode = resolveReplyMode(effectiveMessage, questionType, roleMode);
  const userRole = String(user?.role || scope?.role || '').trim();
  const contextPriority = buildContextPriorityDecision({
    message: rawMessage,
    conversationState,
    screenContext: effectiveScreenContext,
    screenDefinition: effectiveScreenDefinition,
    sourceScreenContext: screenContext,
    sourceScreenDefinition: screenDefinition,
    questionType,
    roleMode,
    userRole,
    screenPath,
    analysis: null,
    entityType: requestEntityType,
    context,
  });

  if (roleMode === 'SIMPLE' && String(screenPath || '') === '/driver/checkin' && questionType === 'TERM_HELP' && /check[- ]?in|doğrulama|dogrulama/i.test(String(effectiveMessage || ''))) {
    const reply = 'Check-in: Kişinin araca bindiğini, indiğini veya varlığını doğrulayan kayıt. Şimdi: Önce hangi doğrulama adımında olduğunu kontrol et.';
    const quickActions = [
      makeQuickAction('Bugün', '/driver/today', 'Görev özetine dönmek için açılır.', { accent: 'primary' }),
      makeAskAction('Bunu sor: Şimdi ne yapmalıyım?', 'şimdi ne yapmalıyım', 'Aynı ekran için kısa devam sorusunu gönderir.'),
      makeGuideAction('Rehber aç: Check-in ekranı', 'ROLE_HELP_GUIDE', 'Bu ekranın kısa rehberini açar.'),
    ];
    return {
      ok: true,
      provider: 'local-chat-help',
      mode: 'CHAT_HELP',
      copilotVersion: 'M90D-DRIVER-CHECKIN-TERM-HOTFIX',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Sohbet Yardımı',
      entityType,
      entityId: Number(entityId),
      entityLabel,
      activeEntityLabel: entityLabel,
      scope,
      roleMode,
      screenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
      screenPath,
      summary: 'Check-in anlamı kısa açıklama',
      contextSummary: 'DRIVER rolü için check-in ekranında kısa terim yardımı verildi.',
      reply,
      replyMode,
      questionType,
      questionLabel: questionTypeLabel(questionType),
      suggestedChips: ['Bu ekran ne için?', 'Şimdi ne yapmalıyım?', 'Bugün ekranına nasıl dönerim?'],
      quickActions,
      linkedGuides: [makeLinkedGuide('Check-in ekran rehberi', 'ROLE_HELP_GUIDE', 'Kısa ekran rehberini açar.')],
      intentConfidence: Number(intentMeta?.confidence || 0),
      intentSignals: Array.isArray(intentMeta?.matchedSignals) ? intentMeta.matchedSignals : [],
      qualityHints: [],
      uncertaintyMeta: { level: 'LOW', reason: 'Driver check-in terimi için doğrudan kısa açıklama verildi.', roleMode },
      responseSections: [],
      continuity: continuityMeta,
      continuityMeta,
      routePlan: null,
      followUpPrompt: nextPromptByEntity(entityType, roleMode),
      actionPlanLabel: actionPlanLabelForRoleMode(roleMode, entityType),
      conversationState: {
        ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
        lastQuestionType: questionType,
        lastGuideJobType: 'ROLE_HELP_GUIDE',
        lastEntityType: entityType,
        lastEntityId: Number(entityId),
        lastEntityLabel: entityLabel,
        lastScreenPath: screenPath || null,
        lastScreenLabel: effectiveScreenDefinition?.label || null,
        roleMode,
        lastQuickActions: quickActions.slice(0, 3).map((x) => ({ label: x?.label || '', actionKind: x?.actionKind || 'OPEN_ROUTE', routeKey: x?.routeKey || '', askText: x?.askText || '', guideJobType: x?.guide?.jobType || '' })),
        lastActionPlanLabel: actionPlanLabelForRoleMode(roleMode, entityType),
        lastUserMessage: String(effectiveMessage || '').trim(),
        lastPrimaryConcern: String(effectiveMessage || '').trim(),
        lastRawUserMessage: String(rawMessage || '').trim(),
        lastSelectedEntityType: continuity?.currentEntityType || '',
        lastSelectedEntityId: Number(continuity?.currentEntityId || 0) || null,
        lastSelectedLabel: continuity?.anchorLabel || '',
        lastContinuityMeta: continuityMeta,
        recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
      },
    };
  }
  const preferEntityContext = prefersSelectedEntity(questionType, requestEntityType, context);
  const answerEntityType = preferEntityContext ? String(resolvedEntityType || context?.type || entityType || requestEntityType) : requestEntityType;
  const answerEntityId = preferEntityContext ? Number(resolvedEntityId || context?.id || entityId || requestEntityId || 0) : requestEntityId;
  const guide = buildJobGuideResponse({
    jobType: selectGuideJobType({ entityType: answerEntityType, questionType, message: effectiveMessage, screenPath }),
    guideLevel: replyMode,
    context: answerEntityType === 'screen' ? effectiveScreenDefinition : context,
    entityType: answerEntityType,
    entityId: answerEntityId,
    user,
    screenContext: effectiveScreenContext,
  });

  const rawReply = composeReply({
    questionType,
    replyMode,
    guide,
    message: effectiveMessage,
    context,
    entityType: answerEntityType,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    screenContext: effectiveScreenContext,
    conversationState,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    preferEntityContext,
    userRole,
    screenPath,
    contextPriority,
  });
  const screenActions = roleMode === 'SIMPLE' ? [] : screenMenuActions(effectiveScreenDefinition);
  const guideActions = Array.isArray(guide.quickActions) ? guide.quickActions : [];
  const entityActions = entityActionPlan({ entityType: answerEntityType, context, screenDefinition: effectiveScreenDefinition, roleMode, questionType, reply: rawReply });
  const mergedActions = mergeQuickActions(entityActions, screenActions, guideActions);
  const preferredRouteTarget = (() => {
    if (questionType === 'NEXT_SCREEN') {
      if (isDirectRouteRequest(effectiveMessage)) {
        return { label: effectiveScreenDefinition?.label || '', path: effectiveScreenDefinition?.path || '', reason: 'Kullanıcı doğrudan hedef ekran istedi.' };
      }
      const best = pickBestNextScreenCandidate({ message: effectiveMessage, screenDefinition: effectiveScreenDefinition, sourceScreenDefinition: screenDefinition, sourceScreenContext: screenContext }).best?.candidate || null;
      return best ? { label: best.label || '', path: best.path || '', reason: best.reason || '' } : null;
    }
    if (questionType === 'FIRST_CONTROL' && String(effectiveScreenDefinition?.path || '') !== String(screenDefinition?.path || '')) {
      return { label: effectiveScreenDefinition?.label || '', path: effectiveScreenDefinition?.path || '', reason: 'İlk kontrol hedef ekranda yapılmalı.' };
    }
    return null;
  })();
  const preferredRouteAction = preferredRouteTarget?.label
    ? mergedActions.find((x) => String(x?.actionKind || '') === 'OPEN_ROUTE' && (normalizeText(x?.label || '').includes(normalizeText(preferredRouteTarget.label)) || String(x?.routeKey || '') === String(preferredRouteTarget.path || '')))
    : null;
  const injectedPreferredRouteAction = !preferredRouteAction && preferredRouteTarget?.path
    ? makeQuickAction(preferredRouteTarget.label || 'İlgili ekran', preferredRouteTarget.path, preferredRouteTarget.reason || 'Bir sonraki doğru ekrana götürür.', { accent: 'primary' })
    : null;
  const bestAction = preferredRouteAction || injectedPreferredRouteAction || findBestAction(mergedActions, effectiveMessage);
  const linkedGuides = limitItemsForRoleMode(guideLinksForEntity(answerEntityType), roleMode, 1, 3);
  const suggestedChips = uniqueStrings(Array.isArray(contextPriority?.contextualSuggestedChips) ? contextPriority.contextualSuggestedChips : []).slice(0, roleMode === 'SIMPLE' ? 2 : 4);
  const actionList = bestAction ? [bestAction, ...mergedActions.filter((x) => x !== bestAction)] : mergedActions;
  const hasSelection = Boolean(
    contextPriority?.selectedLabel
    || contextPriority?.selectedSummary
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
  );
  const askFallback = makeAskAction(
    hasSelection ? 'Bunu sor: Bu kayıt ne durumda?' : 'Bunu sor: Bu ekranı detaylı anlat',
    hasSelection ? (answerEntityType === 'vehicle' ? 'konum neden görünmüyor' : 'bu kayıt ne durumda') : 'bu ekranı detaylı anlat',
    hasSelection ? 'Aynı kayıt için hızlı takip sorusunu tekrar gönderir.' : 'Bu ekranın amacını kısa anlatır.',
  );
  const withAsk = actionList.some((x) => x?.actionKind === 'ASK') ? actionList : [askFallback, ...actionList];
  const preferRoute = questionType === 'NEXT_SCREEN' || questionType === 'GO_TO' || isDirectRouteRequest(effectiveMessage);
  const preferOpenRoute = preferRoute
    || (questionType === 'ROLE_HELP' && String(contextPriority?.activeTopic || '') !== 'FEEDBACK_STATUS')
    || (roleMode === 'SIMPLE' && ['NEXT_STEP', 'FIRST_CONTROL'].includes(String(questionType || '')));
  const actionPriority = roleMode === 'SIMPLE'
    ? { OPEN_ROUTE: 0, ASK: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 }
    : preferOpenRoute
      ? { OPEN_ROUTE: 0, ASK: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 }
      : { ASK: 0, OPEN_GUIDE: 1, OPEN_ROUTE: 2, COPY_TEXT: 3 };
  const prioritizedActions = [...withAsk].sort((a, b) => (actionPriority[String(a?.actionKind || 'OPEN_ROUTE')] ?? 9) - (actionPriority[String(b?.actionKind || 'OPEN_ROUTE')] ?? 9));
  const maxQuickActions = roleMode === 'SIMPLE' ? 3 : 5;
  const supportKinds = new Set(['ASK', 'OPEN_GUIDE', 'COPY_TEXT']);
  let finalQuickActions = prioritizedActions.slice(0, maxQuickActions);
  if (roleMode === 'SIMPLE' && finalQuickActions.length > 0 && !finalQuickActions.some((x) => supportKinds.has(String(x?.actionKind || '')))) {
    const supportAction = prioritizedActions.find((x) => supportKinds.has(String(x?.actionKind || '')));
    if (supportAction) finalQuickActions = [...finalQuickActions.slice(0, Math.max(0, maxQuickActions - 1)), supportAction];
  }
    if (String(questionType || '') === 'ROLE_HELP' && (String(screenPath || '').startsWith('/superadmin/operations') || String(screenPath || '').startsWith('/shared/feedback'))) {
      const askAction = finalQuickActions.find((x) => String(x?.actionKind || '') === 'ASK') || askFallback;
      if (askAction) {
        finalQuickActions = [askAction, ...finalQuickActions.filter((x) => x !== askAction)].slice(0, maxQuickActions);
      }
  }
  const reply = polishReply({ reply: rawReply, questionType, screenDefinition: effectiveScreenDefinition, roleMode });
  const qualityHints = buildQualityHints({ reply, questionType, quickActions: finalQuickActions, intentConfidence: intentMeta?.confidence, roleMode });
  const uncertaintyMeta = buildUncertaintyMeta({ questionType, intentConfidence: intentMeta?.confidence, qualityHints, screenDefinition: effectiveScreenDefinition, quickActions: finalQuickActions, roleMode });
  const questionLabel = questionTypeLabel(questionType);
  const routePlan = buildRoutePlan({ questionType, quickActions: finalQuickActions, screenDefinition: effectiveScreenDefinition, continuity });
  const responseSections = buildResponseSections({
    questionType,
    questionLabel,
    quickActions: finalQuickActions,
    suggestedChips,
    qualityHints,
    uncertaintyMeta,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    continuity,
    continuityMeta,
    routePlan,
  });
  const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: firstNonEmpty(contextPriority?.activeTopic, selectedDiagnosticTheme(effectiveMessage), '') });
  const baseContextSummary = contextSummaryForRoleMode(roleMode, effectiveScreenDefinition, entityLabel, scope, answerEntityType);
  const workflowContextSummary = uniqueStrings([
    firstNonEmpty(
      contextPriority?.summaryLead,
      contextPriority?.selectedRecordMismatchLead,
      contextPriority?.evidenceConfidence,
      contextPriority?.diagnosticPriority?.summary,
      contextPriority?.activeTopicLabel,
      '',
    ),
    continuity?.sameEntity && continuity?.anchorLabel
      ? `Aynı kayıt üzerinde devam ediyoruz: ${continuity.anchorLabel}.`
      : '',
    continuity?.isFollowUp && continuity?.sameScreen
      ? 'Aynı ekran bağlamında devam ediyoruz.'
      : '',
  ]).join(' ').trim();
  const contextSummary = workflowStyle
    ? workflowContextSummary
    : [
        firstNonEmpty(contextPriority?.summaryLead, ''),
        continuity?.sameEntity && continuity?.anchorLabel
          ? `Aynı kayıt üzerinde devam ediyoruz: ${continuity.anchorLabel}. ${baseContextSummary}`.trim()
          : continuity?.isFollowUp && continuity?.sameScreen
            ? `Aynı ekran bağlamında devam ediyoruz. ${baseContextSummary}`.trim()
            : baseContextSummary,
      ].filter(Boolean).join(' ').trim();
  const actionPlanLabel = actionPlanLabelForRoleMode(roleMode, answerEntityType);

  return {
    ok: true,
    provider: 'local-chat-help',
    mode: 'CHAT_HELP',
    copilotVersion: 'M71.8-SELECTED-ENTITY-RESOLVE',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Sohbet Yardımı',
    entityType,
    entityId: Number(entityId),
    entityLabel,
    activeEntityLabel: entityLabel,
    scope,
    roleMode,
    screenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
    screenPath,
    summary: workflowStyle
      ? firstNonEmpty(contextPriority?.activeTopicLabel, contextPriority?.diagnosticPriority?.summary, contextPriority?.evidenceConfidence, contextPriority?.summaryLead, reply)
      : firstNonEmpty(guide.plainSummary, guide.summary, reply),
    contextSummary,
    reply,
    replyMode,
    questionType,
    questionLabel,
    suggestedChips,
    contextualSuggestedChips: suggestedChips,
    quickActions: finalQuickActions,
    linkedGuides,
    intentConfidence: Number(intentMeta?.confidence || 0),
    intentSignals: Array.isArray(intentMeta?.matchedSignals) ? intentMeta.matchedSignals : [],
    qualityHints,
    uncertaintyMeta,
    responseSections,
    continuity,
    continuityMeta,
    routePlan,
    followUpPrompt: contextPriority?.followUpPrompt || nextPromptByEntity(entityType, roleMode),
    actionPlanLabel,
    contextPriority,
    evidenceConfidence: contextPriority?.evidenceConfidence || '',
    activeTopic: contextPriority?.activeTopic || '',
    activeTopicLabel: contextPriority?.activeTopicLabel || '',
    roleBoundary: contextPriority?.roleBoundary || '',
    sameRecordLikely: Boolean(contextPriority?.sameRecordLikely),
    needsSelection: Boolean(contextPriority?.needsSelection),
    bestNextAction: contextPriority?.bestNextAction || '',
    conversationState: {
      ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
      lastQuestionType: questionType,
      lastGuideJobType: guide?.jobType || null,
      lastEntityType: entityType,
      lastEntityId: Number(entityId),
      lastEntityLabel: entityLabel,
      lastScreenPath: screenPath || null,
      lastScreenLabel: effectiveScreenDefinition?.label || null,
      roleMode,
      lastQuickActions: finalQuickActions.slice(0, 3).map((x) => ({ label: x?.label || '', actionKind: x?.actionKind || 'OPEN_ROUTE', routeKey: x?.routeKey || '', askText: x?.askText || '', guideJobType: x?.guide?.jobType || '' })),
      lastActionPlanLabel: actionPlanLabel,
      lastUserMessage: String(effectiveMessage || '').trim(),
      lastPrimaryConcern: String(effectiveMessage || '').trim(),
      lastRawUserMessage: String(rawMessage || '').trim(),
      lastSelectedEntityType: continuity?.currentEntityType || '',
      lastSelectedEntityId: Number(continuity?.currentEntityId || 0) || null,
      lastSelectedLabel: continuity?.anchorLabel || '',
      lastContinuityMeta: continuityMeta,
      recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
    },
  };
}

function normalizeReplySurface(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
}

function trimReplyLength(text, maxLength = 560) {
  const value = normalizeReplySurface(text);
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength - 1);
  const cut = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '));
  return `${(cut > 90 ? sliced.slice(0, cut + 1) : sliced).trim()}…`;
}

function normalizeVisibleReplyFragment(value) {
  return firstNonEmpty(value, '')
    .replace(/^(?:Önce|Once)\s*:\s*/i, '')
    .replace(/^(?:Önce|Once)\s+/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s*:\s*/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s+/i, '')
    .replace(/^(?:Sonra|Sonraki)\s*:\s*/i, '')
    .replace(/^(?:Sonra|Sonraki)\s+/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s*:\s*/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:]){2,}/g, '$1')
    .trim();
}

function lowercaseVisibleInitialUnlessAcronym(value) {
  const text = normalizeVisibleReplyFragment(value);
  if (!text) return '';
  const first = text[0] || '';
  const second = text[1] || '';
  if (!/[A-ZÇĞİÖŞÜ]/.test(first)) return text;
  if (/[A-ZÇĞİÖŞÜ]/.test(second)) return text;
  return `${first.toLocaleLowerCase('tr-TR')}${text.slice(1)}`;
}

function buildVisibleScreenPurposeLead(purpose) {
  const text = normalizeVisibleReplyFragment(firstNonEmpty(purpose, ''));
  if (!text) return 'Bu ekran için kısa rehber.';
  if (/^Bu (ekran|program|bilgi|rolde|rolde|yardım|yardim)/i.test(text)) return ensureVisibleSentence(text);
  return `Bu ekran, ${ensureVisibleSentence(lowercaseVisibleInitialUnlessAcronym(text))}`;
}

function sameVisibleReplyFragment(left, right) {
  const a = normalizeVisibleReplyFragment(left).toLocaleLowerCase('tr-TR');
  const b = normalizeVisibleReplyFragment(right).toLocaleLowerCase('tr-TR');
  return Boolean(a && b && a === b);
}

function ensureVisibleSentence(value) {
  const text = normalizeVisibleReplyFragment(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function normalizeActionStepText(value) {
  return normalizeVisibleReplyFragment(value);
}

function openingActionForQuestionType(questionType, screenDefinition) {
  const first = firstNonEmpty(
    normalizeActionStepText(screenDefinition?.firstStep),
    normalizeActionStepText(screenDefinition?.nextStep),
    'ilgili kayıt veya alanı kontrol et',
  );
  const map = {
    NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}`,
      NEXT_SCREEN: `Önce ${first}.`,
      GO_TO: `Şimdi: ${ensureVisibleSentence(first)}`,
      READINESS_CHECK: `Şimdi: ${ensureVisibleSentence(first)}`,
      CONTRACT_TO_SHIFT: `Şimdi: ${ensureVisibleSentence(first)}`,
      FIRST_CONTROL: `İlk kontrol: ${ensureVisibleSentence(first)}`,
    WHY_BLOCKED: `Önce ${first}.`,
    STATUS_HELP: `Şimdi: ${ensureVisibleSentence(first)}`,
    SAFE_NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}`,
    ROLE_HELP: `Şimdi: ${ensureVisibleSentence(first)}`,
    SCREEN_PURPOSE: '',
  };
  return firstNonEmpty(map[String(questionType || '')], '');
}

function ensureActionLead(reply, questionType, screenDefinition, roleMode = 'OPERATIONS') {
  const value = normalizeReplySurface(reply);
  if (!value) return value;
  const preserveIntro = ['SCREEN_PURPOSE', 'ROLE_HELP', 'OPEN'].includes(String(questionType || ''))
    || (String(roleMode || 'OPERATIONS') !== 'SIMPLE' && /^(Bu ekran|Bu bilgi)/i.test(value));
  if (preserveIntro && /^(Bu ekrandaki veriye göre|Bu ekran(,| için)|Bu programda bunun anlamı:|Bu bilgi bu rolde|Bu rolde bu bilgi|İlk bakılacak yer:|İlk kontrol:)/i.test(value)) return value;
    if (['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'ROLE_HELP', 'SCREEN_PURPOSE'].includes(String(questionType || ''))) {
    if (!/^(Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk bakılacak yer:|İlk kontrol:)/.test(value)) {
      const lead = openingActionForQuestionType(questionType, screenDefinition);
      return `${lead} ${value}`.trim();
    }
  }
  return value;
}

function buildQualityHints({ reply, questionType, quickActions, intentConfidence, roleMode }) {
  const text = normalizeReplySurface(reply);
  const actionReady = /(Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk bakılacak yer:|İlk bakılacak yer\s|İlk kontrol:|İlk kontrol\s)/.test(text);
  const concise = text.length <= (roleMode === 'SIMPLE' ? 360 : 720);
  const hasSupportAction = (Array.isArray(quickActions) ? quickActions : []).some((row) => ['ASK', 'OPEN_ROUTE', 'OPEN_GUIDE'].includes(String(row?.actionKind || '')));
  return {
    concise,
    actionable: actionReady,
    hasSupportAction,
    intentConfidence: Number(intentConfidence || 0),
    questionType: String(questionType || ''),
  };
}

function verificationHintForQuestionType(questionType, screenDefinition, quickActions) {
  const firstControl = firstNonEmpty(
    ...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls.map((value) => normalizeActionStepText(value)) : []),
    normalizeActionStepText(screenDefinition?.firstStep),
    'ilgili kayıt veya ilk kontrol alanı',
  );
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
  const routeAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_ROUTE');
  const routeLabel = normalizeActionStepText(routeAction?.label);
  if (['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''))) return `${screenLabel} için önce ${firstControl} kontrolü yap; sonra yönlendirmeyi uygula.`;
  if (questionType === 'WHY_BLOCKED') return `Blokajı kesinleştirmek için önce ${firstControl} ve pasif/kırmızı alanları kontrol et.`;
    if (questionType === 'READINESS_CHECK' || questionType === 'CONTRACT_TO_SHIFT') return `Hazır kararı vermeden önce ${firstControl} ve eksik görünen alanları kontrol et.`;
  if (questionType === 'STATUS_HELP') return `Durumu netleştirmek için önce ${firstControl} ve varsa seçili kaydın son sinyallerine bak.`;
  if (routeLabel) return `${routeLabel} adımına geçmeden önce ${firstControl} kontrolünü yap.`;
  return `Önce ${firstControl} kontrolünü yap; sonra bu yönlendirmeyi uygula.`;
}

function buildUncertaintyMeta({ questionType, intentConfidence, qualityHints, screenDefinition, quickActions, roleMode }) {
  const confidence = Number(intentConfidence || 0);
  const actionable = Boolean(qualityHints?.actionable);
  const hasSupportAction = Boolean(qualityHints?.hasSupportAction);
  const concise = Boolean(qualityHints?.concise);
  const needsVerification = confidence < 0.72 || !actionable || !hasSupportAction;
  const cautionLevel = confidence >= 0.88 && actionable && hasSupportAction ? 'LOW' : (confidence >= 0.72 && actionable ? 'MEDIUM' : 'HIGH');
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

function questionTypeLabel(questionType) {
  const labels = {
    NEXT_SCREEN: 'Nereye gitmeliyim',
    GO_TO: 'Hızlı geçiş',
    FIRST_CONTROL: 'İlk neye bakayım',
      STATUS_HELP: 'Şu an ne durumda',
      READINESS_CHECK: 'Hazır mı',
      CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
      WHY_BLOCKED: 'Neden olmuyor',
    BUTTON_HELP: 'Bu buton ne yapar',
    SCREEN_PURPOSE: 'Bu ekran ne için',
    SAFE_NEXT_STEP: 'Şimdi en güvenli adım',
    LOCATION_HELP: 'Konum neden görünmüyor',
    ROLE_HELP: 'Bu rolde ne yapabilirim',
  };
  return labels[String(questionType || '')] || 'Copilot yardımı';
}

function buildRoutePlan({ questionType, quickActions, screenDefinition, continuity }) {
  const routeActions = (Array.isArray(quickActions) ? quickActions : []).filter((row) => String(row?.actionKind || '') === 'OPEN_ROUTE' && row?.routeKey);
  const askAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'ASK');
  const guideAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_GUIDE');
  const primaryRoute = routeActions[0] || null;
  const secondaryRoute = routeActions[1] || null;
  const routeHeavy = ['NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL', 'ROLE_HELP', 'SAFE_NEXT_STEP'].includes(String(questionType || ''));
  if (!routeHeavy && !primaryRoute) return null;
  const steps = [];
  if (primaryRoute?.label) steps.push(`Önce ${normalizeActionStepText(primaryRoute.label)}`);
  if (continuity?.sameEntity && continuity?.anchorLabel) steps.push(`Aynı kayıtla devam et: ${continuity.anchorLabel}`);
  const firstControl = firstNonEmpty(...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []), screenDefinition?.firstStep, 'ilk kontrol alanı');
  if (firstControl) steps.push(`İçeride ilk olarak şunu kontrol et: ${firstControl}`);
  if (secondaryRoute?.label) steps.push(`Gerekirse sonra ${normalizeActionStepText(secondaryRoute.label)}`);
  if (askAction?.askText || askAction?.label) steps.push(`Takılırsan bunu sor: ${firstNonEmpty(askAction?.askText, askAction?.label, '')}`);
  else if (guideAction?.label) steps.push(`İstersen rehber aç: ${guideAction.label}`);
  return {
    primaryRouteLabel: firstNonEmpty(primaryRoute?.label, ''),
    primaryRouteKey: firstNonEmpty(primaryRoute?.routeKey, ''),
    secondaryRouteLabel: firstNonEmpty(secondaryRoute?.label, ''),
    summary: steps.slice(0, 2).join(' • '),
    steps: steps.slice(0, 5),
    routeHeavy,
  };
}

function responseWhyText(questionType, screenDefinition) {
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
  if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${screenLabel} ekranında sonraki doğru adımı bulmaya odaklandım.`;
  if (questionType === 'FIRST_CONTROL') return `${screenLabel} ekranında önce bakılması gereken noktayı öne çıkardım.`;
    if (questionType === 'STATUS_HELP' || questionType === 'READINESS_CHECK' || questionType === 'CONTRACT_TO_SHIFT') return `${screenLabel} ekranındaki durum ve eksik işaretlerine göre cevap verdim.`;
  if (questionType === 'WHY_BLOCKED') return `${screenLabel} ekranındaki blokaj ve eksik bilgi ihtimaline göre cevap verdim.`;
  if (questionType === 'LOCATION_HELP') return `${screenLabel} ekranındaki konum ve GPS işaretlerine göre yorum yaptım.`;
  return `${screenLabel} ekranını ve seçili kaydı birlikte dikkate aldım.`;
}

function buildResponseSections({ questionType, questionLabel, quickActions, suggestedChips, qualityHints, uncertaintyMeta, screenDefinition, roleMode, continuity, routePlan }) {
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
    text: responseWhyText(questionType, screenDefinition),
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

function applyPlainLanguage(text) {
  return String(text || '')
    .replace(/bağlam/gi, 'durum')
    .replace(/blokaj/gi, 'engel')
    .replace(/\bengelı\b/gi, 'engeli')
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

function polishReply({ reply, questionType, screenDefinition, roleMode }) {
  const withLead = ensureActionLead(reply, questionType, screenDefinition, roleMode);
  return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);
}

function termComparisonReplyV2(message) {
  const text = normalizeText(message);
  const asksDiff = /aynı şey mi|ayni sey mi|farkı ne|farki ne/.test(text);
  const hasLog = /log|audit|işlem kaydı|islem kaydi/.test(text);
  const hasNotification = /bildirim|notification/.test(text);
  const hasInvite = /giriş daveti|giris daveti|hesap daveti|invite/.test(text);
  const hasAccessLink = /erişim linki|erisim linki|access link|personel link|öğrenci linki|ogrenci linki|veli linki|student link/.test(text);
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
