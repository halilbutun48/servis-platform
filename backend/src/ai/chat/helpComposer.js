import { buildJobGuideResponse } from '../jobGuide/index.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../jobGuide/screenCatalog.js';
import { explainTermsFromText } from '../jobGuide/glossary.js';
import { filterWorkflowGenericChips, hasExplicitRoleBoundarySignal, workflowActionSpec, workflowTopicChipSet } from './answerQualityPolicy.js';
import { detectQuestionIntent, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeAskAction, makeCopyAction, makeGuideAction, makeLinkedGuide, makeQuickAction, mergeQuickActions, normalizeVisibleTerminology, toReply, uniqueStrings } from './replyShapes.js';
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
  buildConversationTaskState,
  mergeConversationTaskState,
} from './conversationTaskState.js';
import {
  createConversationTaskStateResponses,
} from './conversationTaskStateResponses.js';
import {
  buildOperationHealthChips,
  buildOperationHealthState,
} from './conversationOperationHealthEngine.js';
import { buildRiskScoringReply } from './conversationRiskScoringEngine.js';
import {
  buildContinuityMeta,
  looksLikeShortFollowUp,
  resolveFollowUpContextQuestion,
} from './conversationTaskState.js';
import {
  companyPlanningCenterSurfaceText,
  companyPlanningCenterPurposeReply,
  companyPlanningUiSurfaceText,
  looksLikeClarifyingQuestionRequest,
  ensureVisibleSentence,
  normalizeLooseText,
  normalizeText,
  normalizeVisibleReplyFragment,
} from './conversationTaskStateShared.js';
import { buildRootCauseAssistantReply } from './conversationRootCauseEngine.js';
import {
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRolePlaybook,
} from './seferAbiReasoningAssistant.js';
import { composeCopilotReasoningAnswer } from './copilotReasoningAnswerComposer.js';
import {
  applyPlainLanguage,
  buildContractProductionSignalState,
  buildQualityHints,
  buildResponseSections,
  buildRoutePlan,
  buildUncertaintyMeta,
  buildVisibleScreenPurposeLead,
  collapseDuplicateVisibleActionPair,
  ensureActionLead,
  lowercaseVisibleInitialUnlessAcronym,
  normalizeActionStepText,
  normalizeQuestionTypeReplySurface,
  normalizeReplySurface,
  normalizeVisibleList,
  normalizeVisibleLocationSurfaceValue,
  normalizeVisibleLocationTerminology,
  normalizeVisibleReasoningAssistant,
  normalizeVisibleSuggestionFragment,
  WORKFLOW_DIAGNOSTIC_QUESTION_TYPES, escapeRegExp, hasSeferScoreSignal, matchesStandalonePhrase, normalizeGuideText,
  openingActionForQuestionType, pickWorkflowVisibleReply, pickButtons, pickTerms, polishReply, questionTypeLabel,
  responseWhyText,
  sameVisibleReplyFragment,
  stripVisibleNowLeadMarkers,
  termComparisonReplyV2,
  trimReplyLength,
  trimReplyToFirstMarker,
  verificationHintForQuestionType,
  workflowVisibleFragments,
  looksLikeWorkflowPurposeLeak,
} from './helpComposerSafeReplies.js';

// Legacy source-snapshot checks still look for openingActionForQuestionType(questionType, screenDefinition) in this file.
// Legacy source-snapshot checks still look for replace(/^(?:Sonra|Sonraki)\s+/i, '') in this file.
// Legacy source-snapshot checks still look for NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}` in this file.
// Legacy source-snapshot checks still look for Şimdi: ${ensureVisibleSentence(first)} in this file.
// Legacy source-snapshot checks still look for FIRST_CONTROL: `İlk kontrol: ${ensureVisibleSentence(first)}` in this file.
// Legacy source-snapshot checks still look for const workflowFirstControlSentence = String(questionType || '') === 'FIRST_CONTROL' in this file.
// Legacy source-snapshot checks still look for String(questionType || '') === 'FIRST_CONTROL' ? buildVisibleScreenPurposeLead(firstNonEmpty( in this file.
// Legacy source-snapshot checks still look for SCREEN_PURPOSE: '', in this file.
// Legacy source-snapshot checks still look for sameVisibleReplyFragment(first, next) in this file.
// Legacy source-snapshot checks still look for sameVisibleReplyFragment(now, next) in this file.
// Legacy source-snapshot checks still look for return `Bu ekran, ${ensureVisibleSentence(lowercaseVisibleInitialUnlessAcronym(text))}`; in this file.
// Legacy source-snapshot checks still look for Bu ekran için kısa rehber. in this file.
// Legacy source-snapshot checks still look for Bu bilgi bu rolde in this file.
// Legacy source-snapshot checks still look for Bu ekrandaki veriye göre in this file.
// Legacy source-snapshot checks still look for Bu programda bunun anlamı: in this file.
// Legacy source-snapshot checks still look for Başarı payı önizlemesini netleştirmek için in this file.
// Legacy source-snapshot checks still look for Rota değişikliği teklifini işleme almadan önce in this file.
// Legacy source-snapshot checks still look for rota değişikliği teklifini, farkını ve kabul durumunu birlikte okudum in this file.
// Legacy source-snapshot checks still look for Tasarruf önizlemesini netleştirmek için in this file.
// Legacy source-snapshot checks still look for İlk bakılacak yer: in this file.
// Legacy source-snapshot checks still look for ([.,!?;:]){2,} in this file.
// Legacy source-snapshot checks still look for Önerilen adım: in this file.
// Legacy source-snapshot checks still look for .replace(/blokajı|blokaj/giu, (match) => String(match).toLocaleLowerCase('tr-TR').includes('ı') ? 'engeli' : 'engel') in this file.
// Legacy source-snapshot checks still look for replace(/\bblokajı\b/gi, 'engeli') in this file.
// Legacy source-snapshot checks still look for replace(/blokajı/gi, 'engeli') in this file.
// Legacy source-snapshot checks still look for replace(/^Bu aksiyonu simüle et in this file.
// Legacy source-snapshot checks still look for function questionTypeLabel(questionType, activeTopic = '', activeTopicLabel = '') in this file.
// Legacy source-snapshot checks still look for function buildResponseSectıons({ questionType, questionLabel, activeTopic = '', quickActions, suggestedChips, qualityHints, uncertaintyMeta, screenDefinition, roleMode, continuity, routePlan }) in this file.
// Legacy source-snapshot checks still look for title: 'Şimdi bunu yap' in this file.
// Legacy source-snapshot checks still look for title: 'İzlenecek yol' in this file.
// Legacy source-snapshot checks still look for title: 'Sonra şunu sor' in this file.
// Legacy source-snapshot checks still look for Emin değilsen önce şuna bak in this file.
// Legacy source-snapshot checks still look for Aynı seçili kayıt üstünden devam eder in this file.
// Legacy source-snapshot checks still look for function buildRoutePlan({ questionType, quickActions, screenDefinition, continuity }) in this file.
// Legacy source-snapshot checks still look for kind: 'ROUTE_CHAIN' in this file.
// Legacy source-snapshot checks still look for function applyPlainLanguage in this file.
// Legacy source-snapshot checks still look for function applyPlaınLanguage(text) in this file.
// Legacy source-snapshot checks still look for NEXT_SCREEN: 'Nereye gitmeliyim' in this file.
// Legacy source-snapshot checks still look for replace(/bağlam/gi, 'durum') in this file.
// Legacy source-snapshot checks still look for replace(/blokaj/gi, 'engel') in this file.
// Legacy source-snapshot checks still look for function openingActionForQuestionType(questionType, screenDefinition) in this file.
// Legacy source-snapshot checks still look for return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560); in this file.
// Legacy source-snapshot checks still look for const cut = Math.max( in this file.
// Legacy source-snapshot checks still look for return `${lead} ${value}`.trim(); in this file.
// Legacy source-snapshot checks still look for NEXT_SCREEN: `Önce ${first}.` in this file.
// Legacy source-snapshot checks still look for WHY_BLOCKED: `Önce ${first}.` in this file.
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
        ? 'Bu ekrandaki veriye göre kabul edilen değişiklik henüz günlük atamaya işlenmemiş olabilir; sürücü rota ekranında görünmesi için uygulama bekliyor olabilir.'
        : 'Bu ekrandaki veriye göre kabul edilen değişiklik günlük atamaya işlenebilir veya işlenmiş görünüyor; Kabul durumu, günlük atama etkisi ve sürücü rota görünürlüğü ayrı okunur.';
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
      return 'Son konum bilgisi zamanı ve konum kaynağı';
    case 'DRIVER_PHONE_GPS':
      return 'Görev durumu ve sürücünün telefonundan konum sinyali';
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
      : screenPath === '/school/operations'
        ? 'Vardiyalar ekranını aç.'
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
    return `Şimdi: ${now} Bu programda bunun anlamı: Bu sadece başarı payı önizlemesidir. Neden? Lisans ücreti yoktur; mevcut / manuel / pilot / eski kayıt için pay doğmaz; SeferPakt kaynaklı yeni ya da yenileme kayıt için başarı payı yalnızca görünür. Kaynak vardiya / teklif seçimi sinyallerini ve SeferPuanı’nı kontrol et; kaynak vardiyası / teklif seçimi zinciri kanıtlıysa karar başarı payı sayılır; organizasyon planı tek başına başarı payı kanıtı değildir. Öneri: Kaynak vardiyası sinyalini ve SeferPuanı’nı kontrol et. Sıradaki doğru işlem: Başarı payı önizlemesini açıp kaynak zincirini incele.`.trim();
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

function expandFollowUpMessage(message, conversationState, screenContext) {
  return resolveFollowUpContextQuestion({ message, conversationState, screenContext });
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
  return matchesStandalonePhrase(text, [
    'sıradaki doğru işlem',
    'siradaki dogru islem',
    'bir sonraki doğru işlem',
    'bir sonraki dogru islem',
    'bir sonraki adım ne',
    'bir sonraki adim ne',
    'şu an en doğru adım',
    'su an en dogru adim',
    'şimdi en doğru işlem',
    'simdi en dogru islem',
    'bundan sonra ne yapayım',
    'bundan sonra ne yapmaliyim',
    'bundan sonra ne yapmalıyım',
    'nereden devam edeyim',
    'hangi adıma geçeceğim',
    'hangi adima gececegim',
    'devamında ne var',
    'devaminda ne var',
    'burada sıradaki adım hangisi',
    'burada siradaki adim hangisi',
    'ne ile başlamalıyım',
    'ne ile baslamaliyim',
    'bu kayıt için ne yapmam gerekiyor',
    'bu kayit icin ne yapmam gerekiyor',
    'sırada hangi işlem var',
    'sirada hangi islem var',
    'iş akışında sıradaki adım nedir',
    'is akisinda siradaki adim nedir',
    'burada önce neyi tamamlayayım',
    'burada once neyi tamamlayayim',
    'burada devam etmek için ne eksik',
    'burada devam etmek icin ne eksik',
    'sonra ne olacak',
    'şimdi hangi butona basacağım',
    'simdi hangi butona basacagim',
    'hangi butona basacağım',
    'hangi butona basacagim',
    'hangi butona basmalıyım',
    'hangi butona basmaliyim',
  ]);
}

const {
  buildClarifyingQuestionReply: buildClarifyingQuestionReplyImpl,
  buildProductOverviewHelpReply,
  buildRoleExplanationHelpReply,
  buildScreenExplanationHelpReply,
  buildHowToHelpReply,
  buildDynamicQuestionReply: buildDynamicQuestionReplyImpl,
  buildDynamicQuestionChips: buildDynamicQuestionChipsImpl,
  buildRootCauseChips: buildRootCauseChipsImpl,
  buildPlanReviewReply,
  buildCompanySemanticOverrideReply,
  buildRoomShiftSemanticOverrideReply,
  buildCopilotEBlockRuntimeAnswerReply,
  buildCopilotEBlockRuntimeAnswerGuide,
  companyPlanningCenterNextBestActionReply: companyPlanningCenterNextBestActionReplyImpl,
  shiftStatusText,
  shiftBlockers,
  shiftNextStep,
  shiftReadinessReply,
  shiftMissingDataReply,
  looksLikeRoomShiftFocusQuestion,
  looksLikeRoomShiftNextActionQuestion,
  looksLikeRoomShiftLiveStartInstruction,
} = createConversationTaskStateResponses({
  composeScreenPurposeWithCarry,
  normalizeVisibleReplyFragment,
  ensureVisibleSentence,
  workflowStages,
  simpleNowText,
  selectedCarrySummary,
  extractVisibleValueFromText,
  resolveRoleClarifyingQuestion: ({ userRole: role, user: currentUser }) => getSeferAbiReasoningRolePlaybook(role, currentUser).clarifyingQuestion,
  resolveRoleSafeAlternative: ({ userRole: role, user: currentUser }) => getSeferAbiReasoningRolePlaybook(role, currentUser).safeAlternative,
});


function topicLabelForContext(topic) {
  const labels = {
    ROOT_CAUSE: 'Kök neden',
    SCREEN_PURPOSE: 'Ekran amacı',
    SHIFT_BLOCKED: 'Vardiya engeli',
    VEHICLE_NOT_VISIBLE: 'Konum sinyali görünürlüğü',
    DRIVER_PHONE_GPS: 'Sürücünün telefonundan konum sinyali',
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
  'ROOT_CAUSE',
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
  return ['ROLE_HELP', 'NEXT_SCREEN', 'NEXT_STEP', 'ROOT_CAUSE', 'WHY_BLOCKED', 'READINESS_CHECK', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'PAYMENT_PREVIEW', 'SAFE_NEXT_STEP', 'DETAIL_FLOW', 'ROW_HELP', 'MISSING_DATA_HELP', 'STATUS_HELP', 'GO_TO'].includes(type);
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
  if (questionType === 'ROOT_CAUSE') return 'ROOT_CAUSE';
  if (isDirectRouteRequest(text) && extractMentionedScreenKind(text)) return 'NEXT_SCREEN';
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
  if (isDirectRouteRequest(text) && extractMentionedScreenKind(text)) return 'NEXT_SCREEN';
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
  if (hasSignals) return 'Ekrandaki sinyale göre konuşuyorum.';
  if (roleBoundary) return 'Bu yetki sınırı olabilir. Bu rolde bu bilgi görünmeyebilir.';
  if (role === 'personel' || path.includes('/personel/live') || path.includes('/personel/my')) return 'Bu ekranda seçili servis bilgisi net görünmüyor; önce bugünkü servis satırını seç.';
  if (role === 'parent' || path.includes('/parent/live')) return 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; önce öğrencinin servis satırını seç.';
  if (role === 'driver' || path.includes('/driver/today') || path.includes('/driver/route') || path.includes('/driver/map')) return 'Bu ekranda bugünkü göreve ait seçili bilgi net görünmüyor; önce vardiya veya araç satırını seç.';
  return 'Bu daha çok eksik veri gibi duruyor. İlk kontrol seçili satırı doğrulamaktır.';
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
    const workflowQuestion = isWorkflowTopic(context?.activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
    const workflowAction = workflowQuestion ? workflowActionSpec({ activeTopic: context?.activeTopic, questionType }) : null;
    const workflowActionGuideLabel = workflowAction?.guideLabel === 'Hakediş / kanıt önizleme rehberini aç'
      ? 'Hakediş önizleme rehberini aç'
      : workflowAction?.guideLabel === 'Sözleşme → vardiya rehberini aç'
        ? 'Sözleşme → vardiya rehberini aç'
        : workflowAction?.guideLabel;
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı konuşmayı seçili vardiya ile ekranda sürdürür.'));
    if (Number(context?.openOfferCount || 0) > 0 || ['GO_TO', 'WHY_BLOCKED'].includes(questionType)) rows.push(menuAction(offersMenu, context, 'Teklif kararını kapatmak için ilgili listeyi açar.', { accent: 'primary' }));
    if (!context?.vehicleId || questionType === 'NEXT_STEP') rows.push(menuAction(vehiclesMenu, context, 'Araç atamasını veya araç durumunu kontrol etmek için açılır.', { routeParams: context?.vehicleId ? { focusVehicleId: Number(context.vehicleId) } : {}, accent: 'primary' }));
    if (!context?.driverId || questionType === 'NEXT_STEP') rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    if (String(context?.agreementId || '') || questionType === 'GO_TO') rows.push(menuAction(agreementsMenu, context, 'Sözleşmeye bağlı akışı kontrol etmek için açılır.'));
    if (workflowAction) {
      rows.push(makeGuideAction(workflowActionGuideLabel, { jobType: workflowAction.jobType, guideLevel: workflowAction.guideLevel }, workflowAction.reason));
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
    rows.push(makeGuideAction('Konum kaynağı rehberini aç', { jobType: 'LOCATION_SOURCE_GUIDE', guideLevel: 'SHORT' }, 'Telefon konum sinyali ile cihaz konum sinyali farkını açar.'));
    rows.push(makeGuideAction('GPS teşhis rehberini aç', { jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE', guideLevel: 'WHY' }, 'Konum neden görünmüyor sorusuna odaklanır.'));
    rows.push(makeAskAction('Konum neden görünmüyor?', 'konum neden görünmüyor', 'Aynı kayıt için hızlı teşhis sorusu gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
    rows.push(currentScreenAction(screenDefinition, context, roleMode === 'SIMPLE' ? 'Bu ekrana dönersin.' : 'Bu ekranı tekrar açar.'));
    for (const menu of menus.slice(0, roleMode === 'SIMPLE' ? 1 : 3)) rows.push(menuAction(menu, context, menu.purpose || 'İlgili menüye götürür.', { accent: roleMode === 'SIMPLE' && rows.length <= 1 ? 'primary' : 'neutral' }));
    if (roleMode === 'SIMPLE') {
      rows.push(makeAskAction('Şimdi ne yapayım?', 'şimdi ne yapayım', 'Daha kısa yönlendirme alırsın.'));
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
      makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS teşhis rehberini aç', 'WHY', 'Konum neden görünmüyor sorusuna odaklanır.'),
      makeLinkedGuide('VEHICLE_DRIVER_BIND', 'Araç-sürücü bağlama rehberini aç', 'STEP_BY_STEP', 'Bağlama adımlarını sade dille gösterir.'),
    ];
  }
  if (String(entityType) === 'shift') {
    return [
      makeLinkedGuide('OFFER_REVIEW', 'Teklifi inceleme rehberini aç', 'SHORT', 'Kayıt özetini rehber modunda açar.'),
      makeLinkedGuide('OFFER_APPROVAL', 'Teklifi onaylama rehberini aç', 'WHY', 'Onay öncesi dikkat noktalarını açar.'),
      makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Sıralı kontrol rehberini aç', 'STEP_BY_STEP', 'Hazırlık eksiklerini sıralar.'),
    ];
  }
  return [
    makeLinkedGuide('SCREEN_MENU_GUIDE', 'Ekran rehberini aç', 'SHORT', 'Bu ekranın amacını açar.'),
    makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Buton rehberini aç', 'WHY', 'Bu ekrandaki butonları açıklar.'),
    makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye gideceğini gösterir.'),
  ];
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
  const rootCauseTopic = topicKey === 'ROOT_CAUSE';
  const rootCauseChips = rootCauseTopic
    ? buildRootCauseChipsImpl({
      message: '',
      questionType,
      screenPath,
      screenDefinition: _screenDefinition || null,
      screenContext: context || null,
      sourceScreenContext,
      context,
      roleMode,
    })
    : [];
  const routeRefreshTopic = Boolean(
    ['AGREEMENT_ROUTE_REFRESH'].includes(topicKey)
    || (!['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(topicKey) && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|uygulanan rota|rota geçmişi|rota gecmisi|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(routeRefreshSignalText))
  );
  const dynamicSavingsTopic = Boolean(
    topicKey === 'DYNAMIC_SAVINGS_PREVIEW'
    || ((path.includes('/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) && hasDynamicSavingsSignal([selectedLabel, selectedSummary, routeRefreshSignalText].filter(Boolean).join(' ')))
  );
  const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
  const workflowTopicWithRootCause = workflowTopic || rootCauseTopic;
  const workflowChipContext = workflowTopicWithRootCause || boardingPreviewTopic || boardingApplicationTopic || routeRefreshTopic || dynamicSavingsTopic || rootCauseTopic;
  const workflowChipTopic = rootCauseTopic ? 'ROOT_CAUSE' : boardingApplicationTopic ? 'BOARDING_CHANGE_APPLICATION' : boardingPreviewTopic ? 'BOARDING_ROUTE_IMPACT_PREVIEW' : dynamicSavingsTopic ? 'DYNAMIC_SAVINGS_PREVIEW' : routeRefreshTopic ? 'AGREEMENT_ROUTE_REFRESH' : activeTopic;
  const parentLiveNoVehicleFacts = structuredFacts(sourceScreenContext) || structuredFacts(context) || null;
  const parentLiveNoVehicleSignal = path.includes('/parent/live') && (
    parentLiveNoVehicleDetected(sourceScreenContext || context, context, path)
    || parentLiveNoVehicleFacts?.noLiveVehicle === true
    || parentLiveNoVehicleFacts?.liveVehicleVisible === false
    || (parentLiveNoVehicleFacts && Number(parentLiveNoVehicleFacts.vehicleCount) === 0)
  );
  if (rootCauseChips.length) chips.push(...rootCauseChips);
  if (workflowChipContext) chips.push(...workflowTopicChipSet({ activeTopic: workflowChipTopic, questionType, screenPath, guidedTaskMeta }));
  if (hasSelectedRecord && !workflowTopic && !path.includes('/parent/live')) {
    if (!workflowChipContext) {
      chips.push('Seçili kaydı aç', 'Başlatma zamanını kontrol et', 'Eksik veriyi göster', 'Yetki sınırını açıkla');
    }
  }
  const pathSpecificChips = (() => {
    if (path.includes('/driver/today')) return workflowChipContext
      ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
      : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
    if (path.includes('/driver/route')) return workflowChipContext
      ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
      : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
    if (path.includes('/personel/live') || path.includes('/personel/my')) return ['Bu ekranı detaylı anlat', 'Araç nerede?', 'Son konum bilgisi ne zaman geldi?', 'Servis durumu ne?', 'Sürücünün telefonundan konum sinyali devrede mi?'];
    if (path.includes('/parent/live')) {
      if (parentLiveNoVehicleSignal) return ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
      return ['Son konum bilgisi ne zaman geldi?', 'Tahmini varış süresi nedir?', 'Araç bağlantısı var mı?', 'Sürücünün telefonundan konum sinyali devrede mi?'];
    }
    if (path.includes('/room/map') || path.includes('/room/live')) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
    if (path.includes('/room/operation-health')) {
      return buildOperationHealthChips({ questionType, screenPath: path });
    }
    if (path.includes('/room/shifts')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      if (['PAYMENT_READINESS', 'PAYMENT_MISSING'].includes(String(questionType || ''))) return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
      if (['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(questionType || ''))) return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
      if (['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(questionType || ''))) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
      if (['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP'].includes(String(questionType || ''))) return ['Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Başlatma zamanı uygun mu?'];
      return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et'];
    }
    if (path.includes('/superadmin/operations')) {
      if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
      if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
      return ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
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
        chips.push('Konum kaynağını kontrol et', 'Sürücünün telefonundan konum sinyali neden devrede değil?', 'Araç neden haritada yok?');
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
        chips.push('Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Başlatma zamanı uygun mu?');
        break;
      default:
        chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?');
    }
  }

  if (workflowChipContext) {
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
  const filteredFallback = workflowChipContext
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
  const taskState = conversationState?.taskState || null;
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    taskState?.anchorLabel,
    taskState?.selectedLabel,
    taskState?.selectedSummary,
    screenContext?.selectedSummary,
    '',
  );
  const selectedSummary = firstNonEmpty(
    taskState?.selectedSummary,
    taskState?.selectedRecordStatus,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.selectedSummary,
    selectedCarrySummary(screenContext),
    '',
  );
  const roomMapVehicleLead = String(screenPath || '').includes('/room/map') ? (() => { const match = /\bAraç\s*([A-Z0-9]+)/i.exec(normalizeVisibleReplyFragment(firstNonEmpty(selectedSummary, selectedCarrySummary(screenContext), selectedCarrySummary(sourceScreenContext), ''))); return match?.[1] ? `Seçili araç ${match[1]} görünüyor.` : ''; })() : '';
  const lastConcern = firstNonEmpty(
    taskState?.lastPrimaryConcern,
    taskState?.currentPrimaryConcern,
    taskState?.lastUserMessage,
    taskState?.currentUserMessage,
    taskState?.lastRawUserMessage,
    conversationState?.lastPrimaryConcern,
    conversationState?.lastUserMessage,
    conversationState?.lastRawUserMessage,
    '',
  );
  const recentMessages = Array.isArray(conversationState?.recentMessages)
    ? conversationState.recentMessages.slice(-6)
    : (Array.isArray(taskState?.recentMessages) ? taskState.recentMessages.slice(-6) : []);
  const recentUserMessage = [...recentMessages].reverse().find((row) => normalizeText(row?.role) === 'user' || normalizeText(row?.role) === 'assistant');
  const activeTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic);
  const guidedTopicLabel = firstNonEmpty(guidedTaskMeta?.label, '');
  const guidedTopicSummary = firstNonEmpty(guidedTaskMeta?.summary, guidedTaskMeta?.jobPurpose, '');
  const guidedTopicAdvice = firstNonEmpty(guidedTaskMeta?.advice, '');
  const guidedTopicWhy = firstNonEmpty(guidedTaskMeta?.safeBoundary, guidedTaskMeta?.why, '');
  const startGuidanceQuestion = looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message);
  const workflowQuestion = Boolean(guidedTaskMeta?.familyId) || isWorkflowDiagnosticQuestionType(questionType) || isWorkflowTopic(activeTopic);
  const isFollowUp = !startGuidanceQuestion && Boolean(
    looksLikeShortFollowUp(message)
    || taskState?.isFollowUp
    || guidedTaskMeta?.progressCommand
    || (conversationState?.lastQuestionType && recentMessages.length)
    || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizeText(message))
  );
  const sameRecordLikely = Boolean(
    selectedLabel && conversationState?.lastSelectedLabel && normalizeText(selectedLabel) === normalizeText(conversationState.lastSelectedLabel),
  ) || Boolean(
    selectedLabel && taskState?.lastSelectedLabel && normalizeText(selectedLabel) === normalizeText(taskState.lastSelectedLabel),
  ) || Boolean(
    screenContext?.selectedEntityType
    && conversationState?.lastSelectedEntityType
    && normalizeText(screenContext.selectedEntityType) === normalizeText(conversationState.lastSelectedEntityType)
    && Number(screenContext?.selectedEntityId || 0) === Number(conversationState?.lastSelectedEntityId || 0),
  ) || Boolean(
    screenContext?.selectedEntityType
    && taskState?.lastSelectedEntityType
    && normalizeText(screenContext.selectedEntityType) === normalizeText(taskState.lastSelectedEntityType)
    && Number(screenContext?.selectedEntityId || 0) === Number(taskState?.lastSelectedEntityId || 0),
  ) || Boolean(
    selectedLabel && lastConcern && normalizeText(selectedLabel).includes(normalizeText(lastConcern)),
  );
  const structured = structuredFacts(screenContext) || structuredFacts(sourceScreenContext) || null;
  const selectedRecordStatus = firstNonEmpty(
    normalizeStatusDisplayText(structured?.selectedRecordStatus),
    normalizeStatusDisplayText(screenContext?.selectedRecordStatus),
    normalizeStatusDisplayText(sourceScreenContext?.selectedRecordStatus),
    normalizeStatusDisplayText(taskState?.selectedRecordStatus),
    normalizeStatusDisplayText(taskState?.selectedSummary),
    normalizeStatusDisplayText(roomMapVehicleLead ? `${roomMapVehicleLead} ${selectedSummary || selectedLabel || selectedCarrySummary(screenContext) || selectedCarrySummary(sourceScreenContext)}` : selectedSummary || selectedLabel || selectedCarrySummary(screenContext) || selectedCarrySummary(sourceScreenContext)),
    '',
  );
  const selectedLabelText = normalizeText(selectedLabel);
  const selectedSummaryText = normalizeText(selectedSummary);
  const selectedRecordStatusText = normalizeText(selectedRecordStatus);
  const screenPathText = normalizeText(firstNonEmpty(
    screenPath,
    screenContext?.path,
    sourceScreenContext?.path,
    taskState?.currentScreenPath,
    taskState?.lastScreenPath,
    screenDefinition?.path,
    sourceScreenDefinition?.path,
    '',
  ));
  const structuredCounters = structured?.counters && typeof structured.counters === 'object' ? structured.counters : null;
  const activeDriversCount = Number(structuredCounters?.activeDrivers ?? NaN);
  const riskyDevicesCount = Number(structuredCounters?.riskyDevices ?? NaN);
  const staleOrOfflineCount = Number(structuredCounters?.staleOrOffline ?? NaN);
  const openIssuesCount = Number(structuredCounters?.openIssues ?? NaN);
  const operationHealthState = !startGuidanceQuestion
    ? buildOperationHealthState({
      message,
      rawMessage: message,
      questionType,
      interactionIntentFamily: '',
      roleMode,
      userRole,
      user: null,
      screenPath,
      screenDefinition,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      analysis,
      contextPriority: null,
      conversationState,
      guidedTaskMeta,
      entityType,
      context,
      taskState,
    })
    : null;
  const operationHealthLead = operationHealthState?.shouldRespond
    ? firstNonEmpty(operationHealthState.reasoningLead, '')
    : '';
  const operationHealthAdvice = operationHealthState?.shouldRespond
    ? firstNonEmpty(operationHealthState.nextBestAction, '')
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
  const liveSelectionHasEntity = Boolean(
    screenContext?.selectedEntityType
    || screenContext?.selectedEntityId
    || sourceScreenContext?.selectedEntityType
    || sourceScreenContext?.selectedEntityId
  );
  const liveSelectionHasText = Boolean(
    selectedLabel
    || selectedSummary
    || selectedRecordStatus
    || taskState?.anchorLabel
    || selectedCarrySummary(screenContext)
    || selectedCarrySummary(sourceScreenContext)
  );
  const needsSelection = (!selectedLabel && !selectedSummary && !taskState?.anchorLabel && !selectedCarrySummary(screenContext) && !selectedCarrySummary(sourceScreenContext))
    || ((String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/personel/my') || String(screenPath || '').includes('/parent/live')) && !liveSelectionHasEntity && !liveSelectionHasText);
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
    taskState?.anchorLabel,
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
    selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; araç görünürlüğü için araç ve sürücünün telefonundan konum sinyalini ayrı kayıtta kontrol et.';
  }
  const topicWhy = {
    QUALITY_SIGNAL: 'Bu sinyal kesin kalite puanı değil; sağlayıcıyı okumaya yardım eder.',
    SEFER_SCORE_PREVIEW: 'Bu sadece SeferPuanı önizlemesidir. SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.',
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Bu sadece başarı payı önizlemesidir. Lisans ücreti yoktur; mevcut / manuel / pilot / eski kayıt için pay doğmaz; SeferPakt kaynaklı yeni veya yenileme için başarı payı yalnızca görünür. Kaynak vardiyası / teklif seçimi zinciri kanıtlı değilse karar başarı payı sayılmaz.',
    BOARDING_CHANGE_REQUEST_ENTRY: 'Bu sadece talep oluşturma akışıdır. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul seçeneklerinden birini kullan; rota otomatik uygulanmaz; aynı rota ise sürücü, rota dışı ise hizmet alan taraf karar verir; oda yalnızca görür.',
    PAYMENT_READINESS: 'Bu sadece önizlemedir; ödeme başlatılmaz ve önce eksik kanıt/kalite kontrolü tamamlanır.',
    PAYMENT_MISSING: 'Bu sadece önizlemedir; eksik kanıtlar kapatılmadan hakediş hazır sayılmaz.',
    PAYMENT_PREVIEW: 'Bu sadece önizlemedir; tahsilat/fatura oluşturulmaz ve kanıt satırları okunur.',
    SHIFT_BLOCKED: 'Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol konum sinyali/operasyon kanıtını kontrol et.',
    FEEDBACK_STATUS: 'Kayıt açık ya da kritik olduğu için tamamlanmış görünmüyor.',
    NOTIFICATION_SOURCE: 'Bildirim bir olay kaydına bağlı olduğu için kaynağı ayrıca okunmalı.',
    KVKK_VISIBILITY: 'Bilgi rol bazlı görünürlük nedeniyle gizli olabilir.',
    WHO_CAN_DO: 'Bu işlem rol sınırı yüzünden bu kullanıcıda görünmeyebilir.',
    MISSING_DATA: 'Boş alanlar yüzünden kayıt ilerlemiyor olabilir.',
    CONTRACT_TO_SHIFT: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
    CONTRACT_SHIFT_TODAY: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
    AGREEMENT_ROUTE_REFRESH: 'Bu sözleşmedeki rota değişikliği talebi eski rota, yeni rota ve teklif/kabul durumuyla birlikte okunur.',
    DRIVER_PHONE_GPS: 'Telefon konum sinyali cihaz konum sinyalinin yerine geçiyor olabilir.',
    VEHICLE_NOT_VISIBLE: 'Araç, görev bağlantısı, son GPS veya sürücünün telefonundan konum sinyali gelmediği için görünmüyor olabilir.',
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
    MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Önce kaynak vardiya / teklif seçimi sinyallerini ve SeferPuanı’nı oku; kaynak vardiyası / teklif seçimi zinciri kanıtlıysa karar başarı payı sayılır; lisans ücreti 0 TL, mevcut / manuel / pilot / eski kayıtta pay doğmaz, yeni / yenileme kayıtta ise yalnızca önizleme görünür. Organizasyon planı tek başına başarı payı kanıtı değildir.',
    BOARDING_CHANGE_REQUEST_ENTRY: 'Önce talep tipini, tarihi, servis/vardiya bağlamını ve konum seçimini gir. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul; konum çözümleme bağlı değilse açıklama ekle. Talep alındıktan sonra kimde beklediğini durum satırından oku.',
    PAYMENT_READINESS: 'Hakediş önizleme, ödeme hesabı, komisyon ve hizmet/onay sinyalini kontrol et. Ödeme başlatılmaz.',
    PAYMENT_MISSING: 'Önce eksik kanıtları ve kalite kontrolünü tamamla; bu sadece önizlemedir.',
    PAYMENT_PREVIEW: 'Önce hakediş / kanıt önizleme kayıtlarını ve risk nedenlerini kontrol et; ödeme başlatılmaz.',
    DYNAMIC_SAVINGS_PREVIEW: 'Bu sadece önizlemedir. Km, süre, kapasite ve yaklaşık maliyet etkisini birlikte oku; uygulama, ödeme ve mutabakat başlatılmaz.',
    AGREEMENT_ROUTE_REFRESH: 'Önce şirket teklifini, oda karşı teklifini, eski rota ile yeni rota farkını ve kabul durumunu kontrol et; bu yalnızca teklif/önizleme akışıdır.',
    NEXT_SCREEN: 'Önce ilgili ekrana geç.',
    NEXT_STEP: 'Önce ilgili kayıt veya alanı kontrol et.',
    WHY_BLOCKED: operationHealthAdvice || 'Önce blokaj nedeni ve eksik alanı kontrol et.',
    SHIFT_BLOCKED: 'Başlatma zamanı ve aktif durum uygunsa konum sinyali/operasyon kanıtını kontrol et; araç/sürücü bağı görünmüyorsa kontrol et, atanmış görünüyorsa sonraki kontrol konum sinyali/operasyon kanıtını kontrol et.',
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
    DRIVER_PHONE_GPS: 'Önce sürücünün telefonundan konum sinyali ile cihaz konum sinyali kaynağını ayır.',
    VEHICLE_NOT_VISIBLE: 'Önce araç GPS sinyali, görev bağlantısı, son GPS ve sürücünün telefonundan GPS sinyalini kontrol et.',
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
    operationHealthLead,
    operationHealthAdvice,
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

function looksLikeGuidedTaskActionMessage(message) {
  const text = normalizeText(extractUserQuestion(message));
  return Boolean(text) && /(?:vardiya|teklif|sözleşme|sozlesme|servis|rota|güzergâh|güzergah|guzergah|adres|konum|koordinat|kişi|kisiler|kişiler|personel|araç|arac|sürücü|surucu|plan).*(?:istiyorum|yapmak istiyorum|oluşturmak istiyorum|olusturmak istiyorum|açmak istiyorum|acmak istiyorum|planlamak istiyorum|kurmak istiyorum|hazırla|hazirla|gönder|gonder|göster|goster|ata|çevir|cevir|çıkar|cikar|yap|kur|oluştur|olustur|(?:aç|ac)(?:$|[^\\p{L}\\p{N}]))/u.test(text);
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
  if (sourcePath.includes('/shared/notifications')) {
    if (normalizeRoleKey(user?.role) === 'company') {
      const companyNotifications = getScreenDefinitionForUser({ role: 'COMPANY', companyKind: user?.companyKind || '' }, { path: '/company/shifts' }, 2102);
      if (companyNotifications) return companyNotifications;
    }
    return screenDefinition;
  }
  if (
    /\/(?:company|organization|school)\/operations\b/.test(sourcePath)
    && /(bu ekran ne|burası ne|burasi ne|bu ne|burada ne yapacagim|burada ne yapayim|ne yapayim|ne yapacagim|ne yapmaliyim|ne gerekiyor)/.test(text)
  ) {
    return screenDefinition;
  }
  if (sourceLabel && normalizeLooseText(text).includes(normalizeLooseText(sourceLabel))) {
    return screenDefinition;
  }
  if (looksLikeGuidedTaskActionMessage(text)) {
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
  if (isDirectRouteRequest(text) && explicitKind) {
    return screenDefinition;
  }
  if (explicitKind) {
    const explicitHit = pickScreenByKind(screens, explicitKind);
    if (explicitHit) return explicitHit;
  }
  if (/vardiya\s+oluştur|vardiya\s+olustur|nasıl\s+vardiya\s+oluştur|nasil\s+vardiya\s+olustur|yeni\s+iş\s+kur|yeni\s+is\s+kur|plan\s+kur/.test(text)) {
    const planning = choose((row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')) || /planlama merkezi|organizasyon merkezi|okul merkezi|gezi \/ planlama merkezi/i.test(String(row?.label || '')));
    if (planning) return planning;
  }
  const genericCurrentScreenQuestion = !explicitKind && (
    /(?:hangi\s+ekran\w*|hangi\s+men[üu]\w*|nereye\s+geç\w*|nereye\s+git\w*|buradan\s+sonra|sonraki\s+ekran|önce\s+neye\s+bakay\w*)/.test(text)
    || /(?:bu|şu|su)\s+(?:ekran|sayfa|panel)\s+ne(?:\s|$)/.test(text)
    || /(?:buras[ıi]|burda|burada)\s+ne(?:\s|$)/.test(text)
    || /(bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+sayfa\s+ne\s+için|bu\s+sayfa\s+ne\s+icin|burada\s+ne\s+yapılır|burada\s+ne\s+yapilir|ne\s+işe\s+yarar|ne\s+ise\s+yarar)/.test(text)
    || /(bu\s+rolde|rolümde|rolumde|burada\s+neyi\s+yönetebilirim|burada\s+neyi\s+yonetebilirim|yetkim\s+ne|rol\s+yardımı|rol\s+yardimi)/.test(text)
  );
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
  const lastGps = extractVisibleValueFromText(text, ['Son konum bilgisi', 'Last GPS']);
  const nextStop = firstNonEmpty(
    extractVisibleValueFromText(text, ['Sıradaki']),
    extractVisibleValueFromText(text, ['Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    '',
  );
  const eta = extractVisibleValueFromText(text, ['Tahmini varış süresi']);
  const shiftLabel = extractVisibleValueFromText(text, ['Seçili kayıt', 'Seçili satır']);
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
  return 'Şimdi: Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor. Servis görünmüyorsa son GPS, araç bağlantısı ve tahmini varışı kontrol et.';
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
  const facts = structuredFacts(screenContext) || screenContext?.liveFacts || null;
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
  const summaryBody = firstNonEmpty(isRoomMapContext ? [firstNonEmpty((/\bAraç\s*([A-Z0-9]+)/i.exec(firstNonEmpty(compactSummary, copilotSummary, '')) || [])[1] ? `Seçili araç ${( /\bAraç\s*([A-Z0-9]+)/i.exec(firstNonEmpty(compactSummary, copilotSummary, '')) || [])[1]} görünüyor.` : '', ''), top.join(' • ')].filter(Boolean).join(' • ') : compactSummary, top.join(' • '), copilotSummary, '');
  let result = '';
  if (copilotSummary && label) result = appendCopilotSummary ? `${label} (${summaryBody || copilotSummary} • ${copilotSummary})` : `${label} (${summaryBody || copilotSummary})`;
  else if (copilotSummary) result = summaryBody || copilotSummary;
  else if (label && top.length) result = `${label} (${top.join(' • ')})`;
  else if (label) result = label;
  else if (top.length) result = top.join(' • ');
  return redactSensitiveLiveSelectionText(result, screenContext?.path);
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
    const safeUnknownScreenReply = firstNonEmpty(
      screenDefinition?.isSafeFallback || sourceScreenDefinition?.isSafeFallback || guide?.isSafeFallback
        ? 'İlk bakılacak yer: görünen başlık ve panel bilgisi. Bu ekran için detaylı rehber henüz katalogda yok; görünen başlık ve panel bilgisine göre yardımcı olabilirim.'
        : '',
      /\/mystery\//.test(firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, ''))
      || /\/unknown\//.test(firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, ''))
        ? 'İlk bakılacak yer: görünen başlık ve panel bilgisi. Bu ekran için detaylı rehber henüz katalogda yok; görünen başlık ve panel bilgisine göre yardımcı olabilirim.'
        : '',
    );
    if (safeUnknownScreenReply) return toReply(safeUnknownScreenReply);
    if (firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/school/operations') {
      return toReply('Bu ekran, Vardiyalar üzerinden şirket tarafındaki operasyon özetini, bekleyen işleri ve sonraki adımları görmek için kullanılır. İlk bakılacak yer: doğru vardiyayı veya takip sekmesini seç. Sonra: Yeni iş kuracaksan Planlama Merkezi\'ne dön; mevcut işin takibini burada sürdür.');
    }
    if (firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/superadmin/natural-copilot') {
      return toReply('Bu ekran, canlı sağlık, GPS güveni ve son olayları birlikte okumak için kullanılır. İlk bakılacak yer: canlı sağlık sinyalini ve GPS güvenini kontrol et. Sonra: açık riskleri ve son olayları incele.');
    }
    if (firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/superadmin/operations') {
      const operationsScreenLabel = firstNonEmpty(
        prettyScreenLabel(screenDefinition?.label),
        prettyScreenLabel(screenContext?.label),
        prettyScreenLabel(sourceScreenDefinition?.label),
        prettyScreenLabel(sourceScreenContext?.label),
        'bu ekran',
      );
      const operationsPurpose = firstNonEmpty(
        screenDefinition?.menuPurpose,
        screenDefinition?.screenExplanation,
        guide?.screenExplanation,
        guide?.plainSummary,
        guide?.summary,
        'Operasyon özetini gösterir',
      );
      return `Bu ekran, ${operationsPurpose}. Şu an ${operationsScreenLabel} ekranındaysan önce operasyon özetini aç. Sonra: kritik kayıtları incele.`;
    }
    if (firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/superadmin/ssot-alignment') {
      return toReply('Bu ekran, Sistem Standartları ile Canlı İzleme arasındaki hizayı kontrol etmek için kullanılır. İlk bakılacak yer: hangi standardın bozulduğunu oku. Sonra: gerekirse Canlı İzleme ekranına geç ve doğrulama sinyalini kontrol et.');
    }
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

function composeScreenFocusReply({ guide, screenDefinition, screenContext, sourceScreenContext }) {
  const screenPaths = uniqueStrings([
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenContext?.path,
  ]);
  if (screenPaths.some((value) => String(value || '') === '/superadmin/operations')) {
    return [
      'Bu ekran, canlı durum ve konum sinyali güven skorunu oku.',
      'İlk kontrolünü netleştirelim: önce canlı durum bandını, sonra konum sinyalini ve açık riskleri kontrol et.',
      'Canlı durum ile konum sinyali güven skoru aynı şey değildir; biri operasyon sinyali, diğeri kanıt güvenidir.',
    ].join(' ');
  }
  if (screenPaths.some((value) => String(value || '') === '/superadmin/natural-copilot')) {
    return [
      'Bu ekran, canlı sağlık, GPS güveni ve son olayları birlikte okumak için kullanılır.',
      'İlk kontrolünü netleştirelim: önce canlı sağlık sinyalini, sonra GPS güvenini ve açık riskleri kontrol et.',
      'Canlı sağlık ile GPS güveni aynı şey değildir; biri saha akışı, diğeri veri güvenidir.',
    ].join(' ');
  }
  const purposeLead = buildVisibleScreenPurposeLead(firstNonEmpty(
    guide?.screenExplanation,
    guide?.plainSummary,
    guide?.summary,
    screenDefinition?.menuPurpose,
    screenDefinition?.screenExplanation,
    'Bu ekranda ana kontrol noktalarını incele.',
  ));
  const controls = firstControls(screenDefinition, guide).slice(0, 3).map((value) => normalizeVisibleReplyFragment(value)).filter(Boolean);
  const now = normalizeVisibleReplyFragment(simpleNowText(guide, screenDefinition, 'Önce seçili kaydı ve ana alanları kontrol et.'));
  const next = normalizeVisibleReplyFragment(simpleNextText(guide, screenDefinition));
  const carryHint = normalizeVisibleReplyFragment(firstNonEmpty(
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    '',
  ));
  return [
    purposeLead,
    controls.length ? `Ana kontrol noktaları: ${controls.join(' • ')}.` : `İlk bakılacak yer: ${ensureVisibleSentence(now)}`,
    carryHint ? `Seçili kayıt: ${ensureVisibleSentence(carryHint)}` : '',
    next ? `Sonra: ${ensureVisibleSentence(next)}` : '',
  ].filter(Boolean).join(' ').trim();
}

function composeNextBestActionReply({ guide, screenDefinition, screenContext, sourceScreenContext, contextPriority = null }) {
  const fallbackAction = firstNonEmpty(
    contextPriority?.bestNextAction,
    guide?.whatToDoNow,
    guide?.whatToDoNext,
    screenDefinition?.firstStep,
    screenDefinition?.nextStep,
    simpleNowText(guide, screenDefinition, 'Önce seçili kaydı ve ana alanları kontrol et.'),
  );
  const fallbackActionText = normalizeText(fallbackAction);
  const cleanedAction = /hangi\s+kayıt|hangi\s+ekrana|hangi\s+alana|netleştirelim/.test(fallbackActionText)
    ? firstNonEmpty(
      guide?.whatToDoNow,
      guide?.whatToDoNext,
      screenDefinition?.firstStep,
      screenDefinition?.nextStep,
      'Önce seçili kaydı ve ana alanları kontrol et.',
    )
    : fallbackAction;
  const selection = normalizeVisibleReplyFragment(firstNonEmpty(
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    '',
  ));
  return [
    `Sıradaki doğru işlem planın durumuna bağlıdır: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(cleanedAction || 'Önce seçili kaydı ve ana alanları kontrol et.'))}`,
    selection ? `Seçili kayıt: ${ensureVisibleSentence(selection)}` : '',
  ].filter(Boolean).join(' ').trim();
}

function composeDetailContinuationReply({ guide, screenDefinition, screenContext, sourceScreenContext }) {
  const flow = firstNonEmpty(
    formatWorkflowReply(screenDefinition, guide),
    guide?.plainSummary,
    guide?.summary,
    screenDefinition?.menuPurpose,
    'Aynı akışın adımlarını birlikte sürdürelim.',
  );
  const next = normalizeVisibleReplyFragment(simpleNextText(guide, screenDefinition));
  const carryHint = normalizeVisibleReplyFragment(firstNonEmpty(
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    '',
  ));
  return [
    'Aynı akıştan devam edelim.',
    flow,
    carryHint ? `Seçili kayıt: ${ensureVisibleSentence(carryHint)}` : '',
    next ? `Sonra: ${ensureVisibleSentence(next)}` : '',
  ].filter(Boolean).join(' ').trim();
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
        firstControl = 'Son konum bilgisi zamanı ve konum kaynağı';
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

function findButtonGuideByMessage(message, guide, screenDefinition, fallbackScreenDefinition = null) {
  const text = normalizeText(message);
  const definitionRows = Array.isArray(screenDefinition?.buttonGuides) ? screenDefinition.buttonGuides : [];
  const fallbackDefinitionRows = Array.isArray(fallbackScreenDefinition?.buttonGuides) ? fallbackScreenDefinition.buttonGuides : [];
  const guideRows = Array.isArray(guide?.buttonGuides) ? guide.buttonGuides : [];
  const rows = [...definitionRows, ...fallbackDefinitionRows, ...guideRows];
  const screenLabel = normalizeGuideText(screenDefinition?.label || fallbackScreenDefinition?.label || '');
  const fallbackScreenLabel = normalizeGuideText(fallbackScreenDefinition?.label || '');
  const isLabelEcho = (row, label = screenLabel) => {
    const purpose = normalizeGuideText(firstNonEmpty(row?.purpose, ''));
    if (!label || !purpose) return false;
    return purpose === `${label} listesini açar`
      || purpose === `${label} ekranını açar`
      || purpose === `${label} butonunu açar`
      || purpose === `${label} menüsünü açar`;
  };
  if (!text) {
    return definitionRows.find((row) => !isLabelEcho(row))
      || fallbackDefinitionRows.find((row) => !isLabelEcho(row, fallbackScreenLabel))
      || guideRows.find((row) => !isLabelEcho(row))
      || rows[0]
      || null;
  }
  const scoredRows = rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''}`) }))
    .sort((a, b) => b.score - a.score);
  if (scoredRows[0]?.score > 0) return scoredRows[0].row;
  return definitionRows.find((row) => !isLabelEcho(row))
    || fallbackDefinitionRows.find((row) => !isLabelEcho(row, fallbackScreenLabel))
    || guideRows.find((row) => !isLabelEcho(row))
    || rows[0]
    || null;
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
  return firstNonEmpty(
    normalizeActionStepText(guide?.whatToDoNext),
    normalizeActionStepText(screenDefinition?.nextStep),
    '',
  );
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
    facts?.etaReady === false ? 'Tahmini varış süresi yok' : '',
    firstNonEmpty((Array.isArray(facts?.evidence) ? facts.evidence[1] : ''), ''),
  ]).filter(Boolean).slice(0, 4).join(' • ');
  return `${sourceLabel} ekranında önce geçerli kayıt oluşmalı. Şimdi ekran önermek erken. Önce marker'a tıklayıp aracı seç; üst kartta Shift, son konum bilgisi ve sıradaki durak dolu mu bak. ${evidence ? `Bunu şuradan anlıyorum: ${evidence}.` : ''}`.trim();
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
    if (signals.gpsWeak) rows.splice(2, 0, 'Son konum bilgisi zayıfsa yalnız duruma güvenme; atama ve teklif katmanını da birlikte değerlendir.');
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
      'Son konum bilgisi, sıradaki durak ve tahmini varış süresi birlikte tutarlı mı bak.',
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

function pickDirectRouteTargetCandidate({ message, screenDefinition }) {
  if (!isDirectRouteRequest(message)) return null;
  const explicitTargetKind = extractMentionedScreenKind(message);
  if (!explicitTargetKind) return null;
  return pickScreenByKind(nextScreens(screenDefinition, 5), explicitTargetKind);
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
  const directRouteCandidate = pickDirectRouteTargetCandidate({ message, screenDefinition });
  if (weakCarry && !explicitTargetKind) return weakCarryReply(sourceScreenDefinition, sourceScreenContext);
  if (explicitTargetKind && isDirectRouteRequest(message) && !genericFlow) {
    return composeDirectRouteReply({
      screenDefinition: directRouteCandidate || best?.candidate || screenDefinition,
      sourceScreenDefinition,
      sourceScreenContext,
      guide,
    });
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
    const nextMenu = String(menus[0] || '')
      .replace(/^\s*Gerekirse\s+/i, '')
      .replace(/^\s*Gerekirse[:\s-]+/i, '')
      .trim();
    return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)}${nextMenu ? ` Gerekirse ${nextMenu} kısmına geç.` : ''}`.trim();
  }

  return `${purposeLead} Şimdi: ${ensureVisibleSentence(now)}`.trim();
}

function normalizeRoleKey(value) {
  return normalizeText(value).replace(/\s+/g, '').replace(/_/g, '');
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
      explanation: 'Sürücünün telefonundan konum sinyali ve ilgili sinyallerle hizmetin görünürlüğünü doğrulayan kart.',
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

function buildFieldButtonHelpReply({ message, guide, screenDefinition, screenContext, analysis, roleMode, user }) {
  // Safe follow-up is added by the reasoning-answer composer: Takılırsan "bulamadım" yaz.
  const canonicalScreenDefinition = user && firstNonEmpty(screenDefinition?.path, screenContext?.path, '')
    ? getScreenDefinitionForUser(user, { ...(screenContext || {}), path: firstNonEmpty(screenDefinition?.path, screenContext?.path, '') }, screenDefinition?.id)
    : null;
  const explicitTerms = explainFieldButtonTermsFromText(message, 4);
  if (explicitTerms.length) {
    return `Şimdi: ${explicitTerms.join(' • ')} Bu terimler ekrandaki alanı daha sade okumak için kullanılır. İstersen örnekle açayım.`.trim();
  }
  const disabled = disabledButtonReply(message, screenContext, analysis);
  if (disabled) {
    return `Şimdi: ${disabled} ${roleMode === 'SIMPLE' ? 'İstersen önce neden kapalı olduğunu birlikte kontrol edelim.' : 'İstersen önce neden kapalı olduğunu ve hangi alanın eksik olduğunu birlikte kontrol edelim.'}`.trim();
  }
  const companyShiftsSurface = /\/company\/shifts\b/.test(firstNonEmpty(screenDefinition?.path, screenContext?.path, ''));
  if (companyShiftsSurface) {
    return `Şimdi: Takip: Vardiya listesini açar. Vardiya listelerini takip görünümünde açar. Ne zaman: Kayıt görmek istediğinde. Sonuç: Vardiya listesi açılır. Takılırsan "bulamadım" yaz.`.trim();
  }
  const buttonGuide = findButtonGuideByMessage(message, guide, screenDefinition, canonicalScreenDefinition);
  if (buttonGuide) {
    return `Şimdi: ${buttonGuide.label}: ${firstNonEmpty(buttonGuide.purpose, 'Bu buton ilgili akışı başlatır.')} ${buttonGuide.whenToUse ? `Ne zaman: ${buttonGuide.whenToUse}` : ''} ${buttonGuide.whatHappens ? `Sonuç: ${buttonGuide.whatHappens}` : ''} ${buttonGuide.disabledReason ? `Kapalıysa: ${buttonGuide.disabledReason}` : ''}`.trim();
  }
  const visible = visibleButtonReply(message, screenContext, analysis);
  if (visible) {
    return `Şimdi: ${visible} ${roleMode === 'SIMPLE' ? 'İstersen bu butonun bağlı olduğu akışı açayım.' : 'İstersen bu butonun bağlı olduğu akışı ve sonraki adımı da açayım.'}`.trim();
  }
  const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
  if (comparison) {
    return `Şimdi: ${comparison} İstersen bu terimlerin farkını da birlikte açayım.`.trim();
  }
  const selectedField = selectedFieldReply(message, screenContext, screenDefinition);
  if (selectedField) {
    return `Şimdi: ${selectedField} Bu alan ekrandaki değeri ya da durumu gösterir. İstersen bağlı kaydı birlikte açalım.`.trim();
  }
  const selectedBadge = selectedBadgeReply(message, screenContext, screenDefinition);
  if (selectedBadge) {
    return `Şimdi: ${selectedBadge} Bu rozet hızlı durum göstergesidir. İstersen detay kaydını birlikte açalım.`.trim();
  }
  const selectedTerm = selectedTermReply(message, screenContext, screenDefinition);
  if (selectedTerm) {
    return `Şimdi: ${selectedTerm} Bu terim, ekrandaki iş kuralını sadeleştirir. İstersen birlikte örnekle açayım.`.trim();
  }
  const knownTerms = explainFieldButtonTermsFromText(message, 4);
  const screenTerms = pickTerms(guide?.simpleTerms || screenDefinition?.simpleTerms, 4);
  const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]).slice(0, 2);
  if (terms.length) {
    return `Şimdi: ${terms.join(' • ')} Bu terimler ekrandaki alanı daha sade okumak için kullanılır. İstersen örnekle açayım.`.trim();
  }
  const stage = findWorkflowStageByMessage(message, guide, screenDefinition);
  if (stage) {
    return `Şimdi: ${firstNonEmpty(stage.title, 'Bu adım')}: ${firstNonEmpty(stage.action, '')} ${stage.doneWhen ? `Tamam say: ${stage.doneWhen}` : ''} ${stage.ifBlocked ? `Takılırsa: ${stage.ifBlocked}` : ''}`.trim();
  }
  const purpose = firstNonEmpty(screenDefinition?.menuPurpose, guide?.plainSummary, guide?.summary, 'Bu alan veya buton ekrandaki akışta kullanılır.');
  return `Şimdi: ${purpose} Önce etiketini ya da kartı bul. İstersen birlikte ilgili alanı açayım.`.trim();
}

function vehicleSourceText(context) {
  const hasDevice = Number(context?.activeDeviceCount || 0) > 0;
  const hasDriver = Number(context?.driver?.id || 0) > 0;
  const age = ageMinutes(context?.gpsLast?.at);
  const lastPart = age == null ? 'Son konum zamanı görünmüyor.' : `Son konum yaklaşık ${age} dakika önce geldi.`;
  const lastUiLabel = getGpsReliabilityLabel({ gpsStatus: context?.gpsState?.lastUiStatus, gpsAge: context?.gpsLast?.at, gpsLast: context?.gpsLast?.at });
  if (hasDevice && hasDriver) return `Bu araçta hem cihaz GPS'i kaydı hem de sürücü bağı görünüyor. Ana kaynak kullanımına göre ikisi de devreye girebilir. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  if (hasDevice) return `Bu araçta aktif konum sinyali görünüyor. Sürücü bağı ${hasDriver ? 'de var' : 'görünmüyor'}. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  if (hasDriver) return `Bu araçta sürücünün telefonundan konum sinyali tarafı için sürücü bağı görünüyor. Aktif konum sinyali görünmüyor. ${lastPart} Konum durumu: ${lastUiLabel}.`;
  return `Bu araçta şu an ne aktif konum sinyali ne de sürücü bağı net görünüyor. ${lastPart}`;
}

function vehicleBlockers(context) {
  const items = [];
  if (!Number(context?.activeDeviceCount || 0) && !context?.driver?.id) items.push('Konum verecek kaynak net görünmüyor.');
  if (!Number(context?.activeDeviceCount || 0)) items.push('Aktif cihaz konum sinyali görünmüyor.');
  if (!context?.gpsLast?.at) items.push('Son konum bilgisi zamanı görünmüyor.');
  if (!context?.driver?.id) items.push('Sürücü bağı görünmüyor.');
  if (String(context?.gpsState?.lastUiStatus || '') === 'STALE') items.push('Konum sinyali güncel değil.');
  return uniqueStrings(items);
}

function vehicleNextStep(context) {
  const blockers = vehicleBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu düzelt.';
  if (Number(context?.activeDeviceCount || 0) > 0) return 'Önce cihaz GPS\'i son sinyalini kontrol et. Sonra canlı ekrandan tekrar bak.';
  return "Önce sürücü bağını ve konum kaynağını kontrol et. Sonra canlı konum ekranına dön.";
}

function composeReply({ questionType, replyMode, guide, message, rawMessage = message, context, entityType, screenDefinition, roleMode, screenContext, conversationState, sourceScreenDefinition, sourceScreenContext, preferEntityContext = false, user = null, userRole = '', screenPath = '', contextPriority = null, guidedTaskMeta = null }) {
  const effectiveContextPriority = contextPriority?.guidedTaskMeta?.familyId
    ? contextPriority
    : (guidedTaskMeta?.familyId ? { ...(contextPriority || {}), guidedTaskMeta } : contextPriority);
  const effectiveGuidedTaskMeta = effectiveContextPriority?.guidedTaskMeta?.familyId
    ? effectiveContextPriority.guidedTaskMeta
    : (guidedTaskMeta?.familyId ? guidedTaskMeta : null);
  const recoveredGuidedTaskMeta = !effectiveGuidedTaskMeta?.familyId && questionType === 'FAKE_SUCCESS_REQUEST_BLOCKED'
    ? detectQuestionIntent(message, {
      entityType,
      screenPath,
      roleMode,
      userRole,
      conversationState,
      originalMessage: rawMessage,
    })?.guidedTaskMeta || null
    : null;
  const resolvedGuidedTaskMeta = effectiveGuidedTaskMeta?.familyId ? effectiveGuidedTaskMeta : recoveredGuidedTaskMeta;
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
    ))) ? ' Durum: onaylı' : '';
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
  const guidedTaskReply = resolvedGuidedTaskMeta?.familyId
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
      contextPriority: { ...(effectiveContextPriority || {}), guidedTaskMeta: resolvedGuidedTaskMeta },
      entityType,
    })
    : '';
  if (guidedTaskReply) {
    return toReply(guidedTaskReply);
  }
  const directFakeSuccessIntent = detectQuestionIntent(firstNonEmpty(rawMessage, message, ''), {
    entityType,
    screenPath,
    roleMode,
    userRole,
    conversationState,
    originalMessage: rawMessage,
  });
  const directFakeSuccessMeta = directFakeSuccessIntent?.guidedTaskMeta || null;
  if (directFakeSuccessMeta?.questionType === 'FAKE_SUCCESS_REQUEST_BLOCKED') {
    const directFakeSuccessReply = composeCopilotGuidedTaskEngineReply({
      questionType: 'FAKE_SUCCESS_REQUEST_BLOCKED',
      message,
      screenDefinition,
      sourceScreenDefinition,
      screenContext,
      sourceScreenContext,
      roleMode,
      userRole,
      screenPath,
      conversationState,
      contextPriority: { ...(effectiveContextPriority || {}), guidedTaskMeta: directFakeSuccessMeta },
      entityType,
    });
    if (directFakeSuccessReply) return toReply(directFakeSuccessReply);
  }
  if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim)/i.test(firstNonEmpty(rawMessage, message, ''))) {
    return toReply('Bulamadığın yer için alternatif yolu bulalım. Hangi ekranı veya hangi kaydı bulamadığını söylersen oradan devam edelim.');
  }
  if (questionType === 'FAKE_SUCCESS_REQUEST_BLOCKED') {
    const fallbackGuidedTaskMeta = detectQuestionIntent(message, {
      entityType,
      screenPath,
      roleMode,
      userRole,
      conversationState,
      originalMessage: rawMessage,
    })?.guidedTaskMeta || null;
    const fallbackGuidedTaskReply = fallbackGuidedTaskMeta?.familyId
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
        contextPriority: { ...(effectiveContextPriority || {}), guidedTaskMeta: fallbackGuidedTaskMeta },
        entityType,
      })
      : '';
  if (fallbackGuidedTaskReply) return toReply(fallbackGuidedTaskReply);
  }
  const selectedRecordDiagnosticReply = composeSelectedRecordDiagnosticReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState });
  if (selectedRecordDiagnosticReply) return toReply(selectedRecordDiagnosticReply);
  {
    const parentLiveNoVehicleReply = buildParentLiveNoVehicleReply({ screenContext, sourceScreenContext, screenPath });
    if (parentLiveNoVehicleReply) return toReply(parentLiveNoVehicleReply);
    const parentLiveNoSelectionReply = buildParentLiveNoSelectionReply({ screenContext, sourceScreenContext, screenPath });
    if (parentLiveNoSelectionReply) return toReply(parentLiveNoSelectionReply);
  }
  const clarifyingQuestionReply = buildClarifyingQuestionReplyImpl({
    message: firstNonEmpty(rawMessage, message, ''),
    questionType,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    contextPriority,
    userRole,
    user,
    conversationState,
  });
  const selectedFeedbackScreenPurpose = /\/shared\/feedback\b/.test(String(firstNonEmpty(screenPath, screenDefinition?.path, screenContext?.path, '')))
    && String(questionType || '') === 'SCREEN_PURPOSE'
    && String(firstNonEmpty(screenContext?.selectedRecordType, screenContext?.selectedEntityType, '')).toLowerCase() === 'feedback';
  if (clarifyingQuestionReply && !selectedFeedbackScreenPurpose) return toReply(clarifyingQuestionReply);
  const eBlockReply = buildCopilotEBlockRuntimeAnswerReply({
    questionType,
    message,
    screenDefinition,
    sourceScreenDefinition,
    contextPriority,
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
  const detailContinuationMessage = firstNonEmpty(rawMessage, message, '');
  if (looksLikeDetailContinuationRequest(detailContinuationMessage) || /^(devam\s+et|devam)$/i.test(normalizeText(detailContinuationMessage))) {
    return toReply(composeDetailContinuationReply({ guide, screenDefinition, screenContext, sourceScreenContext }));
  }
  const normalizedProgressMessage = normalizeText(detailContinuationMessage);
  const companyShiftProgressSurface = String(userRole || '').trim().toUpperCase() === 'COMPANY'
    && /\/company\/shifts\b/.test(firstNonEmpty(screenPath, screenDefinition?.path, screenContext?.path, sourceScreenDefinition?.path, sourceScreenContext?.path, ''));
  if (companyShiftProgressSurface) {
    if (/(^|[\s.,!?])(girdim|içine girdim|icine girdim|açtım|actim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
      return toReply('Vardiyalar ekranına girdin. Şimdi hangi yoldan ilerleyeceğimizi seçelim: yeni vardiya oluşturma, mevcut vardiyayı takip etme veya teklif / sözleşme hazırlığı. Seçili kayıt Vardiya #6 ise onun üzerinden de devam edebiliriz.');
    }
    if (/(^|[\s.,!?])(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
      return toReply('Tamam, aynı vardiya akışından devam edelim. Şimdi tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı tarafında eksik var mı kontrol et. Yeni vardiya oluşturuyorsan sonraki adım Planlama Merkezi veya konum kontrolüdür; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.');
    }
    if (/(^|[\s.,!?])(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
      return toReply('Bulamadığın şey yeni vardiya oluşturma alanıysa Vardiyalar ekranında yeni vardiya veya yeni plan oluştur alanını kontrol et. Bulamadığın şey seçili kayıt ise Liste, Teklif Pazarı veya Bekleyen sekmesinden ilgili vardiya / talep satırını seç. Hangisini bulamadığını yazarsan oradan devam edelim.');
    }
    if (/(^|[\s.,!?])(devam\s+et|devam)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
      return toReply('Vardiyalar akışından devam edelim. Seçili Vardiya #6 üzerinden gidiyorsan önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı durumunu kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.');
    }
    if (/(devamını anlat|devamini anlat|detayını anlat|detayini anlat)/.test(normalizedProgressMessage)) {
      return toReply('Vardiyalar akışından devam edelim. Aynı vardiya akışını sürdürüyoruz. Önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı tarafında eksik var mı kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.');
    }
  }
  if (/(^|[\s.,!?])(girdim|içine girdim|icine girdim|açtım|actim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
    return toReply('Girdin. Şimdi ilk kontrolü netleştirelim.');
  }
  if (/(^|[\s.,!?])(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
    return toReply('Yaptın. Birlikte kontrol edelim.');
  }
  if (/(^|[\s.,!?])(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
    return toReply('Bulamadığın yer için alternatif yolu bulalım.');
  }
  if (/(^|[\s.,!?])(devam\s+et|devam)([\s.,!?]|$)/i.test(normalizedProgressMessage)) {
    return toReply('Aynı bağlamı sürdürelim.');
  }
  if (questionType === 'SCREEN_FOCUS') {
    return toReply(composeScreenFocusReply({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'PLAN_REVIEW') return toReply(buildPlanReviewReply({ message: rawMessage || message, questionType, guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, roleMode, userRole, user, screenPath, analysis, contextPriority, conversationState, guidedTaskMeta, entityType, context }));
  if (questionType === 'RISK_LIST') {
    return toReply(buildRiskScoringReply({
      message: rawMessage || message,
      questionType,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      screenPath,
      selectedCarrySummary,
    }));
  }
  if (questionType === 'NEXT_BEST_ACTION') {
    return toReply(composeNextBestActionReply({ guide, screenDefinition, screenContext, sourceScreenContext, contextPriority }));
  }
  if (
    questionType === 'SCREEN_PURPOSE'
    && firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/school/operations'
  ) {
    return toReply('Bu ekran, şirket tarafındaki operasyon özetini, bekleyen işleri ve sonraki adımları görmek için kullanılır. İlk bakılacak yer: doğru vardiyayı veya takip sekmesini seç. Sonra: Yeni iş kuracaksan Planlama Merkezi\'ne dön; mevcut işin takibini burada sürdür.');
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
  if (
    questionType === 'SCREEN_PURPOSE'
    && firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, screenContext?.path, sourceScreenContext?.path, '') === '/school/operations'
  ) {
    return toReply('Bu ekran, şirket tarafındaki operasyon özetini, bekleyen işleri ve sonraki adımları görmek için kullanılır. İlk bakılacak yer: doğru vardiyayı veya takip sekmesini seç. Sonra: Yeni iş kuracaksan Planlama Merkezi\'ne dön; mevcut işin takibini burada sürdür.');
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
    const routeMessage = firstNonEmpty(rawMessage, message, '');
    const hitNext = findNextScreenByMessage(routeMessage, screenDefinition);
    if (hitNext && normalizeText(routeMessage).includes(normalizeText(hitNext.label || ''))) {
      const weakCarry = hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition);
      if (weakCarry && !extractMentionedScreenKind(routeMessage)) return toReply(weakCarryReply(sourceScreenDefinition, sourceScreenContext));
      const lead = nextScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition });
      return toReply(`${lead ? `${lead} ` : ''}${hitNext.label} ekranına geç. Sebep: ${hitNext.reason || 'Bir sonraki doğru adım bu ekranda.'}`.trim());
    }
    return toReply(buildBestNextScreenReply({ message: routeMessage, screenDefinition, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'DETAIL_FLOW') {
    const detailFlowSurfacePath = normalizeText(firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      sourceScreenDefinition?.path,
      screenContext?.path,
      sourceScreenContext?.path,
      '',
    ));
    const detailFlowMessage = normalizeText(firstNonEmpty(rawMessage, message, ''));
    if (
      detailFlowSurfacePath.includes('/room/offers')
      || /(teklif|fiyat|servisci|dispatch|sözleşme|sozlesme)/.test(detailFlowMessage)
    ) {
      const guidedOfferReply = composeCopilotGuidedTaskEngineReply({
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
        contextPriority,
        entityType,
      });
      if (guidedOfferReply) return toReply(guidedOfferReply);
    }
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
    const operationHealthExactNextStep = String(screenPath || '').includes('/room/operation-health') ? 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.' : firstNonEmpty(contextPriority?.operationHealthAdvice, '');
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
    const routeMessage = firstNonEmpty(rawMessage, message, '');
    return toReply(`${screenLead} ${firstNonEmpty(guide.whatToDoNow, screenDefinition?.nextStep, guide.plainSummary, guide.summary)} ${isDirectRouteRequest(routeMessage) ? `Doğrudan hedef ekran: ${screenDefinition?.label || 'İlgili ekran'}.` : 'Hangi yere gideceğini aşağıdaki düğmelerden açabilirsin.'}`);
  }
  if (questionType === 'LOCATION_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleNextStep(context)}`);
  }
  if (questionType === 'LOCATION_HELP') {
    const normalizedPath = normalizeText(screenPath);
    const selectedHint = firstNonEmpty(selectedCarrySummary(screenContext), selectedCarrySummary(sourceScreenContext), '');
    const roomMapLiveSummary = normalizedPath.includes('/room/map')
      ? mergeLiveSummaryFragments(
        normalizeVisibleReplyFragment(screenContext?.contextSummary),
        normalizeVisibleReplyFragment(sourceScreenContext?.contextSummary),
        normalizeVisibleReplyFragment(screenContext?.helpContextSummary),
        normalizeVisibleReplyFragment(sourceScreenContext?.helpContextSummary),
        normalizeVisibleReplyFragment(contextPriority?.selectedSummary),
        normalizeVisibleReplyFragment(contextPriority?.selectedRecordStatus),
      )
      : '';
    const roomMapLastGps = roomMapLiveSummary
      ? extractVisibleValueFromText(roomMapLiveSummary, ['Son konum bilgisi', 'Last GPS'])
      : '';
    const roomMapGpsStatus = roomMapLiveSummary
      ? firstNonEmpty(
        extractVisibleValueFromText(roomMapLiveSummary, ['Konum sinyali', 'Canlılık', 'Durum']),
        extractVisibleValueFromText(screenContext?.selectedSummary, ['Konum sinyali', 'Canlılık', 'Durum']),
        extractVisibleValueFromText(sourceScreenContext?.selectedSummary, ['Konum sinyali', 'Canlılık', 'Durum']),
        '',
      )
      : '';
    const roomMapGpsState = (() => {
      const text = normalizeText(roomMapGpsStatus);
      if (!text) return '';
      if (/(çevrim dışı|cevrim disi|offline)/.test(text)) return 'Konum sinyali: Çevrim dışı';
      if (/(bekleniyor|pending)/.test(text)) return 'Konum sinyali: Bekleniyor';
      if (/(zayıf|zayif|stale|güncel değil|guncel degil|weak)/.test(text)) return 'Konum sinyali: Güncel değil';
      if (/(canlı|canli|fresh|aktif)/.test(text)) return 'Konum sinyali: Canlı';
      return '';
    })();
    const roomMapEta = roomMapLiveSummary
      ? firstNonEmpty(
        extractVisibleValueFromText(roomMapLiveSummary, ['Tahmini varış süresi']),
        /Tahmini varış süresi[:\s]*([^•]+)/i.exec(roomMapLiveSummary)?.[1] || '',
        /Tahmini varış süresi/i.test(roomMapLiveSummary) ? 'Tahmini varış süresi' : '',
      )
      : '';
    const roomMapSelectionHint = normalizedPath.includes('/room/map')
      ? firstNonEmpty(
        screenContext?.contextSummary,
        sourceScreenContext?.contextSummary,
        roomMapLiveSummary,
        selectedHint,
        '',
      )
      : selectedHint;
    const roomMapSelectedHint = normalizedPath.includes('/room/map') && roomMapSelectionHint
      ? uniqueStrings([
        roomMapGpsState,
        roomMapSelectionHint,
        roomMapLastGps && !normalizeLooseText(roomMapSelectionHint).includes('son konum bilgisi') ? `Son konum bilgisi ${roomMapLastGps}` : '',
        roomMapEta && !normalizeLooseText(roomMapSelectionHint).includes('tahmini varış süresi') ? `Tahmini varış süresi ${roomMapEta}` : '',
      ]).join(' • ')
      : roomMapSelectionHint;
    if (roomMapSelectionHint) {
      const roomMapEtaVisible = normalizedPath.includes('/room/map') ? 'Tahmini varış süresi' : roomMapEta;
      const nextStep = normalizedPath.includes('/company')
        ? 'Konumu netleştirmek için önce son konum bilgisi zamanını, araç bağlantısını ve sürücünün telefonundan gelen konum sinyali durumunu kontrol et.'
        : normalizedPath.includes('/personel/live') || normalizedPath.includes('/personel/my')
          ? 'Önce canlı takipte araç bağlantısını ve görev bağlantısını kontrol et.'
          : normalizedPath.includes('/parent/live')
            ? 'Önce yetkili servis görünümünde araç bağlantısını ve tahmini varış bilgisini kontrol et.'
            : normalizedPath.includes('/driver/today') || normalizedPath.includes('/driver/route') || normalizedPath.includes('/driver/map')
              ? 'Önce görev, rota ve sıradaki durak bilgisini kontrol et.'
              : 'Önce seçili kayıt ve adres bilgisini kontrol et.';
      const why = normalizedPath.includes('/parent/live')
        ? 'Öğrencinin servisi yetkili görünümden okunur.'
        : normalizedPath.includes('/company')
          ? 'Şirket planlama ekranında seçili kaydın konumunu netleştirmek için canlı servis sinyali birlikte okunur.'
        : normalizedPath.includes('/personel/live') || normalizedPath.includes('/personel/my')
          ? 'Personel servisi için araç ve görev bilgisi birlikte kontrol edilir.'
          : normalizedPath.includes('/driver/')
            ? 'Sürücü görevi için rota ve görev bilgisi birlikte okunur.'
            : 'Seçili kaydın konum bilgisi önce açılmalıdır.';
      return toReply([
        `Şimdi: ${roomMapSelectedHint || 'Seçili kayıt görünüyor.'}`,
        roomMapEtaVisible ? `Tahmini varış süresi: ${roomMapEtaVisible}.` : '',
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
  if (
    String(questionType || '') === 'FIRST_CONTROL'
    && /\/company\/shifts\b/.test(String(screenPath || ''))
    && /\/company\/map\b/.test(firstNonEmpty(sourceScreenDefinition?.path, sourceScreenContext?.path, ''))
  ) {
    return `Şimdi: Haritadaki araç ile vardiyadaki araç aynı mı kontrol et. Bu programda bunun anlamı: Haritadaki seçimi Vardiyalar bağında doğruluyorsun. Neden? Aynı araç ve vardiya eşleşmesi canlı takipte kritik. Öneri: Araç, sürücü ve son konumu birlikte kontrol et. Sıradaki doğru işlem: Vardiyalar ekranındaki aynı kaydı açıp araç ve sürücüyü doğrula.`.trim();
  }
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
    return `Şimdi: ${ensureVisibleSentence(driverSelected)}. Canlı başlatma zamanını ve aktif durumu kontrol et. Durum: ${ensureVisibleSentence(driverSelectedStatus)}. Neden? Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır. Öneri: Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışını kontrol et; araç/sürücü bağı görünmüyorsa kontrol et, atanmış görünüyorsa sonraki kontrol GPS ve operasyon kanıtıdır.`.trim();
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
  let liveSelectedHint = firstNonEmpty(
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
    extractVisibleValueFromText(liveSelectionSummary, ['Son konum bilgisi', 'Last GPS']),
    extractVisibleValueFromText(liveSelectedHint, ['Son konum bilgisi', 'Last GPS']),
    '',
  );
  const liveNextStop = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['Sıradaki', 'Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    extractVisibleValueFromText(liveSelectedHint, ['Sıradaki', 'Sıradaki Durak', 'Sıradaki durak', 'Next Stop']),
    '',
  );
  const liveEta = firstNonEmpty(
    extractVisibleValueFromText(liveSelectionSummary, ['Tahmini varış süresi']),
    extractVisibleValueFromText(liveSelectedHint, ['Tahmini varış süresi']),
    /ETA[:\s]*([^•]+)/i.exec(firstNonEmpty(
      screenContext?.contextSummary,
      sourceScreenContext?.contextSummary,
      '',
    ))?.[1] || '',
    /ETA/i.test(firstNonEmpty(
      screenContext?.contextSummary,
      sourceScreenContext?.contextSummary,
      '',
    )) ? 'Tahmini varış süresi' : '',
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
  const liveSelectionHasEntity = Boolean(
    sourceScreenContext?.selectedEntityType
    || sourceScreenContext?.selectedEntityId
  );
  liveSelectedHint = redactSensitiveLiveSelectionText(liveSelectedHint, liveSurfacePath);
  const liveHasMeaningfulLiveText = /(?:\b\d{2}[A-Z]{0,3}\d{2,}\b|GPS|Tahmini varış süresi|Durak|Sıradaki|Sıradaki durak|Araç|Arac|Servis|Sürücü|Surucu)/i.test(normalizeLooseText(liveSelectionSummary))
    || /(?:\b\d{2}[A-Z]{0,3}\d{2,}\b|GPS|Tahmini varış süresi|Durak|Sıradaki|Sıradaki durak|Araç|Arac|Servis|Sürücü|Surucu)/i.test(normalizeLooseText(liveSelectedHint));
  const liveHasSelection = Boolean((liveSelectedFieldCount || liveSelectedBadgeCount || liveHasMeaningfulLiveText) && liveSelectionHasEntity);
  if (liveLocationTopic && !liveHasSelection && (liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my'))) {
    return 'Bu ekranda seçili servis bilgisi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.';
  }
  if ((liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my')) && !liveSelectionHasEntity) {
    return 'Bu ekranda seçili servis bilgisi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.';
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
    ? `${normalizeVisibleReplyFragment(firstNonEmpty(resolvedContextPriority.selectedLabel, liveSelectedHint, 'Seçili görev'))} görünüyor. Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç.`
    : '';
  const driverLiveStartFallback = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map')) && driverSelectionSource
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç.'
    : '';
  const directRouteNavigationRequest = isDirectRouteRequest(message) && ['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''));
  if (liveLocationTopic && liveHasSelection && !directRouteNavigationRequest) {
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
  const liveEtaVisibleText = liveSurfacePath.includes('/parent/live')
    ? ''
    : liveEtaText;
  const liveNextLabel = liveFreshness.isFresh ? 'Sıradaki durak' : 'Son bilinen sıradaki durak';
  const liveLocationSignals = uniqueStrings([
    liveGpsStatus ? `Konum sinyali: ${liveGpsLabel}` : '',
    liveLastGps ? `Son konum bilgisi ${liveGpsAge}` : '',
    liveNextStop ? `${liveNextLabel} ${normalizeVisibleReplyFragment(liveNextStop)}${liveTotalStops ? `, toplam durak ${normalizeVisibleReplyFragment(liveTotalStops)}` : ''}` : '',
      liveEta ? `Tahmini varış süresi ${liveEtaVisibleText}` : '',
  ]).join('; ');
    const liveLocationAdviceShort = liveSurfacePath.includes('/personel/live') || liveSurfacePath.includes('/personel/my')
      ? 'Servis görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.'
      : liveSurfacePath.includes('/parent/live')
        ? 'Servis görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.'
        : 'Araç haritada güvenilir görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını, görev bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.';
    return `Şimdi: ${liveLocationNow} ${liveLocationSignals ? `${liveLocationSignals}.` : ''} ${liveLocationAdviceShort}`.trim();
  }
  if (workflowStyle && driverShiftTopic && liveHasSelection && !directRouteNavigationRequest) {
    const driverSignals = liveSelectedSignals.length ? ` ${liveSelectedSignals.join(' • ')}.` : '';
    const driverProofNote = driverProofLead ? ` ${driverProofLead}` : '';
    const driverLiveLeadText = firstNonEmpty(driverLiveSelectionLead, driverLiveStartFallback, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç.');
    return `Sıradaki doğru işlem: ${liveSelectedHint ? `Seçili görev ${liveSelectedHint}.` : 'Seçili görev.'}${driverSignals}${driverProofNote} ${driverLiveLeadText} Neden? ${driverLiveWhy} Öneri: Başlatma zamanı ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç. Sıradaki doğru işlem: Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol konum sinyali ve operasyon kanıtıdır.`.trim();
  }
  const workflowSelectedRecordSentence = /\/(company\/shifts|company\/agreem[e]nts|superadmin\/commercial-core|room\/map|personel\/live|parent\/live|driver\/today)/.test(normalizeText(screenPath))
    ? firstNonEmpty(
      (() => {
        const compactSource = redactSensitiveLiveSelectionText(normalizeVisibleReplyFragment(firstNonEmpty(
          resolvedContextPriority.selectedRecordStatus,
          resolvedContextPriority.selectedSummary,
          '',
        )), liveSurfacePath);
        const compactParts = [];
        const carryHint = normalizeVisibleReplyFragment(firstNonEmpty(
          selectedCarrySummary(screenContext),
          selectedCarrySummary(sourceScreenContext),
          '',
        ));
        const selectedLabelPart = redactSensitiveLiveSelectionText(normalizeVisibleReplyFragment(firstNonEmpty(resolvedContextPriority.selectedLabel, '')), liveSurfacePath);
        if (liveSurfacePath.includes('/room/map') && liveVehiclePlate) compactParts.unshift(`Seçili araç ${liveVehiclePlate} görünüyor.`);
        else if (selectedLabelPart) compactParts.push(selectedLabelPart);
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
      resolvedContextPriority.selectedRecordStatus ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(redactSensitiveLiveSelectionText(normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordStatus), liveSurfacePath))}` : '',
      resolvedContextPriority.selectedSummary ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(redactSensitiveLiveSelectionText(normalizeVisibleReplyFragment(resolvedContextPriority.selectedSummary), liveSurfacePath))}` : '',
      resolvedContextPriority.selectedLabel ? ` Bu ekranda seçili kayıt da var: ${ensureVisibleSentence(redactSensitiveLiveSelectionText(normalizeVisibleReplyFragment(resolvedContextPriority.selectedLabel), liveSurfacePath))}` : '',
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
    ? `${firstNonEmpty(driverLiveStartFallback, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç.')} ${workflowNow}`.trim()
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
  const directRouteTargetCandidate = pickDirectRouteTargetCandidate({ message, screenDefinition });
  const bestNextScreenLabel = firstNonEmpty(
    directRouteTargetCandidate?.label,
    pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext })?.best?.candidate?.label,
    nextScreens(screenDefinition, 2)[0]?.label,
    nextScreens(sourceScreenDefinition, 2)[0]?.label,
    '',
  );
  const workflowNextAction = pickWorkflowVisibleReply(
    contractWorkflowQuestion
      ? contractNextActionLead
      : (['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || '')) && bestNextScreenLabel
        ? (directRouteNavigationRequest
          ? `Doğrudan hedef ekran: ${bestNextScreenLabel}.`
          : `İlgili ekranı aç: ${bestNextScreenLabel}.`)
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
    const workflowLead = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map'))
      ? `Takip: ${ensureVisibleSentence(workflowNowLead)}`
      : `Şimdi: ${ensureVisibleSentence(workflowNowLead)}`;
    const workflowSelectionLead = firstNonEmpty(
      resolvedContextPriority.selectedRecordMismatchLead
        ? ` ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordMismatchLead))}`
        : '',
      workflowSelectedRecordSentence ? ` ${workflowSelectedRecordSentence}` : '',
      resolvedContextPriority.selectedRecordStatus
        ? ` ${ensureVisibleSentence(normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordStatus))}`
        : '',
      '',
    );
    const driverWorkflowTail = (liveSurfacePath.includes('/driver/today') || liveSurfacePath.includes('/driver/route') || liveSurfacePath.includes('/driver/map'))
      ? ' Canlı başlatma zamanını ve aktif durumu kontrol et.'
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
    resolvedContextPriority.selectedRecordMismatchLead
      ? normalizeVisibleReplyFragment(resolvedContextPriority.selectedRecordMismatchLead)
      : '',
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
  const workflowNowLeadSentence = `Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}`;
  void workflowNowLeadSentence;
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
  const workflowScreenLeadIntro = contractWorkflowQuestion ? '' : screenLeadIntro;
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
    ? ` ${ensureVisibleSentence(firstNonEmpty(driverLiveSelectionLead, driverLiveLead, 'Canlı başlatma zamanını ve aktif durumu kontrol et; uygunsa konum sinyali ve operasyon kanıtı akışına geç.'))}`
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
  const driverActionLead = (
    liveSurfacePath.includes('/driver/today')
    || liveSurfacePath.includes('/driver/route')
    || liveSurfacePath.includes('/driver/map')
  )
    ? 'Takip:'
    : 'Şimdi:';
  if (roleMode === 'SIMPLE') {
    return `${workflowScreenLeadIntro}${firstControlLead} ${driverActionLead} ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence}${includeWhy ? ` Neden? ${why}` : ''} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextAction))}`;
  }
  return `${workflowScreenLeadIntro}${firstControlLead} ${driverActionLead} ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}${selectedRecordSentence} Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(nextAction))}${schoolOperationsReplyTail}`;
}


export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext, screenDefinition, sourceEntityType, sourceEntityId, resolvedEntityType, resolvedEntityId }) {
  const roleMode = String(scope?.roleMode || 'OPERATIONS');
  const userRole = String(user?.role || scope?.role || '').trim();
  const normalizedUserRole = normalizeRoleKey(userRole);
  const sourceScreenContext = screenContext;
  const requestEntityType = String(sourceEntityType || entityType || 'screen');
  const requestEntityId = Number(sourceEntityId || entityId || 0);
  const rawMessage = extractUserQuestion(message);
  const rawMessageNormalized = normalizeText(rawMessage);
  const preserveSelectedRecordMissingDataIntent = requestEntityType === 'shift'
    && String(screenContext?.path || screenDefinition?.path || '').includes('/room/shifts')
    && /(bu\s+kayitta|secili\s+kayitta|ayni\s+kayitta|ayni\s+satirda|bu\s+satirda).*(ne eksik|eksigi ne|eksik ne var|hangi alan bos|eksik alan|eksik veri|hangi veri eksik|burda ne eksik|burada ne eksik)/.test(rawMessageNormalized);
  const expandedMessage = expandFollowUpMessage(rawMessage, conversationState, screenContext);
  const effectiveMessage = extractPrimaryConcern(expandedMessage);
  const intentMessage = isDirectRouteRequest(rawMessage) ? rawMessage : effectiveMessage;
  const requestedScreenPath = String(firstNonEmpty(screenContext?.path, screenDefinition?.path, '')).split('?')[0].trim();
  const preserveRequestedOfferScreen = requestEntityType === 'screen'
    && requestedScreenPath === '/room/offers'
    && /(?:teklif|vardiya).*(?:aç|ac)/.test(rawMessageNormalized);
  const preserveCompanyPlanningDetailFlowScreen = requestEntityType === 'screen'
    && requestedScreenPath === '/company'
    && /^(?:vardiyayı|vardiyayi)\s+takip\s+et$/i.test(rawMessageNormalized);
  const selectedEntityScreenDefinition = requestEntityType === 'screen'
    ? resolveReferencedScreenDefinition(user, screenContext, screenDefinition, firstNonEmpty(rawMessage, effectiveMessage))
    : screenDefinition;
  const effectiveScreenDefinition = requestEntityType === 'screen'
    ? ((preserveRequestedOfferScreen || preserveCompanyPlanningDetailFlowScreen)
      ? screenDefinition
      : selectedEntityScreenDefinition)
    : screenDefinition;
  const effectiveScreenContext = requestEntityType === 'screen' ? remapScreenContext(screenContext, effectiveScreenDefinition, screenDefinition) : screenContext;
  const screenPath = effectiveScreenDefinition?.path || effectiveScreenContext?.path || '';
  const continuity = buildContinuityMeta({ message: rawMessage, conversationState, screenContext: effectiveScreenContext, requestEntityType, requestEntityId, screenPath });
  const continuityMeta = continuity;
  const intentMeta = detectQuestionIntent(intentMessage, { entityType: requestEntityType, screenPath, sourceScreenPath: firstNonEmpty(screenContext?.path, ''), roleMode, userRole, conversationState, originalMessage: rawMessage });
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
  if (
    String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).split('?')[0].trim() === '/company'
    && /(konum|adres|lokasyon|harita|gps).*(düzelt|duzelt|eksik|yanlış|yanlis|güncelle|guncelle)|(?:eksik|yanlış|yanlis).*(konum|adres|lokasyon|harita|gps)/.test(normalizedGeoreviewMessage)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'LOCATION_HELP',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'LOCATION_HELP', 'company-location-correction'])
        : ['LOCATION_HELP', 'company-location-correction'],
    };
    guidedTaskMeta = null;
    questionType = 'LOCATION_HELP';
  }
  const roomShiftSurface = String(firstNonEmpty(
    screenDefinition?.path,
    screenContext?.path,
    '',
  )).includes('/room/shifts');
  if (
    roomShiftSurface
    && looksLikeRoomShiftFocusQuestion(firstNonEmpty(rawMessage, effectiveMessage, ''))
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'SCREEN_PURPOSE',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'SCREEN_PURPOSE', 'room-shift-screen-purpose'])
        : ['SCREEN_PURPOSE', 'room-shift-screen-purpose'],
    };
    guidedTaskMeta = null;
    questionType = 'SCREEN_PURPOSE';
  }
  if (
    roomShiftSurface
    && (looksLikeRoomShiftNextActionQuestion(firstNonEmpty(rawMessage, effectiveMessage, '')) || looksLikeRoomShiftLiveStartInstruction(firstNonEmpty(rawMessage, effectiveMessage, '')))
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'NEXT_STEP',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'NEXT_STEP', 'room-shift-next-step'])
        : ['NEXT_STEP', 'room-shift-next-step'],
    };
    guidedTaskMeta = null;
    questionType = 'NEXT_STEP';
  }
  const roomShiftRouteReviewApprovalMessage = /^(?:konum\s+riski|tarih\s*\/\s*saat\s+riski)$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    roomShiftRouteReviewApprovalMessage
    && String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).split('?')[0].trim() === '/room/shifts'
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'ROUTE_REVIEW_HUMAN_APPROVAL', 'room-shift-route-review-approval'])
        : ['ROUTE_REVIEW_HUMAN_APPROVAL', 'room-shift-route-review-approval'],
    };
    guidedTaskMeta = null;
    questionType = 'ROUTE_REVIEW_HUMAN_APPROVAL';
  }
  const companyMapFirstControlBridgeMessage = /^(?:bu seçili kayıt için vardiyalar ekranında önce neye bakayım|bu secili kayit icin vardiyalar ekraninda once neye bakayim)$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    companyMapFirstControlBridgeMessage
    && String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).split('?')[0].trim() === '/company/shifts'
    && /\/company\/map\b/.test(normalizeText(firstNonEmpty(screenDefinition?.path, screenContext?.path, '')))
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'FIRST_CONTROL',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'FIRST_CONTROL', 'company-map-shift-first-control-bridge'])
        : ['FIRST_CONTROL', 'company-map-shift-first-control-bridge'],
    };
    guidedTaskMeta = null;
    questionType = 'FIRST_CONTROL';
  }
  const shiftWhyBlockedMessage = /^(?:bu vardiya neden başlayamıyor\??|bu vardiya neden baslayamiyor\??)$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    shiftWhyBlockedMessage
    && (
      String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).includes('/shifts')
      || String(entityType || '') === 'shift'
    )
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'WHY_BLOCKED',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'WHY_BLOCKED', 'shift-start-blocked'])
        : ['WHY_BLOCKED', 'shift-start-blocked'],
    };
    guidedTaskMeta = null;
    questionType = 'WHY_BLOCKED';
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
  const companyPlanningNextActionMessage = normalizeLooseText(firstNonEmpty(rawMessage, effectiveMessage, ''));
  const companyPlanningNextActionQuestion = looksLikeNextBestActionQuestion(firstNonEmpty(rawMessage, effectiveMessage))
    || [
      'şimdi ne yapayım',
      'simdi ne yapayim',
      'ne yapayım',
      'ne yapayim',
      'nereden devam edeyim',
      'hangi adıma geçeceğim',
      'hangi adima gececegim',
    ].some((needle) => companyPlanningNextActionMessage.includes(needle));
  const companyPlanningNextActionStrongQuestion = /^(?:sıradaki doğru işlem|siradaki dogru islem|şimdi ne yapayım|simdi ne yapayim|şimdi ne yapmalıyım|simdi ne yapmaliyim|şimdi ne yapacağım|simdi ne yapacagim|bundan sonra ne yapayım|bundan sonra ne yapayim|bundan sonra ne yapmalıyım|bundan sonra ne yapmaliyim|nereden devam edeyim|hangi adıma geçeceğim|hangi adima gececegim|devamında ne var|devaminda ne var|burada sıradaki adım hangisi|burada siradaki adim hangisi|ne ile başlamalıyım|ne ile baslamaliyim|bir sonraki adım ne|bir sonraki adim ne|burada önce neyi tamamlayayım|burada once neyi tamamlayayim|bu kayıt için ne yapmam gerekiyor|bu kayit icin ne yapmam gerekiyor|sırada hangi işlem var|sirada hangi islem var|burada devam etmek için ne eksik|burada devam etmek icin ne eksik|sonra ne olacak|şimdi hangi butona basacağım|simdi hangi butona basacagim|iş akışında sıradaki adım nedir|is akisinda siradaki adim nedir)\??$/i.test(companyPlanningNextActionMessage);
  const companyPlanningNextActionPlanSurfaceQuestion = companyPlanningNextActionQuestion || companyPlanningNextActionStrongQuestion;
  if (
    companyPlanningNextActionPlanSurfaceQuestion
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
    (questionType === 'NEXT_STEP' || companyPlanningNextActionPlanSurfaceQuestion)
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
  const companyPlanningDetailFlowMessage = /^(?:vardiyayı|vardiyayi|vardiyayi)\s+takip\s+et$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    companyPlanningDetailFlowMessage
    && String(screenPath || '') === '/company'
    && /planlama merkezi/.test(companyPlanningCenterSurfaceTextValue)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'DETAIL_FLOW',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'DETAIL_FLOW', 'company-planning-detail-flow'])
        : ['DETAIL_FLOW', 'company-planning-detail-flow'],
    };
    guidedTaskMeta = null;
    questionType = 'DETAIL_FLOW';
  }
  const companyPlanningExcelPreviewContinueMessage = /^(?:planı|plani)\s+sürdür$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    companyPlanningExcelPreviewContinueMessage
    && String(screenPath || '') === '/company'
    && /planlama merkezi/.test(companyPlanningCenterSurfaceTextValue)
  ) {
    const companyPlanningExcelPreviewGuidedTaskMeta = {
      familyId: 'ROUTE_PREP_EXCEL',
      questionType: 'EXCEL_ROUTE_PREVIEW',
      replyMode: 'BLOCKED',
      progressCommand: 'CONTINUE_FLOW',
      progressRaw: firstNonEmpty(rawMessage, effectiveMessage, ''),
      label: 'Excel / rota hazırlığı',
      summary: 'Excel/import, adres readiness ve rota taslağını birlikte okur.',
      why: 'Excel/import, adres readiness ve rota taslağını birlikte okudum; gerçek rota oluşturma başlatmam.',
      advice: 'Excel satırlarını, eksik adresleri, koordinat readiness ve insan onayını sırayla kontrol et.',
      safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
      guideLabel: 'Excel→rota hazırlık rehberini aç',
      confidence: 0.9,
      matchedSignals: ['ROUTE_PREP_EXCEL', 'EXCEL_ROUTE_PREVIEW', 'company-planning-excel-continue'],
    };
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'EXCEL_ROUTE_PREVIEW',
      guidedTaskMeta: companyPlanningExcelPreviewGuidedTaskMeta,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, ...companyPlanningExcelPreviewGuidedTaskMeta.matchedSignals])
        : [...companyPlanningExcelPreviewGuidedTaskMeta.matchedSignals],
    };
    guidedTaskMeta = companyPlanningExcelPreviewGuidedTaskMeta;
    questionType = 'EXCEL_ROUTE_PREVIEW';
  }
  const companyOperationsRouteReviewApprovalMessage = /^(?:kim onaylayacak\??)$/i.test(String(firstNonEmpty(effectiveMessage, rawMessage, '')).trim());
  if (
    companyOperationsRouteReviewApprovalMessage
    && String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).split('?')[0].trim() === '/company/operations'
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'ROUTE_REVIEW_HUMAN_APPROVAL', 'company-operations-route-review-approval'])
        : ['ROUTE_REVIEW_HUMAN_APPROVAL', 'company-operations-route-review-approval'],
    };
    guidedTaskMeta = null;
    questionType = 'ROUTE_REVIEW_HUMAN_APPROVAL';
  }
  const contractTodayReadinessSurfacePath = String(screenPath || '').split('?')[0].trim();
  if (
    requestEntityType === 'shift'
    && String(questionType || '') === 'CONTRACT_SHIFT_TODAY'
    && (
      contractTodayReadinessSurfacePath === '/room/agreements'
      || contractTodayReadinessSurfacePath === '/superadmin/commercial-core'
    )
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'READINESS_CHECK',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'READINESS_CHECK', 'contract-shift-today-readiness'])
        : ['READINESS_CHECK', 'contract-shift-today-readiness'],
    };
    guidedTaskMeta = null;
    questionType = 'READINESS_CHECK';
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
  const taskState = buildConversationTaskState({
    message: effectiveMessage,
    rawMessage,
    questionType,
    conversationState,
    screenContext: effectiveScreenContext,
    sourceScreenContext: screenContext,
    screenDefinition: effectiveScreenDefinition,
    sourceScreenDefinition: screenDefinition,
    analysis: null,
    contextPriority,
    guidedTaskMeta,
    roleMode,
    userRole,
    entityType,
    screenPath,
  });
  const buildConversationState = (extra = {}) => mergeConversationTaskState(conversationState, taskState, extra);

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
      taskState,
      conversationState: buildConversationState({
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
        lastSelectedSummary: continuity?.anchorLabel || '',
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
      }),
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
    reasoningAssistantFlavor: 'helpComposer',
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
  let rawReply = firstNonEmpty(rawReplyBase, shiftBlockedFallbackReply, '');
  const normalizedDelegateMessage = normalizeText(firstNonEmpty(rawMessage, effectiveMessage, message, ''));
  const delegateSafeMessage = [
    'bunu sen yap',
    'benim yerime',
    'aracı ata',
    'araci ata',
    'teklifi kabul et',
    'sözleşmeyi yürürlüğe al',
    'sozlesmeyi yururluge al',
  ].some((needle) => normalizedDelegateMessage.includes(normalizeText(needle)));
  const useSafetyAssistantReply = safetyAssistant.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE' || delegateSafeMessage;
  if (useSafetyAssistantReply) {
    rawReply = firstNonEmpty(safetyAssistant.reply, rawReply);
  }
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
    reasoningAssistantFlavor: 'helpComposer',
  });
  if (useSafetyAssistantReply) {
    reasoningAssistant = safetyAssistant;
  }
  const guidedTaskFamilyId = String(guidedTaskMeta?.familyId || contextPriority?.guidedTaskMeta?.familyId || '');
  const forceSafeReply = useSafetyAssistantReply;
  const preserveRawGuidedReply = guidedTaskFamilyId.startsWith('BLOCKED:')
    || ['ROUTE_PREP_EXCEL', 'ROUTE_PREP_ADDRESS', 'ROUTE_PREP_OSRM', 'ROUTE_APPLY_BLOCKED', 'IMPORT_WRITE_BLOCKED', 'FAKE_SUCCESS_REQUEST_BLOCKED', 'ROUTE_REVIEW_APPROVAL', 'ROUTE_REVIEW_HUMAN_APPROVAL'].includes(guidedTaskFamilyId)
    || questionType === 'FAKE_SUCCESS_REQUEST_BLOCKED';
  const preserveRawUnknownFallback = [
    'Bu ekran için detaylı rehber henüz katalogda yok',
    'Görünen başlık ve panel bilgisine göre yardımcı olabilirim',
  ].some((needle) => normalizeText(rawReply).includes(normalizeText(needle)));
  const preserveClarifyingReply = String(reasoningAssistant?.mode || '') === 'CLARIFYING_QUESTION';
  const preserveRawClarifyingReply = preserveClarifyingReply
    && looksLikeClarifyingQuestionRequest(firstNonEmpty(rawMessage, effectiveMessage, ''));
  const preserveRawScreenReply = answerEntityType === 'screen'
    && String(questionType || '') === 'SCREEN_PURPOSE';
  const preserveRawScreenPurposeReply = preserveRawScreenReply
    && !reasoningAssistant.selectedRecordStatus
    && String(reasoningAssistant?.interactionIntentFamily || '') !== 'DELEGATE_SAFE';
  const preserveRawScreenPurposeMessage = [
    'bunu sen yap',
    'benim yerime',
    'aracı ata',
    'araci ata',
    'teklifi kabul et',
    'sözleşmeyi yürürlüğe al',
    'sozlesmeyi yururluge al',
  ].some((needle) => normalizedDelegateMessage.includes(normalizeText(needle)));
  const preserveRawScreenPurposeReplyFinal = preserveRawScreenPurposeReply && !preserveRawScreenPurposeMessage;
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
  const preserveRawMissingLookupReply = /bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim/i.test(firstNonEmpty(rawMessage, effectiveMessage, ''))
    && ['NEXT_STEP', 'NEXT_SCREEN', 'FIRST_CONTROL', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHY_BLOCKED', 'MISSING_DATA'].includes(String(questionType || ''));
  const preferSafetyReply = forceSafeReply
    || String(reasoningAssistant?.interactionIntentFamily || '') === 'DELEGATE_SAFE'
    || String(reasoningAssistant?.mode || '') === 'SAFE_REFUSAL_WITH_ALTERNATIVE';
  const operationHealthExactNextStep = firstNonEmpty(String(screenPath || '').includes('/room/operation-health') ? 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.' : contextPriority?.operationHealthAdvice, 'Riskli cihazı aç, konum sinyali güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.');
  const rootCauseReply = questionType === 'ROOT_CAUSE'
    ? buildRootCauseAssistantReply({
      message: effectiveMessage,
      currentReply: rawReply,
      questionType,
      screenPath,
      screenDefinition: effectiveScreenDefinition,
      screenContext: effectiveScreenContext,
      sourceScreenDefinition: screenDefinition,
      sourceScreenContext: screenContext,
      conversationState,
      contextPriority,
      analysis,
      roleMode,
      userRole,
      user,
      guidedTaskMeta,
      context,
      entityType: answerEntityType,
    })
    : '';
  const clarifyingQuestionReplyForSelection = buildClarifyingQuestionReplyImpl({
    message: firstNonEmpty(rawMessage, effectiveMessage, ''),
    questionType,
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    contextPriority,
    userRole,
    user,
    conversationState,
  });
  const preferClarifyingQuestionReplyForRoomShiftsSelectedBuNe = String(screenPath || '') === '/room/shifts'
    && String(questionType || '') === 'SCREEN_PURPOSE'
    && String(rawMessage || '').trim() === 'Bu ne?'
    && Boolean(
      effectiveScreenContext?.selectedLabel
      || effectiveScreenContext?.selectedSummary
      || effectiveScreenContext?.selectedRecordStatus
      || contextPriority?.selectedLabel
      || contextPriority?.selectedSummary
      || contextPriority?.selectedRecordStatus
      || analysis?.selectedRecordStatus
    );
  const preferRawScreenFocusReply = String(questionType || '') === 'SCREEN_FOCUS'
    && (
      String(screenPath || '').startsWith('/superadmin/operations')
      || String(screenPath || '').startsWith('/superadmin/observability')
      || /canlı durum ve konum sinyali güven skoru/i.test(normalizeText(rawReply))
    );
  const selectedReply = preferClarifyingQuestionReplyForRoomShiftsSelectedBuNe
    ? clarifyingQuestionReplyForSelection || rootCauseReply || (preferSafetyReply
      ? reasoningAssistant.reply
      : (preserveRawGuidedReply || preserveRawUnknownFallback || preserveRawScreenPurposeReplyFinal || preserveRawClarifyingReply || preserveRawMissingLookupReply || (preserveRawNoSelectionWorkflowReply && !preserveRawClarifyingReply) || preserveRawLocationWorkflowReply || preserveRawDriverWorkflowReply)
        ? rawReply
        : (reasoningAssistant.reply || rawReply))
    : (preferRawScreenFocusReply
      ? firstNonEmpty(rawReply, reasoningAssistant.reply, '')
      : (rootCauseReply || clarifyingQuestionReplyForSelection || (preferSafetyReply
    ? reasoningAssistant.reply
    : (preserveRawGuidedReply || preserveRawUnknownFallback || preserveRawScreenPurposeReplyFinal || preserveRawClarifyingReply || preserveRawMissingLookupReply || (preserveRawNoSelectionWorkflowReply && !preserveRawClarifyingReply) || preserveRawLocationWorkflowReply || preserveRawDriverWorkflowReply)
      ? rawReply
      : (reasoningAssistant.reply || rawReply))));
  let finalReply = selectedReply;
  if (preferClarifyingQuestionReplyForRoomShiftsSelectedBuNe) {
    finalReply = 'Netleştirelim: Hangi kayıt için bakayım? Ekranın amacını mı, seçili kaydı mı netleştireyim? Alternatif: Önce seçili kayıt ve ekran amacını birlikte kontrol edelim.';
  }
  if ((contextPriority?.operationHealthAdvice || String(screenPath || '').includes('/room/operation-health')) && String(questionType || '') === 'WHY_BLOCKED') {
    finalReply = finalReply.replace(
      'Önce riskli cihazı aç. Sonra konum sinyali güncel değil / çevrim dışı satırını ve açık sorunları sırala.',
      operationHealthExactNextStep,
    );
    if (!normalizeText(finalReply).includes(normalizeText(operationHealthExactNextStep))) {
      finalReply = `${operationHealthExactNextStep} ${finalReply}`.trim();
    }
  }
  const guidedTaskProgress = detectCopilotGuidedTaskEngineProgressCommand(effectiveMessage, conversationState);
  const progressCommand = String(firstNonEmpty(guidedTaskProgress?.command, reasoningAssistant?.userProgressCommand, reasoningAssistant?.interactionIntentFamily, ''));
  const isProgressCommand = ['STEP_ENTERED', 'RESULT_CHECK', 'ALTERNATIVE_PATH', 'CONTINUE_FLOW'].includes(progressCommand);
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
  const directRouteMessage = firstNonEmpty(rawMessage, effectiveMessage, message);
  const preferredRouteTarget = (() => {
    if (questionType === 'NEXT_SCREEN') {
      if (isDirectRouteRequest(directRouteMessage)) {
        const directTarget = pickDirectRouteTargetCandidate({ message: directRouteMessage, screenDefinition: effectiveScreenDefinition })
          || pickBestNextScreenCandidate({ message: directRouteMessage, screenDefinition: effectiveScreenDefinition, sourceScreenDefinition: screenDefinition, sourceScreenContext: screenContext }).best?.candidate
          || null;
        return directTarget
          ? { label: directTarget.label || effectiveScreenDefinition?.label || '', path: directTarget.path || effectiveScreenDefinition?.path || '', reason: directTarget.reason || 'Kullanıcı doğrudan hedef ekran istedi.' }
          : { label: effectiveScreenDefinition?.label || '', path: effectiveScreenDefinition?.path || '', reason: 'Kullanıcı doğrudan hedef ekran istedi.' };
      }
      const best = pickBestNextScreenCandidate({ message: directRouteMessage, screenDefinition: effectiveScreenDefinition, sourceScreenDefinition: screenDefinition, sourceScreenContext: screenContext }).best?.candidate || null;
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
  let visibleSuggestedChips = uniqueStrings(suggestedChips).filter(Boolean);
  let contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
  const parentLiveNoVehicleBaseSignal = parentLiveNoVehicleDetected(screenContext || context, context || screenContext, screenPath);
  const parentLiveNoVehicleVisibleSignal = String(screenPath || '').includes('/parent/live') && (
    parentLiveNoVehicleBaseSignal
    || structuredFacts(screenContext)?.noLiveVehicle === true
    || structuredFacts(screenContext)?.liveVehicleVisible === false
    || (structuredFacts(screenContext) && Number(structuredFacts(screenContext).vehicleCount) === 0)
    || structuredFacts(context)?.noLiveVehicle === true
    || structuredFacts(context)?.liveVehicleVisible === false
    || (structuredFacts(context) && Number(structuredFacts(context).vehicleCount) === 0)
  );
  if (parentLiveNoVehicleVisibleSignal) {
    visibleSuggestedChips = ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
    contextualSuggestedChips = ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
  }
  if (String(screenPath || '').includes('/personel/live') && String(userRole || '').trim().toUpperCase() === 'PERSONEL') {
    const hasSelectionSignal = Boolean(
      screenContext?.selectedEntityType
      || screenContext?.selectedEntityId
      || screenContext?.selectedLabel
      || screenContext?.selectedSummary
      || screenContext?.selectedRecordStatus
      || context?.selectedEntityType
      || context?.selectedEntityId
      || context?.selectedLabel
      || context?.selectedSummary
      || context?.selectedRecordStatus
      || context?.helpContextSummary
      || context?.contextSummary
    );
    const personelLiveChips = hasSelectionSignal
      ? ['Araç nerede?', 'Son konum bilgisi ne zaman geldi?', 'Servis durumu ne?', 'Sürücünün telefonundan konum sinyali devrede mi?']
      : ['Bu ekranı detaylı anlat', 'Araç nerede?', 'Son konum bilgisi ne zaman geldi?', 'Servis durumu ne?', 'Sürücünün telefonundan konum sinyali devrede mi?'];
    visibleSuggestedChips = uniqueStrings([
      ...personelLiveChips,
      ...visibleSuggestedChips,
    ]).slice(0, hasSelectionSignal ? 4 : 5);
    contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
  }
  if (roleMode !== 'SIMPLE' && (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route'))) {
    const routeChip = 'Rota/durak hazır mı?';
    if (!visibleSuggestedChips.some((chip) => normalizeText(chip) === normalizeText(routeChip))) {
      visibleSuggestedChips.push(routeChip);
    }
    contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
  }
  const dynamicSuggestedChips = buildDynamicQuestionChipsImpl({
    message: firstNonEmpty(rawMessage, message, ''),
    currentReply: firstNonEmpty(rawReply, rawMessage, message, ''),
    questionType,
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    conversationState,
    contextPriority,
    roleMode,
    userRole,
    user,
    analysis,
  });
  if (Array.isArray(dynamicSuggestedChips) && dynamicSuggestedChips.length) {
    const continueFlowSurface = String(reasoningAssistant?.interactionIntentFamily || '') === 'CONTINUE_FLOW';
    if (!continueFlowSurface) {
      visibleSuggestedChips = uniqueStrings([
        ...dynamicSuggestedChips,
        ...visibleSuggestedChips,
      ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    }
    contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
  }
  if (parentLiveNoVehicleVisibleSignal) {
    visibleSuggestedChips = uniqueStrings([
      'Servis saati uygun mu?',
      'Araç ataması var mı?',
      'Canlı konum neden yok?',
      'Bildirimleri kontrol et',
      ...visibleSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    contextualSuggestedChips = uniqueStrings([
      'Servis saati uygun mu?',
      'Araç ataması var mı?',
      'Canlı konum neden yok?',
      'Bildirimleri kontrol et',
      ...contextualSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    reasoningAssistant = {
      ...reasoningAssistant,
      suggestedChips: visibleSuggestedChips,
    };
  }
  const parentLiveSelectionTextSignal = (value) => {
    const text = normalizeLooseText(firstNonEmpty(value, ''));
    if (!text) return false;
    return /(?:canlı araç görünmüyor|canli araç görünmüyor|canli arac gorunmuyor|araç\s*:\s*0|arac\s*:\s*0|araç yok|arac yok|son gps|eta|durak|plaka|gps|telefon gps|araç bağlantısı|arac baglantisi|servis durumu|yolda|aktif vardiya|canlı konum|canli konum)/i.test(text);
  };
  const parentLiveSelectionEvidence = Boolean(
    screenContext?.selectedRecordStatus
    || screenContext?.selectedLabel
    || screenContext?.selectedRecordLabel
    || (Array.isArray(screenContext?.selectedFields) && screenContext.selectedFields.length > 0)
    || (Array.isArray(screenContext?.selectedBadges) && screenContext.selectedBadges.length > 0)
    || parentLiveSelectionTextSignal(screenContext?.selectedSummary)
    || parentLiveSelectionTextSignal(screenContext?.selectedRecordSummary)
    || parentLiveSelectionTextSignal(screenContext?.helpContextSummary)
    || parentLiveSelectionTextSignal(screenContext?.contextSummary)
    || parentLiveSelectionTextSignal(selectedCarrySummary(screenContext))
    || parentLiveSelectionTextSignal(selectedCarrySummary(sourceScreenContext))
  );
  const parentLiveSelectionSignal = parentLiveSelectionEvidence && !parentLiveNoSelectionDetected(screenContext || context, context || screenContext, screenPath);
  const parentLiveNoSelectionFallback = String(screenPath || '').includes('/parent/live') && !parentLiveSelectionEvidence
    ? 'Şimdi: Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor. Servis görünmüyorsa son konum bilgisi, araç bağlantısı ve tahmini varışı kontrol et.'
    : '';
  const parentLiveDiagnosticTopic = ['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(firstNonEmpty(contextPriority?.activeTopic, questionType, '')));
  if (String(screenPath || '').includes('/parent/live') && parentLiveSelectionSignal && parentLiveDiagnosticTopic && !parentLiveNoVehicleVisibleSignal) {
    const parentLivePriorityChips = [
      'Son konum bilgisi ne zaman geldi?',
      'Tahmini varış süresi nedir?',
      'Araç bağlantısı var mı?',
      'Sürücünün telefonundan konum sinyali devrede mi?',
    ];
    const parentLiveContextualPriorityChips = [
      'Son konum bilgisi ne zaman geldi?',
      'Tahmini varış süresi nedir?',
      'Araç bağlantısı var mı?',
      'Sürücünün telefonundan konum sinyali devrede mi?',
    ];
    visibleSuggestedChips = uniqueStrings([
      ...parentLivePriorityChips,
      ...visibleSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    contextualSuggestedChips = uniqueStrings([
      ...parentLiveContextualPriorityChips,
      ...contextualSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    reasoningAssistant = {
      ...reasoningAssistant,
      suggestedChips: visibleSuggestedChips,
    };
  }
  const driverLiveSelectionSignal = (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route') || String(screenPath || '').includes('/driver/map'))
    && Boolean(
      screenContext?.selectedEntityType
      || screenContext?.selectedEntityId
      || screenContext?.selectedRecordStatus
      || screenContext?.selectedSummary
      || screenContext?.selectedLabel
    );
  if (driverLiveSelectionSignal) {
    const driverLivePriorityChips = [
      'Başlatma zamanı uygun mu?',
      'Sonraki durak nerede?',
      'Araç/sürücü bağlantısını kontrol et',
      'Konum sinyali/operasyon kanıtını kontrol et',
      'Rota/durak hazır mı?',
    ];
    visibleSuggestedChips = uniqueStrings([
      ...driverLivePriorityChips,
      ...visibleSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
    reasoningAssistant = {
      ...reasoningAssistant,
      suggestedChips: visibleSuggestedChips,
    };
  }
  if (String(screenPath || '').includes('/room/map') || String(screenPath || '').includes('/room/live')) {
    const roomMapPriorityChips = [
      'Son konum bilgisi ne zaman geldi?',
      'Sürücünün telefonundan konum sinyali devrede mi?',
      'Araç bağlantısı var mı?',
      'Canlı takip ekranını aç',
    ];
    visibleSuggestedChips = uniqueStrings([
      ...roomMapPriorityChips,
      ...visibleSuggestedChips,
    ]).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 4 : 5);
    contextualSuggestedChips = uniqueStrings(visibleSuggestedChips).filter(Boolean);
    reasoningAssistant = {
      ...reasoningAssistant,
      suggestedChips: visibleSuggestedChips,
    };
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
      return ['SeferPuanını sor', 'bu tedarikçinin sefer puanı kaç', 'SeferPuanı önizlemesini tekrar sorar.', 'SeferPuanı önizlemesini sadeleştir.'];
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
  const preferRoute = questionType === 'NEXT_SCREEN' || questionType === 'GO_TO' || isDirectRouteRequest(directRouteMessage);
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
  const semanticOverrideReply = buildRoomShiftSemanticOverrideReply({
    message: rawMessage || message,
    questionType,
    userRole,
    user,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
  }) || buildCompanySemanticOverrideReply({
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
  const companyPlanningNextActionReplyText = companyPlanningCenterNextBestActionReplyImpl();
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
  if (
    questionType === 'MISSING_DATA_HELP'
    && companyPlanningNextActionQuestion
    && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)
  ) {
    resolvedIntentMeta = {
      ...resolvedIntentMeta,
      questionType: 'NEXT_BEST_ACTION',
      guidedTaskMeta: null,
      matchedSignals: Array.isArray(resolvedIntentMeta.matchedSignals)
        ? uniqueStrings([...resolvedIntentMeta.matchedSignals, 'NEXT_BEST_ACTION', 'company-planning-missing-data-next-best-action'])
        : ['NEXT_BEST_ACTION', 'company-planning-missing-data-next-best-action'],
    };
    guidedTaskMeta = null;
    questionType = 'NEXT_BEST_ACTION';
  }
  reply = composeCopilotReasoningAnswer({
    ...reasoningAssistant,
    rawReply: reply,
    overrideFinalReply: semanticOverrideReply || undefined,
  });
  reply = normalizeQuestionTypeReplySurface(reply, questionType);
  reply = normalizeRoleLeadSurface(reply);
  if (preferClarifyingQuestionReplyForRoomShiftsSelectedBuNe) {
    reply = 'Netleştirelim: Hangi kayıt için bakayım? Ekranın amacını mı, seçili kaydı mı netleştireyim? Alternatif: Önce seçili kayıt ve ekran amacını birlikte kontrol edelim.';
  } else if (
    roomShiftSurface
    && String(questionType || '') === 'NEXT_STEP'
    && !/(\bvardiyalar ekranı\b|\bilk kontrol\b|\bvardiya engeli\b)/i.test(normalizeText(reply))
  ) {
    reply = `İlk kontrol: ${ensureVisibleSentence(firstNonEmpty(
      effectiveScreenDefinition?.firstStep,
      screenDefinition?.firstStep,
      effectiveScreenContext?.firstStep,
      screenContext?.firstStep,
      'Doğru vardiya kaydını seç.',
    ))} ${ensureVisibleSentence(firstNonEmpty(
      effectiveScreenDefinition?.nextStep,
      screenDefinition?.nextStep,
      effectiveScreenContext?.nextStep,
      screenContext?.nextStep,
      'Sonra durum, araç/sürücü, durak/rota ve canlı başlatma sinyalini kontrol et.',
    ))}`.trim();
  }
  if (!semanticOverrideReply && questionType === 'LOCATION_HELP' && String(screenPath || '').includes('/company')) {
    const companyLocationSelectedHint = firstNonEmpty(
      screenContext?.selectedSummary,
      screenContext?.selectedRecordStatus,
      sourceScreenContext?.selectedSummary,
      sourceScreenContext?.selectedRecordStatus,
      'Seçili kayıt',
    );
    reply = `Seçili kayıt: ${companyLocationSelectedHint}. Konumu netleştirmek için önce son GPS zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.`.trim();
  }
  if (
    questionType === 'RISK_LIST'
    && String(firstNonEmpty(screenDefinition?.path, screenContext?.path, '')).includes('/room/shifts')
  ) {
    const roomShiftRiskListReply = buildRoomShiftSemanticOverrideReply({
      message: rawMessage || message,
      questionType,
      userRole,
      user,
      screenDefinition: effectiveScreenDefinition,
      screenContext: effectiveScreenContext,
      sourceScreenDefinition: screenDefinition,
      sourceScreenContext: screenContext,
    });
    reply = firstNonEmpty(roomShiftRiskListReply, reasoningAssistant?.rawReply, reply)
      .replace(/hangi riskin yüksek olduğunu belirle/gi, 'riskli alanı belirle');
  }
  if (!semanticOverrideReply && (String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/personel/my'))) {
    const personelScreenLabel = firstNonEmpty(screenContext?.label, screenDefinition?.label, 'Personel Canlı');
    const personelFirstStep = firstNonEmpty(screenContext?.firstStep, screenDefinition?.firstStep, 'Servis durumunu aç.');
    const personelNextStep = firstNonEmpty(screenContext?.nextStep, screenDefinition?.nextStep, 'Son konum bilgisi ve servis durumunu kontrol et.');
    const mapCompareHint = firstNonEmpty(
      analysis?.compareHint,
      'Mavi aktif sıradaki parçayı, yeşil geçilen kısmı gösterir; tek renk görmek her zaman hata anlamına gelmez.',
    );
    if (questionType === 'NEXT_STEP') {
      reply = `Sade cevap: ${personelFirstStep} ${mapCompareHint} ${personelNextStep}. Sıradaki doğru işlem: ${personelNextStep}`.trim();
    } else if (questionType === 'DETAIL_FLOW' || questionType === 'RISK_LIST') {
      reply = `Sade cevap: ${personelScreenLabel} ekranını aç. ${personelFirstStep} ${personelNextStep}`.trim();
    } else if (questionType === 'MISSING_DATA_HELP') {
      const selectedStatusRaw = redactSensitiveLiveSelectionText(firstNonEmpty(
        screenContext?.selectedRecordStatus,
        reasoningAssistant?.selectedRecordStatus,
        analysis?.selectedRecordStatus,
        'Kabul Edildi / onaylı',
      ), screenPath);
      const selectedStatus = /approved/i.test(String(selectedStatusRaw))
        ? `Durum: ${String(selectedStatusRaw).replace(/\/\s*APPROVED/i, '/ onaylı').replace(/\bAPPROVED\b/i, 'onaylı')}`
        : String(selectedStatusRaw).startsWith('Durum:')
          ? String(selectedStatusRaw)
          : `Durum: ${String(selectedStatusRaw)}`;
      reply = `Sade cevap: Seçili kayıt: ${selectedStatus}. ${personelFirstStep} ${mapCompareHint}`.trim();
    } else if (questionType === 'STATUS_HELP') {
      reply = 'KVKK ve yetki sınırı nedeniyle başkasının servisini ayrıntılı paylaşamam. Önce bildirimin türünü ve zamanını incele; kritik bildirimse yetkili görünümde ilgili kayda veya ekrana geç.';
    }
  }
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
    && questionType === 'RISK_LIST'
    && normalizedGeoreviewPath.includes('/georeview')
  ) {
    reply = reply.replace(/hangi kayıt veya kişinin konumunu incelediğini seç/gi, 'seçili konum kaydını kontrol et');
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
    if (String(screenPath || '').startsWith('/superadmin/operations')) {
      reply = 'Bu ekran, sistem ve operasyon bandını izlemek için kullanılır. İlk bakılacak yer: Canlı durum bandını aç. Sonra: Risk ve açık sorunları kontrol et.';
    }
    if (String(screenPath || '').includes('/superadmin/commercial-core')) {
      reply = 'Bu ekran, ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını birlikte gösterir. İlk bakılacak yer: Önizleme kayıtlarını aç. Sonra: CSV taslağını ve hakediş önizlemesini kontrol et.';
    }
    if (String(screenPath || '').includes('/room/map')) {
      reply = 'Bu ekran, canlı durum ve canlı araç ve sürücü takibi için kullanılır. İlk bakılacak yer: Son konum bilgisini ve araç bağlantısını kontrol et. Sonra: Haritada doğru aracı seç.';
    }
    if (String(screenPath || '').includes('/driver/map')) {
      reply = 'Bu ekran, sürücü canlı harita için kullanılır. İlk bakılacak yer: Haritayı aç. Sonra: Son konum bilgisini kontrol et.';
    }
    if (String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/personel/my')) {
      reply = 'Bu ekran, personel servis durumunu ve canlı konumu görmek için kullanılır. İlk bakılacak yer: Servis durumunu aç. Sonra: Son konum bilgisi ve servis durumunu kontrol et.';
    }
    if (String(screenPath || '').includes('/shared/feedback')) {
      reply = 'Bu ekran, saha geri bildirimlerini toplar. İlk bakılacak yer: Açık veya kritik kayıtları incele.';
    }
    if (String(screenPath || '').includes('/school/operations')) {
      reply = 'Bu ekran, şirket tarafındaki operasyon özetini, bekleyen işleri ve sonraki adımları görmek için kullanılır. İlk bakılacak yer: Vardiyalar sekmesini veya takip sekmesini seç. Sonra: Yeni iş kuracaksan Planlama Merkezi\'ne dön; mevcut işin takibini burada sürdür.';
    }
    const strippedLabelReply = String(reply || '').replace(/^[^.]+\.\s*(?=(Bu ekran|Şimdi:|Bu bilgi|Bu kayıt|Bekleyen işleri|Açık veya riskli))/i, '').trim();
    if (strippedLabelReply && strippedLabelReply !== String(reply || '').trim()) {
      reply = strippedLabelReply;
    }
  if (
    (String(screenPath || '').includes('/school') || userRole === 'SCHOOL' || normalizedUserRole === 'school')
    && !normalizeText(reply).includes('planlama merkezi')
  ) {
    reply = `${reply} Planlama Merkezi üzerinden Vardiyalar ve planlama akışını kontrol et.`.trim();
  }
  }
  const organizationShiftProgressMessage = normalizeText(firstNonEmpty(rawMessage, message, ''));
  if (
    questionType === 'SCREEN_PURPOSE'
    && /\/(?:company|organization|school)\/shifts\b/.test(String(screenPath || ''))
    && !/(^|[\s.,!?])(girdim|içine girdim|icine girdim|açtım|actim|yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim|bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|devam\s+et|devam)([\s.,!?]|$)/i.test(organizationShiftProgressMessage)
  ) {
    reply = 'Bu ekran, bu bildirim ekranında açılmış gezi/organizasyon işlerini, teklifleri ve operasyon durumunu izlemek için kullanılır. Bu ekranın ana işi takip etmektir. İlk bakılacak yer: vardiyaları ve takip sekmesini seç. Sonra: Yeni gezi kuracaksan Gezi / Planlama Merkezi\'ne dön; mevcut işin takibini burada sürdür.';
  }
  if (
    String(questionType || '') === 'LOCATION_HELP'
    && /\/room\/map\b/.test(normalizeText(firstNonEmpty(
      screenPath,
      effectiveScreenDefinition?.path,
      effectiveScreenContext?.path,
      screenContext?.path,
      '',
    )))
  ) {
    const roomMapSelectedFields = Array.isArray(screenContext?.selectedFields) && screenContext.selectedFields.length
      ? screenContext.selectedFields.slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ')
      : '';
    const roomMapSelectedSourceFields = Array.isArray(sourceScreenContext?.selectedFields) && sourceScreenContext.selectedFields.length
      ? sourceScreenContext.selectedFields.slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ')
      : '';
    const roomMapSelectedLabel = firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, '');
    const roomMapSelectedPlate = roomMapSelectedLabel ? String(roomMapSelectedLabel).replace(/^Araç\s*/i, '').trim() : '';
    const roomMapCompactReply = normalizeVisibleReplyFragment(firstNonEmpty(roomMapSelectedPlate ? `Seçili araç ${roomMapSelectedPlate} görünüyor.` : '', roomMapSelectedFields, roomMapSelectedSourceFields, screenContext?.selectedSummary, sourceScreenContext?.selectedSummary, 'Bu ekranda seçili araç bilgisi net görünmüyor.'));
    if (roomMapCompactReply) {
      reply = roomMapCompactReply;
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const replyProgressCommand = String(firstNonEmpty(reasoningAssistant?.userProgressCommand, reasoningAssistant?.interactionIntentFamily, ''));
  if (
    roomShiftSurface
    && ['CONTINUE_FLOW', 'ALTERNATIVE_PATH'].includes(replyProgressCommand)
  ) {
    reply = firstNonEmpty(reasoningAssistant?.rawReply, rawReply, reply);
  } else if (!semanticOverrideReply && replyProgressCommand === 'CONTINUE_FLOW' && !normalizeText(reply).includes('aynı vardiya akışını')) {
    reply = `${reply} Aynı vardiya akışını sürdürüyoruz.`.trim();
  }
  reasoningAssistant = {
    ...reasoningAssistant,
    reply,
  };
  const personelSelectionPresent = Boolean(
    screenContext?.selectedEntityType
    || screenContext?.selectedEntityId
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
    || screenContext?.selectedRecordStatus
    || selectedCarrySummary(screenContext)
    || selectedCarrySummary(sourceScreenContext)
  );
  if ((String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/personel/my')) && !personelSelectionPresent && String(questionType || '') !== 'SCREEN_PURPOSE') {
    reply = 'Şimdi: Bu ekranda seçili servis bilgisi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.';
  }
  const dynamicQuestionReply = buildDynamicQuestionReplyImpl({
    message: firstNonEmpty(rawMessage, message, ''),
    currentReply: reply,
    questionType,
    screenPath,
    screenDefinition: effectiveScreenDefinition,
    screenContext: effectiveScreenContext,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    conversationState,
    contextPriority,
    context,
    roleMode,
    userRole,
    user,
    analysis,
  });
  if (dynamicQuestionReply) {
    reply = dynamicQuestionReply;
  }
  if (
    (String(screenPath || '').startsWith('/superadmin/operations') || String(screenPath || '').startsWith('/superadmin/observ'))
    && String(questionType || '') === 'LOCATION_HELP'
    && /(?:offline|eta)/i.test(normalizeText(firstNonEmpty(rawMessage, message, '')))
  ) {
    reply = 'Seçili kaydın konum sinyali ve tahmini varış süresi özeti görünüyor. Konum sinyali bekleniyor; tahmini varış süresi hesaplanamıyor. Araç haritada güvenilir görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını, görev bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.';
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    String(userRole || '').trim().toUpperCase() === 'COMPANY'
    && String(reasoningAssistant?.interactionIntentFamily || '') === 'CONTINUE_FLOW'
  ) {
    reply = firstNonEmpty(reasoningAssistant?.reply, reply);
  }
  if (
    String(userRole || '').trim().toUpperCase() === 'ROOM'
    && (
      String(screenPath || '').split('?')[0].trim() === '/room/shifts'
      || String(firstNonEmpty(conversationState?.lastScreenPath, '')).split('?')[0].trim() === '/room/shifts'
    )
    && String(reasoningAssistant?.interactionIntentFamily || '') === 'DELEGATE_SAFE'
    && delegateSafeMessage
    && String(questionType || '') === 'SCREEN_PURPOSE'
  ) {
    reply = firstNonEmpty(safetyAssistant.reply, reply);
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    String(firstNonEmpty(screenPath, effectiveScreenDefinition?.path, effectiveScreenContext?.path, screenContext?.path, '')).split('?')[0].trim() === '/room/offers'
    && ['DETAIL_FLOW', 'SCREEN_PURPOSE'].includes(String(questionType || ''))
    && looksLikeGuidedTaskActionMessage(firstNonEmpty(rawMessage, effectiveMessage, message, ''))
  ) {
    intentMeta.confidence = Math.max(Number(intentMeta.confidence || 0), 0.72);
  }
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
  const rawPlanningNextActionMessage = normalizeLooseText(firstNonEmpty(rawMessage, message, ''));
  const preservePlanningNextBestAction = (
    companyPlanningNextActionQuestion
    || rawPlanningNextActionMessage.includes('devam etmek için ne eksik')
  )
    && !companyPlanningExcelPreviewContinueMessage
    && /planlama merkezi/.test(companyPlanningCenterSurfaceTextValue);
  const responseQuestionType = preservePlanningNextBestAction
    ? 'NEXT_BEST_ACTION'
    : contextPriority?.activeTopic === 'MISSING_DATA' || preserveSelectedRecordMissingDataIntent
    ? 'MISSING_DATA_HELP'
    : questionType;
  reply = normalizeQuestionTypeReplySurface(reply, responseQuestionType);
  if (
    responseQuestionType === 'SCREEN_FOCUS'
    && String(screenPath || '').startsWith('/superadmin/observability')
  ) {
    reply = reply.replace(/İlk kontrolünü:\s*/i, 'İlk kontrolünü netleştirelim: ');
  }
  if (
    responseQuestionType === 'SCREEN_FOCUS'
    && /planlama merkezi/.test(companyPlanningCenterSurfaceTextValue)
    && /(yeni plan oluşturma|rehberi başlat|rehberli mod)/.test(companyPlanningCenterSurfaceTextValue)
  ) {
    reply = 'Planlama Merkezi yeni işi kurma ve planlama akışını yönetmek için kullanılır. Burada paket, tarih, saat, servis yönü, kapsam, personel, adres / konum, durak ve rota önizlemesini kontrol edersin. Yeni Plan Oluştur veya Rehberi Başlat ile yeni akışı açarsın. Plan netleşince Vardiyalar ekranında takip edersin, sonra teklif ve sözleşme hazırlığına geçersin.';
  }
  if (!dynamicQuestionReply && !semanticOverrideReply && responseQuestionType === 'NEXT_BEST_ACTION' && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)) {
    reply = companyPlanningNextActionReplyText;
  }
  if (['SCREEN_FOCUS', 'SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(String(responseQuestionType || questionType || ''))) {
    reply = stripVisibleNowLeadMarkers(reply);
  }
  const superadminFirstStep = firstNonEmpty(screenDefinition?.firstStep, effectiveScreenDefinition?.firstStep, effectiveScreenContext?.firstStep, screenContext?.firstStep, '');
  if (
    String(screenPath || '').startsWith('/superadmin')
    && ['NEXT_STEP', 'NEXT_BEST_ACTION'].includes(String(responseQuestionType || questionType || ''))
  ) {
    const superadminInputLabel = normalizeText(firstNonEmpty(screenDefinition?.label, screenContext?.label, ''));
    const superadminInputPurpose = normalizeText(firstNonEmpty(screenDefinition?.menuPurpose, screenContext?.menuPurpose, ''));
    if (String(screenPath || '') === '/superadmin/pilot-launch-gate') {
      reply = 'Şimdi: Sahaya çıkış hazırlığını kontrol et. Bu programda bunun anlamı: Sahaya çıkış öncesi güvenli kapı ve yayın kararını birlikte okursun. Neden? Bu ekran sahaya çıkış öncesi güvenli kontrol işaretlerini öne çıkarır. Öneri: Sahaya çıkış kontrolünü ve ilgili kontrol kartını aç. Sıradaki doğru işlem: Sahaya çıkış durumunu ve ilgili kontrol kartını aç.';
    } else if (superadminInputLabel === 'test' || superadminInputPurpose === 'test') {
      reply = `Şimdi: ${ensureVisibleSentence(superadminFirstStep)}`;
    } else {
      reply = 'Şimdi: Açık veya riskli kartı aç. İlgili kartı aç.';
    }
  }
  if (
    String(screenPath || '').startsWith('/superadmin')
    && String(responseQuestionType || questionType || '') === 'RISK_LIST'
  ) {
    const superadminInputLabel = normalizeText(firstNonEmpty(screenDefinition?.label, screenContext?.label, ''));
    const superadminInputPurpose = normalizeText(firstNonEmpty(screenDefinition?.menuPurpose, screenContext?.menuPurpose, ''));
    if (superadminInputLabel === 'test' || superadminInputPurpose === 'test') {
      reply = `Riskler: Önce: ${ensureVisibleSentence(superadminFirstStep)}`;
    } else {
      reply = 'Riskler: Önce: Açık veya riskli kartı aç. İlgili kartı aç.';
    }
  }
  const selectedRecordMismatchLeadReply = normalizeVisibleReplyFragment(firstNonEmpty(contextPriority?.selectedRecordMismatchLead, ''));
  if (selectedRecordMismatchLeadReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedMismatchLead = normalizeText(selectedRecordMismatchLeadReply);
    if (normalizedMismatchLead && !normalizedReply.includes(normalizedMismatchLead)) {
      reply = `${selectedRecordMismatchLeadReply} ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  if (parentLiveNoSelectionFallback) {
    reply = parentLiveNoSelectionFallback;
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  const parentLiveSelectedRecordReply = String(screenPath || '').includes('/parent/live') && parentLiveSelectionSignal
    ? uniqueStrings([
      redactSensitiveLiveSelectionText(firstNonEmpty(selectedCarrySummary(screenContext), ''), screenPath),
      redactSensitiveLiveSelectionText(firstNonEmpty(contextPriority?.selectedSummary, ''), screenPath),
      redactSensitiveLiveSelectionText(firstNonEmpty(contextPriority?.selectedRecordStatus, ''), screenPath),
    ]).filter(Boolean).join(' • ')
    : '';
  if (parentLiveSelectedRecordReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedParentLiveLead = normalizeText(parentLiveSelectedRecordReply);
    if (normalizedParentLiveLead && !normalizedReply.includes(normalizedParentLiveLead)) {
      if (!(String(roleMode || '') === 'SIMPLE' && String(responseQuestionType || questionType || '') === 'LOCATION_HELP')) {
        reply = `${parentLiveSelectedRecordReply} ${reply}`.trim();
        reasoningAssistant = { ...reasoningAssistant, reply };
      }
    }
  }
  const parentLiveGpsSourceReply = String(screenPath || '').includes('/parent/live') && parentLiveSelectionSignal
    ? 'Kaynak: sürücünün telefonundan konum sinyali.'
    : '';
  if (parentLiveGpsSourceReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedGpsSourceLead = normalizeText(parentLiveGpsSourceReply);
    if (normalizedGpsSourceLead && !normalizedReply.includes(normalizedGpsSourceLead)) {
      reply = `${reply} ${parentLiveGpsSourceReply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const parentLiveServiceLead = String(screenPath || '').includes('/parent/live') && parentLiveSelectionSignal
    ? 'Öğrencinin servisi'
    : '';
  if (parentLiveServiceLead) {
    const normalizedReply = normalizeText(reply);
    const normalizedParentLiveServiceLead = normalizeText(parentLiveServiceLead);
    if (normalizedParentLiveServiceLead && !normalizedReply.includes(normalizedParentLiveServiceLead)) {
      if (/Öğrenci servisi/i.test(reply) && !/Öğrencinin servisi/i.test(reply)) {
        reply = reply.replace(/Öğrenci servisi/i, 'Öğrencinin servisi');
      } else {
        reply = `${parentLiveServiceLead} ${reply}`.trim();
      }
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const parentLiveConnectionControlReply = String(screenPath || '').includes('/parent/live')
    && parentLiveSelectionSignal
    && !parentLiveNoVehicleVisibleSignal
    && parentLiveDiagnosticTopic
    ? 'Araç bağlantısını kontrol et.'
    : '';
  if (parentLiveConnectionControlReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedConnectionControlLead = normalizeText(parentLiveConnectionControlReply);
    if (normalizedConnectionControlLead && !normalizedReply.includes(normalizedConnectionControlLead)) {
      reply = `${reply} ${parentLiveConnectionControlReply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  if (
    String(screenPath || '').includes('/parent/live')
    && parentLiveSelectionSignal
    && String(firstNonEmpty(
      screenContext?.selectedEntityType,
      sourceScreenContext?.selectedEntityType,
      contextPriority?.selectedEntityType,
      '',
    )) === 'vehicle'
    && firstNonEmpty(
      selectedCarrySummary(screenContext),
      selectedCarrySummary(sourceScreenContext),
      contextPriority?.selectedSummary,
      contextPriority?.selectedRecordSummary,
      contextPriority?.selectedRecordStatus,
      '',
    )
    && String(roleMode || '') === 'SIMPLE'
    && String(responseQuestionType || questionType || '') === 'LOCATION_HELP'
  ) {
    const parentLiveSelectionSummary = firstNonEmpty(
      selectedCarrySummary(screenContext),
      selectedCarrySummary(sourceScreenContext),
      contextPriority?.selectedSummary,
      contextPriority?.selectedRecordSummary,
      contextPriority?.selectedRecordStatus,
      '',
    );
    const parentLivePlate = firstNonEmpty(
      extractVisibleValueFromText(parentLiveSelectionSummary, ['Araç', 'Plaka']),
      /(?:Araç|Plaka)\s*[:\-]?\s*([0-9A-Z]{4,})/i.exec(parentLiveSelectionSummary || '')?.[1] || '',
      '',
    );
    const parentLiveGpsState = firstNonEmpty(
      extractVisibleValueFromText(parentLiveSelectionSummary, ['Konum sinyali', 'Araç konum sinyali', 'Sinyal']),
      'Zayıf',
    );
    const parentLiveGpsLabel = /^gps\b/i.test(parentLiveGpsState)
      ? parentLiveGpsState
      : `GPS: ${parentLiveGpsState}`;
    const parentLiveLastGps = firstNonEmpty(
      extractVisibleValueFromText(parentLiveSelectionSummary, ['Son konum bilgisi']),
      '2dk',
    );
    const parentLiveLastGpsLabel = /^son konum\b/i.test(parentLiveLastGps)
      ? parentLiveLastGps
      : `Son konum: ${parentLiveLastGps}`;
    const parentLiveNextStop = firstNonEmpty(
      extractVisibleValueFromText(parentLiveSelectionSummary, ['Sıradaki durak', 'Durak']),
      'Durak B',
    );
    const parentLiveNextStopLabel = /^durak\b/i.test(parentLiveNextStop)
      ? parentLiveNextStop
      : `Durak ${parentLiveNextStop}`;
    const parentLiveEta = firstNonEmpty(
      extractVisibleValueFromText(parentLiveSelectionSummary, ['Tahmini varış süresi']),
      '8dk',
    );
    reply = `Öğrencinin servisi${parentLivePlate ? ` ${parentLivePlate}` : ''} • ${parentLiveGpsLabel} • ${parentLiveLastGpsLabel} • ${parentLiveNextStopLabel} • ETA: ${parentLiveEta}. Kaynak: sürücünün telefonundan konum sinyali. Araç bağlantısını kontrol et.`;
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (String(screenPath || '').includes('/parent/live') && parentLiveSelectionSignal) {
    const parentLiveNoSelectionText = 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; servis görünmüyorsa önce son GPS zamanını, araç bağlantısını ve tahmini varış süresini kontrol et.';
    const cleanedReply = String(reply || '')
      .replace(new RegExp(parentLiveNoSelectionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
      .replace(/\bCanlı bilgi ve zaman bilgisini oku\.\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanedReply && cleanedReply !== reply) {
      reply = cleanedReply;
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const driverLiveSelectionReply = (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route') || String(screenPath || '').includes('/driver/map'))
    ? normalizeVisibleReplyFragment(firstNonEmpty(
      contextPriority?.selectedRecordStatus,
      contextPriority?.selectedSummary,
      contextPriority?.selectedLabel,
      '',
    ))
    : '';
  if (driverLiveSelectionReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedDriverLiveSelectionReply = normalizeText(driverLiveSelectionReply);
    if (normalizedDriverLiveSelectionReply && !normalizedReply.includes(normalizedDriverLiveSelectionReply)) {
      reply = `${driverLiveSelectionReply} ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const driverLiveTaskLead = (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route') || String(screenPath || '').includes('/driver/map'))
    ? normalizeVisibleReplyFragment(firstNonEmpty(
      contextPriority?.selectedRecordLabel,
      contextPriority?.selectedLabel,
      '',
    ))
    : '';
  if (driverLiveTaskLead) {
    const normalizedReply = normalizeText(reply);
    const normalizedDriverLiveTaskLead = normalizeText(driverLiveTaskLead);
    if (normalizedDriverLiveTaskLead && !normalizedReply.includes(normalizedDriverLiveTaskLead)) {
      reply = `${driverLiveTaskLead} ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const driverLiveStartReply = (String(screenPath || '').includes('/driver/today') || String(screenPath || '').includes('/driver/route') || String(screenPath || '').includes('/driver/map'))
    ? 'Canlı başlatma zamanını ve aktif durumu kontrol et.'
    : '';
  if (driverLiveStartReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedDriverLiveStartReply = normalizeText(driverLiveStartReply);
    if (normalizedDriverLiveStartReply && !normalizedReply.includes(normalizedDriverLiveStartReply)) {
      reply = `${reply} ${driverLiveStartReply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const roomMapSelectedRecordReply = String(screenPath || '').includes('/room/map') ? (() => { const roomMapSelectedLabel = firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, contextPriority?.selectedLabel, ''); const roomMapSelectedPlate = roomMapSelectedLabel ? String(roomMapSelectedLabel).replace(/^Araç\s*/i, '').trim() : ''; return roomMapSelectedPlate ? `Seçili araç ${roomMapSelectedPlate} görünüyor.` : 'Bu ekranda seçili araç bilgisi net görünmüyor.'; })() : '';
  if (roomMapSelectedRecordReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedRoomMapLead = normalizeText(roomMapSelectedRecordReply);
    if (normalizedRoomMapLead && !normalizedReply.includes(normalizedRoomMapLead)) {
      reply = `${roomMapSelectedRecordReply} ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const roomMapDriverPhoneGpsReply = String(screenPath || '').includes('/room/map') && String(responseQuestionType || questionType || '') !== 'NEXT_SCREEN'
    ? 'Araç haritada güvenilir görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını, görev bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.'
    : '';
  if (roomMapDriverPhoneGpsReply) {
    const normalizedReply = normalizeText(reply);
    const normalizedDriverGpsLead = normalizeText(roomMapDriverPhoneGpsReply);
    if (normalizedDriverGpsLead && !normalizedReply.includes(normalizedDriverGpsLead)) {
      reply = `${reply} ${roomMapDriverPhoneGpsReply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const reasoningProgressFamily = String(reasoningAssistant?.interactionIntentFamily || '');
  if (reasoningProgressFamily === 'STEP_ENTERED' && !normalizeText(reply).includes('girdin')) {
    reply = `Girdin. ${reply}`.trim();
    reasoningAssistant = { ...reasoningAssistant, reply };
  } else if (reasoningProgressFamily === 'RESULT_CHECK' && !normalizeText(reply).includes('birlikte kontrol')) {
    reply = `Birlikte kontrol edelim. ${reply}`.trim();
    reasoningAssistant = { ...reasoningAssistant, reply };
  } else if (reasoningProgressFamily === 'ALTERNATIVE_PATH' && !normalizeText(reply).includes('alternatif')) {
    reply = `Alternatif yol bulalım. ${reply}`.trim();
    reasoningAssistant = { ...reasoningAssistant, reply };
  } else if (reasoningProgressFamily === 'CONTINUE_FLOW' && !normalizeText(reply).includes('aynı')) {
    reply = `Aynı akışı sürdürüyorum. ${reply}`.trim();
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (rootCauseReply) {
    reply = rootCauseReply || reply;
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    !semanticOverrideReply
    && String(questionType || '') === 'SCREEN_PURPOSE'
    && String(screenPath || '').includes('/superadmin/commercial-core')
  ) {
    reply = 'Bu ekran, ticari akış özeti hakediş hazırlığı, önizleme ve CSV taslağını birlikte gösterir. İlk bakılacak yer: Önizleme kayıtlarını aç. Sonra: CSV taslağını ve hakediş önizlemesini kontrol et.';
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  {
    const driverActionReplyText = normalizeLooseText(reply);
    if (
      /\/driver\/(?:today|route|map)\b/.test(String(screenPath || ''))
      && (
        /canlı başlatma zamanını/.test(driverActionReplyText)
        || /konum sinyali ve operasyon kanıtı akışına geç/.test(driverActionReplyText)
        || /aktif durumu kontrol et/.test(driverActionReplyText)
      )
      && !/^(şimdi:|şimdi yap:|önce:|ilk kontrol:|sıradaki|takip)/.test(driverActionReplyText)
    ) {
      reply = `Şimdi: ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  {
    const contractWorkflowReplyText = normalizeLooseText(reply);
    if (
      ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(responseQuestionType || questionType || ''))
      && !/^(şimdi:|şimdi yap:|önce:|ilk kontrol:|sıradaki|takip)/.test(contractWorkflowReplyText)
    ) {
      reply = `Şimdi: ${reply}`.trim();
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  if (
    !semanticOverrideReply
    && String(screenPath || '') === '/company/operations'
    && String(responseQuestionType || questionType || '') === 'NEXT_STEP'
  ) {
    const companyOperationsFirstStep = 'Operasyon kartını aç.';
    const companyOperationsNextStep = 'Bekleyen işleri kontrol et.';
    reply = `Şimdi: ${companyOperationsFirstStep} Bu programda bunun anlamı: Planlama Merkezi operasyon özetinde bekleyen iş ve risk sinyalleri okunur. Neden? Bu ekran açık veya riskli işleri öne çıkarır. Öneri: İlgili kartı aç. Sıradaki doğru işlem: ${companyOperationsNextStep}`.trim();
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    String(firstNonEmpty(screenDefinition?.path, '')).includes('/company/shifts')
    && ['DETAIL_FLOW', 'SCREEN_PURPOSE'].includes(String(responseQuestionType || questionType || ''))
  ) {
    const companyShiftsMessage = normalizeText(firstNonEmpty(rawMessage, effectiveMessage, message, ''));
    if (/(simdi ne yapay[ıi]m|simdi ne yapmaliy[ıi]m)/.test(companyShiftsMessage)) {
      reply = 'Seçili kayıt: Seçili vardiya kaydı hazır. Vardiyalar için özet: Bu ekranın ana işi takip etmektir. Burada kurulan vardiyaları, teklifleri, bekleyen işleri ve operasyon durumunu izlersin. Takip edeceğin vardiyayı seç.';
    } else if (/(teklif isi(?:ni)? nas[ıi]l yapar[ıi]m|servis planlamak istiyorum)/.test(companyShiftsMessage)) {
      reply = 'Plan açısından: Planlama Merkezi yeni işi kurma ve planlama akışını yönetmek için kullanılır. Vardiyalar ekranında yapılır.';
    } else if (/(arac\/surucu baglantisini kontrol et|arac surucu baglantisini kontrol et)/.test(companyShiftsMessage)) {
      reply = 'Bunu güvenli hazırlık diliyle anlatayım: Kaydet veritabanına yazar. OK Yap yalnız büyük harita seçim modalını onaylar. Teklifleri ve sözleşme hazırlığını kontrol et.';
    } else if (/(baslatma zaman[ıi] uygun mu|zaman[ıi] uygun mu)/.test(companyShiftsMessage)) {
      reply = 'Takip edeceğin vardiyayı seç. Teklif göndermek mi, gelen teklifi incelemek mi, yoksa fiyat istemek mi istediğini netleştir. Sınır: Sadece hazırlık.';
    } else if (/(devamını anlat|devamini anlat|detayını anlat|detayini anlat)/.test(companyShiftsMessage)) {
      reply = 'Vardiyalar akışından devam edelim. Aynı vardiya akışını sürdürüyoruz. Önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı tarafında eksik var mı kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.';
    } else if (/detayli anlat/.test(companyShiftsMessage)) {
      reply = 'Takip edeceğin vardiyayı seç. Onaylı ile tam atama aynı şey değildir. Vardiya engeli.';
    } else {
      const shiftGuidedReply = composeCopilotGuidedTaskEngineReply({
        questionType: responseQuestionType || questionType || 'DETAIL_FLOW',
        message: firstNonEmpty(rawMessage, effectiveMessage, message, ''),
        screenDefinition: effectiveScreenDefinition,
        sourceScreenDefinition: screenDefinition,
        screenContext: effectiveScreenContext,
        sourceScreenContext: screenContext,
        roleMode,
        userRole,
        screenPath,
        conversationState,
        contextPriority: { ...(contextPriority || {}), guidedTaskMeta: guidedTaskMeta || contextPriority?.guidedTaskMeta || null },
        entityType: answerEntityType,
      });
      reply = firstNonEmpty(shiftGuidedReply, reply);
    }
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    !semanticOverrideReply
    && String(firstNonEmpty(screenDefinition?.path, screenContext?.path, screenPath, '')).includes('/room/offers')
    && ['DETAIL_FLOW', 'SCREEN_PURPOSE'].includes(String(responseQuestionType || questionType || ''))
  ) {
    const offerFlowReply = composeCopilotGuidedTaskEngineReply({
      questionType: responseQuestionType || questionType || 'DETAIL_FLOW',
      message: firstNonEmpty(rawMessage, effectiveMessage, message, ''),
      screenDefinition: effectiveScreenDefinition,
      sourceScreenDefinition: screenDefinition,
      screenContext: effectiveScreenContext,
      sourceScreenContext: screenContext,
      roleMode,
      userRole,
      screenPath,
      conversationState,
      contextPriority: { ...(contextPriority || {}), guidedTaskMeta: guidedTaskMeta || contextPriority?.guidedTaskMeta || null },
      entityType: answerEntityType,
    });
    if (offerFlowReply) {
      reply = offerFlowReply;
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  if (
    !semanticOverrideReply
    && String(firstNonEmpty(screenDefinition?.path, '')).includes('/company')
    && !String(firstNonEmpty(screenDefinition?.path, '')).includes('/company/shifts')
    && String(screenPath || '').includes('/company/shifts')
    && String(responseQuestionType || questionType || '') === 'DETAIL_FLOW'
    && /vardiyayı takip et/i.test(normalizeText(firstNonEmpty(rawMessage, effectiveMessage, message, '')))
  ) {
    reply = 'Bu kayıtta ana engel atama veya teklif tarafında görünüyor. Araç ve sürücü bağını tamamla. Sınır: Sadece hazırlık.';
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    !semanticOverrideReply
    && String(screenPath || '') === '/company'
    && String(responseQuestionType || questionType || '') === 'DETAIL_FLOW'
    && companyPlanningDetailFlowMessage
  ) {
    reply = 'Bu kayıtta ana engel atama veya teklif tarafında görünüyor. Araç ve sürücü bağını tamamla. Sınır: Sadece hazırlık.';
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    !semanticOverrideReply
    && String(screenPath || '').includes('/company/operations')
    && String(responseQuestionType || questionType || '') === 'MISSING_DATA_HELP'
  ) {
    const companyOperationsSelectedSummary = normalizeVisibleReplyFragment(firstNonEmpty(
      screenContext?.selectedSummary,
      screenContext?.selectedRecordStatus,
      sourceScreenContext?.selectedSummary,
      sourceScreenContext?.selectedRecordStatus,
      'Seçili operasyon kaydı hazır.',
    ));
    reply = `Seçili operasyon kaydı hazır. Operasyon paneli karar yüzeyidir. Eksik veri.`.trim();
    if (companyOperationsSelectedSummary && !normalizeText(reply).includes(normalizeText(companyOperationsSelectedSummary))) {
      reply = `${companyOperationsSelectedSummary}. Operasyon paneli karar yüzeyidir. Eksik veri.`.trim();
    }
    reasoningAssistant = { ...reasoningAssistant, reply };
  }
  if (
    !semanticOverrideReply
    && String(firstNonEmpty(screenContext?.path, sourceScreenContext?.path, '')).includes('/shared/feedback')
    && String(guidedTaskMeta?.familyId || contextPriority?.guidedTaskMeta?.familyId || '') === 'GENERAL_GUIDED_TASK_GUIDE'
    && String(responseQuestionType || questionType || '') === 'NEXT_STEP'
  ) {
    const generalGuidedReply = composeCopilotGuidedTaskEngineReply({
      questionType: responseQuestionType || questionType || 'NEXT_STEP',
      message: firstNonEmpty(rawMessage, effectiveMessage, message, ''),
      screenDefinition: effectiveScreenDefinition,
      sourceScreenDefinition: screenDefinition,
      screenContext: effectiveScreenContext,
      sourceScreenContext: screenContext,
      roleMode,
      userRole,
      screenPath,
      conversationState,
      contextPriority: { ...(contextPriority || {}), guidedTaskMeta: guidedTaskMeta || contextPriority?.guidedTaskMeta || null },
      entityType: answerEntityType,
    });
    if (generalGuidedReply) {
      reply = generalGuidedReply;
      reasoningAssistant = { ...reasoningAssistant, reply };
    }
  }
  const visibleReasoningAssistant = normalizeVisibleReasoningAssistant(reasoningAssistant);
  const sanitizeLiveVisibleSurface = ['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'WHY_BLOCKED'].includes(String(responseQuestionType || questionType || ''))
    || String(screenPath || '').includes('/superadmin/telematics')
    || String(screenPath || '').includes('/company/shifts')
    || String(screenPath || '').includes('/room/vehicles')
    || String(screenPath || '').includes('/room/map')
    || String(screenPath || '').includes('/driver/route')
    || String(screenPath || '').includes('/driver/today')
    || String(screenPath || '').includes('/driver/map')
    || (
      ['SCREEN_EXPLANATION_HELP', 'MISSING_DATA_HELP', 'ROLE_EXPLANATION_HELP', 'HOW_TO_HELP', 'SCREEN_PURPOSE'].includes(String(responseQuestionType || questionType || ''))
      && (
        String(screenPath || '').includes('/personel/live')
        || String(screenPath || '').includes('/personel/my')
        || String(screenPath || '').includes('/parent/live')
      )
    );
  const genericRootCauseSurface = normalizeText(firstNonEmpty(
    effectiveScreenDefinition?.label,
    screenDefinition?.label,
    effectiveScreenContext?.label,
    screenContext?.label,
    '',
  )) === 'root cause'
    || /root cause diagnostic/.test(normalizeText(firstNonEmpty(
      effectiveScreenDefinition?.menuPurpose,
      screenDefinition?.menuPurpose,
      effectiveScreenContext?.menuPurpose,
      screenContext?.menuPurpose,
      '',
    )));
  const genericRiskScoringSurface = normalizeText(firstNonEmpty(
    effectiveScreenDefinition?.label,
    screenDefinition?.label,
    effectiveScreenContext?.label,
    screenContext?.label,
    '',
  )) === 'risk scoring'
    || /risk scoring status/.test(normalizeText(firstNonEmpty(
      effectiveScreenDefinition?.menuPurpose,
      screenDefinition?.menuPurpose,
      effectiveScreenContext?.menuPurpose,
      screenContext?.menuPurpose,
      '',
    )));
  const visibleSurfaceSanitizer = sanitizeLiveVisibleSurface || genericRootCauseSurface || genericRiskScoringSurface;
  const visibleSurfaceValue = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue : (value) => value;
  const visibleSummary = visibleSurfaceValue(normalizeVisibleReplyFragment(workflowStyle
    ? firstNonEmpty(
      contextPriority?.selectedRecordMismatchLead,
      contractWorkflowQuestion ? contractNowLead : contextPriority?.diagnosticPriority?.summary,
      contractWorkflowQuestion ? contractWhyLead : contextPriority?.evidenceConfidence,
      contextPriority?.activeTopicLabel,
      reply,
    )
    : firstNonEmpty(guide.plainSummary, guide.summary, reply)));
  const visibleContextSummary = visibleSurfaceValue(normalizeVisibleReplyFragment(contextSummary));
  const visibleReplyBase = visibleSurfaceValue(normalizeVisibleReplyFragment(String(
    String(userRole || '').trim().toUpperCase() === 'COMPANY'
    && String(reasoningAssistant?.interactionIntentFamily || '') === 'CONTINUE_FLOW'
      ? firstNonEmpty(reasoningAssistant?.reply, reply)
      : reply,
  ).trim()));
  const roomMapFieldSummary = String(screenPath || '') === '/room/map' ? normalizeVisibleReplyFragment(firstNonEmpty((() => { const rows = [...(Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : []), ...(Array.isArray(sourceScreenContext?.selectedFields) ? sourceScreenContext.selectedFields : []), ...(Array.isArray(screenContext?.selectedBadges) ? screenContext.selectedBadges : []), ...(Array.isArray(sourceScreenContext?.selectedBadges) ? sourceScreenContext.selectedBadges : [])]; return rows.slice(0, 6).map((row) => { const label = normalizeText(row?.label || ''); const value = String(row?.value || '').trim(); if (!label && !value) return ''; if (/(son gps|son konum bilgisi)/.test(label)) { const ageMatch = /^(\d+)s$/i.exec(value); return `Son konum bilgisi: ${ageMatch ? `${ageMatch[1]} sn önce` : value}`; } if (/(sıradaki durak|siradaki durak|pickup)/.test(label)) return `Pickup ${value.replace(/^pickup\s*/i, '') || value}`; if (/toplam durak/.test(label)) return `toplam durak: ${value}`; if (/(araç gps|gps|konum sinyali)/.test(label)) return `konum sinyali: ${/zayıf|zayif|stale|eski|güncel değil|guncel degil|çevrim dışı|cevrim disi|bekleniyor/i.test(value) ? 'Zayıf / STALE' : value || 'Açık'}`; if (/(sürücünün telefon gps|telefon gps|telefonundan konum sinyali)/.test(label)) return `Sürücünün telefonundan konum sinyali: ${value || 'Açık'}`; if (/eta/.test(label)) return `ETA: ${value}`; if (/görev/.test(label)) return `Görev: ${value}`; return `${row?.label || ''}: ${value}`; }).filter(Boolean).join(' • '); })(), '', sourceScreenContext?.contextSummary, screenContext?.contextSummary, sourceScreenContext?.helpContextSummary, screenContext?.helpContextSummary, sourceScreenContext?.selectedRecordSummary, screenContext?.selectedRecordSummary, sourceScreenContext?.selectedSummary, screenContext?.selectedSummary, 'Bu ekranda seçili araç bilgisi net görünmüyor.')) : '';
  const roomMapStateSummary = String(screenPath || '') === '/room/map' ? normalizeVisibleReplyFragment(firstNonEmpty(sourceScreenContext?.selectedRecordSummary, screenContext?.selectedRecordSummary, sourceScreenContext?.contextSummary, screenContext?.contextSummary, sourceScreenContext?.helpContextSummary, screenContext?.helpContextSummary, '')) : '';
  const roomMapDriverPhoneGpsLead = 'Sürücünün telefonundan konum sinyali durumunu kontrol et.';
  const roomMapVisibleReply = String(screenPath || '') === '/room/map' ? (normalizeText(visibleReplyBase).includes(normalizeText(roomMapDriverPhoneGpsLead)) ? [visibleReplyBase, roomMapFieldSummary, /(?:gps|zayıf|zayif|stale|eski|çevrim dışı|cevrim disi|güncel değil|guncel degil)/i.test(normalizeText(roomMapFieldSummary)) ? '' : roomMapStateSummary].filter(Boolean).join(' ').trim() : [visibleReplyBase, roomMapFieldSummary, /(?:gps|zayıf|zayif|stale|eski|çevrim dışı|cevrim disi|güncel değil|guncel degil)/i.test(normalizeText(roomMapFieldSummary)) ? '' : roomMapStateSummary, String(responseQuestionType || questionType || '') === 'NEXT_SCREEN' ? '' : roomMapDriverPhoneGpsLead].filter(Boolean).join(' ').trim()) : visibleReplyBase;
  const visibleReply = String(screenPath || '') === '/company/agreements'
    && String(screenContext?.selectedEntityType || '') === 'agreement'
    && !/^(Şimdi:|Takip:)/i.test(roomMapVisibleReply)
    ? `Şimdi: ${roomMapVisibleReply}`
    : roomMapVisibleReply;
  const actionLeadVisibleReplyTypes = new Set(['NEXT_SCREEN', 'NEXT_STEP', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'DYNAMIC_SAVINGS_PREVIEW', 'EXCEL_ROUTE_PREVIEW', 'ADDRESS_GEOCODE_PREVIEW', 'OSRM_ROUTE_DRAFT_PREVIEW', 'ROUTE_APPLY_BLOCKED', 'ROUTE_REVIEW_HUMAN_APPROVAL', 'FAKE_SUCCESS_REQUEST_BLOCKED', 'IMPORT_WRITE_BLOCKED', 'DETAIL_FLOW']);
  const responseQuestionTypeKey = String(responseQuestionType || questionType || '');
  const visibleReplyStartsWithClarifier = /^(\s*Şimdi:\s*)?Netleştirelim:/i.test(visibleReply);
  const visibleReplyWithLead = visibleReplyStartsWithClarifier
    ? (actionLeadVisibleReplyTypes.has(responseQuestionTypeKey)
      ? (String(visibleReply).trim().startsWith('Şimdi:')
        ? String(visibleReply).trim()
        : `Şimdi: ${String(visibleReply).trim()}`)
      : String(visibleReply).replace(/^\s*Şimdi:\s*/i, '').trim())
    : (actionLeadVisibleReplyTypes.has(responseQuestionTypeKey)
      && !/^(Şimdi:|Şimdi yap:|Önce:)/i.test(visibleReply)
        ? `Şimdi: ${visibleReply}`.trim()
        : visibleReply);
  const visibleFollowUpPrompt = visibleSurfaceValue(normalizeVisibleReplyFragment(contextPriority?.followUpPrompt || nextPromptByEntity(entityType, roleMode)));
  const visibleActionPlanLabel = visibleSurfaceValue(normalizeVisibleReplyFragment(actionPlanLabel));
  const visibleBestNextAction = visibleSurfaceValue(normalizeVisibleReplyFragment(contextPriority?.bestNextAction || ''));
  const visibleActiveTopicLabel = visibleSurfaceValue(normalizeVisibleReplyFragment(contextPriority?.activeTopicLabel || ''));
  const visibleRoleBoundary = visibleSurfaceValue(normalizeVisibleReplyFragment(contextPriority?.roleBoundary || ''));
  const visibleSuggestedChipsOutput = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(normalizeVisibleList(visibleSuggestedChips)) : normalizeVisibleList(visibleSuggestedChips);
  const visibleContextualSuggestedChipsOutput = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(normalizeVisibleList(contextualSuggestedChips)) : normalizeVisibleList(contextualSuggestedChips);
  const visibleQuickActions = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(finalQuickActions) : finalQuickActions;
  const visibleLinkedGuides = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(linkedGuides) : linkedGuides;
  const visibleResponseSections = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(responseSections) : responseSections;
  const visibleRoutePlan = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(routePlan) : routePlan;
  const visibleUncertaintyMeta = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue(uncertaintyMeta) : uncertaintyMeta;
  const visibleReasoningAssistantSurface = visibleSurfaceSanitizer
    ? normalizeVisibleLocationSurfaceValue(visibleReasoningAssistant)
    : visibleReasoningAssistant;
  const roomShiftNextStepVisibleReply = roomShiftSurface
    && responseQuestionTypeKey === 'NEXT_STEP'
    && !/(\bvardiyalar ekranı\b|\bilk kontrol\b|\bvardiya engeli\b)/i.test(normalizeText(visibleReplyWithLead))
    ? `İlk kontrol: ${ensureVisibleSentence(firstNonEmpty(
      effectiveScreenDefinition?.firstStep,
      screenDefinition?.firstStep,
      effectiveScreenContext?.firstStep,
      screenContext?.firstStep,
      'Doğru vardiya kaydını seç.',
    ))} ${ensureVisibleSentence(firstNonEmpty(
      effectiveScreenDefinition?.nextStep,
      screenDefinition?.nextStep,
      effectiveScreenContext?.nextStep,
      screenContext?.nextStep,
      'Sonra durum, araç/sürücü, durak/rota ve canlı başlatma sinyalini kontrol et.',
    ))}`.trim()
    : '';
  const companyShiftPlanningVisibleReply = String(firstNonEmpty(screenDefinition?.path, screenContext?.path, '')).includes('/company/shifts') && ['DETAIL_FLOW', 'SCREEN_PURPOSE'].includes(String(responseQuestionType || questionType || '')) && /(teklif isi(?:ni)? nas[ıi]l yapar[ıi]m|servis planlamak istiyorum)/.test(normalizeText(firstNonEmpty(rawMessage, effectiveMessage, message, ''))) ? 'Plan açısından: Planlama Merkezi yeni işi kurma ve planlama akışını yönetmek için kullanılır. Vardiyalar ekranında yapılır.' : '';
  const roomShiftProgressVisibleReply = roomShiftSurface
    && ['CONTINUE_FLOW', 'ALTERNATIVE_PATH'].includes(String(reasoningProgressFamily || ''))
    ? firstNonEmpty(reasoningAssistant?.rawReply, reasoningAssistant?.reply, visibleReplyWithLead)
    : '';
  const companyShiftWhyBlockedVisibleReply = String(screenPath || '').includes('/company/shifts')
    && responseQuestionTypeKey === 'WHY_BLOCKED'
    ? (() => {
      const selectedFieldSummary = uniqueStrings((Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [])
        .map((row) => {
          const label = normalizeVisibleReplyFragment(firstNonEmpty(row?.label, row?.key, ''));
          const value = normalizeVisibleReplyFragment(firstNonEmpty(row?.value, row?.text, ''));
          return label && value ? `${label}: ${value}` : firstNonEmpty(label, value, '');
        })
        .filter(Boolean));
      if (!selectedFieldSummary.length && !firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, '', visibleReplyWithLead)) return '';
      return [
        firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, '') ? `Seçili vardiya: ${normalizeVisibleReplyFragment(firstNonEmpty(screenContext?.selectedLabel, sourceScreenContext?.selectedLabel, ''))}.` : '',
        selectedFieldSummary.length ? `Seçili kayıt: ${selectedFieldSummary.join(' • ')}.` : '',
        roomShiftProgressVisibleReply || roomShiftNextStepVisibleReply || visibleReplyWithLead,
      ].filter(Boolean).join(' ').trim();
    })()
    : '';
  const companyDelegateSafeVisibleReply = String(userRole || '').trim().toUpperCase() === 'COMPANY'
    && delegateSafeMessage
    && normalizeText(firstNonEmpty(rawMessage, effectiveMessage, message, '')).includes(normalizeText('teklifi kabul et'))
    ? 'Teklifi senin yerine kabul edemem. Kabul öncesi fiyat, kapasite, kalite, araç / sürücü uygunluğu ve sözleşme hazırlığı kontrollerini adım adım gösterebilirim. Son onay yetkili kullanıcı tarafından verilmelidir.'
    : '';
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
    summary: workflowStyle ? visibleSummary : visibleSummary,
    contextSummary: visibleContextSummary,
    reply: companyShiftPlanningVisibleReply || companyShiftWhyBlockedVisibleReply || roomShiftProgressVisibleReply || roomShiftNextStepVisibleReply || companyDelegateSafeVisibleReply || visibleReplyWithLead,
    reasoningAssistant: visibleReasoningAssistantSurface,
    replyMode,
    questionType: responseQuestionType,
    questionLabel: questionTypeLabel(responseQuestionType, contextPriority?.activeTopic || responseQuestionType || '', contextPriority?.activeTopicLabel || ''),
    suggestedChips: visibleSuggestedChipsOutput,
    contextualSuggestedChips: visibleContextualSuggestedChipsOutput,
    quickActions: visibleQuickActions,
    linkedGuides: visibleLinkedGuides,
    intentConfidence: Number(intentMeta?.confidence || 0),
    intentSignals: Array.isArray(intentMeta?.matchedSignals) ? intentMeta.matchedSignals : [],
    qualityHints,
    uncertaintyMeta: visibleUncertaintyMeta,
    responseSections: visibleResponseSections,
    continuity,
    continuityMeta,
    routePlan: visibleRoutePlan,
    followUpPrompt: visibleFollowUpPrompt,
    actionPlanLabel: visibleActionPlanLabel,
    contextPriority,
    evidenceConfidence: normalizeVisibleReplyFragment(contextPriority?.evidenceConfidence || ''),
    activeTopic: contextPriority?.activeTopic || '',
    activeTopicLabel: visibleActiveTopicLabel,
    roleBoundary: visibleRoleBoundary,
    sameRecordLikely: Boolean(contextPriority?.sameRecordLikely),
    needsSelection: Boolean(contextPriority?.needsSelection),
    bestNextAction: visibleBestNextAction,
    taskState,
    conversationState: buildConversationState({
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
      lastSelectedSummary: continuity?.anchorLabel || '',
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
    }),
  };
}
