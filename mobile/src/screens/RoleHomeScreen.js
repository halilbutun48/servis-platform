import { ScrollView, Text, View } from 'react-native';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';

const ROLE_COPY = {
  PERSONEL: {
    roleLabel: 'Personel',
    title: 'Personel Ana Ekranı',
    subtitle: 'Giriş, rol ayrımı ve oturum hazır. Canlı servis ekranı M95-D aşamasında açılacak.',
    emptyTitle: 'Bugün size atanmış servis bulunmuyor.',
    emptyText: 'Bu ilk sürümde sadece oturum, rol ayrımı ve güvenli çıkış hazır. Canlı personel takip akışı sonraki aşamada gelecek.',
    highlights: [
      'Bağlı servis görünümü',
      'Durağa kaç dakika kaldı',
      'Durağa kaç metre kaldı',
      'Operasyona not gönderme',
      'Farklı durak isteği',
    ],
  },
  PARENT: {
    roleLabel: 'Veli',
    title: 'Veli Ana Ekranı',
    subtitle: 'Giriş, rol ayrımı ve oturum hazır. Canlı takip ekranı M95-D aşamasında açılacak.',
    emptyTitle: 'Bugün öğrenciniz için aktif servis bulunmuyor.',
    emptyText: 'Bu ilk sürümde sadece oturum, rol ayrımı ve güvenli çıkış hazır. Canlı veli takip akışı sonraki aşamada gelecek.',
    highlights: [
      'Bağlı öğrenci görünümü',
      'Servis yaklaşma durumu',
      'Biniş ve iniş bildirimi',
      'Operasyona not gönderme',
      'Farklı durak isteği',
    ],
  },
};

function releaseTone(releaseInfo) {
  if (releaseInfo?.acceptanceBlocking) return 'danger';
  if (Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length) return 'warn';
  return 'ok';
}

export default function RoleHomeScreen({
  role = 'PERSONEL',
  me = null,
  health = null,
  deviceId = '',
  apiBaseUrl = '',
  lastSyncAt = '',
  releaseInfo = null,
  onRefresh,
  onLogout,
}) {
  const key = String(role || '').trim().toUpperCase();
  const copy = ROLE_COPY[key] || ROLE_COPY.PERSONEL;
  const fullName = String(me?.fullName || me?.name || me?.displayName || '-').trim() || '-';
  const healthLabel = health?.ok ? 'UP' : String(health?.status || '-').toUpperCase();

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <View style={styles.rowGap}>
          <Pill label={`Rol: ${copy.roleLabel}`} tone="ok" />
          <Pill label={`Sağlık: ${healthLabel}`} tone={health?.ok ? 'ok' : 'warn'} />
          <Pill label={releaseInfo?.acceptanceStatusText || 'READY'} tone={releaseTone(releaseInfo)} />
        </View>
      </Card>

      <Card>
        <SectionTitle title="Oturum özeti" subtitle="Bu ekran giriş ve rol ayrımı için hazır. Canlı servis akışı sonraki aşamada açılacak." />
        <Info label="Ad / kullanıcı" value={fullName} />
        <Info label="Rol" value={copy.roleLabel} />
        <Info label="Cihaz" value={deviceId || '-'} />
        <Info label="API" value={apiBaseUrl || '-'} />
        <Info label="Son senkron" value={fmt(lastSyncAt)} />
        <Info label="Release özeti" value={releaseInfo?.acceptanceSummary || '-'} />
      </Card>

      <Card>
        <EmptyState title={copy.emptyTitle} text={copy.emptyText} />
      </Card>

      <Card>
        <SectionTitle title="Yakında gelecekler" subtitle="Bu rol için ilk sürümde hazırlanacak ana başlıklar." />
        <View style={{ gap: 8 }}>
          {copy.highlights.map((item) => (
            <Text key={item} style={styles.muted}>- {item}</Text>
          ))}
        </View>
        {Array.isArray(releaseInfo?.acceptanceWarnings) && releaseInfo.acceptanceWarnings.length ? (
          <Text style={styles.muted}>{releaseInfo.acceptanceWarnings.join(' • ')}</Text>
        ) : null}
        <View style={styles.actionsRow}>
          <PrimaryButton title="Yenile" onPress={onRefresh} />
          <SecondaryButton title="Güvenli çıkış" onPress={onLogout} />
        </View>
      </Card>
    </ScrollView>
  );
}
