import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterSurfaceText,
  looksLikeClarifyingQuestionRequest as looksLikeExplicitClarifyingQuestionRequest,
  looksLikeCompanyPlanningSurfaceText,
  looksLikeDetailContinuationRequest,
  looksLikeNextBestActionQuestion,
  looksLikeOnboardingStartQuestion,
  looksLikeScreenStartQuestion,
  normalizeText,
} from './conversationTaskStateShared.js';

function normalizeQuestionText(value) {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueTextParts(parts) {
  return uniqueStrings((Array.isArray(parts) ? parts : []).map((part) => String(part || '').trim()).filter(Boolean));
}

function includeAny(text, phrases = []) {
  const haystack = normalizeQuestionText(text);
  if (!haystack) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const needle = normalizeQuestionText(phrase);
    return needle && haystack.includes(needle);
  });
}

function hasSelectionContext({
  contextPriority = null,
  screenContext = null,
  sourceScreenContext = null,
  conversationState = null,
}) {
  return Boolean(
    contextPriority?.selectedLabel
    || contextPriority?.selectedSummary
    || contextPriority?.selectedRecordStatus
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
    || screenContext?.selectedRecordStatus
    || sourceScreenContext?.selectedLabel
    || sourceScreenContext?.selectedSummary
    || sourceScreenContext?.selectedRecordStatus
    || conversationState?.taskState?.anchorLabel
    || conversationState?.taskState?.selectedLabel
    || conversationState?.taskState?.selectedSummary
    || conversationState?.lastSelectedLabel
    || conversationState?.lastSelectedSummary
  );
}

function buildSurfaceContext({
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  conversationState = null,
} = {}) {
  const normalizedPath = normalizeQuestionText(firstNonEmpty(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  const surfaceText = normalizeQuestionText(uniqueTextParts([
    normalizedPath,
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    conversationState?.uiSurface?.title,
    conversationState?.uiSurface?.label,
  ]).join(' • '));
  const planningCenterSurfaceText = normalizeQuestionText(companyPlanningCenterSurfaceText({
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  }));
  return {
    path: normalizedPath,
    surfaceText,
    planningCenterSurfaceText,
    isCompanyPlanningSurface: normalizedPath === '/company'
      || looksLikeCompanyPlanningSurfaceText(surfaceText)
      || looksLikeCompanyPlanningSurfaceText(planningCenterSurfaceText),
    isCompanyOperationsSurface: normalizedPath.includes('/company/operations') || includeAny(surfaceText, ['operasyon', 'operations']),
    isRoomShiftsSurface: normalizedPath.includes('/room/shifts') || includeAny(surfaceText, ['vardiya', 'shift', 'vardiyalar']),
    isPersonelLiveSurface: normalizedPath.includes('/personel/live') || normalizedPath.includes('/personel/my') || includeAny(surfaceText, ['servis durumu', 'my ride', 'personel']),
    isParentLiveSurface: normalizedPath.includes('/parent/live') || includeAny(surfaceText, ['veli', 'çocuk', 'cocuk']),
    isCommercialSurface: normalizedPath.includes('/company/agreements')
      || normalizedPath.includes('/company/commercial-flow')
      || normalizedPath.includes('/commercial-core')
      || includeAny(surfaceText, ['teklif', 'sözleşme', 'sozlesme', 'commercial', 'agreement']),
    isSelectionSurface: normalizedPath.includes('/shared/feedback') || normalizedPath.includes('/shared/kvkk') || normalizedPath.includes('/room/operation-health'),
  };
}

function buildClarifyingQuestionBody({
  message = '',
  questionType = '',
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  contextPriority = null,
  roleClarifyingQuestion = '',
  preferRoleClarifyingQuestion = false,
  conversationState = null,
}) {
  const text = normalizeQuestionText(message);
  if (!text) return '';
  if (looksLikeDetailContinuationRequest(text) || looksLikeNextBestActionQuestion(text) || looksLikeOnboardingStartQuestion(text) || looksLikeScreenStartQuestion(text)) return '';

  const selectedContextPresent = hasSelectionContext({
    contextPriority,
    screenContext,
    sourceScreenContext,
    conversationState,
  });
  const surface = buildSurfaceContext({
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  });

  const explicitClarifyingRequest = looksLikeExplicitClarifyingQuestionRequest(message);
  const questionTypeKey = String(questionType || '');
  if (preferRoleClarifyingQuestion && !selectedContextPresent && !explicitClarifyingRequest) {
    return firstNonEmpty(roleClarifyingQuestion, 'Hangi kayıt için bakayım?');
  }
  const genericScreenPurposeAsk = includeAny(text, [
    'bu ne',
    'ne bu',
    'burasi ne',
    'bura ne',
    'bu ekran ne',
    'bu panel ne',
    'bu sayfa ne',
  ]);
  const genericSelectionAsk = includeAny(text, [
    'bunu nasil yapacagim',
    'bunu nasil yapayim',
    'hangisini seceyim',
    'hangisini secmeliyim',
    'hangisi daha iyi',
    'hangi birini seceyim',
    'hangi birini secmeliyim',
    'bunu baslatayim mi',
    'bunu baslatmaliyim mi',
    'bunu baslatayim',
    'nasil baslatayim',
    'nasıl başlatayım',
  ]);
  const screenPurposeQuestionTypes = new Set([
    'SCREEN_FOCUS',
    'SCREEN_PURPOSE',
    'SCREEN_EXPLANATION_HELP',
    'NEXT_STEP',
    'NEXT_ACTION',
    'NEXT_BEST_ACTION',
    'FIRST_CONTROL',
    'RISK_LIST',
    'DETAIL_FLOW',
  ]);
  if (
    screenPurposeQuestionTypes.has(questionTypeKey)
    && !explicitClarifyingRequest
    && !genericSelectionAsk
    && !(selectedContextPresent && genericScreenPurposeAsk)
  ) {
    return '';
  }

  if (questionTypeKey === 'SCREEN_PURPOSE' && !selectedContextPresent && genericScreenPurposeAsk) return '';
  if (!explicitClarifyingRequest && !genericScreenPurposeAsk && !genericSelectionAsk && !surface.isCompanyPlanningSurface && !surface.isRoomShiftsSurface && !surface.isPersonelLiveSurface && !surface.isParentLiveSurface && !surface.isCommercialSurface && !selectedContextPresent) {
    return '';
  }

  if (
    selectedContextPresent
    && (genericScreenPurposeAsk || genericSelectionAsk || explicitClarifyingRequest)
    && !surface.isCompanyPlanningSurface
    && !surface.isCommercialSurface
  ) {
    return 'Hangi kayıt için bakayım? Ekranın amacını mı, seçili kaydı mı netleştireyim?';
  }

  if (
    selectedContextPresent
    && (genericSelectionAsk || explicitClarifyingRequest)
    && surface.isCompanyPlanningSurface
  ) {
    return 'Hangi kayıt için bakayım? Ekranın amacını mı, seçili kaydı mı netleştireyim?';
  }

  if (surface.isCompanyPlanningSurface || surface.isCommercialSurface) {
    const companySelectionAsk = genericSelectionAsk
      || explicitClarifyingRequest
      || includeAny(text, ['hangisi daha iyi', 'hangisini seceyim', 'hangisini seçeyim', 'karsilastir', 'karşılaştır', 'kıyas', 'farki ne', 'farkı ne']);
    if (companySelectionAsk) {
      return 'Teklifi hangi açıdan kıyaslayayım: fiyat, süre, risk veya sözleşme uygunluğu?';
    }
  }

  if (surface.isCompanyOperationsSurface && includeAny(text, ['bunu ne yapacağım', 'bunu ne yapacagim'])) {
    return 'Bu operasyon kaydında açık işi mi, sorumlu rolü mü, yoksa sonraki adımı mı netleştireyim?';
  }

  if (surface.isRoomShiftsSurface) {
    if (questionTypeKey === 'WHY_BLOCKED' || genericSelectionAsk || explicitClarifyingRequest) {
      return 'Hangi vardiya için bakayım: canlı başlatma mı, araç-sürücü kontrolü mü, yoksa eksik bilgi mi?';
    }
  }

  if (surface.isPersonelLiveSurface) {
    if (questionTypeKey === 'WHY_BLOCKED' || genericSelectionAsk || explicitClarifyingRequest) {
      return 'Hangi servis kaydı için bakayım: servis mi, araç mı, yoksa durak / saat bilgisi mi?';
    }
  }

  if (surface.isParentLiveSurface) {
    if (!selectedContextPresent && (questionTypeKey === 'LOCATION_HELP' || genericSelectionAsk || explicitClarifyingRequest)) {
      return 'Hangi öğrenci servisi için bakayım: servisin konumunu mu, geliş saatini mi, yoksa bağlı vardiyayı mı?';
    }
  }

  if (explicitClarifyingRequest) {
    return firstNonEmpty(roleClarifyingQuestion, 'Hangi kayıt için bakayım?');
  }

  return firstNonEmpty(
    surface.isSelectionSurface ? 'Hangi kayıt için bakayım?' : '',
    '',
  );
}

export function resolveClarifyingQuestionText(options = {}) {
  return buildClarifyingQuestionBody(options);
}

export function buildClarifyingQuestionReply({
  safeAlternative = '',
  roleClarifyingQuestion = '',
  preferRoleClarifyingQuestion = false,
  ...options
} = {}) {
  const clarifyingQuestion = buildClarifyingQuestionBody({
    ...options,
    roleClarifyingQuestion,
    preferRoleClarifyingQuestion,
  });
  if (!clarifyingQuestion) return '';
  const alternative = firstNonEmpty(safeAlternative, 'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol edelim.');
  return uniqueTextParts([
    `Netleştirelim: ${clarifyingQuestion}`,
    `Alternatif: ${alternative}`,
  ]).join(' ');
}
