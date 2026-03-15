import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { clearSession, getSession, saveSession } from './src/lib/storage';
import { apiGet, changeDriverPin, ensureDeviceId, fetchActiveRoute, fetchMe, fetchToday, loginDriver } from './src/lib/api';
import LoginScreen from './src/screens/LoginScreen';
import PinChangeScreen from './src/screens/PinChangeScreen';
import TodayScreen from './src/screens/TodayScreen';

const initialState = {
  loading: true,
  session: null,
  me: null,
  today: null,
  route: null,
  error: '',
};

export default function App() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureDeviceId();
        const session = await getSession();
        if (!alive) return;
        if (!session?.token) {
          setState((prev) => ({ ...prev, loading: false, session: session || null }));
          return;
        }
        const me = await fetchMe();
        const [today, route] = await Promise.all([fetchToday().catch(() => null), fetchActiveRoute().catch(() => null)]);
        if (!alive) return;
        setState({ loading: false, session, me, today, route, error: '' });
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

  async function handleLogin({ identifier, password }) {
    const data = await loginDriver(identifier, password);
    const session = {
      token: data.token,
      refreshToken: data.refreshToken || '',
      deviceId: data.deviceId || '',
    };
    await saveSession(session);
    const me = await fetchMe();
    const [today, route] = await Promise.all([fetchToday().catch(() => null), fetchActiveRoute().catch(() => null)]);
    setState({ loading: false, session, me, today, route, error: '' });
  }

  async function handlePinChange({ currentPin, newPin }) {
    await changeDriverPin(currentPin, newPin);
    const me = await fetchMe();
    const today = await fetchToday().catch(() => null);
    const route = await fetchActiveRoute().catch(() => null);
    setState((prev) => ({ ...prev, me, today, route }));
  }

  async function handleRefresh() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const me = await fetchMe();
      const [today, route] = await Promise.all([fetchToday().catch(() => null), fetchActiveRoute().catch(() => null)]);
      setState((prev) => ({ ...prev, loading: false, me, today, route, error: '' }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: humanize(error) }));
    }
  }

  async function handleLogout() {
    try {
      await apiGet('/api/me');
    } catch {
      // no-op, foundation logout is local only
    }
    await clearSession();
    setState({ ...initialState, loading: false, session: null, me: null, today: null, route: null, error: '' });
  }

  const content = useMemo(() => {
    if (state.loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Sürücü mobil hazırlanıyor...</Text>
        </View>
      );
    }

    if (!state.session?.token || !state.me) {
      return <LoginScreen onLogin={handleLogin} initialError={state.error} />;
    }

    if (String(state.me?.role || '').toUpperCase() !== 'DRIVER') {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Bu uygulama yalnızca sürücü içindir.</Text>
          <Text style={styles.muted}>Bu hesap {String(state.me?.role || '-')} rolünde görünüyor.</Text>
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
