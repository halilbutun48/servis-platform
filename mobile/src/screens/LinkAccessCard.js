import { Text, View } from 'react-native';
import { buildLinkAccessState } from '../app/linkAccessState';
import { Card, Info, Pill, SectionTitle, styles } from './mobileUi';

export default function LinkAccessCard({ role = 'PERSONEL', roleLive = null }) {
  const access = buildLinkAccessState({ role, roleLive });

  return (
    <Card>
      <SectionTitle title={access.title} subtitle={access.subtitle} />
      <View style={styles.rowGap}>
        <Pill label={access.statusText} tone={access.tone} />
        <Pill label={access.scopeLabel} tone="info" />
        <Pill label={access.blocked ? 'KVKK kapalı' : 'KVKK açık'} tone={access.blocked ? 'warn' : 'ok'} />
      </View>
      <Info label="Bağlantı süresi" value={access.linkLabel} />
      <Info label="Takip yetkisi" value={access.trackingLabel} />
      <Info label="Canlı servis" value={access.activeServiceLabel} />
      <Info label="KVKK" value={access.kvkkLabel} />
      <Info label="Geçerlilik" value={access.lifetimeLabel} />
      <Info label="İptal" value={access.expiryLabel} />
      <Text style={styles.muted}>{access.summary}</Text>
      <Text style={styles.muted}>Takip yalnız aktif servis ve yetkili ilişki varsa görünür.</Text>
      <View style={localStyles.listWrap}>
        {access.checklist.map((item) => (
          <Text key={item} style={localStyles.listItem}>
            • {item}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const localStyles = {
  listWrap: {
    gap: 4,
  },
  listItem: {
    color: '#475569',
    lineHeight: 20,
  },
};
