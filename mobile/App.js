import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
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
  humanizeApiError,
  isKvkkBlockingError,
  isNetworkLikeError,
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
  resolveLiveLocationState,
  resolveVisibleShift,
} from './src/lib/gps';
import { buildCompletionCueKey, buildVoiceCueKey, buildVoiceWelcomeKey, speakNextStop, speakReachedStopAndNext, speakRouteCompleted, speakShiftWelcome, speakStopEta, stopVoiceGuidance } from './src/lib/voice';
import { deriveRouteTransition, getDriverBackgroundRuntimeStatus, stopDriverBackgroundLocation, syncDriverBackgroundLocation } from './src/lib/backgroundGps';
import MobileAppContent from './src/app/MobileAppContent';
import { RELEASE_INFO, backgroundPermissionTextFromStatus, buildLocalPreviewSnapshot, buildMobileSnapshot, buildRetryMeta, canRunRetryWindow, decorateGpsState, humanize, humanizeGpsError, humanizeSessionFailure, hydrateStateFromSnapshot, initialState, isNetworkError, nextKvkkState } from './src/app/mobileAppState';

const SESSION_FAILURE_USER_MESSAGE = 'Oturum kapandi. Yeniden giris yapin.';
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

  function decorateGpsState(baseGps, route, { usingCachedData = false, netStatus = 'unknown', selectedShiftId = null } = {}) {
    return {
      ...baseGps,
      ...resolveLiveLocationState({
        route,
        gps: baseGps,
        usingCachedData,
        netStatus,
        selectedShiftId,
      }),
    };
  }

  async function refreshRouteAfterGpsPublish(shiftId, fallbackToday = null) {
    const now = Date.now();
    const shouldRefreshToday = !state.today || !lastTodayRefreshAtRef.current || (now - lastTodayRefreshAtRef.current) >= 120000;
    const nextToday = shouldRefreshToday
      ? await fetchToday().catch(() => null)
      : (fallbackToday || state.today || null);

    if (nextToday && shouldRefreshToday) lastTodayRefreshAtRef.current = now;

    const preferredShiftId = Number(shiftId || state.selectedShiftId || 0) || null;
    if (preferredShiftId) {
      const nextRoute = await fetchShiftRoute(preferredShiftId).catch(() => null);
      if (nextRoute) {
        return {
          today: nextToday || fallbackToday || state.today || null,
          route: nextRoute,
          selectedShiftId: Number(nextRoute?.shift?.id || preferredShiftId || 0) || null,
        };
      }
    }

    return loadRouteBundle(nextToday || fallbackToday || state.today, preferredShiftId);
  }

  async function applySessionFailure(error) {
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
      syncBusyRef.current = false;
      gpsBusyRef.current = false;
      resetSyncRetryState();
      resetGpsRetryState();
      lastTodayRefreshAtRef.current = 0;
      setScreen('today');
      setRouteOps({ busy: false, message: '' });
      setState((prev) => ({
        ...initialState,
        loading: false,
        deviceId: prev.deviceId,
        error: humanizeSessionFailure(error) || SESSION_FAILURE_USER_MESSAGE,
        lastErrorAt: new Date().toISOString(),
      }));
    }
  }

  async function consumePendingSessionEvent({ hasSession = Boolean(state.session?.token) } = {}) {
    const pendingEvent = await getPendingSessionEvent().catch(() => null);
    if (!pendingEvent) return false;
    await clearPendingSessionEvent().catch(() => null);
    if (hasSession) {
      await applySessionFailure(pendingEvent);
    } else {
      setState((prev) => ({
        ...prev,
        error: humanizeSessionFailure(pendingEvent),
        lastErrorAt: new Date().toISOString(),
      }));
    }
    return true;
  }

  async function loadRouteBundle(todayValue, preferredShiftId = null) {
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

  function resolveCurrentShiftId() {
    return Number(state.selectedShiftId || state.route?.shift?.id || state.today?.active?.id || state.today?.assigned?.id || 0) || null;
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
      const [today, kvkkCurrent] = await Promise.all([
        fetchToday().catch(() => null),
        fetchKvkkCurrent().catch(() => null),
      ]);
      const routeBundle = await loadRouteBundle(today, preferredShiftId);
      const lastSyncAt = new Date().toISOString();
      lastTodayRefreshAtRef.current = Date.now();
      resetSyncRetryState();
      const nextKvkk = nextKvkkState(kvkkCurrent || me?.kvkk, state.kvkk);
      const nextNet = {
        status: 'online',
        message: state.net?.status === 'offline' ? 'Baglanti geri geldi, bilgiler yenileniyor.' : 'Baglanti var.',
        lastOnlineAt: lastSyncAt,
        lastOfflineAt: state.net?.lastOfflineAt || '',
        lastRecoveryAt: state.net?.status === 'offline' ? lastSyncAt : (state.net?.lastRecoveryAt || ''),
        retryCount: 0,
        nextRetryAt: '',
      };
      const nextGps = decorateGpsState({
        ...state.gps,
        shiftId: Number(routeBundle.selectedShiftId || state.gps?.shiftId || 0) || null,
        vehicleId: Number(routeBundle.route?.shift?.vehicleId || routeBundle.route?.vehicle?.id || state.gps?.vehicleId || 0) || null,
      }, routeBundle.route, {
        usingCachedData: false,
        netStatus: nextNet.status,
        selectedShiftId: routeBundle.selectedShiftId,
      });

      await Promise.all([
        saveLastMobileSnapshot(buildMobileSnapshot({
          me,
          today,
          route: routeBundle.route,
          health,
          kvkk: nextKvkk,
          net: nextNet,
          lastSyncAt,
          lastErrorAt: '',
          gps: nextGps,
          selectedShiftId: routeBundle.selectedShiftId,
        })),
        clearPendingSessionEvent().catch(() => null),
      ]);

      setState((prev) => ({
        ...prev,
        loading: false,
        syncing: false,
        usingCachedData: false,
        net: nextNet,
        me,
        today,
        route: routeBundle.route,
        health,
        selectedShiftId: routeBundle.selectedShiftId,
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
      const msg = offline ? 'Baglanti yok. Veri eski olabilir.' : humanize(error);
      setState((prev) => {
        const nextNet = offline
          ? {
              status: 'offline',
              message: 'Baglanti yok. Veri eski olabilir.',
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
        publishText: publishNow ? 'Konum gonderiliyor.' : prev.gps.publishText,
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
            permissionText: 'GPS izin durumu okunamadi.',
            publishState: 'error',
            publishText: 'GPS durumu okunamadi.',
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
              ? 'GPS izni kapali. Ayarlardan acmadan konum gonderilemez.'
              : 'GPS izni gerekli. Izin yenilenmeden konum gonderilemez.',
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
            publishText: 'KVKK onayi eksik. Onay tamamlanmadan konum gonderilemez.',
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
            publishText: 'Bugun aktif gorev yok. Bugun veya yakin zaman icin atanmis vardiya yok. Bu yuzden konum gonderilmiyor.',
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
            publishText: 'Gorev var ama arac atamasi gorunmuyor. Bu yuzden konum gonderilmiyor.',
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
            publishText: 'Vardiya atandi. Baslangic saati bekleniyor; gorev hazir olunca konum gonderecek.',
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
      const nextRouteBundle = await refreshRouteAfterGpsPublish(target.shiftId, state.today);
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
        publishText: "Konum gonderildi. Gosterilen resmi konum backend arac GPS'inden okunur.",
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
              message: 'Baglanti geri geldi, bilgiler yenileniyor.',
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
          kvkk: nextKvkkState(kvkkCurrent || { ...prev.kvkk, blocking: true }, prev.kvkk, 'KVKK onayi eksik. Konum gonderimi durduruldu.'),
          gps: decorateGpsState({
            ...prev.gps,
            ...backgroundSnapshot,
            publishState: 'blocked',
            publishText: 'KVKK onayi eksik. Onay tamamlanmadan konum gonderilemez.',
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
              message: 'Baglanti yok. Konum tekrar denenecek.',
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


  function applyGpsRuntimeSnapshot(snapshot = {}) {
    setState((prev) => ({
      ...prev,
      gps: {
        ...prev.gps,
        ...snapshot,
      },
    }));
  }

  async function readGpsRuntimeSnapshot(reason = '', options = {}) {
    const runtime = await getDriverBackgroundRuntimeStatus().catch(() => null);
    const foregroundPermission = options.foregroundPermission ?? runtime?.foregroundPermission ?? null;
    const backgroundPermission = options.backgroundPermission ?? runtime?.backgroundPermission ?? null;
    const taskStarted = Boolean(runtime?.started);
    const canOpenSettings = Boolean(
      options.canOpenSettings ?? ((foregroundPermission?.canAskAgain === false) || (backgroundPermission?.canAskAgain === false))
    );

    return {
      permissionStatus: foregroundPermission?.status || options.permissionStatus || 'unknown',
      permissionText: permissionTextFromStatus(foregroundPermission),
      backgroundPermissionStatus: backgroundPermission?.status || 'unknown',
      backgroundPermissionText: backgroundPermissionTextFromStatus(backgroundPermission),
      backgroundTaskState: taskStarted ? 'running' : 'stopped',
      backgroundTaskText: taskStarted
        ? 'Arka plan GPS servisi kayitli. Ekran kapansa da yayin devam etmeli.'
        : 'Arka plan GPS servisi henuz devrede degil.',
      appState: options.appState || appStateRef.current,
      lastBackgroundReason: reason || options.reason || '',
      lastBackgroundSyncAt: new Date().toISOString(),
      canOpenSettings,
    };
  }

  async function refreshKvkkStatus({ accepted = false } = {}) {
    setState((prev) => ({
      ...prev,
      kvkk: {
        ...prev.kvkk,
        loading: !accepted,
        busy: accepted,
        message: accepted ? 'KVKK onayi kaydediliyor.' : 'KVKK durumu yenileniyor.',
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
          accepted ? 'KVKK onayi tamamlandi. Konum gonderimi tekrar hazir.' : undefined
        ),
      }));
    } catch (error) {
      if (isSessionFailureError(error)) {
        await applySessionFailure(error);
        return;
      }

      const message = isNetworkError(error) ? 'Baglanti yok. KVKK durumu yenilenemedi.' : humanize(error);
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
        const message = isNetworkError(error) ? 'Baglanti yok. Veri eski olabilir.' : humanize(error);
        setState((prev) => {
          const nextNet = isNetworkError(error)
            ? {
                status: 'offline',
                message: 'Baglanti yok. Veri eski olabilir.',
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
        return readGpsRuntimeSnapshot(runtime.reason, { appState: nextState }).then(applyGpsRuntimeSnapshot);
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
      return readGpsRuntimeSnapshot(runtime.reason, { appState: appStateRef.current }).then(applyGpsRuntimeSnapshot);
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


  function handleOpenToday() {
    setScreen('today');
  }

  function handleOpenRoute() {
    setScreen('route');
  }

  function handleOpenLive() {
    setScreen('live');
  }

  async function handleSelectShift(shiftId) {
    const nextShiftId = Number(shiftId || 0) || null;
    if (!nextShiftId) return;
    await saveSelectedShiftId(nextShiftId);
    setState((prev) => ({ ...prev, selectedShiftId: nextShiftId, gps: decorateGpsState(prev.gps, prev.route, { usingCachedData: prev.usingCachedData, netStatus: prev.net?.status || 'unknown', selectedShiftId: nextShiftId }), error: '' }));
    try {
      await syncSignedIn({ soft: true, preferredShiftIdOverride: nextShiftId, force: true });
      await refreshGpsStatus({ publishNow: false, force: true });
    } catch {
      // state already updated by sync/gps helpers
    }
  }

  async function runRouteAction(label, runner) {
    const shiftId = resolveCurrentShiftId();
    if (!shiftId) {
      setState((prev) => ({ ...prev, error: 'Seçili vardiya yok.', lastErrorAt: new Date().toISOString() }));
      return;
    }

    setRouteOps({ busy: true, message: `${label} çalışıyor...` });
    try {
      await runner(shiftId);
      await syncSignedIn({ soft: true, preferredShiftIdOverride: shiftId });
      await refreshGpsStatus({ publishNow: false, force: true }).catch(() => null);
      setRouteOps({ busy: false, message: `${label} tamamlandı.` });
    } catch (error) {
      if (isSessionFailureError(error)) {
        await applySessionFailure(error);
        return;
      }
      setRouteOps({ busy: false, message: '' });
      setState((prev) => ({
        ...prev,
        error: humanize(error),
        lastErrorAt: new Date().toISOString(),
      }));
    }
  }

  async function handleStartShift() {
    await runRouteAction('Vardiya başlatma', (shiftId) => startDriverShift(shiftId));
  }

  async function handlePauseShift() {
    await runRouteAction('Vardiya duraklatma', (shiftId) => pauseDriverShift(shiftId));
  }

  async function handleResumeShift() {
    await runRouteAction('Vardiya devam', (shiftId) => resumeDriverShift(shiftId));
  }

  async function handleCompleteShift() {
    await runRouteAction('Vardiya tamamlama', (shiftId) => completeDriverShift(shiftId));
  }

  async function handleMarkReached(stopId) {
    await runRouteAction('Durak ulaşıldı', (shiftId) => markDriverStopReached(shiftId, stopId));
  }

  async function handleSkipStop(stopId) {
    await runRouteAction('Durak atlama', (shiftId) => skipDriverStop(shiftId, stopId));
  }

  async function handleReopenStop(stopId) {
    await runRouteAction('Durak yeniden açma', (shiftId) => reopenDriverStop(shiftId, stopId));
  }

  async function handleUndoStop(stopId) {
    await runRouteAction('Durak geri alma', (shiftId) => undoDriverStop(shiftId, stopId));
  }

  async function handleLogin({ identifier, password }) {
    const data = await loginDriver(identifier, password);
    const deviceId = data.deviceId || (await ensureDeviceId());
    const session = {
      token: data.token,
      refreshToken: data.refreshToken || '',
      deviceId,
    };
    await Promise.all([saveSession(session), clearSelectedShiftId(), clearPendingSessionEvent().catch(() => null)]);
    resetSyncRetryState();
    resetGpsRetryState();
    setScreen('today');
    setState((prev) => ({ ...prev, session, deviceId, selectedShiftId: null }));
    await syncSignedIn({ soft: false });
  }

  async function handlePinChange({ currentPin, newPin }) {
    const changed = await changeDriverPin(currentPin, newPin);
    if (changed?.token) {
      const session = await getSession();
      await Promise.all([
        saveSession({
          ...(session || {}),
          token: changed.token,
          refreshToken: changed.refreshToken || session?.refreshToken || '',
          deviceId: session?.deviceId || state.deviceId || '',
        }),
        clearPendingSessionEvent().catch(() => null),
      ]);
    }
    await syncSignedIn({ soft: false });
  }

  async function handleRefresh() {
    try {
      await syncSignedIn({ soft: true, force: true });
      await refreshGpsStatus({ publishNow: false, force: true });
    } catch {
      // error already reflected in state
    }
  }

  async function handleLogout() {
    try {
      stopVoiceGuidance();
      await stopDriverBackgroundLocation();
      await logoutDriver();
    } finally {
      await Promise.all([clearSession(), clearLastMobileSnapshot(), clearSelectedShiftId(), clearPendingSessionEvent().catch(() => null)]);
      resetSyncRetryState();
      resetGpsRetryState();
      lastTodayRefreshAtRef.current = 0;
      setScreen('today');
      setRouteOps({ busy: false, message: '' });
      setState({ ...initialState, loading: false, deviceId: state.deviceId });
    }
  }

  async function handleToggleVoiceGuidance() {
    const next = !state.voiceEnabled;
    await saveVoiceGuidanceEnabled(next);
    if (!next) stopVoiceGuidance();
    if (next && state.route?.nextStop) {
      const welcomeKey = buildVoiceWelcomeKey(state.today, state.route);
      if (welcomeKey) {
        lastVoiceWelcomeRef.current = welcomeKey;
        lastVoiceCueRef.current = buildVoiceCueKey(state.route);
        speakShiftWelcome(state.today, state.route);
      } else {
        const cueKey = buildVoiceCueKey(state.route);
        lastVoiceCueRef.current = cueKey;
        speakNextStop(state.route);
      }
    }
    setState((prev) => ({ ...prev, voiceEnabled: next }));
  }

  function handleSpeakNextStop() {
    speakNextStop(state.route);
  }

  function handleSpeakEta() {
    speakStopEta(state.route);
  }

  async function handleRequestGpsPermission() {
    await refreshGpsStatus({ requestPermission: true, publishNow: false, force: true });
    const runtime = await syncDriverBackgroundLocation({
      sessionToken: state.session?.token,
      role: state.me?.role,
      requirePinChange: state.me?.requirePinChange,
      today: state.today,
      route: state.route,
      kvkkBlocking: state.kvkk?.blocking,
      requestPermission: true,
      appState: appStateRef.current,
      selectedShiftId: state.selectedShiftId,
    }).catch(() => null);
    if (runtime) {
      const snapshot = await readGpsRuntimeSnapshot(runtime.reason, { appState: appStateRef.current }).catch(() => null);
      if (snapshot) applyGpsRuntimeSnapshot(snapshot);
    }
  }

  async function handlePublishGpsNow() {
    await refreshGpsStatus({ publishNow: true, force: true });
  }

  async function handleRefreshGpsStatus() {
    await refreshGpsStatus({ publishNow: false, force: true });
  }

  async function handleOpenGpsSettings() {
    await Linking.openSettings().catch(() => null);
  }

  async function handleAcceptKvkk() {
    try {
      await acceptKvkkRequiredMany();
      await refreshKvkkStatus({ accepted: true });
      await refreshGpsStatus({ publishNow: false, force: true });
    } catch {
      // state already updated in helper/caller
    }
  }

  async function handleRefreshKvkk() {
    await refreshKvkkStatus({ accepted: false });
  }

  const content = useMemo(() => (
    <MobileAppContent
      state={state}
      screen={screen}
      routeOps={routeOps}
      styles={styles}
      releaseInfo={RELEASE_INFO}
      onLogin={handleLogin}
      onPinChange={handlePinChange}
      onLogout={handleLogout}
      onRefresh={handleRefresh}
      onOpenToday={handleOpenToday}
      onOpenRoute={handleOpenRoute}
      onOpenLive={handleOpenLive}
      onSelectShift={handleSelectShift}
      onStartShift={handleStartShift}
      onPauseShift={handlePauseShift}
      onResumeShift={handleResumeShift}
      onCompleteShift={handleCompleteShift}
      onMarkReached={handleMarkReached}
      onSkipStop={handleSkipStop}
      onReopenStop={handleReopenStop}
      onUndoStop={handleUndoStop}
      onToggleVoiceGuidance={handleToggleVoiceGuidance}
      onSpeakNextStop={handleSpeakNextStop}
      onSpeakEta={handleSpeakEta}
      onRequestGpsPermission={handleRequestGpsPermission}
      onRefreshGpsStatus={handleRefreshGpsStatus}
      onOpenGpsSettings={handleOpenGpsSettings}
      onPublishGpsNow={handlePublishGpsNow}
      onAcceptKvkk={handleAcceptKvkk}
      onRefreshKvkkStatus={handleRefreshKvkk}
    />
  ), [state, screen, routeOps]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {content}
    </SafeAreaView>
  );
}

