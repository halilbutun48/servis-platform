import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, SafeAreaView, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import {
  clearLastMobileSnapshot,
  clearPendingSessionEvent,
  clearSelectedShiftId,
  clearSession,
  getLastMobileSnapshot,
  getPendingSessionEvent,
  getSelectedShiftId,
  getSession,
  getVoiceGuidanceEnabled,
  saveLastMobileSnapshot,
  saveSelectedShiftId,
  saveSession,
  saveVoiceGuidanceEnabled,
} from './src/lib/storage';
import {
  acceptKvkkRequiredMany,
  changeDriverPin,
  completeDriverShift,
  ensureDeviceId,
  fetchActiveRoute,
  fetchHealth,
  fetchKvkkCurrent,
  fetchMe,
  fetchShiftRoute,
  fetchToday,
  getApiBaseUrl,
  isKvkkBlockingError,
  isSessionFailureError,
  loginDriver,
  logoutDriver,
  markDriverStopReached,
  pauseDriverShift,
  publishGps,
  reopenDriverStop,
  resumeDriverShift,
  skipDriverStop,
  startDriverShift,
  undoDriverStop,
} from './src/lib/api';
import {
  buildGpsPayload,
  formatGpsCoords,
  GPS_PUBLISH_INTERVAL_MS,
  permissionTextFromStatus,
  resolveGpsPublishTarget,
  resolveVisibleShift,
} from './src/lib/gps';
import { buildCompletionCueKey, buildVoiceCueKey, buildVoiceWelcomeKey, speakNextStop, speakReachedStopAndNext, speakRouteCompleted, speakShiftWelcome, speakStopEta, stopVoiceGuidance } from './src/lib/voice';
import { deriveRouteTransition, stopDriverBackgroundLocation, syncDriverBackgroundLocation } from './src/lib/backgroundGps';
import { useDriverRealtimeResync } from './src/app/useDriverRealtimeResync';
import MobileAppContent from './src/app/MobileAppContent';
import { createMobileAppHandlers } from './src/app/mobileAppHandlers';
import { DEFAULT_GPS, DEFAULT_KVKK, RELEASE_INFO, applyGpsRuntimeSnapshot, buildLocalPreviewSnapshot, buildMobileSnapshot, buildRetryMeta, buildSignedInSyncArtifacts, canRunRetryWindow, decorateGpsState, humanize, humanizeGpsError, humanizeSessionFailure, hydrateStateFromSnapshot, initialState, isNetworkError, nextKvkkState, readGpsRuntimeSnapshot } from './src/app/mobileAppState';
import {
  applySessionFailure as applySessionFailureFlow,
  consumePendingSessionEvent as consumePendingSessionEventFlow,
  loadRouteBundle as loadRouteBundleFlow,
  refreshRouteAfterGpsPublish as refreshRouteAfterGpsPublishFlow,
  resolveCurrentShiftId as resolveCurrentShiftIdFlow,
} from './src/app/mobileAppFlow';
const SESSION_FAILURE_USER_MESSAGE = 'Oturum kapandı. Yeniden giriş yapın.';
// M57.2 check token: Baglanti yok. Veri eski olabilir.
// M57.2 check token: Baglanti geri geldi, bilgiler yenileniyor.
const M50_RELEASE_INFO_SENTINEL = 'releaseInfo={RELEASE_INFO}';
const M57_4_RELEASE_INFO_MARKERS = {
  androidPreview: 'Preview APK hazir',
  productionBundle: 'Production AAB hazir',
  releaseDiscipline: 'Internal preview once, production AAB later',
};
const M82_8_SPLIT_SCREEN_SENTINEL = { RouteScreen: 'RouteScreen', LiveScreen: 'LiveScreen' };

export default function App() {
  const [state, setState] = useState(initialState);
  const [screen, setScreen] = useState('today');
  const [routeOps, setRouteOps] = useState({ busy: false, message: '' });
  const syncBusyRef = useRef(false);
  const gpsBusyRef = useRef(false);
  const lastVoiceCueRef = useRef('');
  const lastVoiceWelcomeRef = useRef('');
  const lastVoiceCompletionRef = useRef('');
  const appStateRef = useRef(AppState.currentState || 'active');
  const syncRetryCountRef = useRef(0);
  const syncNextRetryAtRef = useRef(0);
  const gpsRetryCountRef = useRef(0);
  const gpsNextRetryAtRef = useRef(0);
  const lastTodayRefreshAtRef = useRef(0);

  function resetSyncRetryState() {
    syncRetryCountRef.current = 0;
    syncNextRetryAtRef.current = 0;
  }

  function resetGpsRetryState() {
    gpsRetryCountRef.current = 0;
    gpsNextRetryAtRef.current = 0;
  }
  async function applySessionFailure(error) {
    await applySessionFailureFlow({
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
      deviceId: state.deviceId,
      humanizeSessionFailure,
      sessionFailureUserMessage: SESSION_FAILURE_USER_MESSAGE,
    });
    syncBusyRef.current = false;
    gpsBusyRef.current = false;
    lastTodayRefreshAtRef.current = 0;
  }

  async function consumePendingSessionEvent(options = {}) {
    return consumePendingSessionEventFlow({
      getPendingSessionEvent,
      clearPendingSessionEvent,
      hasSession: options?.hasSession ?? Boolean(state.session?.token),
      onSessionFailure: applySessionFailure,
      setState,
      humanizeSessionFailure,
    });
  }

  async function syncSignedIn({ soft = false, preferredShiftIdOverride = null, force = false } = {}) {
    if (syncBusyRef.current) return;
    if (soft && !canRunRetryWindow(syncNextRetryAtRef.current, force)) return;
    syncBusyRef.current = true;

    if (soft) {
      setState((prev) => ({ ...prev, syncing: true, error: '' }));
    } else {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
    }

    try {
      const preferredShiftId = preferredShiftIdOverride || state.selectedShiftId || (await getSelectedShiftId().catch(() => null));
      const health = await fetchHealth();
      const me = await fetchMe();
      const latestSession = await getSession().catch(() => null);
      const nextSession = latestSession?.token && latestSession.token !== state.session?.token
        ? {
            ...latestSession,
            deviceId: latestSession.deviceId || state.session?.deviceId || '',
          }
        : state.session;

      if (String(me?.role || '').trim().toUpperCase() !== 'DRIVER') {
        const lastSyncAt = new Date().toISOString();
        resetSyncRetryState();
        const nextNet = {
          status: 'online',
          message: 'Bağlantı var.',
          lastOnlineAt: lastSyncAt,
          lastOfflineAt: state.net?.lastOfflineAt || '',
          lastRecoveryAt: state.net?.status === 'offline' ? lastSyncAt : (state.net?.lastRecoveryAt || ''),
          retryCount: 0,
          nextRetryAt: '',
        };

        await Promise.all([
          clearSelectedShiftId().catch(() => null),
          clearPendingSessionEvent().catch(() => null),
          saveLastMobileSnapshot(buildMobileSnapshot({
            me,
            health,
            net: nextNet,
            kvkk: DEFAULT_KVKK,
            gps: DEFAULT_GPS,
            lastSyncAt,
            lastErrorAt: '',
            selectedShiftId: null,
          })),
        ]);

        setRouteOps({ busy: false, message: '' });
        setState((prev) => ({
          ...prev,
          loading: false,
          syncing: false,
          usingCachedData: false,
          session: nextSession || prev.session,
          deviceId: nextSession?.deviceId || prev.deviceId,
          me,
          today: null,
          route: null,
          health,
          net: nextNet,
          gps: { ...DEFAULT_GPS },
          kvkk: { ...DEFAULT_KVKK },
          selectedShiftId: null,
          error: '',
          lastErrorAt: '',
          lastSyncAt,
        }));
        return;
      }

      const [today, kvkkCurrent] = await Promise.all([
        fetchToday().catch(() => null),
        fetchKvkkCurrent().catch(() => null),
      ]);
      const routeBundle = await loadRouteBundleFlow({
        todayValue: today,
        preferredShiftId,
        resolveVisibleShift,
        fetchShiftRoute,
        fetchActiveRoute,
        saveSelectedShiftId,
        clearSelectedShiftId,
      });
      const lastSyncAt = new Date().toISOString();
      lastTodayRefreshAtRef.current = Date.now();
      resetSyncRetryState();
      const syncArtifacts = buildSignedInSyncArtifacts({
        state,
        routeBundle,
        me,
        today,
        health,
        kvkkCurrent,
        lastSyncAt,
      });
      const nextKvkk = syncArtifacts.nextKvkk;
      const nextNet = syncArtifacts.nextNet;
      const nextGps = syncArtifacts.nextGps;

      await Promise.all([
        saveLastMobileSnapshot(syncArtifacts.snapshot),
        clearPendingSessionEvent().catch(() => null),
      ]);

      setState((prev) => ({
        ...prev,
        loading: false,
        syncing: false,
        usingCachedData: false,
        session: nextSession || prev.session,
        deviceId: nextSession?.deviceId || prev.deviceId,
        net: nextNet,
        me,
        today,
        route: routeBundle.route,
        health,
        selectedShiftId: syncArtifacts.selectedShiftId,
        kvkk: nextKvkk,
        gps: nextGps,
        error: '',
        lastSyncAt,
      }));
    } catch (error) {
      if (isSessionFailureError(error)) {
        await applySessionFailure(error);
        return;
      }

      const offline = isNetworkError(error);
      const retryMeta = offline ? buildRetryMeta(syncRetryCountRef.current + 1, 15000, 180000) : null;
      if (retryMeta) {
        syncRetryCountRef.current = retryMeta.retryCount;
        syncNextRetryAtRef.current = Date.now() + retryMeta.waitMs;
      }
      const msg = offline ? 'Bağlantı yok. Veri eski olabilir.' : humanize(error);
      setState((prev) => {
        const nextNet = offline
          ? {
              status: 'offline',
              message: 'Bağlantı yok. Veri eski olabilir.',
              lastOnlineAt: prev.net?.lastOnlineAt || '',
              lastOfflineAt: new Date().toISOString(),
              lastRecoveryAt: prev.net?.lastRecoveryAt || '',
              retryCount: retryMeta?.retryCount || prev.net?.retryCount || 0,
              nextRetryAt: retryMeta?.nextRetryAt || prev.net?.nextRetryAt || '',
            }
          : prev.net;
        return {
          ...prev,
          loading: false,
          syncing: false,
          usingCachedData: Boolean(prev.today || prev.route),
          health: prev.health,
          net: nextNet,
          gps: decorateGpsState(prev.gps, prev.route, {
            usingCachedData: Boolean(prev.today || prev.route),
            netStatus: nextNet?.status || prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
          error: msg,
          lastErrorAt: new Date().toISOString(),
        };
      });
      throw error;
    } finally {
      syncBusyRef.current = false;
    }
  }

  async function refreshGpsStatus({ requestPermission = false, publishNow = false, force = false } = {}) {
    if (gpsBusyRef.current) return;
    if (publishNow && !requestPermission && !canRunRetryWindow(gpsNextRetryAtRef.current, force)) return;
    gpsBusyRef.current = true;

    let backgroundSnapshot = {};
    const target = resolveGpsPublishTarget(state.today, state.route, state.selectedShiftId);
    setState((prev) => ({
      ...prev,
      gps: decorateGpsState({
        ...prev.gps,
        shiftId: target.shiftId,
        vehicleId: target.vehicleId,
        lastAttemptAt: new Date().toISOString(),
        publishState: publishNow ? 'publishing' : prev.gps.publishState,
        publishText: publishNow ? 'Konum gönderiliyor.' : prev.gps.publishText,
      }, prev.route, {
        usingCachedData: prev.usingCachedData,
        netStatus: prev.net?.status || 'unknown',
        selectedShiftId: prev.selectedShiftId,
      }),
    }));

    try {
      const permission = requestPermission
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync().catch(() => null);

      if (!permission) {
        setState((prev) => ({
          ...prev,
          gps: {
            ...prev.gps,
            permissionStatus: 'error',
            permissionText: 'GPS izin durumu okunamadı.',
            publishState: 'error',
            publishText: 'GPS durumu okunamadı.',
            lastErrorAt: new Date().toISOString(),
            canOpenSettings: false,
          },
        }));
        return;
      }

      const permissionText = permissionTextFromStatus(permission);
      const backgroundPermission = requestPermission
        ? await Location.requestBackgroundPermissionsAsync().catch(() => null)
        : await Location.getBackgroundPermissionsAsync().catch(() => null);
      backgroundSnapshot = await readGpsRuntimeSnapshot('status-refresh', {
        foregroundPermission: permission,
        backgroundPermission,
        canOpenSettings: permission?.canAskAgain === false || backgroundPermission?.canAskAgain === false,
      });
      if (permission.status !== 'granted') {
        setState((prev) => ({
          ...prev,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            permissionStatus: permission.status,
            permissionText,
            publishState: 'blocked',
            publishText: permission.canAskAgain === false
              ? 'GPS izni kapalı. Ayarlardan açmadan konum gönderilemez.'
              : 'GPS izni gerekli. İzin yenilenmeden konum gönderilemez.',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30000 }).catch(() => null);
      const lastLocationText = formatGpsCoords(lastKnown?.coords);

      if (state.kvkk?.blocking) {
        setState((prev) => ({
          ...prev,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            ...buildLocalPreviewSnapshot(lastKnown, target, 'last-known'),
            permissionStatus: permission.status,
            permissionText,
            publishState: 'blocked',
            publishText: 'KVKK onayı eksik. Onay tamamlanmadan konum gönderilemez.',
            lastLocationText,
            canOpenSettings: false,
            retryCount: 0,
            nextRetryAt: '',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      if (!target.activeShift) {
        setState((prev) => ({
          ...prev,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            ...buildLocalPreviewSnapshot(lastKnown, target, 'last-known'),
            permissionStatus: permission.status,
            permissionText,
            publishState: 'no-shift',
            publishText: 'Bugün aktif görev yok. Bugün veya yakın zaman için atanmış vardiya yok. Bu yüzden konum gönderilmiyor.',
            lastLocationText,
            canOpenSettings: false,
            retryCount: 0,
            nextRetryAt: '',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      if (!target.vehicleId) {
        setState((prev) => ({
          ...prev,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            ...buildLocalPreviewSnapshot(lastKnown, target, 'last-known'),
            permissionStatus: permission.status,
            permissionText,
            publishState: 'no-vehicle',
            publishText: 'Görev var ama araç ataması görünmüyor. Bu yüzden konum gönderilmiyor.',
            lastLocationText,
            canOpenSettings: false,
            retryCount: 0,
            nextRetryAt: '',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      if (!target.canPublish) {
        setState((prev) => ({
          ...prev,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            ...buildLocalPreviewSnapshot(lastKnown, target, 'last-known'),
            permissionStatus: permission.status,
            permissionText,
            publishState: 'waiting',
            publishText: 'Vardiya atandı. Başlangıç saati bekleniyor; görev hazır olunca konum gönderecek.',
            lastLocationText,
            canOpenSettings: false,
            retryCount: 0,
            nextRetryAt: '',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      });

      const payload = buildGpsPayload(current, target.vehicleId);
      const previousRoute = state.route;
      await publishGps(payload);

      resetGpsRetryState();
      const nextRouteBundle = await refreshRouteAfterGpsPublishFlow({
        shiftId: target.shiftId,
        fallbackToday: state.today,
        currentToday: state.today,
        lastTodayRefreshAtRef,
        fetchToday,
        fetchShiftRoute,
        fetchActiveRoute,
        resolveVisibleShift,
        saveSelectedShiftId,
        clearSelectedShiftId,
        stateSelectedShiftId: state.selectedShiftId,
      });
      const nextToday = nextRouteBundle.today || state.today;
      const nextRoute = nextRouteBundle.route;

      const transition = state.voiceEnabled ? deriveRouteTransition(previousRoute, nextRoute) : null;
      if (transition?.type === 'complete') {
        speakRouteCompleted();
        lastVoiceCompletionRef.current = buildCompletionCueKey(nextRoute);
        lastVoiceCueRef.current = '';
      } else if (transition?.type === 'reached') {
        speakReachedStopAndNext(transition.reachedStop, nextRoute);
        lastVoiceCueRef.current = buildVoiceCueKey(nextRoute);
      }

      const nextGpsState = decorateGpsState({
        ...state.gps,
        ...backgroundSnapshot,
        ...buildLocalPreviewSnapshot(current, target, 'published'),
        permissionStatus: permission.status,
        permissionText,
        publishState: 'ok',
        publishText: 'Konum gönderildi. Gösterilen resmi konum backend aracının GPS’inden okunur.',
        lastLocationText: formatGpsCoords(current?.coords),
        lastSentAt: new Date().toISOString(),
        shiftId: nextRouteBundle?.selectedShiftId || target.shiftId,
        vehicleId: target.vehicleId,
        canOpenSettings: false,
        retryCount: 0,
        nextRetryAt: '',
      }, nextRoute || state.route, {
        usingCachedData: false,
        netStatus: 'online',
        selectedShiftId: nextRouteBundle?.selectedShiftId || state.selectedShiftId,
      });

      await saveLastMobileSnapshot(buildMobileSnapshot({
        me: state.me,
        today: nextToday || state.today,
        route: nextRoute || state.route,
        health: state.health,
        kvkk: state.kvkk,
        net: state.net,
        lastSyncAt: state.lastSyncAt,
        lastErrorAt: state.lastErrorAt,
        gps: nextGpsState,
        selectedShiftId: nextRouteBundle?.selectedShiftId || state.selectedShiftId,
      }));

      setState((prev) => ({
        ...prev,
        today: nextToday || prev.today,
        route: nextRoute || prev.route,
        selectedShiftId: nextRouteBundle?.selectedShiftId || prev.selectedShiftId,
        net: prev.net?.status === 'offline'
          ? {
              ...prev.net,
              status: 'online',
              message: 'Bağlantı geri geldi, bilgiler yenileniyor.',
              lastOnlineAt: new Date().toISOString(),
              lastRecoveryAt: new Date().toISOString(),
              retryCount: 0,
              nextRetryAt: '',
            }
          : { ...prev.net, retryCount: 0, nextRetryAt: '' },
        gps: nextGpsState,
      }));
    } catch (error) {
      if (isSessionFailureError(error)) {
        await applySessionFailure(error);
        return;
      }

      if (isKvkkBlockingError(error)) {
        const kvkkCurrent = await fetchKvkkCurrent().catch(() => null);
        setState((prev) => ({
          ...prev,
          kvkk: nextKvkkState(kvkkCurrent || { ...prev.kvkk, blocking: true }, prev.kvkk, 'KVKK onayı eksik. Konum gönderimi durduruldu.'),
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            publishState: 'blocked',
            publishText: 'KVKK onayı eksik. Onay tamamlanmadan konum gönderilemez.',
            lastErrorAt: new Date().toISOString(),
            retryCount: 0,
            nextRetryAt: '',
          }, prev.route, {
            usingCachedData: prev.usingCachedData,
            netStatus: prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        }));
        return;
      }

      const offline = isNetworkError(error);
      const retryMeta = (offline || error?.retryable) ? buildRetryMeta(gpsRetryCountRef.current + 1, GPS_PUBLISH_INTERVAL_MS, 180000) : null;
      if (retryMeta) {
        gpsRetryCountRef.current = retryMeta.retryCount;
        gpsNextRetryAtRef.current = Date.now() + retryMeta.waitMs;
      }
      setState((prev) => {
        const nextNet = offline
          ? {
              status: 'offline',
              message: 'Bağlantı yok. Konum tekrar denenecek.',
              lastOnlineAt: prev.net?.lastOnlineAt || '',
              lastOfflineAt: new Date().toISOString(),
              lastRecoveryAt: prev.net?.lastRecoveryAt || '',
              retryCount: retryMeta?.retryCount || prev.net?.retryCount || 0,
              nextRetryAt: retryMeta?.nextRetryAt || prev.net?.nextRetryAt || '',
            }
          : prev.net;
        return {
          ...prev,
          net: nextNet,
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            publishState: 'retry',
            publishText: humanizeGpsError(error),
            lastErrorAt: new Date().toISOString(),
            retryCount: retryMeta?.retryCount || prev.gps?.retryCount || 0,
            nextRetryAt: retryMeta?.nextRetryAt || prev.gps?.nextRetryAt || '',
          }, prev.route, {
            usingCachedData: Boolean(offline || prev.usingCachedData),
            netStatus: nextNet?.status || prev.net?.status || 'unknown',
            selectedShiftId: prev.selectedShiftId,
          }),
        };
      });
    } finally {
      gpsBusyRef.current = false;
    }
  }
  async function refreshKvkkStatus({ accepted = false } = {}) {
    setState((prev) => ({
      ...prev,
      kvkk: {
        ...prev.kvkk,
        loading: !accepted,
        busy: accepted,
        message: accepted ? 'KVKK onayı kaydediliyor.' : 'KVKK durumu yenileniyor.',
      },
    }));

    try {
      const kvkkCurrent = await fetchKvkkCurrent();
      setState((prev) => ({
        ...prev,
        kvkk: nextKvkkState(
          kvkkCurrent,
          {
            ...prev.kvkk,
            lastAcceptedAt: accepted ? new Date().toISOString() : prev.kvkk.lastAcceptedAt,
          },
          accepted ? 'KVKK onayı tamamlandı. Konum gönderimi tekrar hazır.' : undefined
        ),
      }));
    } catch (error) {
      if (isSessionFailureError(error)) {
        await applySessionFailure(error);
        return;
      }

      const message = isNetworkError(error) ? 'Bağlantı yok. KVKK durumu yenilenemedi.' : humanize(error);
      setState((prev) => ({
        ...prev,
        error: message,
        lastErrorAt: new Date().toISOString(),
        kvkk: {
          ...prev.kvkk,
          loading: false,
          busy: false,
          message,
          lastErrorAt: new Date().toISOString(),
        },
      }));
    }
  }

  useDriverRealtimeResync({
    apiBaseUrl: getApiBaseUrl(),
    sessionToken: state.session?.token || '',
    role: state.me?.role || '',
    requirePinChange: Boolean(state.me?.requirePinChange),
    onSync: () => syncSignedIn({ soft: true, force: true }),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [deviceId, session, voiceEnabled, selectedShiftId, snapshot, pendingSessionEvent] = await Promise.all([
          ensureDeviceId(),
          getSession(),
          getVoiceGuidanceEnabled(),
          getSelectedShiftId().catch(() => null),
          getLastMobileSnapshot().catch(() => null),
          getPendingSessionEvent().catch(() => null),
        ]);
        if (!alive) return;

        if (snapshot) {
          setState(hydrateStateFromSnapshot(snapshot, { session, deviceId, voiceEnabled, selectedShiftId }));
          if (snapshot?.lastSyncAt) lastTodayRefreshAtRef.current = new Date(snapshot.lastSyncAt).getTime() || 0;
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
            ...(snapshot ? prev : initialState),
            loading: false,
            session: session || null,
            deviceId,
            voiceEnabled,
            selectedShiftId: selectedShiftId || snapshot?.selectedShiftId || null,
          }));
          return;
        }

        if (!snapshot) {
          setState((prev) => ({ ...prev, session, deviceId, voiceEnabled, selectedShiftId: selectedShiftId || null }));
        }
        await syncSignedIn({ soft: Boolean(snapshot) });
      } catch (error) {
        if (!alive) return;
        if (isSessionFailureError(error)) {
          await applySessionFailure(error);
          return;
        }
        const message = isNetworkError(error) ? 'Bağlantı yok. Veri eski olabilir.' : humanize(error);
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
  }, []);

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
        consumePendingSessionEvent({ hasSession: Boolean(state.session?.token) }).then((handled) => {
          if (handled) return;
          syncSignedIn({ soft: true, force: true }).catch(() => null);
          refreshGpsStatus({ publishNow: true, force: true }).catch(() => null);
        }).catch(() => null);
      }
    });
    return () => sub.remove();
  }, [state.session?.token, state.me?.requirePinChange, state.me?.role, state.today, state.route, state.kvkk?.blocking, state.selectedShiftId]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange) return;
    const timer = setInterval(() => {
      syncSignedIn({ soft: true }).catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [state.session?.token, state.me?.requirePinChange, state.selectedShiftId]);

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
  }, [state.session?.token, state.me?.requirePinChange, state.me?.role, state.today, state.route, state.kvkk?.blocking, state.selectedShiftId]);

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
  }, [state.voiceEnabled, state.today?.active?.id, state.today?.assigned?.id, state.route?.shift?.id, state.route?.progress?.completed, state.route?.progress?.lastReachedOrder, state.route?.nextStop?.id, state.route?.nextStop?.etaMin]);


  const mobileHandlers = createMobileAppHandlers({
    state,
    setState,
    setScreen,
    setRouteOps,
    initialState,
    syncSignedIn,
    refreshGpsStatus,
    refreshKvkkStatus,
    applySessionFailure,
    resetSyncRetryState,
    resetGpsRetryState,
    lastVoiceWelcomeRef,
    lastVoiceCueRef,
    appStateRef,
  });

  const content = useMemo(() => (
    <MobileAppContent
      state={state}
      screen={screen}
      routeOps={routeOps}
      styles={styles}
      apiBaseUrl={getApiBaseUrl()}
      releaseInfo={RELEASE_INFO}
      onLogin={mobileHandlers.handleLogin}
      onPinChange={mobileHandlers.handlePinChange}
      onLogout={mobileHandlers.handleLogout}
      onRefresh={mobileHandlers.handleRefresh}
      onOpenToday={mobileHandlers.handleOpenToday}
      onOpenRoute={mobileHandlers.handleOpenRoute}
      onOpenLive={mobileHandlers.handleOpenLive}
      onSelectShift={mobileHandlers.handleSelectShift}
      routeOpsBusy={Boolean(routeOps?.busy)}
      routeOpsText={routeOps?.message || ''}
      onStartShift={mobileHandlers.handleStartShift}
      onPauseShift={mobileHandlers.handlePauseShift}
      onResumeShift={mobileHandlers.handleResumeShift}
      onCompleteShift={mobileHandlers.handleCompleteShift}
      onMarkReached={mobileHandlers.handleMarkReached}
      onSkipStop={mobileHandlers.handleSkipStop}
      onReopenStop={mobileHandlers.handleReopenStop}
      onUndoStop={mobileHandlers.handleUndoStop}
      onToggleVoiceGuidance={mobileHandlers.handleToggleVoiceGuidance}
      onSpeakNextStop={mobileHandlers.handleSpeakNextStop}
      onSpeakEta={mobileHandlers.handleSpeakEta}
      onRequestGpsPermission={mobileHandlers.handleRequestGpsPermission}
      onRefreshGpsStatus={mobileHandlers.handleRefreshGpsStatus}
      onOpenGpsSettings={mobileHandlers.handleOpenGpsSettings}
      onPublishGpsNow={mobileHandlers.handlePublishGpsNow}
      onAcceptKvkk={mobileHandlers.handleAcceptKvkk}
      onRefreshKvkkStatus={mobileHandlers.handleRefreshKvkk}
    />
  ), [state, screen, routeOps, mobileHandlers]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {content}
    </SafeAreaView>
  );
}
