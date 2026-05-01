import { ActivityIndicator, Text, View } from 'react-native';
import { Card, Info, Pill, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';
import { humanizeDriverUiText } from './driverUiText';

export default function DriverShellLoadingScreen({
  role = '',
  screen = 'today',
  error = '',
  health = null,
  deviceId = '',
  apiBaseUrl = '',
  lastSyncAt = '',
  loading = true,
  syncing = false,
  releaseInfo = null,
  onReady,
  onRefresh,
  onLogout,
}) {
  const currentRole = String(role || '').trim().toUpperCase() || '-';
  const activeScreen = String(screen || 'today').trim() || 'today';
  const title = 'Sürücü ekranı yükleniyor...';
  const subtitle = 'Oturum açıldı, görev bilgileri hazırlanıyor.';
  const loadingText = syncing ? 'Görev bilgileri eşitleniyor.' : 'İlk sürücü görünümü hazırlanıyor.';

  return (
    <View style={styles.wrap} onLayout={() => onReady?.()} collapsable={false}>
      <View style={localStyles.shell}>
        <Card>
          <SectionTitle title={title} subtitle={subtitle} />
          <View style={localStyles.indicatorWrap}>
            <ActivityIndicator color="#0f172a" />
            <Text style={localStyles.loadingText}>{loadingText}</Text>
          </View>

          <View style={styles.rowGap}>
            <Pill label={`Rol: ${humanizeDriverUiText(currentRole, 'Bilinmiyor')}`} tone="info" />
            <Pill label={loading || syncing ? 'Hazırlanıyor' : 'Hazır'} tone={loading || syncing ? 'warning' : 'success'} />
            <Pill label={`Ekran: ${activeScreen}`} tone="passive" />
            <Pill label={`Ortam: ${humanizeDriverUiText(releaseInfo?.envStage || 'unknown', 'Bilinmiyor')}`} tone="passive" />
          </View>

          <Info label="Durum" value={error || 'Oturum açıldı, görev bilgileri hazırlanıyor.'} />
          <Info label="Son senkron" value={fmt(lastSyncAt)} />
          <Info label="API" value={apiBaseUrl || '-'} />
          <Info label="Cihaz" value={deviceId ? 'hazır' : 'yok'} />
          <Info label="Sağlık" value={health?.ok ? 'Hazır' : humanizeDriverUiText(health?.status || '-', 'Bilinmiyor')} />

          <Text style={styles.muted}>
            Bu ekran, sürücü görev kartları yüklenirken boş beyaz alan oluşmaması için görünür kalır.
          </Text>

          <View style={styles.actionsRow}>
            <SecondaryButton title="Yenile" onPress={onRefresh} disabled={!onRefresh} />
            <SecondaryButton title="Güvenli çıkış" onPress={onLogout} disabled={!onLogout} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const localStyles = {
  shell: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  indicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
};
