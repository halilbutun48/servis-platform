import { Text, View } from 'react-native';
import { listDriverAvailabilityModes } from '../app/driverAvailabilityState';
import { Card, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';

export default function DriverAvailabilityCard({
  driverAvailability,
  routeOpsBusy,
  onSetDriverAvailability,
}) {
  const currentMode = String(driverAvailability?.mode || 'DRIVING').toUpperCase();
  const modes = listDriverAvailabilityModes();

  return (
    <Card>
      <SectionTitle
        title="Sürücü mola / müsaitlik"
        subtitle="Hazır bekleme tercihi cihazda saklanır."
      />
      <Info label="Durum" value={driverAvailability?.label || 'Görevdeyim'} />
      <Info label="Açıklama" value={driverAvailability?.description || 'Aktif vardiya içindeyim.'} />
      <Info label="Son güncelleme" value={fmt(driverAvailability?.updatedAt)} />
      <View style={styles.rowGap}>
        <Pill label={`Şu an: ${driverAvailability?.label || 'Görevdeyim'}`} tone={driverAvailability?.tone || 'info'} />
        <Pill label="Yerel tercih" tone="info" />
      </View>
      <View style={styles.actionsRow}>
        {modes.map((item) => {
          const title = item.label;
          const active = item.mode === currentMode;
          const danger = item.mode === 'NOT_AVAILABLE' || item.mode === 'CLOSED_TODAY';
          const commonProps = {
            key: item.mode,
            title,
            onPress: () => onSetDriverAvailability?.(item.mode),
            disabled: !onSetDriverAvailability || routeOpsBusy,
          };
          if (danger) {
            return <SecondaryButton {...commonProps} tone="danger" />;
          }
          return active ? <PrimaryButton {...commonProps} /> : <SecondaryButton {...commonProps} />;
        })}
      </View>
      <Text style={styles.muted}>Yeni iş atamasını oda/operasyon yapar; bu kart sadece sürücünün hazır bekleme tercihini tutar.</Text>
    </Card>
  );
}
