import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

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
  onRefresh,
  onLogout,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
}) {
  const [busyGps, setBusyGps] = useState(false);
  const [gpsInfo, setGpsInfo] = useState({ status: 'unknown', text: 'Izin durumu henuz okunmadi.' });

  useEffect(() => {
    loadPermissionState();
  }, []);

  async function loadPermissionState() {
    const current = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!current) {
      setGpsInfo({ status: 'error', text: 'GPS izin durumu okunamadi.' });
      return;
    }
    if (current.status !== 'granted') {
      setGpsInfo({ status: current.status, text: "Surucunun telefon GPS'i icin izin henuz verilmedi." });
      return;
    }
    const last = await Location.getLastKnownPositionAsync({ maxAge: 15000 }).catch(() => null);
    if (!last?.coords) {
      setGpsInfo({ status: 'granted', text: 'Izin var. Son konum henuz bulunamadi.' });
      return;
    }
    setGpsInfo({
      status: 'granted',
      text: `Izin var. Son konum: ${last.coords.latitude.toFixed(5)}, ${last.coords.longitude.toFixed(5)}`,
    });
  }

  async function requestGps() {
    setBusyGps(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setGpsInfo({ status: permission.status, text: 'Izin verilmedi. Harita ve konum gonderimi icin bu izin gerekli.' });
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      setGpsInfo({
        status: 'granted',
        text: `Hazir. Konum: ${current.coords.latitude.toFixed(5)}, ${current.coords.longitude.toFixed(5)}`,
      });
    } catch (e) {
      setGpsInfo({ status: 'error', text: String(e?.message || e || 'Konum alinamadi.') });
    } finally {
      setBusyGps(false);
    }
  }

  const activeShift = today?.active || today?.today?.[0] || today?.tomorrow?.[0] || null;
  const nextStop = route?.nextStop || null;
  const headerText = useMemo(() => {
    const fullName = String(me?.fullName || 'Surucu').trim();
    return fullName ? `${fullName}, bugun ekranin hazir.` : 'Bugun ekranin hazir.';
  }, [me?.fullName]);

  const syncStateText = syncing ? 'Senkron oluyor' : 'Hazir';
  const stale = isStale(lastSyncAt);

  async function openMaps() {
    if (!nextStop?.lat || !nextStop?.lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${nextStop.lat},${nextStop.lng}`;
    await Linking.openURL(url);
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
        </Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title="Beta yenile" onPress={onRefresh} />
          <SecondaryButton title="Guvenli cikis" onPress={onLogout} />
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
        {activeShift ? (
          <>
            <Info label="Aktif / siradaki vardiya" value={`#${activeShift.id} • ${String(activeShift.status || '-').toUpperCase()}`} />
            <Info label="Baslangic" value={fmt(activeShift.startAt)} />
            <Info label="Bitis" value={fmt(activeShift.endAt)} />
            <Info label="Arac" value={route?.vehicle?.plate || '-'} />
            <Info label="Sozlesme" value={activeShift.agreementId ? `Var (#${activeShift.agreementId})` : 'Yok'} />
          </>
        ) : (
          <Text style={styles.muted}>Bugun veya yarin icin onayli vardiya gorunmuyor.</Text>
        )}
      </Card>

      <Card>
        <SectionTitle title="Rota ozeti" />
        <Info label="Durum" value={route?.mode || 'NO_DATA'} />
        <Info label="Siradaki durak" value={nextStop?.name || '-'} />
        <Info label="Yaklasik" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
        <Info label="Kalan km" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
        <Info label="Toplam durak" value={Array.isArray(route?.orderedStops) ? String(route.orderedStops.length) : '-'} />
        <View style={styles.actionsRow}>
          <PrimaryButton title="Yenile" onPress={onRefresh} />
          <SecondaryButton title="Haritada ac" onPress={openMaps} disabled={!nextStop?.lat || !nextStop?.lng} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Release hazirligi" />
        <Info label="Uygulama surumu" value={releaseInfo?.appVersion || '-'} />
        <Info label="Release hedefi" value={releaseInfo?.releaseTarget || '-'} />
        <Info label="Build profilleri" value={releaseInfo?.buildProfiles || '-'} />
        <Info label="Dagitim modu" value={releaseInfo?.deliveryMode || '-'} />
        <Info label="Expo Go" value={releaseInfo?.expoGoStatus || '-'} />
        <Text style={styles.helper}>
          M50 mobile release readiness: EAS Build profilleri, runtimeVersion, env ornegi ve Android ilk yayin hazirlik cizgisi.
        </Text>
        <View style={styles.rowGap}>
          <Pill label="Surucu Kodu + PIN hazir" tone="ok" />
          <Pill label="Sesli rehber hazir" tone="ok" />
          <Pill label="Durak ETA hazir" tone="ok" />
          <Pill label="EAS Build hazir" tone="ok" />
        </View>
      </Card>


      <Card>
        <SectionTitle title="GPS hazirligi" />
        <Text style={styles.muted}>{gpsInfo.text}</Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title={busyGps ? 'Bekleniyor...' : 'GPS izni ver / oku'} onPress={requestGps} disabled={busyGps} />
          <SecondaryButton title="Durumu tazele" onPress={loadPermissionState} />
        </View>
        <Text style={styles.helper}>Bu adim M49 sertlestirmesidir. Surekli arka plan gonderim ve sesli yonlendirme sonraki mobil adimlarda genisletilir.</Text>
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
