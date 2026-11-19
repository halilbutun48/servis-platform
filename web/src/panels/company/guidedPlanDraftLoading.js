export function guidedResumeDraftsEndpoint() {
  return "/api/shifts/guided-drafts";
}

export function selectGuidedResumeDrafts(items, ids) {
  const uniqueIds = new Set(
    (Array.isArray(ids) ? ids : [])
      .map((value) => Number(value))
      .filter(Number.isFinite),
  );
  return (Array.isArray(items) ? items : []).filter((item) => uniqueIds.has(Number(item?.id)));
}
