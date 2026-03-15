import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

export default function TodayScreen({ me, today, route, error, onRefresh, onLogout }) {
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
      setGpsInfo({ status: current.status, text: 'Surucunun telefon GPS'i icin izin henuz verilmedi.' });
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

  async function openMaps() {
    if (!nextStop?.lat || !nextStop?.lng) return;
    const label = encodeURIComponent(nextStop?.name || 'Durak');
    const url = `https://www.google.com/maps/search/?api=1&query=${nextStop.lat},${nextStop.lng}&query_place_id=${label}`;
    await Linking.openURL(url);
  }

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
    >
      <Card>
        <Text style={styles.title}>Bugun</Text>
        <Text style={styles.subtitle}>{headerText}</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${String(me?.role || '-')}`} />
          <Pill label={`PIN degisim: ${me?.requirePinChange ? 'Gerekli' : 'Tamam'}`} />
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
        <SectionTitle title="GPS hazirligi" />
        <Text style={styles.muted}>{gpsInfo.text}</Text>
        <View style={styles.actionsRow}>
          <PrimaryButton title={busyGps ? 'Bekleniyor...' : 'GPS izni ver / oku'} onPress={requestGps} disabled={busyGps} />
          <SecondaryButton title="Durumu tazele" onPress={loadPermissionState} />
        </View>
        <Text style={styles.helper}>Bu adim M48 temelidir. Surekli arka plan gonderim ve gorev sirasinda otomatik publish sonraki mobil adimlarda genisletilir.</Text>
      </Card>

      <Card>
        <SectionTitle title="Kisa islemler" />
        <View style={styles.actionsRow}>
          <PrimaryButton title="Cikis" onPress={onLogout} />
        </View>
      </Card>
    </ScrollView>
  );
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

function Pill({ label }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
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
  pillText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 12,
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
  disabled: {
    opacity: 0.6,
  },
});
