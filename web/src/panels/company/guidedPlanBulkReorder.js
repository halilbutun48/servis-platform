export function selectGuidedReorderDraftShifts({ draftShifts, refreshedDraftShifts } = {}) {
  return Array.isArray(refreshedDraftShifts)
    ? refreshedDraftShifts
    : (Array.isArray(draftShifts) ? draftShifts : []);
}

export function buildGuidedBulkReorderPlan({ draftShifts, refreshedDraftShifts } = {}) {
  const currentDraftShifts = selectGuidedReorderDraftShifts({ draftShifts, refreshedDraftShifts });

  return {
    draftShifts: currentDraftShifts,
    ids: currentDraftShifts
      .map((shift) => Number(shift?.id))
      .filter(Number.isFinite),
  };
}
