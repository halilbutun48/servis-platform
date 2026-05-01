import { useMemo } from 'react';
import { Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { listVisibleShifts, resolveDriverGpsShiftContext } from '../lib/gps';
import DriverAvailabilityCard from './DriverAvailabilityCard';
import DriverChangeAwarenessCard from './DriverChangeAwarenessCard';
import { DriverDiagnosticsCard } from './driverPremiumUi';
import NotificationCenterCard from './NotificationCenterCard';
import DriverTaskSummaryCard from './DriverTaskSummaryCard';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, ShiftChooser, fmt, isStale, styles } from './mobileUi';
import { humanizeDriverUiText } from './driverUiText';

export default function TodayScreen({
  me,
  today,
  route,
  error,
  health,
  routeOpsBusy,
  routeOpsText,
  deviceId,
  apiBaseUrl,
  lastSyncAt,
  lastErrorAt,
  syncing,
  usingCachedData,
  releaseInfo,
  net,
  gps,
  kvkk,
  selectedShiftId,
  driverAvailability,
  voiceEnabled,
  driverAwareness,
  notifications,
  onRefresh,
  onLogout,
  onOpenLive,
  onSelectShift,
  onStartShift,
  onCompleteShift,
  onMarkReached,
  onSpeakNextStop,
  onSpeakEta,
  onSpeakDriverAwareness,
  onAcknowledgeDriverAwareness,
  onMarkNotificationsSeen,
  onOpenSettings,
  onPublishGpsNow,
  onSetDriverAvailability,
}) {
  const visibleShifts = listVisibleShifts(today);
  const activeShift = resolveDriverGpsShiftContext(today, route, selectedShiftId).activeShift;
  const nextStop = route?.nextStop || null;
  const pendingStops = Array.isArray(route?.orderedStops)
    ? route.orderedStops.filter((stop) => String(stop?.state || '').toUpperCase() === 'PENDING')
    : [];
  const routePreviewStops = pendingStops.slice(0, 6);
  const routeSummary = useMemo(() => {
    const summary = route?.summary || {};
    const progress = route?.progress || {};
    const remainingRouteEtaMin = summary.remainingRouteEtaMin ?? route?.remainingRouteEtaMin ?? null;
    const remainingKm = summary.remainingKm ?? route?.remainingKm ?? null;
    const remainingStops = summary.remainingStops ?? pendingStops.length ?? null;
    const remainingPassengers = summary.remainingPassengers ?? route?.remainingPassengers ?? null;
    const lastReachedOrder = progress.lastReachedOrder ?? summary.lastReachedOrder ?? null;
    const completed = Boolean(progress.completed ?? summary.completed);
    const paused = Boolean(progress.pausedAt);
    const statusText = completed ? 'Tamamlandı' : paused ? 'Duraklatıldı' : activeShift ? 'Çalışıyor' : 'Görev yok';
    return {
      remainingRouteEtaMin,
      remainingKm,
      remainingStops,
      remainingPassengers,
      lastReachedOrder,
      completed,
      paused,
      statusText,
    };
  }, [activeShift, pendingStops.length, route]);
  const headerText = useMemo(() => {
    const fullName = String(me?.fullName || 'Sürücü').trim();
    return fullName ? `${fullName}, bugün görev ekranın hazır.` : 'Bugün görev ekranın hazır.';
  }, [me?.fullName]);
  const stale = isStale(lastSyncAt);
  const kvkkBlocking = Boolean(kvkk?.blocking);
  const refreshControl = Platform.OS === 'ios'
    ? <RefreshControl refreshing={!!syncing} onRefresh={onRefresh} />
    : undefined;

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
    >
      <Card>
        <Text style={styles.title}>Günaydın</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${humanizeDriverUiText(me?.role || '-', 'Bilinmiyor')}`} />
          <Pill label={syncing ? 'Senkron oluyor' : 'Hazır'} tone={syncing ? 'warn' : 'ok'} />
          {usingCachedData ? <Pill label="Önbellekten açıldı" tone="warn" /> : null}
          {stale ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
          {kvkkBlocking ? <Pill label="KVKK eksik" tone="warn" /> : <Pill label="KVKK hazır" tone="ok" />}
        </View>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card>
        <SectionTitle title="Vardiya seçimi" subtitle="Sürücü birden fazla vardiya görüyorsa doğru vardiyayı buradan seçer." />
        {visibleShifts.length ? (
          <ShiftChooser shifts={visibleShifts} selectedShiftId={selectedShiftId || route?.shift?.id} onSelectShift={onSelectShift} />
        ) : (
          <EmptyState title="Görünür vardiya yok" text="Bugün veya yakın zaman için atanmış vardiya görünmüyor." />
        )}
      </Card>

      <DriverAvailabilityCard
        driverAvailability={driverAvailability}
        routeOpsBusy={routeOpsBusy}
        onSetDriverAvailability={onSetDriverAvailability}
      />

      <DriverTaskSummaryCard
        title="Bugünkü Vardiya"
        subtitle="Rota, tahmini varış ve hızlı işlemler tek yerde."
        activeShift={activeShift}
        route={route}
        routeSummary={routeSummary}
        nextStop={nextStop}
        routePreviewStops={routePreviewStops}
        routeOpsText={routeOpsText}
        routeOpsBusy={routeOpsBusy}
        showWorkflowActions
        onStartShift={onStartShift}
        onMarkReached={onMarkReached}
        onCompleteShift={onCompleteShift}
        onOpenLive={onOpenLive}
        onRefresh={onRefresh}
      />

      <NotificationCenterCard
        notifications={notifications}
        routeOpsBusy={routeOpsBusy}
        onMarkLatestSeen={onMarkNotificationsSeen}
        onRefresh={onRefresh}
      />

      <DriverChangeAwarenessCard
        voiceEnabled={Boolean(voiceEnabled)}
        driverAwareness={driverAwareness}
        routeOpsBusy={routeOpsBusy}
        onSpeakDriverAwareness={onSpeakDriverAwareness}
        onAcknowledgeDriverAwareness={onAcknowledgeDriverAwareness}
        onRefresh={onRefresh}
      />

      <Card>
        <SectionTitle title="Sürüş ve GPS yardımı" subtitle="Rota, konum ve sesli rehber kısa yoldan erişilir." />
        <Info label="Rota durumu" value={humanizeDriverUiText(route?.mode || 'NO_DATA', 'Veri yok')} />
        <Info label="Tahmini varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Info label="Kalan km" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
        <Info label="Toplam durak" value={route?.summary?.totalStops != null ? String(route.summary.totalStops) : Array.isArray(route?.orderedStops) ? String(route.orderedStops.length) : '-'} />
        <View style={styles.actionsRow}>
          <SecondaryButton title="Sıradaki durağı oku" onPress={onSpeakNextStop} disabled={!onSpeakNextStop || !nextStop} />
          <SecondaryButton title="Tahmini varış oku" onPress={onSpeakEta} disabled={!onSpeakEta || !nextStop} />
          <SecondaryButton title="Ayarları aç" onPress={onOpenSettings} />
          <SecondaryButton title="Konumu şimdi gönder" onPress={onPublishGpsNow} />
        </View>
      </Card>

      <DriverDiagnosticsCard
        title="Gelişmiş durum"
        subtitle="Teknik ayrıntılar burada gizli tutulur."
        summary="Bağlantı, KVKK, GPS, yayın ve ortam bilgileri burada toplanır."
        items={[
          { label: 'Bağlantı durumu', value: humanizeDriverUiText(net?.status || '-', 'Bilinmiyor') },
          { label: 'Bağlantı mesajı', value: net?.message || '-' },
          { label: 'Son online', value: fmt(net?.lastOnlineAt) },
          { label: 'Son offline', value: fmt(net?.lastOfflineAt) },
          { label: 'Son toparlanma', value: fmt(net?.lastRecoveryAt) },
          { label: 'Yeniden deneme sayısı', value: net?.retryCount != null ? String(net.retryCount) : '-' },
          { label: 'Sonraki deneme', value: fmt(net?.nextRetryAt) },
          { label: 'KVKK durumu', value: kvkk?.message || '-' },
          { label: 'Gerekli belge', value: kvkk?.requiredCount != null ? String(kvkk.requiredCount) : '-' },
          { label: 'Kabul edilen', value: kvkk?.acceptedCount != null ? String(kvkk.acceptedCount) : '-' },
          { label: 'Bekleyen', value: Array.isArray(kvkk?.pendingDocKeys) && kvkk.pendingDocKeys.length ? kvkk.pendingDocKeys.join(', ') : '-' },
          { label: 'Arka plan görev desteği', value: gps?.backgroundTaskAvailableText || '-' },
          { label: 'Sağlık', value: health?.ok ? 'Hazır' : humanizeDriverUiText(health?.status || '-', 'Bilinmiyor') },
          { label: 'GPS', value: humanizeDriverUiText(gps?.publishState || '-', 'Bilinmiyor') },
          { label: 'Konum kaynağı', value: gps?.displaySourceText || '-' },
          { label: 'Resmi GPS tazeliği', value: gps?.officialFreshnessText || '-' },
          { label: 'Arka plan izni', value: gps?.backgroundPermissionText || '-' },
          { label: 'Arka plan servis', value: humanizeDriverUiText(gps?.backgroundTaskState || '-', 'Bilinmiyor') },
          { label: 'Son arka plan nedeni', value: gps?.lastBackgroundReason || '-' },
          { label: 'GPS tekrar sayısı', value: gps?.retryCount != null ? String(gps.retryCount) : '-' },
          { label: 'GPS sonraki deneme', value: fmt(gps?.nextRetryAt) },
          { label: 'API taban', value: apiBaseUrl || '-' },
          { label: 'Device ID', value: deviceId || '-' },
          { label: 'Son başarılı senkron', value: fmt(lastSyncAt) },
          { label: 'Son hata', value: fmt(lastErrorAt) },
          { label: 'Yayın hedefi', value: releaseInfo?.releaseTarget || '-' },
          { label: 'Yayın profilleri', value: humanizeDriverUiText(releaseInfo?.buildProfiles || '-', '-') },
          { label: 'Dağıtım', value: releaseInfo?.deliveryMode || '-' },
          { label: 'Canlı test', value: humanizeDriverUiText(releaseInfo?.expoGoStatus || '-', 'Bilinmiyor') },
          { label: 'Android önizleme', value: humanizeDriverUiText(releaseInfo?.androidPreview || 'Hazır', 'Hazır') },
          { label: 'Yayın paketi', value: humanizeDriverUiText(releaseInfo?.productionBundle || 'Hazır', 'Hazır') },
          { label: 'Ortam aşaması', value: humanizeDriverUiText(releaseInfo?.envStage || '-', 'Bilinmiyor') },
          { label: 'Derleme durumu', value: humanizeDriverUiText(releaseInfo?.androidPreview || '-', 'Bilinmiyor') },
          { label: 'API adresi', value: releaseInfo?.apiHost || '-' },
          { label: 'API şeması', value: releaseInfo?.apiScheme || '-' },
          { label: 'Zaman aşımı', value: releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-' },
          { label: 'Kabul özeti', value: releaseInfo?.acceptanceSummary || '-' },
        ]}
        footer={Array.isArray(releaseInfo?.acceptanceIssues) && releaseInfo.acceptanceIssues.length ? releaseInfo.acceptanceIssues.join(' • ') : ''}
      />
    </ScrollView>
  );
}
