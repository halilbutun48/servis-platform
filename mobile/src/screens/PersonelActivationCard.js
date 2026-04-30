import { Text, View } from "react-native";
import { buildPersonelActivationState } from "../app/personelActivationState";
import { Card, Info, Pill, SectionTitle, styles } from "./mobileUi";

export default function PersonelActivationCard({ me = null }) {
  const activation = buildPersonelActivationState(me);

  return (
    <Card>
      <SectionTitle
        title="Personel aktivasyon modeli"
        subtitle="Kurum daveti, ilk girişte PIN/şifre değişimi ve cihaz eşleşmesi tek yerde görünür."
      />
      <View style={styles.rowGap}>
        <Pill label={activation.statusText} tone={activation.tone} />
        <Pill label={activation.modelLabel} tone="info" />
        <Pill label={activation.deviceLabel} tone="info" />
      </View>
      <Info label="Model" value={activation.modelLabel} />
      <Info label="İlk giriş" value={activation.firstLoginLabel} />
      <Info label="Kapanış" value={activation.closureLabel} />
      <Text style={styles.muted}>{activation.summary}</Text>
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
    color: "#475569",
    lineHeight: 20,
  },
};
