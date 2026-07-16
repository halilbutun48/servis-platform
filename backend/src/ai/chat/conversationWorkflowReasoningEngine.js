import { buildConversationTaskState, buildSelectedRecordText } from './conversationTaskState.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  normalizeLooseText,
  normalizeText,
  normalizeVisibleReplyFragment,
  prettyRoleName,
  prettyScreenLabel,
  stepFlowSentence,
} from './conversationTaskStateShared.js';

export const WORKFLOW_REASONING_ENGINE_VERSION = 'COPILOT-WORKFLOW-REASONING-ENGINE-01';

export const WORKFLOW_REASONING_RELEVANT_QUESTION_TYPES = Object.freeze([
  'NEXT_STEP',
  'FIRST_CONTROL',
  'SAFE_NEXT_STEP',
  'WHY_BLOCKED',
  'READINESS_CHECK',
  'STATUS_HELP',
  'MISSING_DATA_HELP',
  'NEXT_SCREEN',
  'NEXT_BEST_ACTION',
  'DETAIL_FLOW',
]);

const WORKFLOW_REASONING_BLOCKED_QUESTION_TYPES = new Set([
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
  'CLARIFYING_QUESTION',
  'FAKE_SUCCESS_REQUEST_BLOCKED',
  'ROUTE_APPLY_BLOCKED',
  'IMPORT_WRITE_BLOCKED',
  'ROUTE_REVIEW_HUMAN_APPROVAL',
]);

const WORKFLOW_REASONING_BLOCKED_INTENT_FAMILIES = new Set([
  'STEP_ENTERED',
  'RESULT_CHECK',
  'ALTERNATIVE_PATH',
  'CONTINUE_FLOW',
  'DELEGATE_SAFE',
  'OVERVIEW_START',
  'ROLE_START',
  'SCREEN_START',
  'STEP_BY_STEP',
  'FIELD_BUTTON',
]);

export const WORKFLOW_REASONING_TRIGGER_PHRASES = Object.freeze([
  'hangi aşama',
  'hangi asama',
  'hangi kontrol',
  'hangi sırayla',
  'hangi sirayla',
  'sıradaki kontrol',
  'siradaki kontrol',
  'sonraki kontrol',
  'sonraki güvenli kontrol',
  'sonraki guvenli kontrol',
  'önce neyi kontrol',
  'once neyi kontrol',
  'nasıl ilerler',
  'nasil ilerler',
  'işlem akışı',
  'islem akisi',
  'adım adım',
  'adim adim',
  'onay gerekir mi',
  'insan onayı',
  'insan onayi',
  'bu kayıt hangi aşamada',
  'bu kayit hangi asamada',
  'bu iş hangi aşamada',
  'bu is hangi asamada',
  'hangi ekrana geçmeliyim',
  'hangi ekrana gecmeliyim',
]);

export const WORKFLOW_REASONING_SURFACE_PROFILES = Object.freeze({
  COMPANY_PLAN: Object.freeze({
    key: 'COMPANY_PLAN',
    label: 'Planlama Merkezi',
    purpose: 'planı kurma, hazırlama ve takip etme',
    paths: ['/company', '/organization'],
    approvalText: 'Plan gönderimi öncesi kullanıcı onayı gerekir.',
    followUpText: 'Gerekirse Vardiyalar ekranına geç.',
    chipLabels: ['Planı aç', 'Sonraki kontrol', 'Onay noktası', 'Vardiyalara geç'],
  }),
  COMPANY_AGREEMENTS: Object.freeze({
    key: 'COMPANY_AGREEMENTS',
    label: 'Sözleşmeler',
    purpose: 'teklif ve sözleşme hazırlığını okuma',
    paths: ['/company/agreements', '/organization/agreements', '/room/agreements', '/school/agreements'],
    approvalText: 'Sözleşmeyi yürürlüğe almadan önce onay bekle.',
    followUpText: 'Gerekirse ilgili vardiya ekranına geç.',
    chipLabels: ['Sözleşmeyi aç', 'Onay noktası', 'Bağlı vardiya', 'İlgili ekran'],
  }),
  ROOM_OFFERS: Object.freeze({
    key: 'ROOM_OFFERS',
    label: 'Teklifler',
    purpose: 'teklif satırını ve bağlı işi okuma',
    paths: ['/room/offers'],
    approvalText: 'Teklif onayı öncesi araç, sürücü ve saat birlikte okunur.',
    followUpText: 'Gerekirse Vardiyalar ekranına geç.',
    chipLabels: ['Teklifi aç', 'Araç / sürücü', 'Onay noktası', 'Vardiyalara geç'],
  }),
  COMPANY_SHIFTS: Object.freeze({
    key: 'COMPANY_SHIFTS',
    label: 'Vardiyalar',
    purpose: 'vardiya ve atama akışını takip etme',
    paths: ['/company/shifts', '/organization/shifts', '/room/shifts'],
    approvalText: 'Günlük atama değişikliği insan onayı ister.',
    followUpText: 'Gerekirse Araçlar veya Sürücüler ekranına geç.',
    chipLabels: ['Vardiyayı aç', 'Atamayı kontrol et', 'Onay noktası', 'Araç / sürücü'],
  }),
  ROOM_MAP: Object.freeze({
    key: 'ROOM_MAP',
    label: 'Canlı Takip',
    purpose: 'araç ve konum kaynağını birlikte okuma',
    paths: ['/room/map'],
    approvalText: 'Eşleşme değiştirilmeden önce onay sınırını kontrol et.',
    followUpText: 'Gerekirse Araçlar ekranına geç.',
    chipLabels: ['Aracı aç', 'Konum sinyali', 'Onay noktası', 'Araçlar'],
  }),
  ROOM_VEHICLES: Object.freeze({
    key: 'ROOM_VEHICLES',
    label: 'Araçlar',
    purpose: 'araç ve cihaz bağlantısını okuma',
    paths: ['/room/vehicles'],
    approvalText: 'Araç veya sürücü eşleşmesi değişecekse onay gerekir.',
    followUpText: 'Gerekirse Canlı Takip ekranına geç.',
    chipLabels: ['Aracı seç', 'Bağlantıyı kontrol et', 'Onay noktası', 'Canlı Takip'],
  }),
  DRIVER_ROUTE: Object.freeze({
    key: 'DRIVER_ROUTE',
    label: 'Sürücü Rotası',
    purpose: 'rota ve durak akışını takip etme',
    paths: ['/driver/route', '/driver/today', '/driver/map'],
    approvalText: 'Günlük atama değişikliği insan onayı ister.',
    followUpText: 'Gerekirse Harita ekranına geç.',
    chipLabels: ['Rotayı aç', 'Sonraki durak', 'Onay noktası', 'Harita'],
  }),
  PERSONEL_LIVE: Object.freeze({
    key: 'PERSONEL_LIVE',
    label: 'Canlı',
    purpose: 'servis görünümünü ve KVKK sınırını okuma',
    paths: ['/personel/live', '/personel/my'],
    approvalText: 'Yetkili görünüm dışına çıkmadan ilerle.',
    followUpText: 'Gerekirse yetkili servis görünümüne dön.',
    chipLabels: ['Servis kaydı', 'KVKK sınırı', 'Onay noktası', 'Yetkili görünüm'],
  }),
  PARENT_LIVE: Object.freeze({
    key: 'PARENT_LIVE',
    label: 'Canlı',
    purpose: 'öğrenci servisi takibini okuma',
    paths: ['/parent/live'],
    approvalText: 'Yetkili görünüm olmadan ilerleme.',
    followUpText: 'Gerekirse yetkili servis görünümüne dön.',
    chipLabels: ['Servis kaydı', 'Öğrenci satırı', 'Onay noktası', 'Yetkili görünüm'],
  }),
  SUPERADMIN: Object.freeze({
    key: 'SUPERADMIN',
    label: 'Süper Yönetici',
    purpose: 'sistem, kalite ve denetim okumaları',
    paths: ['/superadmin', '/superadmin/operations', '/superadmin/commercial-core', '/superadmin/trust-quality', '/superadmin/operation-verification', '/superadmin/observability', '/superadmin/acceptance', '/superadmin/telematics'],
    approvalText: 'Kritik işlemde insan onayı gerekir.',
    followUpText: 'Gerekirse ilgili denetim panelini aç.',
    chipLabels: ['Sistem özeti', 'Denetim izi', 'Onay noktası', 'İlgili panel'],
  }),
});

const WORKFLOW_REASONING_SURFACE_ORDER = Object.freeze([
  'COMPANY_AGREEMENTS',
  'ROOM_OFFERS',
  'COMPANY_SHIFTS',
  'ROOM_MAP',
  'ROOM_VEHICLES',
  'DRIVER_ROUTE',
  'PERSONEL_LIVE',
  'PARENT_LIVE',
  'SUPERADMIN',
  'COMPANY_PLAN',
]);

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePath(value) {
  return normalizeText(String(value || '').split('?')[0]);
}

function matchesPhrase(text, phrases) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(value);
  });
}

function collectWorkflowStages(screenDefinition, guide, limit = 4) {
  const screenStages = Array.isArray(screenDefinition?.workflowStages) ? screenDefinition.workflowStages : [];
  if (screenStages.length) return screenStages.slice(0, limit);
  const guideSteps = Array.isArray(guide?.stepByStep) ? guide.stepByStep : [];
  if (guideSteps.length) {
    return guideSteps.slice(0, limit).map((item, index) => ({
      key: `STEP_${index + 1}`,
      title: `Adım ${index + 1}`,
      action: String(item || ''),
      doneWhen: '',
      ifBlocked: '',
    }));
  }
  const fallback = uniqueStrings([
    firstNonEmpty(screenDefinition?.firstStep, guide?.whatToDoNow, ''),
    firstNonEmpty(screenDefinition?.nextStep, guide?.whatToDoNext, ''),
  ]);
  return fallback.map((item, index) => ({
    key: `FALLBACK_${index + 1}`,
    title: `Adım ${index + 1}`,
    action: item,
    doneWhen: '',
    ifBlocked: '',
  }));
}

function collectNextScreens(screenDefinition, limit = 3) {
  const nextScreens = Array.isArray(screenDefinition?.nextScreens) ? screenDefinition.nextScreens : [];
  if (nextScreens.length) return nextScreens.slice(0, limit);
  const screenMenus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
  return screenMenus.slice(0, limit).map((item) => ({
    label: String(item?.label || '').trim(),
    path: String(item?.path || '').trim(),
    reason: String(item?.purpose || '').trim(),
  })).filter((item) => Boolean(item.label));
}

function profileForPath(screenPath = '') {
  const path = normalizePath(screenPath);
  for (const key of WORKFLOW_REASONING_SURFACE_ORDER) {
    const profile = WORKFLOW_REASONING_SURFACE_PROFILES[key];
    if (!profile) continue;
    if ((Array.isArray(profile.paths) ? profile.paths : []).some((pattern) => path === normalizePath(pattern) || path.startsWith(normalizePath(pattern)))) {
      return profile;
    }
  }
  return null;
}

function profileForSurface({
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  userRole = '',
} = {}) {
  const paths = [
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
  ].filter(Boolean);
  for (const candidate of paths) {
    const profile = profileForPath(candidate);
    if (profile) return profile;
  }
  const label = normalizeLooseText(firstNonEmpty(
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    '',
  ));
  if (/planlama merkezi|gezi \/ planlama merkezi/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.COMPANY_PLAN;
  if (/sözleşme|sozlesme/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.COMPANY_AGREEMENTS;
  if (/teklif/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.ROOM_OFFERS;
  if (/vardiya/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.COMPANY_SHIFTS;
  if (/canlı takip|canli takip|harita/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.ROOM_MAP;
  if (/araçlar|araclar/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.ROOM_VEHICLES;
  if (/rota/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.DRIVER_ROUTE;
  if (/personel/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.PERSONEL_LIVE;
  if (/veli|parent/.test(label)) return WORKFLOW_REASONING_SURFACE_PROFILES.PARENT_LIVE;
  if (/süper yönetici|super admin|superadmin/.test(label) || normalizeRoleKey(userRole) === 'superadmin') return WORKFLOW_REASONING_SURFACE_PROFILES.SUPERADMIN;
  return null;
}

function normalizeRoleKey(value) {
  return normalizeText(value).replace(/\s+/g, '').replace(/_/g, '');
}

function buildSelectedSummaryText(snapshot = {}) {
  return normalizeVisibleReplyFragment(buildSelectedRecordText({
    screenContext: snapshot?.screenContext,
    analysis: snapshot?.analysis,
    contextPriority: snapshot?.contextPriority,
  }));
}

function buildReplyParts({
  stageText,
  nextControlText,
  approvalText,
  selectedSummaryText,
  screenLabel,
  screenPurpose,
  nextScreenText,
  roleText,
  questionType,
}) {
  const parts = [];
  if (screenLabel) parts.push(`${screenLabel} için bakıyorum.`);
  if (screenPurpose && String(questionType || '') === 'SCREEN_PURPOSE') parts.push(`Bu yüzeyin amacı: ${screenPurpose}.`);
  if (selectedSummaryText) parts.push(`Seçili kayıt: ${selectedSummaryText}.`);
  else parts.push('Şu anda görünen kayıt bunu doğrulamaya yetmiyorsa, önce ilgili satırı aç.');
  if (stageText) parts.push(`İşlem akışı: ${stageText}.`);
  if (nextControlText) parts.push(`Sonraki güvenli kontrol: ${nextControlText}.`);
  if (approvalText) parts.push(`Onay noktası: ${approvalText}.`);
  if (nextScreenText) parts.push(`Gerekirse ${nextScreenText}.`);
  if (roleText && !parts.some((part) => normalizeLooseText(part).includes(normalizeLooseText(roleText)))) {
    parts.unshift(`${roleText}: ilerliyorum.`);
  }
  return uniqueStrings(parts);
}

export function looksLikeWorkflowReasoningQuestion(message, questionType = '', interactionIntentFamily = '') {
  const blockedQuestionType = WORKFLOW_REASONING_BLOCKED_QUESTION_TYPES.has(String(questionType || ''));
  if (blockedQuestionType) return false;
  if (WORKFLOW_REASONING_BLOCKED_INTENT_FAMILIES.has(String(interactionIntentFamily || ''))) return false;
  if (WORKFLOW_REASONING_RELEVANT_QUESTION_TYPES.includes(String(questionType || ''))) return true;
  return matchesPhrase(message, WORKFLOW_REASONING_TRIGGER_PHRASES);
}

export function detectWorkflowReasoningSurface(options = {}) {
  const profile = profileForSurface(options);
  if (!profile) return null;
  return Object.freeze({
    ...profile,
    screenLabel: prettyScreenLabel(firstNonEmpty(
      options?.screenDefinition?.label,
      options?.screenContext?.label,
      options?.sourceScreenDefinition?.label,
      options?.sourceScreenContext?.label,
      profile.label,
    )),
    roleLabel: prettyRoleName(firstNonEmpty(options?.userRole, options?.user?.role, '')),
    screenPath: firstNonEmpty(
      options?.screenPath,
      options?.screenDefinition?.path,
      options?.screenContext?.path,
      options?.sourceScreenDefinition?.path,
      options?.sourceScreenContext?.path,
      '',
    ),
  });
}

export function buildWorkflowReasoningChips(options = {}) {
  const surface = detectWorkflowReasoningSurface(options);
  const genericChips = [
    'Önce neyi kontrol etmeliyim?',
    'Sonraki kontrol ne?',
    'Onay gerekir mi?',
    'Hangi ekrana geçmeliyim?',
  ];
  if (!surface) return genericChips;
  return uniqueStrings([
    ...(Array.isArray(surface.chipLabels) ? surface.chipLabels : []),
    ...genericChips,
  ]).slice(0, 4);
}

export function buildWorkflowReasoningState({
  message = '',
  rawMessage = message,
  questionType = '',
  interactionIntentFamily = '',
  guide = null,
  roleMode = 'OPERATIONS',
  userRole = '',
  user = null,
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  analysis = null,
  contextPriority = null,
  conversationState = null,
  guidedTaskMeta = null,
  entityType = 'screen',
  context = null,
  taskState = null,
} = {}) {
  const resolvedTaskState = taskState || buildConversationTaskState({
    message,
    rawMessage,
    questionType,
    conversationState,
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    guidedTaskMeta,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    entityType,
    screenPath,
  });
  const surface = detectWorkflowReasoningSurface({
    message,
    questionType,
    interactionIntentFamily,
    roleMode,
    userRole,
    user,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    contextPriority,
    analysis,
    guidedTaskMeta,
    entityType,
    context,
    taskState: resolvedTaskState,
  });
  const selectedSummaryText = buildSelectedSummaryText({
    screenContext,
    analysis,
    contextPriority,
  });
  const screenLabel = firstNonEmpty(
    surface?.label,
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    'Bu ekran',
  );
  const surfaceLabel = screenLabel;
  const screenPurpose = firstNonEmpty(
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    guide?.screenExplanation,
    guide?.plainSummary,
    guide?.summary,
    surface?.purpose,
    '',
  );
  const surfacePurpose = screenPurpose;
  const stages = collectWorkflowStages(screenDefinition, guide, 4);
  const flowText = stepFlowSentence(
    stages.map((row) => firstNonEmpty(row?.title, row?.action, row?.doneWhen, '')),
    3,
  );
  const stageText = firstNonEmpty(
    flowText,
    stages.map((row) => firstNonEmpty(row?.action, row?.title, '')).filter(Boolean).slice(0, 3).join(' '),
    firstNonEmpty(screenDefinition?.firstStep, guide?.whatToDoNow, ''),
  );
  const nextControlText = firstNonEmpty(
    stages.map((row) => firstNonEmpty(row?.action, row?.doneWhen, '')).find(Boolean),
    analysis?.nextBestAction,
    contextPriority?.bestNextAction,
    screenDefinition?.nextStep,
    guide?.whatToDoNext,
    'Önce ilgili satırı aç.',
  );
  const approvalText = firstNonEmpty(
    stages.find((row) => matchesPhrase([row?.title, row?.action, row?.ifBlocked].filter(Boolean).join(' '), ['onay', 'insan', 'yetki', 'kabul', 'approval']))?.ifBlocked,
    screenDefinition?.doNotDo,
    guide?.whyBlocked,
    surface?.approvalText,
    'Kritik adımda önce onay gerekir.',
  );
  const nextScreen = collectNextScreens(screenDefinition, 3)[0];
  const nextScreenText = firstNonEmpty(
    nextScreen?.label ? `${nextScreen.label} ekranına geç.` : '',
    surface?.followUpText,
    'İlgili ekrana geç.',
  );
  const supportedQuestion = looksLikeWorkflowReasoningQuestion(message, questionType, interactionIntentFamily)
    || WORKFLOW_REASONING_RELEVANT_QUESTION_TYPES.includes(String(questionType || ''))
    || Boolean(surface?.key && (selectedSummaryText || stageText || nextControlText || approvalText));
  const shouldRespond = Boolean(
    surface
    && supportedQuestion
    && !WORKFLOW_REASONING_BLOCKED_QUESTION_TYPES.has(String(questionType || ''))
    && !WORKFLOW_REASONING_BLOCKED_INTENT_FAMILIES.has(String(interactionIntentFamily || ''))
  );
  const roleText = firstNonEmpty(
    surface?.roleLabel ? `${surface.roleLabel} açısından` : '',
    prettyRoleName(userRole),
    '',
  );
  let reply = shouldRespond
    ? normalizeVisibleReplyFragment(buildReplyParts({
      stageText,
      nextControlText,
      approvalText,
      selectedSummaryText,
      screenLabel,
      screenPurpose,
      nextScreenText,
      roleText,
      questionType,
    }).join(' '))
    : '';
  if (
    shouldRespond
    && surface?.key === 'PERSONEL_LIVE'
    && String(questionType || '') === 'STATUS_HELP'
    && /(?:bildirim|notification).*(?:kayna|hangi olaydan|nereden geldi|neden geldi)/.test(normalizeLooseText(message))
  ) {
    reply = normalizeVisibleReplyFragment(
      `Şimdi: Bildirimin türünü ve zamanını incele. Kritik bildirimse ilgili kayda veya ekrana geç.`,
    );
  }
  const chips = buildWorkflowReasoningChips({
    message,
    questionType,
    interactionIntentFamily,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    userRole,
    user,
  });
  return Object.freeze({
    engineVersion: WORKFLOW_REASONING_ENGINE_VERSION,
    shouldRespond,
    surfaceKey: surface?.key || '',
    surfaceLabel,
    surfacePurpose,
    roleText,
    stageText,
    nextControlText,
    approvalText,
    nextScreenText,
    selectedSummaryText,
    stages,
    chips,
    reply,
    summary: normalizeVisibleReplyFragment(firstNonEmpty(stageText, nextControlText, approvalText, nextScreenText, screenPurpose, '')),
    screenPath: firstNonEmpty(
      screenPath,
      screenDefinition?.path,
      screenContext?.path,
      sourceScreenDefinition?.path,
      sourceScreenContext?.path,
      '',
    ),
    screenLabel,
    questionType: String(questionType || ''),
    interactionIntentFamily: String(interactionIntentFamily || ''),
    userRole: String(userRole || ''),
    roleMode: String(roleMode || ''),
  });
}

export function buildWorkflowReasoningReply(options = {}) {
  return buildWorkflowReasoningState(options).reply;
}
