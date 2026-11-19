export function shouldPreserveResumedGuidedDraft({ resumedFromServer = false, organization = false, draftShiftIds = [] } = {}) {
  const ids = Array.from(
    new Set(
      (Array.isArray(draftShiftIds) ? draftShiftIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
  // An organization plan can be restored from persisted guided-form state
  // without passing through the server-draft chooser. Once it has a real
  // draft id, preserve that business record and synchronize edited stops.
  return ids.length > 0 && (Boolean(resumedFromServer) || Boolean(organization));
}
