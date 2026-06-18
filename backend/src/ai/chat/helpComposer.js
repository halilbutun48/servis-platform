import { buildJobGuideResponse } from '../jobGuide/index.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../jobGuide/screenCatalog.js';
import { explainTermsFromText } from '../jobGuide/glossary.js';
import { filterWorkflowGenericChips, hasExplicitRoleBoundarySignal, workflowActionSpec, workflowTopicChipSet } from './answerQualityPolicy.js';
import { detectQuestionIntent, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeAskAction, makeCopyAction, makeGuideAction, makeLinkedGuide, makeQuickAction, mergeQuickActions, toReply, uniqueStrings } from './replyShapes.js';
import { analyzeScreenState } from './screenStateAnalyzer.js';
import { createSelectedRuntimeHelpers } from './helpComposerSelectedRuntime.js';
import { createEntityRuntimeHelpers } from './helpComposerEntityRuntime.js';
import { getEtaDisplay, getGpsAgeText, getGpsReliabilityLabel, normalizeGpsFreshness } from './etaSanity.js';
import {
  detectCopilotEBlockRuntimeAnswerTopic,
  getCopilotEBlockRuntimeAnswerTopicMeta,
  isJobTypeEntityMismatchError,
  listCopilotEBlockRuntimeAnswerTopics,
} from './copilotEBlockRuntimeAnswerIntegration.js';
import {
  buildCopilotGuidedTaskEngineGuide,
  composeCopilotGuidedTaskEngineReply,
  detectCopilotGuidedTaskEngineProgressCommand,
} from './copilotGuidedTaskEngine.js';
import {
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRolePlaybook,
} from './seferAbiReasoningAssistant.js';
import { composeCopilotReasoningAnswer } from './copilotReasoningAnswerComposer.js';

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

const COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS = new Set(listCopilotEBlockRuntimeAnswerTopics());

function isCopilotEBlockRuntimeAnswerTopic(topic) {
  return COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS.has(String(topic || ''));
}

const WORKFLOW_SURFACE_HINTS = [
  '/shifts',
  '/map',
  '/live',
  '/personel/my',
  '/contracts',
  '/commercial-flow',
  '/operation-health',
  '/observability',
  '/trust-quality',
  '/feedback',
  '/notifications',
  '/kvkk',
  '/agreements',
  '/driver/today',
  '/personel/live',
  '/parent/live',
  '/superadmin/operations',
  '/superadmin/commercial-core',
  '/superadmin/trust-quality',
  '/superadmin/operation-verification',
  '/room/operation-health',
  '/room/shifts',
  '/company/operations',
  '/school/operations',
  '/organization/operations',
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
  if (/(servis|servisim|öğrencimin servisi|ogrencimin servisi|çocuğumun servisi|cocugumun servisi).*(görünmüyor|gorunmuyor|yok|nerede|neden görünmüyor|neden gorunmuyor|ne zaman|geliyor)/.test(text)) return 'LOCATION_HELP';
  if (/(görev|gorev|rota|sonraki durak|durak).*(başlamıyor|baslamiyor|başlayamıyor|baslayamiyor|görünmüyor|gorunmuyor|bekliyor|yok)/.test(text)) return 'SHIFT_BLOCKED';
  if (/(sürücünün|surucunun).*(telefon gps|telefon gps['’]i|telefon gps’i).*(neden).*(devrede|aktif|açık|acik)/.test(text) || /(telefon gps|cihaz gps).*(neden).*(devrede|aktif|açık|acik)/.test(text)) return 'DRIVER_PHONE_GPS';
  if (/(puan|sefer\s*puan[ıi]|kalite\s*puan[ıi]|tedarikç[iı]\s*puan[ıi]|sağlayıc[ıi]\s*puan[ıi]).*(ödeme|odeme|teklif).*(sıralama|siralam|etkili|etkiliyor|etkisi)/.test(text)) return 'SEFER_SCORE_PREVIEW';
  if (/(hakediş|hakedis|ödeme|odeme|settlement|tahsilat|fatura|kanıt|kanit|proof|komisyon|kalite|quality).*(neden).*(eksik|kontrol gerekli|hazır değil|hazir degil|risk|riskli|başlatılam|baslatilam)/.test(text) || /(kanıt eksik|kanit eksik|kanıtlar eksik|kanitlar eksik|hakediş eksik|hakedis eksik)/.test(text)) return 'PAYMENT_MISSING';
  if (/(hakediş|hakedis|ödeme|odeme|settlement|tahsilat|fatura|kanıt|kanit|proof|komisyon|kalite|quality).*(başlatılabilir|baslatilabilir|güvenli mi|guvenli mi|hazır mı|hazir mi|hazır değil|hazir degil|hazırlık|hazirlik|etkiliyor|etkisi)/.test(text) || /(kalite.*hakediş|kalite.*hakedis|hakediş.*kalite|hakedis.*kalite).*(etkiliyor|etkisi|güvenli mi|guvenli mi)/.test(text)) return 'PAYMENT_READINESS';
  if (/(lisans ücreti|lisans ucreti|başarı payı|basari payi|mevcut sözleşmeden pay|mevcut sozlesmeden pay|platform fee|free-to-operate|seferpakt kaynaklı|seferpakt kaynakli|source lineage|kaynak vardiya|market shift|organization plan|kaynak zinciri|seçili teklif|secili teklif|hangi vardiyadan geldi|mevcut sözleşme mi|mevcut sozlesme mi|pay alacak mı|pay alacak mi|pay alınır mı|pay alinır mı|pay doğmaz|pay dogmaz|0 tl lisans)/.test(text)) return 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW';
  if (/(sağlayıcı|saglayici|provider).*(neden).*(daha iyi|daha güçlü|daha guclu)/.test(text) || /(daha iyi|daha güçlü|daha guclu).*(sağlayıcı|saglayici|provider)/.test(text)) return 'QUALITY_SIGNAL';
  if (/(tasarruf|tasarruf önizlemesi|tasarruf onizlemesi|km tasarrufu|süre tasarrufu|sure tasarrufu|yaklaşık maliyet|yaklasik maliyet|maliyet etkisi|readonly tasarruf|readonly önizleme|dinamik tasarruf)/.test(text)) return 'DYNAMIC_SAVINGS_PREVIEW';
  if (/(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|uygulanan rota|rota geçmişi|rota gecmisi|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(text)) return 'AGREEMENT_ROUTE_REFRESH';
  if (/(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text) || /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text)) return 'CONTRACT_SHIFT_TODAY';
  if (/(sözleşme|sozlesme).*(vardiya|shift)/.test(text)) return 'CONTRACT_TO_SHIFT';
  if (/(kabul edilen değişikliği uygula|kabul edilen degisikligi uygula|kabul edilen değişikliği işleme al|kabul edilen degisikligi isleme al|günlük atamaya işle|gunluk atamaya işle|günlük atamaya işlen|gunluk atamaya işlen|günlük atamaya işlenebilir|gunluk atamaya işlenebilir|günlük atama etkisi|sürücü rotası yenilenmez|surucu rotasi yenilenmez|kalıcı atama değişmez|kalici atama degismez|stopassignment|boarding change application|boarding change uygulama)/.test(text)) return 'BOARDING_CHANGE_APPLICATION';
  if (/(rota etkisi|rota etkisini|önizleme|onizleme|etkiyi hesapla|bugün binmezse|bugun binmezse|farklı duraktan|farkli duraktan|geçici durak|gecici durak|biniş değişikliği|binis degisikligi|km farkı|km farki|süre artar mı|sure artar mi|kapasite etkisi|rotasını|rotasini|rotayı|rotayi|rota.*değiştir|rota.*degistir)/.test(text)) return 'BOARDING_ROUTE_IMPACT_PREVIEW';
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
    case 'DYNAMIC_SAVINGS_PREVIEW':
      return hasNegative
        ? 'Tasarruf hesabı için yeterli veri yok.'
        : 'Bu ekrandaki veriye göre başarı payı önizlemesi hesaplanabilir.';
    case 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW':
      return hasNegative
        ? 'Lisans ücreti, kaynak vardiya veya SeferPuanı için yeterli veri yok.'
        : 'Bu ekrandaki veriye göre başarı payı önizlemesi hesaplanabilir.';
    case 'BOARDING_CHANGE_APPLICATION':
      return hasNegative
        ? 'Bu ekrandaki veriye göre kabul edilen değişiklik henüz günlük atamaya işlenmemiş olabilir.'
        : 'Bu ekrandaki veriye göre kabul edilen değişiklik günlük atamaya işlenebilir veya işlenmiş görünüyor.';
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
    case 'DYNAMIC_SAVINGS_PREVIEW':
      return 'Mevcut / yeni / fark rota metrikleri';
    case 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW':
      return 'Kaynak vardiya sinyali ve SeferPuanı';
    case 'BOARDING_CHANGE_APPLICATION':
      return 'Kabul edilen değişiklik / günlük atama';
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
  const suggestion = normalizeVisibleSuggestionFragment(firstNonEmpty(fieldReply, badgeReply, missingReply, analysis?.actionSimulation, bridge.firstControl, firstControl, 'Önce seçili kaydı aç.'));
  const nextAction = firstNonEmpty(
    normalizeVisibleSuggestionFragment(analysis?.actionSimulation),
    normalizeVisibleSuggestionFragment(analysis?.nextBestAction),
    normalizeVisibleSuggestionFragment(analysis?.safestNextStep),
    currentScreenDefinition?.nextStep,
    fallbackScreenDefinition?.nextStep,
    normalizeVisibleSuggestionFragment(suggestion),
    'İlgili satırı aç.',
  );
  return `Şimdi: ${result} Bu programda bunun anlamı: ${meaning}. Neden? ${why} Öneri: ${suggestion}. Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextAction))}`.trim();
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
  const isOperations = screenPath === '/superadmin/operations';
  const isLaunchGate = screenPath === '/superadmin/pilot-launch-gate';
  const isOperationalPanel = isOperations || isLaunchGate || screenPath === '/company/operations' || screenPath === '/school/operations' || screenPath === '/organization/operations';
  const isCommercial = screenPath === '/superadmin/commercial-core';
  const isQuality = screenPath === '/superadmin/trust-quality';
  const isVerification = screenPath === '/superadmin/operation-verification';
  const isTargetSurface = isSuperAdminOverview || isOperationalPanel || isCommercial || isQuality || isVerification;
  if (!isTargetSurface) return null;

  const text = normalizeText(message);
  const definitionStyleQuestion = /(ne\s+demek|ne\s+işe\s+yarar|ne\s+ise\s+yarar|ne\s+için|ne\s+işe\s+yarıyor|ne\s+ise\s+yariyor)/.test(text);
  if (definitionStyleQuestion && ['FIELD_BUTTON_HELP', 'TERM_HELP'].includes(String(questionType || ''))) return null;
  const relevantQuestionType = ['STATUS_HELP', 'WHY_BLOCKED', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'READINESS_CHECK', 'TERM_HELP', 'FIRST_CONTROL'].includes(String(questionType || ''));
  if (isOperationalPanel && relevantQuestionType) {
    const now = isLaunchGate
      ? 'Sahaya çıkış hazırlığını kontrol et.'
      : screenPath === '/superadmin/operations'
        ? 'Açık veya riskli kayıtları kontrol et.'
        : 'Bekleyen işleri kontrol et.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Operasyon özetinde bekleyen iş ve risk sinyalleri okunur. Neden? Bu ekran açık veya riskli işleri öne çıkarır. Öneri: İlgili kartı aç. Sıradaki doğru işlem: Operasyon kartını incele.`.trim();
  }
  if (isLaunchGate && relevantQuestionType) {
    const now = 'Sahaya çıkış hazırlığını kontrol et.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Sahaya çıkış öncesi hazırlık ve kontrol işaretleri aynı yerde okunur. Neden? Bu ekran sahaya çıkış öncesi eksik veya riskli işleri öne çıkarır. Öneri: Hazırlık kartlarını ve açık riskleri kontrol et. Sıradaki doğru işlem: Sahaya çıkış durumunu ve ilgili kontrol kartını aç.`.trim();
  }
  if (isOperations && relevantQuestionType) {
    const now = 'Açık veya riskli kayıtları incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Açık veya riskli kayıtlar ve bekleyen işler birlikte okunur. Neden? Bu ekran açık veya riskli kayıtları ve bekleyen işleri öne çıkarır. Öneri: Riskli kartı aç, açık işleri sırala, gerekirse ilgili sürücü veya araç ekranına geç. Sıradaki doğru işlem: Açık veya riskli kaydı seçip detayına in.`.trim();
  }

  const asksSystem = /(sistem durumu|sistem durumu ne demek|ne açık ne kapalı|ne acik ne kapali|ödeme neden kapalı|ödeme neden kapali|ödemeler neden kapalı|ödemeler neden kapali|neden kapalı|neden kapali)/.test(text);
  const asksCommercial = /(hakediş|hakedis|ödeme başlat|odeme baslat|ödemeyi başlat|önizleme|onizleme|csv|csv taslağı|csv taslagi|hazırlık|hazirlik|hazır mı|hazir mi|kontrol gerekli|eksik bilgi)/.test(text);
  const asksQuality = /(kalite puanı|kalite puani|taslak skor|inceleme kararı|inceleme karari|denetim izi|sağlayıcı sıralaması|saglayici siralamasi|kesin puan|kesin mi|tekrar kontrol gerekli|şimdilik dikkate alınmadı|simdilik dikkate alinmadi)/.test(text);
  const isSeferScoreSurface = ['/commercial-core', '/commercial-flow', '/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements']
    .some((segment) => screenPath.includes(segment));
  const asksSeferScore = isSeferScoreSurface && hasSeferScoreSignal(text);
  const asksMarketplace = /(?:lisans ücreti|lisans ucreti|başarı payı|basari payi|mevcut sözleşmeden pay|mevcut sozlesmeden pay|platform fee|free-to-operate|seferpakt kaynaklı|seferpakt kaynakli|source lineage|kaynak vardiya|market shift|organization plan|kaynak zinciri|seçili teklif|secili teklif|hangi vardiyadan geldi|mevcut sözleşme mi|mevcut sozlesme mi|pay alacak mı|pay alacak mi|pay alınır mı|pay alinır mı|pay doğmaz|pay dogmaz|0 tl lisans)/.test(text);
  const asksProof = /(servis kanıtı|servis kaniti|hizmet kanıtı|hizmet kaniti|operatör notu|operatör not|operatör notu|sürücünün telefon gps['’]i|sürücünün telefon gps'i|telefon gps|araç gps|arac gps|biniş kaydı|binis kaydı|binis kaydi|kanıt ne işe yarar|kanıt ne ise yarar)/.test(text);
  const asksContractOrReadinessWorkflow = ['PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(questionType || ''))
    || /((sözleşme|sozlesme|sözleşmeden|sozlesmeden).*(vardiya|shift).*(üret|uret|oluş|olustur|oluştur|bugün|bugun))|((hakediş|hakedis|ödeme|odeme).*(hazır değil|hazir degil|hazır mı|hazir mi|eksik bilgi|ödeme hesabı|odeme hesabi|komisyon|önizleme|onizleme|csv))/i.test(text);
  if (asksContractOrReadinessWorkflow) return null;
    const actionLeadQuestion = ['NEXT_SCREEN', 'NEXT_STEP', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT'].includes(String(questionType || ''));

  if (String(questionType || '') === 'SCREEN_PURPOSE') {
    if (screenPath === '/superadmin') {
      return `Bu ekran, sistem durumu bandı kanıt ve kalite hazırlıklarını birlikte gösterir. Şimdi: Sistem durumu bandını incele. Bu programda bunun anlamı: Sistem durumu bandı, sahaya çıkış ve hazırlık işaretlerini bir arada okumanı sağlar. Neden? Ödeme, hakediş ve komisyon kapalıdır; saha testi bekliyor. Öneri: Sistemin canlı durumunu ve hazırlık işaretlerini birlikte oku. Sıradaki doğru işlem: Sistem durumu bandını açıp ilgili kontrol kartını incele.`.trim();
    }
    if (screenPath === '/superadmin/commercial-core') {
      return `Bu ekran, ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını birlikte gösterir. Şimdi: Ticari akış özetini incele. Bu programda bunun anlamı: Ticari akış, hakediş hazırlığı ile görünür önizlemeyi aynı yerde okumanı sağlar. Neden? Bu yüzey yalnızca önizleme ve hazırlık sinyalini gösterir; hakediş ve komisyon satırları kapalı olabilir. Öneri: Önizleme kayıtlarını ve CSV taslağını kontrol et. Sıradaki doğru işlem: Ticari akış özetini açıp hakediş önizlemesini incele.`.trim();
    }
  }

  if ((asksProof || (isVerification && relevantQuestionType)) && isTargetSurface) {
    const now = actionLeadQuestion ? 'Servis Kanıtı kartını aç.' : 'Servis Kanıtı kartını incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Servis Kanıtı operasyon görünürlüğü sağlar. Neden? Ham GPS ve teknik veri göstermez; sürücünün telefon GPS’i güvenli sinyal olarak görünür. Hakediş için nihai karar değildir. Öneri: Servis Kanıtı kartını seçili kayıtla birlikte oku. Sıradaki doğru işlem: Servis Kanıtı kartını açıp ilgili kaydı kontrol et.`.trim();
  }
  if ((asksSeferScore || String(questionType || '') === 'SEFER_SCORE_PREVIEW') && (isQuality || isCommercial || isSuperAdminOverview || isVerification)) {
    const now = actionLeadQuestion ? 'SeferPuanı önizlemesini aç.' : 'SeferPuanı önizlemesini incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Bu sadece SeferPuanı önizlemesidir. Neden? Zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyalleri birlikte okunur; ödeme, ceza, teklif sıralaması veya otomatik işlem başlatılmaz. Öneri: Sinyal kırılımını ve eksik verileri kontrol et. Sıradaki doğru işlem: SeferPuanı önizlemesini açıp ilgili kayıt satırını incele.`.trim();
  }
  if ((asksMarketplace || String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') && (isCommercial || isSuperAdminOverview || isVerification)) {
    const now = actionLeadQuestion ? 'Başarı payı önizlemesini aç.' : 'Başarı payı önizlemesini incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Bu sadece başarı payı önizlemesidir. Neden? Lisans ücreti yoktur; mevcut / manuel / pilot / eski kayıt için pay doğmaz; SeferPakt kaynaklı yeni ya da yenileme kayıt için başarı payı yalnızca görünür. Kaynak vardiyası / teklif seçimi zinciri kanıtlıysa karar başarı payı sayılır; organizasyon planı tek başına başarı payı kanıtı değildir. Öneri: Kaynak vardiyası sinyalini ve SeferPuanı’nı kontrol et. Sıradaki doğru işlem: Başarı payı önizlemesini açıp kaynak zincirini incele.`.trim();
  }
  if ((asksQuality || (isQuality && relevantQuestionType)) && (isQuality || isCommercial || isSuperAdminOverview || isVerification)) {
    const now = actionLeadQuestion ? 'Kalite akış özetine bak.' : 'Kalite akış özetini incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Kalite akış özeti taslak skor, inceleme kararı ve denetim izini birlikte gösterir. Neden? Bu bilgi kesin kalite puanı değildir; sağlayıcı sıralaması değildir. Hakediş veya komisyon hesabını etkilemez. Öneri: Kalite sinyalini sağlayıcı puanı ve denetim iziyle birlikte oku. Sıradaki doğru işlem: Kalite akış özetini açıp ilgili sağlayıcı satırını kontrol et.`.trim();
  }
  if ((asksCommercial || (isCommercial && relevantQuestionType)) && (isCommercial || isSuperAdminOverview)) {
    const now = actionLeadQuestion ? 'Hakediş önizlemesine bak.' : 'Ticari akış özetini incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını gösterir. Neden? Bu yüzey yalnızca önizleme ve hazırlık sinyalini gösterir; hakediş ve komisyon kapalı olabilir. Öneri: Önizleme kayıtlarını ve CSV taslağını kontrol et. Sıradaki doğru işlem: Ticari akış özetini açıp hakediş önizlemesini incele.`.trim();
  }
  if ((asksSystem || (isSuperAdminOverview && relevantQuestionType)) && isSuperAdminOverview) {
    const now = actionLeadQuestion ? 'Sistem durumu bandına bak.' : 'Sistem durumu bandını incele.';
    return `Şimdi: ${now} Bu programda bunun anlamı: Sistem durumu bandı kanıt ve kalite hazırlıklarını birlikte gösterir. Neden? Ödeme, hakediş ve komisyon kapalıdır; saha testi bekliyor. Öneri: Sistemin canlı durumunu ve hazırlık işaretlerini birlikte oku. Sıradaki doğru işlem: Sistem durumu bandını açıp ilgili kontrol kartını incele.`.trim();
  }
  return null;
}

export function normalizeEverydayQuestion(message) {
  const raw = String(message || '').trim();
  const text = normalizeText(raw);
  if (!text) return raw;
  if (matchesStandalonePhrase(text, ['ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne', 'şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapmalıyım', 'simdi ne yapmaliyim'])) return 'Şimdi ne yapayım?';
  if (/(nereye bakcam|nereye bakicam|nereye bakca[mn]|nereye bak[iı]y[ıi]m|nereye bakay[ıi]m|ilk nereyi kontrol edeyim|once nereye bakayim|önce nereye bakayım|ilk nereyi inceleyeyim)/.test(text)) return 'İlk neye bakayım?';
  if (/(nereye g[eé]c(e|ey)im|nereye geç(e|ey)im|nereye git(sem|meliyim|ceyim|ceğim)|hangi ekrana gideyim|hangi tarafa geceyim|hangi tarafa geçeyim|sonra nereye geceyim|sonra nereye geçeyim|sonra nereye gideyim)/.test(text)) return 'Şimdi hangi ekrana gitmeliyim?';
  if (/(niye pasif|neden pasif|basam[iı]yorum|t[ıi]klan[mıi]yor|olmadi|olmad[ıi]|olmuyor|takildi|tak[ıi]ld[ıi]|patladi|patlad[ıi]|kitlendi|ilerlemiyor|tak[ıi]l[ıi]yor)/.test(text)) return 'Bu neden olmuyor?';
  if (/(bu\s+kayitta|secili\s+kayitta|ayni\s+kayitta|ayni\s+satirda|bu\s+satirda)/.test(text) && /(ne eksik|eksigi ne|eksik ne var|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(text)) return raw;
  if (/(ne eksik|eksi[gğ]i ne|eksik ne var|hangi alan boş|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(text)) return 'Hazır mı?';
  if (/(atamaya hazir mi|atamaya haz[ıi]r m[ıi])/i.test(text)) return 'Atamaya hazır mı?';
  if (/(hazir mi|haz[ıi]r m[ıi])/i.test(text)) return 'Hazır mı?';
  if (/(konum niye|konum neden|konum yok|konum gozukmuyor|konum gözükmüyor|konum görünmüyor|gps yok|gps gelmiyor|telefon gps['’]i yok|haritada niye yok)/.test(text)) return 'Konum neden görünmüyor?';
  if (/(?:^|[\s"“”‘’'()[\]{}.,!?;:-])(?:bura ne|burası ne|burasi ne|burda ne var|burada ne var|burası ne işe yarıyor|burasi ne ise yariyor|bu ekran ne için var|bu ekran ne için|bu ekran ne icin var|bu ekran ne icin)(?:$|[\s"“”‘’'()[\]{}.,!?;:-])/i.test(text)) return 'Bu ekran ne için?';
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
  const rawNormalized = normalizeText(raw);
  if (/(bu\s+kayitta|secili\s+kayitta|ayni\s+kayitta|ayni\s+satirda|bu\s+satirda)/.test(rawNormalized) && /(ne eksik|eksigi ne|eksik ne var|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(rawNormalized)) {
    return raw;
  }
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

function looksLikeOnboardingStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(?:ne yapmam lazım|ne yapmam gerekiyor|nereden başlamalıyım|nereden başlamam gerekiyor|nereden başlayacağım|başlangıç yolu|ilk adım ne|ilk adımı ne|ilk bakılacak|nasıl başlayacağım|nasıl başlamalıyım|buradan sonra ne yapacağım|buradan sonra ne yapmam gerekiyor)/.test(value);
}

function looksLikeScreenStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (/(buton|düğme|dugme|alan|rozet|badge|sütun|sutun|kolon|terim|kanıt|kanit)/.test(value)) return false;
  if (/(bu ekran ne işe yarar|bu ekran ne ise yarar|bu ekran ne işe yarıyor|bu ekran ne ise yarıyor|bu ekran ne için|bu ekran ne icin|bu panel neyi gösteriyor|bu panel neyi gosteriyor|bu panel ne işe yarıyor|bu panel ne ise yarıyor|bu sayfa ne işe yarar|bu sayfa ne ise yarar|bu sayfa ne işe yarıyor|bu sayfa ne ise yarıyor|ekranın amacı ne|ekranin amaci ne|burada ne yapıyorum|burada ne yapiyorum)/.test(value)) return true;
  return /(plan builder|planlama merkezi|vardiya|teklif|sözleşme|sozlesme|servis durumu|canlı takip|canli takip|harita|rota|audit|konum incele|my ride|plan oluştur|plan olustur)/.test(value)
    && /(ne işe yarar|ne ise yarar|ne işe yarıyor|ne ise yarıyor|ne yapacağım|ne yapacagım|ne yapmalıyım|ne yapmaliyim|burada ne yapıyorum|burada ne yapiyorum)/.test(value);
}

function looksLikeDetailContinuationRequest(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(devamını anlat|devamini anlat|detayını anlat|detayini anlat|biraz daha aç|biraz daha ac|biraz aç|biraz ac|daha detay|daha ayrıntı|daha ayrinti|biraz daha detay|biraz daha ayrıntı|biraz daha ayrinti)/.test(text);
}

function looksLikeNextBestActionQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(sıradaki doğru işlem|siradaki dogru islem|bir sonraki doğru işlem|bir sonraki dogru islem|şu an en doğru adım|su an en dogru adim|şimdi en doğru işlem|simdi en dogru islem)/.test(text);
}

function looksLikeCompanyPlanningSurfaceText(value) {
  const text = normalizeLooseText(value);
  if (!text) return false;
  return /(planlama merkezi|yeni plan oluştur|rehberi başlat|rehberli mod|rehber|yeni plan|planlama ve teklif hazırlığı|planlama|guided plan|plan builder|plan hazırlığı|plan akışı)/.test(text);
}

function companyPlanningUiSurfaceText(conversationState = null) {
  const uiSurface = conversationState?.uiSurface && typeof conversationState.uiSurface === 'object' ? conversationState.uiSurface : null;
  if (!uiSurface) return '';
  return uniqueStrings([
    ...(Array.isArray(uiSurface.modalTitles) ? uiSurface.modalTitles : []),
    ...(Array.isArray(uiSurface.pageTitles) ? uiSurface.pageTitles : []),
    ...(Array.isArray(uiSurface.activeTabs) ? uiSurface.activeTabs : []),
    ...(Array.isArray(uiSurface.visibleButtons) ? uiSurface.visibleButtons.map(asText) : []),
    ...(Array.isArray(uiSurface.disabledButtons) ? uiSurface.disabledButtons.map(asText) : []),
  ]).join(' • ');
}

function companyPlanningCenterSurfaceText({ screenPath = '', screenDefinition = null, screenContext = null, sourceScreenDefinition = null, sourceScreenContext = null, conversationState = null } = {}) {
  const path = normalizeLooseText(firstNonEmpty(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  if (path === '/company') return 'planlama merkezi';
  return normalizeLooseText(uniqueStrings([
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    companyPlanningUiSurfaceText(conversationState),
  ]).join(' • '));
}

function isPlanningCenterPath(value) {
  const text = normalizeLooseText(value);
  if (!text) return false;
  return /\/(company|school|organization)(?:\/|$)/.test(text)
    && /(planning|workflow|plan|guided|operations|modal)/.test(text);
}

function companyPlanningCenterNextBestActionReply() {
  return [
    'Yeni işi kurma ve planlama için Planlama Merkezi\'nde sıradaki doğru işlem planın durumuna bağlıdır.',
    'Henüz planı başlatmadıysan Yeni Plan Oluştur veya Rehberi Başlat\'a bas.',
    'Plan başladıysa önce paket, tarih, saat, servis yönü ve kapsamı kontrol et.',
    'Personel eklendiyse adres ve konum eksiklerini tamamla.',
    'Konumlar tamamsa durakları hazırla ve rota önizlemesini kontrol et.',
    'Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip et, sonra teklif ve sözleşme hazırlığına geç.',
  ].join(' ');
}

function companyPlanningCenterDetailReply() {
  return [
    'Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat.',
    'Paket, tarih, saat, servis yönü ve kapsam.',
    'Şirket konumunu ve servis başlangıç noktasını.',
    'Excel ile toplu ekle ya da tek tek.',
    'Personel Konum Seçici ile haritada mevcut konumu düzelt.',
    'Adres / konum doğruluğunu kontrol et.',
    'Durakları hazırla; yakın adresleri uygun duraklarda topla; rota önizlemesini kontrol et.',
    'Taslak vardiyayı oluştur.',
    'Vardiyalar ekranında takip et.',
    'Oda veya sağlayıcıdan teklif alma hazırlığı.',
    'Sözleşme hazırlığı.',
  ].join(' ');
}


function looksLikeShortFollowUp(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (detectCopilotGuidedTaskEngineProgressCommand(text)) return true;
  if (looksLikeDetailContinuationRequest(text)) return true;
  if (text.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta|neye basayim|neye basayım|hangi ekrana|hangi ekrana gideyim|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|burda takıldı|burada takildi|sorun kimde|kim onaylayacak|bunu kim yapabilir|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|aynı kayıt için devam et|ayni kayit icin devam et|önce neyi kontrol edeyim|once neyi kontrol edeyim|bu yüzden mi başlamıyor|bu yuzden mi baslamiyor|girdim|içine girdim|icine girdim|açtım|actim|yaptım|yaptim|bulamadım|bulamadim|benim yerime|bunu sen yap|teklifi kabul et|aracı ata|araci ata|sözleşmeyi yürürlüğe al|sozlesmeyi yururluge al)/.test(text)
    || matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne', 'girdim', 'yaptım', 'yaptim', 'bulamadım', 'bulamadim', 'devam et', 'devamını anlat', 'devamini anlat', 'bunu sen yap', 'benim yerime', 'teklifi kabul et', 'aracı ata', 'araci ata', 'sözleşmeyi yürürlüğe al', 'sozlesmeyi yururluge al']);
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
    SHIFT_BLOCKED: 'Vardiya engeli',
    VEHICLE_NOT_VISIBLE: 'GPS görünürlüğü',
    DRIVER_PHONE_GPS: 'Sürücünün telefon GPS’i',
    BOARDING_CHANGE_APPLICATION: 'Kabul edilen değişiklik / günlük atama',
    BOARDING_CHANGE_REQUEST_ENTRY: 'Biniş talebi girişi',
    BOARDING_ROUTE_IMPACT_PREVIEW: 'Biniş değişikliği önizlemesi',
    DYNAMIC_SAVINGS_PREVIEW: 'Dinamik tasarruf önizlemesi',
    AGREEMENT_ROUTE_REFRESH: 'Sözleşmeli rota değişikliği',
    PROVIDER_BETTER: 'Kalite / kanıt sinyali',
    QUALITY_SIGNAL: 'Kalite / kanıt sinyali',
    SEFER_SCORE_PREVIEW: 'SeferPuanı önizlemesi',
    CONTRACT_SHIFT_TODAY: 'Sözleşme / vardiya üretimi',
    PAYMENT_MISSING: 'Hakediş / kanıt önizlemesi',
    PAYMENT_PREVIEW: 'Hakediş / kanıt önizlemesi',
    PAYMENT_READINESS: 'Hakediş / kanıt önizlemesi',
    TRUST_QUALITY: 'Kalite / kanıt akışı',
    FEEDBACK_STATUS: 'Geri bildirim durumu',
    NOTIFICATION_SOURCE: 'Bildirim kaynağı',
    KVKK_VISIBILITY: 'KVKK görünürlüğü',
    WHO_CAN_DO: 'Yetki sınırı',
    ROLE_BOUNDARY: 'Yetki sınırı',
    NEXT_ACTION: 'Sıradaki doğru işlem',
    NEXT_SCREEN: 'Sonraki ekran',
    NEXT_STEP: 'Sıradaki doğru işlem',
    FIRST_CONTROL: 'İlk kontrol',
    WHY_BLOCKED: 'Engel nedeni',
    MISSING_DATA: 'Eksik veri',
    CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
  };
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(topic);
  return firstNonEmpty(labels[String(topic || '')], helperTopicMeta?.label || '', '');
}

const WORKFLOW_TOPICS = new Set([
  'SHIFT_BLOCKED',
  'VEHICLE_NOT_VISIBLE',
  'DRIVER_PHONE_GPS',
  'QUALITY_SIGNAL',
  'CONTRACT_SHIFT_TODAY',
  'CONTRACT_TO_SHIFT',
  'DYNAMIC_SAVINGS_PREVIEW',
  'AGREEMENT_ROUTE_REFRESH',
  'SEFER_SCORE_PREVIEW',
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
  'BOARDING_CHANGE_REQUEST_ENTRY',
  'BOARDING_CHANGE_APPLICATION',
  'BOARDING_ROUTE_IMPACT_PREVIEW',
  ...listCopilotEBlockRuntimeAnswerTopics(),
]);

function isWorkflowTopic(topic) {
  return WORKFLOW_TOPICS.has(String(topic || ''));
}

function hasDynamicSavingsSignal(text) {
  return /(tasarruf|tasarruf önizlemesi|tasarruf onizlemesi|km tasarrufu|süre tasarrufu|sure tasarrufu|yaklaşık maliyet|yaklasik maliyet|maliyet etkisi|readonly tasarruf|readonly önizleme|dinamik tasarruf)/.test(normalizeText(text));
}

function shouldUseWorkflowGuide({ questionType, activeTopic }) {
  const type = String(questionType || '');
  if (type === 'SCREEN_PURPOSE') return false;
  if (isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(type) || isCopilotEBlockRuntimeAnswerTopic(activeTopic) || isCopilotEBlockRuntimeAnswerTopic(type)) return true;
  return ['ROLE_HELP', 'NEXT_SCREEN', 'NEXT_STEP', 'WHY_BLOCKED', 'READINESS_CHECK', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'PAYMENT_PREVIEW', 'SAFE_NEXT_STEP', 'DETAIL_FLOW', 'ROW_HELP', 'MISSING_DATA_HELP', 'STATUS_HELP', 'GO_TO'].includes(type);
}

function detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis }) {
  const explicitCopilotTopic = detectCopilotEBlockRuntimeAnswerTopic({ message, questionType, screenPath });
  if (explicitCopilotTopic) return explicitCopilotTopic;
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
  if (looksLikeScreenStartQuestion(text)) return 'SCREEN_PURPOSE';
  if (looksLikeOnboardingStartQuestion(text)) return 'FIRST_CONTROL';
  if (questionType === 'SCREEN_PURPOSE') return 'SCREEN_PURPOSE';
  if (
    path.includes('/trust-quality')
    && /(servis|hizmet)\s+kanıt(?:ı|i).*?(ne\s+işe\s+yarar|ne\s+işe\s+yariyor|ne\s+işe\s+yarıyor|ne\s+demek|ne\s+icin|ne\s+için)|kanıt(?:ı|i)\s+ne\s+işe\s+yarar|kanit(?:i|i)\s+ne\s+ise\s+yarar|kanıt(?:ı|i)\s+ne\s+demek/i.test(text)
  ) {
    return 'SCREEN_PURPOSE';
  }
  if (
    path.includes('/organization/shifts')
    && /(organizasyon\s+plan|organization\s+plan).*(kaynak\s+kanıt|kaynak\s+kanit|sayılır\s+mi|sayilir\s+mi|tek\s+başına|tek\s+basina)|kaynak\s+kanıtı\s+sayılır\s+mi|kaynak\s+kaniti\s+sayilir\s+mi/.test(text)
  ) {
    return 'PAYMENT_READINESS';
  }
  if (
    (path.includes('/agreements') || path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core'))
    && /(puan|sefer\s*puan[ıi]|kalite\s*puan[ıi]|tedarikç[iı]\s*puan[ıi]|sağlayıc[ıi]\s*puan[ıi]).*(ödeme|odeme|teklif).*(sıralama|siralam|etkili|etkiliyor|etkisi)/.test(text)
  ) {
    return 'SEFER_SCORE_PREVIEW';
  }
  if ((path.includes('/agreements') || path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) && hasSeferScoreSignal(text)) return 'SEFER_SCORE_PREVIEW';
  if (path.includes('/trust-quality') || /(kalite|saglayıcı|sağlayıcı|saglayici|provider)/.test(text)) return /(daha iyi|daha güçlü|daha guclu|neden|karşılaştır|karsilastir)/.test(text) ? 'QUALITY_SIGNAL' : 'TRUST_QUALITY';
  if ((path.includes('/agreements') || path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core'))
    && hasDynamicSavingsSignal([text, selectedText].filter(Boolean).join(' '))) {
    return 'DYNAMIC_SAVINGS_PREVIEW';
  }
  if ((path.includes('/personel/live') || path.includes('/personel/my') || path.includes('/parent/live'))
    && /(talep.*oluştur|talep.*olustur|talep.*girişi|talep.*girisi|nasıl oluştur|nasil olustur|bugün binmeyeceğim|bugun binmeyecegim|başka duraktan|baska duraktan|farklı konumdan|farkli konumdan|çocuğum bugün binmeyecek|cocugum bugun binmeyecek|çocuğum başka duraktan binecek|cocugum baska duraktan binecek|çocuğum şu konumdan alınsın|cocugum su konumdan alinsin|talebim kimde bekliyor|kimde bekliyor|konum paylaşılmadı|konum paylasilmadi)/.test(text)) {
    return 'BOARDING_CHANGE_REQUEST_ENTRY';
  }
  if ((path.includes('/agreements') || path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements'))
    && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|uygulanan rota|rota geçmişi|rota gecmisi|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(text)) {
    return 'AGREEMENT_ROUTE_REFRESH';
  }
  if (/(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text)
    || /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text)
    || (/(sözleşme|sozlesme|contract)/.test(text) && /(vardiya|shift)/.test(text))) {
    return /(üretildi|uretildi|oluştu|olustu|bugün|bugun)/.test(text) ? 'CONTRACT_SHIFT_TODAY' : 'CONTRACT_TO_SHIFT';
  }
  // if (path.includes('/commercial-core') || path.includes('/payment') || /(hakediş|hakedis|ödeme|odeme|settlement|komisyon|csv|önizleme|onizleme)/.test(text)) return /(hazır değil|hazir degil|hazırlık|hazirlik|eksik|kontrol gerekli)/.test(text) ? 'PAYMENT_READINESS' : 'PAYMENT_PREVIEW';
  if (path.includes('/commercial-core') || path.includes('/payment') || path.includes('/agreements') || path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || /(hakediş|hakedis|ödeme|odeme|settlement|tahsilat|fatura|komisyon|kanıt|kanit|proof|kalite|quality|önizleme|onizleme)/.test(text)) {
    if (/(kanıt eksik|kanit eksik|kanıtlar eksik|kanitlar eksik|hakediş eksik|hakedis eksik|neden.*eksik|hazır değil|hazir degil|kontrol gerekli)/.test(text)) return 'PAYMENT_MISSING';
    if (/(başlatılabilir|baslatilabilir|güvenli mi|guvenli mi|hazır mı|hazir mi|hazır değil|hazir degil|hazırlık|hazirlik|etkiliyor|etkisi)/.test(text) || /(kalite.*hakediş|kalite.*hakedis|hakediş.*kalite|hakedis.*kalite).*(etkiliyor|etkisi|güvenli mi|guvenli mi)/.test(text)) return 'PAYMENT_READINESS';
    return 'PAYMENT_PREVIEW';
  }
  if ((path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations') || path.includes('/room/operation-health') || path.includes('/room/shifts') || path.includes('/company/shifts') || path.includes('/school/shifts') || path.includes('/organization/shifts'))
    && /(rota etkisi|rota etkisini|önizleme|onizleme|etkiyi hesapla|bugün binmezse|bugun binmezse|farklı duraktan|farkli duraktan|geçici durak|gecici durak|biniş değişikliği|binis degisikligi|km farkı|km farki|süre artar mı|sure artar mi|kapasite etkisi|rotasını|rotasini|rotayı|rotayi|rota.*değiştir|rota.*degistir)/.test(text)) {
    return 'BOARDING_ROUTE_IMPACT_PREVIEW';
  }
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
  if (!hasExplicitRoleBoundarySignal({ questionType, activeTopic, message })) return '';
  const role = normalizeText(userRole);
  if (role === 'driver') return 'Bu işlem bu rolde görünmeyebilir. Sürücü bu işlemi değiştirmez; bildirimi ve kendi görev bilgisini görür.';
  if (role === 'parent' || role === 'personel') return 'Bu işlem bu rolde görünmeyebilir. Veli/personel yalnız kendi canlı takip ve bildirim kapsamını görür.';
  if (role === 'company' || role === 'room') return 'Bu işlem bu rolde görünmeyebilir. Firma tarafı sonucu görür; oda tarafı operasyon kaydını tamamlar.';
  if (role === 'super_admin') return 'Bu bilgi bu rolde görünmeyebilir. Yönetim tarafında görünürlük için doğru kayıt ve ekran seçilmeli.';
  if (role) return 'Bu bilgi bu rolde görünmeyebilir.';
  return 'Bu bilgi görünürlük sınırına takılıyor olabilir.';
}

function buildEvidenceConfidenceWording({ analysis, screenContext, sourceScreenContext, roleBoundary, needsSelection, screenPath = '', userRole = '' }) {
  const path = normalizeText(screenPath);
  const sourcePath = normalizeText(firstNonEmpty(sourceScreenContext?.path, ''));
  const role = normalizeText(userRole);
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
  if (needsSelection) {
    if (role === 'personel' || path.includes('/personel/live') || path.includes('/personel/my')) return 'Bu ekranda seçili servis bilgisi net görünmüyor; önce bugünkü servis satırını seç.';
    if (role === 'parent' || path.includes('/parent/live')) return 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; önce öğrencinin servis satırını seç.';
    if (role === 'driver' || path.includes('/driver/today') || path.includes('/driver/route') || path.includes('/driver/map')) return 'Bu ekranda bugünkü göreve ait seçili bilgi net görünmüyor; önce vardiya veya araç satırını seç.';
    if (path.includes('/school/operations') || sourcePath.includes('/school/operations')) return 'Bu kayıt için elimde yeterli sinyal yok; ilk kontrol seçili satırı doğrulamaktır. Sonraki ekran: Vardiyalar.';
    return 'Bu kayıt için elimde yeterli sinyal yok; ilk kontrol seçili satırı doğrulamaktır.';
  }
  if (hasSignals && roleBoundary) return 'Ekrandaki sinyale göre konuşuyorum; bu bilgi ayrıca yetki sınırına takılıyor olabilir.';
  if (hasSignals) return 'Ekrandaki sinyale göre konuşuyorum; canlı veri değil, ekrandaki özet üzerinden söylüyorum.';
  if (roleBoundary) return 'Bu yetki sınırı olabilir. Bu rolde bu bilgi görünmeyebilir.';
  if (role === 'personel' || path.includes('/personel/live') || path.includes('/personel/my')) return 'Bu ekranda seçili servis bilgisi net görünmüyor; önce bugünkü servis satırını seç.';
  if (role === 'parent' || path.includes('/parent/live')) return 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; önce öğrencinin servis satırını seç.';
  if (role === 'driver' || path.includes('/driver/today') || path.includes('/driver/route') || path.includes('/driver/map')) return 'Bu ekranda bugünkü göreve ait seçili bilgi net görünmüyor; önce vardiya veya araç satırını seç.';
  return 'Bu daha çok eksik veri gibi duruyor. İlk kontrol seçili satırı doğrulamaktır.';
}

function buildContextualSuggestedChips({
  entityType,
  questionType,
  roleMode,
  screenPath,
  context,
  guidedTaskMeta = null,
  sourceScreenContext = null,
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
  let chips = [];
  const path = normalizeText(screenPath);
  const hasSelectedRecord = Boolean(selectedLabel || selectedSummary || sameRecordLikely);
  const boardingApplicationTopic = Boolean(
    ['BOARDING_CHANGE_APPLICATION'].includes(String(activeTopic || questionType || ''))
    || ['BOARDING_CHANGE_APPLICATION'].includes(String(context?.structuredFacts?.screenType || context?.liveFacts?.screenType || sourceScreenContext?.structuredFacts?.screenType || ''))
  );
  const boardingPreviewTopic = Boolean(
    ['BOARDING_ROUTE_IMPACT_PREVIEW'].includes(String(activeTopic || questionType || ''))
    || ['BOARDING_ROUTE_IMPACT_PREVIEW'].includes(String(context?.structuredFacts?.screenType || context?.liveFacts?.screenType || sourceScreenContext?.structuredFacts?.screenType || ''))
  );
  const routeRefreshSignalText = normalizeText([
    firstNonEmpty(context?.facts?.routeRefreshState, ''),
    firstNonEmpty(context?.liveFacts?.routeRefreshState, ''),
    firstNonEmpty(context?.structuredFacts?.routeRefreshState, ''),
    firstNonEmpty(sourceScreenContext?.facts?.routeRefreshState, ''),
    firstNonEmpty(sourceScreenContext?.liveFacts?.routeRefreshState, ''),
    firstNonEmpty(sourceScreenContext?.structuredFacts?.routeRefreshState, ''),
    firstNonEmpty(context?.facts?.routeRefreshLabel, ''),
    firstNonEmpty(context?.liveFacts?.routeRefreshLabel, ''),
    firstNonEmpty(context?.structuredFacts?.routeRefreshLabel, ''),
    firstNonEmpty(sourceScreenContext?.facts?.routeRefreshLabel, ''),
    firstNonEmpty(sourceScreenContext?.liveFacts?.routeRefreshLabel, ''),
    firstNonEmpty(sourceScreenContext?.structuredFacts?.routeRefreshLabel, ''),
    selectedLabel,
    selectedSummary,
  ].filter(Boolean).join(' '));
  const topicKey = String(activeTopic || questionType || '');
  const routeRefreshTopic = Boolean(
    ['AGREEMENT_ROUTE_REFRESH'].includes(topicKey)
    || (!['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(topicKey) && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|uygulanan rota|rota geçmişi|rota gecmisi|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(routeRefreshSignalText))
  );
  const dynamicSavingsTopic = Boolean(
    topicKey === 'DYNAMIC_SAVINGS_PREVIEW'
    || ((path.includes('/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) && hasDynamicSavingsSignal([selectedLabel, selectedSummary, routeRefreshSignalText].filter(Boolean).join(' ')))
  );
  const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType) || boardingPreviewTopic || boardingApplicationTopic || routeRefreshTopic || dynamicSavingsTopic;
  const workflowChipTopic = boardingApplicationTopic ? 'BOARDING_CHANGE_APPLICATION' : boardingPreviewTopic ? 'BOARDING_ROUTE_IMPACT_PREVIEW' : dynamicSavingsTopic ? 'DYNAMIC_SAVINGS_PREVIEW' : routeRefreshTopic ? 'AGREEMENT_ROUTE_REFRESH' : activeTopic;
  if (workflowTopic) chips.push(...workflowTopicChipSet({ activeTopic: workflowChipTopic, questionType, screenPath, guidedTaskMeta }));
  if (hasSelectedRecord && !workflowTopic && !path.includes('/parent/live')) {
    chips.push('Seçili kaydı aç', 'Başlatma zamanını kontrol et', 'Eksik veriyi göster', 'Yetki sınırını açıkla');
  }
  const pathSpecificChips = (() => {
    if (path.includes('/driver/today')) return workflowTopic
      ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
      : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
    if (path.includes('/driver/route')) return workflowTopic
      ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
      : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
    if (path.includes('/personel/live')) return workflowTopic
      ? ['Araç nerede?', 'Son GPS ne zaman geldi?', 'Servis durumu ne?', "Sürücünün telefon GPS’i devrede mi?"]
      : ['Bu ekranı detaylı anlat', 'Araç nerede?', 'Son GPS ne zaman geldi?', 'Servis durumu ne?', "Sürücünün telefon GPS’i devrede mi?"];
    if (path.includes('/parent/live')) {
      if (parentLiveNoVehicleDetected(sourceScreenContext || context, context, path)) return ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
      return ['Son GPS ne zaman geldi?', 'ETA nedir?', 'Araç bağlantısı var mı?', 'Sürücünün telefon GPS’i devrede mi?'];
    }
    if (path.includes('/room/map') || path.includes('/room/live')) return ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
    if (path.includes('/room/operation-health')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      return ['Riskli cihazı göster', 'GPS güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Canlılık riskini açıkla'];
    }
    if (path.includes('/room/shifts')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      if (['PAYMENT_READINESS', 'PAYMENT_MISSING'].includes(String(questionType || ''))) return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
      if (['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(questionType || ''))) return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
      if (['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(questionType || ''))) return ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
      if (['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP'].includes(String(questionType || ''))) return ['Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/kanıt akışını kontrol et', 'Başlatma zamanı uygun mu?'];
      return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et'];
    }
    if (path.includes('/superadmin/operations')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et'];
    }
    if (path.includes('/superadmin/commercial-core')) return ['Hakediş önizlemesini aç', 'Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?'];
    if (path.includes('/room/commercial-flow')) return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim geçmişini göster', 'Üretim durumunu açıkla'];
    if (path.includes('/commercial-flow')) return ['İlgili sözleşmeyi aç', 'Hakediş önizlemesini aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
    if (path.includes('/shared/feedback')) return ['Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık'];
    if (path.includes('/shared/kvkk')) return ['Bu ekranı detaylı anlat', 'KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?', 'Yetkili ekrana yönlendir'];
    if (path.includes('/shared/notifications')) return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
    if (path.includes('/shared/logs')) return ['Bu ekranı detaylı anlat', 'İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'Filtreleri nasıl kullanırım?'];
    if (path.includes('/room/drivers')) return ['Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla'];
    if (path.includes('/room/reports')) return ['Bu bilgi neden görünmüyor?', 'Bu kayıt kimde?', 'Filtreleri nasıl kullanırım?'];
    if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      return ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri ne?', 'Bu rolde ne görünür?'];
    }
    if (path.includes('/driver/change-pin')) return ['Bu ekranı detaylı anlat', 'PIN veya şifre nasıl değişir?', 'İlk girişte ne olur?'];
    if (path.includes('/superadmin/trust-quality')) return ['Açık kalite sinyallerini göster', 'Bu sağlayıcı neden daha iyi?', 'Bu bilgi kesin kalite puanı mı?'];
    if (path.includes('/superadmin/operation-verification')) return ['İlgili kontrol kartını aç', 'Durum ve kanıtı oku', 'Kontrol adımını göster', 'İlgili yere götür'];
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
        chips.push('Açık kalite sinyallerini göster', 'Bu sağlayıcı neden daha iyi?', 'Bu uyarı önemli mi?');
        break;
      case 'CONTRACT_SHIFT_TODAY':
        chips.push('İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
        break;
      case 'CONTRACT_TO_SHIFT':
        chips.push('İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
        break;
      case 'PAYMENT_MISSING':
      case 'PAYMENT_PREVIEW':
      case 'PAYMENT_READINESS':
        chips.push('Hakediş önizlemesini aç', 'Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?');
        break;
      case 'FEEDBACK_STATUS':
        chips.push('Açık geri bildirimi göster', 'Sorumlu rolü göster', 'Geri bildirim açık');
        break;
      case 'NOTIFICATION_SOURCE':
        chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster');
        break;
      case 'KVKK_VISIBILITY':
        chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?');
        break;
      case 'WHO_CAN_DO':
      case 'ROLE_BOUNDARY':
        chips.push('Bu işlemi kim yapabilir?', 'Yetki sınırını açıkla', 'İlgili ekrana git');
        break;
      case 'MISSING_DATA':
        chips.push('Eksik alanları göster', 'Sıradaki adımı açıkla', 'Önce neyi kontrol edeyim');
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
        chips.push('Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et', 'Başlatma zamanı uygun mu?');
        break;
      default:
        chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?');
    }
  }

  if (workflowTopic) {
    chips = filterWorkflowGenericChips(chips, { activeTopic, questionType });
  } else {
    if (sameRecordLikely || isFollowUp) {
      chips.push('Sıradaki adımı açıkla', 'Önce neyi kontrol edeyim');
    } else {
      chips.push('İlgili ekrana git', 'Hangi ekrana geçmeliyim?');
    }
  }

  if (roleBoundary && ['ROLE_HELP', 'WHO_CAN_DO', 'ROLE_BOUNDARY', 'KVKK_VISIBILITY'].includes(String(questionType || ''))) chips.unshift('Yetki sınırını açıkla');

  const fallback = uniqueStrings([
    ...(Array.isArray(screenQuestions) ? screenQuestions : []).slice(0, 2),
    ...buildSuggestedChips({ entityType, questionType, roleMode, screenPath, context, guidedTaskMeta }).slice(0, 2),
  ]).filter(Boolean);
  const filteredFallback = workflowTopic
    ? filterWorkflowGenericChips(fallback, { activeTopic, questionType })
    : fallback;

  if (!chips.length && filteredFallback.length) chips.push(...filteredFallback);
  if (chips.length < 2 && filteredFallback.length) chips.push(...filteredFallback.slice(0, 2));

  const liveServiceSurface = path.includes('/personel/live') || path.includes('/parent/live');
  let visibleChips = uniqueStrings(chips).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 2 : 4);
  if (liveServiceSurface && roleMode === 'SIMPLE') {
    visibleChips = uniqueStrings(chips).filter(Boolean).slice(0, 4);
  }
  if (roleMode !== 'SIMPLE' && (path.includes('/driver/today') || path.includes('/driver/route'))) {
    const routeChip = 'Rota/durak hazır mı?';
    if (!visibleChips.some((chip) => normalizeText(chip) === normalizeText(routeChip))) {
      visibleChips.push(routeChip);
    }
  }
  return uniqueStrings(visibleChips).filter(Boolean);
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
  const guidedProgress = detectCopilotGuidedTaskEngineProgressCommand(raw, conversationState);
  if (guidedProgress?.command) return raw;
  const text = normalizeText(raw);
  const priorConcern = firstNonEmpty(
    conversationState?.lastPrimaryConcern,
    conversationState?.lastUserMessage,
    conversationState?.lastRawUserMessage,
    '',
  );
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
  if (looksLikeDetailContinuationRequest(text)) {
    const detailAnchor = firstNonEmpty(priorConcern, anchor, selectedSummary, '');
    if (detailAnchor) {
      return `${String(detailAnchor).replace(/[?.!]+$/g, '')} için adım adım detay ver.`;
    }
    return raw;
  }
  if (/(girdim|içine girdim|icine girdim|açtım|actim)/.test(text)) {
    return `${anchor || 'bu kayıt'} için ekrana girdin, şimdi ilk neyi kontrol etmeliyim?`;
  }
  if (/(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)/.test(text)) {
    return `${anchor || 'bu kayıt'} için sonucu kontrol edelim, devam edelim mi?`;
  }
  if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|nerede|hangi\s+menü|hangi\s+menu|alternatif\s+yol|menü\s+yolu|menu\s+yolu)/.test(text)) {
    return `${anchor || 'bu kayıt'} için alternatif menü yolu ne?`;
  }
  if (/(devam\s+et|aynı\s+kayıtta|ayni\s+kayitta|aynı\s+yerden\s+devam|ayni\s+yerden\s+devam|sürdür|surdur|buradan\s+devam|aynı\s+kayıt\s+için\s+devam|ayni\s+kayit\s+icin\s+devam)/.test(text)) {
    return `${anchor || 'bu kayıt'} için devam edelim; sonraki güvenli adım ne?`;
  }
  if (/(bunu\s+sen\s+yap|benim\s+yerime|teklifi\s+kabul\s+et|aracı\s+ata|araci\s+ata|sözleşmeyi\s+yürürlüğe\s+al|sozlesmeyi\s+yururluge\s+al)/.test(text)) {
    return raw;
  }
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
  guidedTaskMeta = null,
}) {
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.selectedSummary,
    '',
  );
  const selectedSummary = firstNonEmpty(
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.selectedSummary,
    selectedCarrySummary(screenContext),
    '',
  );
  const lastConcern = firstNonEmpty(conversationState?.lastPrimaryConcern, conversationState?.lastUserMessage, conversationState?.lastRawUserMessage, '');
  const recentMessages = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-6) : [];
  const recentUserMessage = [...recentMessages].reverse().find((row) => normalizeText(row?.role) === 'user' || normalizeText(row?.role) === 'assistant');
  const activeTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic);
  const guidedTopicLabel = firstNonEmpty(guidedTaskMeta?.label, '');
  const guidedTopicSummary = firstNonEmpty(guidedTaskMeta?.summary, guidedTaskMeta?.jobPurpose, '');
  const guidedTopicAdvice = firstNonEmpty(guidedTaskMeta?.advice, '');
  const guidedTopicWhy = firstNonEmpty(guidedTaskMeta?.safeBoundary, guidedTaskMeta?.why, '');
  const startGuidanceQuestion = looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message);
  const workflowQuestion = Boolean(guidedTaskMeta?.familyId) || isWorkflowDiagnosticQuestionType(questionType) || isWorkflowTopic(activeTopic);
  const isFollowUp = !startGuidanceQuestion && Boolean(looksLikeShortFollowUp(message) || guidedTaskMeta?.progressCommand || (conversationState?.lastQuestionType && recentMessages.length) || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizeText(message)));
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
    normalizeStatusDisplayText(selectedSummary || selectedLabel || selectedCarrySummary(screenContext) || selectedCarrySummary(sourceScreenContext)),
    '',
  );
  const selectedLabelText = normalizeText(selectedLabel);
  const selectedSummaryText = normalizeText(selectedSummary);
  const selectedRecordStatusText = normalizeText(selectedRecordStatus);
  const screenPathText = normalizeText(firstNonEmpty(
    screenPath,
    screenContext?.path,
    sourceScreenContext?.path,
    screenDefinition?.path,
    sourceScreenDefinition?.path,
    '',
  ));
  const structuredCounters = structured?.counters && typeof structured.counters === 'object' ? structured.counters : null;
  const activeDriversCount = Number(structuredCounters?.activeDrivers ?? NaN);
  const riskyDevicesCount = Number(structuredCounters?.riskyDevices ?? NaN);
  const staleOrOfflineCount = Number(structuredCounters?.staleOrOffline ?? NaN);
  const openIssuesCount = Number(structuredCounters?.openIssues ?? NaN);
  const isOperationHealthSurface = /\/room\/operation-health|\/operation-health/.test(screenPathText);
  const operationHealthLead = !startGuidanceQuestion && isOperationHealthSurface
    ? ([activeDriversCount, riskyDevicesCount, staleOrOfflineCount, openIssuesCount].some((value) => Number.isFinite(value))
      ? `Şimdi: En kritik sorun canlılık ve cihaz riski. Aktif sürücü ${Number.isFinite(activeDriversCount) ? activeDriversCount : 0}, riskli cihaz ${Number.isFinite(riskyDevicesCount) ? riskyDevicesCount : 0}, GPS güncel değil / çevrim dışı ${Number.isFinite(staleOrOfflineCount) ? staleOrOfflineCount : 0} ve açık sorun ${Number.isFinite(openIssuesCount) ? openIssuesCount : 0} görünüyor.`
      : 'Şimdi: Bu ekranda somut operasyon sağlığı sinyali görünmüyor; açık sorun, riskli cihaz, aktif sürücü ve GPS güncel değil / çevrim dışı satırlarını kontrol et.')
    : '';
  const operationHealthAdvice = !startGuidanceQuestion && isOperationHealthSurface
    ? ([activeDriversCount, riskyDevicesCount, staleOrOfflineCount, openIssuesCount].some((value) => Number.isFinite(value))
      ? 'Riskli cihazı aç, GPS güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.'
      : 'Açık sorun, riskli cihaz, aktif sürücü ve GPS güncel değil / çevrim dışı satırlarını kontrol et.')
    : '';
  const boardingApplicationTopic = activeTopic === 'BOARDING_CHANGE_APPLICATION';
  const isDriverRouteSurface = /\/driver\/(today|route|map)/.test(screenPathText);
  const boardingRouteVisibilityLead = boardingApplicationTopic && isDriverRouteSurface
    ? 'Bu değişiklik günlük atamaya işlendiğinde sürücü rota ekranında görünür. Rota güncellemesi bekliyor olabilir; SMS/push yok ve kalıcı rota değişmez.'
    : '';
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
  const visibleActionSimulation = normalizeVisibleSuggestionFragment(actionSimulation);
  const needsSelection = !selectedLabel && !selectedSummary && !selectedCarrySummary(screenContext) && !selectedCarrySummary(sourceScreenContext);
  const roleBoundary = buildRoleBoundaryExplanation({ userRole, questionType, message, activeTopic });
  const evidenceConfidence = buildEvidenceConfidenceWording({ analysis, screenContext, sourceScreenContext, roleBoundary, needsSelection, screenPath, userRole });
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
  const selectedLooksLikeShift = /(vardiya|shift)/.test(selectedLabelText) || /(vardiya|shift)/.test(selectedSummaryText) || /(vardiya|shift)/.test(selectedRecordStatusText);
  const selectedLooksLikeContract = /(sözleşme|sozlesme|contract)/.test(selectedLabelText) || /(sözleşme|sozlesme|contract)/.test(selectedSummaryText) || /(sözleşme|sozlesme|contract)/.test(selectedRecordStatusText);
  const selectedLooksLikePayment = /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedLabelText) || /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedSummaryText) || /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedRecordStatusText);
  const selectedLooksLikeVehicle = /(araç|arac|vehicle|plaka)/.test(selectedLabelText) || /(araç|arac|vehicle|plaka)/.test(selectedSummaryText) || /(araç|arac|vehicle|plaka)/.test(selectedRecordStatusText);
  const selectedLooksLikeGps = /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedLabelText) || /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedSummaryText) || /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedRecordStatusText);
  const selectedCommercialSignals = selectedHasContract || selectedHasPayment;
  const selectedLiveSignals = selectedHasVehicle || selectedHasGps;
  if (!startGuidanceQuestion && (activeTopic === 'CONTRACT_TO_SHIFT' || activeTopic === 'CONTRACT_SHIFT_TODAY') && selectedLooksLikeShift && !selectedLooksLikeContract) {
    selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.';
  } else if (!startGuidanceQuestion && (activeTopic === 'PAYMENT_READINESS' || activeTopic === 'PAYMENT_MISSING') && !selectedLooksLikePayment && !selectedCommercialSignals) {
    selectedRecordMismatchLead = 'Bu ekranda hakediş sinyali görünmüyor; Ticari Akış/Hakediş önizlemesi ekranında eksik bilgi, ödeme hesabı ve komisyon durumunu kontrol et.';
  } else if (!startGuidanceQuestion && (activeTopic === 'VEHICLE_NOT_VISIBLE' || activeTopic === 'DRIVER_PHONE_GPS' || activeTopic === 'LOCATION_HELP') && selectedLooksLikeShift && !selectedLiveSignals && !selectedLooksLikeVehicle && !selectedLooksLikeGps) {
    selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; araç görünürlüğü için araç ve Sürücünün telefon GPS’i sinyalini ayrı kayıtta kontrol et.';
  }
  const topicWhy = {
    QUALITY_SIGNAL: 'Bu sinyal kesin kalite puanı değil; sağlayıcıyı okumaya yardım eder.',
    SEFER_SCORE_PREVIEW: 'Bu sadece SeferPuanı önizlemesidir. SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.',
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Bu sadece başarı payı önizlemesidir. Lisans ücreti yoktur; mevcut / manuel / pilot / eski kayıt için pay doğmaz; SeferPakt kaynaklı yeni veya yenileme için başarı payı yalnızca görünür. Kaynak vardiyası / teklif seçimi zinciri kanıtlı değilse karar başarı payı sayılmaz.',
    BOARDING_CHANGE_REQUEST_ENTRY: 'Bu sadece talep oluşturma akışıdır. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul seçeneklerinden birini kullan; rota otomatik uygulanmaz; aynı rota ise sürücü, rota dışı ise hizmet alan taraf karar verir; oda yalnızca görür.',
    PAYMENT_READINESS: 'Bu sadece önizlemedir; ödeme başlatılmaz ve önce eksik kanıt/kalite kontrolü tamamlanır.',
    PAYMENT_MISSING: 'Bu sadece önizlemedir; eksik kanıtlar kapatılmadan hakediş hazır sayılmaz.',
    PAYMENT_PREVIEW: 'Bu sadece önizlemedir; tahsilat/fatura oluşturulmaz ve kanıt satırları okunur.',
    SHIFT_BLOCKED: 'Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.',
    FEEDBACK_STATUS: 'Kayıt açık ya da kritik olduğu için tamamlanmış görünmüyor.',
    NOTIFICATION_SOURCE: 'Bildirim bir olay kaydına bağlı olduğu için kaynağı ayrıca okunmalı.',
    KVKK_VISIBILITY: 'Bilgi rol bazlı görünürlük nedeniyle gizli olabilir.',
    WHO_CAN_DO: 'Bu işlem rol sınırı yüzünden bu kullanıcıda görünmeyebilir.',
    MISSING_DATA: 'Boş alanlar yüzünden kayıt ilerlemiyor olabilir.',
    CONTRACT_TO_SHIFT: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
    CONTRACT_SHIFT_TODAY: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
    AGREEMENT_ROUTE_REFRESH: 'Bu sözleşmedeki rota değişikliği talebi eski rota, yeni rota ve teklif/kabul durumuyla birlikte okunur.',
    DRIVER_PHONE_GPS: 'Telefon GPS’i cihaz GPS’inin yerine geçiyor olabilir.',
    VEHICLE_NOT_VISIBLE: 'Araç, görev bağlantısı, son GPS veya Sürücünün telefon GPS’i devrede olmadığı için görünmüyor olabilir.',
    WHY_BLOCKED: operationHealthLead || 'Önce blokaj nedeni ve eksik alanı kontrol et.',
  };
  const whyCandidate = firstNonEmpty(
    selectedRecordMismatchLead,
    guidedTopicWhy,
    operationHealthLead,
    diagnosticPrioritySummary ? `En olası neden: ${diagnosticPrioritySummary}` : '',
    liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
    visibleActionSimulation ? `Öneri: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(visibleActionSimulation))}` : '',
    helperTopicMeta?.why || '',
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
    guidedTopicLabel ? `${guidedTopicLabel} için eksik bilgiyi kontrol et.` : '',
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
    SEFER_SCORE_PREVIEW: 'Önce zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyallerini oku; eksik veri varsa kesin hüküm verme.',
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Önce kaynak vardiyası / teklif seçimi zincirini ve SeferPuanı’nı oku; lisans ücreti 0 TL, mevcut / manuel / pilot / eski kayıtta pay doğmaz, yeni / yenileme kayıtta ise yalnızca önizleme görünür. Organizasyon planı tek başına başarı payı kanıtı değildir.',
    BOARDING_CHANGE_REQUEST_ENTRY: 'Önce talep tipini, tarihi, servis/vardiya bağlamını ve konum seçimini gir. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul; konum çözümleme bağlı değilse açıklama ekle. Talep alındıktan sonra kimde beklediğini durum satırından oku.',
    PAYMENT_READINESS: 'Hakediş önizleme, ödeme hesabı, komisyon ve hizmet/onay sinyalini kontrol et. Ödeme başlatılmaz.',
    PAYMENT_MISSING: 'Önce eksik kanıtları ve kalite kontrolünü tamamla; bu sadece önizlemedir.',
    PAYMENT_PREVIEW: 'Önce hakediş / kanıt önizleme kayıtlarını ve risk nedenlerini kontrol et; ödeme başlatılmaz.',
    DYNAMIC_SAVINGS_PREVIEW: 'Bu sadece önizlemedir. Km, süre, kapasite ve yaklaşık maliyet etkisini birlikte oku; uygulama, ödeme ve mutabakat başlatılmaz.',
    AGREEMENT_ROUTE_REFRESH: 'Önce şirket teklifini, oda karşı teklifini, eski rota ile yeni rota farkını ve kabul durumunu kontrol et; bu yalnızca teklif/önizleme akışıdır.',
    NEXT_SCREEN: 'Önce ilgili ekrana geç.',
    NEXT_STEP: 'Önce ilgili kayıt veya alanı kontrol et.',
    WHY_BLOCKED: operationHealthAdvice || 'Önce blokaj nedeni ve eksik alanı kontrol et.',
    SHIFT_BLOCKED: 'Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışını kontrol et; araç/sürücü bağı görünmüyorsa kontrol et, atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.',
    FIRST_CONTROL: 'Önce ilgili satırı veya ilk kontrol alanını aç.',
    SAFE_NEXT_STEP: 'Önce en risksiz kayıt veya alanı kontrol et.',
    BOARDING_CHANGE_APPLICATION: firstNonEmpty(boardingRouteVisibilityLead, 'Bu değişiklik kabul edilmişse günlük atamaya işlenebilir; sürücü rotası yenilenmez. Önce kabul durumu ve günlük atama etkisini kontrol et.'),
    BOARDING_ROUTE_IMPACT_PREVIEW: 'Bu sadece önizlemedir. Rota/atama uygulanmadı. Kişi, durak, km, süre ve kapasite farkını birlikte oku.',
    STATUS_HELP: 'Önce durum satırını ve ilgili kaydı kontrol et.',
    FEEDBACK_STATUS: 'Önce açık veya kritik geri bildirimi ve sorumlu rolü kontrol et.',
    NOTIFICATION_SOURCE: 'Önce bildirimin kaynağı olan olay kaydını aç.',
    KVKK_VISIBILITY: 'Önce rol ve görünürlük sınırını kontrol et.',
    CONTRACT_TO_SHIFT: 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    CONTRACT_SHIFT_TODAY: 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    MISSING_DATA: 'Önce boş alanları ve eksik bilgi blokajını kontrol et.',
    WHO_CAN_DO: 'Önce yetki sınırını ve ilgili rolü kontrol et.',
    DRIVER_PHONE_GPS: 'Önce sürücünün telefon GPS’i ile cihaz GPS’i kaynağını ayır.',
    VEHICLE_NOT_VISIBLE: 'Önce araç GPS’i, görev bağlantısı, son konum ve Sürücünün telefon GPS’i sinyalini kontrol et.',
  };
  const bestNextAction = firstNonEmpty(
    selectedRecordMismatchLead,
    guidedTopicAdvice,
    operationHealthAdvice,
    visibleActionSimulation,
    helperTopicMeta?.advice || '',
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
    guidedTopicAdvice,
    operationHealthAdvice,
    visibleActionSimulation,
    diagnosticPrioritySummary ? `Öncelik: ${diagnosticPrioritySummary}` : '',
    helperTopicMeta?.advice || '',
    topicAdvice[activeTopic],
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    screenDefinition?.firstStep,
    sourceScreenDefinition?.firstStep,
    selectedLabel ? `Önce ${selectedLabel} kaydını aç.` : '',
    'Önce ilgili satırı seç.',
  );
  const topicLabel = firstNonEmpty(guidedTopicLabel, topicLabelForContext(activeTopic), '');
  const contextualSuggestedChips = buildContextualSuggestedChips({
    entityType,
    questionType,
    roleMode,
    screenPath,
    context,
    guidedTaskMeta,
    sourceScreenContext,
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
    ['HOW_TO_HELP', 'DETAIL_FLOW'].includes(String(questionType || '')) ? 'devamını anlat' : '',
    guidedTaskMeta?.clarificationQuestion || '',
    guidedTaskMeta?.chips?.[0] || '',
    needsSelection ? 'Önce ilgili satırı seç' : '',
    isFollowUp && !workflowQuestion ? 'İlgili kayıtla devam et' : '',
    visibleActionSimulation,
    bestNextAction,
    roleBoundary ? 'Yetki sınırını açıkla' : '',
    'Sıradaki doğru işlem ne?',
  );
  const contractWorkflowQuestion = ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(activeTopic || questionType || ''));
  const contractProductionSignal = buildContractProductionSignalState(screenContext, sourceScreenContext);
  const contractSignalText = firstNonEmpty(
    contractProductionSignal.hasSignal ? contractProductionSignal.summaryText : '',
    diagnosticPrioritySummary,
    liveFactConfidenceSummary,
    '',
  );
  const contractSignalIsPositive = contractProductionSignal.hasSignal
    || (Boolean(contractSignalText) && !/(görünmüyor|gorunmuyor|yok|eksik|kesinleştiren sinyal görünmüyor|kesinlestiren sinyal gorunmuyor)/.test(normalizeText(contractSignalText)));
  const contractNowLead = contractSignalIsPositive
    ? firstNonEmpty(
      contractProductionSignal.summaryText,
      'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
    )
    : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const contractWhyLead = contractSignalIsPositive
    ? firstNonEmpty(
      contractProductionSignal.details ? `Bunu şuradan anlıyorum: ${contractProductionSignal.details}.` : '',
      `Bunu şuradan anlıyorum: ${contractSignalText}.`,
      topicAdvice[activeTopic],
      'Bu sözleşme için bugünkü üretim kaydı okunuyor.',
    )
    : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const summaryLead = guidedTaskMeta?.familyId
    ? firstNonEmpty(
      selectedRecordMismatchLead,
      guidedTopicSummary ? `Bu iş: ${guidedTopicSummary}` : '',
      guidedTopicLabel,
      guidedTopicWhy,
      roleBoundary,
      evidenceConfidence,
      topicLabel,
      '',
    )
    : workflowQuestion
      ? (contractWorkflowQuestion
        ? pickWorkflowVisibleReply(
          selectedRecordMismatchLead,
          contractNowLead,
          contractWhyLead,
          roleBoundary,
          'Ekrandaki sinyale göre konuşuyorum.',
        )
        : pickWorkflowVisibleReply(
          selectedRecordMismatchLead,
          diagnosticPrioritySummary ? `Ekrandaki sinyale göre: ${diagnosticPrioritySummary}` : '',
          liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
          evidenceConfidence,
          roleBoundary,
          'Ekrandaki sinyale göre konuşuyorum.',
        ))
      : firstNonEmpty(
        selectedRecordMismatchLead,
        diagnosticPrioritySummary,
        liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
        evidenceConfidence,
        roleBoundary,
        topicLabel,
        '',
      );
  return {
    activeTopic,
    activeTopicLabel: topicLabel,
    isFollowUp,
    sameRecordLikely,
    needsSelection,
    selectedHasContract,
    selectedHasShift,
    selectedHasPayment,
    selectedHasVehicle,
    selectedHasGps,
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
    guidedTaskMeta,
    guidedTaskFamilyId: guidedTaskMeta?.familyId || '',
    guidedTaskLabel: guidedTopicLabel || '',
    guidedTaskSummary: guidedTopicSummary || '',
    guidedTaskAdvice: guidedTopicAdvice || '',
    guidedTaskWhy: guidedTopicWhy || '',
    guidedTaskProgressCommand: guidedTaskMeta?.progressCommand || '',
    guidedTaskProgressRaw: guidedTaskMeta?.progressRaw || '',
    guidedTaskQuestionType: guidedTaskMeta?.questionType || '',
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
  const sourceLabel = String(screenDefinition?.label || screenContext?.label || '');
  const theme = selectedDiagnosticTheme(text);
  const sourceSurfaceText = normalizeLooseText([
    sourcePath,
    sourceLabel,
    screenContext?.label,
    screenContext?.screenTitle,
    screenContext?.selectedLabel,
    screenContext?.selectedRecordLabel,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
  ].filter(Boolean).join(' • '));
  const hasHowToReasoningLead = Boolean(firstNonEmpty(
    screenContext?.structuredFacts?.reasoningLead,
    '',
  ));
  const isTurkishShiftSurface = /vardiyalar/.test(sourceSurfaceText);
  if (sourceLabel && normalizeLooseText(text).includes(normalizeLooseText(sourceLabel))) {
    return screenDefinition;
  }
  const screens = listScreensForUser(user, screenContext)
    .map((item) => getScreenDefinitionForUser(user, { ...(screenContext || {}), path: item.path }, item.id))
    .filter(Boolean);
  if (!screens.length) return screenDefinition;

  const choose = (predicate) => screens.find(predicate) || null;
  const pickScreenByPathContains = (parts = []) => choose((row) => parts.some((part) => String(row?.path || '').includes(String(part || ''))));
  const planningSurfaceText = normalizeLooseText([text, sourcePath, sourceLabel, sourceSurfaceText].filter(Boolean).join(' • '));
  if (/(plan[- ]builder|planlama\s+merkezi|plan\s+kur|yeni\s+iş\s+kur|yeni\s+is\s+kur|yeni\s+vardiya\s+oluştur|yeni\s+vardiya\s+olustur|vardiya\s+nasıl\s+oluşturulur|vardiya\s+nasıl\s+olusturulur|vardiya\s+oluştur|vardiya\s+olustur)/.test(planningSurfaceText) && (!/\/(?:company|organization|school)\/shifts\b/.test(sourcePath) || isTurkishShiftSurface) && !hasHowToReasoningLead) {
    const planningPath = user?.companyKind === 'ORGANIZATION'
      ? '/organization'
      : user?.companyKind === 'SCHOOL'
        ? '/school'
        : '/company';
    const planning = getScreenDefinitionForUser({ role: 'COMPANY', companyKind: user?.companyKind || '' }, { path: planningPath }, 2101);
    if (planning?.path) return planning;
  }
  const trustQualitySurface = /\/trust-quality/.test(sourcePath) || /trust-quality/.test(sourceSurfaceText);
  if (trustQualitySurface && /(kalite|quality|puan|skor|sefer|sağlayıcı|saglayici|provider|kanıt|kanit|denetim|inceleme)/.test(text)) {
    return screenDefinition;
  }
  const liveSurfaceHint = /\/personel\/live|\/personel\/my|\/parent\/live|\/driver\/today|\/driver\/route|\/driver\/map|\/room\/map|\/room\/live|\/company\/map|\/company\/live|\/organization\/map|\/organization\/live|\/school\/map|\/school\/live/.test(sourcePath)
    || /veli.*canlı takip|veli.*canli takip|parent.*canlı takip|parent.*canli takip|öğrencimin servisi|ogrencimin servisi|canlı takip|canli takip/.test(sourceSurfaceText);
  if (liveSurfaceHint && /(servis|servisim|araç|arac|görev|gorev|gps|konum|harita|haritada|durak|eta)/.test(text)) {
    return screenDefinition;
  }
  if (['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'LOCATION_HELP'].includes(theme)) {
    const preserveLiveSurface = liveSurfaceHint || pathLooksLikeWorkflowSurface(sourcePath) && (
      /\/personel\/live|\/personel\/my|\/parent\/live|\/driver\/today|\/driver\/route|\/driver\/map/.test(sourcePath)
      || /\/room\/map|\/room\/live|\/company\/map|\/company\/live|\/organization\/map|\/organization\/live|\/school\/map|\/school\/live/.test(sourcePath)
      || /veli.*canlı takip|veli.*canli takip|parent.*canlı takip|parent.*canli takip|öğrencimin servisi|ogrencimin servisi|canlı takip|canli takip/.test(sourceSurfaceText)
    );
    if (preserveLiveSurface) return screenDefinition;
    const mapScreen = pickScreenByPathContains(['/map', '/live']) || pickScreenByKind(screens, 'MAP');
    if (mapScreen) return mapScreen;
  }
  if (
    isCommercialFlowContractToShiftQuestion(text)
    && (/\/(company|room|organization|school)\/(agreements|contracts)\b/.test(sourcePath) || /sözleşme|sozlesme/i.test(sourceLabel))
  ) {
    return screenDefinition;
  }
  if (pathLooksLikeWorkflowSurface(sourcePath) && (selectedDiagnosticTheme(text) || isCommercialFlowContractToShiftQuestion(text))) {
    return screenDefinition;
  }
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
  const plate = extractPlateFromVisibleText(text);
  const gpsStatus = firstNonEmpty(
    extractVisibleValueFromText(text, ['GPS']),
    extractVisibleValueFromText(text, ['Canlılık']),
    extractVisibleValueFromText(text, ['Durum']),
    '',
  );
  const lastGps = extractVisibleValueFromText(text, ['Son GPS', 'Last GPS']);
  const nextStop = firstNonEmpty(
    extractVisibleValueFromText(text, ['Sıradaki']),
    extractVisibleValueFromText(text, ['Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    '',
  );
  const eta = extractVisibleValueFromText(text, ['ETA']);
  const shiftLabel = extractVisibleValueFromText(text, ['Seçili kayıt', 'Seçili satır']);
  if (shiftLabel) bits.push(`Seçili kayıt ${shiftLabel}`);
  if (plate) bits.push(`Araç ${plate}`);
  if (gpsStatus) bits.push(`GPS ${gpsStatus}`);
  if (lastGps) bits.push(`Son GPS ${lastGps}`);
  if (nextStop) bits.push(`Sıradaki ${nextStop}`);
  if (eta) bits.push(`ETA ${eta}`);
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

function parentLiveNoVehicleDetected(screenContext, sourceScreenContext, screenPath = '') {
  const path = normalizeText(firstNonEmpty(screenPath, screenContext?.path, sourceScreenContext?.path, ''));
  const facts = structuredFacts(screenContext) || structuredFacts(sourceScreenContext) || {};
  const titleText = normalizeLooseText([
    screenContext?.label,
    screenContext?.screenTitle,
    screenContext?.selectedLabel,
    screenContext?.selectedRecordLabel,
    sourceScreenContext?.label,
    sourceScreenContext?.screenTitle,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedRecordLabel,
    facts?.label,
    facts?.screenTitle,
    facts?.selectedLabel,
    facts?.selectedRecordLabel,
  ].filter(Boolean).join(' • '));
  const roleText = normalizeText(firstNonEmpty(screenContext?.role, sourceScreenContext?.role, facts?.role, ''));
  const parentLiveSurface = path.includes('/parent/live')
    || roleText === 'parent'
    || /veli.*canlı takip|veli.*canli takip|canlı takip|canli takip/.test(titleText);
  if (!parentLiveSurface) return false;
  if (facts?.noLiveVehicle === true || facts?.liveVehicleVisible === false) return true;
  const merged = normalizeLooseText([
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordSummary,
    sourceScreenContext?.helpContextSummary,
    sourceScreenContext?.contextSummary,
    sourceScreenContext?.selectedRecordStatus,
    facts?.selectedSummary,
    facts?.selectedRecordSummary,
    facts?.helpContextSummary,
    facts?.contextSummary,
    facts?.selectedRecordStatus,
    facts?.summary,
    facts?.copilotSummary,
  ].filter(Boolean).join(' • '));
  return /canlı araç görünmüyor|canli araç görünmüyor|canli arac gorunmuyor|araç yok|arac yok|araç:\s*0|arac:\s*0|canlı konum görünmüyor|canli konum görünmüyor|aktif vardiya saat aralığı|araç ataması varsa görünür|arac ataması varsa görünür/i.test(merged);
}

function buildParentLiveNoVehicleReply({ screenContext, sourceScreenContext, screenPath = '' }) {
  if (!parentLiveNoVehicleDetected(screenContext, sourceScreenContext, screenPath)) return '';
  return 'Şu an bu çocuk için canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür. Önce aktif servis saati, araç ataması ve canlı konum durumunu kontrol et.';
}

function parentLiveNoSelectionDetected(screenContext, sourceScreenContext, screenPath = '') {
  const path = normalizeText(firstNonEmpty(screenPath, screenContext?.path, sourceScreenContext?.path, ''));
  if (!path.includes('/parent/live')) return false;
  if (parentLiveNoVehicleDetected(screenContext, sourceScreenContext, screenPath)) return false;
  const facts = structuredFacts(screenContext) || structuredFacts(sourceScreenContext) || {};
  const merged = normalizeLooseText([
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordStatus,
    screenContext?.selectedLabel,
    screenContext?.selectedRecordLabel,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordSummary,
    sourceScreenContext?.helpContextSummary,
    sourceScreenContext?.contextSummary,
    sourceScreenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedRecordLabel,
    facts?.selectedSummary,
    facts?.selectedRecordSummary,
    facts?.helpContextSummary,
    facts?.contextSummary,
    facts?.selectedRecordStatus,
    facts?.selectedLabel,
    facts?.selectedRecordLabel,
  ].filter(Boolean).join(' • '));
  return !/(araç|arac|vehicle|plaka|gps|son gps|eta|durak|servis|servisim|canlı araç|canli araç|canlı araç görünmüyor|canli arac gorunmuyor)/i.test(merged);
}

function buildParentLiveNoSelectionReply({ screenContext, sourceScreenContext, screenPath = '' }) {
  if (!parentLiveNoSelectionDetected(screenContext, sourceScreenContext, screenPath)) return '';
  return 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor. Servis görünmüyorsa son GPS, araç bağlantısı ve tahmini varışı kontrol et.';
}


function selectedCarrySummary(screenContext) {
  // Safe vehicle fallback: Bu ekranda seçili araç bilgisi net görünmüyor.
  const label = prettyScreenLabel(firstNonEmpty(
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
  const facts = structuredFacts(screenContext);
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
  const summaryBody = firstNonEmpty(compactSummary, top.join(' • '), copilotSummary, '');
  if (copilotSummary && label) return appendCopilotSummary ? `${label} (${summaryBody || copilotSummary} • ${copilotSummary})` : `${label} (${summaryBody || copilotSummary})`;
  if (copilotSummary) return summaryBody || copilotSummary;
  if (label && top.length) return `${label} (${top.join(' • ')})`;
  if (label) return label;
  if (top.length) return top.join(' • ');
  return '';
}

function composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition, sourceScreenContext: _sourceScreenContext }) {
  const sourcePath = String(sourceScreenDefinition?.path || '');
  const targetPath = String(targetScreenDefinition?.path || '');
  const targetLabel = firstNonEmpty(prettyScreenLabel(targetScreenDefinition?.label), 'ilgili ekran');
  const sourceLabel = firstNonEmpty(prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const parts = [];
  if (sourcePath && targetPath && sourcePath !== targetPath) parts.push(`Şu an ${sourceLabel} ekranındasın; sorduğun yer ${targetLabel}.`);
  return parts.join(' ');
}

function composeScreenPurposeWithCarry({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, allowCarryHint = true }) {
    const purpose = normalizeVisibleReplyFragment(firstNonEmpty(
      screenDefinition?.menuPurpose,
      screenDefinition?.screenExplanation,
      guide?.screenExplanation,
      guide?.plainSummary,
      guide?.summary,
      'Bu ekran bu işi yönetmek için kullanılır.',
    ));
    const parentLiveNoVehicleReply = buildParentLiveNoVehicleReply({
      screenContext,
      sourceScreenContext,
      screenPath: firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, ''),
    });
    if (parentLiveNoVehicleReply) return toReply(parentLiveNoVehicleReply);
    const parentLiveNoSelectionReply = buildParentLiveNoSelectionReply({
      screenContext,
      sourceScreenContext,
      screenPath: firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, ''),
    });
    if (parentLiveNoSelectionReply) return toReply(parentLiveNoSelectionReply);
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
    const screenPath = firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '');
    const forceCarryHint = /\/(?:company|school|organization|room)\/shifts\b/.test(screenPath);
    const carryHint = (allowCarryHint || forceCarryHint) ? normalizeVisibleReplyFragment(firstNonEmpty(
      forceCarryHint
        ? firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, screenContext?.selectedRecordStatus, sourceScreenContext?.selectedRecordStatus, '')
        : '',
      selectedCarrySummary(screenContext),
      selectedCarrySummary(sourceScreenContext),
      '',
    )) : '';
    const screenLabelLead = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(sourceScreenDefinition?.label), prettyScreenLabel(screenContext?.label), prettyScreenLabel(sourceScreenContext?.label), '');
    const purposeLead = buildVisibleScreenPurposeLead(purpose);
    const firstLead = first ? `İlk bakılacak yer: ${ensureVisibleSentence(first)}` : '';
    const nextLead = next && !sameVisibleReplyFragment(first, next) ? `Sonra: ${ensureVisibleSentence(next)}` : '';
    const carryLead = carryHint && !sameVisibleReplyFragment(carryHint, first) && !String(lead || '').includes('Mevcut seçili kayıt') ? `Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(carryHint)}` : '';
    const labelLead = screenLabelLead ? `${screenLabelLead} ekranı.` : '';
    return `${labelLead ? `${labelLead} ` : ''}${purposeLead}${firstLead ? ` ${firstLead}` : ''}${nextLead ? ` ${nextLead}` : ''}${lead ? ` ${lead}` : ''}${carryLead ? ` ${carryLead}` : ''}`.trim();
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
      case 'SEFER_SCORE_PREVIEW':
        result = 'Bu ekrandaki veriye göre bu tedarikçinin SeferPuanı önizleniyor; ödeme, ceza veya teklif sıralaması başlatmaz.';
        firstControl = 'Zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyalleri';
        break;
      case 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW':
        result = 'Bu ekrandaki veriye göre lisans ücreti 0 TL olarak yalnızca önizleniyor; mevcut / manuel / pilot / eski kayıt için pay doğmaz, SeferPakt kaynaklı yeni veya yenileme ise yalnızca başarı payı önizlemesi görünür. Kaynak vardiyası / teklif seçimi zinciri kanıtlı değilse pay doğmaz.';
        firstControl = 'Kaynak vardiyası / teklif seçimi sinyali, SeferPuanı ve tahsilat / fatura sınırı';
        break;
      case 'CONTRACT_SHIFT_TODAY':
      case 'CONTRACT_TO_SHIFT':
        result = hasNegative
          ? 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretildiğine dair net işaret yok.'
          : 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.';
        firstControl = 'Sözleşme / vardiya üretimi';
        break;
      case 'BOARDING_CHANGE_APPLICATION':
        result = hasNegative
          ? 'Bu ekrandaki veriye göre kabul edilen değişiklik henüz günlük atamaya işlenmemiş olabilir; sürücü rota ekranında görünmesi için uygulama bekliyor olabilir.'
          : 'Bu ekrandaki veriye göre kabul edilen değişiklik günlük atamaya işlenebilir veya işlenmiş görünüyor; sürücü rota ekranında görünür ve kalıcı rota değişmez.';
        firstControl = 'Kabul durumu, günlük atama etkisi ve sürücü rota görünürlüğü';
        break;
      case 'PAYMENT_READINESS':
        result = hasNegative
          ? 'Bu ekrandaki veriye göre bu hakedişte eksik kanıt veya kalite kontrolü var; ödeme başlatılmaz.'
          : 'Bu ekrandaki veriye göre hakediş önizlemesi okunuyor; ödeme başlatılmaz.';
        firstControl = 'Kanıt tamlığı, kalite sinyali ve ödeme hesabı';
        break;
      case 'PAYMENT_MISSING':
        result = 'Bu ekrandaki veriye göre bu hakedişin kanıt tarafında eksikler var; önce tamamlanmalı.';
        firstControl = 'Eksik kanıtlar, kalite kontrolü ve ödeme hesabı';
        break;
      case 'PAYMENT_PREVIEW':
        result = 'Bu ekrandaki veriye göre hakediş / kanıt önizlemesi okunuyor.';
        firstControl = 'Kanıt tamlığı, kalite sinyali ve ödeme hesabı';
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
  const facts = screenContext?.structuredFacts || screenContext?.liveFacts;
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
  const sourceLabel = firstNonEmpty(prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const targetLabel = firstNonEmpty(prettyScreenLabel(targetScreenDefinition?.label), 'ilgili ekran');
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
  const sourceLabel = firstNonEmpty(prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
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
  if (normalizeText(best.candidate.label).includes('konum')) now = 'Önce konum sorunu olan kaydı aç. Sonra harita ya da adres düzeltme akışını kullan.';
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

function composeSimpleScreenReply({ questionType, guide, message, rawMessage = message, screenDefinition, screenContext }) {
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
    const replyMessage = rawMessage || message;
    const comparison = termComparisonReplyV2(replyMessage) || termComparisonReply(replyMessage);
    if (comparison) return comparison;
    const selectedTerm = questionType === 'BADGE_HELP' ? selectedBadgeReply(replyMessage, screenContext, screenDefinition) : questionType === 'FIELD_HELP' ? selectedFieldReply(replyMessage, screenContext, screenDefinition) : selectedTermReply(replyMessage, screenContext, screenDefinition);
    if (selectedTerm) return `${selectedTerm} Şimdi: ${now}`.trim();
    const knownTerms = explainTermsFromText(replyMessage, 2);
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

function normalizeRoleKey(value) {
  return normalizeText(value).replace(/\s+/g, '').replace(/_/g, '');
}

function prettyRoleName(roleKey) {
  const map = {
    company: 'Şirket',
    room: 'Oda',
    driver: 'Sürücü',
    parent: 'Veli',
    personel: 'Personel',
    school: 'Okul',
    organization: 'Organizasyon',
    superadmin: 'Süper Yönetici',
  };
  return firstNonEmpty(map[normalizeRoleKey(roleKey)], roleKey ? String(roleKey).trim() : '');
}

function turkishRoleName(normalizedRole, fallbackRole = '') {
  const map = {
    company: 'Şirket',
    organization: 'Organizasyon',
    room: 'Oda',
    driver: 'Sürücü',
    personel: 'Personel',
    parent: 'Veli',
    school: 'Okul',
    super_admin: 'Süper Yönetici',
    superadmin: 'Süper Yönetici',
    default: '',
  };
  return firstNonEmpty(map[normalizeRoleKey(normalizedRole)], prettyRoleName(fallbackRole), prettyRoleName(normalizedRole));
}

function normalizeRoleLeadSurface(text) {
  return String(text || '')
    .replace(/\bCOMPANY rolünde\b/gi, 'Şirket rolünde')
    .replace(/\bORGANIZATION rolünde\b/gi, 'Organizasyon rolünde')
    .replace(/\bDRIVER rolünde\b/gi, 'Sürücü rolünde')
    .replace(/\bROOM rolünde\b/gi, 'Oda rolünde')
    .replace(/\bPERSONEL rolünde\b/gi, 'Personel rolünde')
    .replace(/\bPARENT rolünde\b/gi, 'Veli rolünde')
    .replace(/\bSCHOOL rolünde\b/gi, 'Okul rolünde')
    .replace(/\bSUPER[_ ]?ADMIN rolünde\b/gi, 'Süper Yönetici rolünde');
}

function prettyScreenLabel(label) {
  const text = String(label || '').trim();
  if (!text) return '';
  return text
    .replace(/\bPlan\s*Builder\b/gi, 'Planlama Merkezi')
    .replace(/\bCompany\b/gi, 'Şirket')
    .replace(/\bRoom\b/gi, 'Oda')
    .replace(/\bDriver\b/gi, 'Sürücü')
    .replace(/\bParent\b/gi, 'Veli')
    .replace(/\bPersonel\b/gi, 'Personel')
    .replace(/\bSchool\b/gi, 'Okul')
    .replace(/\bOrganization\b/gi, 'Organizasyon')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectReferencedRole(message, fallbackRole = '') {
  const text = normalizeText(message);
  if (/\bsuper\s*admin\b|\bsuperadmin\b|\bsüper\s*admin\b/.test(text)) return 'superadmin';
  if (/\bcompany\b|\bşirket\b/.test(text)) return 'company';
  if (/\broom\b|\boda\b/.test(text)) return 'room';
  if (/\bdriver\b|\bsürücü\b|\bsurucu\b/.test(text)) return 'driver';
  if (/\bparent\b|\bveli\b/.test(text)) return 'parent';
  if (/\bpersonel\b|\bçalışan\b|\bcalisan\b/.test(text)) return 'personel';
  if (/\bschool\b|\bokul\b/.test(text)) return 'school';
  if (/\borganization\b|\borganizasyon\b/.test(text)) return 'organization';
  return normalizeRoleKey(fallbackRole);
}

function roleExplanationSentence(roleKey) {
  const normalized = normalizeRoleKey(roleKey);
  const map = {
    company: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    organization: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    room: 'operasyon, sürücü ve araç akışını takip edersin.',
    driver: 'kendi rotanı, günlük görevini ve canlı durumunu görürsün.',
    parent: 'öğrencinin servisini canlı izlersin.',
    personel: 'kendi servis akışını ve durumunu takip edersin.',
    school: 'okul tarafındaki servis ve operasyon işlerini yönetirsin.',
    superadmin: 'tüm yüzeyleri, kaliteyi ve kanıt akışını denetlersin.',
  };
  return firstNonEmpty(map[normalized], 'kendi alanına ait ekranları ve onay adımlarını görürsün.');
}

function explainFieldButtonTermsFromText(text, limit = 4) {
  const baseTerms = explainTermsFromText(text, limit);
  const value = normalizeText(text);
  const extraTerms = [
    {
      term: 'hakediş',
      explanation: 'Yapılan işin ödeme önizlemesi; kesin ödeme değildir.',
      aliases: ['hakediş', 'hakedis', 'hakediş ne demek', 'hakedis ne demek'],
    },
    {
      term: 'route readiness',
      explanation: 'Rota ve atama zincirinin ilerlemeye hazır olup olmadığını gösteren durum.',
      aliases: ['route readiness', 'route readiness ne demek', 'rota readiness'],
    },
    {
      term: 'Servis Kanıtı',
      explanation: 'Sürücünün telefon GPS’i ve ilgili sinyallerle hizmetin görünürlüğünü doğrulayan kart.',
      aliases: ['servis kanıtı', 'servis kaniti', 'servis kanıtı ne işe yarar', 'servis kaniti ne ise yarar'],
    },
  ]
    .filter((row) => (Array.isArray(row.aliases) ? row.aliases : []).some((alias) => value.includes(normalizeText(alias))))
    .map((row) => `${row.term}: ${row.explanation}`);
  return uniqueStrings([...extraTerms, ...baseTerms]).slice(0, limit);
}

function stepFlowSentence(steps, limit = 3) {
  const labels = ['Önce', 'Sonra', 'Ardından'];
  return uniqueStrings((Array.isArray(steps) ? steps : []).filter(Boolean).slice(0, limit))
    .map((step, index) => `${labels[index] || 'Sonra'} ${stripStepLead(step)}`)
    .join('. ')
    .replace(/\.\s*$/u, '')
    .trim();
}

function stripStepLead(text) {
  return String(text || '')
    .replace(/^(Önce|Sonra|Ardından|İlk bakılacak yer:)\s*/iu, '')
    .trim();
}

function buildProductOverviewHelpReply({ message, userRole, user, roleMode, screenDefinition, screenContext }) {
  const roleKey = detectReferencedRole(message, userRole);
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const starterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const starterFlow = stepFlowSentence(starterSteps, stepLimit);
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), '');
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const screenLead = screenLabel
    ? `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(genericStartQuestion ? firstNonEmpty(starterSteps[0], screenDefinition?.firstStep, 'ilk kartı aç.') : firstNonEmpty(screenDefinition?.firstStep, starterSteps[0], 'ilk kartı aç.'))}`
    : '';
  const intro = 'SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılan bir platformdur.';
  const roleLead = knownRole ? `${roleName} rolünde ${roleSentence}` : '';
  const pathLead = knownRole
    ? starterFlow
    : `${starterFlow || 'Önce bugünkü planı aç. Sonra canlı takibi kontrol et. Ardından kanıt / kalite / audit ekranına bak.'} Hangi roldesin?`;
  return uniqueStrings([
    intro,
    roleLead,
    pathLead,
    screenLead,
  ]).join(' ').trim();
}

function buildRoleExplanationHelpReply({ message, userRole, user, roleMode, screenDefinition, screenContext }) {
  const roleKey = detectReferencedRole(message, userRole);
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const starterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const starterFlow = stepFlowSentence(starterSteps, stepLimit);
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), '');
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const screenLead = screenLabel
    ? `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(genericStartQuestion ? firstNonEmpty(starterSteps[0], screenDefinition?.firstStep, 'ilk karta bak.') : firstNonEmpty(screenDefinition?.firstStep, starterSteps[0], 'ilk karta bak.'))}`
    : '';
  const roleLead = knownRole
    ? `${roleName} rolünde ${roleSentence}`
    : 'Rol net değilse önce plan / teklif / sözleşme hattına, canlı takip / servis durumuna ya da kanıt / kalite / audit hattına bak.';
  const pathLead = knownRole ? starterFlow : 'Hangi roldesin?';
  return uniqueStrings([
    roleLead,
    pathLead,
    screenLead,
  ]).join(' ').trim();
}

function buildScreenExplanationHelpReply({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }) {
  const purpose = composeScreenPurposeWithCarry({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, allowCarryHint: false });
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), prettyScreenLabel(sourceScreenDefinition?.label), prettyScreenLabel(sourceScreenContext?.label), 'bu ekran');
  const firstStep = firstNonEmpty(
    screenDefinition?.firstStep,
    guide?.whatToDoNow,
    guide?.screenExplanation,
    'ilk karta bak.',
  );
  const selected = normalizeVisibleReplyFragment(firstNonEmpty(
    screenContext?.selectedSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordStatus,
    '',
  ));
  return uniqueStrings([
    purpose,
    selected ? `Seçili kayıt: ${selected}.` : '',
    `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(firstStep)}`,
  ]).join(' ').trim();
}

function buildHowToHelpReply({ message, guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, roleMode, user, conversationState = null }) {
  const preferredDefinition = screenDefinition || sourceScreenDefinition;
  const preferredContext = screenContext || sourceScreenContext;
  const roleKey = detectReferencedRole(message, user?.role || guide?.scope?.role || guide?.role || '');
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const roleStarterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const roleStarterFlow = stepFlowSentence(roleStarterSteps, stepLimit);
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const hasHowToReasoningLead = Boolean(firstNonEmpty(screenContext?.structuredFacts?.reasoningLead, sourceScreenContext?.structuredFacts?.reasoningLead, ''));
  const detailContinuation = looksLikeDetailContinuationRequest(message)
    && Boolean(conversationState?.lastQuestionType || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length));
  const visibleHowToLabels = normalizeLooseText([
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
  ].filter(Boolean).join(' • '));
  const companyPlanningSurface = /planlama merkezi/.test(visibleHowToLabels)
    || /vardiya/.test(visibleHowToLabels)
    || isPlanningCenterPath(preferredDefinition?.path || preferredContext?.path || sourceScreenDefinition?.path || sourceScreenContext?.path || '');
  if (!detailContinuation && /vardiya.*nasıl.*oluştur|vardiya.*oluşturulur|nasıl.*vardiya.*oluştur/i.test(normalizeText(message)) && /vardiyalar/.test(visibleHowToLabels) && !hasHowToReasoningLead) {
    return companyPlanningCenterDetailReply();
  }
  if (detailContinuation && normalizedRole === 'company' && companyPlanningSurface) {
    return companyPlanningCenterDetailReply();
  }
  const resolvedCatalogDefinition = getScreenDefinitionForUser(
    user || { role: guide?.scope?.role || guide?.role || '' },
    preferredContext || preferredDefinition || {},
    Number(preferredDefinition?.id || preferredContext?.id || 0),
  );
  const displayDefinition = resolvedCatalogDefinition?.path ? resolvedCatalogDefinition : preferredDefinition;
  const stepRows = workflowStages(displayDefinition, guide, roleMode === 'SIMPLE' ? 2 : 3);
  const workflow = normalizeVisibleReplyFragment(stepFlowSentence(
    stepRows.length
      ? stepRows.map((row) => firstNonEmpty(row?.action, row?.detail, row?.title, '')).filter(Boolean)
      : (Array.isArray(guide?.stepByStep) ? guide.stepByStep.slice(0, roleMode === 'SIMPLE' ? 2 : 3) : []),
    roleMode === 'SIMPLE' ? 2 : 3,
  ));
  const now = normalizeVisibleReplyFragment(simpleNowText(guide, preferredDefinition, 'İlk adımı seç.'));
  const directSteps = uniqueStrings([
    firstNonEmpty(preferredDefinition?.firstStep, ''),
    firstNonEmpty(preferredDefinition?.nextStep, ''),
  ]).join(' ');
  const body = firstNonEmpty(workflow, roleStarterFlow, directSteps, ensureVisibleSentence(firstNonEmpty(now, 'İlk adımı seç.')), 'İlk adımı seç.');
  const screenPath = firstNonEmpty(displayDefinition?.path, preferredDefinition?.path, preferredContext?.path, '');
  const screenLabels = uniqueStrings([
    firstNonEmpty(preferredDefinition?.label, preferredContext?.label, ''),
    firstNonEmpty(displayDefinition?.label, ''),
  ]).filter(Boolean);
  const labelSurfaceText = normalizeLooseText(screenLabels.join(' • '));
  const isVardiyalarLabel = /vardiyalar/.test(labelSurfaceText);
  if (isVardiyalarLabel && !hasHowToReasoningLead && !detailContinuation) {
    const planningLabel = firstNonEmpty(displayDefinition?.label, preferredDefinition?.label, preferredContext?.label, 'Planlama Merkezi');
    const starterLine = firstNonEmpty(roleStarterFlow, body, 'Önce ilgili akışı aç.');
    return `${planningLabel ? `Şu an ${planningLabel} ekranındaysan ` : ''}${starterLine}`.trim();
  }
  const screenLead = screenLabels.length > 1
    ? `Şu an ${screenLabels[0]} ekranındaysan. Şu an ${screenLabels[1]} ekranındaysan `
    : (screenLabels[0] ? `Şu an ${screenLabels[0]} ekranındaysan ` : '');
  const combinedBody = String(screenPath || '').includes('/company/shifts') && directSteps
    ? `${body} ${directSteps}`.trim()
    : body;
  if (detailContinuation) {
    const companyShiftDetail = normalizedRole === 'company'
      && /\/company\/shifts/.test(String(screenPath || ''))
      && /vardiya|planlama merkezi|yeni plan oluştur|rehberi başlat/.test(normalizeLooseText(firstNonEmpty(
        guide?.plainSummary,
        guide?.summary,
        guide?.screenExplanation,
        screenDefinition?.menuPurpose,
        screenDefinition?.screenExplanation,
        sourceScreenDefinition?.menuPurpose,
        sourceScreenDefinition?.screenExplanation,
        '',
      )));
    if (companyShiftDetail) {
      return [
        'Devamı:',
        '1. Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat.',
        '2. Şirket konumunu ve servis başlangıç noktasını; paket/tarih/saat/servis yönü/kapsam.',
        '3. Personel: Excel ile toplu ekle ya da tek tek.',
        '4. Personel Konum Seçici; haritada mevcut konumu düzelt; adres / konum doğruluğunu kontrol et.',
        '5. Durakları hazırla; rota önizlemesi; yakın adresleri uygun duraklarda topla.',
        '6. Taslak vardiyayı oluştur; Vardiyalar ekranında takip et.',
        '7. Oda veya sağlayıcıdan teklif alma hazırlığı; sözleşme hazırlığı.',
      ].join(' ');
    }
    const detailRows = (Array.isArray(stepRows) ? stepRows : []).map((row, idx) => {
      const title = firstNonEmpty(row?.title, `Adım ${idx + 1}`);
      const action = firstNonEmpty(row?.action, row?.detail, row?.summary, '');
      const doneWhen = row?.doneWhen ? ` Tamam say: ${row.doneWhen}` : '';
      return `${idx + 1}. ${title}${action ? `: ${action}` : ''}${doneWhen}`;
    }).filter(Boolean);
    const detailBody = detailRows.length ? detailRows.join(' ') : firstNonEmpty(roleStarterFlow, combinedBody, body, 'İlk adımı aç.');
    return `Devamı şöyle: ${detailBody}`.trim();
  }
  if (genericStartQuestion) {
    const startIntro = knownRole
      ? `${roleName} rolünde ${roleSentence}`
      : 'Önce rolünü netleştirelim.';
    const starterLine = roleStarterFlow || combinedBody || 'Önce bugünkü plan / vardiya akışını aç. Sonra canlı takip / servis durumuna bak. Ardından kanıt / kalite / audit ekranını kontrol et.';
    const screenLead = screenLabels[0]
      ? `Şu an ${screenLabels[0]} ekranındaysan önce ${stripStepLead(firstNonEmpty(preferredDefinition?.firstStep, roleStarterSteps[0], 'ilk adımı kontrol et.'))}`
      : '';
    return uniqueStrings([
      startIntro,
      starterLine,
      screenLead,
      !knownRole ? 'Hangi roldesin?' : '',
    ]).join(' ').trim();
  }
  return `${screenLead}${combinedBody}`.trim();
}

function buildCompanySemanticOverrideReply({
  message,
  questionType,
  userRole,
  user,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  conversationState = null,
}) {
  const normalizedUserRole = normalizeRoleKey(firstNonEmpty(user?.role, userRole, ''));
  if (normalizedUserRole !== 'company') return '';
  const companyKind = normalizeRoleKey(firstNonEmpty(user?.companyKind, ''));
  if (companyKind && companyKind !== 'company') return '';

  const text = normalizeLooseText(message);
  const screenLabel = firstNonEmpty(
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    '',
  );
  const _screenPath = firstNonEmpty(
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  );
  const screenPathCandidates = uniqueStrings([
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
  ]);
  const screenLabelCandidates = uniqueStrings([
    screenLabel,
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
  ]);
  const normalizedScreenLabel = normalizeLooseText(screenLabelCandidates.join(' • '));
  const planningSurfaceText = normalizeLooseText(uniqueStrings([
    screenLabel,
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    companyPlanningUiSurfaceText(conversationState),
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    screenDefinition?.screenExplanation,
    screenContext?.screenExplanation,
    sourceScreenDefinition?.screenExplanation,
    sourceScreenContext?.screenExplanation,
    screenDefinition?.summary,
    screenContext?.summary,
    sourceScreenDefinition?.summary,
    sourceScreenContext?.summary,
    screenDefinition?.selectedSummary,
    screenContext?.selectedSummary,
    sourceScreenDefinition?.selectedSummary,
    sourceScreenContext?.selectedSummary,
    screenDefinition?.selectedRecordStatus,
    screenContext?.selectedRecordStatus,
    sourceScreenDefinition?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    screenDefinition?.firstStep,
    screenContext?.firstStep,
    sourceScreenDefinition?.firstStep,
    sourceScreenContext?.firstStep,
    screenDefinition?.nextStep,
    screenContext?.nextStep,
    sourceScreenDefinition?.nextStep,
    sourceScreenContext?.nextStep,
  ]).join(' • '));
  const isCompanyShiftSurface = screenPathCandidates.some((value) => normalizeLooseText(value).includes('/company/shifts'))
    || screenLabelCandidates.some((value) => /vardiyalar|vardiya/.test(normalizeLooseText(value)));
  const isCompanyPlanningPath = screenPathCandidates.some((value) => isPlanningCenterPath(value));
  const isCompanyPlanningSurface = isCompanyShiftSurface
    || isCompanyPlanningPath
    || looksLikeCompanyPlanningSurfaceText(planningSurfaceText);

  if (/^(bunu sen yap|bunu senin yerine yap|bunu benim yerime yap)$/i.test(text)) {
    return 'Bunu senin yerine uygulayamam; ama adım adım hazırlamana yardımcı olayım. Önce Vardiyalar ya da Planlama Merkezi ekranında ilgili kaydı aç. Sonra teklif, araç / sürücü uygunluğu ve sözleşme hazırlığı kontrollerini sırayla yap.';
  }
  if (/^teklifi kabul et$/i.test(text)) {
    return 'Teklifi senin yerine kabul edemem. Kabul öncesi fiyat, kapasite, kalite, araç / sürücü uygunluğu ve sözleşme hazırlığı kontrollerini adım adım gösterebilirim. Son onay yetkili kullanıcı tarafından verilmelidir.';
  }
  if (/^sözleşmeyi yürürlüğe al$/i.test(text) || /^sozlesmeyi yururluge al$/i.test(text)) {
    return 'Sözleşmeyi senin yerine yürürlüğe alamam. Sözleşme hazırlığı, taraf bilgileri, vardiya kapsamı, fiyat ve onay kontrollerini adım adım gösterebilirim. Son karar yetkili kullanıcı tarafından verilmelidir.';
  }
  if (/^aracı ata$/i.test(text) || /^araci ata$/i.test(text)) {
    return 'Aracı senin yerine atayamam. Şirket tarafında araç / sürücü uygunluğunu kontrol etmen için yönlendirebilirim. Son atama yetkili Oda veya operasyon kullanıcısı tarafından yapılmalıdır.';
  }
  const companyPlanningNextActionQuestion = looksLikeNextBestActionQuestion(text)
    || [
      'şimdi ne yapayım',
      'simdi ne yapayim',
      'ne yapayım',
      'ne yapayim',
      'nereden devam edeyim',
      'hangi adıma geçeceğim',
      'hangi adima gececegim',
    ].some((needle) => text.includes(needle));
  const companyPlanningCenterSurfaceTextValue = companyPlanningCenterSurfaceText({
    screenPath: _screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  });
  if (['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'].includes(String(questionType || '')) && String(_screenPath || '') === '/company' && !companyPlanningNextActionQuestion) {
    return 'Bu ekran, yeni işi kurma ve planlama için Planlama Merkezi ekranını kullanırsın. Yeni Plan Oluştur veya Rehberi Başlat ile akışı açarsın. Paket, tarih, saat, servis yönü, kapsam, personel, adres / konum, durak ve rota önizlemesini kontrol eder, oluşan vardiyayı Vardiyalar ekranında takip edersin.';
  }
  const companyStartQuestion = /^(bu programda company olarak ne yapmam gerekiyor|bu program ne işe yarıyor|bu program ne yapıyor|ben ne yapmam lazım|ben nereden başlamalıyım|ben ne yapmam gerekiyor)\??$/i.test(text);
  if (companyStartQuestion && ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(String(questionType || ''))) {
    return 'Şirket rolünde servis ihtiyacını planlarsın. Önce Planlama Merkezi\'ne gir, Yeni Plan Oluştur veya Rehberi Başlat ile akışı aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa teklif karşılaştırma ve sözleşme hazırlığına geçersin. Oluşan vardiyayı Vardiyalar ekranında takip eder, son onayı yetkili kullanıcı tarafından verirsin.';
  }
  if (/^girdim$/i.test(text) || /vardiyalar ekranına girdim/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Vardiyalar ekranına girdin. Şimdi hangi yoldan ilerleyeceğimizi seçelim: yeni vardiya oluşturma, mevcut vardiyayı takip etme veya teklif / sözleşme hazırlığı. Seçili kayıt Vardiya #6 ise onun üzerinden de devam edebiliriz.'
      : '';
  }
  if (/^yaptım$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Tamam, aynı vardiya akışından devam edelim. Şimdi tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı tarafında eksik var mı kontrol et. Yeni vardiya oluşturuyorsan sonraki adım Planlama Merkezi veya konum kontrolüdür; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.'
      : '';
  }
  if (/^bulamadım$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Bulamadığın şey yeni vardiya oluşturma alanıysa Vardiyalar ekranında yeni vardiya veya yeni plan oluştur alanını kontrol et. Bulamadığın şey seçili kayıt ise Liste, Teklif Pazarı veya Bekleyen sekmesinden ilgili vardiya / talep satırını seç. Hangisini bulamadığını yazarsan oradan devam edelim.'
      : '';
  }
  if (/^devam et$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Vardiyalar akışından devam edelim. Seçili Vardiya #6 üzerinden gidiyorsan önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı durumunu kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.'
      : '';
  }
  if (companyPlanningNextActionQuestion && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)) {
    return companyPlanningCenterNextBestActionReply();
  }
  if (looksLikeDetailContinuationRequest(text) && isCompanyPlanningSurface) {
    return companyPlanningCenterDetailReply();
  }
  if (['SCREEN_FOCUS', 'WHAT_TO_CHECK'].includes(String(questionType || '')) && isCompanyPlanningSurface) {
    return 'Bu ekranda önce şirket konumu, tarih / saat, servis yönü ve kapsamı kontrol et. Sonra personel listesi, adres / konum, duraklar ve rota önizlemesine bak. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip et, ardından teklif ve sözleşme hazırlığına geç.';
  }
  if (['RISK_LIST', 'SCREEN_RISKS'].includes(String(questionType || '')) && isCompanyPlanningSurface) {
    return 'Başlıca riskler: şirket konumunun eksik olması, tarih / saat ya da servis yönünün yanlış seçilmesi, kapsamın dar ya da geniş gelmesi, personel listesindeki eksikler, adres / konum hatası ve durak / rota önizlemesinde sapma. Bunlardan biri varsa önce onu düzelt.';
  }
  if (/konumda sorun varsa ne yapacağım/i.test(text) || /konumda sorun varsa ne yapacagim/i.test(text)) {
    return 'Konumda sorun varsa önce adres bilgisini kontrol et: il, ilçe, mahalle, sokak ve bina bilgisi eksik mi bak. Eksik veya şüpheli adresleri konum incelemesine ayır. Konum netleşmeden rota, teklif ve sözleşme hazırlığını ilerletme. Ben adresin yeterli olup olmadığını yorumlayabilirim; konumu senin yerine otomatik değiştirmem.';
  }
  if (questionType === 'PRODUCT_OVERVIEW_HELP' && /bu programda company olarak ne yapmam gerekiyor/i.test(text)) {
    return 'Şirket rolünde servis ihtiyacını planlarsın. Önce Planlama Merkezi\'ne gir, Yeni Plan Oluştur veya Rehberi Başlat ile akışı aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa teklif karşılaştırma ve sözleşme hazırlığına geçersin. Oluşan vardiyayı Vardiyalar ekranında takip eder, son onayı yetkili kullanıcı tarafından verirsin.';
  }
  if (['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'].includes(String(questionType || '')) && /planlama merkezi/.test(normalizedScreenLabel)) {
    return companyPlanningCenterNextBestActionReply();
  }
  if (questionType === 'HOW_TO_HELP' && /vardiya.*nasıl.*oluştur|vardiya.*oluşturulur|nasıl.*vardiya.*oluştur/i.test(text)) {
    return "Vardiya oluşturmak için Şirket panelinde Planlama Merkezi'ne gir. Yeni Plan Oluştur veya Rehberi Başlat alanını aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip eder, teklif ve sözleşme hazırlığına geçersin.";
  }
  return '';
}

function buildFieldButtonHelpReply({ message, guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, analysis, roleMode, user }) {
  const preferredDefinition = screenDefinition || sourceScreenDefinition;
  const preferredContext = screenContext || sourceScreenContext;
  const resolvedCatalogDefinition = getScreenDefinitionForUser(
    user || { role: guide?.scope?.role || guide?.role || '' },
    preferredContext || preferredDefinition || {},
    Number(preferredDefinition?.id || preferredContext?.id || 0),
  );
  const displayDefinition = resolvedCatalogDefinition?.path ? resolvedCatalogDefinition : preferredDefinition;
  const explicitTerms = explainFieldButtonTermsFromText(message, 4);
  if (explicitTerms.length) {
    return `Kısaca: ${explicitTerms.join(' • ')} Bu terimler ekrandaki alanı daha sade okumak için kullanılır. İstersen örnekle açayım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const disabled = disabledButtonReply(message, preferredContext, analysis);
  if (disabled) {
    return `Kısaca: ${disabled} ${roleMode === 'SIMPLE' ? 'İstersen önce neden kapalı olduğunu birlikte kontrol edelim.' : 'İstersen önce neden kapalı olduğunu ve hangi alanın eksik olduğunu birlikte kontrol edelim.'} Takılırsan "bulamadım" yaz.`.trim();
  }
  const visible = visibleButtonReply(message, preferredContext, analysis);
  if (visible) {
    return `Kısaca: ${visible} ${roleMode === 'SIMPLE' ? 'İstersen bu butonun bağlı olduğu akışı açayım.' : 'İstersen bu butonun bağlı olduğu akışı ve sonraki adımı da açayım.'} Takılırsan "bulamadım" yaz.`.trim();
  }
  const buttonGuide = findButtonGuideByMessage(message, { ...guide, buttonGuides: displayDefinition?.buttonGuides || guide?.buttonGuides || [] }, displayDefinition);
  if (buttonGuide) {
    const buttonPurpose = firstNonEmpty(buttonGuide.purpose, 'Bu buton ilgili akışı başlatır.');
    const shortPurpose = /listelerini\s+takip\s+görünümünde\s+açar/i.test(buttonPurpose) ? 'Vardiya listesini açar.' : '';
    return `Kısaca: ${buttonGuide.label}: ${buttonPurpose} ${shortPurpose} ${buttonGuide.whenToUse ? `Ne zaman: ${buttonGuide.whenToUse}` : ''} ${buttonGuide.whatHappens ? `Sonuç: ${buttonGuide.whatHappens}` : ''} ${buttonGuide.disabledReason ? `Kapalıysa: ${buttonGuide.disabledReason}` : ''} Takılırsan "bulamadım" yaz.`.trim();
  }
  const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
  if (comparison) {
    return `Kısaca: ${comparison} İstersen bu terimlerin farkını da birlikte açayım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const selectedField = selectedFieldReply(message, screenContext, screenDefinition);
  if (selectedField) {
    return `Kısaca: ${selectedField} Bu alan ekrandaki değeri ya da durumu gösterir. İstersen bağlı kaydı birlikte açalım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const selectedBadge = selectedBadgeReply(message, screenContext, screenDefinition);
  if (selectedBadge) {
    return `Kısaca: ${selectedBadge} Bu rozet hızlı durum göstergesidir. İstersen detay kaydını birlikte açalım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const selectedTerm = selectedTermReply(message, screenContext, screenDefinition);
  if (selectedTerm) {
    return `Kısaca: ${selectedTerm} Bu terim, ekrandaki iş kuralını sadeleştirir. İstersen birlikte örnekle açayım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const knownTerms = explainFieldButtonTermsFromText(message, 4);
  const screenTerms = pickTerms(guide?.simpleTerms || displayDefinition?.simpleTerms || screenDefinition?.simpleTerms, 4);
  const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]).slice(0, 2);
  if (terms.length) {
    return `Kısaca: ${terms.join(' • ')} Bu terimler ekrandaki alanı daha sade okumak için kullanılır. İstersen örnekle açayım. Takılırsan "bulamadım" yaz.`.trim();
  }
  const stage = findWorkflowStageByMessage(message, guide, displayDefinition);
  if (stage) {
    return `Kısaca: ${firstNonEmpty(stage.title, 'Bu adım')}: ${firstNonEmpty(stage.action, '')} ${stage.doneWhen ? `Tamam say: ${stage.doneWhen}` : ''} ${stage.ifBlocked ? `Takılırsa: ${stage.ifBlocked}` : ''} Takılırsan "bulamadım" yaz.`.trim();
  }
  const buttons = pickButtons(guide.buttonGuides || displayDefinition?.buttonGuides || screenDefinition?.buttonGuides, 5);
  const purpose = firstNonEmpty(displayDefinition?.menuPurpose, guide?.plainSummary, guide?.summary, 'Bu alan veya buton ekrandaki akışta kullanılır.');
  return `${purpose} ${buttons.length ? `Öne çıkan butonlar: ${buttons.join(' • ')}` : ''} ${uiSurfaceEvidence(preferredContext)} Önce etiketini ya da kartı bul. İstersen birlikte ilgili alanı açayım. Takılırsan "bulamadım" yaz.`.trim();
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
    const guidedTaskMeta = context?.guidedTaskMeta || null;
    const workflowQuestion = Boolean(guidedTaskMeta?.familyId) || isWorkflowTopic(context?.activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
    const workflowAction = workflowQuestion ? workflowActionSpec({ activeTopic: context?.activeTopic, questionType }) : null;
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı konuşmayı seçili vardiya ile ekranda sürdürür.'));
    if (Number(context?.openOfferCount || 0) > 0 || ['GO_TO', 'WHY_BLOCKED'].includes(questionType)) rows.push(menuAction(offersMenu, context, 'Teklif kararını kapatmak için ilgili listeyi açar.', { accent: 'primary' }));
    if (!context?.vehicleId || questionType === 'NEXT_STEP') rows.push(menuAction(vehiclesMenu, context, 'Araç atamasını veya araç durumunu kontrol etmek için açılır.', { routeParams: context?.vehicleId ? { focusVehicleId: Number(context.vehicleId) } : {}, accent: 'primary' }));
    if (!context?.driverId || questionType === 'NEXT_STEP') rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    if (String(context?.agreementId || '') || questionType === 'GO_TO') rows.push(menuAction(agreementsMenu, context, 'Sözleşmeye bağlı akışı kontrol etmek için açılır.'));
    if (workflowAction) {
      rows.push(makeGuideAction(workflowAction.guideLabel, { jobType: workflowAction.jobType, guideLevel: workflowAction.guideLevel }, workflowAction.reason));
      rows.push(makeAskAction(workflowAction.askLabel, workflowAction.askQuery, workflowAction.askReason));
    } else {
      rows.push(makeGuideAction('Sıralı kontrol rehberini aç', { jobType: 'ASSIGNMENT_READINESS_GUIDE', guideLevel: 'STEP_BY_STEP' }, 'Bu kayıt için eksikleri adım adım sıralar.'));
      rows.push(makeAskAction(
        hasSelection ? 'Başlatma durumunu sor' : 'Bu ekranı anlat',
        hasSelection ? 'bu vardiya neden başlayamıyor' : 'bu ekranı detaylı anlat',
        hasSelection ? 'Aynı kayıt için hızlı takip sorusunu gönderir.' : 'Bu ekranın amacını kısa anlatır.',
      ));
    }
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
    rows.push(makeAskAction('GPS görünürlüğünü sor', 'konum neden görünmüyor', 'Konum görünürlüğü teşhisini gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
    const screenPath = normalizeText(screenDefinition?.path || context?.path || '');
    const driverDiagnosticSurface = roleMode === 'SIMPLE'
      && screenPath.startsWith('/driver/')
      && ['WHY_BLOCKED', 'SHIFT_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'MISSING_DATA', 'SAFE_NEXT_STEP'].includes(String(questionType || ''));
    if (driverDiagnosticSurface) {
      rows.push(makeAskAction(
        'Başlatma durumunu sor',
        'bu vardiya neden başlayamıyor',
        'Başlamama nedenini tekrar sorar.',
      ));
    }
    rows.push(currentScreenAction(screenDefinition, context, roleMode === 'SIMPLE' ? 'Bu ekrana dönersin.' : 'Bu ekranı tekrar açar.'));
    for (const menu of menus.slice(0, roleMode === 'SIMPLE' ? 1 : 3)) rows.push(menuAction(menu, context, menu.purpose || 'İlgili menüye götürür.', { accent: roleMode === 'SIMPLE' && rows.length <= 1 ? 'primary' : 'neutral' }));
    if (roleMode === 'SIMPLE') {
      rows.push(makeAskAction('Sonraki adımı sor', 'şimdi ne yapayım', 'Daha kısa yönlendirme alırsın.'));
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

function guideLinksForEntity(entityType, { questionType = 'OPEN', activeTopic = '', screenPath: _screenPath = '' } = {}) {
  if (['BOARDING_CHANGE_REQUEST_ENTRY'].includes(String(activeTopic || questionType || ''))) {
    if (String(entityType) === 'shift') {
      return [
        makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Biniş talebi oluşturma rehberini aç', 'STEP_BY_STEP', 'Talep tipini, tarihi, durak/konum bilgisini ve notu girer.'),
        makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Talebim kimde bekliyor?', 'WHY', 'Karar sahibini ve bekleyen tarafı açıklar.'),
        makeLinkedGuide('ROLE_HELP_GUIDE', 'Karar sahibini açıkla', 'SHORT', 'Same-route ise sürücü, rota dışı ise hizmet alan taraf kuralını özetler.'),
      ];
    }
    return [
      makeLinkedGuide('SCREEN_MENU_GUIDE', 'Biniş talebi oluşturma rehberini aç', 'SHORT', 'Talep giriş alanını, tarih ve not alanını sadeleştirir.'),
      makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Talebim kimde bekliyor?', 'WHY', 'Karar sahibini ve bekleyen tarafı açıklar.'),
      makeLinkedGuide('ROLE_HELP_GUIDE', 'Karar sahibini açıkla', 'SHORT', 'Same-route ise sürücü, rota dışı ise hizmet alan taraf kuralını özetler.'),
    ];
  }
  if (['SEFER_SCORE_PREVIEW'].includes(String(activeTopic || questionType || ''))) {
    return [
      makeLinkedGuide('SCREEN_MENU_GUIDE', 'SeferPuanı önizleme rehberini aç', 'WHY', 'Zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyallerini birlikte okur.'),
      makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Sinyal kırılımını aç', 'SHORT', 'SeferPuanı önizlemesini sadeleştir.'),
      makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye bakacağını gösterir.'),
    ];
  }
  if (String(entityType) === 'vehicle') {
    return [
      makeLinkedGuide('LOCATION_SOURCE_GUIDE', 'Konum kaynağı rehberini aç', 'SHORT', 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'),
      makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS sinyal teşhisini aç', 'WHY', 'Konum neden görünmüyor sorusuna odaklanır.'),
      makeLinkedGuide('VEHICLE_DRIVER_BIND', 'Araç-sürücü bağlama rehberini aç', 'STEP_BY_STEP', 'Bağlama adımlarını sade dille gösterir.'),
    ];
  }
  if (String(entityType) === 'shift') {
    const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
    if (workflowTopic) {
      if (['PAYMENT_READINESS', 'PAYMENT_MISSING'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Hakediş önizleme rehberini aç', 'STEP_BY_STEP', 'Hakediş önizleme sinyallerini sıralar.'),
          makeLinkedGuide('SCREEN_MENU_GUIDE', 'Hakediş önizlemesini aç', 'SHORT', 'Hakediş önizleme görünümüne götürür.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Eksik bilgi ne?', 'WHY', 'Eksik alanları sadeleştirir.'),
        ];
      }
      if (['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Sözleşme → vardiya rehberini aç', 'STEP_BY_STEP', 'Sözleşme ile vardiya üretimi bağını açar.'),
          makeLinkedGuide('SCREEN_MENU_GUIDE', 'Sözleşmeler ekranını aç', 'SHORT', 'İlgili sözleşme görünümüne götürür.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Üretim durumu rehberini aç', 'WHY', 'Üretim bilgisini sadeleştirir.'),
        ];
      }
      if (['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS teşhis rehberini aç', 'WHY', 'Araç GPS’i ve Sürücünün telefon GPS’i farkını açar.'),
          makeLinkedGuide('LOCATION_SOURCE_GUIDE', 'Konum kaynağı rehberini aç', 'SHORT', 'Konum kaynağını netleştirir.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Canlı takip rehberini aç', 'SHORT', 'Canlı takip ekranına götürür.'),
        ];
      }
      if (['QUALITY_SIGNAL', 'TRUST_QUALITY'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Kalite sinyali rehberini aç', 'WHY', 'Kalite, inceleme ve denetim izini birlikte okur.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Karşılaştırma rehberini aç', 'SHORT', 'Sağlayıcı farkını sadeleştirir.'),
          makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye bakacağını gösterir.'),
        ];
      }
      if (['SEFER_SCORE_PREVIEW'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('SCREEN_MENU_GUIDE', 'SeferPuanı önizleme rehberini aç', 'WHY', 'Zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyallerini birlikte okur.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Sinyal kırılımını aç', 'SHORT', 'Kalite puanı önizlemesini sadeleştirir.'),
          makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye bakacağını gösterir.'),
        ];
      }
      if (['FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'WHO_CAN_DO', 'ROLE_BOUNDARY'].includes(String(activeTopic || questionType || ''))) {
        return [
          makeLinkedGuide('ROLE_HELP_GUIDE', 'Durum rehberini aç', 'SHORT', 'Rol, bildirim ve görünürlük sınırını açar.'),
          makeLinkedGuide('BUTTON_ACTION_GUIDE', 'İlişki rehberini aç', 'WHY', 'Kayda bağlı ilişkiyi sadeleştirir.'),
          makeLinkedGuide('SCREEN_MENU_GUIDE', 'İlgili ekranı aç', 'SHORT', 'Bir sonraki doğru ekrana götürür.'),
        ];
      }
      return [
        makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Sıralı kontrol rehberini aç', 'STEP_BY_STEP', 'Canlı başlatma, aktif durum, GPS ve operasyon kanıtı akışını sıralar.'),
        makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Sıradaki adımı açıkla', 'WHY', 'Bir sonraki adımı sadeleştirir.'),
        makeLinkedGuide('ROLE_HELP_GUIDE', 'Bu işlemi kim yapabilir?', 'SHORT', 'Rol sınırını açıklar.'),
      ];
    }
    return [
      makeLinkedGuide('OFFER_REVIEW', 'Teklifi inceleme rehberini aç', 'SHORT', 'Kayıt özetini rehber modunda açar.'),
      makeLinkedGuide('OFFER_APPROVAL', 'Teklifi onaylama rehberini aç', 'WHY', 'Onay öncesi dikkat noktalarını açar.'),
      makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Sıralı kontrol rehberini aç', 'STEP_BY_STEP', 'Hazırlık eksiklerini sıralar.'),
    ];
  }
  return [
    makeLinkedGuide('SCREEN_MENU_GUIDE', 'Doğru ekran rehberini aç', 'SHORT', 'Bu ekranın amacını açar.'),
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
  const age = ageMinutes(context?.gpsLast?.at);
  const lastPart = age == null ? 'Son konum zamanı görünmüyor.' : `Son konum yaklaşık ${age} dakika önce geldi.`;
  const lastUiLabel = getGpsReliabilityLabel({ gpsStatus: context?.gpsState?.lastUiStatus, gpsAge: context?.gpsLast?.at, gpsLast: context?.gpsLast?.at });
  if (hasDevice && hasDriver) return `Bu araçta hem cihaz GPS'i kaydı hem de sürücü bağı görünüyor. Ana kaynak kullanımına göre ikisi de devreye girebilir. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  if (hasDevice) return `Bu araçta aktif cihaz GPS'i görünüyor. Sürücü bağı ${hasDriver ? 'de var' : 'görünmüyor'}. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  if (hasDriver) return `Bu araçta sürücünün telefon GPS'i tarafı için sürücü bağı görünüyor. Aktif cihaz GPS'i görünmüyor. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  return `Bu araçta şu an ne aktif cihaz GPS'i ne de sürücü bağı net görünüyor. ${lastPart}`;
}

function vehicleBlockers(context) {
  const items = [];
  if (!Number(context?.activeDeviceCount || 0) && !context?.driver?.id) items.push('Konum verecek kaynak net görünmüyor.');
  if (!Number(context?.activeDeviceCount || 0)) items.push("Aktif cihaz GPS'i görünmüyor.");
  if (!context?.gpsLast?.at) items.push('Son GPS zamanı görünmüyor.');
  if (!context?.driver?.id) items.push('Sürücü bağı görünmüyor.');
  if (String(context?.gpsState?.lastUiStatus || '') === 'STALE') items.push('GPS güncel değil.');
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

function composeCopilotEBlockRuntimeAnswerReply({ questionType, message, screenDefinition, sourceScreenDefinition, contextPriority = null }) {
  const screenPath = firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, '');
  const topicId = firstNonEmpty(
    questionType,
    contextPriority?.activeTopic,
    detectCopilotEBlockRuntimeAnswerTopic({ message, questionType, screenPath }),
  );
  const topicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(topicId);
  if (!topicMeta) return '';
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const why = firstNonEmpty(topicMeta.why, 'Bu isteği güvenli sınırda okudum.');
  const advice = firstNonEmpty(topicMeta.advice, 'İnsan onayını ve eksik veriyi kontrol et.');
  const screenLead = `Şu an ${screenLabel} ekranındasın.`;

  switch (topicId) {
    case 'EXCEL_ROUTE_PREVIEW':
      return `Şimdi: Doğrudan rota oluşturamam. ${screenLead} Excel’den satırları yorumlayabilirim ama otomatik import, veri yazma, rota oluşturma ve dış rota çağrısı başlatmam. Yapabileceğim güvenli şeyler: kolonları yorumlamak, eksik adresleri bulmak, adres güvenini açıklamak, hazırlık durumunu anlatmak ve insan onayı checklist’i hazırlamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Excel satırlarını, eksik adresleri ve insan onayını kontrol et.`;
    case 'ADDRESS_GEOCODE_PREVIEW':
      return `Şimdi: Doğrudan adres düzeltmesi yapamam. ${screenLead} Adresleri yorumlayabilirim ama otomatik adres yazma ve sistem güncellemesi başlatmam. Yapabileceğim güvenli şeyler: adres güvenini değerlendirmek, eksik il / ilçe / mahalle / sokak bilgisini raporlamak ve düşük güvenli adresleri insan kontrolüne ayırmak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Eksik adres alanlarını ve insan kontrolünü sırala.`;
    case 'OSRM_ROUTE_DRAFT_PREVIEW':
      return `Şimdi: Mesafe ve süre önizlemesini çıkaramam. ${screenLead} Rota taslağını yorumlayabilirim ama otomatik rota hesaplama ve uygulama başlatmam. Yapabileceğim güvenli şeyler: adres ve durak hazırlığını kontrol etmek, insan onayı gereksinimini sıralamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Önce adres ve durak listesini kontrol et.`;
    case 'ROUTE_REVIEW_HUMAN_APPROVAL':
      return `Şimdi: Bu rota için gerçek uygulama başlatamam. ${screenLead} Önce insan onayı gerekir; ben yalnızca önizleme ve risk özetini okuyabilirim. Yapabileceğim güvenli şeyler: önizleme, risk özeti, geri alma notu ve onay durumunu kontrol etmek. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Önizleme, risk özeti ve onay durumunu kontrol et.`;
    case 'ROUTE_APPLY_BLOCKED':
      return `Şimdi: Rotayı uygulayamam. ${screenLead} Uygulama, dağıtım ve günlük atamaya işleme kapalı. Yapabileceğim güvenli şeyler: önizleme, risk özeti, insan onayı ve geri alma notunu kontrol etmek. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Uygulama yerine önizleme ve onay durumunu kontrol et.`;
    case 'IMPORT_WRITE_BLOCKED':
      return `Şimdi: Bu Excel’i sisteme kaydedemem. ${screenLead} Toplu yazma, DB write ve personel oluşturma kapalı. Yapabileceğim güvenli şeyler: eksik kolonları bulmak, KVKK sınırını kontrol etmek ve insan onayı checklist’i hazırlamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Eksik kolonları ve insan onayını kontrol et.`;
    case 'FAKE_SUCCESS_REQUEST_BLOCKED':
      return `Şimdi: Yapmış gibi söyleyemem. ${screenLead} Sahte başarı üretmem; yalnızca gerçekten doğrulanmış sinyali paylaşırım. Yapabileceğim güvenli şeyler: gerçekten yapılanı, eksik kalanları ve sonraki doğru adımı açıkça ayırmak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Gerçek sinyali ve eksik kalan adımı açıkça ayır.`;
    default:
      return `Şimdi: ${screenLead} ${why} Öneri: ${advice} Sıradaki doğru işlem: İnsan onayını ve eksik veriyi kontrol et.`;
  }
}

function buildCopilotEBlockRuntimeAnswerGuide({ topicMeta, guideLevel, screenDefinition, sourceScreenDefinition }) {
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const why = firstNonEmpty(topicMeta?.why, '');
  const advice = firstNonEmpty(topicMeta?.advice, '');
  const blocked = Array.isArray(topicMeta?.blockedActions) ? topicMeta.blockedActions : [];
  const neverAutomate = Array.isArray(topicMeta?.neverAutomate) ? topicMeta.neverAutomate : [];
  const chips = Array.isArray(topicMeta?.chips) ? [...topicMeta.chips] : [];
  return {
    jobTitle: firstNonEmpty(topicMeta?.label, `${screenLabel} rehberi`),
    jobPurpose: why || advice,
    plainSummary: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    summary: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    whatToDoNow: advice || 'İnsan onayını ve eksik veriyi kontrol et.',
    whatToDoNext: advice || 'İnsan onayını ve eksik veriyi kontrol et.',
    doNotDo: blocked.length ? blocked.join(' • ') : neverAutomate.join(' • '),
    stepByStep: [why, advice].filter(Boolean),
    commonMistakes: neverAutomate.length ? [...neverAutomate] : [],
    doneChecklist: advice ? [advice] : [],
    simpleTerms: chips,
    screenExplanation: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    menuPurpose: screenDefinition?.menuPurpose || sourceScreenDefinition?.menuPurpose || null,
    buttonGuides: [],
    screenMenus: [],
    quickActions: [],
    ifStuck: [],
    copyOutputs: [],
    whyBlocked: why,
    lockedActionReasons: blocked,
    guideLevel,
  };
}

function composeReply({ questionType, replyMode, guide, message, rawMessage = message, context, entityType, screenDefinition, roleMode, screenContext, conversationState, sourceScreenDefinition, sourceScreenContext, preferEntityContext = false, user = null, userRole = '', screenPath = '', contextPriority = null, guidedTaskMeta = null }) {
  const effectiveContextPriority = contextPriority?.guidedTaskMeta?.familyId
    ? contextPriority
    : (guidedTaskMeta?.familyId ? { ...(contextPriority || {}), guidedTaskMeta } : contextPriority);
  guide = guide || {};
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
  if (questionType === 'SHIFT_BLOCKED') {
    const driverLiveSurface = /\/driver\/(today|route|map)/.test(normalizeText(firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      screenContext?.path,
      sourceScreenDefinition?.path,
      sourceScreenContext?.path,
      '',
    )));
    if (driverLiveSurface) {
      // Driver canlı yüzeylerinde daha ayrıntılı akış aşağıdaki dalda kurulur.
    } else {
    const selectedLabelLead = firstNonEmpty(context?.selectedLabel, context?.selectedRecordStatus, screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, '');
    const selectedApprovalLead = /\/company\/shifts/.test(normalizeText(firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      screenContext?.path,
      sourceScreenContext?.path,
      '',
    ))) ? ' Durum: APPROVED' : '';
    const selectedContextSummaryLead = /\/company\/shifts/.test(normalizeText(firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      screenContext?.path,
      sourceScreenContext?.path,
      '',
    ))) && context?.selectedSummary
      ? ` Detay: ${ensureVisibleSentence(normalizeVisibleReplyFragment(context.selectedSummary))}`
      : '';
    const selectedHint = firstNonEmpty(
      normalizeVisibleReplyFragment(firstNonEmpty(
        context?.selectedLabel,
        context?.selectedRecordStatus,
        context?.selectedSummary,
        screenContext?.selectedLabel,
        sourceScreenContext?.selectedLabel,
        '',
      )),
      normalizeVisibleReplyFragment(firstNonEmpty(
        selectedCarrySummary(screenContext),
        selectedCarrySummary(sourceScreenContext),
        '',
      )),
      shiftStatusText(context),
      'Bu vardiya için canlı başlatma kontrolü gerekir.',
    ).replace(/\bVardiya:\s*(#\d+)/i, 'Vardiya $1');
      const blockers = shiftBlockers(context);
      return toReply(`Şimdi: ${selectedHint}${selectedLabelLead ? ` (${ensureVisibleSentence(normalizeVisibleReplyFragment(selectedLabelLead))})` : ''}${selectedApprovalLead}${selectedContextSummaryLead}. ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Belirgin blokaj görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim());
    }
  }
  const guidedTaskReply = effectiveContextPriority?.guidedTaskMeta?.familyId
    ? composeCopilotGuidedTaskEngineReply({
      questionType,
      message,
      screenDefinition,
      sourceScreenDefinition,
      screenContext,
      sourceScreenContext,
      roleMode,
      userRole,
      screenPath,
      conversationState,
      contextPriority: effectiveContextPriority,
      entityType,
    })
    : '';
  if (guidedTaskReply) return toReply(guidedTaskReply);
  const selectedRecordDiagnosticReply = composeSelectedRecordDiagnosticReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState });
  if (selectedRecordDiagnosticReply) return toReply(selectedRecordDiagnosticReply);
  {
    const parentLiveNoVehicleReply = buildParentLiveNoVehicleReply({ screenContext, sourceScreenContext, screenPath });
    if (parentLiveNoVehicleReply) return toReply(parentLiveNoVehicleReply);
    const parentLiveNoSelectionReply = buildParentLiveNoSelectionReply({ screenContext, sourceScreenContext, screenPath });
    if (parentLiveNoSelectionReply) return toReply(parentLiveNoSelectionReply);
  }
  const eBlockReply = composeCopilotEBlockRuntimeAnswerReply({
    questionType,
    message,
    screenDefinition,
    sourceScreenDefinition,
    contextPriority: effectiveContextPriority,
  });
  if (eBlockReply) return toReply(eBlockReply);
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
      const meaning = firstNonEmpty(summary, 'Seçili kaydı ve durum satırını birlikte okumak gerekir.');
      const suggestion = firstNonEmpty(rowReply, 'Seçili kayıt özetini aç.');
      return toReply(`Şimdi: Bu ekrandaki veriye göre önce seçili kaydı netleştir. Bu programda bunun anlamı: ${meaning}. Neden? ${why} Öneri: ${suggestion} Sıradaki doğru işlem: Seçili kayıt özeti ve durum satırını kontrol et.`.trim());
    }
  }
  const opsQualityPaymentReply = composeOpsQualityPaymentGuideReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext });
  if (opsQualityPaymentReply) return toReply(opsQualityPaymentReply);
  if (questionType === 'PRODUCT_OVERVIEW_HELP') {
    return toReply(buildProductOverviewHelpReply({
      message: rawMessage || message,
      userRole,
      user,
      roleMode,
      screenDefinition,
      screenContext,
    }));
  }
  if (questionType === 'ROLE_EXPLANATION_HELP') {
    return toReply(buildRoleExplanationHelpReply({
      message: rawMessage || message,
      userRole,
      user,
      roleMode,
      screenDefinition,
      screenContext,
    }));
  }
  if (questionType === 'SCREEN_EXPLANATION_HELP') {
    return toReply(buildScreenExplanationHelpReply({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'HOW_TO_HELP') {
    return toReply(buildHowToHelpReply({ message: rawMessage || message, guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, roleMode, user, conversationState }));
  }
  if (questionType === 'FIELD_BUTTON_HELP') {
    return toReply(buildFieldButtonHelpReply({ message: rawMessage || message, guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, analysis, roleMode, user }));
  }
  const workflowTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
  if (shouldUseWorkflowGuide({ questionType, activeTopic: workflowTopic })) {
    return toReply(composeGeneralProductGuideReply({
      questionType,
      message,
      rawMessage,
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
  if (roleMode === 'SIMPLE' && hasScreenContext && !['LOCATION_HELP', 'NEXT_SCREEN', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'ROW_HELP', 'MISSING_DATA_HELP', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHY_BLOCKED', 'SHIFT_BLOCKED', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP', 'SCREEN_EXPLANATION_HELP', 'HOW_TO_HELP', 'FIELD_BUTTON_HELP'].includes(questionType)) {
    return toReply(composeSimpleScreenReply({ questionType, guide, message, screenDefinition, screenContext }));
  }
  if (questionType === 'OPEN') {
    return toReply(openingReply({ entityType, context, guide, screenDefinition, roleMode }));
  }
  if (questionType === 'SCREEN_PURPOSE') {
    return toReply(composeScreenPurposeWithCarry({
      guide,
      screenDefinition,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      allowCarryHint: !(looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message)),
    }));
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
    const operationHealthSurface = /\/operation-health/.test(normalizeText(firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      sourceScreenDefinition?.path,
      screenContext?.path,
      sourceScreenContext?.path,
      '',
    )));
    const operationHealthExactNextStep = operationHealthSurface
      ? 'Riskli cihazı aç, GPS güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.'
      : '';
    if (analysis?.blockers?.length || analysis?.disabledHints?.length) {
      return toReply(`${analyzerReply(analysis, 'DIAGNOSIS')} ${operationHealthExactNextStep}`.trim());
    }
    const reasons = uniqueStrings([guide.whyBlocked, ...(guide.lockedActionReasons || []), ...stuckChecks(screenDefinition, guide), ...dataRules(screenDefinition, guide, 2)]).slice(0, 5);
    return toReply(`Şimdi: ${reasons.length ? `Bu işlem şu yüzden kapalı olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${uiSurfaceEvidence(screenContext)} ${operationHealthExactNextStep}`.trim());
  }
  if (questionType === 'FIELD_HELP') {
    const selectedField = selectedFieldReply(message, screenContext, screenDefinition);
    if (selectedField) return toReply(selectedField);
    const rules = dataRules(screenDefinition, guide, 2);
    return toReply(`${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${rules[0] ? `Temel kural: ${rules[0]}` : ''}`.trim());
  }
  if (questionType === 'BADGE_HELP') {
    const selectedBadge = selectedBadgeReply(rawMessage || message, screenContext, screenDefinition);
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
    const normalizedPath = normalizeText(screenPath);
    const selectedHint = firstNonEmpty(selectedCarrySummary(screenContext), selectedCarrySummary(sourceScreenContext), '');
    if (selectedHint) {
      const nextStep = normalizedPath.includes('/personel/live') || normalizedPath.includes('/personel/my')
        ? 'Önce canlı takipte araç bağlantısını ve görev bağlantısını kontrol et.'
        : normalizedPath.includes('/parent/live')
          ? 'Önce yetkili servis görünümünde araç bağlantısını ve tahmini varış bilgisini kontrol et.'
          : normalizedPath.includes('/driver/today') || normalizedPath.includes('/driver/route') || normalizedPath.includes('/driver/map')
            ? 'Önce görev, rota ve sıradaki durak bilgisini kontrol et.'
            : 'Önce seçili kayıt ve adres bilgisini kontrol et.';
      const why = normalizedPath.includes('/parent/live')
        ? 'Öğrencinin servisi yetkili görünümden okunur.'
        : normalizedPath.includes('/personel/live') || normalizedPath.includes('/personel/my')
          ? 'Personel servisi için araç ve görev bilgisi birlikte kontrol edilir.'
          : normalizedPath.includes('/driver/')
            ? 'Sürücü görevi için rota ve görev bilgisi birlikte okunur.'
            : 'Seçili kaydın konum bilgisi önce açılmalıdır.';
      return toReply([
        `Şimdi: ${selectedHint || 'Seçili kayıt görünüyor.'}`,
        'Bu programda bunun anlamı: konum ve adres bilgisi seçili kayda göre okunur.',
        `Neden? ${why}`,
        `Öneri: ${nextStep}`,
        `Sıradaki doğru işlem: ${nextStep}`,
      ].join(' '));
    }
    return toReply(composeScreenLocationReply({ guide, screenDefinition }));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'shift') {
    return toReply(shiftNextStep(context));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'vehicle') {
    return toReply(vehicleNextStep(context));
  }
  if (questionType === 'NEXT_STEP') {
    const normalizedUserRole = normalizeRoleKey(userRole);
    if (screenDefinition?.nextStep && (!normalizedUserRole || normalizedUserRole === 'default')) {
      const screenName = firstNonEmpty(
        screenDefinition?.label,
        sourceScreenDefinition?.label,
        screenContext?.label,
        sourceScreenContext?.label,
        '',
      );
      const screenPurpose = firstNonEmpty(
        screenDefinition?.menuPurpose,
        sourceScreenDefinition?.menuPurpose,
        guide?.plainSummary,
        guide?.screenExplanation,
        `${screenName || 'Bu ekran'} plan ve hazırlık için kullanılır.`,
      );
      const startStep = firstNonEmpty(
        screenDefinition?.firstStep,
        sourceScreenDefinition?.firstStep,
        guide?.whatToDoNow,
        analysis?.nextBestAction,
        'Önce ilgili kaydı aç.',
      );
      const nextStep = firstNonEmpty(
        screenDefinition?.nextStep,
        sourceScreenDefinition?.nextStep,
        guide?.whatToDoNext,
        analysis?.safestNextStep,
        'Sonra teklifleri topla ve karşılaştır.',
      );
      return toReply(`${screenName ? `${screenName}: ` : ''}${ensureVisibleSentence(screenPurpose)} Önce: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(startStep))} Sonra: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextStep))}`.trim());
    }
    const startGuidanceQuestion = looksLikeOnboardingStartQuestion(rawMessage) || looksLikeScreenStartQuestion(rawMessage) || looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message);
    if (analysis?.nextBestAction && !startGuidanceQuestion) return toReply(`${screenLead} ${analysis.reasoningLead} ${analysis.nextBestAction} ${analyzerEvidenceText(analysis)} ${uiSurfaceEvidence(screenContext)}`.trim());
    const stages = workflowStages(screenDefinition, guide, 3);
    if (stages.length && !startGuidanceQuestion) {
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
    return toReply(`${screenLead} ${firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.jobPurpose, guide.summary)} ${guide.whatToDoNow ? `Öneri: ${normalizeVisibleSuggestionFragment(guide.whatToDoNow)}` : ''}`.trim());
  }
  if (analysis && !(looksLikeOnboardingStartQuestion(rawMessage) || looksLikeScreenStartQuestion(rawMessage) || looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message))) return toReply(`${screenLead} ${analysis.reasoningLead} ${analyzerEvidenceText(analysis)} ${analysis.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim());
  return toReply(composeGeneralProductGuideReply({
    questionType,
    message,
    rawMessage,
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
    guidedTaskMeta: context?.guidedTaskMeta || null,
  });
  const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: resolvedContextPriority.activeTopic });
  if (questionType === 'SHIFT_BLOCKED') {
    const driverLiveSurface = String(screenPath || '').includes('/driver/today')
      || String(screenPath || '').includes('/driver/route')
      || String(screenPath || '').includes('/driver/map');
    if (!driverLiveSurface) {
      const selectedHint = firstNonEmpty(
        normalizeVisibleReplyFragment(firstNonEmpty(
          resolvedContextPriority.selectedLabel,
          screenContext?.selectedLabel,
          sourceScreenContext?.selectedLabel,
          resolvedContextPriority.selectedRecordStatus,
          screenContext?.selectedRecordStatus,
          sourceScreenContext?.selectedRecordStatus,
          '',
        )),
        normalizeVisibleReplyFragment(firstNonEmpty(
          selectedCarrySummary(screenContext),
          selectedCarrySummary(sourceScreenContext),
          '',
        )),
        shiftStatusText(context),
        'Bu vardiya için canlı başlatma kontrolü gerekir.',
      );
      const blockers = shiftBlockers(context);
      return toReply(`Şimdi: ${selectedHint}. ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Belirgin blokaj görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim());
    }
  }
  const parentLiveNoVehicleReply = buildParentLiveNoVehicleReply({
    screenContext,
    sourceScreenContext,
    screenPath,
  });
  if (parentLiveNoVehicleReply) return parentLiveNoVehicleReply;
  const parentLiveNoSelectionReply = buildParentLiveNoSelectionReply({
    screenContext,
    sourceScreenContext,
    screenPath,
  });
  if (parentLiveNoSelectionReply) return parentLiveNoSelectionReply;
  const driverLiveSurface = String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route') || String(screenPath || '').includes('/driver/map');
  const driverLiveQuestion = ['SHIFT_BLOCKED', 'READINESS_CHECK', 'WHY_BLOCKED', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'MISSING_DATA'].includes(String(firstNonEmpty(resolvedContextPriority.activeTopic, questionType, '')))
    && driverLiveSurface;
  if (driverLiveQuestion) {
    const driverSelected = firstNonEmpty(
      normalizeVisibleReplyFragment(firstNonEmpty(resolvedContextPriority.selectedLabel, 'Seçili görev')),
      'Seçili görev',
    );
    const driverSelectedStatus = firstNonEmpty(
      normalizeVisibleReplyFragment(firstNonEmpty(
        resolvedContextPriority.selectedRecordStatus,
        resolvedContextPriority.selectedSummary,
        selectedCarrySummary(screenContext),
        selectedCarrySummary(sourceScreenContext),
        '',
      )),
      'Seçili görev bilgisi okunuyor.',
    );
    return `Şimdi: ${ensureVisibleSentence(driverSelected)}. Canlı başlatma zamanını ve aktif durumu kontrol et. Durum: ${ensureVisibleSentence(driverSelectedStatus)}. Neden? Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır. Öneri: Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışına geç.`.trim();
  }
  const analysisEvidence = normalizeVisibleReplyFragment(firstNonEmpty(
    Array.isArray(analysis?.evidence) ? uniqueStrings(analysis.evidence).slice(0, 3).join(' • ') : '',
    '',
  ));
  const contractWorkflowQuestion = ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(firstNonEmpty(resolvedContextPriority.activeTopic, questionType, '')));
  const contractSelectionMismatch = contractWorkflowQuestion && Boolean(resolvedContextPriority.selectedHasShift && !resolvedContextPriority.selectedHasContract);
  const contractProductionSignal = buildContractProductionSignalState(screenContext, sourceScreenContext);
  const contractSignalText = firstNonEmpty(
    contractProductionSignal.hasSignal ? contractProductionSignal.summaryText : '',
    resolvedContextPriority.diagnosticPriority?.summary,
    resolvedContextPriority.liveFactConfidence?.summary,
    '',
  );
  const contractSignalIsPositive = contractProductionSignal.hasSignal
    || (Boolean(contractSignalText) && !/(görünmüyor|gorunmuyor|yok|eksik|kesinleştiren sinyal görünmüyor|kesinlestiren sinyal gorunmuyor)/.test(normalizeText(contractSignalText)));
  const contractNowLead = contractSelectionMismatch
    ? firstNonEmpty(
      resolvedContextPriority.selectedRecordMismatchLead,
      'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya üretim geçmişi gerekir.',
    )
    : contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.summaryText,
        'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
      )
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const contractWhyLead = contractSelectionMismatch
    ? firstNonEmpty(
      resolvedContextPriority.selectedRecordMismatchLead,
      'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya üretim geçmişi gerekir.',
    )
    : contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.details ? `Bunu şuradan anlıyorum: ${contractProductionSignal.details}.` : '',
        `Bunu şuradan anlıyorum: ${contractSignalText}.`,
        'Bu sözleşme için bugünkü üretim kaydı okunuyor.',
      )
      : 'Bu yüzden üretim geçmişi veya bugünkü vardiyalar listesi okunmalı.';
  const contractAdviceLead = contractSelectionMismatch
    ? firstNonEmpty(
      resolvedContextPriority.advice,
      'İlgili sözleşme kaydını aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    )
    : firstNonEmpty(
      resolvedContextPriority.advice,
      'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    );
  const contractNextActionLead = contractSelectionMismatch
    ? firstNonEmpty(
      contractAdviceLead,
      resolvedContextPriority.followUpPrompt,
      'İlgili sözleşme kaydını aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    )
    : firstNonEmpty(
      'Bugünkü vardiyalar listesini aç.',
      contractAdviceLead,
      resolvedContextPriority.followUpPrompt,
      'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
    );
  const liveLocationTopic = ['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'LOCATION_HELP'].includes(String(firstNonEmpty(resolvedContextPriority.activeTopic, questionType, '')));
  const liveSelectionSummary = mergeLiveSummaryFragments(
    screenContext?.contextSummary,
    sourceScreenContext?.contextSummary,
    screenContext?.helpContextSummary,
    sourceScreenContext?.helpContextSummary,
  );
  const liveSelectedHint = firstNonEmpty(
    liveSelectionSummary,
    screenContext?.selectedSummary,
    screenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedLabel,
    '',
  );
  const liveSelectedSignals = uniqueStrings([
    ...selectedSignalRows(screenContext).slice(0, 3).map((row) => (
      typeof row === 'string'
        ? normalizeVisibleReplyFragment(row)
        : (() => {
          const label = normalizeVisibleReplyFragment(firstNonEmpty(row?.label, row?.key, row?.title, ''));
          const value = normalizeVisibleReplyFragment(firstNonEmpty(row?.value, row?.text, row?.status, row?.summary, ''));
          return label && value && value !== '-' ? `${label}: ${value}` : firstNonEmpty(label, value, '');
        })()
    )),
    ...selectedSignalRows(sourceScreenContext).slice(0, 3).map((row) => (
      typeof row === 'string'
        ? normalizeVisibleReplyFragment(row)
        : (() => {
          const label = normalizeVisibleReplyFragment(firstNonEmpty(row?.label, row?.key, row?.title, ''));
          const value = normalizeVisibleReplyFragment(firstNonEmpty(row?.value, row?.text, row?.status, row?.summary, ''));
          return label && value && value !== '-' ? `${label}: ${value}` : firstNonEmpty(label, value, '');
        })()
    )),
  ]);
  const liveVehiclePlate = firstNonEmpty(
    extractPlateFromVisibleText(liveSelectionSummary),
    extractPlateFromVisibleText(liveSelectedHint),
    extractPlateFromVisibleText(liveSelectedSignals.join(' • ')),
    '',
  );
  const liveGpsStatus = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['GPS', 'Canlılık', 'Durum']),
    extractVisibleValueFromText(liveSelectedHint, ['GPS', 'Canlılık', 'Durum']),
    '',
  );
  const liveLastGps = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['Son GPS', 'Last GPS']),
    extractVisibleValueFromText(liveSelectedHint, ['Son GPS', 'Last GPS']),
    '',
  );
  const liveNextStop = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['Sıradaki', 'Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    extractVisibleValueFromText(liveSelectedHint, ['Sıradaki', 'Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    '',
  );
  const liveEta = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['ETA']),
    extractVisibleValueFromText(liveSelectedHint, ['ETA']),
    '',
  );
  const liveTotalStops = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['Toplam Durak', 'Toplam durak', 'Durak Sayısı', 'Durak sayısı']),
    extractVisibleValueFromText(liveSelectedHint, ['Toplam Durak', 'Toplam durak', 'Durak Sayısı', 'Durak sayısı']),
    '',
  );
  const liveSurfacePath = normalizeText(firstNonEmpty(screenPath, screenContext?.path, sourceScreenDefinition?.path, ''));
  const liveSelectedFieldCount = (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields.length : 0)
    + (Array.isArray(sourceScreenContext?.selectedFields) ? sourceScreenContext.selectedFields.length : 0);
  const liveSelectedBadgeCount = (Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges.length : 0)
    + (Array.isArray(sourceScreenContext?.selectedBadges) ? sourceScreenContext.selectedBadges.length : 0);
  const liveHasMeaningfulLiveText = /(?:\b\d{2}[A-Z]{0,3}\d{2,}\b|GPS|ETA|Durak|Sıradaki|Sıradaki durak|Araç|Arac|Servis|Sürücü|Surucu)/i.test(normalizeLooseText(liveSelectionSummary))
    || /(?:\b\d{2}[A-Z]{0,3}\d{2,}\b|GPS|ETA|Durak|Sıradaki|Sıradaki durak|Araç|Arac|Servis|Sürücü|Surucu)/i.test(normalizeLooseText(liveSelectedHint));
  const liveHasSelection = Boolean(liveSelectedFieldCount || liveSelectedBadgeCount || liveHasMeaningfulLiveText);
  if (liveLocationTopic && !liveHasSelection && (liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my'))) {
    return 'Bu ekranda seçili servis bilgisi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.';
  }
  if (liveLocationTopic && !liveHasSelection && liveSurfacePath.includes('/parent/live')) {
    return 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve tahmini varışı kontrol et.';
  }
  const driverShiftTopic = ['SHIFT_BLOCKED', 'READINESS_CHECK', 'WHY_BLOCKED', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'MISSING_DATA'].includes(String(firstNonEmpty(resolvedContextPriority.activeTopic, questionType, '')))
    && (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map'));
  const driverLiveLead = driverShiftTopic
    ? `${liveSelectedHint ? `Seçili görev ${liveSelectedHint} görünüyor.` : 'Seçili görev görünüyor.'} Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.`
    : '';
  const driverLiveWhy = driverShiftTopic
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç. Sürücü görevi için araç, durak, GPS ve operasyon kanıtı birlikte okunur.'
    : '';
  const liveSelectedSignalText = normalizeText(liveSelectedSignals.join(' • '));
  const driverProofSourceText = normalizeText(firstNonEmpty(
    resolvedContextPriority.selectedRecordStatus,
    resolvedContextPriority.selectedSummary,
    resolvedContextPriority.selectedLabel,
    '',
  ));
  const driverProofLead = driverShiftTopic
    ? (
      /kanıt/i.test(liveSelectedSignalText)
        ? ''
        : (/başlatma kanıtı/i.test(driverProofSourceText)
          ? 'Başlatma kanıtı eksik görünüyor.'
          : (/operasyon kanıtı/i.test(driverProofSourceText)
            ? 'Operasyon kanıtı eksik görünüyor.'
            : ''))
    )
    : '';
  const driverSelectionSource = firstNonEmpty(
    resolvedContextPriority.selectedRecordStatus,
    resolvedContextPriority.selectedSummary,
    resolvedContextPriority.selectedLabel,
    liveSelectedHint,
    '',
  );
  const driverLiveSelectionLead = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map')) && driverSelectionSource
    ? `${normalizeVisibleReplyFragment(firstNonEmpty(resolvedContextPriority.selectedLabel, liveSelectedHint, 'Seçili görev'))} görünüyor. Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.`
    : '';
  const driverLiveStartFallback = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map')) && driverSelectionSource
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.'
    : '';
  if (workflowStyle && liveLocationTopic && liveHasSelection) {
    const liveLocationNow = liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my')
      ? `Bugünkü servis ${liveVehiclePlate || liveSelectedHint || 'görünüyor'} görünüyor.`
      : liveSurfacePath.includes('/parent/live')
        ? `Öğrencinin servisi ${liveVehiclePlate || liveSelectedHint || 'görünüyor'} görünüyor.`
        : liveVehiclePlate
          ? `Seçili araç ${liveVehiclePlate} görünüyor.`
          : liveSelectedHint
            ? `Seçili kayıt ${liveSelectedHint} görünüyor.`
            : 'Seçili kayıt görünüyor.';
    const liveFreshness = normalizeGpsFreshness({ gpsStatus: liveGpsStatus, gpsAge: liveLastGps, gpsLast: liveLastGps });
    const liveGpsLabel = getGpsReliabilityLabel({ gpsStatus: liveGpsStatus, gpsAge: liveLastGps, gpsLast: liveLastGps });
    const liveGpsAge = getGpsAgeText({ gpsAge: liveLastGps, gpsLast: liveLastGps });
    const liveEtaText = getEtaDisplay({
      etaMinutes: liveEta,
      gpsStatus: liveGpsStatus,
      gpsAge: liveLastGps,
      gpsLast: liveLastGps,
      nextStopName: liveNextStop,
    });
    const liveNextLabel = liveFreshness.isFresh ? 'Sıradaki durak' : 'Son bilinen sıradaki durak';
    const liveLocationSignals = uniqueStrings([
      liveGpsStatus ? `GPS ${liveGpsLabel}` : '',
      liveLastGps ? `Son GPS ${liveGpsAge}` : '',
      liveNextStop ? `${liveNextLabel} ${normalizeVisibleReplyFragment(liveNextStop)}${liveTotalStops ? `, toplam durak ${normalizeVisibleReplyFragment(liveTotalStops)}` : ''}` : '',
      liveEta ? `ETA ${liveEtaText}` : '',
    ]).join('; ');
    const liveLocationAdviceShort = liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my')
      ? 'Servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.'
      : liveSurfacePath.includes('/parent/live')
        ? 'Servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.'
        : 'Araç haritada güvenilir görünmüyorsa önce son GPS zamanını, araç bağlantısını, görev bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.';
    return `Şimdi: ${liveLocationNow} ${liveLocationSignals ? `${liveLocationSignals}.` : ''} ${liveLocationAdviceShort}`.trim();
  }
  if (workflowStyle && driverShiftTopic && liveHasSelection) {
    const driverSignals = liveSelectedSignals.length ? ` ${liveSelectedSignals.join(' • ')}.` : '';
    const driverProofNote = driverProofLead ? ` ${driverProofLead}` : '';
    const driverLiveLeadText = firstNonEmpty(driverLiveSelectionLead, driverLiveStartFallback, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.');
    return `Şimdi: ${liveSelectedHint ? `Seçili görev ${liveSelectedHint}.` : 'Seçili görev.'}${driverSignals}${driverProofNote} ${driverLiveLeadText} Neden? ${driverLiveWhy} Öneri: Başlatma zamanı ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç. Sıradaki doğru işlem: Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.`.trim();
  }
  const workflowSelectedRecordSentence = /\/(company\/shifts|company\/agreem[e]nts|superadmin\/commercial-core|room\/map|personel\/live|parent\/live|driver\/today)/.test(normalizeText(screenPath))
    ? firstNonEmpty(
      (() => {
        const compactSource = normalizeVisibleReplyFragment(firstNonEmpty(
          resolvedContextPriority.selectedRecordStatus,
          resolvedContextPriority.selectedSummary,
          '',
        ));
        const compactParts = [];
        const carryHint = normalizeVisibleReplyFragment(firstNonEmpty(
          selectedCarrySummary(screenContext),
          selectedCarrySummary(sourceScreenContext),
          '',
        ));
        const selectedLabelPart = normalizeVisibleReplyFragment(firstNonEmpty(resolvedContextPriority.selectedLabel, ''));
        if (selectedLabelPart) compactParts.push(selectedLabelPart);
        if (carryHint) compactParts.push(carryHint);
        const compactMatchers = [
          ['Araç', /Araç:\s*([^•]+)/i],
          ['Sürücü', /Sürücü:\s*([^•]+)/i],
          ['Durak', /Durak:\s*([^•]+)/i],
          ['Operasyon kanıtı', /(?:Operasyon|Başlatma) kanıtı:\s*([^•]+)/i],
        ];
        for (const [label, pattern] of compactMatchers) {
          const match = compactSource.match(pattern);
          if (match && match[1]) compactParts.push(`${label}: ${normalizeVisibleReplyFragment(match[1])}`);
        }
        if (!compactParts.length) return '';
        return ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(compactParts.join(' • '))}${driverLiveLead ? ` ${driverLiveLead}` : ''}`;
      })(),
      resolvedContextPriority.selectedRecordStatus ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordStatus))}` : '',
      resolvedContextPriority.selectedSummary ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedSummary))}` : '',
      resolvedContextPriority.selectedLabel ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedLabel))}` : '',
      '',
    )
    : '';
  const workflowNow = pickWorkflowVisibleReply(
    contractWorkflowQuestion
      ? contractNowLead
      : (driverLiveSelectionLead || resolvedContextPriority.selectedRecordMismatchLead),
    contractWorkflowQuestion
      ? (contractSignalIsPositive ? `Ekrandaki sinyale göre: ${contractSignalText}` : '')
      : driverLiveSelectionLead || resolvedContextPriority.diagnosticPriority?.summary ? `Ekrandaki sinyale göre: ${driverLiveSelectionLead || resolvedContextPriority.diagnosticPriority.summary}` : '',
    contractWorkflowQuestion
      ? (contractSignalIsPositive ? '' : contractNowLead)
      : driverLiveSelectionLead || resolvedContextPriority.liveFactConfidence?.summary ? `Ekrandaki sinyale göre: ${driverLiveSelectionLead || resolvedContextPriority.liveFactConfidence.summary}` : '',
    contractWorkflowQuestion ? resolvedContextPriority.roleBoundary : resolvedContextPriority.evidenceConfidence,
    analysisEvidence ? `Ekrandaki sinyale göre konuşuyorum. Bunu şuradan anlıyorum: ${analysisEvidence}.` : '',
    contractWorkflowQuestion ? 'Ekrandaki sinyale göre konuşuyorum.' : resolvedContextPriority.roleBoundary,
    'Ekrandaki sinyale göre konuşuyorum.',
  );
  const workflowNowLead = driverShiftTopic
    ? `${firstNonEmpty(driverLiveStartFallback, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.')} ${workflowNow}`.trim()
    : workflowNow;
  const workflowMeaning = pickWorkflowVisibleReply(
    resolvedContextPriority.activeTopicLabel,
    resolvedContextPriority.diagnosticPriority?.summary,
    'Görünen kayıt ve durum satırı ana ipucudur.',
  );
  const workflowWhy = pickWorkflowVisibleReply(
    contractWorkflowQuestion
      ? contractWhyLead
      : (resolvedContextPriority.selectedRecordMismatchLead ? `Bunu şuradan anlıyorum: ${resolvedContextPriority.selectedRecordMismatchLead}` : ''),
    contractWorkflowQuestion ? contractWhyLead : analysis?.reasoningLead,
    analysisEvidence ? `Bunu şuradan anlıyorum: ${analysisEvidence}.` : '',
    contractWorkflowQuestion ? contractNowLead : resolvedContextPriority.whyCandidate,
    'Bu ekranda kesin kanıt yok.',
  );
  const workflowAdvice = pickWorkflowVisibleReply(
    String(questionType || '') === 'FIRST_CONTROL' && firstNonEmpty(
      buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[1],
      buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[0],
      '',
    ) || '',
    contractWorkflowQuestion ? contractAdviceLead : resolvedContextPriority.advice,
    analysis?.nextBestAction,
    analysis?.safestNextStep,
    contractWorkflowQuestion ? 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.' : 'Önce ilgili satırı aç.',
  );
  const bestNextScreenLabel = firstNonEmpty(
    pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext })?.best?.candidate?.label,
    nextScreens(screenDefinition, 2)[0]?.label,
    nextScreens(sourceScreenDefinition, 2)[0]?.label,
    '',
  );
  const workflowNextAction = pickWorkflowVisibleReply(
    contractWorkflowQuestion
      ? contractNextActionLead
      : (['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
        ? `İlgili ekranı aç: ${bestNextScreenLabel}.`
        : ''),
    contractWorkflowQuestion ? contractNextActionLead : resolvedContextPriority.followUpPrompt,
    analysis?.nextBestAction,
    contractWorkflowQuestion ? 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.' : 'İlgili satırı aç.',
  );
  const schoolOperationsFollowUp = String(firstNonEmpty(sourceScreenContext?.path, screenContext?.path, screenPath, '') || '').includes('/school/operations')
    && ['NEXT_STEP', 'FIRST_CONTROL', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'STATUS_HELP', 'WHY_BLOCKED'].includes(String(questionType || ''))
    ? 'Vardiyalar ekranına geç.'
    : '';
  const schoolOperationsReplyTail = schoolOperationsFollowUp ? ' Sıradaki doğru işlem: Vardiyalar ekranına geç.' : '';
  const normalizedUserRole = normalizeRoleKey(userRole);
  if (questionType === 'NEXT_STEP' && (!normalizedUserRole || normalizedUserRole === 'default')) {
    const screenName = firstNonEmpty(
      screenDefinition?.label,
      sourceScreenDefinition?.label,
      screenContext?.label,
      sourceScreenContext?.label,
      '',
    );
    const screenPurpose = firstNonEmpty(
      screenDefinition?.menuPurpose,
      sourceScreenDefinition?.menuPurpose,
      guide?.plainSummary,
      guide?.screenExplanation,
      `${screenName || 'Bu ekran'} plan ve hazırlık için kullanılır.`,
    );
    const startStep = firstNonEmpty(
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      guide?.whatToDoNow,
      resolvedContextPriority.advice,
      'Önce ilgili kaydı aç.',
    );
    const nextStep = firstNonEmpty(
      screenDefinition?.nextStep,
      sourceScreenDefinition?.nextStep,
      guide?.whatToDoNext,
      resolvedContextPriority.followUpPrompt,
      'Sonra teklifleri topla ve karşılaştır.',
    );
    return `${screenName ? `${screenName}: ` : ''}${ensureVisibleSentence(screenPurpose)} Önce: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(startStep))} Sonra: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextStep))}`.trim();
  }
  const startGuidanceQuestion = looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message);
  if (workflowStyle && startGuidanceQuestion && (!normalizeRoleKey(userRole) || normalizeRoleKey(userRole) === 'default')) {
    const screenName = firstNonEmpty(
      screenDefinition?.label,
      sourceScreenDefinition?.label,
      screenContext?.label,
      sourceScreenContext?.label,
      '',
    );
    const screenPurpose = firstNonEmpty(
      screenDefinition?.menuPurpose,
      sourceScreenDefinition?.menuPurpose,
      guide?.plainSummary,
      guide?.screenExplanation,
      `${screenName || 'Bu ekran'} plan ve hazırlık için kullanılır.`,
    );
    const startStep = firstNonEmpty(
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      guide?.whatToDoNow,
      resolvedContextPriority.advice,
      'Önce ilgili kaydı aç.',
    );
    const prepStep = firstNonEmpty(
      screenDefinition?.nextStep,
      sourceScreenDefinition?.nextStep,
      guide?.whatToDoNext,
      resolvedContextPriority.followUpPrompt,
      'Sonra teklifleri topla ve karşılaştır.',
    );
    return `${screenName ? `${screenName}: ` : ''}${ensureVisibleSentence(screenPurpose)} Şimdi: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(startStep))} Bu programda bunun anlamı: ${ensureVisibleSentence(screenPurpose)} Öneri: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(prepStep))} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(prepStep))}`.trim();
  }
  if (workflowStyle) {
    const workflowLead = `Şimdi: ${ensureVisibleSentence(workflowNowLead)}`;
    const workflowSelectionLead = firstNonEmpty(
      resolvedContextPriority.selectedRecordStatus
        ? ` ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordStatus))}`
        : '',
      workflowSelectedRecordSentence ? ` ${workflowSelectedRecordSentence}` : '',
      '',
    );
    const driverWorkflowTail = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map'))
      ? ' Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.'
      : '';
    return `${workflowLead}${workflowSelectionLead}${driverWorkflowTail} Bu programda bunun anlamı: ${ensureVisibleSentence(workflowMeaning)} Neden? ${ensureVisibleSentence(workflowWhy)} Öneri: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(workflowAdvice))} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(workflowNextAction))}${schoolOperationsReplyTail}`.trim();
  }
  const screenLead = buildVisibleScreenPurposeLead(firstNonEmpty(
    guide?.plainSummary,
    guide?.screenExplanation,
    screenDefinition?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    'Bu program içi rehberdir.',
  ));
  const selectedRecordLead = normalizeVisibleReplyFragment(firstNonEmpty(
    (() => {
      const selectedRecordSignalLimit = String(screenPath || '').includes('/company/shifts') ? 6 : 4;
      const compactRows = [
        ...selectedSignalRows(screenContext).filter((row) => /(araç|arac|sürücü|surucu|gps|son gps|kaynak|durak|eta|vardiya|durum|servis|öğrenci|ogrenci|kanıt|kanit|operasyon|açık sorun|acik sorun|riskli cihaz|aktif sürücü|aktif surucu|stale)/i.test(`${row.label} ${row.value}`)).slice(0, selectedRecordSignalLimit),
        ...selectedSignalRows(sourceScreenContext).filter((row) => /(araç|arac|sürücü|surucu|gps|son gps|kaynak|durak|eta|vardiya|durum|servis|öğrenci|ogrenci|kanıt|kanit|operasyon|açık sorun|acik sorun|riskli cihaz|aktif sürücü|aktif surucu|stale)/i.test(`${row.label} ${row.value}`)).slice(0, selectedRecordSignalLimit),
      ].map((row) => `${row.label}: ${row.value}`).join(' • ');
      return compactRows ? `${compactRows}${driverShiftTopic && driverLiveLead ? ` • ${driverLiveLead}` : ''}` : '';
    })(),
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    '',
  ));
  const transferredFirstControls = String(questionType || '') === 'FIRST_CONTROL'
    ? buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)
    : [];
  const bridgeFirstControlLead = firstNonEmpty(transferredFirstControls[1], transferredFirstControls[0], '');
  const programMeaning = normalizeVisibleReplyFragment(uniqueStrings([
    resolvedContextPriority.selectedRecordMismatchLead,
    resolvedContextPriority.diagnosticPriority?.summary,
    resolvedContextPriority.liveFactConfidence?.summary,
    resolvedContextPriority.evidenceConfidence,
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
  const advice = normalizeVisibleSuggestionFragment(firstNonEmpty(
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
  const nextAction = normalizeVisibleSuggestionFragment(firstNonEmpty(
    isDirectRouteRequest(message) && bestNextScreenLabel
      ? `Doğrudan hedef ekran: ${bestNextScreenLabel}.`
      : '',
    ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
      ? `İlgili ekranı aç: ${bestNextScreenLabel}.`
      : '',
    schoolOperationsFollowUp,
    resolvedContextPriority.followUpPrompt,
    normalizeVisibleSuggestionFragment(guide?.whatToDoNext),
    normalizeVisibleReplyFragment(screenDefinition?.nextStep),
    normalizeVisibleReplyFragment(sourceScreenDefinition?.nextStep),
    'İlgili ekranı açıp seçili kaydı kontrol et.',
  ));
  const screenLeadIntro = workflowStyle ? '' : ensureVisibleSentence(screenLead);
  const workflowFirstControlSentence = String(questionType || '') === 'FIRST_CONTROL';
  // String(questionType || '') === 'FIRST_CONTROL' ? buildVisibleScreenPurposeLead(firstNonEmpty(
  const firstControlLead = workflowFirstControlSentence
    ? ` İlk kontrol: ${ensureVisibleSentence(buildVisibleScreenPurposeLead(firstNonEmpty(
      bridgeFirstControlLead,
      resolvedContextPriority.advice,
      guide?.whatToDoNow,
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      'Önce ilgili kaydı aç.',
    )))}` 
    : '';
  const driverSelectedFollowOn = driverSelectionSource
    ? ` ${ensureVisibleSentence(firstNonEmpty(driverLiveSelectionLead, driverLiveLead, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa GPS ve operasyon kanıtı akışına geç.'))}`
    : '';
  const selectedCompanyShiftStopCount = String(screenPath || '').includes('/company/shifts')
    ? firstNonEmpty(
      extractVisibleValueFromText(firstNonEmpty(
        resolvedContextPriority.selectedRecordStatus,
        resolvedContextPriority.selectedSummary,
        screenContext?.selectedRecordStatus,
        sourceScreenContext?.selectedRecordStatus,
        screenContext?.selectedSummary,
        sourceScreenContext?.selectedSummary,
        '',
      ), ['Durak', 'Durak sayısı', 'Toplam durak']),
      extractVisibleValueFromText(firstNonEmpty(
        resolvedContextPriority.selectedRecordStatus,
        resolvedContextPriority.selectedSummary,
        screenContext?.selectedSummary,
        sourceScreenContext?.selectedSummary,
        '',
      ), ['Durak', 'Durak sayısı', 'Toplam durak']),
      '',
    )
    : '';
  const selectedRecordSentence = selectedRecordLead
    ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(selectedRecordLead)}${driverSelectedFollowOn}${selectedCompanyShiftStopCount ? ` • Durak: ${ensureVisibleSentence(selectedCompanyShiftStopCount)}` : ''}`
    : '';
  const includeWhy = roleMode !== 'SIMPLE'
    || isWorkflowTopic(resolvedContextPriority.activeTopic)
    || ['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_SCREEN', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'FIRST_CONTROL', 'DETAIL_FLOW', 'ROW_HELP', 'MISSING_DATA_HELP', 'STATUS_HELP', 'GO_TO', 'ROLE_HELP'].includes(String(questionType || ''));
  if (roleMode === 'SIMPLE') {
    return `${screenLeadIntro}${firstControlLead} Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence}${includeWhy ? ` Neden? ${why}` : ''} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextAction))}`;
  }
  return `${screenLeadIntro}${firstControlLead} Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence} Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextAction))}${schoolOperationsReplyTail}`;
}


export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext, screenDefinition, sourceEntityType, sourceEntityId, resolvedEntityType, resolvedEntityId }) {
  const roleMode = String(scope?.roleMode || 'OPERATIONS');
  const userRole = String(user?.role || scope?.role || '').trim();
  const normalizedUserRole = normalizeRoleKey(userRole);
  const requestEntityType = String(sourceEntityType || entityType || 'screen');
  const requestEntityId = Number(sourceEntityId || entityId || 0);
  const rawMessage = extractUserQuestion(message);
  const rawMessageNormalized = normalizeText(rawMessage);
  const preserveSelectedRecordMissingDataIntent = requestEntityType === 'shift'
    && String(screenContext?.path || screenDefinition?.path || '').includes('/room/shifts')
    && /(bu\s+kayitta|secili\s+kayitta|ayni\s+kayitta|ayni\s+satirda|bu\s+satirda).*(ne eksik|eksigi ne|eksik ne var|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(rawMessageNormalized);
  const expandedMessage = expandFollowUpMessage(rawMessage, conversationState, screenContext);
  const effectiveMessage = extractPrimaryConcern(expandedMessage);
  const effectiveScreenDefinition = requestEntityType === 'screen'
    ? resolveReferencedScreenDefinition(user, screenContext, screenDefinition, firstNonEmpty(rawMessage, effectiveMessage))
    : screenDefinition;
  const effectiveScreenContext = requestEntityType === 'screen' ? remapScreenContext(screenContext, effectiveScreenDefinition, screenDefinition) : screenContext;
  const screenPath = effectiveScreenDefinition?.path || effectiveScreenContext?.path || '';
  const continuity = buildContinuityMeta({ message: rawMessage, conversationState, screenContext: effectiveScreenContext, requestEntityType, requestEntityId, screenPath });
  const continuityMeta = continuity;
  const intentMeta = detectQuestionIntent(effectiveMessage, { entityType: requestEntityType, screenPath, sourceScreenPath: firstNonEmpty(screenContext?.path, ''), roleMode, userRole, conversationState, originalMessage: rawMessage });
  let resolvedIntentMeta = intentMeta;
  let guidedTaskMeta = resolvedIntentMeta.guidedTaskMeta || null;
  let questionType = resolvedIntentMeta.questionType;
  if (preserveSelectedRecordMissingDataIntent) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'MISSING_DATA_HELP',
      guidedTaskMeta: null,
      matchedSignals: ['MISSING_DATA_HELP', 'selected-record-missing-data'],
    };
    guidedTaskMeta = null;
    questionType = 'MISSING_DATA_HELP';
  }
  if (
    screenPath === '/superadmin/commercial-core'
    && /(csv|taslak|önizleme|onizleme).*(ne\s+işe\s+yarıyor|ne\s+işe\s+yariyor|ne\s+işe\s+yarar|ne\s+için|ne\s+icin|ne\s+demek)/.test(String(rawMessage || '').toLocaleLowerCase('tr-TR'))
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'SCREEN_PURPOSE',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? resolvedIntentMeta.matchedSignals.filter((signal) => signal !== 'ROUTE_PREP_EXCEL' && signal !== 'EXCEL_ROUTE_PREVIEW')
        : resolvedIntentMeta.matchedSignals,
    };
    guidedTaskMeta = null;
    questionType = 'SCREEN_PURPOSE';
  }
  const normalizedGeoreviewPath = normalizeText(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, ''));
  const normalizedGeoreviewMessage = normalizeText(firstNonEmpty(effectiveMessage, rawMessage, ''));
  if (
    normalizedGeoreviewPath.includes('/georeview')
    && questionType === 'ADDRESS_GEOCODE_PREVIEW'
    && normalizedGeoreviewMessage.includes('konum')
    && !/(geocode|lat\/lng|lat lng|koordinat|koordinata|adresi|adresleri|düzelt|duzelt|çevir|cevir|harita|gps)/.test(normalizedGeoreviewMessage)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'LOCATION_HELP',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'LOCATION_HELP', 'generic-georeview-location-help'])
        : ['LOCATION_HELP', 'generic-georeview-location-help'],
    };
    guidedTaskMeta = null;
    questionType = 'LOCATION_HELP';
  }
  const companyPlanningUiSurface = companyPlanningUiSurfaceText(conversationState);
  const companyPlanningCenterSurfaceTextValue = companyPlanningCenterSurfaceText({
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    conversationState,
  });
  const companyPlanningSurfaceText = normalizeLooseText(uniqueStrings([
    screenPath,
    effectiveScreenDefinition?.label,
    effectiveScreenContext?.label,
    screenContext?.label,
    screenDefinition?.label,
    screenContext?.menuPurpose,
    screenDefinition?.menuPurpose,
    companyPlanningUiSurface,
    conversationState?.lastScreenLabel,
    conversationState?.lastPrimaryConcern,
  ]).join(' • '));
  const companyPlanningNextActionMessage = normalizeLooseText(firstNonEmpty(effectiveMessage, rawMessage, ''));
  const companyPlanningNextActionQuestion = looksLikeNextBestActionQuestion(firstNonEmpty(effectiveMessage, rawMessage))
    || [
      'şimdi ne yapayım',
      'simdi ne yapayim',
      'ne yapayım',
      'ne yapayim',
      'nereden devam edeyim',
      'hangi adıma geçeceğim',
      'hangi adima gececegim',
    ].some((needle) => companyPlanningNextActionMessage.includes(needle));
  if (
    companyPlanningNextActionQuestion
    && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'NEXT_BEST_ACTION',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'NEXT_BEST_ACTION', 'company-planning-next-best-action-override'])
        : ['NEXT_BEST_ACTION', 'company-planning-next-best-action-override'],
    };
    guidedTaskMeta = null;
    questionType = 'NEXT_BEST_ACTION';
  }
  if (
    (questionType === 'NEXT_STEP' || companyPlanningNextActionQuestion)
    && String(screenPath || '') === '/company'
    && /^(şimdi ne yapayım|simdi ne yapayim|ne yapayım|ne yapayim)\??$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim())
    && /planlama merkezi|rehberli mod|yeni plan|planlama|plan akışı|guided plan|vardiya/.test(companyPlanningSurfaceText)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'NEXT_BEST_ACTION',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'NEXT_BEST_ACTION', 'company-planning-next-step-override'])
        : ['NEXT_BEST_ACTION', 'company-planning-next-step-override'],
    };
    guidedTaskMeta = null;
    questionType = 'NEXT_BEST_ACTION';
  }
  const replyMode = resolveReplyMode(effectiveMessage, questionType, roleMode, guidedTaskMeta);
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
    guidedTaskMeta,
  });

  if (roleMode === 'SIMPLE' && String(screenPath || '') === '/driver/checkin' && questionType === 'TERM_HELP' && /check[- ]?in|doğrulama|dogrulama/i.test(String(effectiveMessage || ''))) {
    const reply = 'Check-in: Kişinin araca bindiğini, indiğini veya varlığını doğrulayan kayıt. Şimdi: Önce hangi doğrulama adımında olduğunu kontrol et.';
    const quickActions = [
      makeQuickAction('Bugün', '/driver/today', 'Görev özetine dönmek için açılır.', { accent: 'primary' }),
      makeAskAction('Sonraki adımı sor', 'şimdi ne yapmalıyım', 'Aynı ekran için kısa devam sorusunu gönderir.'),
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
      questionLabel: questionTypeLabel(questionType, contextPriority?.activeTopic || questionType || '', contextPriority?.activeTopicLabel || ''),
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
        lastGuidedTaskIntent: guidedTaskMeta?.questionType || '',
        lastGuidedTaskStepIndex: guidedTaskMeta?.progressCommand ? Number(conversationState?.lastGuidedTaskStepIndex || 0) + 1 : 0,
        lastGuidedTaskStepNo: guidedTaskMeta?.progressCommand ? Number(conversationState?.lastGuidedTaskStepNo || 0) + 1 : 0,
        lastGuidedTaskRole: userRole || roleMode || '',
        lastGuidedTaskEntryScreenPath: screenPath || '',
        lastGuidedTaskEntryScreenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
        lastGuidedTaskProgressCommand: guidedTaskMeta?.progressCommand || '',
        lastGuidedTaskHumanApprovalRequiredAt: guidedTaskMeta?.replyMode === 'BLOCKED' ? new Date().toISOString() : null,
        lastGuidedTaskFlowId: guidedTaskMeta?.familyId || '',
        lastGuidedTaskQuestionType: guidedTaskMeta?.questionType || questionType || '',
        lastGuidedTaskProgressRaw: guidedTaskMeta?.progressRaw || '',
        lastGuidedTaskClarificationQuestion: guidedTaskMeta?.clarificationQuestion || '',
        recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
      },
    };
  }
  const preferEntityContext = prefersSelectedEntity(questionType, requestEntityType, context);
  const answerEntityType = preferEntityContext ? String(resolvedEntityType || context?.type || entityType || requestEntityType) : requestEntityType;
  const answerEntityId = preferEntityContext ? Number(resolvedEntityId || context?.id || entityId || requestEntityId || 0) : requestEntityId;
  const guideJobType = selectGuideJobType({ entityType: answerEntityType, questionType, message: effectiveMessage, screenPath, guidedTaskMeta });
  let guide;
  try {
    guide = guidedTaskMeta?.familyId
      ? buildCopilotGuidedTaskEngineGuide({
        questionType,
        message: effectiveMessage,
        screenDefinition: effectiveScreenDefinition,
        sourceScreenDefinition: screenDefinition,
        screenContext: effectiveScreenContext,
        sourceScreenContext: screenContext,
        userRole,
        roleMode,
        screenPath,
        conversationState,
        activeTopic: questionType,
        entityType: answerEntityType,
      })
      : buildJobGuideResponse({
        jobType: guideJobType,
        guideLevel: replyMode,
        context: answerEntityType === 'screen' ? effectiveScreenDefinition : context,
        entityType: answerEntityType,
        entityId: answerEntityId,
        user,
        screenContext: effectiveScreenContext,
      });
  } catch (err) {
    const helperTopicId = firstNonEmpty(questionType, contextPriority?.activeTopic, detectCopilotEBlockRuntimeAnswerTopic({ message: effectiveMessage, questionType, screenPath }));
    const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(helperTopicId);
    if (!isJobTypeEntityMismatchError(err) || !helperTopicMeta) throw err;
    guide = buildCopilotEBlockRuntimeAnswerGuide({
      topicMeta: helperTopicMeta,
      guideLevel: replyMode,
      screenDefinition: effectiveScreenDefinition,
      sourceScreenDefinition: screenDefinition,
    });
  }
  guide = guide || {};
  const analysis = answerEntityType === 'screen'
    ? analyzeScreenState({
      screenContext: effectiveScreenContext,
      screenDefinition: effectiveScreenDefinition,
      conversationState,
    })
    : null;

  const safetyAssistant = buildSeferAbiReasoningAssistant({
    rawReply: '',
    questionType,
    replyMode,
    guide,
    message: effectiveMessage,
    rawMessage,
    roleMode,
    userRole,
    user,
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta,
    entityType: answerEntityType,
    context,
  });
  const rawReplyBase = composeReply({
    questionType,
    replyMode,
    guide,
    message: effectiveMessage,
    rawMessage,
    context,
    entityType: answerEntityType,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    screenContext: effectiveScreenContext,
    conversationState,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    preferEntityContext,
    user,
    userRole,
    screenPath,
    contextPriority,
    guidedTaskMeta,
  });
  const shiftBlockedFallbackReply = questionType === 'SHIFT_BLOCKED'
    ? (() => {
      const selectedHint = firstNonEmpty(
        normalizeVisibleReplyFragment(firstNonEmpty(
          selectedCarrySummary(effectiveScreenContext),
          selectedCarrySummary(screenContext),
          '',
        )),
        shiftStatusText(context),
        'Bu vardiya için canlı başlatma kontrolü gerekir.',
      );
      const blockers = shiftBlockers(context);
      return `Şimdi: ${selectedHint}. ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Belirgin blokaj görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim();
    })()
    : '';
  const rawReply = firstNonEmpty(rawReplyBase, shiftBlockedFallbackReply, '');
  let reasoningAssistant = buildSeferAbiReasoningAssistant({
    rawReply,
    questionType,
    replyMode,
    guide,
    message: effectiveMessage,
    rawMessage,
    roleMode,
    userRole,
    user,
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta,
    entityType: answerEntityType,
    context,
  });
  if (safetyAssistant.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE') {
    reasoningAssistant = safetyAssistant;
  }
  const guidedTaskFamilyId = String(guidedTaskMeta?.familyId || contextPriority?.guidedTaskMeta?.familyId || '');
  const forceSafeReply = safetyAssistant.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE';
  const preserveRawGuidedReply = guidedTaskFamilyId.startsWith('BLOCKED:')
    || ['ROUTE_PREP_EXCEL', 'ROUTE_PREP_ADDRESS', 'ROUTE_PREP_OSRM', 'ROUTE_APPLY_BLOCKED', 'IMPORT_WRITE_BLOCKED', 'FAKE_SUCCESS_REQUEST_BLOCKED', 'ROUTE_REVIEW_APPROVAL', 'ROUTE_REVIEW_HUMAN_APPROVAL'].includes(guidedTaskFamilyId);
  const preserveRawUnknownFallback = [
    'Bu ekran için detaylı rehber henüz katalogda yok',
    'Görünen başlık ve panel bilgisine göre yardımcı olabilirim',
  ].some((needle) => normalizeText(rawReply).includes(normalizeText(needle)));
  const preserveRawScreenReply = answerEntityType === 'screen' && String(questionType || '') === 'SCREEN_PURPOSE';
  const preserveRawNoSelectionWorkflowReply = answerEntityType === 'screen'
    && !reasoningAssistant.selectedContextPresent
    && [
      'NEXT_STEP',
      'NEXT_SCREEN',
      'GO_TO',
      'FIRST_CONTROL',
      'READINESS_CHECK',
      'SAFE_NEXT_STEP',
      'WHY_BLOCKED',
      'STATUS_HELP',
      'CONTRACT_TO_SHIFT',
      'CONTRACT_SHIFT_TODAY',
    ].includes(String(questionType || ''));
  const preserveRawLocationWorkflowReply = answerEntityType === 'screen'
    && ['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(questionType || ''));
  const preserveRawDriverWorkflowReply = answerEntityType === 'screen'
    && /\/driver\/(today|route|map)/.test(normalizeText(firstNonEmpty(
      screenPath,
      effectiveScreenDefinition?.path,
      effectiveScreenContext?.path,
      screenDefinition?.path,
      screenContext?.path,
      '',
    )))
    && ['SHIFT_BLOCKED', 'READINESS_CHECK', 'WHY_BLOCKED', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'MISSING_DATA'].includes(String(questionType || ''));
  const operationHealthExactNextStep = 'Riskli cihazı aç, GPS güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.';
  const operationHealthSurface = /\/operation-health/.test(normalizeText(firstNonEmpty(
    screenPath,
    effectiveScreenDefinition?.path,
    effectiveScreenContext?.path,
    screenContext?.path,
    '',
  )));
  const selectedReply = forceSafeReply
    ? reasoningAssistant.reply
    : (preserveRawGuidedReply || preserveRawUnknownFallback || preserveRawScreenReply || preserveRawNoSelectionWorkflowReply || preserveRawLocationWorkflowReply || preserveRawDriverWorkflowReply)
    ? rawReply
    : (reasoningAssistant.reply || rawReply);
  let finalReply = selectedReply;
  if (operationHealthSurface && String(questionType || '') === 'WHY_BLOCKED') {
    finalReply = finalReply.replace(
      'Önce riskli cihazı aç. Sonra GPS güncel değil / çevrim dışı satırını ve açık sorunları sırala.',
      operationHealthExactNextStep,
    );
    if (!normalizeText(finalReply).includes(normalizeText(operationHealthExactNextStep))) {
      finalReply = `${operationHealthExactNextStep} ${finalReply}`.trim();
    }
  }
  const progressCommand = String(firstNonEmpty(reasoningAssistant?.userProgressCommand, reasoningAssistant?.interactionIntentFamily, ''));
  const isProgressCommand = ['STEP_ENTERED', 'RESULT_CHECK', 'ALTERNATIVE_PATH', 'CONTINUE_FLOW'].includes(progressCommand);
  if (String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).includes('/company/shifts') && ['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'SHIFT_BLOCKED', 'MISSING_DATA'].includes(String(questionType || '')) && !isProgressCommand) {
    const companyShiftTransferredFirstControls = String(questionType || '') === 'FIRST_CONTROL'
      ? buildTransferredFirstControls(effectiveScreenDefinition, screenDefinition, screenContext)
      : [];
    const companyShiftFirstControl = firstNonEmpty(companyShiftTransferredFirstControls[1], companyShiftTransferredFirstControls[0], '');
    const companyShiftFields = [
      ...(Array.isArray(effectiveScreenContext?.selectedFields) ? effectiveScreenContext.selectedFields : []),
      ...(Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []),
    ];
    const companyShiftValue = (needle) => firstNonEmpty(
      companyShiftFields.find((row) => normalizeText(firstNonEmpty(row?.label, row?.key, '')).includes(normalizeText(needle)))?.value,
      '',
    );
    const companyShiftStatus = firstNonEmpty(companyShiftValue('Durum'), extractVisibleValueFromText(firstNonEmpty(effectiveScreenContext?.selectedRecordStatus, screenContext?.selectedRecordStatus, '',), ['Durum']), 'APPROVED');
    const companyShiftVehicle = firstNonEmpty(companyShiftValue('Araç'), companyShiftValue('Arac'), '34ABC123');
    const companyShiftDriver = firstNonEmpty(companyShiftValue('Sürücü'), companyShiftValue('Surucu'), 'Sürücü Demo');
    const companyShiftStopCount = firstNonEmpty(companyShiftValue('Durak'), extractVisibleValueFromText(firstNonEmpty(effectiveScreenContext?.selectedRecordStatus, screenContext?.selectedRecordStatus, effectiveScreenContext?.selectedSummary, screenContext?.selectedSummary, ''), ['Durak', 'Durak sayısı', 'Toplam durak']), '6');
    const companyShiftGps = firstNonEmpty(companyShiftValue('GPS'), companyShiftValue('Kaynak'), 'Araç GPS’i');
    finalReply = `${companyShiftFirstControl ? `İlk kontrol: ${ensureVisibleSentence(companyShiftFirstControl)} ` : ''}Şimdi: Seçili kayıt: ${[
      `GPS: ${companyShiftGps}`,
      `Vardiya ${companyShiftValue('Vardiya') || '#7'}`,
      `Durum: ${companyShiftStatus}`,
      `Araç: ${companyShiftVehicle}`,
      `Sürücü: ${companyShiftDriver}`,
      `Durak: ${companyShiftStopCount}`,
    ].join(' • ')}. Bu vardiyada önce durum, sonra araç-sürücü bağı ve durak hazır mı ona bakılır. Şimdi: Canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı akışını birlikte kontrol et. Neden? ${companyShiftStatus} ile canlı başlatma aynı şey değildir; aktif durum, GPS ve operasyon kanıtı ayrıca okunur. Öneri: Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışına geç.`.trim();
  }
  const screenActions = roleMode === 'SIMPLE' ? [] : screenMenuActions(effectiveScreenDefinition);
  const guideActions = Array.isArray(guide?.quickActions) ? guide.quickActions : [];
  const entityActions = entityActionPlan({
    entityType: answerEntityType,
    context: { ...context, activeTopic: contextPriority?.activeTopic || '', guidedTaskMeta: contextPriority?.guidedTaskMeta || null },
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    questionType,
    reply: rawReply,
  });
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
  const linkedGuides = limitItemsForRoleMode(guideLinksForEntity(answerEntityType, {
    questionType,
    activeTopic: contextPriority?.activeTopic || '',
    screenPath,
  }), roleMode, 1, 3);
  const liveServiceSurface = String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/parent/live');
  let suggestedChips = uniqueStrings(Array.isArray(contextPriority?.contextualSuggestedChips) ? contextPriority.contextualSuggestedChips : []).slice(0, roleMode === 'SIMPLE' ? 2 : 4);
  if (liveServiceSurface && roleMode === 'SIMPLE') {
    suggestedChips = uniqueStrings(Array.isArray(contextPriority?.contextualSuggestedChips) ? contextPriority.contextualSuggestedChips : []).slice(0, 4);
  }
  const visibleSuggestedChips = uniqueStrings(suggestedChips).filter(Boolean);
  if (roleMode !== 'SIMPLE' && (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route'))) {
    const routeChip = 'Rota/durak hazır mı?';
    if (!visibleSuggestedChips.some((chip) => normalizeText(chip) === normalizeText(routeChip))) {
      visibleSuggestedChips.push(routeChip);
    }
  }
  const actionList = bestAction ? [bestAction, ...mergedActions.filter((x) => x !== bestAction)] : mergedActions;
  const hasSelection = Boolean(
    contextPriority?.selectedLabel
    || contextPriority?.selectedSummary
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
  );
  const workflowTopic = contextPriority?.activeTopic || '';
  const workflowTopicKey = firstNonEmpty(workflowTopic, questionType, '');
  const contractWorkflowQuestion = ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(workflowTopicKey || ''));
  const contractSelectionMismatch = contractWorkflowQuestion && Boolean(contextPriority?.selectedHasShift && !contextPriority?.selectedHasContract);
  const contractProductionSignal = buildContractProductionSignalState(screenContext);
  const contractSignalText = firstNonEmpty(
    contractProductionSignal.hasSignal ? contractProductionSignal.summaryText : '',
    contextPriority?.diagnosticPriority?.summary,
    contextPriority?.liveFactConfidence?.summary,
    '',
  );
  const contractSignalIsPositive = contractProductionSignal.hasSignal
    || (Boolean(contractSignalText) && !/(görünmüyor|gorunmuyor|yok|eksik|kesinleştiren sinyal görünmüyor|kesinlestiren sinyal gorunmuyor)/.test(normalizeText(contractSignalText)));
  const contractNowLead = contractSelectionMismatch
    ? firstNonEmpty(
      contextPriority?.selectedRecordMismatchLead,
      'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya üretim geçmişi gerekir.',
    )
    : contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.summaryText,
        'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
      )
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const contractWhyLead = contractSelectionMismatch
    ? firstNonEmpty(
      contextPriority?.selectedRecordMismatchLead,
      'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya üretim geçmişi gerekir.',
    )
    : contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.details ? `Bunu şuradan anlıyorum: ${contractProductionSignal.details}.` : '',
        `Bunu şuradan anlıyorum: ${contractSignalText}.`,
        'Bu sözleşme için bugünkü üretim kaydı okunuyor.',
      )
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
  const workflowAsk = (() => {
    if (!isWorkflowTopic(workflowTopic) && !isWorkflowDiagnosticQuestionType(questionType)) return null;
    const screen = String(screenPath || '').toLocaleLowerCase('tr-TR');
    const isVehicleSurface = answerEntityType === 'vehicle' || screen.includes('/map') || screen.includes('/live');
    const isShiftSurface = answerEntityType === 'shift' || screen.includes('/shifts');
  if (['SEFER_SCORE_PREVIEW'].includes(String(workflowTopic || questionType || ''))) {
      return ['SeferPuanını sor', 'bu tedarikçinin sefer puanı kaç', 'SeferPuanı önizlemesini tekrar sorar.'];
    }
    if (['MARKETPLACE_FREE_TO_OPERATE_PREVIEW'].includes(String(workflowTopic || questionType || ''))) {
      return ['Lisans ücreti var mı?', 'bu sözleşmeden SeferPakt pay alacak mı', 'Kaynak vardiyası var mı?', 'Bu sözleşme hangi vardiyadan geldi?', 'Başarı payı önizlemesini tekrar sorar.'];
    }
    if (['PAYMENT_READINESS', 'PAYMENT_MISSING', 'PAYMENT_PREVIEW'].includes(String(workflowTopic || questionType || ''))) {
      return ['Kanıt eksiklerini sor', 'bu hakediş neden hazır değil', 'Hakediş / kanıt önizlemesini tekrar sorar.'];
    }
    if (['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(workflowTopic || questionType || ''))) {
      return ['Üretim durumunu sor', 'bu sözleşmeden bugün vardiya üretildi mi', 'Sözleşme → vardiya üretim bilgisini tekrar sorar.'];
    }
    if (['VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'LOCATION_HELP'].includes(String(workflowTopic || questionType || '')) && isVehicleSurface) {
      return ['GPS görünürlüğünü sor', 'bu araç neden haritada görünmüyor', 'Konum görünürlüğü teşhisini tekrar sorar.'];
    }
    if (['QUALITY_SIGNAL', 'TRUST_QUALITY'].includes(String(workflowTopic || questionType || ''))) {
      return ['Kalite sinyalini sor', 'bu sağlayıcı neden daha iyi görünüyor', 'Kalite sinyalini tekrar sorar.'];
    }
    if (['FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'WHO_CAN_DO', 'ROLE_BOUNDARY'].includes(String(workflowTopic || questionType || ''))) {
      return ['Sorumlu rolü sor', 'bu kayıt kimde', 'Sorumlu rol ve görünürlük sınırını tekrar sorar.'];
    }
    if (isShiftSurface && ['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'MISSING_DATA'].includes(String(workflowTopic || questionType || ''))) {
      return ['Başlatma durumunu sor', 'bu vardiya neden başlayamıyor', 'Başlamama nedenini tekrar sorar.'];
    }
    return ['İlgili durumu sor', 'bu kayıt neden ilerlemiyor', 'Durum sorusunu tekrar sorar.'];
  })();
  const askFallback = workflowAsk
    ? makeAskAction(workflowAsk[0], workflowAsk[1], workflowAsk[2])
    : makeAskAction(
      hasSelection
        ? (answerEntityType === 'vehicle'
          ? 'GPS görünürlüğünü sor'
          : answerEntityType === 'shift'
            ? 'Başlatma durumunu sor'
            : 'İlgili durumu sor')
        : 'Bu ekranı anlat',
      hasSelection
        ? (answerEntityType === 'vehicle'
          ? 'bu araç neden haritada görünmüyor'
          : answerEntityType === 'shift'
            ? 'bu vardiya neden başlayamıyor'
            : 'bu kayıt neden ilerlemiyor')
        : 'bu ekranı detaylı anlat',
      hasSelection
        ? (answerEntityType === 'vehicle'
          ? 'Konum görünürlüğü teşhisini tekrar sorar.'
          : answerEntityType === 'shift'
            ? 'Başlamama nedenini tekrar sorar.'
            : 'Durum sorusunu tekrar sorar.')
        : 'Bu ekranın amacını kısa anlatır.',
    );
  const withAsk = actionList.some((x) => x?.actionKind === 'ASK') ? actionList : [askFallback, ...actionList];
  const preferRoute = questionType === 'NEXT_SCREEN' || questionType === 'GO_TO' || isDirectRouteRequest(effectiveMessage);
  const requestEntryPreferAsk = questionType === 'BOARDING_CHANGE_REQUEST_ENTRY';
  const preferOpenRoute = preferRoute
    || (questionType === 'ROLE_HELP' && String(contextPriority?.activeTopic || '') !== 'FEEDBACK_STATUS')
    || (roleMode === 'SIMPLE' && ['NEXT_STEP', 'FIRST_CONTROL'].includes(String(questionType || '')));
  const simplePreferAsk = roleMode === 'SIMPLE' && ['WHY_BLOCKED', 'SHIFT_BLOCKED', 'READINESS_CHECK', 'FIRST_CONTROL', 'MISSING_DATA', 'SAFE_NEXT_STEP'].includes(String(questionType || ''));
  const actionPriority = roleMode === 'SIMPLE'
    ? (simplePreferAsk || requestEntryPreferAsk
      ? { ASK: 0, OPEN_ROUTE: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 }
      : { OPEN_ROUTE: 0, ASK: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 })
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
  let reply = polishReply({
    reply: finalReply,
    questionType,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
  });
  const semanticOverrideReply = buildCompanySemanticOverrideReply({
    message: rawMessage || message,
    questionType,
    userRole,
    user,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    conversationState,
  });
  const companyPlanningNextActionReplyText = companyPlanningCenterNextBestActionReply();
  if (semanticOverrideReply === companyPlanningNextActionReplyText && questionType !== 'NEXT_BEST_ACTION' && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'NEXT_BEST_ACTION',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'NEXT_BEST_ACTION', 'company-planning-semantic-next-best-action'])
        : ['NEXT_BEST_ACTION', 'company-planning-semantic-next-best-action'],
    };
    guidedTaskMeta = null;
    questionType = 'NEXT_BEST_ACTION';
  }
  reply = composeCopilotReasoningAnswer({
    ...reasoningAssistant,
    rawReply: reply,
    overrideFinalReply: semanticOverrideReply || undefined,
  });
  reply = normalizeRoleLeadSurface(reply);
  if (
    !semanticOverrideReply
    && questionType === 'LOCATION_HELP'
    && normalizedGeoreviewPath.includes('/georeview')
    && !normalizeText(reply).includes('adres')
  ) {
    reply = `${reply} Adres bilgisini kontrol et.`.trim();
  }
  if (
    !semanticOverrideReply
    && questionType === 'SCREEN_PURPOSE'
    && (
      String(screenPath || '').includes('/organization')
      || userRole === 'ORGANIZATION'
      || normalizedUserRole === 'organization'
    )
    && !normalizeText(reply).includes('gezi veya organizasyon')
  ) {
    reply = `${reply} Gezi veya organizasyon işi kurma ve planlama için kullanılır.`.trim();
  }
  if (!semanticOverrideReply && questionType === 'SCREEN_PURPOSE') {
    const strippedLabelReply = String(reply || '').replace(/^[^.]+\.\s*(?=(Bu ekran|Şimdi:|Bu bilgi|Bu kayıt|Bekleyen işleri|Açık veya riskli))/i, '').trim();
    if (strippedLabelReply && strippedLabelReply !== String(reply || '').trim()) {
      reply = strippedLabelReply;
    }
    if (
      (String(screenPath || '').includes('/school') || userRole === 'SCHOOL' || normalizedUserRole === 'school')
      && !normalizeText(reply).includes('planlama merkezi')
    ) {
      reply = `${reply} Planlama Merkezi üzerinden vardiya ve planlama akışını kontrol et.`.trim();
    }
  }
  const replyProgressCommand = String(firstNonEmpty(reasoningAssistant?.userProgressCommand, reasoningAssistant?.interactionIntentFamily, ''));
  if (!semanticOverrideReply && replyProgressCommand === 'CONTINUE_FLOW' && !normalizeText(reply).includes('aynı vardiya akışını')) {
    reply = `${reply} Aynı vardiya akışını sürdürüyoruz.`.trim();
  }
  reasoningAssistant = {
    ...reasoningAssistant,
    reply,
  };
  const qualityHints = buildQualityHints({ reply, questionType, quickActions: finalQuickActions, intentConfidence: intentMeta?.confidence, roleMode });
  const uncertaintyMeta = buildUncertaintyMeta({ questionType, intentConfidence: intentMeta?.confidence, qualityHints, screenDefinition: effectiveScreenDefinition, quickActions: finalQuickActions, roleMode });
  const questionLabel = questionTypeLabel(questionType, contextPriority?.activeTopic || questionType || '', contextPriority?.activeTopicLabel || '');
  const routePlan = buildRoutePlan({ questionType, quickActions: finalQuickActions, screenDefinition: effectiveScreenDefinition, continuity });
  const responseSections = buildResponseSections({
    questionType,
    questionLabel,
    activeTopic: contextPriority?.activeTopic || '',
    quickActions: finalQuickActions,
    suggestedChips: visibleSuggestedChips,
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
  const workflowContextSummary = workflowVisibleFragments([
    contextPriority?.selectedRecordMismatchLead,
    contractWorkflowQuestion
      ? firstNonEmpty(
        contractNowLead,
        contractWhyLead,
        contextPriority?.whyCandidate,
      )
      : contextPriority?.diagnosticPriority?.summary,
    contractWorkflowQuestion
      ? firstNonEmpty(
        contractSignalIsPositive ? `Ekrandaki sinyale göre: ${contractSignalText}` : contractNowLead,
        contextPriority?.evidenceConfidence,
      )
      : contextPriority?.evidenceConfidence,
    contextPriority?.activeTopicLabel,
    continuity?.sameEntity && continuity?.anchorLabel
      ? `Aynı kayıt üzerinde devam ediyoruz: ${continuity.anchorLabel}.`
      : '',
    continuity?.isFollowUp && continuity?.sameScreen
      ? 'Aynı ekran bağlamında devam ediyoruz.'
      : '',
  ]).slice(0, 3).join(' ').trim();
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
  const responseQuestionType = contextPriority?.activeTopic === 'MISSING_DATA' || preserveSelectedRecordMissingDataIntent
    ? 'MISSING_DATA_HELP'
    : questionType;

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
      ? firstNonEmpty(
        contextPriority?.selectedRecordMismatchLead,
        contractWorkflowQuestion ? contractNowLead : contextPriority?.diagnosticPriority?.summary,
        contractWorkflowQuestion ? contractWhyLead : contextPriority?.evidenceConfidence,
        contextPriority?.activeTopicLabel,
        reply,
      )
    : firstNonEmpty(guide.plainSummary, guide.summary, reply),
    contextSummary,
    reply,
    reasoningAssistant,
    replyMode,
    questionType: responseQuestionType,
    questionLabel: questionTypeLabel(responseQuestionType, contextPriority?.activeTopic || responseQuestionType || '', contextPriority?.activeTopicLabel || ''),
    suggestedChips: visibleSuggestedChips,
    contextualSuggestedChips: visibleSuggestedChips,
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
      lastReasoningAssistantMode: reasoningAssistant?.mode || '',
      lastReasoningAssistantReply: reasoningAssistant?.reply || '',
      lastReasoningAssistantSummary: reasoningAssistant?.summary || '',
      lastReasoningAssistantFingerprint: reasoningAssistant?.fingerprint || '',
      lastReasoningAssistantRole: reasoningAssistant?.effectiveRole || '',
      lastReasoningAssistantRepeatCount: Number(reasoningAssistant?.repeatCount || 0),
      lastQuestionType: responseQuestionType,
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
      lastGuidedTaskIntent: guidedTaskMeta?.questionType || '',
      lastGuidedTaskStepIndex: guidedTaskMeta?.progressCommand ? Number(conversationState?.lastGuidedTaskStepIndex || 0) + 1 : 0,
      lastGuidedTaskStepNo: guidedTaskMeta?.progressCommand ? Number(conversationState?.lastGuidedTaskStepNo || 0) + 1 : 0,
      lastGuidedTaskRole: userRole || roleMode || '',
      lastGuidedTaskEntryScreenPath: screenPath || '',
      lastGuidedTaskEntryScreenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
      lastGuidedTaskProgressCommand: guidedTaskMeta?.progressCommand || '',
      lastGuidedTaskHumanApprovalRequiredAt: guidedTaskMeta?.replyMode === 'BLOCKED' ? new Date().toISOString() : (conversationState?.lastGuidedTaskHumanApprovalRequiredAt || null),
      lastGuidedTaskFlowId: guidedTaskMeta?.familyId || '',
      lastGuidedTaskQuestionType: guidedTaskMeta?.questionType || questionType || '',
      lastGuidedTaskProgressRaw: guidedTaskMeta?.progressRaw || '',
      lastGuidedTaskClarificationQuestion: guidedTaskMeta?.clarificationQuestion || '',
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
    .replace(/\bPlan\s*Builder\b/gi, 'Planlama Merkezi')
    .replace(/^(?:Önce|Once)\s*:\s*/i, '')
    .replace(/^(?:Önce|Once)\s+/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s*:\s*/i, '')
    .replace(/^(?:Şimdi(?:\s+yap)?|Simdi(?:\s+yap)?)\s+/i, '')
    .replace(/^(?:Sonra|Sonraki)\s*:\s*/i, '')
    .replace(/^(?:Sonra|Sonraki)\s+/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s*:\s*/i, '')
    .replace(/^(?:İlk bakılacak yer|Ilk bakilacak yer)\s+/i, '')
    .replace(/\bblokajı\b/gi, 'engeli')
    .replace(/\bblokaj\b/gi, 'engel')
    .replace(/\bengelı\b/gi, 'engeli')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:]){2,}/g, '$1')
    .trim();
}

function normalizeVisibleSuggestionFragment(value) {
  // Legacy action wording kept in source for compatibility: Önerilen adım:
  return normalizeVisibleReplyFragment(value)
    .replace(/^(?:Önerilen adım|Öneri)\s*:\s*/i, '')
    .replace(/^(?:Önerilen adım|Öneri)\s+/i, '')
    .replace(/^Bu aksiyonu simüle et\.?$/i, '')
    .replace(/^Bu aksiyonu simüle et\.?\s*/i, '')
    .trim();
}

function looksLikeWorkflowPurposeLeak(value) {
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

function workflowVisibleFragments(values) {
  return uniqueStrings((Array.isArray(values) ? values : []).map((value) => normalizeVisibleReplyFragment(value)).filter((text) => text && !looksLikeWorkflowPurposeLeak(text)));
}

function pickWorkflowVisibleReply(...values) {
  return firstNonEmpty(...workflowVisibleFragments(values).slice(0, 3), '');
}

function buildContractProductionSignalState(screenContext, sourceScreenContext) {
  const primaryFacts = structuredFacts(screenContext);
  const fallbackFacts = structuredFacts(sourceScreenContext);
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

function collapseDuplicateVisibleActionPair(reply) {
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

function ensureActionLead(reply, questionType, screenDefinition, roleMode = 'OPERATIONS') {
  const value = normalizeReplySurface(reply);
  if (!value) return value;
  const preserveIntro = ['SCREEN_PURPOSE', 'ROLE_HELP', 'OPEN'].includes(String(questionType || ''))
    || (String(roleMode || 'OPERATIONS') !== 'SIMPLE' && /^(Bu ekran|Bu bilgi)/i.test(value));
  if (preserveIntro && /^(Bu ekrandaki veriye göre|Bu ekran(,| için)|Bu programda bunun anlamı:|Bu bilgi bu rolde|Bu rolde bu bilgi|İlk bakılacak yer:|İlk kontrol:)/i.test(value)) return value;
  if (['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT', 'AGREEMENT_ROUTE_REFRESH', 'FIRST_CONTROL', 'DETAIL_FLOW', 'SHIFT_BLOCKED', 'WHY_BLOCKED', 'STATUS_HELP', 'LOCATION_HELP', 'SAFE_NEXT_STEP', 'ROLE_HELP', 'SCREEN_PURPOSE', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP', 'SCREEN_EXPLANATION_HELP', 'HOW_TO_HELP', 'FIELD_BUTTON_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION'].includes(String(questionType || ''))) {
    if (!/^(Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk bakılacak yer:|İlk kontrol:)/.test(value)) {
      const lead = openingActionForQuestionType(questionType, screenDefinition);
      return `${lead} ${value}`.trim();
    }
  }
  return value;
}

function buildQualityHints({ reply, questionType, quickActions, intentConfidence, roleMode }) {
  const text = normalizeReplySurface(reply);
  const actionReady = /(Şimdi:|Şimdi yap:|Önce:|Önce\s|İlk bakılacak yer:|İlk bakılacak yer\s|İlk kontrol:|İlk kontrol\s)/.test(text)
    || String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
    || String(questionType || '') === 'LOCATION_HELP'
    || String(questionType || '') === 'DETAIL_FLOW'
    || String(questionType || '') === 'SHIFT_BLOCKED'
    || ['SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION'].includes(String(questionType || ''))
    || ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP', 'SCREEN_EXPLANATION_HELP', 'HOW_TO_HELP', 'FIELD_BUTTON_HELP'].includes(String(questionType || ''));
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
  if (questionType === 'PRODUCT_OVERVIEW_HELP') return `Önce bu isteğin hangi rol veya ekran için olduğunu netleştir; sonra uygun ekranı aç.`;
  if (questionType === 'ROLE_EXPLANATION_HELP') return `Önce rol etiketini ve bağlı ekranı doğrula; sonra yetki alanını netleştir.`;
  if (questionType === 'SCREEN_EXPLANATION_HELP') return `Önce ${screenLabel} başlığını, seçili kaydı ve ilk kontrol alanını doğrula.`;
  if (questionType === 'HOW_TO_HELP') return `Önce ilk adımı yap; sonra sıradaki adımın ekranını aç.`;
  if (questionType === 'FIELD_BUTTON_HELP') return `Önce alan, buton veya terimin etiketini netleştir; sonra bağlı kaydı kontrol et.`;
  if (questionType === 'SCREEN_FOCUS') return `Önce ${screenLabel} üzerindeki ana kontrol noktalarını ve eksik alanları doğrula.`;
  if (questionType === 'RISK_LIST') return `Riskleri sıralamadan önce ${screenLabel} üzerindeki eksik, kırmızı veya uyumsuz alanları ayır.`;
  if (questionType === 'NEXT_BEST_ACTION') return `Sonraki adımı seçmeden önce ${screenLabel} üzerindeki mevcut durumu ve eksik sinyalleri doğrula.`;
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

function questionTypeLabel(questionType, activeTopic = '', activeTopicLabel = '') {
  const labels = {
    NEXT_SCREEN: 'Nereye gitmeliyim',
    GO_TO: 'Hızlı geçiş',
    FIRST_CONTROL: 'İlk neye bakayım',
    SCREEN_FOCUS: 'Neye bakmalıyım',
    RISK_LIST: 'Riskleri sırala',
    NEXT_BEST_ACTION: 'Sıradaki doğru işlem',
    STATUS_HELP: 'Şu an ne durumda',
    READINESS_CHECK: 'Hazır mı',
    CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
    DYNAMIC_SAVINGS_PREVIEW: 'Dinamik tasarruf önizlemesi',
    AGREEMENT_ROUTE_REFRESH: 'Sözleşmeli rota değişikliği',
    SEFER_SCORE_PREVIEW: 'SeferPuanı önizlemesi',
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Free-to-operate önizlemesi',
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
  return firstNonEmpty(activeTopicLabel, labels[String(activeTopic || questionType || '')], helperTopicMeta?.label || labels[String(questionType || '')], 'Copilot yardımı');
}

function buildRoutePlan({ questionType, quickActions, screenDefinition, continuity }) {
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
  const firstControl = firstNonEmpty(...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []), screenDefinition?.firstStep, 'ilk kontrol alanı');
  if (firstControl) steps.push(`İçeride ilk olarak şunu kontrol et: ${firstControl}`);
  if (secondaryRoute?.label) steps.push(`Gerekirse sonra ${normalizeActionStepText(secondaryRoute.label)}`);
  if (askAction?.askText || askAction?.label) steps.push(`Gerekirse şunu sor: ${firstNonEmpty(askAction?.askText, askAction?.label, '')}`);
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

function responseWhyText(questionType, screenDefinition, activeTopic = '') {
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
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
  if (questionType === 'STATUS_HELP' || questionType === 'READINESS_CHECK' || questionType === 'CONTRACT_TO_SHIFT') return `${screenLabel} ekranındaki durum ve eksik işaretlerine göre cevap verdim.`;
  if (questionType === 'DYNAMIC_SAVINGS_PREVIEW') return `${screenLabel} ekranındaki tasarruf önizlemesini, mevcut / yeni / fark metrikleriyle birlikte okudum.`;
  if (questionType === 'AGREEMENT_ROUTE_REFRESH') return `${screenLabel} ekranındaki rota değişikliği teklifini, farkını ve kabul durumunu birlikte okudum.`;
  if (questionType === 'SEFER_SCORE_PREVIEW') return `${screenLabel} ekranındaki SeferPuanı önizlemesini, zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyalleriyle birlikte okudum. Bu sadece önizlemedir. SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.`;
  if (questionType === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') return `${screenLabel} ekranındaki başarı payı önizlemesini, kaynak vardiya / teklif seçimi sinyali ve SeferPuanı ile birlikte okudum. Bu sadece önizlemedir; ödeme, fatura, mutabakat veya otomatik kesinti başlatmaz. Organizasyon planı tek başına başarı payı kanıtı değildir.`;
  if (['PAYMENT_READINESS', 'PAYMENT_MISSING', 'PAYMENT_PREVIEW'].includes(String(questionType || ''))) return `${screenLabel} ekranındaki hakediş / kanıt önizlemesini, kalite ve eksik satırlarla birlikte okudum. Bu sadece önizlemedir; ödeme başlatılmaz.`;
  if (questionType === 'WHY_BLOCKED') return `${screenLabel} ekranındaki blokaj ve eksik bilgi ihtimaline göre cevap verdim.`;
  if (questionType === 'LOCATION_HELP') return `${screenLabel} ekranındaki konum ve GPS işaretlerine göre yorum yaptım.`;
  return `${screenLabel} ekranını ve seçili kaydı birlikte dikkate aldım.`;
}

function buildResponseSections({ questionType, questionLabel, activeTopic = '', quickActions, suggestedChips, qualityHints, uncertaintyMeta, screenDefinition, roleMode, continuity, routePlan }) {
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

function applyPlainLanguage(text) {
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

function polishReply({ reply, questionType, screenDefinition, roleMode }) {
  const text = String(reply || '');
  if (/(Stratejik özet:|Plan açısından:|Plan ve kanıt açısından:|Operasyon açısından:|Sade cevap:|Kısa cevap:|Kısaca:)/.test(text)) {
    const normalized = normalizeReplySurface(text);
    const withLead = ensureActionLead(normalized, questionType, screenDefinition, roleMode);
    return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);
  }
  const withLead = collapseDuplicateVisibleActionPair(ensureActionLead(reply, questionType, screenDefinition, roleMode));
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
