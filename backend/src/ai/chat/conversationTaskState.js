import { firstNonEmpty } from './replyShapes.js';
import { detectCopilotGuidedTaskEngineProgressCommand } from './copilotGuidedTaskEngine.js';

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

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasShortFollowUpSignal(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (value.length <= 18) return true;
  return /^(peki|tamam|o zaman|devam|sonra|simdi|şimdi|ee sonra|girdim|yaptım|bulamadım|bulamadim|göremedim|goremedim|nerede|neden|niye|bilmiyorum)\b/.test(value);
}

function hasDetailContinuationSignal(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(devamını anlat|devamini anlat|detayını anlat|detayini anlat|biraz daha aç|biraz daha ac|biraz aç|biraz ac|daha detay|daha ayrıntı|daha ayrinti|biraz daha detay|biraz daha ayrıntı|biraz daha ayrinti)/.test(value);
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number : null;
}

function countRecentMessages(conversationState) {
  return Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.length : 0;
}

function currentTaskField(conversationState, key, fallback = '') {
  return firstNonEmpty(
    conversationState?.taskState?.[key],
    conversationState?.[key],
    fallback,
  );
}

function looksLikeDetailContinuationRequest(message) {
  const value = normalizeLooseText(message);
  if (!value) return false;
  return /(devamını anlat|devamini anlat|detayını anlat|detayini anlat|biraz daha aç|biraz daha ac|biraz aç|biraz ac|daha detay|daha ayrıntı|daha ayrinti|biraz daha detay|biraz daha ayrıntı|biraz daha ayrinti)/.test(value);
}

function matchesStandalonePhrase(text, phrases) {
  const normalized = normalizeText(text);
  return phrases.some((phrase) => normalized === normalizeText(phrase));
}

function buildSelectedRecordText(snapshot) {
  return firstNonEmpty(
    snapshot?.taskState?.selectedRecordStatus,
    snapshot?.taskState?.selectedSummary,
    snapshot?.taskState?.anchorLabel,
    snapshot?.selectedRecordStatus,
    snapshot?.analysis?.selectedRecordStatus,
    snapshot?.screenContext?.selectedRecordStatus,
    snapshot?.screenContext?.selectedSummary,
    snapshot?.screenContext?.selectedLabel,
    snapshot?.screenContext?.selectedEntityLabel,
    '',
  );
}

function detectRepetition(snapshot) {
  const previousFingerprint = String(snapshot?.conversationState?.lastReasoningFingerprint || snapshot?.taskState?.lastReasoningFingerprint || '').trim();
  const previousMessage = normalizeText(firstNonEmpty(
    snapshot?.conversationState?.taskState?.currentUserMessage,
    snapshot?.conversationState?.taskState?.lastUserMessage,
    snapshot?.conversationState?.lastUserMessage,
    snapshot?.conversationState?.taskState?.currentRawUserMessage,
    snapshot?.conversationState?.taskState?.lastRawUserMessage,
    snapshot?.conversationState?.lastRawUserMessage,
    '',
  ));
  const currentMessage = normalizeText(snapshot?.normalizedMessage || snapshot?.message || '');
  if (!previousFingerprint && !previousMessage) return 0;
  const sameFingerprint = previousFingerprint && previousFingerprint === snapshot?.fingerprint;
  const sameMessage = previousMessage && currentMessage && previousMessage === currentMessage;
  const previousRepeatCount = Number(snapshot?.conversationState?.lastReasoningRepeatCount || snapshot?.taskState?.lastReasoningRepeatCount || 0);
  return sameFingerprint || sameMessage ? previousRepeatCount + 1 : 0;
}

export function looksLikeShortFollowUp(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (detectCopilotGuidedTaskEngineProgressCommand(text)) return true;
  if (looksLikeDetailContinuationRequest(text)) return true;
  if (text.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta|neye basayim|neye basayım|hangi ekrana|hangi ekrana gideyim|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|burda takıldı|burada takildi|sorun kimde|kim onaylayacak|bunu kim yapabilir|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|aynı kayıt için devam et|ayni kayit icin devam et|önce neyi kontrol edeyim|once neyi kontrol edeyim|bu yüzden mi başlamıyor|bu yuzden mi baslamiyor|girdim|içine girdim|icine girdim|açtım|actim|yaptım|yaptim|bulamadım|bulamadim|benim yerime|bunu sen yap|teklifi kabul et|aracı ata|araci ata|sözleşmeyi yürürlüğe al|sozlesmeyi yururluge al)/.test(text)
    || matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne', 'girdim', 'yaptım', 'yaptim', 'bulamadım', 'bulamadim', 'devam et', 'devamını anlat', 'devamini anlat', 'bunu sen yap', 'benim yerime', 'teklifi kabul et', 'aracı ata', 'araci ata', 'sözleşmeyi yürürlüğe al', 'sozlesmeyi yururluge al']);
}

function buildContinuityMeta({ message, conversationState, screenContext, requestEntityType, requestEntityId, screenPath }) {
  const taskState = conversationState?.taskState || null;
  const currentType = String(screenContext?.selectedEntityType || taskState?.selectedEntityType || requestEntityType || '');
  const currentId = Number(screenContext?.selectedEntityId || taskState?.selectedEntityId || requestEntityId || 0);
  const lastType = String(
    taskState?.lastSelectedEntityType
    || conversationState?.lastSelectedEntityType
    || conversationState?.lastEntityType
    || '',
  );
  const lastId = Number(taskState?.lastSelectedEntityId || conversationState?.lastSelectedEntityId || conversationState?.lastEntityId || 0);
  const anchorLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    taskState?.anchorLabel,
    taskState?.selectedLabel,
    taskState?.selectedSummary,
    conversationState?.lastSelectedLabel,
    conversationState?.lastEntityLabel,
    '',
  );
  const isFollowUp = looksLikeShortFollowUp(message) || Boolean(
    taskState?.isFollowUp
    || conversationState?.lastQuestionType
    || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length)
  );
  const sameEntity = Boolean(currentType && currentId > 0 && currentType === lastType && currentId === lastId);
  const sameScreen = Boolean(screenPath && String(taskState?.lastScreenPath || conversationState?.lastScreenPath || '') === String(screenPath || ''));
  return {
    isFollowUp,
    sameEntity,
    sameScreen,
    anchorLabel,
    currentEntityType: currentType,
    currentEntityId: currentId,
  };
}

function resolveFollowUpContextQuestion({
  message,
  conversationState = null,
  screenContext = null,
  _screenDefinition = null,
  sourceScreenContext = null,
  _sourceScreenDefinition = null,
  _questionType = '',
  _roleMode = 'OPERATIONS',
  _screenPath = '',
  _analysis = null,
}) {
  const raw = String(message || '').trim();
  const taskState = conversationState?.taskState || null;
  const hasConversationAnchor = Boolean(
    taskState?.lastQuestionType
    || taskState?.previousQuestionType
    || conversationState?.lastQuestionType
    || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length > 0)
  );
  if (!hasConversationAnchor || !looksLikeShortFollowUp(raw)) return raw;
  const guidedProgress = detectCopilotGuidedTaskEngineProgressCommand(raw, conversationState);
  if (guidedProgress?.command) return raw;
  const text = normalizeText(raw);
  const liveVisibilitySurface = String(firstNonEmpty(
    screenContext?.path,
    sourceScreenContext?.path,
    _screenPath,
    '',
  )).toLowerCase();
  if (
    (liveVisibilitySurface.includes('/personel/live') || liveVisibilitySurface.includes('/personel/my') || liveVisibilitySurface.includes('/parent/live'))
    && /(servis|servisim|öğrencimin servisi|ogrencimin servisi|çocuğumun servisi|cocugumun servisi|konum|gps|harita).*(görünmüyor|gorunmuyor|nerede|yok|ne zaman|geliyor)/.test(text)
  ) {
    return raw;
  }
  const priorConcern = firstNonEmpty(
    taskState?.lastPrimaryConcern,
    taskState?.currentPrimaryConcern,
    taskState?.lastUserMessage,
    taskState?.currentUserMessage,
    taskState?.selectedSummary,
    taskState?.anchorLabel,
    conversationState?.lastPrimaryConcern,
    conversationState?.lastUserMessage,
    conversationState?.lastRawUserMessage,
    '',
  );
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    taskState?.anchorLabel,
    taskState?.selectedLabel,
    conversationState?.lastSelectedLabel,
    conversationState?.lastEntityLabel,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    'bu seçili kayıt',
  );
  const selectedSummary = firstNonEmpty(
    screenContext?.selectedSummary,
    taskState?.selectedSummary,
    taskState?.selectedRecordStatus,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordSummary,
    '',
  );
  const anchor = firstNonEmpty(selectedLabel, selectedSummary, '');
  const selectionMissing = !anchor || /^bu seçili kayıt$/i.test(anchor);
  if (looksLikeDetailContinuationRequest(text)) {
    if (selectionMissing) return 'Bu seçili kayıt için daha fazla detay için önce ilgili satırı aç.';
    return `${anchor} için detayını anlatabilir misin?`;
  }
  if (/(neden|niye|niçin|nasil|nasıl|neye basayım|neye basayim|hangi ekrana|hangi ekrana gideyim|biraz daha aç|biraz daha ac|bunu biraz aç|bunu biraz ac)/.test(text)) {
    if (selectionMissing) return 'Bu seçili kayıt için önce ilgili satırı açıp detayını görelim.';
    return `${anchor} için neden böyle görünüyor?`;
  }
  if (/(tamam|devam|devam et|sonra|peki|o zaman|şimdi|simdi|burada|burda|aynı kayıtta|ayni kayitta|bu kayıtta|bu kayitta)/.test(text)) {
    if (selectionMissing) return 'Bu seçili kayıt için önce ilgili satırı açıp devam edelim.';
    return `${anchor} için şimdi ne yapmalıyım?`;
  }
  if (priorConcern && /^(neden|niye|niçin|nasil|nasıl|peki|tamam|devam|şimdi|simdi|burada|burda)/.test(text)) {
    return `${priorConcern} için hangi bilgiyi kontrol edelim?`;
  }
  return raw;
}

export function buildConversationTaskState({
  message = '',
  rawMessage = '',
  questionType = '',
  conversationState = null,
  screenContext = null,
  sourceScreenContext = null,
  screenDefinition = null,
  sourceScreenDefinition = null,
  guidedTaskMeta = null,
  contextPriority = null,
  analysis = null,
  roleMode = '',
  userRole = '',
  entityType = '',
  screenPath = '',
} = {}) {
  const currentMessage = firstNonEmpty(message, rawMessage, '');
  const currentRawMessage = firstNonEmpty(rawMessage, message, '');
  const currentUserMessage = currentMessage;
  const currentRawUserMessage = currentRawMessage;
  const previousQuestionType = firstNonEmpty(
    currentTaskField(conversationState, 'currentQuestionType', ''),
    conversationState?.lastQuestionType,
    conversationState?.lastGuidedTaskQuestionType,
    conversationState?.lastGuidedTaskIntent,
    '',
  );
  const previousGuidedTaskQuestionType = firstNonEmpty(
    currentTaskField(conversationState, 'currentGuidedTaskQuestionType', ''),
    conversationState?.lastGuidedTaskQuestionType,
    conversationState?.lastGuidedTaskIntent,
    '',
  );
  const previousGuidedTaskIntent = firstNonEmpty(
    currentTaskField(conversationState, 'currentGuidedTaskIntent', ''),
    conversationState?.lastGuidedTaskIntent,
    previousGuidedTaskQuestionType,
    '',
  );
  const previousGuidedTaskFlowId = firstNonEmpty(
    currentTaskField(conversationState, 'currentGuidedTaskFlowId', ''),
    conversationState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFamilyId,
    '',
  );
  const previousGuidedTaskProgressCommand = firstNonEmpty(
    currentTaskField(conversationState, 'currentGuidedTaskProgressCommand', ''),
    conversationState?.lastGuidedTaskProgressCommand,
    '',
  );
  const previousSelectedEntityType = firstNonEmpty(
    currentTaskField(conversationState, 'currentEntityType', ''),
    conversationState?.lastSelectedEntityType,
    '',
  );
  const previousSelectedEntityId = toNumberOrNull(
    currentTaskField(conversationState, 'currentEntityId', null)
    ?? conversationState?.lastSelectedEntityId
    ?? null,
  );
  const previousSelectedLabel = firstNonEmpty(
    currentTaskField(conversationState, 'anchorLabel', ''),
    currentTaskField(conversationState, 'selectedLabel', ''),
    conversationState?.lastSelectedLabel,
    conversationState?.lastEntityLabel,
    '',
  );
  const previousSelectedSummary = firstNonEmpty(
    currentTaskField(conversationState, 'selectedSummary', ''),
    currentTaskField(conversationState, 'selectedRecordStatus', ''),
    conversationState?.lastSelectedSummary,
    '',
  );
  const previousScreenPath = firstNonEmpty(
    currentTaskField(conversationState, 'currentScreenPath', ''),
    conversationState?.lastScreenPath,
    '',
  );
  const previousScreenLabel = firstNonEmpty(
    currentTaskField(conversationState, 'currentScreenLabel', ''),
    conversationState?.lastScreenLabel,
    '',
  );
  const previousPrimaryConcern = firstNonEmpty(
    currentTaskField(conversationState, 'currentPrimaryConcern', ''),
    conversationState?.lastPrimaryConcern,
    conversationState?.lastUserMessage,
    conversationState?.lastRawUserMessage,
    '',
  );
  const previousUserMessage = firstNonEmpty(
    currentTaskField(conversationState, 'currentUserMessage', ''),
    conversationState?.lastUserMessage,
    '',
  );
  const previousRawUserMessage = firstNonEmpty(
    currentTaskField(conversationState, 'currentRawUserMessage', ''),
    conversationState?.lastRawUserMessage,
    '',
  );

  const recentMessagesCount = countRecentMessages(conversationState);
  const hasConversationHistory = Boolean(
    previousQuestionType
    || previousGuidedTaskQuestionType
    || previousGuidedTaskFlowId
    || previousGuidedTaskProgressCommand
    || recentMessagesCount
  );
  const normalizedMessage = normalizeLooseText(currentMessage);
  const normalizedRawMessage = normalizeLooseText(currentRawMessage);
  const isFollowUp = Boolean(
    hasConversationHistory
    && (
      hasShortFollowUpSignal(normalizedMessage)
      || hasShortFollowUpSignal(normalizedRawMessage)
      || hasDetailContinuationSignal(normalizedMessage)
      || hasDetailContinuationSignal(normalizedRawMessage)
      || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizedMessage)
      || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizedRawMessage)
    )
  );

  const currentSelectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.selectedSummary,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    isFollowUp ? previousSelectedLabel : '',
    '',
  );
  const currentSelectedSummary = firstNonEmpty(
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordSummary,
    isFollowUp ? previousSelectedSummary : '',
    '',
  );
  const currentSelectedRecordStatus = firstNonEmpty(
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    currentSelectedSummary,
    currentSelectedLabel,
    '',
  );
  const currentEntityType = firstNonEmpty(
    screenContext?.selectedEntityType,
    sourceScreenContext?.selectedEntityType,
    isFollowUp ? previousSelectedEntityType : '',
    entityType,
    '',
  );
  const currentEntityId = toNumberOrNull(screenContext?.selectedEntityId)
    ?? toNumberOrNull(sourceScreenContext?.selectedEntityId)
    ?? (isFollowUp ? previousSelectedEntityId : null);
  const currentScreenPath = firstNonEmpty(
    screenContext?.path,
    sourceScreenContext?.path,
    screenDefinition?.path,
    sourceScreenDefinition?.path,
    isFollowUp ? previousScreenPath : '',
    screenPath,
    '',
  );
  const currentScreenLabel = firstNonEmpty(
    screenContext?.label,
    sourceScreenContext?.label,
    screenDefinition?.label,
    sourceScreenDefinition?.label,
    isFollowUp ? previousScreenLabel : '',
    '',
  );
  const currentGuidedTaskQuestionType = firstNonEmpty(
    guidedTaskMeta?.questionType,
    questionType,
    isFollowUp ? previousGuidedTaskQuestionType : '',
    '',
  );
  const currentGuidedTaskIntent = firstNonEmpty(
    guidedTaskMeta?.questionType,
    currentGuidedTaskQuestionType,
    isFollowUp ? previousGuidedTaskIntent : '',
    '',
  );
  const currentGuidedTaskFlowId = firstNonEmpty(
    guidedTaskMeta?.familyId,
    guidedTaskMeta?.flowId,
    isFollowUp ? previousGuidedTaskFlowId : '',
    '',
  );
  const currentGuidedTaskProgressCommand = firstNonEmpty(
    guidedTaskMeta?.progressCommand,
    '',
  );
  const anchorLabel = firstNonEmpty(
    currentSelectedLabel,
    currentSelectedRecordStatus,
    currentSelectedSummary,
    previousSelectedLabel,
    previousSelectedSummary,
    '',
  );
  const sameEntity = Boolean(
    currentEntityType
    && currentEntityId
    && previousSelectedEntityType
    && previousSelectedEntityId
    && normalizeText(currentEntityType) === normalizeText(previousSelectedEntityType)
    && Number(currentEntityId) === Number(previousSelectedEntityId)
  );
  const sameScreen = Boolean(
    currentScreenPath
    && previousScreenPath
    && normalizeText(currentScreenPath) === normalizeText(previousScreenPath)
  );
  const sameFlow = Boolean(
    currentGuidedTaskFlowId
    && previousGuidedTaskFlowId
    && normalizeText(currentGuidedTaskFlowId) === normalizeText(previousGuidedTaskFlowId)
  );

  return Object.freeze({
    questionType: String(questionType || ''),
    currentQuestionType: String(questionType || ''),
    previousQuestionType,
    currentGuidedTaskQuestionType,
    previousGuidedTaskQuestionType,
    currentGuidedTaskIntent,
    previousGuidedTaskIntent,
    currentGuidedTaskFlowId,
    previousGuidedTaskFlowId,
    currentGuidedTaskProgressCommand,
    previousGuidedTaskProgressCommand,
    currentEntityType,
    currentEntityId,
    previousSelectedEntityType,
    previousSelectedEntityId,
    selectedEntityType: currentEntityType,
    selectedEntityId: currentEntityId,
    selectedLabel: currentSelectedLabel,
    selectedSummary: currentSelectedSummary,
    selectedRecordStatus: currentSelectedRecordStatus,
    anchorLabel,
    currentScreenPath,
    previousScreenPath,
    screenPath: currentScreenPath,
    currentScreenLabel,
    previousScreenLabel,
    screenLabel: currentScreenLabel,
    currentUserMessage,
    currentRawUserMessage,
    currentPrimaryConcern: firstNonEmpty(currentMessage, currentRawMessage, ''),
    lastQuestionType: previousQuestionType,
    lastGuidedTaskQuestionType: previousGuidedTaskQuestionType,
    lastGuidedTaskIntent: previousGuidedTaskIntent,
    lastGuidedTaskFlowId: previousGuidedTaskFlowId,
    lastGuidedTaskProgressCommand: previousGuidedTaskProgressCommand,
    lastSelectedEntityType: previousSelectedEntityType,
    lastSelectedEntityId: previousSelectedEntityId,
    lastSelectedLabel: previousSelectedLabel,
    lastSelectedSummary: previousSelectedSummary,
    lastScreenPath: previousScreenPath,
    lastScreenLabel: previousScreenLabel,
    lastPrimaryConcern: previousPrimaryConcern,
    lastUserMessage: previousUserMessage,
    lastRawUserMessage: previousRawUserMessage,
    recentMessagesCount,
    hasConversationHistory,
    isFollowUp,
    sameEntity,
    sameScreen,
    sameFlow,
    roleMode: String(roleMode || ''),
    userRole: String(userRole || ''),
    entityType: String(entityType || ''),
    currentGuidedTaskQuestionTypeSource: guidedTaskMeta?.questionType || '',
    currentGuidedTaskFlowIdSource: guidedTaskMeta?.familyId || '',
    currentGuidedTaskProgressCommandSource: guidedTaskMeta?.progressCommand || '',
    currentScreenPathSource: currentScreenPath,
    currentScreenLabelSource: currentScreenLabel,
    taskKey: [
      normalizeText(userRole),
      normalizeText(roleMode),
      normalizeText(currentScreenPath),
      normalizeText(anchorLabel),
      normalizeText(currentGuidedTaskFlowId || currentGuidedTaskQuestionType),
    ].join('|'),
    followUpText: isFollowUp ? currentMessage : '',
    recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
    contextPriorityFollowUp: firstNonEmpty(contextPriority?.followUpPrompt, ''),
    analysisNextBestAction: firstNonEmpty(analysis?.nextBestAction, analysis?.safestNextStep, ''),
  });
}

export function mergeConversationTaskState(baseState = null, taskState = null, extras = {}) {
  const existing = baseState && typeof baseState === 'object' ? baseState : {};
  const resolvedTaskState = taskState && typeof taskState === 'object'
    ? taskState
    : buildConversationTaskState(extras);
  const recentMessages = Array.isArray(extras.recentMessages)
    ? extras.recentMessages.slice(-8)
    : (Array.isArray(existing.recentMessages) ? existing.recentMessages.slice(-8) : []);
  return {
    ...existing,
    taskState: resolvedTaskState,
    lastQuestionType: firstNonEmpty(extras.lastQuestionType, resolvedTaskState.currentQuestionType, existing.lastQuestionType, ''),
    lastGuideJobType: extras.lastGuideJobType ?? existing.lastGuideJobType ?? null,
    lastEntityType: firstNonEmpty(extras.lastEntityType, resolvedTaskState.currentEntityType, existing.lastEntityType, ''),
    lastEntityId: toNumberOrNull(extras.lastEntityId ?? resolvedTaskState.currentEntityId ?? existing.lastEntityId ?? null),
    lastEntityLabel: firstNonEmpty(extras.lastEntityLabel, existing.lastEntityLabel, ''),
    lastScreenPath: firstNonEmpty(extras.lastScreenPath, resolvedTaskState.currentScreenPath, existing.lastScreenPath, null),
    lastScreenLabel: firstNonEmpty(extras.lastScreenLabel, resolvedTaskState.currentScreenLabel, existing.lastScreenLabel, null),
    roleMode: firstNonEmpty(extras.roleMode, existing.roleMode, resolvedTaskState.roleMode, ''),
    lastQuickActions: Array.isArray(extras.lastQuickActions)
      ? extras.lastQuickActions
      : (Array.isArray(existing.lastQuickActions) ? existing.lastQuickActions : []),
    lastActionPlanLabel: firstNonEmpty(extras.lastActionPlanLabel, existing.lastActionPlanLabel, ''),
    lastUserMessage: firstNonEmpty(extras.lastUserMessage, resolvedTaskState.currentUserMessage, existing.lastUserMessage, ''),
    lastPrimaryConcern: firstNonEmpty(extras.lastPrimaryConcern, resolvedTaskState.currentPrimaryConcern, existing.lastPrimaryConcern, ''),
    lastRawUserMessage: firstNonEmpty(extras.lastRawUserMessage, resolvedTaskState.currentRawUserMessage, existing.lastRawUserMessage, ''),
    lastSelectedEntityType: firstNonEmpty(resolvedTaskState.selectedEntityType, existing.lastSelectedEntityType, ''),
    lastSelectedEntityId: toNumberOrNull(resolvedTaskState.selectedEntityId ?? existing.lastSelectedEntityId ?? null),
    lastSelectedLabel: firstNonEmpty(resolvedTaskState.anchorLabel, resolvedTaskState.selectedLabel, extras.lastSelectedLabel, existing.lastSelectedLabel, ''),
    lastSelectedSummary: firstNonEmpty(resolvedTaskState.selectedSummary, resolvedTaskState.selectedRecordStatus, extras.lastSelectedSummary, existing.lastSelectedSummary, ''),
    lastContinuityMeta: extras.lastContinuityMeta ?? existing.lastContinuityMeta ?? null,
    lastGuidedTaskIntent: firstNonEmpty(extras.lastGuidedTaskIntent, resolvedTaskState.currentGuidedTaskIntent, existing.lastGuidedTaskIntent, ''),
    lastGuidedTaskStepIndex: Number(firstNonEmpty(extras.lastGuidedTaskStepIndex, existing.lastGuidedTaskStepIndex, 0)) || 0,
    lastGuidedTaskStepNo: Number(firstNonEmpty(extras.lastGuidedTaskStepNo, existing.lastGuidedTaskStepNo, 0)) || 0,
    lastGuidedTaskRole: firstNonEmpty(extras.lastGuidedTaskRole, existing.lastGuidedTaskRole, ''),
    lastGuidedTaskEntryScreenPath: firstNonEmpty(extras.lastGuidedTaskEntryScreenPath, existing.lastGuidedTaskEntryScreenPath, resolvedTaskState.currentScreenPath, ''),
    lastGuidedTaskEntryScreenLabel: firstNonEmpty(extras.lastGuidedTaskEntryScreenLabel, existing.lastGuidedTaskEntryScreenLabel, resolvedTaskState.currentScreenLabel, ''),
    lastGuidedTaskProgressCommand: firstNonEmpty(resolvedTaskState.currentGuidedTaskProgressCommand, extras.lastGuidedTaskProgressCommand, existing.lastGuidedTaskProgressCommand, ''),
    lastGuidedTaskHumanApprovalRequiredAt: extras.lastGuidedTaskHumanApprovalRequiredAt ?? existing.lastGuidedTaskHumanApprovalRequiredAt ?? null,
    lastGuidedTaskFlowId: firstNonEmpty(resolvedTaskState.currentGuidedTaskFlowId, extras.lastGuidedTaskFlowId, existing.lastGuidedTaskFlowId, ''),
    lastGuidedTaskQuestionType: firstNonEmpty(resolvedTaskState.currentGuidedTaskQuestionType, extras.lastGuidedTaskQuestionType, existing.lastGuidedTaskQuestionType, ''),
    lastGuidedTaskProgressRaw: firstNonEmpty(extras.lastGuidedTaskProgressRaw, existing.lastGuidedTaskProgressRaw, ''),
    lastGuidedTaskClarificationQuestion: firstNonEmpty(extras.lastGuidedTaskClarificationQuestion, existing.lastGuidedTaskClarificationQuestion, ''),
    lastReasoningAssistantMode: firstNonEmpty(extras.lastReasoningAssistantMode, existing.lastReasoningAssistantMode, ''),
    lastReasoningAssistantReply: firstNonEmpty(extras.lastReasoningAssistantReply, existing.lastReasoningAssistantReply, ''),
    lastReasoningAssistantSummary: firstNonEmpty(extras.lastReasoningAssistantSummary, existing.lastReasoningAssistantSummary, ''),
    lastReasoningAssistantFingerprint: firstNonEmpty(extras.lastReasoningAssistantFingerprint, existing.lastReasoningAssistantFingerprint, ''),
    lastReasoningAssistantRole: firstNonEmpty(extras.lastReasoningAssistantRole, existing.lastReasoningAssistantRole, ''),
    lastReasoningAssistantRepeatCount: Number(firstNonEmpty(extras.lastReasoningAssistantRepeatCount, existing.lastReasoningAssistantRepeatCount, 0)) || 0,
    lastReasoningMode: firstNonEmpty(extras.lastReasoningMode, extras.lastReasoningAssistantMode, existing.lastReasoningMode, ''),
    lastReasoningReply: firstNonEmpty(extras.lastReasoningReply, extras.lastReasoningAssistantReply, existing.lastReasoningReply, ''),
    lastReasoningSummary: firstNonEmpty(extras.lastReasoningSummary, extras.lastReasoningAssistantSummary, existing.lastReasoningSummary, ''),
    lastReasoningFingerprint: firstNonEmpty(extras.lastReasoningFingerprint, extras.lastReasoningAssistantFingerprint, existing.lastReasoningFingerprint, ''),
    lastReasoningRole: firstNonEmpty(extras.lastReasoningRole, extras.lastReasoningAssistantRole, existing.lastReasoningRole, ''),
    lastReasoningRepeatCount: Number(firstNonEmpty(extras.lastReasoningRepeatCount, extras.lastReasoningAssistantRepeatCount, existing.lastReasoningRepeatCount, 0)) || 0,
    recentMessages,
  };
}

export {
  buildContinuityMeta,
  buildSelectedRecordText,
  detectRepetition,
  resolveFollowUpContextQuestion,
};
