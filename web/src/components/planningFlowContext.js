import { companyPath } from "../utils/paths.js";

const GUIDED_PLANNING_CONTEXTS = new Set(["COMPANY", "SCHOOL", "ORGANIZATION"]);

export function isGuidedPlanningContext(contextKey) {
  return GUIDED_PLANNING_CONTEXTS.has(String(contextKey || "").toUpperCase());
}

export function shouldOpenGuidedPlanningWorkspace(contextKey) {
  return isGuidedPlanningContext(contextKey);
}

export function guidedPlanningCompletionPath(me) {
  return companyPath(me, "/commercial-flow");
}
