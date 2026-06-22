import { buildClarifyingQuestionReply } from './conversationTaskStateClarifiers.js';
import {
  buildCopilotEBlockRuntimeAnswerGuide,
  buildCopilotEBlockRuntimeAnswerReply,
  buildHowToHelpReply,
  buildProductOverviewHelpReply,
  buildRoleExplanationHelpReply,
  buildScreenExplanationHelpReply,
} from './conversationTaskStateBuilders.js';
import { buildCompanySemanticOverrideReply } from './conversationTaskStateCompanyReplies.js';
import {
  buildRoomShiftSemanticOverrideReply,
  looksLikeRoomShiftClarifyingRequest,
  looksLikeRoomShiftFocusQuestion,
  looksLikeRoomShiftLiveStartInstruction,
  looksLikeRoomShiftNextActionQuestion,
  shiftBlockers,
  shiftMissingDataReply,
  shiftNextStep,
  shiftReadinessReply,
  shiftStatusText,
} from './conversationTaskStateRoomReplies.js';
import { companyPlanningCenterNextBestActionReply } from './conversationTaskStateShared.js';
import {
  buildSelectedRecordText,
  detectRepetition,
} from './conversationTaskStateSelectedRecord.js';
import {
  buildContinuityMeta,
  looksLikeShortFollowUp,
  resolveFollowUpContextQuestion,
} from './conversationTaskStateFollowUps.js';

export {
  buildClarifyingQuestionReply,
  buildProductOverviewHelpReply,
  buildRoleExplanationHelpReply,
  buildScreenExplanationHelpReply,
  buildHowToHelpReply,
  buildCompanySemanticOverrideReply,
  companyPlanningCenterNextBestActionReply,
  buildRoomShiftSemanticOverrideReply,
  buildCopilotEBlockRuntimeAnswerReply,
  buildCopilotEBlockRuntimeAnswerGuide,
  buildSelectedRecordText,
  detectRepetition,
  looksLikeShortFollowUp,
  buildContinuityMeta,
  resolveFollowUpContextQuestion,
  looksLikeRoomShiftFocusQuestion,
  looksLikeRoomShiftNextActionQuestion,
  looksLikeRoomShiftLiveStartInstruction,
  looksLikeRoomShiftClarifyingRequest,
  shiftStatusText,
  shiftBlockers,
  shiftNextStep,
  shiftReadinessReply,
  shiftMissingDataReply,
};

export function createConversationTaskStateResponses(deps = {}) {
  const {
    composeScreenPurposeWithCarry = () => '',
    normalizeVisibleReplyFragment: normalizeVisibleReplyFragmentImpl = (value) => String(value || ''),
    ensureVisibleSentence: ensureVisibleSentenceImpl = (value) => String(value || ''),
    workflowStages = () => [],
    simpleNowText = () => '',
    selectedCarrySummary = () => '',
    extractVisibleValueFromText = () => '',
  } = deps;

  return {
    buildClarifyingQuestionReply,
    buildProductOverviewHelpReply,
    buildRoleExplanationHelpReply,
    buildScreenExplanationHelpReply: (args) => buildScreenExplanationHelpReply({
      ...args,
      composeScreenPurposeWithCarry,
    }),
    buildHowToHelpReply: (args) => buildHowToHelpReply({
      ...args,
      workflowStages,
      simpleNowText,
      normalizeVisibleReplyFragment: normalizeVisibleReplyFragmentImpl,
      ensureVisibleSentence: ensureVisibleSentenceImpl,
    }),
    buildCompanySemanticOverrideReply,
    companyPlanningCenterNextBestActionReply,
    buildRoomShiftSemanticOverrideReply: (args) => buildRoomShiftSemanticOverrideReply({
      ...args,
      selectedCarrySummary,
      extractVisibleValueFromText,
      normalizeVisibleReplyFragment: normalizeVisibleReplyFragmentImpl,
      ensureVisibleSentence: ensureVisibleSentenceImpl,
    }),
    buildCopilotEBlockRuntimeAnswerReply,
    buildCopilotEBlockRuntimeAnswerGuide,
    buildSelectedRecordText,
    detectRepetition,
    looksLikeShortFollowUp,
    buildContinuityMeta,
    resolveFollowUpContextQuestion,
    looksLikeRoomShiftFocusQuestion,
    looksLikeRoomShiftNextActionQuestion,
    looksLikeRoomShiftLiveStartInstruction,
    looksLikeRoomShiftClarifyingRequest,
    shiftStatusText,
    shiftBlockers,
    shiftNextStep,
    shiftReadinessReply,
    shiftMissingDataReply,
  };
}
