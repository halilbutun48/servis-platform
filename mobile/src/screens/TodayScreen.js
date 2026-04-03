import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { openFullRouteNavigation, openNextStopNavigation } from '../lib/navigation';

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
  voiceEnabled,
  releaseInfo,
  net,
  gps,
  kvkk,
  onRefresh,
  onLogout,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
  onRequestGpsPermission,
  onRefreshGpsStatus,
  onOpenGpsSettings,
  onPublishGpsNow,
  onAcceptKvkk,
  onRefreshKvkkStatus,
}) {
  const activeShift = today?.active || today?.assigned || today?.today?.[0] || today?.tomorrow?.[0] || today?.upcoming?.[0] || null;
  const nextStop = route?.nextStop || null;
  const headerText = useMemo(() => {
    const fullName = String(me?.fullName || 'Surucu').trim();
    return fullName ? `${fullName}, bugun ekranin hazir.` : 'Bugun ekranin hazir.';
  }, [me?.fullName]);

  const syncStateText = syncing ? 'Senkron oluyor' : 'Hazir';
  const stale = isStale(lastSyncAt);
  const gpsNeedsPermission = gps?.permissionStatus !== 'granted' || gps?.backgroundPermissionStatus !== 'granted';
  const gpsCanOpenSettings = Boolean(gps?.canOpenSettings);
  const gpsActionTitle = gpsNeedsPermission ? 'GPS iznini yenile' : 'Konumu simdi gonder';
  const kvkkBlocking = Boolean(kvkk?.blocking);
  const assignmentState = String(today?.assignmentState || (activeShift ? 'ACTIVE' : 'NONE')).toUpperCase();
  const assignmentTone = assignmentState === 'ACTIVE' ? 'ok' : assignmentState === 'NONE' ? 'info' : 'warn';
  const assignmentText = assignmentState === 'ACTIVE'
    ? 'Aktif vardiya hazir. Gorev ve arac bilgisi kullanima acik.'
    : assignmentState === 'ASSIGNED'
      ? 'Yaklasan vardiya var. Baslangic saati bekleniyor.'
      : assignmentState === 'ASSIGNED_NO_VEHICLE'
        ? 'Vardiya gorunuyor ama arac atamasi eksik.'
        : 'Bugun veya yakin zaman icin atanmis vardiya gorunmuyor.';
  const routeSummary = route?.summary || {};
  const pendingStops = Array.isArray(route?.orderedStops)
    ? route.orderedStops.filter((stop) => String(stop?.state || '').toUpperCase() === 'PENDING')
    : [];
  const routePreviewStops = pendingStops.slice(0, 8);

  async function openMaps() {
    await openNextStopNavigation(nextStop, route?.last || route?.vehicle);
  }

  async function openFullRoute() {
    await openFullRouteNavigation(route);
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={!!syncing} onRefresh={onRefresh} />}
    >
      <Card>
        <Text style={styles.title}>Bugun</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${String(me?.role || '-')}`} />
          <Pill label={`PIN degisim: ${me?.requirePinChange ? 'Gerekli' : 'Tamam'}`} />
          <Pill label={`Senkron: ${syncStateText}`} tone={syncing ? 'warn' : 'ok'} />
          {stale ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
        </View>
      </Card>

      <Card>
        <SectionTitle title="Beta durum" />
        <Info label="Saglik" value={health?.ok ? 'UP' : health?.status || '-'} />
        <Info label="API taban" value={apiBaseUrl || '-'} />
        <Info label="Device ID" value={deviceId || '-'} />
        <Info label="Son basarili senkron" value={fmt(lastSyncAt)} />
        <Info label="Son hata" value={fmt(lastErrorAt)} />
        <Text style={styles.helper}>
          M49 beta hardening: app active olunca yenile, 30 sn periyodik kontrol, backend health pingi ve guvenli cikis.
          M57.3 ile oturum kapanirsa uygulama temiz sekilde girise doner.
        </Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title="Beta yenile" onPress={onRefresh} />
          <SecondaryButton title="Guvenli cikis" onPress={onLogout} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Baglanti" />
        <View style={styles.rowGap}>
          <Pill label={`Durum: ${net?.status || 'unknown'}`} tone={net?.status === 'offline' ? 'warn' : net?.status === 'online' ? 'ok' : 'info'} />
          {isStale(lastSyncAt) ? <Pill label="Veri eski olabilir" tone="warn" /> : null}
        </View>
        <Info label="Mesaj" value={net?.message || '-'} />
        <Info label="Son online" value={fmt(net?.lastOnlineAt)} />
        <Info label="Son offline" value={fmt(net?.lastOfflineAt)} />
        <Info label="Son toparlama" value={fmt(net?.lastRecoveryAt)} />
        <Text style={styles.helper}>M57.2 ile baglanti gidip gelince uygulama sade mesajlarla toparlanir. Baglanti yoksa otomatik denemeler devam eder.</Text>
      </Card>

      <Card>
        <SectionTitle title="KVKK" />
        <View style={styles.rowGap}>
          <Pill label={`Durum: ${kvkkBlocking ? 'Blocking' : 'Hazir'}`} tone={kvkkBlocking ? 'warn' : 'ok'} />
          <Pill label={`Gerekli: ${kvkk?.requiredCount || 0}`} />
          <Pill label={`Tamam: ${kvkk?.acceptedCount || 0}`} tone={!kvkkBlocking && (kvkk?.acceptedCount || 0) > 0 ? 'ok' : 'info'} />
        </View>
        <Info label="Mesaj" value={kvkk?.message || '-'} />
        <Info label="Son kontrol" value={fmt(kvkk?.lastCheckedAt)} />
        <Info label="Son onay" value={fmt(kvkk?.lastAcceptedAt)} />
        {Array.isArray(kvkk?.items) && kvkk.items.length ? (
          <View style={styles.docList}>
            {kvkk.items.map((item) => (
              <View key={`${item.docKey}-${item.docVersion}`} style={styles.docItem}>
                <Text style={styles.docTitle}>{item.title || item.docKey}</Text>
                <Text style={styles.docSummary}>{item.accepted ? 'Onaylandi.' : 'Onay bekleniyor.'} {item.summary || ''}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.helper}>
          M57.3 ile KVKK onayi eksikse bu durum mobilde gizli kalmaz. KVKK onayi eksik. Onay tamamlanmadan konum gonderilemez.
        </Text>
        <View style={styles.actionsRow}>
          {kvkkBlocking ? <PrimaryButton title="KVKK onayini tamamla" onPress={onAcceptKvkk} disabled={kvkk?.busy} /> : null}
          <SecondaryButton title="KVKK durumunu yenile" onPress={onRefreshKvkkStatus} disabled={kvkk?.busy || kvkk?.loading} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Sesli rehber" />
        <Info label="Durum" value={voiceEnabled ? 'Acik' : 'Kapali'} />
        <Info label="Siradaki durak" value={nextStop?.name || '-'} />
        <Info label="Durak ETA" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Text style={styles.helper}>
          M49.1 ile sesli rehber, siradaki durak ve ETA bilgisini telefonda okunabilir hale getirir.
        </Text>
        <View style={styles.actionsRow}>
          <PrimaryButton
            title={voiceEnabled ? 'Sesli rehberi kapat' : 'Sesli rehberi ac'}
            onPress={onToggleVoiceGuidance}
          />
          <SecondaryButton title="Siradaki duragi oku" onPress={onSpeakNextStop} disabled={!nextStop} />
          <SecondaryButton title="ETA oku" onPress={onSpeakEta} disabled={!nextStop} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Gorev ozeti" />
        <View style={styles.rowGap}>
          <Pill label={`Durum: ${assignmentState}`} tone={assignmentTone} />
          {activeShift?.vehicleId || activeShift?.vehicle?.id ? <Pill label={`Arac: #${activeShift?.vehicleId || activeShift?.vehicle?.id}`} tone="ok" /> : null}
        </View>
        {activeShift ? (
          <>
            <Info label="Aktif / atanan vardiya" value={`#${activeShift.id} • ${String(activeShift.status || '-').toUpperCase()}`} />
            <Info label="Baslangic" value={fmt(activeShift.startAt)} />
            <Info label="Bitis" value={fmt(activeShift.endAt)} />
            <Info label="Arac" value={route?.vehicle?.plate || activeShift?.vehicle?.plate || '-'} />
            <Info label="Sozlesme" value={activeShift.agreementId ? `Var (#${activeShift.agreementId})` : 'Yok'} />
            <Text style={styles.helper}>{assignmentText}</Text>
          </>
        ) : (
          <Text style={styles.muted}>Bugun veya yarin icin onayli vardiya gorunmuyor. Bugun veya yakin zaman icin atanmis vardiya da bulunmuyor.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle title="Rota ozeti" />
        <Info label="Durum" value={route?.mode || 'NO_DATA'} />
        <Info label="Siradaki durak" value={nextStop?.name || '-'} />
        <Info label="Yaklasik" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Info label="Kalan km" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
        <Info label="Siradaki durak yolcu" value={nextStop?.passengerCount != null ? `${nextStop.passengerCount} kisi` : '-'} />
        <Info label="Toplam durak" value={routeSummary?.totalStops != null ? String(routeSummary.totalStops) : Array.isArray(route?.orderedStops) ? String(route.orderedStops.length) : '-'} />
        <Info label="Toplam yolcu" value={routeSummary?.totalPassengers != null ? String(routeSummary.totalPassengers) : '-'} />
        <Info label="Kalan durak" value={routeSummary?.remainingStops != null ? String(routeSummary.remainingStops) : String(pendingStops.length || 0)} />
        <Info label="Kalan yolcu" value={routeSummary?.remainingPassengers != null ? String(routeSummary.remainingPassengers) : '-'} />
        <Text style={styles.helper}>
          Tam rotayi navigasyonda ac ile bekleyen duraklarin tamami Google Haritalar yon tarifi olarak acilir. Mini onizleme ise yaklasan duraklari sira, yolcu ve mesafe ile listeler.
        </Text>
        {routePreviewStops.length ? <RoutePreviewList stops={routePreviewStops} /> : <Text style={styles.muted}>Bekleyen durak onizlemesi henuz yok.</Text>}
        <View style={styles.actionsRow}>
          <PrimaryButton title="Yenile" onPress={onRefresh} />
          <SecondaryButton title="Haritada ac" onPress={openMaps} disabled={!nextStop?.lat || !nextStop?.lng} />
          <SecondaryButton title="Tam rotayi navigasyonda ac" onPress={openFullRoute} disabled={pendingStops.length < 1} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Release hazirligi" />
        <Info label="Uygulama surumu" value={releaseInfo?.appVersion || '-'} />
        <Info label="Release hedefi" value={releaseInfo?.releaseTarget || '-'} />
        <Info label="Build profilleri" value={releaseInfo?.buildProfiles || '-'} />
        <Info label="EAS Build" value={releaseInfo?.buildProfiles || '-'} />
        <Info label="Dagitim modu" value={releaseInfo?.deliveryMode || '-'} />
        <Info label="Android preview" value={releaseInfo?.androidPreview || '-'} />
        <Info label="Production bundle" value={releaseInfo?.productionBundle || '-'} />
        <Info label="Env asamasi" value={releaseInfo?.envStage || '-'} />
        <Info label="Son build disiplini" value={releaseInfo?.releaseDiscipline || '-'} />
        <Info label="Expo Go" value={releaseInfo?.expoGoStatus || '-'} />
        <Text style={styles.helper}>
          M50 release hazirligini M57.4 kapatir: preview APK / internal dagitim, production AAB, env ayrimi, version bump ve runbook/checker disiplini tek hatta baglanir.
        </Text>
        <View style={styles.rowGap}>
          <Pill label="Surucu Kodu + PIN hazir" tone="ok" />
          <Pill label="Sesli rehber hazir" tone="ok" />
          <Pill label="Durak ETA hazir" tone="ok" />
          <Pill label="Preview APK hazir" tone="ok" />
          <Pill label="Production AAB hazir" tone="ok" />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Surucunun telefon GPS'i" />
        <View style={styles.rowGap}>
          <Pill label={`Izin: ${gps?.permissionStatus || 'unknown'}`} tone={gps?.permissionStatus === 'granted' ? 'ok' : 'warn'} />
          <Pill label={`Arka plan: ${gps?.backgroundPermissionStatus || 'unknown'}`} tone={gps?.backgroundPermissionStatus === 'granted' ? 'ok' : 'warn'} />
          <Pill label={`Servis: ${gps?.backgroundTaskState || 'unknown'}`} tone={gps?.backgroundTaskState === 'running' ? 'ok' : 'warn'} />
          <Pill label={`Gonderim: ${gps?.publishState || 'idle'}`} tone={gps?.publishState === 'ok' ? 'ok' : gps?.publishState === 'retry' || gpsNeedsPermission || kvkkBlocking ? 'warn' : 'info'} />
          <Pill label={`Aralik: ${gps?.intervalSec || 20} sn`} />
        </View>
        <Info label="Izin durumu" value={gps?.permissionText || '-'} />
        <Info label="Arka plan izni" value={gps?.backgroundPermissionText || '-'} />
        <Info label="Arka plan servis" value={gps?.backgroundTaskText || '-'} />
        <Info label="Uygulama durumu" value={gps?.appState || '-'} />
        <Info label="Son arka plan nedeni" value={gps?.lastBackgroundReason || '-'} />
        <Info label="Son arka plan kontrol" value={fmt(gps?.lastBackgroundSyncAt)} />
        <Info label="Gonderim durumu" value={gps?.publishText || '-'} />
        <Info label="Vardiya" value={gps?.shiftId ? `#${gps.shiftId}` : activeShift?.id ? `#${activeShift.id}` : 'Gorev yok'} />
        <Info label="Arac" value={gps?.vehicleId ? `#${gps.vehicleId}` : activeShift?.vehicleId ? `#${activeShift.vehicleId}` : '-'} />
        <Info label="Son konum" value={gps?.lastLocationText || '-'} />
        <Info label="Son gonderim" value={fmt(gps?.lastSentAt)} />
        <Info label="Son deneme" value={fmt(gps?.lastAttemptAt)} />
        <Text style={styles.helper}>
          M81.2 ile sadece uygulama acikken degil, ekran kapali / arka plan davranisi da izlenebilir hale gelir.
          Android testini internal build ile yap; Expo Go arka plan GPS icin dogru referans degildir.
        </Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title={gpsActionTitle} onPress={gpsNeedsPermission ? onRequestGpsPermission : onPublishGpsNow} disabled={kvkkBlocking} />
          <SecondaryButton title="Durumu tazele" onPress={onRefreshGpsStatus} />
          {gpsCanOpenSettings ? <SecondaryButton title="Ayarlari ac" onPress={onOpenGpsSettings} /> : null}
        </View>
      </Card>
    </ScrollView>
  );
}

function isStale(value) {
  if (!value) return false;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms > 90000;
}

function fmt(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  } catch {
    return String(value);
  }
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Pill({ label, tone = 'info' }) {
  return (
    <View style={[styles.pill, tone === 'warn' ? styles.pillWarn : tone === 'ok' ? styles.pillOk : null]}>
      <Text style={[styles.pillText, tone === 'warn' ? styles.pillWarnText : tone === 'ok' ? styles.pillOkText : null]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

function RoutePreviewList({ stops = [] }) {
  return (
    <View style={styles.routePreviewWrap}>
      {stops.map((stop, index) => (
        <View key={`${stop.id}-${index}`} style={styles.routePreviewItem}>
          <View style={styles.routePreviewBadge}><Text style={styles.routePreviewBadgeText}>{stop.order ?? index + 1}</Text></View>
          <View style={styles.routePreviewBody}>
            <Text style={styles.routePreviewTitle}>{stop.name || `Durak ${index + 1}`}</Text>
            <Text style={styles.routePreviewMeta}>
              {stop.passengerCount != null ? `${stop.passengerCount} kisi` : 'Yolcu bilgisi yok'}
              {stop.remainingKm != null ? ` • ${stop.remainingKm} km` : ''}
              {stop.etaMin != null ? ` • ${stop.etaMin} dk` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SecondaryButton({ title, onPress, disabled = false }) {
  return (
    <Pressable style={[styles.secondaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  error: {
    color: '#b91c1c',
    lineHeight: 20,
  },
  muted: {
    color: '#475569',
    lineHeight: 21,
  },
  helper: {
    color: '#64748b',
    lineHeight: 20,
    fontSize: 13,
  },
  rowGap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillOk: {
    backgroundColor: '#ecfdf5',
  },
  pillWarn: {
    backgroundColor: '#fff7ed',
  },
  pillText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 12,
  },
  pillOkText: {
    color: '#047857',
  },
  pillWarnText: {
    color: '#c2410c',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: '#64748b',
    flex: 1,
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  routePreviewWrap: {
    gap: 10,
  },
  routePreviewItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  routePreviewBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  routePreviewBadgeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  routePreviewBody: {
    flex: 1,
    gap: 3,
  },
  routePreviewTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  routePreviewMeta: {
    color: '#475569',
    lineHeight: 19,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  docList: {
    gap: 8,
  },
  docItem: {
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  docTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  docSummary: {
    color: '#475569',
    lineHeight: 19,
    fontSize: 13,
  },
});
