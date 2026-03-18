import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { clearSession, getSession, getVoiceGuidanceEnabled, saveSession, saveVoiceGuidanceEnabled } from './src/lib/storage';
import {
  changeDriverPin,
  ensureDeviceId,
  fetchActiveRoute,
  fetchHealth,
  fetchMe,
  fetchToday,
  getApiBaseUrl,
  loginDriver,
  logoutDriver,
  publishGps,
} from './src/lib/api';
import {
  buildGpsPayload,
  formatGpsCoords,
  GPS_PUBLISH_INTERVAL_MS,
  permissionTextFromStatus,
  resolveGpsPublishTarget,
} from './src/lib/gps';
import { buildVoiceCueKey, speakNextStop, speakStopEta, stopVoiceGuidance } from './src/lib/voice';
import LoginScreen from './src/screens/LoginScreen';
import PinChangeScreen from './src/screens/PinChangeScreen';
import TodayScreen from './src/screens/TodayScreen';

const RELEASE_INFO = Object.freeze({
  appVersion: '0.2.0',
  releaseTarget: 'Android ilk yayin',
  buildProfiles: 'preview / production',
  deliveryMode: 'EAS Build',
  expoGoStatus: 'Gelistirme testi tamam',
});

const initialState = {
  loading: true,
  syncing: false,
  session: null,
  me: null,
  today: null,
  route: null,
  health: null,
  deviceId: '',
  lastSyncAt: '',
  lastErrorAt: '',
  error: '',
  voiceEnabled: false,
  gps: {
    permissionStatus: 'unknown',
    permissionText: 'GPS izin durumu henuz okunmadi.',
    publishState: 'idle',
    publishText: 'Konum gonderimi henuz baslamadi.',
    lastLocationText: '-',
    lastSentAt: '',
    lastAttemptAt: '',
    lastErrorAt: '',
    shiftId: null,
    vehicleId: null,
    intervalSec: Math.round(GPS_PUBLISH_INTERVAL_MS / 1000),
    canOpenSettings: false,
  },
};

export default function App() {
  const [state, setState] = useState(initialState);
  const syncBusyRef = useRef(false);
  const gpsBusyRef = useRef(false);
  const lastVoiceCueRef = useRef('');
  const appStateRef = useRef(AppState.currentState || 'active');

  async function syncSignedIn({ soft = false } = {}) {
    if (syncBusyRef.current) return;
    syncBusyRef.current = true;
    if (soft) {
      setState((prev) => ({ ...prev, syncing: true, error: '' }));
    } else {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const health = await fetchHealth();
      const me = await fetchMe();
      const [today, route] = await Promise.all([fetchToday().catch(() => null), fetchActiveRoute().catch(() => null)]);
      setState((prev) => ({
        ...prev,
        loading: false,
        syncing: false,
        me,
        today,
        route,
        health,
        error: '',
        lastSyncAt: new Date().toISOString(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        syncing: false,
        health: prev.health,
        error: humanize(error),
        lastErrorAt: new Date().toISOString(),
      }));
      throw error;
    } finally {
      syncBusyRef.current = false;
    }
  }

  async function refreshGpsStatus({ requestPermission = false, publishNow = false } = {}) {
    if (gpsBusyRef.current) return;
    gpsBusyRef.current = true;

    const target = resolveGpsPublishTarget(state.today, state.route);
    setState((prev) => ({
      ...prev,
      gps: {
        ...prev.gps,
        shiftId: target.shiftId,
        vehicleId: target.vehicleId,
        lastAttemptAt: new Date().toISOString(),
        publishState: publishNow ? 'publishing' : prev.gps.publishState,
        publishText: publishNow ? 'Konum gonderiliyor.' : prev.gps.publishText,
      },
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
      if (permission.status !== 'granted') {
        setState((prev) => ({
          ...prev,
          gps: {
            ...prev.gps,
            permissionStatus: permission.status,
            permissionText,
            publishState: 'blocked',
            publishText: permission.canAskAgain === false
              ? 'GPS izni kapali. Ayarlardan acmadan konum gonderilemez.'
              : 'GPS izni gerekli. Izin yenilenmeden konum gonderilemez.',
            lastErrorAt: prev.gps.lastErrorAt,
            canOpenSettings: permission.canAskAgain === false,
          },
        }));
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30000 }).catch(() => null);
      const lastLocationText = formatGpsCoords(lastKnown?.coords);

      if (!target.activeShift) {
        setState((prev) => ({
          ...prev,
          gps: {
            ...prev.gps,
            permissionStatus: permission.status,
            permissionText,
            publishState: 'no-shift',
            publishText: 'Bugun aktif gorev yok. Bu yuzden konum gonderilmiyor.',
            lastLocationText,
            canOpenSettings: false,
          },
        }));
        return;
      }

      if (!target.vehicleId) {
        setState((prev) => ({
          ...prev,
          gps: {
            ...prev.gps,
            permissionStatus: permission.status,
            permissionText,
            publishState: 'no-vehicle',
            publishText: 'Gorev var ama arac atamasi gorunmuyor. Bu yuzden konum gonderilmiyor.',
            lastLocationText,
            canOpenSettings: false,
          },
        }));
        return;
      }

      if (!target.canPublish) {
        setState((prev) => ({
          ...prev,
          gps: {
            ...prev.gps,
            permissionStatus: permission.status,
            permissionText,
            publishState: 'waiting',
            publishText: 'Gorev henuz aktif degil. Uygulama gorev hazir olunca konum gonderecek.',
            lastLocationText,
            canOpenSettings: false,
          },
        }));
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      });
      const payload = buildGpsPayload(current, target.vehicleId);
      await publishGps(payload);

      setState((prev) => ({
        ...prev,
        gps: {
          ...prev.gps,
          permissionStatus: permission.status,
          permissionText,
          publishState: 'ok',
          publishText: 'Konum gonderiliyor.',
          lastLocationText: formatGpsCoords(current?.coords),
          lastSentAt: new Date().toISOString(),
          shiftId: target.shiftId,
          vehicleId: target.vehicleId,
          canOpenSettings: false,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        gps: {
          ...prev.gps,
          publishState: 'retry',
          publishText: humanizeGpsError(error),
          lastErrorAt: new Date().toISOString(),
        },
      }));
    } finally {
      gpsBusyRef.current = false;
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const deviceId = await ensureDeviceId();
        const session = await getSession();
        const voiceEnabled = await getVoiceGuidanceEnabled();
        if (!alive) return;
        if (!session?.token) {
          setState((prev) => ({ ...prev, loading: false, session: session || null, deviceId, voiceEnabled }));
          return;
        }
        setState((prev) => ({ ...prev, session, deviceId, voiceEnabled }));
        await syncSignedIn({ soft: false });
      } catch (error) {
        if (!alive) return;
        await clearSession();
        setState({ ...initialState, loading: false, error: humanize(error) });
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
      if (nextState === 'active') {
        syncSignedIn({ soft: true }).catch(() => null);
        refreshGpsStatus({ publishNow: true }).catch(() => null);
      }
    });
    return () => sub.remove();
  }, [state.session?.token, state.me?.requirePinChange, state.today, state.route]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange) return;
    const timer = setInterval(() => {
      syncSignedIn({ soft: true }).catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [state.session?.token, state.me?.requirePinChange]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange || String(state.me?.role || '').toUpperCase() !== 'DRIVER') return;
    refreshGpsStatus({ publishNow: false }).catch(() => null);
    const timer = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      refreshGpsStatus({ publishNow: true }).catch(() => null);
    }, GPS_PUBLISH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [state.session?.token, state.me?.requirePinChange, state.me?.role, state.today, state.route]);

  useEffect(() => {
    if (!state.voiceEnabled) return;
    const cueKey = buildVoiceCueKey(state.route?.nextStop);
    if (!cueKey || cueKey === lastVoiceCueRef.current) return;
    speakNextStop(state.route?.nextStop);
    lastVoiceCueRef.current = cueKey;
  }, [state.voiceEnabled, state.route?.nextStop?.id, state.route?.nextStop?.etaMin]);

  async function handleLogin({ identifier, password }) {
    const data = await loginDriver(identifier, password);
    const deviceId = data.deviceId || (await ensureDeviceId());
    const session = {
      token: data.token,
      refreshToken: data.refreshToken || '',
      deviceId,
    };
    await saveSession(session);
    setState((prev) => ({ ...prev, session, deviceId }));
    await syncSignedIn({ soft: false });
  }

  async function handlePinChange({ currentPin, newPin }) {
    const changed = await changeDriverPin(currentPin, newPin);
    if (changed?.token) {
      const session = await getSession();
      await saveSession({
        ...(session || {}),
        token: changed.token,
        refreshToken: changed.refreshToken || session?.refreshToken || '',
        deviceId: session?.deviceId || state.deviceId || '',
      });
    }
    await syncSignedIn({ soft: false });
  }

  async function handleRefresh() {
    try {
      await syncSignedIn({ soft: true });
      await refreshGpsStatus({ publishNow: false });
    } catch {
      // error already reflected in state
    }
  }

  async function handleLogout() {
    try {
      stopVoiceGuidance();
      await logoutDriver();
    } finally {
      await clearSession();
      setState({ ...initialState, loading: false, deviceId: state.deviceId });
    }
  }

  async function handleToggleVoiceGuidance() {
    const next = !state.voiceEnabled;
    await saveVoiceGuidanceEnabled(next);
    if (!next) stopVoiceGuidance();
    if (next && state.route?.nextStop) {
      const cueKey = buildVoiceCueKey(state.route?.nextStop);
      lastVoiceCueRef.current = cueKey;
      speakNextStop(state.route?.nextStop);
    }
    setState((prev) => ({ ...prev, voiceEnabled: next }));
  }

  function handleSpeakNextStop() {
    speakNextStop(state.route?.nextStop);
  }

  function handleSpeakEta() {
    speakStopEta(state.route?.nextStop);
  }

  async function handleRequestGpsPermission() {
    await refreshGpsStatus({ requestPermission: true, publishNow: false });
  }

  async function handlePublishGpsNow() {
    await refreshGpsStatus({ publishNow: true });
  }

  async function handleRefreshGpsStatus() {
    await refreshGpsStatus({ publishNow: false });
  }

  async function handleOpenGpsSettings() {
    await Linking.openSettings().catch(() => null);
  }

  const content = useMemo(() => {
    if (state.loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Surucu mobil beta hazirlaniyor...</Text>
        </View>
      );
    }

    if (!state.session?.token || !state.me) {
      return <LoginScreen onLogin={handleLogin} initialError={state.error} />;
    }

    if (String(state.me?.role || '').toUpperCase() !== 'DRIVER') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Bu uygulama yalnizca surucu icindir.</Text>
          <Text style={styles.muted}>Bu hesap {String(state.me?.role || '-')} rolunde gorunuyor.</Text>
        </View>
      );
    }

    if (state.me?.requirePinChange) {
      return <PinChangeScreen onSubmit={handlePinChange} />;
    }

    return (
      <TodayScreen
        me={state.me}
        today={state.today}
        route={state.route}
        error={state.error}
        health={state.health}
        deviceId={state.deviceId}
        apiBaseUrl={getApiBaseUrl()}
        lastSyncAt={state.lastSyncAt}
        lastErrorAt={state.lastErrorAt}
        syncing={state.syncing}
        voiceEnabled={state.voiceEnabled}
        releaseInfo={RELEASE_INFO}
        gps={state.gps}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        onToggleVoiceGuidance={handleToggleVoiceGuidance}
        onSpeakNextStop={handleSpeakNextStop}
        onSpeakEta={handleSpeakEta}
        onRequestGpsPermission={handleRequestGpsPermission}
        onRefreshGpsStatus={handleRefreshGpsStatus}
        onOpenGpsSettings={handleOpenGpsSettings}
        onPublishGpsNow={handlePublishGpsNow}
      />
    );
  }, [state]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {content}
    </SafeAreaView>
  );
}

function humanize(error) {
  return String(error?.payload?.message || error?.payload?.error || error?.message || error || 'Islem basarisiz.');
}

function humanizeGpsError(error) {
  const text = String(error?.payload?.message || error?.payload?.error || error?.message || error || '').toLowerCase();
  if (text.includes('network') || text.includes('fetch')) return 'Baglanti yok. Konum tekrar denenecek.';
  if (Number(error?.status || 0) === 403) return 'Gorev ve arac bilgisi guncelleniyor. Konum tekrar denenecek.';
  if (Number(error?.status || 0) === 401) return 'Oturum yenilenemedi. Konum tekrar denenecek.';
  return 'Konum gonderilemedi, tekrar denenecek.';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  muted: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
});
