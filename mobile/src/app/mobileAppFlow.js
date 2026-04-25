export async function loadRouteBundle({
  todayValue,
  preferredShiftId = null,
  resolveVisibleShift,
  fetchShiftRoute,
  fetchActiveRoute,
  saveSelectedShiftId,
  clearSelectedShiftId,
}) {
  const selectedShift = resolveVisibleShift(todayValue, preferredShiftId, null);
  const selectedShiftId = Number(selectedShift?.id || 0) || null;
  const route = selectedShiftId
    ? await fetchShiftRoute(selectedShiftId).catch(() => null)
    : await fetchActiveRoute().catch(() => null);
  const finalShiftId = Number(route?.shift?.id || selectedShiftId || 0) || null;

  if (finalShiftId) await saveSelectedShiftId(finalShiftId);
  else await clearSelectedShiftId();

  return {
    route,
    selectedShiftId: finalShiftId,
  };
}

export async function refreshRouteAfterGpsPublish({
  shiftId,
  fallbackToday = null,
  currentToday = null,
  lastTodayRefreshAtRef,
  fetchToday,
  fetchShiftRoute,
  fetchActiveRoute,
  resolveVisibleShift,
  saveSelectedShiftId,
  clearSelectedShiftId,
  loadRouteBundle,
  stateSelectedShiftId,
}) {
  const now = Date.now();
  const shouldRefreshToday = !currentToday || !lastTodayRefreshAtRef?.current || (now - lastTodayRefreshAtRef.current) >= 120000;
  const nextToday = shouldRefreshToday
    ? await fetchToday().catch(() => null)
    : (fallbackToday || currentToday || null);

  if (nextToday && shouldRefreshToday && lastTodayRefreshAtRef?.current != null) {
    lastTodayRefreshAtRef.current = now;
  }

  const preferredShiftId = Number(shiftId || stateSelectedShiftId || 0) || null;
  if (preferredShiftId) {
    const nextRoute = await fetchShiftRoute(preferredShiftId).catch(() => null);
    if (nextRoute) {
      return {
        today: nextToday || fallbackToday || currentToday || null,
        route: nextRoute,
        selectedShiftId: Number(nextRoute?.shift?.id || preferredShiftId || 0) || null,
      };
    }
  }

  return loadRouteBundle({
    todayValue: nextToday || fallbackToday || currentToday || null,
    preferredShiftId,
    resolveVisibleShift,
    fetchShiftRoute,
    fetchActiveRoute,
    saveSelectedShiftId,
    clearSelectedShiftId,
  });
}

export function resolveCurrentShiftId({ selectedShiftId, route, today }) {
  return Number(selectedShiftId || route?.shift?.id || today?.active?.id || today?.assigned?.id || 0) || null;
}

export async function applySessionFailure({
  error,
  stopVoiceGuidance,
  stopDriverBackgroundLocation,
  clearSession,
  clearLastMobileSnapshot,
  clearSelectedShiftId,
  clearPendingSessionEvent,
  resetSyncRetryState,
  resetGpsRetryState,
  setScreen,
  setRouteOps,
  setState,
  initialState,
  deviceId,
  humanizeSessionFailure,
  sessionFailureUserMessage,
}) {
  try {
    stopVoiceGuidance();
    await stopDriverBackgroundLocation();
    await Promise.all([
      clearSession(),
      clearLastMobileSnapshot(),
      clearSelectedShiftId(),
      clearPendingSessionEvent(),
    ]);
  } finally {
    resetSyncRetryState();
    resetGpsRetryState();
    setScreen("today");
    setRouteOps({ busy: false, message: "" });
    setState((prev) => ({
      ...initialState,
      loading: false,
      deviceId: prev.deviceId || deviceId,
      error: humanizeSessionFailure(error) || sessionFailureUserMessage,
      lastErrorAt: new Date().toISOString(),
    }));
  }
}

export async function consumePendingSessionEvent({
  getPendingSessionEvent,
  clearPendingSessionEvent,
  hasSession = true,
  onSessionFailure,
  setState,
  humanizeSessionFailure,
}) {
  const pendingEvent = await getPendingSessionEvent().catch(() => null);
  if (!pendingEvent) return false;
  await clearPendingSessionEvent().catch(() => null);
  if (hasSession) {
    await onSessionFailure(pendingEvent);
  } else {
    setState((prev) => ({
      ...prev,
      error: humanizeSessionFailure(pendingEvent),
      lastErrorAt: new Date().toISOString(),
    }));
  }
  return true;
}
