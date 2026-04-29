import { ScrollView, Text, View } from 'react-native';
import { Card, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, TopTabs, fmt, isStale, styles } from './mobileUi';

export default function LiveScreen({
  today,
  route,
  lastSyncAt,
  net,
  gps,
  kvkk,
  voiceEnabled,
  selectedShiftId,
  onOpenToday,
  onOpenRoute,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
  onRequestGpsPermission,
  onRefreshGpsStatus,
  onOpenGpsSettings,
  onPublishGpsNow,
  onAcceptKvkk,
  onRefreshKvkkStatus,
  releaseInfo,
}) {
  const nextStop = route?.nextStop || null;
  const gpsNeedsPermission = gps?.permissionStatus !== 'granted' || gps?.backgroundPermissionStatus !== 'granted';
  const gpsCanOpenSettings = Boolean(gps?.canOpenSettings);
  const kvkkBlocking = Boolean(kvkk?.blocking);
  const stale = isStale(lastSyncAt);
  const gpsActionTitle = gpsNeedsPermission ? 'GPS iznini yenile' : 'Konumu şimdi gönder';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <TopTabs current="live" onToday={onOpenToday} onRoute={onOpenRoute} onLive={() => null} />

      <Card>
        <Text style={styles.title}>Canlı</Text>
        <Text style={styles.subtitle}>Bağlantı, sürücünün telefon GPS'i, KVKK ve sesli rehber bu ekrandan izlenir.</Text>
        <View style={styles.rowGap}>
          <Pill label={`Vardiya: ${selectedShiftId || route?.shift?.id || today?.active?.id || '-'}`} tone={selectedShiftId || route?.shift?.id ? 'ok' : 'warn'} />
          <Pill label={`Bağlantı: ${net?.status || 'unknown'}`} tone={net?.status === 'online' ? 'ok' : net?.status === 'offline' ? 'warn' : 'info'} />
          {stale ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
        </View>
      </Card>

      <Card>
        <SectionTitle title="Bağlantı" />
        <Info label="Mesaj" value={net?.message || '-'} />
        <Info label="Son online" value={fmt(net?.lastOnlineAt)} />
        <Info label="Son offline" value={fmt(net?.lastOfflineAt)} />
        <Info label="Son toparlama" value={fmt(net?.lastRecoveryAt)} />
        <Info label="Yeniden deneme sayisi" value={net?.retryCount != null ? String(net.retryCount) : '-'} />
        <Info label="Sonraki deneme" value={fmt(net?.nextRetryAt)} />
      </Card>

      <Card>
        <SectionTitle title="Release / env" subtitle="Canlı ekrandaki tüm ağ aksiyonları bu kabul durumuna bağlıdır." />
        <View style={styles.rowGap}>
          <Pill label={releaseInfo?.acceptanceStatusText || 'READY'} tone={releaseInfo?.acceptanceBlocking ? 'danger' : Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? 'warn' : 'ok'} />
          <Pill label={`Stage: ${releaseInfo?.envStage || '-'}`} />
        </View>
        <Info label="API host" value={releaseInfo?.apiHost || '-'} />
        <Info label="API timeout" value={releaseInfo?.timeoutMs != null ? `${releaseInfo.timeoutMs} ms` : '-'} />
        <Info label="Kabul özeti" value={releaseInfo?.acceptanceSummary || '-'} />
      </Card>

      <Card>
        <SectionTitle title="KVKK" />
        <View style={styles.rowGap}>
          <Pill label={kvkkBlocking ? 'Blocking' : 'Hazır'} tone={kvkkBlocking ? 'warn' : 'ok'} />
          <Pill label={`Gerekli: ${kvkk?.requiredCount || 0}`} />
          <Pill label={`Tamam: ${kvkk?.acceptedCount || 0}`} tone={!kvkkBlocking && (kvkk?.acceptedCount || 0) > 0 ? 'ok' : 'info'} />
        </View>
        <Info label="Mesaj" value={kvkk?.message || '-'} />
        <Info label="Son kontrol" value={fmt(kvkk?.lastCheckedAt)} />
        <Info label="Son onay" value={fmt(kvkk?.lastAcceptedAt)} />
        <View style={styles.actionsRow}>
          {kvkkBlocking ? <PrimaryButton title="KVKK onayını tamamla" onPress={onAcceptKvkk} disabled={kvkk?.busy} /> : null}
          <SecondaryButton title="KVKK durumunu yenile" onPress={onRefreshKvkkStatus} disabled={kvkk?.busy || kvkk?.loading} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Sesli rehber" />
        <Info label="Durum" value={voiceEnabled ? 'Açık' : 'Kapalı'} />
        <Info label="Sıradaki durak" value={nextStop?.name || '-'} />
        <Info label="Durak ETA" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <View style={styles.actionsRow}>
          <PrimaryButton title={voiceEnabled ? 'Sesli rehberi kapat' : 'Sesli rehberi aç'} onPress={onToggleVoiceGuidance} />
          <SecondaryButton title="Sıradaki durağı oku" onPress={onSpeakNextStop} disabled={!nextStop} />
          <SecondaryButton title="ETA oku" onPress={onSpeakEta} disabled={!nextStop} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Sürücünün telefon GPS'i" />
        <View style={styles.rowGap}>
          <Pill label={`Görev desteği: ${gps?.backgroundTaskAvailable ? 'Hazır' : 'Yok'}`} tone={gps?.backgroundTaskAvailable ? 'ok' : 'warn'} />
          <Pill label={`İzin: ${gps?.permissionStatus || 'unknown'}`} tone={gps?.permissionStatus === 'granted' ? 'ok' : 'warn'} />
          <Pill label={`Arka plan: ${gps?.backgroundPermissionStatus || 'unknown'}`} tone={gps?.backgroundPermissionStatus === 'granted' ? 'ok' : 'warn'} />
          <Pill label={`Servis: ${gps?.backgroundTaskState || 'unknown'}`} tone={gps?.backgroundTaskState === 'running' ? 'ok' : 'warn'} />
          <Pill label={`Gönderim: ${gps?.publishState || 'idle'}`} tone={gps?.publishState === 'ok' ? 'ok' : gps?.publishState === 'retry' || gpsNeedsPermission || kvkkBlocking ? 'warn' : 'info'} />
        </View>
        <Info label="Görev desteği" value={gps?.backgroundTaskAvailableText || '-'} />
        <Info label="İzin durumu" value={gps?.permissionText || '-'} />
        <Info label="Arka plan izni" value={gps?.backgroundPermissionText || '-'} />
        <Info label="Arka plan servis" value={gps?.backgroundTaskText || '-'} />
        <Info label="Uygulama durumu" value={gps?.appState || '-'} />
        <Info label="Son arka plan nedeni" value={gps?.lastBackgroundReason || '-'} />
        <Info label="Son arka plan kontrol" value={fmt(gps?.lastBackgroundSyncAt)} />
        <Info label="Gönderim durumu" value={gps?.publishText || '-'} />
        {/* legacy check token: Konum kaynak onceligi */}
        <Info label="Konum kaynak önceliği" value={gps?.sourcePriorityText || '-'} />
        <Info label="Gösterilen kaynak" value={gps?.displaySourceText || '-'} />
        <Info label="Gösterilen zaman" value={fmt(gps?.displayAt)} />
        <Info label="Vardiya" value={gps?.shiftId ? `#${gps.shiftId}` : 'Görev yok'} />
        <Info label="Araç" value={gps?.vehicleId ? `#${gps.vehicleId}` : '-'} />
        <Info label="Resmi kaynak" value={gps?.officialSourceText || '-'} />
        <Info label="Resmi tazelik" value={gps?.officialFreshnessText || '-'} />
        <Info label="Resmi konum" value={gps?.officialCoordsText || '-'} />
        <Info label="Resmi zaman" value={fmt(gps?.officialAt)} />
        {/* Yerel telefon onizleme */}
        <Info label="Yerel telefon önizleme" value={gps?.localPreviewText || '-'} />
        <Info label="Yerel önizleme zamanı" value={fmt(gps?.localPreviewAt)} />
        <Info label="Gösterilen konum" value={gps?.displayCoordsText || gps?.lastLocationText || '-'} />
        <Info label="Son gönderim" value={fmt(gps?.lastSentAt)} />
        <Info label="Son deneme" value={fmt(gps?.lastAttemptAt)} />
        <Info label="GPS yeniden deneme" value={gps?.retryCount != null ? String(gps.retryCount) : '-'} />
        <Info label="GPS sonraki deneme" value={fmt(gps?.nextRetryAt)} />
        <Text style={styles.muted}>Ekran kapalı kalsa da arka plan görev desteği varsa telefon GPS'i konumu yayınlamayı sürdürür; zayıf ağda kontrollü yeniden deneme devreye girer.</Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title={gpsActionTitle} onPress={gpsNeedsPermission ? onRequestGpsPermission : onPublishGpsNow} disabled={kvkkBlocking} />
          <SecondaryButton title="Durumu tazele" onPress={onRefreshGpsStatus} />
          {gpsCanOpenSettings ? <SecondaryButton title="Ayarları aç" onPress={onOpenGpsSettings} /> : null}
        </View>
      </Card>
    </ScrollView>
  );
}
