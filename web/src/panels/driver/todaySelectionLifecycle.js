import { copilotSelectionContextKey } from "../../utils/copilotSelection.js";

export function shouldClearDriverTodaySelection(previousSelection, nextSelection) {
  const previousKey = copilotSelectionContextKey(previousSelection);
  const nextKey = copilotSelectionContextKey(nextSelection);
  return Boolean(previousKey && previousKey !== nextKey);
}
