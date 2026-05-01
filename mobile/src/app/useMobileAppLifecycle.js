import { useEffect } from 'react';
import { AppState } from 'react-native';
import { clearPendingSessionEvent, getLastMobileSnapshot, getPendingSessionEvent, getSelectedChildId, getSelectedShiftId, getSession, getVoiceGuidanceEnabled } from '../lib/storage';
import { ensureDeviceId } from '../lib/api';
import { stopDriverBackgroundLocation, syncDriverBackgroundLocation } from '../lib/backgroundGps';
import { GPS_PUBLISH_INTERVAL_MS } from '../lib/gps';
import { getLatestDriverAwarenessNotification, markDriverAwarenessAnnounced } from './driverAwarenessState';
import { applyGpsRuntimeSnapshot, decorateGpsState, hydrateStateFromSnapshot, isNetworkError, readGpsRuntimeSnapshot } from './mobileAppState';
import { buildCompletionCueKey, buildDriverChangeCueKey, buildVoiceCueKey, buildVoiceWelcomeKey, speakDriverChangeAlert, speakNextStop, speakReachedStopAndNext, speakRouteCompleted, speakShiftWelcome } from '../lib/voice';
import { useDriverRealtimeResync } from './useDriverRealtimeResync';

export function useMobileAppLifecycle({
  state,
  setState,
  syncSignedIn,
  refreshGpsStatus,
  applySessionFailure,
  appStateRef,
  lastTodayRefreshAtRef,
  lastVoiceCueRef,
  lastVoiceWelcomeRef,
  lastVoiceCompletionRef,
  lastDriverAwarenessCueRef,
  apiBaseUrl,
}) {
  useDriverRealtimeResync({
    apiBaseUrl,
    sessionToken: state.session?.token || '',
    role: state.me?.role || '',
    requirePinChange: Boolean(state.me?.requirePinChange),
    onSync: () => syncSignedIn({ soft: true, force: true }),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [deviceId, session, voiceEnabled, selectedShiftId, selectedChildId, snapshot, pendingSessionEvent] = await Promise.all([
          ensureDeviceId(),
          getSession(),
          getVoiceGuidanceEnabled(),
          getSelectedShiftId().catch(() => null),
          getSelectedChildId().catch(() => null),
          getLastMobileSnapshot().catch(() => null),
          getPendingSessionEvent().catch(() => null),
        ]);
        if (!alive) return;

        if (snapshot) {
          setState(hydrateStateFromSnapshot(snapshot, { session, deviceId, voiceEnabled, selectedShiftId, selectedChildId }));
          if (snapshot?.lastSyncAt) lastTodayRefreshAtRef.current = new Date(snapshot.lastSyncAt).getTime() || 0;
          lastDriverAwarenessCueRef.current = buildDriverChangeCueKey(snapshot?.driverAwareness?.latestRelevant || snapshot?.driverAwareness?.items?.[0] || null);
        }

        if (pendingSessionEvent && session?.token) {
          await clearPendingSessionEvent().catch(() => null);
          await applySessionFailure(pendingSessionEvent);
          return;
        }

        if (!session?.token) {
          if (pendingSessionEvent) {
            await clearPendingSessionEvent().catch(() => null);
          }
          setState((prev) => ({
            ...(snapshot ? prev : hydrateStateFromSnapshot(null, { session: null, deviceId, voiceEnabled, selectedShiftId, selectedChildId })),
            loading: false,
            session: session || null,
            deviceId,
            voiceEnabled,
            selectedShiftId: selectedShiftId || snapshot?.selectedShiftId || null,
            selectedChildId: selectedChildId || snapshot?.selectedChildId || null,
          }));
          return;
        }

        if (!snapshot) {
          setState((prev) => ({ ...prev, session, deviceId, voiceEnabled, selectedShiftId: selectedShiftId || null, selectedChildId: selectedChildId || null }));
        }
        await syncSignedIn({ soft: Boolean(snapshot) });
      } catch (error) {
        if (!alive) return;
        if (String(error?.code || '').toUpperCase().includes('SESSION') || String(error?.name || '').toUpperCase().includes('SESSION')) {
          await applySessionFailure(error);
          return;
        }
        const message = isNetworkError(error) ? 'Bağlantı yok. Veri eski olabilir.' : String(error?.message || 'Beklenmeyen hata');
        setState((prev) => {
          const nextNet = isNetworkError(error)
            ? {
                status: 'offline',
                message: 'Bağlantı yok. Veri eski olabilir.',
                lastOnlineAt: prev.net?.lastOnlineAt || '',
                lastOfflineAt: new Date().toISOString(),
                lastRecoveryAt: prev.net?.lastRecoveryAt || '',
              }
            : prev.net;
          return {
            ...prev,
            loading: false,
            syncing: false,
            usingCachedData: Boolean(prev.today || prev.route),
            error: message,
            lastErrorAt: new Date().toISOString(),
            net: nextNet,
            gps: decorateGpsState(prev.gps, prev.route, {
              usingCachedData: Boolean(prev.today || prev.route),
              netStatus: nextNet?.status || prev.net?.status || 'unknown',
              selectedShiftId: prev.selectedShiftId,
            }),
          };
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [applySessionFailure, lastDriverAwarenessCueRef, lastTodayRefreshAtRef, setState, syncSignedIn, state.me?.requirePinChange]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      syncDriverBackgroundLocation({
        sessionToken: state.session?.token,
        role: state.me?.role,
        requirePinChange: state.me?.requirePinChange,
        today: state.today,
        route: state.route,
        kvkkBlocking: state.kvkk?.blocking,
        appState: nextState,
        selectedShiftId: state.selectedShiftId,
      }).then((runtime) => {
        if (!runtime) return;
        return readGpsRuntimeSnapshot(runtime.reason, { appState: nextState }).then((snapshot) =>
          applyGpsRuntimeSnapshot(setState, snapshot)
        );
      }).catch(() => null);

      if (nextState === 'active') {
        syncSignedIn({ soft: true, force: true }).catch(() => null);
        refreshGpsStatus({ publishNow: true, force: true }).catch(() => null);
      }
    });
    if (appStateRef.current === 'active') {
      syncDriverBackgroundLocation({
        sessionToken: state.session?.token,
        role: state.me?.role,
        requirePinChange: state.me?.requirePinChange,
        today: state.today,
        route: state.route,
        kvkkBlocking: state.kvkk?.blocking,
        appState: 'active',
        selectedShiftId: state.selectedShiftId,
      }).then((runtime) => {
        if (!runtime) return;
        return readGpsRuntimeSnapshot(runtime.reason, { appState: 'active' }).then((snapshot) =>
          applyGpsRuntimeSnapshot(setState, snapshot)
        );
      }).catch(() => null);
    }

    return () => sub.remove();
  }, [appStateRef, applyGpsRuntimeSnapshot, refreshGpsStatus, setState, state.kvkk?.blocking, state.me?.requirePinChange, state.me?.role, state.route, state.selectedShiftId, state.session?.token, state.today, syncSignedIn]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange) return;
    const timer = setInterval(() => {
      syncSignedIn({ soft: true }).catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [state.session?.token, state.me?.requirePinChange, state.selectedShiftId, syncSignedIn]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange || String(state.me?.role || '').toUpperCase() !== 'DRIVER') {
      stopDriverBackgroundLocation().catch(() => null);
      return;
    }

    syncDriverBackgroundLocation({
      sessionToken: state.session?.token,
      role: state.me?.role,
      requirePinChange: state.me?.requirePinChange,
      today: state.today,
      route: state.route,
      kvkkBlocking: state.kvkk?.blocking,
      appState: appStateRef.current,
      selectedShiftId: state.selectedShiftId,
    }).then((runtime) => {
      if (!runtime) return;
      return readGpsRuntimeSnapshot(runtime.reason, { appState: appStateRef.current }).then((snapshot) =>
        applyGpsRuntimeSnapshot(setState, snapshot)
      );
    }).catch(() => null);

    refreshGpsStatus({ publishNow: false }).catch(() => null);
    const timer = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      refreshGpsStatus({ publishNow: true }).catch(() => null);
    }, GPS_PUBLISH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [appStateRef, applyGpsRuntimeSnapshot, refreshGpsStatus, setState, state.kvkk?.blocking, state.me?.requirePinChange, state.me?.role, state.route, state.selectedShiftId, state.session?.token, state.today]);

  useEffect(() => {
    if (!state.voiceEnabled) return;
    const completionKey = buildCompletionCueKey(state.route);
    if (completionKey && completionKey !== lastVoiceCompletionRef.current) {
      speakRouteCompleted();
      lastVoiceCompletionRef.current = completionKey;
      return;
    }

    const welcomeKey = buildVoiceWelcomeKey(state.today, state.route);
    if (welcomeKey && welcomeKey !== lastVoiceWelcomeRef.current) {
      speakShiftWelcome(state.today, state.route);
      lastVoiceWelcomeRef.current = welcomeKey;
      lastVoiceCueRef.current = buildVoiceCueKey(state.route);
      return;
    }

    const cueKey = buildVoiceCueKey(state.route);
    if (!cueKey || cueKey === lastVoiceCueRef.current || String(cueKey).startsWith('done:')) return;
    speakNextStop(state.route);
    lastVoiceCueRef.current = cueKey;
  }, [lastVoiceCompletionRef, lastVoiceCueRef, lastVoiceWelcomeRef, state.route, state.today, state.voiceEnabled]);

  useEffect(() => {
    if (!state.driverAwareness?.latestRelevant) return;
    const latest = getLatestDriverAwarenessNotification(state.driverAwareness);
    const cueKey = buildDriverChangeCueKey(latest);
    if (!latest || !cueKey || cueKey === lastDriverAwarenessCueRef.current) return;
    speakDriverChangeAlert(latest);
    markDriverAwarenessAnnounced(state.driverAwareness, latest, new Date().toISOString());
    lastDriverAwarenessCueRef.current = cueKey;
  }, [lastDriverAwarenessCueRef, state.driverAwareness]);
}
