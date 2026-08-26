import { normalizeVisibleTerminology } from '../chat/replyShapes.js';

export const GUIDE_LEVELS = ["SHORT", "STEP_BY_STEP", "WHY"];

export function normalizeGuideLevel(input) {
  const val = String(input || "SHORT").toUpperCase();
  return GUIDE_LEVELS.includes(val) ? val : "SHORT";
}

function normalizeText(value) {
  return typeof value === 'string' ? normalizeVisibleTerminology(value) : value;
}

function normalizeTextList(value) {
  return Array.isArray(value) ? value.map(normalizeText) : value;
}

function normalizeRows(value, fields) {
  if (!Array.isArray(value)) return value;
  return value.map((row) => {
    if (!row || typeof row !== 'object') return normalizeText(row);
    const next = { ...row };
    for (const field of fields) next[field] = normalizeText(next[field]);
    return next;
  });
}

function normalizeGuidePresentation(data) {
  const out = { ...(data || {}) };
  for (const field of [
    'jobTitle', 'jobPurpose', 'plainSummary', 'whatToDoNow', 'whatToDoNext',
    'doNotDo', 'screenExplanation', 'menuPurpose', 'precheckLabel',
  ]) out[field] = normalizeText(out[field]);
  for (const field of [
    'stepByStep', 'commonMistakes', 'doneChecklist', 'simpleTerms', 'firstControls',
    'stuckChecks', 'chatQuestions', 'dataRules', 'beforeYouStart', 'whyBlocked',
    'lockedActionReasons',
  ]) out[field] = normalizeTextList(out[field]);
  out.buttonGuides = normalizeRows(out.buttonGuides, ['label', 'purpose', 'whenToUse', 'whatHappens', 'disabledReason', 'riskNote']);
  out.screenMenus = normalizeRows(out.screenMenus, ['label', 'purpose', 'reason', 'why']);
  out.workflowStages = normalizeRows(out.workflowStages, ['title', 'action', 'doneWhen', 'ifBlocked']);
  out.nextScreens = normalizeRows(out.nextScreens, ['label', 'reason', 'why']);
  out.fieldGuides = normalizeRows(out.fieldGuides, ['label', 'meaning', 'howToRead', 'risk', 'actionHint']);
  out.badgeGuides = normalizeRows(out.badgeGuides, ['label', 'meaning', 'actionHint']);
  out.quickActions = normalizeRows(out.quickActions, ['label', 'purpose', 'reason', 'whenToUse', 'whatHappens']);
  out.ifStuck = normalizeRows(out.ifStuck, ['problem', 'advice']);
  if (out.menuPurpose && typeof out.menuPurpose === 'object') {
    out.menuPurpose = normalizeRows([out.menuPurpose], ['title', 'description', 'forWhom', 'firstStep'])[0];
  }
  if (out.copyOutputs && typeof out.copyOutputs === 'object') {
    out.copyOutputs = normalizeRows([out.copyOutputs], ['opsNote', 'supportDraft'])[0];
  }
  return out;
}

export function adaptGuideContent(level, data) {
  const guideLevel = normalizeGuideLevel(level);
  const out = { ...normalizeGuidePresentation(data), guideLevel };
  if (guideLevel === "SHORT") {
    out.stepByStep = (out.stepByStep || []).slice(0, 3);
    out.commonMistakes = (out.commonMistakes || []).slice(0, 2);
    out.doneChecklist = (out.doneChecklist || []).slice(0, 2);
    out.simpleTerms = (out.simpleTerms || []).slice(0, 3);
    out.beforeYouStart = (out.beforeYouStart || []).slice(0, 4);
    out.quickActions = (out.quickActions || []).slice(0, 2);
    out.ifStuck = (out.ifStuck || []).slice(0, 2);
    out.buttonGuides = (out.buttonGuides || []).slice(0, 4);
    out.screenMenus = (out.screenMenus || []).slice(0, 4);
  }
  if (guideLevel === "WHY") {
    out.screenExplanation = out.screenExplanation || out.jobPurpose || out.plainSummary || "Bu ekran işi doğru sırayla tamamlamak için yardımcı olur.";
  }
  return out;
}
