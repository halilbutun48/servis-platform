import { useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform, SafeAreaView, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import {
  clearLastMobileSnapshot,
  clearPendingSessionEvent,
  clearSelectedChildId,
  clearSelectedShiftId,
  clearSession,
  getLastMobileSnapshot,
  getPendingSessionEvent,
  getSelectedChildId,
  getSelectedShiftId,
  getSession,
  getVoiceGuidanceEnabled,
  saveLastMobileSnapshot,
  saveSelectedChildId,
  saveSelectedShiftId,
  saveSession,
  saveVoiceGuidanceEnabled,
} from './src/lib/storage';
import {
  acceptKvkkRequiredMany,
  changeDriverPin,
  completeDriverShift,
  ensureDeviceId,
  fetchLiveVehicles,
  fetchActiveRoute,
  fetchHealth,
  fetchKvkkCurrent,
  fetchMe,
  fetchMyNotifications,
  fetchParentChildren,
  fetchParentLiveVehicles,
  fetchPersonelShifts,
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
import { buildCompletionCueKey, buildDriverChangeCueKey, buildVoiceCueKey, buildVoiceWelcomeKey, speakDriverChangeAlert, speakNextStop, speakReachedStopAndNext, speakRouteCompleted, speakShiftWelcome, speakStopEta, stopVoiceGuidance } from './src/lib/voice';
import { deriveRouteTransition, stopDriverBackgroundLocation, syncDriverBackgroundLocation } from './src/lib/backgroundGps';
import MobileAppContent from './src/app/MobileAppContent';
import { createMobileAppHandlers } from './src/app/mobileAppHandlers';
import { buildDriverAwarenessState, getLatestDriverAwarenessNotification, markDriverAwarenessAnnounced } from './src/app/driverAwarenessState';
import { buildNotificationCenterState } from './src/app/notificationState';
import { buildParentRoleLiveState, buildPersonelRoleLiveState } from './src/app/roleLiveState';
import { DEFAULT_GPS, DEFAULT_KVKK, RELEASE_INFO, applyGpsRuntimeSnapshot, buildLocalPreviewSnapshot, buildMobileSnapshot, buildRetryMeta, buildSignedInSyncArtifacts, canRunRetryWindow, decorateGpsState, humanize, humanizeGpsError, humanizeSessionFailure, hydrateStateFromSnapshot, initialState, isNetworkError, nextKvkkState, readGpsRuntimeSnapshot, styles } from './src/app/mobileAppState';
import {
  applySessionFailure as applySessionFailureFlow,
  consumePendingSessionEvent as consumePendingSessionEventFlow,
  loadRouteBundle as loadRouteBundleFlow,
  refreshRouteAfterGpsPublish as refreshRouteAfterGpsPublishFlow,
  resolveCurrentShiftId as resolveCurrentShiftIdFlow,
} from './src/app/mobileAppFlow';
import { useMobileAppLifecycle } from './src/app/useMobileAppLifecycle';
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
  const lastDriverAwarenessCueRef = useRef('');
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
  function handleDriverShellReady() {
    setState((prev) => (prev.driverUiReady ? prev : { ...prev, driverUiReady: true }));
  }
  async function applySessionFailure(error) {
    await applySessionFailureFlow({
      error,
      stopVoiceGuidance,
      stopDriverBackgroundLocation,
      clearSession,
      clearLastMobileSnapshot,
      clearSelectedShiftId,
      clearSelectedChildId,
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
      const role = String(me?.role || '').trim().toUpperCase();
      const preferredChildId = state.selectedChildId || (await getSelectedChildId().catch(() => null));
      const notificationsPromise = fetchMyNotifications().catch(() => []);
      const latestSession = await getSession().catch(() => null);
      const nextSession = latestSession?.token && latestSession.token !== state.session?.token
        ? {
            ...latestSession,
            deviceId: latestSession.deviceId || state.session?.deviceId || '',
          }
        : state.session;

      if (role !== 'DRIVER') {
        const [kvkkCurrent, notifications] = await Promise.all([
          fetchKvkkCurrent().catch(() => null),
          notificationsPromise,
        ]);
        let nextRoleLive = null;
        let nextSelectedShiftId = role === 'PERSONEL' ? preferredShiftId : null;
        let nextSelectedChildId = role === 'PARENT' ? preferredChildId : null;

        if (role === 'PERSONEL') {
          const [personelShifts, liveVehicles] = await Promise.all([
            fetchPersonelShifts(20).catch(() => ({ items: [] })),
            fetchLiveVehicles(20).catch(() => []),
          ]);
          nextRoleLive = buildPersonelRoleLiveState({
            shifts: personelShifts?.items || [],
            liveVehicles: Array.isArray(liveVehicles) ? liveVehicles : [],
            selectedShiftId: preferredShiftId,
            lastSyncAt: new Date().toISOString(),
            kvkkBlocking: Boolean(kvkkCurrent?.blocking),
            netStatus: 'online',
          });
          nextSelectedShiftId = nextRoleLive?.selectedShiftId || nextSelectedShiftId || null;
        } else if (role === 'PARENT') {
          const childrenResponse = await fetchParentChildren().catch(() => ({ items: [] }));
          const children = Array.isArray(childrenResponse?.items) ? childrenResponse.items : [];
          if (children.length) {
            const knownChildId = preferredChildId && children.some((child) => Number(child?.id || 0) === Number(preferredChildId)) ? preferredChildId : null;
            nextSelectedChildId = knownChildId || children[0]?.id || null;
            const liveVehicles = !kvkkCurrent?.blocking && nextSelectedChildId
              ? await fetchParentLiveVehicles(nextSelectedChildId, 20).catch(() => [])
              : [];
            nextRoleLive = buildParentRoleLiveState({
              children,
              liveVehicles: Array.isArray(liveVehicles) ? liveVehicles : [],
              selectedChildId: nextSelectedChildId,
              lastSyncAt: new Date().toISOString(),
              kvkkBlocking: Boolean(kvkkCurrent?.blocking),
              netStatus: 'online',
            });
            nextSelectedChildId = nextRoleLive?.selectedChildId || nextSelectedChildId || null;
          } else {
            nextRoleLive = buildParentRoleLiveState({
              children: [],
              liveVehicles: [],
              selectedChildId: null,
              lastSyncAt: new Date().toISOString(),
              kvkkBlocking: Boolean(kvkkCurrent?.blocking),
              netStatus: 'online',
            });
            nextSelectedChildId = null;
          }
        }

        const lastSyncAt = new Date().toISOString();
        resetSyncRetryState();
        lastDriverAwarenessCueRef.current = '';
        const nextNotifications = buildNotificationCenterState({
          role,
          items: notifications,
          lastSeenNotificationId: state.notifications?.lastSeenNotificationId || null,
          lastSeenAt: state.notifications?.lastSeenAt || '',
          lastFetchedAt: lastSyncAt,
        });
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
          clearPendingSessionEvent().catch(() => null),
          saveLastMobileSnapshot(buildMobileSnapshot({
            me,
            health,
            net: nextNet,
            kvkk: kvkkCurrent ? nextKvkkState(kvkkCurrent, DEFAULT_KVKK) : DEFAULT_KVKK,
            gps: DEFAULT_GPS,
            lastSyncAt,
            lastErrorAt: '',
            selectedShiftId: nextSelectedShiftId,
            selectedChildId: nextSelectedChildId,
            driverAvailability: state.driverAvailability,
            driverAwareness: buildDriverAwarenessState(),
            notifications: nextNotifications,
            roleLive: nextRoleLive,
          })),
          role === 'PERSONEL' ? saveSelectedShiftId(nextSelectedShiftId || null).catch(() => null) : Promise.resolve(null),
          role === 'PARENT' ? saveSelectedChildId(nextSelectedChildId || null).catch(() => null) : Promise.resolve(null),
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
          roleLive: nextRoleLive,
          health,
          net: nextNet,
          gps: { ...DEFAULT_GPS },
          kvkk: kvkkCurrent ? nextKvkkState(kvkkCurrent, DEFAULT_KVKK) : { ...DEFAULT_KVKK },
          selectedShiftId: nextSelectedShiftId,
          selectedChildId: nextSelectedChildId,
          driverAwareness: buildDriverAwarenessState(),
          notifications: nextNotifications,
          error: '',
          lastErrorAt: '',
          lastSyncAt,
        }));
        return;
      }

      const [today, kvkkCurrent, notifications] = await Promise.all([
        fetchToday().catch(() => null),
        fetchKvkkCurrent().catch(() => null),
        notificationsPromise,
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
      const nextNotifications = buildNotificationCenterState({
        role,
        items: notifications,
        lastSeenNotificationId: state.notifications?.lastSeenNotificationId || null,
        lastSeenAt: state.notifications?.lastSeenAt || '',
        lastFetchedAt: lastSyncAt,
      });
      const nextDriverAwarenessBase = buildDriverAwarenessState({
        items: Array.isArray(notifications) ? notifications : [],
        lastSeenNotificationId: state.driverAwareness?.lastSeenNotificationId || null,
        lastAnnouncedNotificationId: state.driverAwareness?.lastAnnouncedNotificationId || null,
        lastSeenAt: state.driverAwareness?.lastSeenAt || '',
        lastAnnouncedAt: state.driverAwareness?.lastAnnouncedAt || '',
        lastFetchedAt: lastSyncAt,
        updatedAt: lastSyncAt,
      });
      const latestDriverAwareness = getLatestDriverAwarenessNotification(nextDriverAwarenessBase);
      const driverCueKey = buildDriverChangeCueKey(latestDriverAwareness);
      let nextDriverAwareness = nextDriverAwarenessBase;
      if (state.voiceEnabled && latestDriverAwareness?.id && driverCueKey && driverCueKey !== lastDriverAwarenessCueRef.current) {
        speakDriverChangeAlert(latestDriverAwareness);
        nextDriverAwareness = markDriverAwarenessAnnounced(nextDriverAwarenessBase, latestDriverAwareness, lastSyncAt);
        lastDriverAwarenessCueRef.current = driverCueKey;
      }
      const syncArtifacts = buildSignedInSyncArtifacts({
        state,
        routeBundle,
        me,
        today,
        health,
        kvkkCurrent,
        lastSyncAt,
        driverAwareness: nextDriverAwareness,
        notifications: nextNotifications,
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
        selectedChildId: null,
        roleLive: null,
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
        driverAwareness: nextDriverAwareness,
        notifications: nextNotifications,
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
        driverAvailability: state.driverAvailability,
        driverAwareness: state.driverAwareness,
        notifications: state.notifications,
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

  // useDriverRealtimeResync orchestration lives in the lifecycle hook.
  useMobileAppLifecycle({
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
    apiBaseUrl: getApiBaseUrl(),
  });


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
    lastDriverAwarenessCueRef,
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
      onDriverShellReady={handleDriverShellReady}
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
      driverAvailability={state?.driverAvailability || null}
      boardingChange={state?.boardingChange || null}
      notifications={state?.notifications || null}
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
      onSpeakDriverAwareness={mobileHandlers.handleSpeakDriverAwareness}
      onAcknowledgeDriverAwareness={mobileHandlers.handleAcknowledgeDriverAwareness}
      onMarkNotificationsSeen={mobileHandlers.handleMarkNotificationsSeen}
      onRequestGpsPermission={mobileHandlers.handleRequestGpsPermission}
      onRefreshGpsStatus={mobileHandlers.handleRefreshGpsStatus}
      onOpenGpsSettings={mobileHandlers.handleOpenGpsSettings}
      onPublishGpsNow={mobileHandlers.handlePublishGpsNow}
      onAcceptKvkk={mobileHandlers.handleAcceptKvkk}
      onRefreshKvkkStatus={mobileHandlers.handleRefreshKvkk}
      onReportNoShow={mobileHandlers.handleReportNoShow}
      onRequestBoardingChange={mobileHandlers.handleRequestBoardingChange}
      onSetDriverAvailability={mobileHandlers.handleSetDriverAvailability}
    />
  ), [state, screen, routeOps, mobileHandlers]);

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS === 'ios' ? <StatusBar barStyle="dark-content" /> : null}
      {content}
    </SafeAreaView>
  );
}
