import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import { getSeferAbiReasoningRolePlaybook } from './seferAbiReasoningAssistant.js';
import {
  looksLikeClarifyingQuestionRequest,
  looksLikeCompanyPlanningSurfaceText,
  normalizeLooseText,
} from './conversationTaskStateShared.js';

export function buildClarifyingQuestionReply({
  message,
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  contextPriority = null,
  userRole = '',
  user = null,
}) {
  if (!looksLikeClarifyingQuestionRequest(message)) return '';
  const hasSelection = Boolean(
    contextPriority?.selectedLabel
    || contextPriority?.selectedSummary
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
    || sourceScreenContext?.selectedLabel
    || sourceScreenContext?.selectedSummary
  );
  if (hasSelection) return '';
  const surfaceText = normalizeLooseText(uniqueStrings([
    screenPath,
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
  ]).join(' • '));
  const isCompanyPlanningSurface = String(screenPath || '') === '/company' || looksLikeCompanyPlanningSurfaceText(surfaceText);
  const clarifyingQuestion = isCompanyPlanningSurface
    ? 'Hangi plan, vardiya, talep veya sözleşme kaydı için bakmamı istiyorsun?'
    : firstNonEmpty(getSeferAbiReasoningRolePlaybook(userRole, user).clarifyingQuestion, 'Hangi kayıt için bakayım?');
  return `${clarifyingQuestion} Seçili kayıt yoksa önce hangi kayıt üzerinde ilerlediğini seçmeni isteyebilirim.`.trim();
}
