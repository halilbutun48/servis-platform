import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { clearSession, getSession, saveSession } from './src/lib/storage';
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
import LoginScreen from './src/screens/LoginScreen';
import PinChangeScreen from './src/screens/PinChangeScreen';
import TodayScreen from './src/screens/TodayScreen';

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
};

export default function App() {
  const [state, setState] = useState(initialState);
  const syncBusyRef = useRef(false);

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
        if (!alive) return;
        if (!session?.token) {
          setState((prev) => ({ ...prev, loading: false, session: session || null, deviceId }));
          return;
        }
        setState((prev) => ({ ...prev, session, deviceId }));
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
      await logoutDriver();
    } finally {
      await clearSession();
      setState({ ...initialState, loading: false, deviceId: state.deviceId });
    }
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
        onRefresh={handleRefresh}
        onLogout={handleLogout}
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
