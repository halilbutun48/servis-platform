import { Text, View } from 'react-native';
import {
  Card,
  EmptyState,
  Info,
  Pill,
  PrimaryButton,
  RoutePreviewList,
  SecondaryButton,
  SectionTitle,
  styles,
} from './mobileUi';

function statusTextFor(routeSummary = {}, activeShift = null) {
  if (routeSummary.completed) return 'Tamamlandı';
  if (routeSummary.paused) return 'Duraklatıldı';
  if (routeSummary.statusText) return routeSummary.statusText;
  return activeShift ? 'Çalışıyor' : 'Görev yok';
}

function statusToneFor(routeSummary = {}, activeShift = null) {
  if (routeSummary.completed) return 'ok';
  if (routeSummary.paused) return 'warn';
  return activeShift ? 'info' : 'warn';
}

export default function DriverTaskSummaryCard({
  title = 'Bugünkü görev',
  subtitle = 'Rota, ETA ve hızlı işlemler tek yerde.',
  activeShift = null,
  route = null,
  routeSummary = {},
  nextStop = null,
  routePreviewStops = [],
  routeOpsText = '',
  routeOpsBusy = false,
  showWorkflowActions = false,
  onStartShift,
  onMarkReached,
  onCompleteShift,
  onOpenRoute,
  onOpenLive,
  onRefresh,
}) {
  const hasShift = Boolean(activeShift);
  const shiftStatus = String(route?.shift?.status || activeShift?.status || '').toUpperCase();
  const remainingRouteEtaMin = routeSummary.remainingRouteEtaMin ?? route?.remainingRouteEtaMin ?? null;
  const remainingKm = routeSummary.remainingKm ?? route?.remainingKm ?? null;
  const remainingStops = routeSummary.remainingStops ?? route?.summary?.remainingStops ?? null;
  const remainingPassengers = routeSummary.remainingPassengers ?? route?.remainingPassengers ?? null;
  const lastReachedOrder = routeSummary.lastReachedOrder ?? route?.summary?.lastReachedOrder ?? null;
  const canStart = shiftStatus === 'APPROVED';
  const canComplete = ['APPROVED', 'ACTIVE', 'DONE'].includes(shiftStatus) && !route?.progress?.pausedAt && Number(remainingStops || 0) === 0;

  return (
    <Card>
      <SectionTitle title={title} subtitle={subtitle} />
      {routeOpsText ? <Text style={styles.helper}>{routeOpsText}</Text> : null}

      {hasShift ? (
        <>
          <View style={styles.rowGap}>
            {routeSummary.completed ? <Pill label="Rota tamamlandı" tone="ok" /> : null}
            {routeSummary.paused ? <Pill label="Vardiya duraklatıldı" tone="warn" /> : null}
            <Pill label={statusTextFor(routeSummary, activeShift)} tone={statusToneFor(routeSummary, activeShift)} />
            <Pill label={nextStop ? 'Sıradaki durak hazır' : 'Bekleyen durak yok'} tone={nextStop ? 'info' : 'warn'} />
          </View>

          <Info label="Seçili vardiya" value={`#${activeShift.id} • ${String(route?.shift?.status || activeShift?.status || '-').toUpperCase()}`} />
          <Info label="Rota modu" value={route?.mode || 'NO_DATA'} />
          <Info label="Sıradaki durak" value={nextStop?.name || '-'} />
          <Info label="Durak ETA" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
          <Info label="Kalan rota süresi" value={remainingRouteEtaMin != null ? `${remainingRouteEtaMin} dk` : '-'} />
          <Info label="Kalan km" value={remainingKm != null ? `${remainingKm} km` : '-'} />
          <Info label="Kalan durak" value={remainingStops != null ? String(remainingStops) : '-'} />
          <Info label="Kalan yolcu" value={remainingPassengers != null ? String(remainingPassengers) : '-'} />
          <Info label="Son ulaşılan sıra" value={lastReachedOrder != null ? String(lastReachedOrder) : '-'} />

          {Array.isArray(routePreviewStops) && routePreviewStops.length ? (
            <RoutePreviewList stops={routePreviewStops.slice(0, 4)} />
          ) : (
            <EmptyState title="Durak verisi görünmüyor" text="Canlı rota bilgisi henüz hazırlanmadı." />
          )}

          <View style={styles.actionsRow}>
            {showWorkflowActions && canStart ? <PrimaryButton title="Vardiyayı başlat" onPress={onStartShift} disabled={routeOpsBusy} /> : null}
            {showWorkflowActions && nextStop ? <SecondaryButton title="Durak ulaşıldı" onPress={() => onMarkReached?.(nextStop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} /> : null}
            {showWorkflowActions && canComplete ? <SecondaryButton title="Vardiyayı tamamla" onPress={onCompleteShift} disabled={routeOpsBusy} /> : null}
            <SecondaryButton title="Rota ekranını aç" onPress={onOpenRoute} />
            <SecondaryButton title="Canlı ekranını aç" onPress={onOpenLive} />
            <SecondaryButton title="Yenile" onPress={onRefresh} disabled={routeOpsBusy} />
          </View>
        </>
      ) : (
        <EmptyState title="Görev görünmüyor" text="Bugün ekranında görev görünmüyorsa oda veya şirket atamasını kontrol et." />
      )}
    </Card>
  );
}
