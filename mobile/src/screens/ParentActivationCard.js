import { Text, View } from 'react-native';
import { buildParentActivationState } from '../app/parentActivationState';
import { Card, Info, Pill, SectionTitle, styles } from './mobileUi';

export default function ParentActivationCard({ roleLive = null, selectedChildId = null }) {
  const activation = buildParentActivationState({ roleLive, selectedChildId });

  return (
    <Card>
      <SectionTitle
        title={activation.title}
        subtitle={`${activation.subtitle} Bu kart mobil görünürlük seviyesindedir.`}
      />
      <View style={styles.rowGap}>
        <Pill label={activation.statusText} tone={activation.tone} />
        <Pill label={activation.modelLabel} tone="info" />
        <Pill label={`${activation.childCount} bağlı öğrenci`} tone={activation.childCount > 0 ? 'ok' : 'warn'} />
      </View>
      <Info label="Model" value={activation.modelLabel} />
      <Info label="İlk giriş" value={activation.firstLoginLabel} />
      <Info label="Bağlantı" value={activation.inviteLabel} />
      <Info label="Kapanış" value={activation.closureLabel} />
      <Info label="Seçili öğrenci" value={activation.selectedChildName} />
      <Info label="Okul / şirket" value={activation.selectedChildCompany} />
      <Text style={styles.muted}>{activation.summary}</Text>
      <Text style={styles.muted}>{activation.accessScopeLabel}</Text>
      <Text style={styles.muted}>Davet ve ilişki kapanışı mobil kartta görünür; kesin yetkilendirme sonraki halkada bağlanır.</Text>
      <Text style={styles.muted}>İlk girişte PIN/şifre değişimi gerekli.</Text>
      <Text style={styles.muted}>Hesap pasife alınırsa canlı takip kapanır.</Text>
      <View style={localStyles.listWrap}>
        {activation.checklist.map((item) => (
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
