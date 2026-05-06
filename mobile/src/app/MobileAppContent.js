import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import ForcePasswordChangeScreen from '../screens/ForcePasswordChangeScreen';
import LiveScreen from '../screens/LiveScreen';
import DriverShellLoadingScreen from '../screens/DriverShellLoadingScreen';
import PinChangeScreen from '../screens/PinChangeScreen';
import RoleHomeScreen from '../screens/RoleHomeScreen';
import RouteScreen from '../screens/RouteScreen';
import TodayScreen from '../screens/TodayScreen';
import { DriverAppHeader, DriverBottomTabBar } from '../screens/driverPremiumUi';
import { styles as appStyles } from './mobileAppState';

function LoadingScreen({ styles }) {
  return (
    <View style={[styles.safe, loadingStyles.wrap]}>
      <ActivityIndicator color="#0f172a" />
      <Text style={loadingStyles.title}>Mobil uygulama hazırlanıyor</Text>
      <Text style={loadingStyles.text}>Oturum ve son kayıtlar yükleniyor.</Text>
    </View>
  );
}

function DriverShellFrame({
  screen,
  me,
  today,
  route,
  gps,
  lastSyncAt,
  onOpenToday,
  onOpenRoute,
  onOpenLive,
  onNotifications,
  onProfile,
  children,
}) {
  return (
    <View style={shellStyles.driverShell}>
      <DriverAppHeader
        screen={screen}
        me={me}
        today={today}
        route={route}
        gps={gps}
        lastSyncAt={lastSyncAt}
        onOpenToday={onOpenToday}
        onOpenRoute={onOpenRoute}
        onOpenLive={onOpenLive}
      />
      <View style={shellStyles.driverBody}>{children}</View>
      <DriverBottomTabBar
        current={String(screen || 'today').toLowerCase()}
        onToday={onOpenToday}
        onRoute={onOpenRoute}
        onLive={onOpenLive}
        onNotifications={onNotifications}
        onProfile={onProfile}
      />
    </View>
  );
}

export default function MobileAppContent({
  state,
  screen,
  routeOps,
  styles: shellStyles = appStyles,
  releaseInfo,
  apiBaseUrl = '',
  onDriverShellReady,
  onLogin,
  onPinChange,
  onPasswordChange,
  onLogout,
  onRefresh,
  onOpenToday,
  onOpenRoute,
  onOpenLive,
  onSelectShift,
  onSelectChild,
  driverAvailability,
  routeOpsBusy,
  routeOpsText,
  boardingChange,
  onStartShift,
  onPauseShift,
  onResumeShift,
  onCompleteShift,
  onMarkReached,
  onSkipStop,
  onReopenStop,
  onUndoStop,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
  onSpeakDriverAwareness,
  onAcknowledgeDriverAwareness,
  onMarkNotificationsSeen,
  onRequestGpsPermission,
  onRefreshGpsStatus,
  onOpenGpsSettings,
  onPublishGpsNow,
  onAcceptKvkk,
  onRefreshKvkkStatus,
  onReportNoShow,
  onRequestBoardingChange,
  onSetDriverAvailability,
  }) {
  const hasSession = Boolean(state?.session?.token);
  const loading = Boolean(state?.loading && !state?.me);
  const role = String(state?.me?.role || '').trim().toUpperCase();
  const requiresPinChange = role === 'DRIVER' && Boolean(state?.me?.requirePinChange);
  const requiresPasswordChange = Boolean(state?.me?.requirePasswordChange);
  const postLoginLoading = Boolean(
    hasSession &&
    !state?.me?.requirePinChange &&
    state?.loading
  );

  if (requiresPinChange) {
    return (
      <PinChangeScreen
        onSubmit={onPinChange}
        onLogout={onLogout}
        initialError={state?.error || ''}
      />
    );
  }

  if (requiresPasswordChange) {
    return (
      <ForcePasswordChangeScreen
        onSubmit={onPasswordChange}
        onLogout={onLogout}
        initialError={state?.error || ''}
      />
    );
  }

  if (postLoginLoading) {
    return (
      <DriverShellLoadingScreen
        role={role}
        screen={screen}
        error={state?.error || ''}
        health={state?.health || null}
        deviceId={state?.deviceId || ''}
        apiBaseUrl={apiBaseUrl}
        lastSyncAt={state?.lastSyncAt || ''}
        loading={Boolean(state?.loading)}
        syncing={Boolean(state?.syncing)}
        releaseInfo={releaseInfo}
        onReady={onDriverShellReady}
        onRefresh={onRefresh}
        onLogout={onLogout}
      />
    );
  }

  if (loading) {
    return <LoadingScreen styles={shellStyles} />;
  }

  if (!state?.session?.token) {
    return (
      <LoginScreen
        onLogin={onLogin}
        initialError={state?.error || ''}
        apiBaseUrl={apiBaseUrl}
        deviceId={state?.deviceId || ''}
        releaseInfo={releaseInfo}
      />
    );
  }

  if (role && role !== 'DRIVER') {
    return (
      <RoleHomeScreen
        role={role}
        me={state?.me || null}
        health={state?.health || null}
        deviceId={state?.deviceId || ''}
        apiBaseUrl={apiBaseUrl}
        lastSyncAt={state?.lastSyncAt || ''}
        releaseInfo={releaseInfo}
        roleLive={state?.roleLive || null}
        boardingChange={state?.boardingChange || null}
        notifications={state?.notifications || null}
        routeOpsBusy={Boolean(routeOps?.busy)}
        routeOpsText={routeOps?.message || ''}
        selectedShiftId={state?.selectedShiftId || null}
        selectedChildId={state?.selectedChildId || null}
        onRefresh={onRefresh}
        onLogout={onLogout}
        onSelectShift={onSelectShift}
        onSelectChild={onSelectChild}
        onReportNoShow={onReportNoShow}
        onRequestBoardingChange={onRequestBoardingChange}
      />
    );
  }

  const activeScreen = String(screen || 'today').toLowerCase();
  if (activeScreen === 'route') {
    return (
      <DriverShellFrame
        screen={activeScreen}
        me={state?.me || null}
        today={state?.today || null}
        route={state?.route || null}
        gps={state?.gps || null}
        lastSyncAt={state?.lastSyncAt || ''}
        onOpenToday={onOpenToday}
        onOpenRoute={onOpenRoute}
        onOpenLive={onOpenLive}
      >
        <RouteScreen
          today={state?.today || null}
          route={state?.route || null}
          error={state?.error || ''}
          syncing={Boolean(state?.syncing)}
          selectedShiftId={state?.selectedShiftId || null}
          routeOpsBusy={Boolean(routeOps?.busy)}
          routeOpsText={routeOps?.message || ''}
          onRefresh={onRefresh}
          onOpenToday={onOpenToday}
          onStartShift={onStartShift}
          onPauseShift={onPauseShift}
          onResumeShift={onResumeShift}
          onCompleteShift={onCompleteShift}
          onMarkReached={onMarkReached}
          onSkipStop={onSkipStop}
          onReopenStop={onReopenStop}
          onUndoStop={onUndoStop}
          voiceEnabled={Boolean(state?.voiceEnabled)}
          onToggleVoiceGuidance={onToggleVoiceGuidance}
          onSpeakNextStop={onSpeakNextStop}
          onSpeakEta={onSpeakEta}
        />
      </DriverShellFrame>
    );
  }

  if (activeScreen === 'live') {
    return (
      <DriverShellFrame
        screen={activeScreen}
        me={state?.me || null}
        today={state?.today || null}
        route={state?.route || null}
        gps={state?.gps || null}
        lastSyncAt={state?.lastSyncAt || ''}
        onOpenToday={onOpenToday}
        onOpenRoute={onOpenRoute}
        onOpenLive={onOpenLive}
      >
        <LiveScreen
          today={state?.today || null}
          route={state?.route || null}
          lastSyncAt={state?.lastSyncAt || ''}
          net={state?.net || null}
          gps={state?.gps || null}
          kvkk={state?.kvkk || null}
          selectedShiftId={state?.selectedShiftId || null}
          onRequestGpsPermission={onRequestGpsPermission}
          onRefreshGpsStatus={onRefreshGpsStatus}
          onOpenGpsSettings={onOpenGpsSettings}
          onPublishGpsNow={onPublishGpsNow}
          releaseInfo={releaseInfo}
        />
      </DriverShellFrame>
    );
  }

  return (
    <DriverShellFrame
      screen={activeScreen}
      me={state?.me || null}
      today={state?.today || null}
      route={state?.route || null}
      gps={state?.gps || null}
      lastSyncAt={state?.lastSyncAt || ''}
      onOpenToday={onOpenToday}
      onOpenRoute={onOpenRoute}
      onOpenLive={onOpenLive}
    >
      <TodayScreen
        me={state?.me || null}
        today={state?.today || null}
        route={state?.route || null}
        error={state?.error || ''}
        health={state?.health || null}
        deviceId={state?.deviceId || ''}
        apiBaseUrl={apiBaseUrl}
        lastSyncAt={state?.lastSyncAt || ''}
        lastErrorAt={state?.lastErrorAt || ''}
        syncing={Boolean(state?.syncing)}
        usingCachedData={Boolean(state?.usingCachedData)}
        releaseInfo={releaseInfo}
        net={state?.net || null}
        gps={state?.gps || null}
        kvkk={state?.kvkk || null}
        driverAvailability={driverAvailability || state?.driverAvailability || null}
        voiceEnabled={Boolean(state?.voiceEnabled)}
        driverAwareness={state?.driverAwareness || null}
        notifications={state?.notifications || null}
        selectedShiftId={state?.selectedShiftId || null}
        routeOpsBusy={routeOpsBusy}
        routeOpsText={routeOpsText}
        onRefresh={onRefresh}
        onLogout={onLogout}
        onOpenRoute={onOpenRoute}
        onOpenLive={onOpenLive}
        onSelectShift={onSelectShift}
        onStartShift={onStartShift}
        onCompleteShift={onCompleteShift}
        onMarkReached={onMarkReached}
        onSpeakNextStop={onSpeakNextStop}
        onSpeakEta={onSpeakEta}
        onSpeakDriverAwareness={onSpeakDriverAwareness}
        onAcknowledgeDriverAwareness={onAcknowledgeDriverAwareness}
        onMarkNotificationsSeen={onMarkNotificationsSeen}
        onSetDriverAvailability={onSetDriverAvailability}
      />
    </DriverShellFrame>
  );
}

const loadingStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  text: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
});

const shellStyles = StyleSheet.create({
  driverShell: {
    flex: 1,
    backgroundColor: '#eef4fb',
  },
  driverBody: {
    flex: 1,
  },
});
