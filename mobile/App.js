import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
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
} from './src/lib/api';
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
};

export default function App() {
  const [state, setState] = useState(initialState);
  const syncBusyRef = useRef(false);
  const lastVoiceCueRef = useRef('');

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
      if (nextState === 'active') {
        syncSignedIn({ soft: true }).catch(() => null);
      }
    });
    return () => sub.remove();
  }, [state.session?.token, state.me?.requirePinChange]);

  useEffect(() => {
    if (!state.session?.token || state.me?.requirePinChange) return;
    const timer = setInterval(() => {
      syncSignedIn({ soft: true }).catch(() => null);
    }, 30000);
    return () => clearInterval(timer);
  }, [state.session?.token, state.me?.requirePinChange]);

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
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        onToggleVoiceGuidance={handleToggleVoiceGuidance}
        onSpeakNextStop={handleSpeakNextStop}
        onSpeakEta={handleSpeakEta}
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
