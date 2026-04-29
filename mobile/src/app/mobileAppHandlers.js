import { Linking } from 'react-native';
import {
  acceptKvkkRequiredMany,
  changeDriverPin,
  completeDriverShift,
  ensureDeviceId,
  isSessionFailureError,
  loginDriver,
  logoutDriver,
  reportSelfNoShow,
  markDriverStopReached,
  pauseDriverShift,
  reopenDriverStop,
  resumeDriverShift,
  skipDriverStop,
  startDriverShift,
  undoDriverStop,
} from '../lib/api';
import {
  clearLastMobileSnapshot,
  clearPendingSessionEvent,
  clearSelectedChildId,
  clearSelectedShiftId,
  clearSession,
  getSession,
  saveSelectedChildId,
  saveSelectedShiftId,
  saveSession,
  saveVoiceGuidanceEnabled,
} from '../lib/storage';
import {
  applyGpsRuntimeSnapshot,
  decorateGpsState,
  humanize,
  humanizeGpsError,
  readGpsRuntimeSnapshot,
} from './mobileAppState';
import {
  buildVoiceCueKey,
  buildVoiceWelcomeKey,
  speakNextStop,
  speakShiftWelcome,
  speakStopEta,
  stopVoiceGuidance,
} from '../lib/voice';
import { resolveCurrentShiftId as resolveCurrentShiftIdFlow } from './mobileAppFlow';
import { stopDriverBackgroundLocation, syncDriverBackgroundLocation } from '../lib/backgroundGps';

export function createMobileAppHandlers({
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
}) {
  async function runRouteAction(label, runner) {
    const shiftId = resolveCurrentShiftIdFlow({
      selectedShiftId: state.selectedShiftId,
      route: state.route,
      today: state.today,
    });
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
    setState((prev) => ({
      ...prev,
      selectedShiftId: nextShiftId,
      gps: decorateGpsState(prev.gps, prev.route, {
        usingCachedData: prev.usingCachedData,
        netStatus: prev.net?.status || 'unknown',
        selectedShiftId: nextShiftId,
      }),
      error: '',
    }));
    try {
      await syncSignedIn({ soft: true, preferredShiftIdOverride: nextShiftId, force: true });
      await refreshGpsStatus({ publishNow: false, force: true });
    } catch {
      // state already updated by sync/gps helpers
    }
  }

  async function handleSelectChild(childId) {
    const nextChildId = Number(childId || 0) || null;
    if (!nextChildId) return;
    await saveSelectedChildId(nextChildId);
    setState((prev) => ({
      ...prev,
      selectedChildId: nextChildId,
      error: '',
    }));
    try {
      await syncSignedIn({ soft: true, force: true });
    } catch {
      // state already updated by sync helper
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
    await Promise.all([
      saveSession(session),
      clearSelectedShiftId(),
      clearSelectedChildId(),
      clearPendingSessionEvent().catch(() => null),
    ]);
    resetSyncRetryState();
    resetGpsRetryState();
    setRouteOps({ busy: false, message: '' });
    setScreen('today');
    setState((prev) => ({
      ...initialState,
      loading: true,
      session,
      deviceId,
      voiceEnabled: prev.voiceEnabled,
    }));
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
      await Promise.all([
        clearSession(),
        clearLastMobileSnapshot(),
        clearSelectedShiftId(),
        clearSelectedChildId(),
        clearPendingSessionEvent().catch(() => null),
      ]);
      resetSyncRetryState();
      resetGpsRetryState();
      setScreen('today');
      setRouteOps({ busy: false, message: '' });
      setState({ ...initialState, loading: false, deviceId: state.deviceId });
    }
  }

  async function handleReportNoShow({ childId = null, reason = '' } = {}) {
    const role = String(state.me?.role || '').trim().toUpperCase();
    const targetChildId = role === 'PARENT'
      ? (Number(childId || state.selectedChildId || 0) || null)
      : null;
    if (role === 'PARENT' && !targetChildId) {
      setState((prev) => ({
        ...prev,
        error: 'Önce bağlı öğrenci seçin.',
        lastErrorAt: new Date().toISOString(),
      }));
      return;
    }

    setRouteOps({ busy: true, message: 'Bildirim gönderiliyor...' });
    try {
      await reportSelfNoShow({
        childId: targetChildId,
        reason: String(reason || '').trim() || (role === 'PARENT' ? 'Bugün öğrencim servise binmeyecek.' : 'Bugün servisi kullanmayacağım.'),
      });
      await syncSignedIn({ soft: true, force: true });
      setRouteOps({ busy: false, message: 'Bildirim kaydedildi.' });
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
      if (snapshot) applyGpsRuntimeSnapshot(setState, snapshot);
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

  return {
    handleOpenToday,
    handleOpenRoute,
    handleOpenLive,
    handleSelectShift,
    handleSelectChild,
    handleStartShift,
    handlePauseShift,
    handleResumeShift,
    handleCompleteShift,
    handleMarkReached,
    handleSkipStop,
    handleReopenStop,
    handleUndoStop,
    handleLogin,
    handlePinChange,
    handleRefresh,
    handleLogout,
    handleToggleVoiceGuidance,
    handleSpeakNextStop,
    handleSpeakEta,
    handleRequestGpsPermission,
    handlePublishGpsNow,
    handleRefreshGpsStatus,
    handleOpenGpsSettings,
    handleAcceptKvkk,
    handleRefreshKvkk,
    handleReportNoShow,
  };
}
