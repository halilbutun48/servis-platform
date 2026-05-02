import { View } from 'react-native';
import { Card, EmptyState, SecondaryButton, styles } from './mobileUi';
import { HeroShiftCard, QuickActionsGrid, RouteMiniMapCard } from './driverPremiumUi';

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
  subtitle = 'Rota, tahmini varış ve hızlı işlemler tek yerde.',
  activeShift = null,
  route = null,
  routeSummary = {},
  nextStop = null,
  routePreviewStops = [],
  routeOpsText = '',
  routeOpsBusy = false,
  showWorkflowActions = false,
  showRoutePreview = true,
  showRouteAction = true,
  showLiveAction = true,
  routeActionLabel = 'Navigasyonu aç',
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
  const quickActions = [
    showWorkflowActions && canStart
      ? { title: 'Vardiyayı başlat', subtitle: 'Yolculuğa geç', tone: 'dark', onPress: onStartShift }
      : null,
    showWorkflowActions && nextStop
      ? { title: 'Durak ulaşıldı', subtitle: 'Sonraki durağa geçiş', tone: 'success', onPress: () => onMarkReached?.(nextStop.id), disabled: routeOpsBusy || !!route?.progress?.pausedAt }
      : null,
    showWorkflowActions && canComplete
      ? { title: 'Vardiyayı tamamla', subtitle: 'İşi kapat', tone: 'warning', onPress: onCompleteShift, disabled: routeOpsBusy }
      : null,
  ].filter(Boolean);
  const supportActions = [
    showRouteAction && onOpenRoute ? { title: routeActionLabel, onPress: onOpenRoute } : null,
    showLiveAction && onOpenLive ? { title: 'Canlı', onPress: onOpenLive } : null,
    onRefresh ? { title: 'Yenile', onPress: onRefresh, disabled: routeOpsBusy } : null,
  ].filter(Boolean);

  return (
    <Card style={styles.heroCard}>
      <HeroShiftCard
        title={title}
        subtitle={subtitle}
        activeShift={activeShift}
        routeSummary={routeSummary}
        nextStop={nextStop}
        stats={[
          { label: 'Kalan rota süresi', value: remainingRouteEtaMin != null ? `${remainingRouteEtaMin} dk` : '-', note: 'Tahmini', tone: 'dark' },
          { label: 'Kalan km', value: remainingKm != null ? `${remainingKm} km` : '-', note: 'Mesafe', tone: 'dark' },
          { label: 'Kalan durak', value: remainingStops != null ? String(remainingStops) : '-', note: 'Akış', tone: 'dark' },
          { label: 'Kalan yolcu', value: remainingPassengers != null ? String(remainingPassengers) : '-', note: 'Yük', tone: 'dark' },
        ]}
        statusLabel={statusTextFor(routeSummary, activeShift)}
        statusTone={statusToneFor(routeSummary, activeShift)}
        footer={routeOpsText || 'Bugün atanmış görev görünmüyorsa operasyon ekibiniz görev atadığında burada görünecek.'}
      />

      {hasShift ? (
        <>
          <QuickActionsGrid actions={quickActions} />

          {supportActions.length ? (
            <View style={styles.actionsRow}>
              {supportActions.map((action) => (
                <SecondaryButton
                  key={action.title}
                  title={action.title}
                  onPress={action.onPress}
                  disabled={Boolean(action.disabled)}
                />
              ))}
            </View>
          ) : null}

          {showRoutePreview && Array.isArray(routePreviewStops) && routePreviewStops.length ? (
            <RouteMiniMapCard
              title="Durak önizlemesi"
              subtitle="Temsilî rota önizlemesi. Gerçek yol ve trafik için navigasyonu açın."
              stops={routePreviewStops.slice(0, 4)}
              nextStopId={nextStop?.id || null}
              routeSummary={routeSummary}
            />
          ) : showRoutePreview ? (
            <EmptyState title="Bugün atanmış görev görünmüyor." text="Operasyon ekibiniz görev atadığında burada görünecek." />
          ) : null}
        </>
      ) : (
        <EmptyState title="Görev görünmüyor" text="Bugün ekranında görev görünmüyorsa oda veya şirket atamasını kontrol et." />
      )}
    </Card>
  );
}
