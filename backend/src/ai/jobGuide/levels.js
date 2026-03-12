export const GUIDE_LEVELS = ["SHORT", "STEP_BY_STEP", "WHY"];

export function normalizeGuideLevel(input) {
  const val = String(input || "SHORT").toUpperCase();
  return GUIDE_LEVELS.includes(val) ? val : "SHORT";
}

export function adaptGuideContent(level, data) {
  const guideLevel = normalizeGuideLevel(level);
  const out = { ...(data || {}), guideLevel };
  if (guideLevel === "SHORT") {
    out.stepByStep = (out.stepByStep || []).slice(0, 3);
    out.commonMistakes = (out.commonMistakes || []).slice(0, 2);
    out.doneChecklist = (out.doneChecklist || []).slice(0, 2);
    out.simpleTerms = (out.simpleTerms || []).slice(0, 3);
    out.beforeYouStart = (out.beforeYouStart || []).slice(0, 4);
    out.quickActions = (out.quickActions || []).slice(0, 2);
    out.ifStuck = (out.ifStuck || []).slice(0, 2);
  }
  if (guideLevel === "WHY") {
    out.screenExplanation = out.screenExplanation || out.jobPurpose || out.plainSummary || "Bu ekran işi doğru sırayla tamamlamak için yardımcı olur.";
  }
  return out;
}
