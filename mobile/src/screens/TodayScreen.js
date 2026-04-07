import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { listVisibleShifts, resolveVisibleShift } from '../lib/gps';
import { Card, EmptyState, Info, Pill, PrimaryButton, RoutePreviewList, SecondaryButton, SectionTitle, ShiftChooser, TopTabs, fmt, isStale, styles } from './mobileUi';

export default function TodayScreen({
  me,
  today,
  route,
  error,
  health,
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
  onRefresh,
  onLogout,
  onOpenRoute,
  onOpenLive,
  onSelectShift,
  onOpenSettings,
  onPublishGpsNow,
}) {
  const visibleShifts = listVisibleShifts(today);
  const activeShift = resolveVisibleShift(today, selectedShiftId, route);
  const nextStop = route?.nextStop || null;
  const pendingStops = Array.isArray(route?.orderedStops)
    ? route.orderedStops.filter((stop) => String(stop?.state || '').toUpperCase() === 'PENDING')
    : [];
  const routePreviewStops = pendingStops.slice(0, 6);
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
          <Pill label={`Rol: ${String(me?.role || '-')}`} />
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

      <Card>
        <SectionTitle title="Görev özeti" />
        {activeShift ? (
          <>
            <Info label="Seçili vardiya" value={`#${activeShift.id} • ${String(activeShift.status || '-').toUpperCase()}`} />
            <Info label="Başlangıç" value={fmt(activeShift.startAt)} />
            <Info label="Bitiş" value={fmt(activeShift.endAt)} />
            <Info label="Araç" value={route?.vehicle?.plate || activeShift?.vehicle?.plate || (activeShift?.vehicleId ? `#${activeShift.vehicleId}` : '-')} />
            <Info label="Sıradaki durak" value={nextStop?.name || '-'} />
            <Info label="Kalan durak" value={route?.summary?.remainingStops != null ? String(route.summary.remainingStops) : String(pendingStops.length || 0)} />
            <Info label="Kalan yolcu" value={route?.summary?.remainingPassengers != null ? String(route.summary.remainingPassengers) : '-'} />
          </>
        ) : (
          <EmptyState title="Görev görünmüyor" text="Bugün ekranında görev görünmüyorsa oda veya şirket atamasını kontrol et." />
        )}
        <View style={styles.actionsRow}>
          <PrimaryButton title="Rota ekranını aç" onPress={onOpenRoute} disabled={!activeShift} />
          <SecondaryButton title="Canlı ekranını aç" onPress={onOpenLive} />
          <SecondaryButton title="Yenile" onPress={onRefresh} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Rota kısa özet" />
        <Info label="Rota modu" value={route?.mode || 'NO_DATA'} />
        <Info label="Yaklaşık varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Info label="Kalan km" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
        <Info label="Toplam durak" value={route?.summary?.totalStops != null ? String(route.summary.totalStops) : Array.isArray(route?.orderedStops) ? String(route.orderedStops.length) : '-'} />
        {routePreviewStops.length ? <RoutePreviewList stops={routePreviewStops} /> : <EmptyState title="Rota bekliyor" text="Bekleyen durak önizlemesi henüz görünmüyor." />}
      </Card>


      <Card>
        <SectionTitle title="Baglanti" subtitle="Cevrimdisi acilista son basarili veri gosterilebilir." />
        <Info label="Durum" value={net?.status || '-'} />
        <Info label="Mesaj" value={net?.message || '-'} />
        <Info label="Son online" value={fmt(net?.lastOnlineAt)} />
        <Info label="Son offline" value={fmt(net?.lastOfflineAt)} />
        <Info label="Son toparlanma" value={fmt(net?.lastRecoveryAt)} />
        <Info label="Yeniden deneme sayisi" value={net?.retryCount != null ? String(net.retryCount) : '-'} />
        <Info label="Sonraki deneme" value={fmt(net?.nextRetryAt)} />
        <Text style={styles.muted}>Baglanti yoksa otomatik denemeler devam eder; artan bekleme ile son basarili snapshot ekranda kalir.</Text>
      </Card>

      <Card>
        <SectionTitle title="KVKK" subtitle="Onay eksigi varsa canli konum ve ilgili akislarda kisit olabilir." />
        <Info label="Durum" value={kvkk?.message || '-'} />
        <Info label="Gerekli belge" value={kvkk?.requiredCount != null ? String(kvkk.requiredCount) : '-'} />
        <Info label="Kabul edilen" value={kvkk?.acceptedCount != null ? String(kvkk.acceptedCount) : '-'} />
        <Info label="Bekleyen" value={Array.isArray(kvkk?.pendingDocKeys) && kvkk.pendingDocKeys.length ? kvkk.pendingDocKeys.join(', ') : '-'} />
        <Text style={styles.muted}>KVKK onayini tamamla islemi Canli ekranindan devam eder.</Text>
      </Card>

      <Card>
        <SectionTitle
          title="GPS hazirligi"
          subtitle="Surucunun telefon GPS'i ve canli konum yayini burada izlenir."
        />
        <Info label="Sağlık" value={health?.ok ? 'UP' : health?.status || '-'} />
        <Info label="Bağlantı" value={net?.message || '-'} />
        <Info label="GPS" value={gps?.publishText || '-'} />
        <Info label="Konum kaynagi" value={gps?.displaySourceText || '-'} />
        <Info label="Resmi GPS tazeligi" value={gps?.officialFreshnessText || '-'} />
        <Info label="Arka plan izni" value={gps?.backgroundPermissionText || '-'} />
        <Info label="Arka plan servis" value={gps?.backgroundTaskText || '-'} />
        <Info label="Son arka plan nedeni" value={gps?.lastBackgroundReason || '-'} />
        <Info label="GPS tekrar sayisi" value={gps?.retryCount != null ? String(gps.retryCount) : '-'} />
        <Info label="GPS sonraki deneme" value={fmt(gps?.nextRetryAt)} />
        <Info label="API taban" value={apiBaseUrl || '-'} />
        <Info label="Device ID" value={deviceId || '-'} />
        <Info label="Son basarili senkron" value={fmt(lastSyncAt)} />
        <Info label="Son hata" value={fmt(lastErrorAt)} />
        {!activeShift ? (
          <Text style={styles.muted}>Gorev yok. Bugun aktif gorev yok. Bu yuzden konum gonderilmiyor.</Text>
        ) : null}
        <View style={styles.actionsRow}>
          <SecondaryButton title="Ayarlari ac" onPress={onOpenSettings} />
          <SecondaryButton title="Konumu simdi gonder" onPress={onPublishGpsNow} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Sesli rehber" subtitle="Siradaki duragi ve Durak ETA bilgisini surucuye sesli olarak tekrar eder." />
        <Info label="Sesli rehber" value="Hazir" />
        <Info label="Durak ETA" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Text style={styles.muted}>Siradaki duragi oku ve ETA oku eylemleri surucunun telefon GPS'i ile birlikte sahada dusuk bilissel yuk hedefiyle kullanilir.</Text>
        <View style={styles.actionsRow}>
          <SecondaryButton title="Siradaki duragi oku" onPress={() => null} />
          <SecondaryButton title="ETA oku" onPress={() => null} />
          <SecondaryButton title="Tam rotayi navigasyonda ac" onPress={onOpenRoute} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Release hazirligi" subtitle="Mobil beta ve release / env / acceptance sertlestirme ozeti" />
        <View style={styles.rowGap}>
          <Pill label={releaseInfo?.acceptanceStatusText || 'READY'} tone={releaseInfo?.acceptanceBlocking ? 'danger' : Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? 'warn' : 'ok'} />
          <Pill label={`Ortam: ${releaseInfo?.envStage || '-'} | Beta durum`} tone="info" />
        </View>
        <Info label="Uygulama surumu" value={releaseInfo?.appVersion || '-'} />
        <Info label="Release hedefi" value={releaseInfo?.releaseTarget || '-'} />
        <Info label="Build profilleri" value={releaseInfo?.buildProfiles || '-'} />
        <Info label="Delivery" value={releaseInfo?.deliveryMode || '-'} />
        <Info label="Expo Go" value={releaseInfo?.expoGoStatus || '-'} />
        <Info label="Android preview" value={releaseInfo?.androidPreview || 'Preview APK hazir'} />
        <Info label="Production bundle" value={releaseInfo?.productionBundle || 'Production AAB hazir'} />
        <Info label="Env asamasi" value={releaseInfo?.envStage || '-'} />
        <Info label="EAS Build" value={releaseInfo?.androidPreview || '-'} />
        <Info label="API host" value={releaseInfo?.apiHost || '-'} />
        <Info label="API semasi" value={releaseInfo?.apiScheme || '-'} />
        <Info label="API timeout" value={releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-'} />
        <Info label="Kabul ozeti" value={releaseInfo?.acceptanceSummary || '-'} />
        {Array.isArray(releaseInfo?.acceptanceIssues) && releaseInfo.acceptanceIssues.length ? (
          <Text style={styles.error}>{releaseInfo.acceptanceIssues.join(' • ')}</Text>
        ) : null}
        {!releaseInfo?.acceptanceBlocking && Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? (
          <Text style={styles.muted}>{releaseInfo.acceptanceWarnings.join(' • ')}</Text>
        ) : null}
        <Text style={styles.muted}>Preview APK hazir ve Production AAB hazir olmadan release disiplini tamamlanmis sayilmaz.</Text>
        <View style={styles.actionsRow}>
          <SecondaryButton title="Haritada ac" onPress={onOpenLive} />
          <SecondaryButton title="Guvenli cikis" onPress={onLogout} />
        </View>
      </Card>
    </ScrollView>
  );
}
