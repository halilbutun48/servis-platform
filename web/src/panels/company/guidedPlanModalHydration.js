export function alignGuidedPlanResetBaseline(resetState, guidedBatchIdempotencyKey) {
  return {
    ...(resetState || {}),
    guidedBatchIdempotencyKey: String(guidedBatchIdempotencyKey || resetState?.guidedBatchIdempotencyKey || ""),
  };
}

export function shouldDiscoverGuidedDraftCandidates({ token, routeRefreshMode = false } = {}) {
  void routeRefreshMode;
  return Boolean(String(token || "").trim());
}
