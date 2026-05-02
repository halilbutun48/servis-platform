import { ScrollView, Text, View } from 'react-native';
import { resolveDriverGpsShiftContext } from '../lib/gps';
import { DriverDiagnosticsCard, GpsSourceStatusCard } from './driverPremiumUi';
import { Card, Pill, fmt, isStale, styles } from './mobileUi';
import { driverGpsBackgroundReasonText, driverGpsPrimaryActionLabel, driverGpsStatusLabel, humanizeDriverUiText } from './driverUiText';

export default function LiveScreen({
  today,
  route,
  lastSyncAt,
  net,
  gps,
  kvkk,
  selectedShiftId,
  onRequestGpsPermission,
  onRefreshGpsStatus,
  onOpenGpsSettings,
  onPublishGpsNow,
  releaseInfo,
}) {
  const gpsContext = resolveDriverGpsShiftContext(today, route, selectedShiftId);
  const hasActiveShift = Boolean(gpsContext.activeShift);
  const hasVehicle = Boolean(gpsContext.vehicleId);
  const gpsNeedsPermission = gps?.permissionStatus !== 'granted' || gps?.backgroundPermissionStatus !== 'granted';
  const gpsCanOpenSettings = Boolean(gps?.canOpenSettings);
  const backgroundTaskAvailable = Boolean(gps?.backgroundTaskAvailable);
  const backgroundTaskRunning = String(gps?.backgroundTaskState || '').toLowerCase() === 'running';
  const kvkkBlocking = Boolean(kvkk?.blocking);
  const stale = isStale(lastSyncAt);
  const gpsActionTitle = driverGpsPrimaryActionLabel({
    gpsNeedsPermission,
    backgroundTaskRunning,
    hasActiveShift,
    backgroundTaskAvailable,
    hasVehicle,
    canPublish: gpsContext.canPublish,
  });
  const gpsPrimaryAction = backgroundTaskRunning ? onPublishGpsNow : onRequestGpsPermission;
  const gpsPrimaryDisabled = kvkkBlocking || !backgroundTaskAvailable || !hasActiveShift || !hasVehicle || !gpsContext.canPublish;
  const gpsBackgroundReasonText = driverGpsBackgroundReasonText(gps?.lastBackgroundReason || gpsContext.reason, {
    hasActiveShift,
    hasVehicle,
    backgroundTaskAvailable,
    gpsNeedsPermission,
    backgroundPermissionGranted: gps?.backgroundPermissionStatus === 'granted',
    backgroundTaskRunning,
  });
  const gpsStatusText = driverGpsStatusLabel({
    gpsNeedsPermission,
    backgroundPermissionGranted: gps?.backgroundPermissionStatus === 'granted',
    backgroundTaskAvailable,
    backgroundTaskRunning,
    hasVehicle,
    canPublish: gpsContext.canPublish,
    publishState: gps?.publishState || '',
  });
  const showGpsDebug = String(releaseInfo?.envStage || '').trim().toLowerCase() === 'local-emulator';
  const releaseStageText = humanizeDriverUiText(releaseInfo?.envStage || '-', 'Bilinmiyor');
  const releaseStatusText = humanizeDriverUiText(releaseInfo?.acceptanceStatusText || 'READY', 'Hazır');
  const netStatusText = humanizeDriverUiText(net?.status || '-', 'Bilinmiyor');
  const sourceCards = [
    {
      key: 'vehicle',
      title: "Araç GPS'i",
      subtitle: gps?.officialSourceText || "Araçtan gelen konum verisi.",
      badge: gps?.officialFreshnessText || 'Bekliyor',
      active: String(gps?.officialSourceKey || '').includes('BACKEND_VEHICLE_GPS'),
      tone: 'success',
    },
    {
      key: 'driver-phone',
      title: "Sürücünün telefon GPS'i",
      subtitle: gps?.displaySourceText === "Sürücünün telefon GPS'i"
        ? 'Telefon GPS’i ile konum paylaşımı aktif.'
        : "Telefon GPS'i yedek kaynak olarak hazır.",
      badge: gps?.displaySourceText === "Sürücünün telefon GPS'i" ? 'Aktif' : 'Bekliyor',
      active: gps?.displaySourceText === "Sürücünün telefon GPS'i",
      tone: 'info',
    },
    {
      key: 'waiting',
      title: 'GPS bekleniyor',
      subtitle: gpsNeedsPermission ? 'GPS izni bekleniyor.' : 'Konum verisi kısa süreli bekleniyor.',
      badge: gpsNeedsPermission ? 'İzin gerekli' : 'Hazır',
      active: !gps?.displaySourceText || gps?.displaySourceKey === 'NONE',
      tone: 'warning',
    },
  ];
  const summaryItems = [
    { label: 'Görev durumu', value: gpsContext.canPublish ? 'Aktif görev var' : 'Aktif görev yok', note: gpsContext.shiftId ? `#${gpsContext.shiftId}` : '' },
    { label: 'Son konum kaynağı', value: gps?.displaySourceText || '-', note: gps?.officialFreshnessText || '' },
    { label: 'Konum güncellendi', value: fmt(gps?.displayAt || gps?.lastSentAt), note: gpsStatusText },
    { label: 'Konum doğruluğu', value: gps?.officialFreshnessText || '-', note: gpsBackgroundReasonText || '' },
  ];

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Canlı</Text>
        <Text style={styles.subtitle}>Bağlantı, sürücünün telefon GPS'i ve KVKK bu ekrandan izlenir.</Text>
        <View style={styles.rowGap}>
          <Pill label={`Vardiya: ${selectedShiftId || route?.shift?.id || today?.active?.id || '-'}`} tone={selectedShiftId || route?.shift?.id ? 'ok' : 'warn'} />
          <Pill label={`Bağlantı: ${netStatusText}`} tone={net?.status === 'online' ? 'ok' : net?.status === 'offline' ? 'warn' : 'info'} />
          {stale ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
        </View>
      </Card>

      <GpsSourceStatusCard
        title="Konum ve GPS durumu"
        subtitle="Araç GPS'i, sürücünün telefon GPS'i ve bekleyen durumlar."
        sourceCards={sourceCards}
        primaryActionLabel={gpsActionTitle}
        primaryAction={gpsPrimaryDisabled ? null : gpsPrimaryAction}
        secondaryActionLabel="Durumu tazele"
        secondaryAction={onRefreshGpsStatus}
        openSettingsLabel="Ayarlara git"
        onOpenSettings={gpsCanOpenSettings ? onOpenGpsSettings : null}
        warningText={
          hasActiveShift
            ? hasVehicle
              ? (gpsContext.canPublish ? '' : 'Bu vardiya GPS gönderimi için hazır değil.')
              : 'Bu görev için araç bilgisi bulunamadı.'
            : 'Aktif görev bulunmadığı için GPS gönderimi başlatılamıyor.'
        }
        summaryItems={summaryItems}
        footer={
          backgroundTaskAvailable
            ? "Ekran kapalı kalsa da arka plan görev desteği varsa sürücünün telefon GPS'i konumu yayınlamayı sürdürür; zayıf ağda kontrollü yeniden deneme devreye girer."
            : 'Bu cihazda arka plan GPS görevi desteklenmiyor.'
        }
      />

      <DriverDiagnosticsCard
        title="Gelişmiş durum"
        subtitle="Teknik ayrıntılar burada gizli tutulur."
        summary="Bağlantı, KVKK, yayın ve yerel debug ayrıntıları burada toplanır."
        items={[
          { label: 'Bağlantı mesajı', value: net?.message || '-' },
          { label: 'Son online', value: fmt(net?.lastOnlineAt) },
          { label: 'Son offline', value: fmt(net?.lastOfflineAt) },
          { label: 'Son toparlama', value: fmt(net?.lastRecoveryAt) },
          { label: 'Yeniden deneme sayısı', value: net?.retryCount != null ? String(net.retryCount) : '-' },
          { label: 'Sonraki deneme', value: fmt(net?.nextRetryAt) },
          { label: 'KVKK durumu', value: kvkk?.message || '-' },
          { label: 'Gerekli belge', value: kvkk?.requiredCount != null ? String(kvkk.requiredCount) : '-' },
          { label: 'Kabul edilen', value: kvkk?.acceptedCount != null ? String(kvkk.acceptedCount) : '-' },
          { label: 'Bekleyen', value: Array.isArray(kvkk?.pendingDocKeys) && kvkk.pendingDocKeys.length ? kvkk.pendingDocKeys.join(', ') : '-' },
          { label: 'Seçili vardiya', value: gpsContext.selectedShiftId ? `#${gpsContext.selectedShiftId}` : '-' },
          { label: 'GPS vardiyası', value: gpsContext.shiftId ? `#${gpsContext.shiftId} • ${humanizeDriverUiText(gpsContext.shiftStatus || '-', 'Bilinmiyor')}` : '-' },
          { label: 'Araç', value: gpsContext.vehicleId ? `#${gpsContext.vehicleId}` : 'Yok' },
          { label: 'Başlatma engeli', value: humanizeDriverUiText(gpsContext.reason || '-', 'Hazır') },
          { label: 'Son arka plan nedeni', value: gpsBackgroundReasonText || '-' },
          { label: 'Gönderim durumu', value: gps?.publishText || '-' },
          { label: 'Konum kaynak önceliği', value: gps?.sourcePriorityText || '-' },
          { label: 'Gösterilen kaynak', value: gps?.displaySourceText || '-' },
          { label: 'Gösterilen zaman', value: fmt(gps?.displayAt) },
          { label: 'Vardiya', value: gps?.shiftId ? `#${gps.shiftId}` : 'Görev yok' },
          { label: 'Araç', value: gps?.vehicleId ? `#${gps.vehicleId}` : '-' },
          { label: 'Resmi kaynak', value: gps?.officialSourceText || '-' },
          { label: 'Resmi tazelik', value: gps?.officialFreshnessText || '-' },
          { label: 'Resmi konum', value: gps?.officialCoordsText || '-' },
          { label: 'Resmi zaman', value: fmt(gps?.officialAt) },
          { label: 'Yerel telefon önizleme', value: gps?.localPreviewText || '-' },
          { label: 'Yerel önizleme zamanı', value: fmt(gps?.localPreviewAt) },
          { label: 'Gösterilen konum', value: gps?.displayCoordsText || gps?.lastLocationText || '-' },
          { label: 'Son gönderim', value: fmt(gps?.lastSentAt) },
          { label: 'Son deneme', value: fmt(gps?.lastAttemptAt) },
          { label: 'GPS yeniden deneme', value: gps?.retryCount != null ? String(gps.retryCount) : '-' },
          { label: 'GPS sonraki deneme', value: fmt(gps?.nextRetryAt) },
          { label: 'Uygulama durumu', value: humanizeDriverUiText(gps?.appState || '-', 'Bilinmiyor') },
          { label: 'API adresi', value: releaseInfo?.apiHost || '-' },
          { label: 'Zaman aşımı', value: releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-' },
          { label: 'Kabul özeti', value: releaseInfo?.acceptanceSummary || '-' },
          { label: 'Ortam', value: releaseStageText },
          { label: 'Yayın durumu', value: releaseStatusText },
        ]}
        footer={
          showGpsDebug
            ? `Seçili vardiya: ${gpsContext.selectedShiftId || '-'} • GPS vardiyası: ${gpsContext.shiftId || '-'} • Araç: ${gpsContext.vehicleId || '-'}`
            : ''
        }
      />
    </ScrollView>
  );
}
