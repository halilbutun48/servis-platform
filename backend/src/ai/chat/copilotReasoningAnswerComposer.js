import { firstNonEmpty, normalizeVisibleTerminology, uniqueStrings } from './replyShapes.js';

export const COPILOT_REASONING_ANSWER_COMPOSER_VERSION = 'COPILOT-REASONING-ANSWER-COMPOSER-01';

export const COPILOT_REASONING_ANSWER_COMPOSER_DIRECT_QUESTION_TYPES = Object.freeze([
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
]);

export const COPILOT_REASONING_ANSWER_COMPOSER_ACTION_LEAD_QUESTION_TYPES = Object.freeze([
  'NEXT_STEP',
  'NEXT_SCREEN',
  'GO_TO',
  'READINESS_CHECK',
  'CONTRACT_TO_SHIFT',
  'AGREEMENT_ROUTE_REFRESH',
  'FIRST_CONTROL',
  'DETAIL_FLOW',
  'SHIFT_BLOCKED',
  'WHY_BLOCKED',
  'STATUS_HELP',
  'SAFE_NEXT_STEP',
  'EXCEL_ROUTE_PREVIEW',
  'ADDRESS_GEOCODE_PREVIEW',
  'OSRM_ROUTE_DRAFT_PREVIEW',
  'ROUTE_REVIEW_HUMAN_APPROVAL',
  'ROUTE_APPLY_BLOCKED',
  'IMPORT_WRITE_BLOCKED',
  'FAKE_SUCCESS_REQUEST_BLOCKED',
]);

const COPILOT_REASONING_ANSWER_COMPOSER_NOW_LEAD_STRIP_QUESTION_TYPES = new Set([
  'SCREEN_FOCUS',
  'SCREEN_PURPOSE',
  'SCREEN_EXPLANATION_HELP',
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
]);

export const COPILOT_REASONING_ANSWER_COMPOSER_PROGRESS_COMMANDS = Object.freeze([
  'STEP_ENTERED',
  'RESULT_CHECK',
  'ALTERNATIVE_PATH',
  'CONTINUE_FLOW',
  'DELEGATE_SAFE',
]);

const COPILOT_REASONING_ANSWER_COMPOSER_ACTION_LEAD_FAMILY_IDS = new Set([
  'ROUTE_PREP_EXCEL',
  'ROUTE_PREP_ADDRESS',
  'ROUTE_PREP_OSRM',
  'ROUTE_REVIEW_APPROVAL',
  'ROUTE_APPLY_BLOCKED',
  'IMPORT_WRITE_BLOCKED',
  'FAKE_SUCCESS_REQUEST_BLOCKED',
  'OFFER_FLOW_GUIDE',
  'SHIFT_FLOW_GUIDE',
  'GENERAL_GUIDED_TASK_GUIDE_PROGRESS',
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
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

function containsNormalized(haystack, needle) {
  const left = compactText(haystack);
  const right = compactText(needle);
  if (!left || !right) return false;
  return left.includes(right);
}

function capitalizeFirstSentence(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const [first, ...rest] = trimmed;
  return `${first.toLocaleUpperCase('tr-TR')}${rest.join('')}`;
}

function stripLeadMarker(text) {
  return String(text || '')
    .replace(/^\s*(?:Şimdi yap|Şimdi|Kısaca|Kısa cevap|Sade cevap)\s*:\s*/i, '')
    .trim();
}

function stripNowLeadMarkers(text) {
  return String(text || '')
    .replace(/\bŞimdi:\s*/gi, ' ')
    .replace(/\bSimdi:\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceKey(sentence) {
  return compactText(String(sentence || '').replace(/^\s*(?:Şimdi yap|Şimdi|Kısaca|Kısa cevap|Sade cevap)\s*:\s*/i, ''));
}

function dedupeSentences(text) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const sentences = source.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const sentence of sentences) {
    const key = sentenceKey(sentence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(sentence.trim());
  }
  return out.join(' ').trim();
}

function limitText(value, maxLength = 360) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function joinParts(parts, maxLength = 360) {
  return limitText(uniqueStrings((Array.isArray(parts) ? parts : []).filter(Boolean)).join(' '), maxLength);
}

function roleProfile(snapshot = {}) {
  return snapshot?.roleProfile || {};
}

function roleLabel(snapshot = {}) {
  return firstNonEmpty(roleProfile(snapshot)?.label, snapshot?.effectiveRole, 'Sefer Abi');
}

function prettyRoleName(roleKey = '') {
  const key = String(roleKey || '')
    .replace(/[_\s]+/g, '')
    .toLowerCase();
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
  return firstNonEmpty(map[key], String(roleKey || '').trim());
}

function screenLabel(snapshot = {}) {
  return firstNonEmpty(
    snapshot?.screenLabel,
    snapshot?.screenContext?.label,
    snapshot?.sourceScreenDefinition?.label,
    snapshot?.sourceScreenContext?.label,
    '',
  );
}

function safeAlternative(snapshot = {}) {
  return firstNonEmpty(
    snapshot?.safeAlternative,
    roleProfile(snapshot)?.safeAlternative,
    'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol edelim.',
  );
}

function privacyBoundaryRequested(snapshot = {}) {
  const role = String(roleProfile(snapshot)?.role || snapshot?.effectiveRole || '').toUpperCase();
  if (!['PARENT', 'PERSONEL'].includes(role)) return false;
  const text = normalizeText(firstNonEmpty(snapshot?.message, snapshot?.rawMessage, ''));
  if (!text) return false;
  return /(?:başkasının|baskasinin|başka birinin|baska birinin|başka kişinin|baska kisinin|diğer kişinin|diger kisinin|diğer öğrencinin|diger ogrencinin)/.test(text);
}

function progressCommand(snapshot = {}) {
  return String(firstNonEmpty(
    snapshot?.userProgressCommand,
    snapshot?.taskState?.currentGuidedTaskProgressCommand,
    snapshot?.taskState?.lastGuidedTaskProgressCommand,
    snapshot?.conversationState?.taskState?.currentGuidedTaskProgressCommand,
    snapshot?.conversationState?.taskState?.lastGuidedTaskProgressCommand,
    snapshot?.interactionIntentFamily,
    '',
  ) || '');
}

function previousTaskState(snapshot = {}) {
  return firstNonEmpty(
    snapshot?.previousTaskState,
    snapshot?.taskState?.anchorLabel,
    snapshot?.taskState?.selectedSummary,
    snapshot?.taskState?.selectedLabel,
    snapshot?.taskState?.lastSelectedLabel,
    snapshot?.taskState?.lastPrimaryConcern,
    snapshot?.conversationState?.taskState?.anchorLabel,
    snapshot?.conversationState?.taskState?.selectedSummary,
    snapshot?.conversationState?.taskState?.selectedLabel,
    snapshot?.conversationState?.taskState?.lastSelectedLabel,
    snapshot?.conversationState?.lastSelectedLabel,
    snapshot?.conversationState?.lastSelectedSummary,
    snapshot?.conversationState?.lastGuidedTaskQuestionType,
    snapshot?.conversationState?.lastQuestionType,
    '',
  );
}

function lastAssistantAnswerType(snapshot = {}) {
  return firstNonEmpty(
    snapshot?.lastAssistantAnswerType,
    snapshot?.conversationState?.lastReasoningAssistantMode,
    snapshot?.conversationState?.lastReasoningMode,
    '',
  );
}

function buildProgressLead(snapshot = {}, reply = '') {
  const progress = progressCommand(snapshot);
  const replyText = String(reply || '');
  const repeatCount = Math.max(0, Number(snapshot?.repeatCount || snapshot?.conversationState?.lastReasoningAssistantRepeatCount || 0));
  switch (progress) {
    case 'STEP_ENTERED':
      return 'Şimdi: Girdin, tamam.';
    case 'RESULT_CHECK':
      return containsNormalized(replyText, 'birlikte kontrol') ? '' : 'Şimdi: Yaptığını gördüm; şimdi birlikte kontrol edelim.';
    case 'ALTERNATIVE_PATH':
      return [
        'Şimdi: Alternatif menüyü açalım.',
        'Şimdi: Takıldığın yer için başka ekran yolunu gösteriyorum.',
        'Şimdi: Olmadıysa en yakın menü kapısını birlikte bulalım.',
      ][Math.min(repeatCount, 2)];
    case 'CONTINUE_FLOW': {
      const anchor = previousTaskState(snapshot);
      if (anchor && !containsNormalized(replyText, anchor)) {
        return `Şimdi: Aynı kayıtta devam ediyoruz: ${anchor}.`;
      }
      const assistantType = lastAssistantAnswerType(snapshot);
      if (assistantType && !containsNormalized(replyText, assistantType)) {
        return 'Şimdi: Aynı akışı sürdürüyorum.';
      }
      return '';
    }
    case 'DELEGATE_SAFE':
      if (containsNormalized(replyText, 'güvenli adım') || containsNormalized(replyText, 'bunu senin yerine')) return '';
      return [
        'Şimdi: Bunu senin yerine uygulayamam; ama güvenli hazırlık yolunu göstereyim.',
        'Şimdi: İşlemi ben yapamam; ama hazırlık adımını netleştireyim.',
        'Şimdi: Otomatik işlem yok; ama güvenli yolu birlikte çıkaralım.',
      ][Math.min(repeatCount, 2)];
    default:
      return '';
  }
}

function buildDirectQuestionTail(snapshot = {}, reply = '') {
  const questionType = String(snapshot?.questionType || '');
  const replyText = String(reply || '');
  const role = String(roleProfile(snapshot)?.role || '').toUpperCase();

  if (questionType === 'PRODUCT_OVERVIEW_HELP' && (!role || role === 'DEFAULT') && !containsNormalized(replyText, 'hangi roldesin')) {
    return 'Hangi roldesin?';
  }

  if (questionType === 'FIELD_BUTTON_HELP' && !containsNormalized(replyText, 'takılırsan') && !containsNormalized(replyText, 'bulamadım')) {
    return 'Takılırsan "bulamadım" yaz.';
  }

  if (snapshot?.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE' && !containsNormalized(replyText, 'güvenli alternatif')) {
    return `Önerilen güvenli adım: ${safeAlternative(snapshot)}`;
  }

  return '';
}

function shouldPreserveActionLead(snapshot = {}) {
  const questionType = String(snapshot?.questionType || '');
  const isBlockedMode = String(snapshot?.mode || snapshot?.reasoningMode || '') === 'SAFE_REFUSAL_WITH_ALTERNATIVE'
    || String(snapshot?.guidedTaskMeta?.replyMode || '').toUpperCase() === 'BLOCKED';
  if (!COPILOT_REASONING_ANSWER_COMPOSER_ACTION_LEAD_QUESTION_TYPES.includes(questionType)) return false;
  if (isBlockedMode) return true;
  return !COPILOT_REASONING_ANSWER_COMPOSER_PROGRESS_COMMANDS.includes(progressCommand(snapshot));
}

function shouldPreserveGuidedTaskLead(snapshot = {}) {
  const familyId = firstNonEmpty(
    snapshot?.guidedTaskMeta?.familyId,
    snapshot?.guidedTaskFamilyId,
    snapshot?.contextPriority?.guidedTaskMeta?.familyId,
    '',
  );
  if (!familyId) return false;
  if (String(snapshot?.mode || snapshot?.reasoningMode || '') === 'SAFE_REFUSAL_WITH_ALTERNATIVE'
    || String(snapshot?.guidedTaskMeta?.replyMode || '').toUpperCase() === 'BLOCKED') {
    return true;
  }
  return [...COPILOT_REASONING_ANSWER_COMPOSER_ACTION_LEAD_FAMILY_IDS].some((value) => String(familyId).includes(value));
}

function shouldStripNowLead(snapshot = {}) {
  return COPILOT_REASONING_ANSWER_COMPOSER_NOW_LEAD_STRIP_QUESTION_TYPES.has(String(snapshot?.questionType || ''));
}

function finalizeReply(snapshot, reply, maxLength = 360) {
  const value = shouldStripNowLead(snapshot) ? stripNowLeadMarkers(reply) : reply;
  return limitText(normalizeVisibleTerminology(value), maxLength);
}

function buildFallbackReply(snapshot = {}) {
  const profile = roleProfile(snapshot);
  const questionType = String(snapshot?.questionType || '');
  const role = String(profile?.role || snapshot?.effectiveRole || '').toUpperCase();
  const label = roleLabel(snapshot);
  const screen = screenLabel(snapshot);
  const summary = firstNonEmpty(snapshot?.guide?.plainSummary, snapshot?.guide?.summary, snapshot?.guide?.screenExplanation, '');
  const starterSteps = Array.isArray(profile?.starterSteps) ? profile.starterSteps.filter(Boolean) : [];
  const safeFollowUp = questionType === 'FIELD_BUTTON_HELP' ? 'Takılırsan "bulamadım" yaz.' : '';

  if (questionType === 'PRODUCT_OVERVIEW_HELP') {
    if (!role || role === 'DEFAULT') {
      return joinParts([
        'SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılır.',
        'Başlamak için önce bugünkü plan / vardiya akışını aç, sonra canlı takip / servis durumuna bak, ardından kanıt / kalite / audit ekranını kontrol et.',
        'Hangi roldesin?',
        safeFollowUp,
      ], profile?.maxLength || 360);
    }
    return joinParts([
      `${label} rolünde ${firstNonEmpty(profile?.intro, 'servis operasyonunu takip etmek için kullanılır.')}`,
      starterSteps.slice(0, 3).join('. '),
      safeFollowUp,
    ], profile?.maxLength || 360);
  }

  if (questionType === 'ROLE_EXPLANATION_HELP') {
    return joinParts([
      `${label} rolünde ${firstNonEmpty(profile?.voice, 'kendi alanındaki servis akışını takip edersin.')}.`,
      starterSteps.slice(0, 2).join('. '),
      safeFollowUp,
    ], profile?.maxLength || 360);
  }

  if (questionType === 'SCREEN_EXPLANATION_HELP' || questionType === 'SCREEN_PURPOSE') {
    return joinParts([
      screen ? `Şu an ${screen} ekranındaysan` : 'Şu ekrandaysan',
      firstNonEmpty(summary, 'önce seçili kayıt ve ilk kontrol alanına bak.'),
      safeFollowUp,
    ], profile?.maxLength || 360);
  }

  if (questionType === 'HOW_TO_HELP') {
    return joinParts([
      screen ? `Şu an ${screen} ekranındaysan önce doğru kaydı aç.` : 'Önce doğru kaydı aç.',
      firstNonEmpty(snapshot?.analysis?.nextBestAction, profile?.starterSteps?.[0], ''),
      firstNonEmpty(profile?.starterSteps?.[1], ''),
      safeFollowUp,
    ], profile?.maxLength || 360);
  }

  if (questionType === 'FIELD_BUTTON_HELP') {
    return joinParts([
      firstNonEmpty(snapshot?.rawReply, `${screen || 'Bu ekran'} üzerindeki alanı ya da butonu açıklayalım.`),
      safeFollowUp,
    ], profile?.maxLength || 360);
  }

  return '';
}

function shouldUseFallback(snapshot = {}, reply = '') {
  const questionType = String(snapshot?.questionType || '');
  const progress = progressCommand(snapshot);
  const direct = COPILOT_REASONING_ANSWER_COMPOSER_DIRECT_QUESTION_TYPES.includes(questionType);
  const isProgress = COPILOT_REASONING_ANSWER_COMPOSER_PROGRESS_COMMANDS.includes(progress);
  const isBoundary = Boolean(snapshot?.explicitBoundary || snapshot?.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE');
  return Boolean(direct || isProgress || isBoundary || !String(reply || '').trim());
}

export function composeCopilotReasoningAnswer(snapshot = {}) {
  const profile = roleProfile(snapshot);
  const roleName = prettyRoleName(firstNonEmpty(profile?.role, snapshot?.effectiveRole, ''));
  const maxLength = Number(profile?.maxLength || 360);
  const progress = progressCommand(snapshot);
  const questionType = String(snapshot?.questionType || '');
  const directRoleLead = ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(questionType) && roleName && normalizeText(roleName) !== 'default'
    ? `${roleName} rolünde`
    : '';
  const overrideFinalReply = String(firstNonEmpty(snapshot?.overrideFinalReply, '') || '').trim();
  if (privacyBoundaryRequested(snapshot)) {
    return joinParts([
      'KVKK sınırı nedeniyle başkasının verisini paylaşamam.',
      safeAlternative(snapshot),
      'Takılırsan "bulamadım" yaz.',
    ], maxLength);
  }
  if (overrideFinalReply) {
    return finalizeReply(snapshot, overrideFinalReply, maxLength);
  }
  const rawReplyText = String(snapshot?.rawReply || '');
  const preserveGuidedTaskLead = shouldPreserveGuidedTaskLead(snapshot)
    && !['STEP_ENTERED', 'RESULT_CHECK', 'ALTERNATIVE_PATH', 'DELEGATE_SAFE'].includes(progress);
  const rawReply = capitalizeFirstSentence(
    dedupeSentences(
      (shouldPreserveActionLead(snapshot) || preserveGuidedTaskLead) ? rawReplyText : stripLeadMarker(rawReplyText),
    ),
  );
  if (['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP', 'PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(questionType) && rawReply) {
    const directReply = directRoleLead && !containsNormalized(rawReply, roleName)
      ? joinParts([directRoleLead, rawReply], maxLength)
      : rawReply;
    return finalizeReply(snapshot, joinParts([directReply, buildDirectQuestionTail(snapshot, rawReply)], maxLength), maxLength);
  }
  const fallback = buildFallbackReply(snapshot);

  if (!shouldUseFallback(snapshot, rawReply)) {
    const directReply = directRoleLead && !containsNormalized(rawReply, roleName)
      ? joinParts([directRoleLead, rawReply], maxLength)
      : rawReply;
    return finalizeReply(snapshot, directReply, maxLength);
  }

  const pieces = [];
  const progressLead = buildProgressLead(snapshot, rawReply);
  if (progressLead) pieces.push(progressLead);
  if (directRoleLead && !containsNormalized(rawReply, roleName)) pieces.push(directRoleLead);
  if (rawReply) pieces.push(rawReply);
  const tail = buildDirectQuestionTail(snapshot, rawReply);
  if (tail) pieces.push(tail);

  const reply = joinParts(pieces, maxLength);
  if (reply) return finalizeReply(snapshot, reply, maxLength);
  if (fallback) return finalizeReply(snapshot, fallback, maxLength);
  return finalizeReply(snapshot, rawReply, maxLength);
}
