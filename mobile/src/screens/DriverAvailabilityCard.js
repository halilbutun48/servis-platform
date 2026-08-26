import { Text, View } from 'react-native';
import { listDriverAvailabilityModes } from '../app/driverAvailabilityState';
import { Card, Info, Pill, SectionTitle, fmt, styles } from './mobileUi';
import { QuickActionsGrid } from './driverPremiumUi';
import { driverAvailabilityActionLabel } from './driverUiText';

export default function DriverAvailabilityCard({
  driverAvailability,
  routeOpsBusy,
  onSetDriverAvailability,
  compact = false,
}) {
  const currentMode = String(driverAvailability?.mode || 'DRIVING').toUpperCase();
  const modes = listDriverAvailabilityModes();
  const quickActions = ['BREAK', 'DRIVING', 'AVAILABLE', 'CLOSED_TODAY']
    .map((mode) => {
      const item = modes.find((entry) => entry.mode === mode) || null;
      if (!item) return null;
      const active = item.mode === currentMode;
      return {
        title: driverAvailabilityActionLabel(item.mode),
        subtitle: item.description,
        tone: item.tone,
        active,
        onPress: () => onSetDriverAvailability?.(item.mode),
        disabled: !onSetDriverAvailability || routeOpsBusy,
      };
    })
    .filter(Boolean);

  return (
    <Card>
      <SectionTitle
        title="Sürücü durumu"
        subtitle={compact ? 'Kısa sürücü durumu özeti.' : 'Hazır bekleme tercihi cihazda kalır.'}
      />
      {compact ? null : (
        <>
          <Info label="Durum" value={driverAvailability?.label || 'Görevdeyim'} />
          <Info label="Son güncelleme" value={fmt(driverAvailability?.updatedAt)} />
          <View style={styles.rowGap}>
            <Pill label={`Şu an: ${driverAvailability?.label || 'Görevdeyim'}`} tone={driverAvailability?.tone || 'info'} />
            <Pill label="Yerel tercih" tone="info" />
          </View>
        </>
      )}
      <QuickActionsGrid actions={quickActions} />
      {compact ? null : <Text style={styles.muted}>Yeni iş atamasını taşımacılık firması veya operasyon yapar.</Text>}
    </Card>
  );
}
