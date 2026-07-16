import { buildConversationTaskState } from './conversationTaskState.js';
import { buildSelectedRecordText } from './conversationTaskStateSelectedRecord.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterSurfaceText,
  companyPlanningUiSurfaceText,
  ensureVisibleSentence,
  looksLikeCompanyPlanningSurfaceText,
  normalizeLooseText,
  normalizeRoleKey,
  normalizeText,
  normalizeVisibleReplyFragment,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';

export const COPILOT_ROOT_CAUSE_ENGINE_VERSION = 'COPILOT-ROOT-CAUSE-ENGINE-01';

const ROOT_CAUSE_INTENT_RE = /(?:asıl\s+sebep|asil\s+sebep|kök\s+neden|kok\s+neden|temel\s+neden|temel\s+problem|arkasında\s+ne\s+var|arkasinda\s+ne\s+var|hangi\s+şey\s+buna\s+yol\s+açıyor|hangi\s+sey\s+buna\s+yol\s+aciyor|neden\s+tekrar\s+ediyor|sürekli\s+neden\s+boyle\s+oluyor|sürekli\s+neden\s+böyle\s+oluyor|neden\s+yen[iı]\s+oldu|neden\s+düzelmiyor|neden\s+duzelmiyor|bunu\s+ne\s+bozuyor\s+olabilir|en\s+olası\s+neden|en\s+olasi\s+neden|root\s+cause|hangi\s+eksik\s+buna\s+sebep\s+olur|neden\s+sürekli\s+görünmüyor|neden\s+sürekli\s+gorunmuyor|neden\s+sürekli\s+gps\s+yok|rota\s+neden\s+hep\s+oluşmuyor|rota\s+neden\s+hep\s+olusmuyor)/i;

const ROOT_CAUSE_THEME_LIBRARY = {
  COMPANY_PLANNING_ROUTE: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler eksik personel konumu, vardiya saatinin net olmaması veya önizleme için yeterli durak olmaması olabilir. Çünkü rota hesabı konum ve vardiya verisine bağlıdır. Önce eksik konumları ve vardiya saatini kontrol edelim.',
    chips: ['Eksik personel konumu', 'Vardiya saatini kontrol et', 'Durak sayısını göster', 'Rota önizlemesi'],
  },
  COMPANY_PLANNING_EMPTY: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler plan kapsamına personel eklenmemesi, filtre/tarih bağlamı veya eksik konum verisi olabilir. Çünkü plan görünümü bu üç bağlama dayanır. Önce plan personel listesini ve aktif filtreleri kontrol edelim.',
    chips: ['Plan personel listesi', 'Aktif filtreler', 'Eksik konum verisi', 'Tarih bağlamı'],
  },
  COMPANY_OPERATIONS: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler aktif operasyon/vardiya olmaması, araç atamasının eksik olması veya GPS verisinin gelmemesidir. Çünkü canlı durum bu üç sinyalden beslenir. Önce aktif vardiya ve son GPS zamanına bakalım.',
    chips: ['Aktif vardiya var mı?', 'Son GPS zamanı', 'Araç ataması', 'Şirket/oda kapsamı'],
  },
  COMPANY_OPERATIONS_REPEAT: {
    reply: 'Bu tekrar ediyorsa kök neden tarih/filtre bağlamı, aktif vardiya üretimi veya yetki/şirket kapsamı olabilir. Çünkü aynı kayıt farklı filtrede görünmeyebilir. Önce görünmeyen operasyonun tarihi ve bağlı şirket/oda kapsamını kontrol edelim.',
    chips: ['Tarih filtresi', 'Şirket/oda kapsamı', 'Aktif vardiya üretimi', 'Görünmeyen kayıt'],
  },
  COMPANY_SHIFT: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler vardiya zamanı, araç-sürücü ataması veya operasyon hazırlığı eksikliğidir. GPS hazırlığının tamamlanmaması da başlatmayı geciktirebilir. Önce seçili vardiyanın zamanını ve araç-sürücü eşleşmesini kontrol edelim.',
    chips: ['Vardiya zamanı', 'Araç-sürücü ataması', 'Operasyon hazırlığı', 'Başlatma akışı'],
  },
  COMPANY_SHIFT_REPEAT: {
    reply: 'Bu tekrar ediyorsa kök neden vardiya saati, atama doğruluğu veya operasyon ön koşullarının eksik kalması olabilir; atama, zaman veya GPS hazırlığının birinde kopukluk olmuş olabilir. Çünkü aynı vardiya yeniden başlatılmadan önce bu sinyaller tamamlanır. Önce seçili vardiyanın zamanını ve son atama durumunu kontrol edelim.',
    chips: ['Atama durumu', 'Vardiya saati', 'Operasyon ön koşulları', 'Son durum'],
  },
  COMPANY_OFFER: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler talebin tedarikçiye ulaşmaması, tedarikçi dönüşünün beklenmesi veya filtre/status farkı olabilir. Çünkü teklif listesi talep durumu ve dönüş kayıtlarına bağlıdır. Önce talep durumunu ve teklif filtresini kontrol edelim. Filtre/status farkı varsa görünüm eksik kalabilir.',
    chips: ['Talep durumu', 'Teklif filtresi', 'Tedarikçi dönüşü', 'Seçili teklif'],
  },
  ROOM_SHIFT: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası kök neden seçili vardiyada araç-sürücü atamasının eksik olması, başlatma zamanının uygun olmaması veya GPS hazırlığının tamamlanmamasıdır. Önce atama ve canlı başlangıç durumunu kontrol edelim.',
    chips: ['Araç-sürücü ataması', 'Başlatma zamanı', 'GPS hazırlığı', 'Canlı başlangıç'],
  },
  ROOM_SHIFT_REPEAT: {
    reply: 'Tekrar ediyorsa kök neden atama, zaman veya GPS hazırlığının birinde kopukluk olması olabilir. Çünkü canlı başlangıç bu üç sinyale dayanır. Önce son atama ve GPS hazırlığını birlikte kontrol edelim.',
    chips: ['Son atama', 'GPS hazırlığı', 'Başlatma zamanı', 'Canlı başlangıç'],
  },
  ROOM_VEHICLE: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler filtre/oda kapsamı, araç kaydının pasif olması veya seçili şirket/oda bağlamının farklı olması olabilir. Önce araç listesindeki filtreleri ve araç aktiflik durumunu kontrol edelim.',
    chips: ['Filtreleri kontrol et', 'Araç aktif mi?', 'Oda/kapsam', 'Seçili şirket/oda'],
  },
  ROOM_VEHICLE_GPS: {
    reply: 'Tekrar ediyorsa kök neden araç-sürücü eşleşmesi, sürücü cihazının konum izni veya GPS verisinin stale/offline kalması ya da bağlantının kesik kalması olabilir. Önce son GPS zamanını ve bağlı araç-sürücü bilgisini kontrol edelim.',
    chips: ['Son GPS zamanı', 'Araç-sürücü eşleşmesi', 'Konum izni', 'Stale/offline'],
  },
  DRIVER_ROUTE: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler sürücüye aktif vardiya atanmaması, rota henüz başlatılmaması veya durak listesinin hazır olmamasıdır. Çünkü sürücü rota ekranı atanmış aktif iş üzerinden dolar. Önce aktif vardiya ve atanmış araç bilgisini kontrol edelim.',
    chips: ['Aktif vardiya', 'Atanmış araç', 'Durak listesi', 'Rota başlatma'],
  },
  DRIVER_CHECKIN: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler yanlış durak, uygun olmayan zaman veya GPS/konum doğrulamasının eksik olmasıdır. Otomatik işlem yapmadan önce hangi durakta olduğunu ve konumun geldiğini kontrol edelim.',
    chips: ['Durak doğrulaması', 'Uygun zaman', 'GPS doğrulaması', 'Konum geldi mi?'],
  },
  PERSONEL_LIVE: {
    reply: 'Kesin sebebi doğrulamak gerekir; en olası nedenler atanmış aktif vardiya olmaması, servis saatinin başlamaması veya araç GPS verisinin gelmemesidir. Önce atanmış vardiya ve araç konum durumunu kontrol edelim.',
    chips: ['Atanmış vardiya', 'Son GPS zamanı', 'Araç bağlantısı', 'Servis saati'],
  },
  PERSONEL_LIVE_REPEAT: {
    reply: 'Tekrar ediyorsa kök neden atanan vardiya, servis saatinin başlamaması veya araçtan sinyal gelmemesi olabilir. Önce son vardiya ve konum sinyali akışını kontrol edelim.',
    chips: ['Atanmış vardiya', 'Servis saati', 'GPS akışı', 'Araç bağlantısı'],
  },
  PARENT_LIVE: {
    reply: 'Kesin sebebi doğrulamak gerekir; en olası nedenler planlanan servis saatinin değişmesi, araç konumunun gelmemesi veya çocuğun atanmış vardiya bilgisinin eksik olması olabilir. Önce servis saati, araç konumu ve atanmış vardiya bilgisini kontrol edelim.',
    chips: ['Servis saati', 'Araç konumu', 'Atanmış vardiya', 'Bildirim kaynağı'],
  },
  SUPERADMIN_COMPANY: {
    reply: 'Kesin sebebi doğrulamak gerekir; en olası nedenler filtre/arama, şirket kaydının durumu veya yetki kapsamıdır. Kesinleştirmek için önce arama filtresini ve şirket kayıt durumunu kontrol edelim.',
    chips: ['Arama filtresi', 'Kayıt durumu', 'Yetki kapsamı', 'Şirket filtresi'],
  },
  FEEDBACK_STATUS: {
    reply: 'Kesin sebebi doğrulamak gerekir; en olası nedenler açık/kritik durumun filtrede kalması, sorumlu rolün değişmesi veya seçili kaydın kapanmamış olması olabilir. Çünkü geri bildirim akışı durum ve rol sinyaline bağlıdır. Önce açık kayıt ve sorumlu rolü kontrol edelim.',
    chips: ['Açık kayıt', 'Sorumlu rol', 'Durum filtresi', 'Kapanma sinyali'],
  },
  GENERIC_CONTEXT: {
    reply: 'Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler kayıt durumu, filtre/kapsam veya son sinyal eksikliği olabilir. Önce seçili kayıt ve son sinyali kontrol edelim.',
    chips: ['Seçili kaydı aç', 'Son sinyali göster', 'Filtreyi kontrol et', 'Eksik veriyi göster'],
  },
};

function normalizeSentence(value) {
  return normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
}

function hasAny(text, needles = []) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(needles) ? needles : []).some((needle) => {
    const target = normalizeLooseText(needle);
    return Boolean(target) && value.includes(target);
  });
}

function joinNumbered(items = [], maxItems = 3) {
  return uniqueStrings((Array.isArray(items) ? items : []).map((item) => normalizeSentence(item)).filter(Boolean))
    .slice(0, maxItems)
    .map((item, index) => `${index + 1}) ${ensureVisibleSentence(item)}`)
    .join(' ');
}

function buildSurfaceSnapshot({
  message = '',
  currentReply = '',
  questionType = '',
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  conversationState = null,
  contextPriority = null,
  analysis = null,
  context = null,
  roleMode = '',
  userRole = '',
  user = null,
} = {}) {
  const resolvedScreenPath = normalizeText(firstNonEmpty(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  const screenLabel = firstNonEmpty(
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    '',
  );
  const role = normalizeRoleKey(firstNonEmpty(userRole, user?.role, ''));
  const planningSurfaceText = normalizeLooseText(companyPlanningCenterSurfaceText({
    screenPath: resolvedScreenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  }));
  const planningUiSurfaceText = normalizeLooseText(companyPlanningUiSurfaceText(conversationState));
  const visibleSurfaceText = normalizeLooseText(uniqueStrings([
    resolvedScreenPath,
    screenLabel,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    screenDefinition?.summary,
    screenContext?.summary,
    sourceScreenDefinition?.summary,
    sourceScreenContext?.summary,
    screenDefinition?.screenExplanation,
    screenContext?.screenExplanation,
    sourceScreenDefinition?.screenExplanation,
    sourceScreenContext?.screenExplanation,
  ]).join(' • '));
  const taskState = buildConversationTaskState({
    message,
    rawMessage: firstNonEmpty(message, ''),
    questionType,
    conversationState,
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    guidedTaskMeta: contextPriority?.guidedTaskMeta || null,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    entityType: context?.entityType || 'screen',
    screenPath: resolvedScreenPath,
  });
  const selectedRecordText = firstNonEmpty(
    buildSelectedRecordText({
      screenContext,
      analysis,
      contextPriority,
    }),
    taskState?.selectedRecordStatus,
    taskState?.selectedSummary,
    taskState?.anchorLabel,
    '',
  );
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    sourceScreenContext?.selectedLabel,
    taskState?.selectedLabel,
    taskState?.anchorLabel,
    '',
  );
  const selectedSummary = firstNonEmpty(
    screenContext?.selectedSummary,
    sourceScreenContext?.selectedSummary,
    taskState?.selectedSummary,
    taskState?.selectedRecordStatus,
    '',
  );
  const selectedEntityType = normalizeRoleKey(firstNonEmpty(
    screenContext?.selectedEntityType,
    sourceScreenContext?.selectedEntityType,
    taskState?.selectedEntityType,
    contextPriority?.selectedEntityType,
    '',
  ));
  const selectedEntityId = Number(firstNonEmpty(
    screenContext?.selectedEntityId,
    sourceScreenContext?.selectedEntityId,
    taskState?.selectedEntityId,
    contextPriority?.selectedEntityId,
    0,
  ) || 0);

  return {
    message: String(message || ''),
    currentReply: String(currentReply || ''),
    questionType: String(questionType || ''),
    screenPath: resolvedScreenPath,
    screenLabel,
    role,
    roleMode: String(roleMode || ''),
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    conversationState,
    contextPriority,
    analysis,
    context,
    selectedLabel,
    selectedSummary,
    selectedRecordText,
    selectedEntityType,
    selectedEntityId,
    rawText: normalizeLooseText(message),
    originalText: String(message || '').trim(),
    planningSurfaceText,
    planningUiSurfaceText,
    visibleSurfaceText,
    taskState,
  };
}

function hasRootCauseContext(snapshot = {}) {
  return Boolean(
    snapshot.screenPath
    || snapshot.selectedRecordText
    || snapshot.taskState?.anchorLabel
    || snapshot.taskState?.selectedLabel
    || snapshot.taskState?.selectedSummary
    || snapshot.taskState?.selectedRecordStatus
    || snapshot.conversationState?.lastQuestionType
    || snapshot.conversationState?.lastGuidedTaskQuestionType
    || (Array.isArray(snapshot.conversationState?.recentMessages) && snapshot.conversationState.recentMessages.length > 0)
    || snapshot.analysis?.selectedRecordStatus
    || snapshot.analysis?.reasoningLead
    || snapshot.contextPriority?.selectedRecordMismatchLead
  );
}

export function looksLikeRootCauseQuestion(message) {
  return ROOT_CAUSE_INTENT_RE.test(normalizeLooseText(message));
}

export function detectRootCauseQuestionIntent({ message = '', originalMessage = '' } = {}) {
  const combinedText = normalizeLooseText(firstNonEmpty(message, ''));
  const originalText = normalizeLooseText(firstNonEmpty(originalMessage, ''));
  if (!looksLikeRootCauseQuestion(combinedText) && !looksLikeRootCauseQuestion(originalText)) {
    return null;
  }
  return {
    questionType: 'ROOT_CAUSE',
    confidence: 0.95,
    matchedSignals: ['ROOT_CAUSE', 'explicit-root-cause'],
    preferRoute: false,
    routeRequest: false,
  };
}

function detectRootCauseTheme(snapshot = {}) {
  const text = normalizeLooseText(firstNonEmpty(snapshot.originalText, snapshot.message, snapshot.rawText, ''));
  const path = normalizeText(snapshot.screenPath);
  const selectedText = normalizeLooseText(firstNonEmpty(snapshot.selectedRecordText, snapshot.selectedSummary, snapshot.selectedLabel, snapshot.taskState?.selectedRecordStatus, snapshot.taskState?.anchorLabel, ''));
  const surfaceText = normalizeLooseText(uniqueStrings([
    snapshot.screenLabel,
    snapshot.planningSurfaceText,
    snapshot.planningUiSurfaceText,
    snapshot.visibleSurfaceText,
    selectedText,
  ]).join(' '));

  if (!looksLikeRootCauseQuestion(text)) return '';

  if (path.includes('/company/planning-center') || looksLikeCompanyPlanningSurfaceText(snapshot.planningSurfaceText) || looksLikeCompanyPlanningSurfaceText(snapshot.planningUiSurfaceText) || /planlama\s+merkezi/.test(surfaceText)) {
    if (hasAny(text, ['boş kalıyor', 'bos kaliyor', 'boş', 'bos', 'personel', 'eklenmem', 'filtre', 'tarih'])) return 'COMPANY_PLANNING_EMPTY';
    return 'COMPANY_PLANNING_ROUTE';
  }

  if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
    if (hasAny(text, ['sürekli', 'surekli', 'tekrar', 'yeniden', 'yeniden görünmüyor', 'yeniden gorunmuyor'])) return 'COMPANY_OPERATIONS_REPEAT';
    return 'COMPANY_OPERATIONS';
  }

  if (path.includes('/company/shifts') || path.includes('/organization/shifts')) {
    if (hasAny(text, ['tekrar', 'yeniden', 'sürekli', 'surekli'])) return 'COMPANY_SHIFT_REPEAT';
    return 'COMPANY_SHIFT';
  }

  if (path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) {
    return 'COMPANY_OFFER';
  }

  if (path.includes('/room/shifts')) {
    if (hasAny(text, ['gps', 'konum', 'sürekli', 'surekli'])) return 'ROOM_SHIFT_REPEAT';
    return 'ROOM_SHIFT';
  }

  if (path.includes('/room/vehicles')) {
    if (hasAny(text, ['gps', 'konum', 'sinyal', 'bağlanm', 'baglanm', 'güncel değil', 'çevrim dışı', 'offline'])) return 'ROOM_VEHICLE_GPS';
    return 'ROOM_VEHICLE';
  }

  if (path.includes('/driver/route') || path.includes('/driver/today')) {
    if (hasAny(text, ['check-in', 'checkin', 'giriş', 'girisim', 'bin', 'biniş'])) return 'DRIVER_CHECKIN';
    return 'DRIVER_ROUTE';
  }

  if (path.includes('/personel/live') || path.includes('/personel/my')) {
    if (hasAny(text, ['sürekli', 'surekli', 'tekrar', 'gps', 'konum'])) return 'PERSONEL_LIVE_REPEAT';
    return 'PERSONEL_LIVE';
  }

  if (path.includes('/parent/live')) {
    return 'PARENT_LIVE';
  }

  if (path.startsWith('/superadmin') || /süper\s+yönetici|super\s*admin|superadmin/.test(surfaceText)) {
    return 'SUPERADMIN_COMPANY';
  }

  if (path.includes('/shared/feedback')) {
    return 'FEEDBACK_STATUS';
  }

  if (path.includes('/shared/notifications')) {
    return 'SUPERADMIN_COMPANY';
  }

  return hasRootCauseContext(snapshot) ? 'GENERIC_CONTEXT' : '';
}

function buildFallbackRootCauseReply(snapshot = {}) {
  if (!hasRootCauseContext(snapshot)) {
    return 'Kesin sebebi veriyle doğrulamak gerekir; hangi ekran/kayıt üzerinde olduğumuzu ve son sinyali paylaşırsan en olası nedenleri sıralayabilirim.';
  }
  const selectedText = normalizeSentence(firstNonEmpty(snapshot.selectedRecordText, snapshot.selectedSummary, snapshot.selectedLabel, ''));
  const contextHint = selectedText ? ` Seçili kayıt: ${selectedText}` : '';
  return `Kesin sebebi veriyle doğrulamak gerekir; en olası nedenler kayıt durumu, filtre/kapsam veya son sinyal eksikliği olabilir.${contextHint} Önce seçili kayıt ve son sinyali kontrol edelim.`;
}

function buildFallbackRootCauseChips(snapshot = {}) {
  const path = normalizeText(snapshot.screenPath);
  if (path.includes('/personel/live') || path.includes('/personel/my') || path.includes('/parent/live') || path.includes('/driver/route') || path.includes('/driver/today')) {
    return ['Atanmış vardiya', 'Son konum bilgisi zamanı', 'Araç bağlantısı', 'Servis saati'];
  }
  if (path.includes('/room/vehicles')) {
    return ['Filtreleri kontrol et', 'Araç aktif mi?', 'Oda/kapsam', 'Seçili şirket/oda'];
  }
  if (path.includes('/room/shifts') || path.includes('/company/shifts') || path.includes('/organization/shifts')) {
    return ['Vardiya zamanı', 'Araç-sürücü ataması', 'Operasyon hazırlığı', 'Başlatma akışı'];
  }
  if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
    return ['Aktif vardiya var mı?', 'Son konum bilgisi zamanı', 'Araç ataması', 'Şirket/oda kapsamı'];
  }
  if (path.includes('/company/planning-center')) {
    return ['Plan personel listesi', 'Aktif filtreler', 'Eksik konum verisi', 'Tarih bağlamı'];
  }
  if (path.includes('/company/agreements') || path.includes('/room/agreements') || path.includes('/school/agreements') || path.includes('/organization/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) {
    return ['Talep durumu', 'Teklif filtresi', 'Tedarikçi dönüşü', 'Seçili teklif'];
  }
  if (path.includes('/shared/feedback')) {
    return ['Açık kayıt', 'Sorumlu rol', 'Durum filtresi', 'Kapanma sinyali'];
  }
  if (path.startsWith('/superadmin')) {
    return ['Arama filtresi', 'Kayıt durumu', 'Yetki kapsamı', 'Şirket filtresi'];
  }
  return ['Seçili kaydı aç', 'Son sinyali göster', 'Filtreyi kontrol et', 'Eksik veriyi göster'];
}

function buildThemeReply(snapshot = {}, theme = '') {
  const explicit = ROOT_CAUSE_THEME_LIBRARY[theme]?.reply || '';
  if (explicit) return explicit;
  return buildFallbackRootCauseReply(snapshot);
}

function buildThemeChips(snapshot = {}, theme = '') {
  const explicit = ROOT_CAUSE_THEME_LIBRARY[theme]?.chips || [];
  if (explicit.length) return explicit;
  return buildFallbackRootCauseChips(snapshot);
}

export function buildRootCauseState(options = {}) {
  const snapshot = buildSurfaceSnapshot(options);
  const theme = detectRootCauseTheme(snapshot);
  const reply = buildThemeReply(snapshot, theme);
  const chips = buildThemeChips(snapshot, theme);
  const questionType = String(snapshot.questionType || 'ROOT_CAUSE') || 'ROOT_CAUSE';
  return {
    ...snapshot,
    questionType,
    theme: theme || (hasRootCauseContext(snapshot) ? 'GENERIC_CONTEXT' : ''),
    hasRootCauseContext: hasRootCauseContext(snapshot),
    reply: normalizeVisibleReplyFragment(reply),
    chips: uniqueStrings(chips).slice(0, 4),
    summary: normalizeVisibleReplyFragment(reply),
    needsContext: !hasRootCauseContext(snapshot),
  };
}

export function buildRootCauseReply(options = {}) {
  return buildRootCauseState(options).reply;
}

export function buildRootCauseChips(options = {}) {
  return buildRootCauseState(options).chips;
}

export function buildRootCauseAssistantReply(options = {}) {
  const state = buildRootCauseState(options);
  return String(state.questionType || '') === 'ROOT_CAUSE' || String(state.theme || '') === 'FEEDBACK_STATUS'
    ? state.reply
    : '';
}

export function buildRootCauseAssistantChips(options = {}) {
  const state = buildRootCauseState(options);
  return String(state.questionType || '') === 'ROOT_CAUSE' || String(state.theme || '') === 'FEEDBACK_STATUS'
    ? state.chips
    : [];
}
