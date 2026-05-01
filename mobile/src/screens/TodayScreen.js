import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { listVisibleShifts, resolveVisibleShift } from '../lib/gps';
import DriverAvailabilityCard from './DriverAvailabilityCard';
import DriverChangeAwarenessCard from './DriverChangeAwarenessCard';
import NotificationCenterCard from './NotificationCenterCard';
import DriverTaskSummaryCard from './DriverTaskSummaryCard';
import { Card, EmptyState, Info, Pill, PrimaryButton, RoutePreviewList, SecondaryButton, SectionTitle, ShiftChooser, TopTabs, fmt, isStale, styles } from './mobileUi';
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
  onOpenRoute,
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
  const activeShift = resolveVisibleShift(today, selectedShiftId, route);
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

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={!!syncing} onRefresh={onRefresh} />}
    >
      <TopTabs current="today" onToday={() => null} onRoute={onOpenRoute} onLive={onOpenLive} />

      <Card>
        <Text style={styles.title}>Bugün</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${humanizeDriverUiText(me?.role || '-', 'Bilinmiyor')}`} />
          <Pill label={syncing ? 'Senkron oluyor' : 'Hazır'} tone={syncing ? 'warn' : 'ok'} />
          {usingCachedData ? <Pill label="Önbellekten açıldı" tone="warn" /> : null}
          {stale ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
          {kvkkBlocking ? <Pill label="KVKK eksik" tone="warn" /> : <Pill label="KVKK hazır" tone="ok" />}
        </View>
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
        title="Bugünkü görev"
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
        onOpenRoute={onOpenRoute}
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
        <SectionTitle title="Rota kısa özeti" />
        <Info label="Rota durumu" value={humanizeDriverUiText(route?.mode || 'NO_DATA', 'Veri yok')} />
        <Info label="Tahmini varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Info label="Kalan km" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
        <Info label="Toplam durak" value={route?.summary?.totalStops != null ? String(route.summary.totalStops) : Array.isArray(route?.orderedStops) ? String(route.orderedStops.length) : '-'} />
        {routePreviewStops.length ? <RoutePreviewList stops={routePreviewStops} /> : <EmptyState title="Rota bekliyor" text="Bekleyen durak önizlemesi henüz görünmüyor." />}
      </Card>


      <Card>
        {/* SectionTitle title="Baglanti" */}
        <SectionTitle title="Bağlantı" subtitle="Çevrimdışı açılışta son başarılı veri gösterilebilir." />
        <Info label="Durum" value={humanizeDriverUiText(net?.status || '-', 'Bilinmiyor')} />
        <Info label="Mesaj" value={net?.message || '-'} />
        <Info label="Son online" value={fmt(net?.lastOnlineAt)} />
        <Info label="Son offline" value={fmt(net?.lastOfflineAt)} />
        <Info label="Son toparlanma" value={fmt(net?.lastRecoveryAt)} />
        <Info label="Yeniden deneme sayısı" value={net?.retryCount != null ? String(net.retryCount) : '-'} />
        <Info label="Sonraki deneme" value={fmt(net?.nextRetryAt)} />
        {/* Baglanti yoksa otomatik denemeler devam eder */}
        {/* artan bekleme ile son basarili snapshot ekranda kalir */}
        <Text style={styles.muted}>Bağlantı yoksa otomatik denemeler devam eder; artan bekleme ile son başarılı snapshot ekranda kalır.</Text>
      </Card>

      <Card>
        <SectionTitle title="KVKK" subtitle="Onay eksiği varsa canlı konum ve ilgili akışlarda kısıt olabilir." />
        <Info label="Durum" value={kvkk?.message || '-'} />
        <Info label="Gerekli belge" value={kvkk?.requiredCount != null ? String(kvkk.requiredCount) : '-'} />
        <Info label="Kabul edilen" value={kvkk?.acceptedCount != null ? String(kvkk.acceptedCount) : '-'} />
        <Info label="Bekleyen" value={Array.isArray(kvkk?.pendingDocKeys) && kvkk.pendingDocKeys.length ? kvkk.pendingDocKeys.join(', ') : '-'} />
        <Text style={styles.muted}>KVKK onayını tamamla işlemi Canlı ekranından devam eder.</Text>
      </Card>

      <Card>
        <SectionTitle
          title="GPS hazırlığı"
          subtitle="Sürücünün telefon GPS'i ve canlı konum yayını burada izlenir."
        />
        <Info label="Arka plan görev desteği" value={gps?.backgroundTaskAvailableText || '-'} />
        <Info label="Sağlık" value={health?.ok ? 'Hazır' : humanizeDriverUiText(health?.status || '-', 'Bilinmiyor')} />
        <Info label="Bağlantı" value={net?.message || '-'} />
        <Info label="GPS" value={humanizeDriverUiText(gps?.publishState || '-', 'Bilinmiyor')} />
        {/* legacy check token: Konum kaynagi */}
        <Info label="Konum kaynağı" value={gps?.displaySourceText || '-'} />
        {/* Resmi GPS tazeligi */}
        <Info label="Resmi GPS tazeliği" value={gps?.officialFreshnessText || '-'} />
        <Info label="Arka plan izni" value={gps?.backgroundPermissionText || '-'} />
        <Info label="Arka plan servis" value={humanizeDriverUiText(gps?.backgroundTaskState || '-', 'Bilinmiyor')} />
        <Info label="Son arka plan nedeni" value={gps?.lastBackgroundReason || '-'} />
        <Info label="GPS tekrar sayısı" value={gps?.retryCount != null ? String(gps.retryCount) : '-'} />
        <Info label="GPS sonraki deneme" value={fmt(gps?.nextRetryAt)} />
        <Info label="API taban" value={apiBaseUrl || '-'} />
        <Info label="Device ID" value={deviceId || '-'} />
        <Info label="Son basarili senkron" value={fmt(lastSyncAt)} />
        <Info label="Son hata" value={fmt(lastErrorAt)} />
        {!activeShift ? (
          <Text style={styles.muted}>Görev yok. Bugün aktif görev yok. Bu yüzden konum gönderilmiyor.</Text>
        ) : null}
        <View style={styles.actionsRow}>
          <SecondaryButton title="Ayarları aç" onPress={onOpenSettings} />
          <SecondaryButton title="Konumu şimdi gönder" onPress={onPublishGpsNow} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Sesli rehber" subtitle="Sıradaki durağı ve tahmini varış bilgisini sürücüye sesli olarak tekrar eder." />
        <Info label="Sesli rehber" value="Hazır" />
        <Info label="Tahmini varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Text style={styles.muted}>Sıradaki durağı oku ve tahmini varış oku eylemleri sürücünün telefon GPS'i ile birlikte sahada düşük bilişsel yük hedefiyle kullanılır.</Text>
        <View style={styles.actionsRow}>
          <SecondaryButton title="Sıradaki durağı oku" onPress={onSpeakNextStop} disabled={!onSpeakNextStop || !nextStop} />
          <SecondaryButton title="Tahmini varış oku" onPress={onSpeakEta} disabled={!onSpeakEta || !nextStop} />
          <SecondaryButton title="Tam rotayı navigasyonda aç" onPress={onOpenRoute} />
        </View>
      </Card>

      <Card>
        {/* Yayın hazırlığı */}
        <SectionTitle title="Yayın hazırlığı" subtitle="Mobil yayın ve ortam kabul özeti" />
        <View style={styles.rowGap}>
          <Pill label={humanizeDriverUiText(releaseInfo?.acceptanceStatusText || 'READY', 'Hazır')} tone={releaseInfo?.acceptanceBlocking ? 'danger' : Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? 'warn' : 'ok'} />
          <Pill label={`Ortam: ${humanizeDriverUiText(releaseInfo?.envStage || '-', 'Bilinmiyor')}`} tone="info" />
        </View>
        <Info label="Uygulama sürümü" value={releaseInfo?.appVersion || '-'} />
        <Info label="Yayın hedefi" value={releaseInfo?.releaseTarget || '-'} />
        <Info label="Yayın profilleri" value={humanizeDriverUiText(releaseInfo?.buildProfiles || '-', '-')} />
        <Info label="Dağıtım" value={releaseInfo?.deliveryMode || '-'} />
        <Info label="Canlı test" value={humanizeDriverUiText(releaseInfo?.expoGoStatus || '-', 'Bilinmiyor')} />
        <Info label="Android önizleme" value={humanizeDriverUiText(releaseInfo?.androidPreview || 'Hazır', 'Hazır')} />
        <Info label="Yayın paketi" value={humanizeDriverUiText(releaseInfo?.productionBundle || 'Hazır', 'Hazır')} />
        <Info label="Ortam aşaması" value={humanizeDriverUiText(releaseInfo?.envStage || '-', 'Bilinmiyor')} />
        <Info label="Derleme durumu" value={humanizeDriverUiText(releaseInfo?.androidPreview || '-', 'Bilinmiyor')} />
        <Info label="API adresi" value={releaseInfo?.apiHost || '-'} />
        <Info label="API şeması" value={releaseInfo?.apiScheme || '-'} />
        <Info label="Zaman aşımı" value={releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-'} />
        <Info label="Kabul özeti" value={releaseInfo?.acceptanceSummary || '-'} />
        {Array.isArray(releaseInfo?.acceptanceIssues) && releaseInfo.acceptanceIssues.length ? (
          <Text style={styles.error}>{releaseInfo.acceptanceIssues.join(' • ')}</Text>
        ) : null}
        {!releaseInfo?.acceptanceBlocking && Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? (
          <Text style={styles.muted}>{releaseInfo.acceptanceWarnings.join(' • ')}</Text>
        ) : null}
        <Text style={styles.muted}>Android önizleme ve yayın paketi hazır olmadan yayın disiplini tamamlanmış sayılmaz.</Text>
        <View style={styles.actionsRow}>
          <SecondaryButton title="Haritada aç" onPress={onOpenLive} />
          <SecondaryButton title="Güvenli çıkış" onPress={onLogout} />
        </View>
      </Card>
    </ScrollView>
  );
}
