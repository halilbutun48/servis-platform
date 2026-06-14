import { hasExplicitRoleBoundarySignal } from './answerQualityPolicy.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';

export const SEFER_ABI_REASONING_ASSISTANT_VERSION = 'SEFER-ABI-REASONING-ASSISTANT-01';

export const SEFER_ABI_REASONING_ASSISTANT_MODES = Object.freeze([
  'PASS_THROUGH',
  'CONTEXTUAL_REASONING',
  'CLARIFYING_QUESTION',
  'SAFE_REFUSAL_WITH_ALTERNATIVE',
  'REPETITION_CONTROL',
]);

export const SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS = Object.freeze([
  'role + screen + selected record + conversation state',
  'clarifying question when selection is missing',
  'safe refusal with alternative',
  'repetition control and anti-robotic phrasing',
  'no silent execution',
  'no tool execution',
  'no write-action dispatcher',
  'no DB write',
  'no AI/model/tool/write-action runtime',
]);

export const SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE = Object.freeze([
  'Sefer Abi sadece açıklar, bağlar ve güvenli yön gösterir.',
  'Gerçek execute, tool call, write-action ve DB write vaadi yoktur.',
  'Belirsizlik varsa kısa netleştirme sorusu sorar.',
  'Kritik işlerde insan onayı korunur.',
  'Underpromise / overdeliver çizgisi korunur.',
]);

export const SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'DB write',
  'OSRM call',
  'geocode execute',
  'route apply',
  'dispatch apply',
  'fake success',
]);

export const SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE = Object.freeze([
  'otomatik karar ver',
  'otomatik uygula',
  'otomatik yaz',
  'otomatik oluştur',
  'otomatik geocode',
  'otomatik rota',
  'sahte başarı',
  'gerçek yapmadan yaptım deme',
]);

const SEFER_ABI_REASONING_ASSISTANT_DIRECT_REPLIES = new Set([
  'SHIFT_BLOCKED',
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
]);

export const SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES = Object.freeze({
  SUPER_ADMIN: Object.freeze({
    role: 'SUPER_ADMIN',
    label: 'Super admin',
    frame: 'Stratejik özet:',
    tone: 'stratejik',
    focus: Object.freeze(['risk', 'audit', 'özet', 'kanıt']),
    clarifyingQuestion: 'Hangi organizasyon veya kayıt için stratejik özet çıkarayım?',
    safeAlternative: 'Önce ilgili kayıt, kanıt ve risk satırlarını açalım.',
    repeatLead: 'Kısaca farklı açıdan:',
    chips: Object.freeze(['Risk özeti', 'Kanıtı göster', 'Kritik kayıtları sırala', 'Sorumlu rol kim?']),
    maxLength: 440,
  }),
  COMPANY: Object.freeze({
    role: 'COMPANY',
    label: 'Company',
    frame: 'Plan açısından:',
    tone: 'planlayıcı',
    focus: Object.freeze(['plan', 'vardiya', 'sözleşme', 'hazırlık']),
    clarifyingQuestion: 'Hangi sözleşme, vardiya veya plan kaydı için bakayım?',
    safeAlternative: 'Önce planı, eksik veriyi ve ilgili kaydı birlikte netleştirelim.',
    repeatLead: 'Kısa plan özeti:',
    chips: Object.freeze(['Bugünkü plan', 'Eksik veri', 'Sözleşme / vardiya', 'Hazırlık durumu']),
    maxLength: 420,
  }),
  ROOM: Object.freeze({
    role: 'ROOM',
    label: 'Room',
    frame: 'Operasyon açısından:',
    tone: 'operasyonel',
    focus: Object.freeze(['araç', 'sürücü', 'kapasite', 'kalite']),
    clarifyingQuestion: 'Hangi kayıt, araç veya sürücü için bakayım?',
    safeAlternative: 'Önce araç, sürücü ve kapasite sinyallerini birlikte kontrol edelim.',
    repeatLead: 'Operasyon açısından kısa özet:',
    chips: Object.freeze(['Araç / sürücü', 'Kapasite', 'Kalite / risk', 'Operasyon kontrolü']),
    maxLength: 420,
  }),
  DRIVER: Object.freeze({
    role: 'DRIVER',
    label: 'Driver',
    frame: 'Kısaca:',
    tone: 'saha',
    focus: Object.freeze(['rota', 'check-in', 'güvenli', 'aktif durum']),
    clarifyingQuestion: 'Hangi rota, araç veya check-in kaydı için bakayım?',
    safeAlternative: 'Önce aktif rota ve check-in sinyalini birlikte görelim.',
    repeatLead: 'Kısa cevap:',
    chips: Object.freeze(['Bugünkü rota', 'Check-in', 'Sonraki durak', 'GPS durumu']),
    maxLength: 280,
  }),
  PERSONEL: Object.freeze({
    role: 'PERSONEL',
    label: 'Personel',
    frame: 'Sade cevap:',
    tone: 'basit',
    focus: Object.freeze(['servis', 'kişisel bilgi', 'takip', 'KVKK']),
    clarifyingQuestion: 'Hangi servis veya kişisel takip kaydı için bakayım?',
    safeAlternative: 'Önce servis durumunu ve görünür bilgiyi birlikte kontrol edelim.',
    repeatLead: 'Kısaca:',
    chips: Object.freeze(['Servis durumu', 'Kim görebilir?', 'Eksik bilgi', 'Sıradaki adım']),
    maxLength: 280,
  }),
  PARENT: Object.freeze({
    role: 'PARENT',
    label: 'Parent',
    frame: 'Kısa cevap:',
    tone: 'basit',
    focus: Object.freeze(['çocuk', 'servis', 'takip', 'KVKK']),
    clarifyingQuestion: 'Hangi çocuğun servis kaydı için bakayım?',
    safeAlternative: 'Önce servis durumunu ve KVKK sınırını birlikte kontrol edelim.',
    repeatLead: 'Kısaca:',
    chips: Object.freeze(['Çocuğumun servisi', 'Talep durumu', 'KVKK sınırı', 'Sıradaki adım']),
    maxLength: 280,
  }),
  SCHOOL: Object.freeze({
    role: 'SCHOOL',
    label: 'School',
    frame: 'Plan ve kanıt açısından:',
    tone: 'planlayıcı',
    focus: Object.freeze(['plan', 'kanıt', 'servis', 'onay']),
    clarifyingQuestion: 'Hangi servis planı veya onay kaydı için bakayım?',
    safeAlternative: 'Önce plan, kanıt ve onay sınırını birlikte açalım.',
    repeatLead: 'Kısa plan özeti:',
    chips: Object.freeze(['Plan', 'Kanıt', 'Onay', 'Servis düzeni']),
    maxLength: 360,
  }),
  ORGANIZATION: Object.freeze({
    role: 'ORGANIZATION',
    label: 'Organization',
    frame: 'Plan ve onay açısından:',
    tone: 'kurumsal',
    focus: Object.freeze(['plan', 'kanıt', 'servis', 'onay']),
    clarifyingQuestion: 'Hangi operasyon veya onay kaydı için bakayım?',
    safeAlternative: 'Önce plan, kanıt ve onay sınırını birlikte açalım.',
    repeatLead: 'Kısa kurumsal özet:',
    chips: Object.freeze(['Plan', 'Kanıt', 'Onay', 'Servis düzeni']),
    maxLength: 360,
  }),
  DEFAULT: Object.freeze({
    role: 'DEFAULT',
    label: 'Default',
    frame: 'Kısaca:',
    tone: 'genel',
    focus: Object.freeze(['durum', 'kanıt', 'sonraki adım']),
    clarifyingQuestion: 'Hangi kayıt için bakayım?',
    safeAlternative: 'Önce seçili kayıt ve eksik bilgiyi birlikte netleştirelim.',
    repeatLead: 'Kısaca farklı açıdan:',
    chips: Object.freeze(['Bu kayıt ne durumda?', 'Şimdi ne yapmalıyım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?']),
    maxLength: 360,
  }),
});

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function collapseSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function limitText(value, maxLength = 360) {
  const text = collapseSpaces(value);
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function textIncludes(haystack, needle) {
  const left = compactText(haystack);
  const right = compactText(needle);
  if (!left || !right) return false;
  return left.includes(right);
}

function joinReply(parts, maxLength = 360) {
  return limitText(uniqueStrings((Array.isArray(parts) ? parts : []).filter(Boolean)).join(' '), maxLength);
}

function resolveRoleKey(userRole = '', user = null) {
  const role = String(userRole || user?.role || '').trim().toUpperCase();
  const companyKind = String(user?.companyKind || user?.companyType || '').trim().toUpperCase();
  if (role === 'COMPANY' && companyKind === 'SCHOOL') return 'SCHOOL';
  if (role === 'COMPANY' && companyKind === 'ORGANIZATION') return 'ORGANIZATION';
  return role || 'DEFAULT';
}

function rowText(row) {
  if (row == null) return '';
  if (typeof row === 'string') return String(row || '').trim();
  if (typeof row !== 'object') return String(row || '').trim();
  return firstNonEmpty(row.label, row.key, row.title, row.text, row.value, row.summary, '');
}

function listRows(rows) {
  return uniqueStrings((Array.isArray(rows) ? rows : []).map((row) => rowText(row)).filter(Boolean)).slice(0, 5);
}

function profileForRole(roleKey) {
  return SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES[roleKey] || SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES.DEFAULT;
}

function buildBoundaryText(snapshot) {
  const boundaryBits = uniqueStrings([
    snapshot?.analysis?.compareHint || '',
    snapshot?.analysis?.reasoningLead || '',
    snapshot?.contextPriority?.roleBoundary || '',
    snapshot?.guide?.whyBlocked || '',
    snapshot?.guide?.doNotDo || '',
  ]);
  return boundaryBits[0] || '';
}

function buildSelectedRecordText(snapshot) {
  return uniqueStrings([
    snapshot?.selectedRecordStatus || '',
    snapshot?.analysis?.selectedRecordStatus || '',
    snapshot?.screenContext?.selectedSummary || '',
    snapshot?.screenContext?.selectedLabel || '',
    snapshot?.screenContext?.selectedEntityLabel || '',
  ])[0] || '';
}

function buildReasoningLead(snapshot) {
  return firstNonEmpty(
    snapshot?.analysis?.reasoningLead,
    snapshot?.contextPriority?.summaryLead,
    snapshot?.contextPriority?.selectedRecordMismatchLead,
    snapshot?.analysis?.nextBestAction,
    snapshot?.analysis?.safestNextStep,
    snapshot?.contextPriority?.bestNextAction,
    snapshot?.guide?.screenExplanation,
    snapshot?.guide?.summary,
    snapshot?.guide?.plainSummary,
    '',
  );
}

function buildNextAction(snapshot) {
  return firstNonEmpty(
    snapshot?.analysis?.nextBestAction,
    snapshot?.analysis?.safestNextStep,
    snapshot?.contextPriority?.bestNextAction,
    snapshot?.contextPriority?.followUpPrompt,
    snapshot?.guide?.whatToDoNow,
    snapshot?.guide?.whatToDoNext,
    '',
  );
}

function buildClarifyingQuestion(snapshot) {
  const profile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  return firstNonEmpty(
    snapshot?.guidedTaskMeta?.clarificationQuestion,
    snapshot?.contextPriority?.guidedTaskMeta?.clarificationQuestion,
    profile.clarifyingQuestion,
    'Hangi kayıt için bakayım?',
  );
}

function detectDangerRequest(snapshot) {
  const text = normalizeText(firstNonEmpty(snapshot?.message, snapshot?.rawReply, ''));
  if (!text) return false;
  return Boolean(
    snapshot?.explicitBoundary
    || snapshot?.analysis?.blockers?.some((row) => /fake success|sahte|yapmış gibi|yapmis gibi|gerçekten yapma|gercekten yapma/i.test(String(row || '')))
    || snapshot?.analysis?.missingData?.some((row) => /fake success|sahte/i.test(String(row || '')))
    || /(fake success|sahte başarı|sahte basari|yapmış gibi|yapmis gibi|yaptım de|yaptim de|gerçekten yapma|gercekten yapma|otomatik .*?(oluştur|olustur|uygula|yap)|db write|write-action|tool execution|runtime ai action|osrm call|geocode execute|route apply|dispatch apply)/i.test(text)
    || /(^|[\s:])(?:otomatik|auto)(?:[\s:]+.*)?(?:oluştur|olustur|uygula|yap|ekle|kaydet)/i.test(text)
  );
}

function detectRepetition(snapshot) {
  const previousFingerprint = String(snapshot?.conversationState?.lastReasoningFingerprint || '').trim();
  const previousMessage = normalizeText(firstNonEmpty(snapshot?.conversationState?.lastUserMessage, snapshot?.conversationState?.lastRawUserMessage, ''));
  const currentMessage = normalizeText(snapshot?.normalizedMessage || snapshot?.message || '');
  if (!previousFingerprint && !previousMessage) return 0;
  const sameFingerprint = previousFingerprint && previousFingerprint === snapshot?.fingerprint;
  const sameMessage = previousMessage && currentMessage && previousMessage === currentMessage;
  const previousRepeatCount = Number(snapshot?.conversationState?.lastReasoningRepeatCount || 0);
  return sameFingerprint || sameMessage ? previousRepeatCount + 1 : 0;
}

function buildSuggestedChips(snapshot) {
  const profile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const roleChips = Array.isArray(profile.chips) ? profile.chips : [];
  const contextualChips = [];
  if (snapshot?.analysis?.nextBestAction) contextualChips.push('Sıradaki adımı göster');
  if (snapshot?.analysis?.blockers?.length) contextualChips.push('Neden takıldı?');
  if (snapshot?.selectedRecordStatus) contextualChips.push('Seçili kayıt özetini göster');
  if (snapshot?.clarifyingQuestion) contextualChips.push(snapshot.clarifyingQuestion);
  if (snapshot?.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE') contextualChips.push('Güvenli alternatif göster');
  return uniqueStrings([...(contextualChips || []), ...(roleChips || [])]).slice(0, snapshot?.roleMode === 'SIMPLE' ? 3 : 5);
}

function buildSharedScreenPrefix(snapshot) {
  const screenPath = firstNonEmpty(
    snapshot?.sourceScreenDefinition?.path,
    snapshot?.sourceScreenContext?.path,
    snapshot?.screenContext?.path,
    snapshot?.screenPath,
    '',
  );
  if (!String(screenPath || '').includes('/shared/')) return '';
  if (String(screenPath || '').includes('/shared/feedback')) return 'Geri Bildirim ekranı:';
  if (String(screenPath || '').includes('/shared/kvkk')) return 'KVKK ekranı:';
  if (String(screenPath || '').includes('/shared/notifications')) return 'Bildirimler ekranı:';
  if (String(screenPath || '').includes('/shared/logs')) return 'Log Dışa Aktarımı ekranı:';
  const screenLabel = firstNonEmpty(snapshot?.screenLabel, '');
  return screenLabel ? `${screenLabel} ekranı:` : '';
}

export function listSeferAbiReasoningRoles() {
  return Object.keys(SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES).filter((role) => role !== 'DEFAULT');
}

export function getSeferAbiReasoningRoleProfile(role, user = null) {
  return profileForRole(resolveRoleKey(role, user));
}

export function buildSeferAbiReasoningAssistantContextSnapshot({
  rawReply = '',
  message = '',
  questionType = '',
  replyMode = '',
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
} = {}) {
  const effectiveRole = resolveRoleKey(userRole, user);
  const roleProfile = getSeferAbiReasoningRoleProfile(effectiveRole, user);
  const normalizedMessage = normalizeText(message);
  const selectedFieldLines = listRows(screenContext?.selectedFields);
  const selectedBadgeLines = listRows(screenContext?.selectedBadges);
  const selectedSignalLines = listRows(screenContext?.selectedSignals);
  const selectedRecordStatus = buildSelectedRecordText({
    screenContext,
    analysis,
    contextPriority,
  });
  const reasoningLead = buildReasoningLead({ analysis, contextPriority, guide });
  const nextBestAction = buildNextAction({ analysis, contextPriority, guide });
  const boundaryText = buildBoundaryText({ analysis, contextPriority, guide });
  const clarifyingQuestion = buildClarifyingQuestion({ guidedTaskMeta, contextPriority, roleProfile });
  const explicitBoundary = hasExplicitRoleBoundarySignal({
    questionType,
    activeTopic: contextPriority?.activeTopic || questionType,
    message,
  }) || detectDangerRequest({
    message,
    rawReply,
    analysis,
    explicitBoundary: Boolean(contextPriority?.roleBoundary),
  });
  const selectedContextPresent = Boolean(
    selectedRecordStatus
    || selectedFieldLines.length
    || selectedBadgeLines.length
    || selectedSignalLines.length
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
    || analysis?.selectedRecordStatus
  );
  const fingerprintSource = [
    effectiveRole,
    roleMode,
    String(screenPath || ''),
    String(questionType || ''),
    String(replyMode || ''),
    selectedRecordStatus,
    selectedFieldLines.join(' | '),
    selectedBadgeLines.join(' | '),
    selectedSignalLines.join(' | '),
    normalizedMessage,
    String(conversationState?.lastReasoningFingerprint || ''),
    String(conversationState?.lastReasoningMode || ''),
    String(conversationState?.lastUserMessage || ''),
    String(conversationState?.lastRawUserMessage || ''),
    String(contextPriority?.summaryLead || ''),
    String(contextPriority?.selectedRecordMismatchLead || ''),
    String(contextPriority?.bestNextAction || ''),
    String(analysis?.reasoningLead || ''),
    String(analysis?.nextBestAction || ''),
  ].join('|');
  const fingerprint = simpleHash(fingerprintSource);
  const repeatCount = detectRepetition({ conversationState, fingerprint, normalizedMessage, message });
  const hasReasoningSignal = Boolean(
    explicitBoundary
    || repeatCount > 0
    || selectedContextPresent
    || reasoningLead
    || nextBestAction
    || boundaryText
    || guidedTaskMeta?.familyId
    || contextPriority?.guidedTaskMeta?.familyId
    || contextPriority?.needsSelection
    || contextPriority?.sameRecordLikely
    || contextPriority?.selectedRecordMismatchLead
    || contextPriority?.evidenceConfidence
    || analysis?.blockers?.length
    || analysis?.missingData?.length
    || analysis?.evidence?.length
  );
  const mode = detectSeferAbiReasoningMode({
    explicitBoundary,
    repeatCount,
    hasReasoningSignal,
    selectedContextPresent,
    clarifyingQuestion,
    reasoningLead,
    nextBestAction,
    effectiveRole,
    roleMode,
    questionType,
    message,
    analysis,
    contextPriority,
  });
  return Object.freeze({
    assistantVersion: SEFER_ABI_REASONING_ASSISTANT_VERSION,
    mode,
    effectiveRole,
    roleProfile,
    roleMode,
    questionType: String(questionType || ''),
    replyMode: String(replyMode || ''),
    entityType: String(entityType || 'screen'),
    screenPath: String(screenPath || ''),
    screenLabel: firstNonEmpty(screenDefinition?.label, screenContext?.label, sourceScreenDefinition?.label, sourceScreenContext?.label, ''),
    message: String(message || ''),
    normalizedMessage,
    rawReply: String(rawReply || ''),
    selectedRecordStatus,
    selectedFieldLines,
    selectedBadgeLines,
    selectedSignalLines,
    selectedContextPresent,
    reasoningLead,
    nextBestAction,
    boundaryText,
    clarifyingQuestion,
    safeAlternative: firstNonEmpty(
      roleProfile.safeAlternative,
      contextPriority?.followUpPrompt,
      nextBestAction,
      'Önce seçili kayıt ve eksik alanı birlikte kontrol edelim.',
    ),
    explicitBoundary,
    fingerprint,
    repeatCount,
    hasReasoningSignal,
    guide,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta,
    user,
    context,
    sourceScreenDefinition,
    sourceScreenContext,
    suggestedChips: buildSuggestedChips({
      roleMode,
      effectiveRole,
      selectedRecordStatus,
      clarifyingQuestion,
      analysis,
      mode,
      roleProfile,
    }),
  });
}

export function detectSeferAbiReasoningMode(snapshot = {}) {
  if (snapshot.explicitBoundary) return 'SAFE_REFUSAL_WITH_ALTERNATIVE';
  const hasGuidedTaskMeta = Boolean(snapshot.guidedTaskMeta?.familyId || snapshot.contextPriority?.guidedTaskMeta?.familyId);
  if (!hasGuidedTaskMeta && !snapshot.selectedContextPresent && snapshot.clarifyingQuestion && snapshot.contextPriority?.needsSelection) return 'CLARIFYING_QUESTION';
  if (snapshot.repeatCount > 0) return 'REPETITION_CONTROL';
  if (snapshot.hasReasoningSignal) return 'CONTEXTUAL_REASONING';
  return 'PASS_THROUGH';
}

function composeReasoningLead(snapshot) {
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const selectedRecordStatus = snapshot?.selectedRecordStatus || '';
  const reasoningLead = snapshot?.reasoningLead || '';
  const nextBestAction = snapshot?.nextBestAction || '';
  const boundaryText = snapshot?.boundaryText || '';
  const rawReply = limitText(snapshot?.rawReply || '', roleProfile.maxLength);
  const needsPrefix = !textIncludes(rawReply, roleProfile.frame);
  const prefix = needsPrefix ? roleProfile.frame : '';
  const parts = [];
  if (prefix) parts.push(prefix);
  const sharedScreenPrefix = buildSharedScreenPrefix(snapshot);
  if (sharedScreenPrefix) parts.push(sharedScreenPrefix);
  if (selectedRecordStatus && !textIncludes(rawReply, selectedRecordStatus)) parts.push(`Seçili kayıt: ${selectedRecordStatus}.`);
  if (reasoningLead && !textIncludes(rawReply, reasoningLead)) parts.push(reasoningLead);
  if (nextBestAction && !textIncludes(rawReply, nextBestAction)) parts.push(`Şimdi: ${nextBestAction}`);
  if (boundaryText && !textIncludes(rawReply, boundaryText)) parts.push(boundaryText);
  if (roleProfile.role === 'PERSONEL' && !textIncludes(rawReply, 'KVKK')) parts.push('Odak: KVKK.');
  if (roleProfile.role === 'PARENT' && !textIncludes(rawReply, 'çocuk')) parts.push('Odak: çocuk.');
  const lead = joinReply(parts, roleProfile.maxLength);
  return lead ? `${lead} ${rawReply}`.trim() : rawReply;
}

export function composeSeferAbiReasoningReply(snapshot = {}) {
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const rawReply = limitText(snapshot?.rawReply || '', roleProfile.maxLength);
  if (!rawReply && !snapshot?.hasReasoningSignal && !snapshot?.explicitBoundary && !snapshot?.clarifyingQuestion) return '';

  if (SEFER_ABI_REASONING_ASSISTANT_DIRECT_REPLIES.has(String(snapshot?.questionType || ''))) {
    return rawReply;
  }

  if (snapshot.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE') {
    return joinReply([
      'Bunu gerçekten yapmış gibi söyleyemem.',
      snapshot?.boundaryText || '',
      `Güvenli alternatif: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol edelim.')}`,
    ], roleProfile.maxLength);
  }

  if (snapshot.mode === 'CLARIFYING_QUESTION') {
    const sharedScreenPrefix = buildSharedScreenPrefix(snapshot);
    return joinReply([
      roleProfile.frame,
      sharedScreenPrefix,
      snapshot?.selectedRecordStatus ? `Seçili kayıt: ${snapshot.selectedRecordStatus}.` : '',
      firstNonEmpty(snapshot?.reasoningLead, ''),
      `Netleştirelim: ${firstNonEmpty(snapshot?.clarifyingQuestion, roleProfile.clarifyingQuestion, 'Hangi kayıt için bakayım?')}`,
      `Alternatif: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik alanı birlikte kontrol edelim.')}`,
    ], roleProfile.maxLength);
  }

  if (snapshot.mode === 'REPETITION_CONTROL') {
    return joinReply([
      'Kısaca farklı açıdan:',
      roleProfile.repeatLead,
      snapshot?.selectedRecordStatus ? `Seçili kayıt: ${snapshot.selectedRecordStatus}.` : '',
      firstNonEmpty(snapshot?.reasoningLead, snapshot?.nextBestAction, ''),
      rawReply,
    ], roleProfile.maxLength);
  }

  if (snapshot.mode === 'CONTEXTUAL_REASONING') {
    return composeReasoningLead(snapshot);
  }

  return rawReply;
}

export function buildSeferAbiReasoningAssistant(options = {}) {
  const snapshot = buildSeferAbiReasoningAssistantContextSnapshot(options);
  const reply = composeSeferAbiReasoningReply(snapshot);
  return Object.freeze({
    ...snapshot,
    reply,
    summary: firstNonEmpty(
      snapshot.selectedRecordStatus,
      snapshot.reasoningLead,
      snapshot.nextBestAction,
      snapshot.boundaryText,
      snapshot.clarifyingQuestion,
      snapshot.rawReply,
      '',
    ),
  });
}
