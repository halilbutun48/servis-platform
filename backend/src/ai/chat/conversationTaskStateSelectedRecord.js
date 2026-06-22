import { firstNonEmpty } from './replyShapes.js';
import { normalizeText } from './conversationTaskStateShared.js';

export function buildSelectedRecordText(snapshot) {
  return firstNonEmpty(
    snapshot?.taskState?.selectedRecordStatus,
    snapshot?.taskState?.selectedSummary,
    snapshot?.taskState?.anchorLabel,
    snapshot?.selectedRecordStatus,
    snapshot?.analysis?.selectedRecordStatus,
    snapshot?.screenContext?.selectedSummary,
    snapshot?.screenContext?.selectedLabel,
    snapshot?.screenContext?.selectedEntityLabel,
    '',
  );
}

export function detectRepetition(snapshot) {
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
