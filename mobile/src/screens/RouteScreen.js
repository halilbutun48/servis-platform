import { ScrollView, Text, View } from 'react-native';
import { resolveDriverGpsShiftContext } from '../lib/gps';
import { openFullRouteNavigation, openNextStopNavigation } from '../lib/navigation';
import DriverTaskSummaryCard from './DriverTaskSummaryCard';
import { DriverDiagnosticsCard, RouteMiniMapCard, RouteNavigationCard, RouteVoiceSupportCard, StopListCard } from './driverPremiumUi';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, fmt, styles } from './mobileUi';
import { humanizeDriverUiText } from './driverUiText';

export default function RouteScreen({
  today,
  route,
  error,
  syncing,
  selectedShiftId,
  routeOpsBusy,
  routeOpsText,
  onRefresh,
  onOpenToday,
  voiceEnabled,
  onToggleVoiceGuidance,
  onSpeakNextStop,
  onSpeakEta,
  onStartShift,
  onPauseShift,
  onResumeShift,
  onCompleteShift,
  onMarkReached,
  onSkipStop,
  onReopenStop,
  onUndoStop,
}) {
  const activeShift = resolveDriverGpsShiftContext(today, route, selectedShiftId).activeShift || route?.shift || null;
  const nextStop = route?.nextStop || null;
  const pendingStops = Array.isArray(route?.orderedStops)
    ? route.orderedStops.filter((stop) => String(stop?.state || '').toUpperCase() === 'PENDING')
    : [];
  const routeSummary = {
    remainingRouteEtaMin: route?.summary?.remainingRouteEtaMin ?? route?.remainingRouteEtaMin ?? null,
    remainingKm: route?.summary?.remainingKm ?? route?.remainingKm ?? null,
    remainingStops: route?.summary?.remainingStops ?? pendingStops.length,
    remainingPassengers: route?.summary?.remainingPassengers ?? route?.remainingPassengers ?? null,
    lastReachedOrder: route?.progress?.lastReachedOrder ?? route?.summary?.lastReachedOrder ?? null,
    completed: Boolean(route?.progress?.completed ?? route?.summary?.completed),
    paused: Boolean(route?.progress?.pausedAt),
    statusText: route?.progress?.completed
      ? 'Tamamlandı'
      : route?.progress?.pausedAt
        ? 'Duraklatıldı'
        : activeShift
          ? 'Çalışıyor'
          : 'Görev yok',
  };
  const canStart = String(route?.shift?.status || activeShift?.status || '').toUpperCase() === 'APPROVED';
  const canPause = String(route?.shift?.status || activeShift?.status || '').toUpperCase() === 'ACTIVE' && !route?.progress?.pausedAt;
  const canResume = String(route?.shift?.status || activeShift?.status || '').toUpperCase() === 'ACTIVE' && !!route?.progress?.pausedAt;
  const canComplete = ['APPROVED', 'ACTIVE', 'DONE'].includes(String(route?.shift?.status || activeShift?.status || '').toUpperCase()) && !route?.progress?.pausedAt && pendingStops.length === 0;

  async function openMaps() {
    await openNextStopNavigation(nextStop, route?.last || route?.vehicle).catch(() => null);
  }

  async function openFullRoute() {
    await openFullRouteNavigation(route).catch(() => null);
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Rota</Text>
        <Text style={styles.subtitle}>Rota, navigasyon ve durak akışı burada.</Text>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.rowGap}>
          <Pill label={syncing ? 'Senkron oluyor' : 'Hazır'} tone={syncing ? 'warn' : 'ok'} />
          {routeOpsBusy ? <Pill label="İşlem sürüyor" tone="warn" /> : null}
          {route?.progress?.pausedAt ? <Pill label="Vardiya duraklatıldı" tone="warn" /> : null}
          {route?.progress?.completed ? <Pill label="Rota tamamlandı" tone="ok" /> : null}
        </View>
        {routeOpsText ? <Text style={styles.helper}>{routeOpsText}</Text> : null}
      </Card>

      {activeShift ? (
        <>
          <DriverTaskSummaryCard
            title={`Rota #${activeShift.id}`}
            subtitle="Bugünkü rota özeti ve kısa operasyon bilgisi."
            activeShift={activeShift}
            route={route}
            routeSummary={routeSummary}
            nextStop={nextStop}
            routeOpsText={routeOpsText}
            routeOpsBusy={routeOpsBusy}
            showWorkflowActions={false}
            showRoutePreview={false}
            showRouteAction={false}
            showLiveAction={false}
            onRefresh={onRefresh}
          />

          <RouteNavigationCard
            nextStop={nextStop}
            routeSummary={routeSummary}
            onOpenRoute={openMaps}
            onOpenNextStopNavigation={openMaps}
            onOpenFullRoute={openFullRoute}
            primaryActionLabel="Navigasyonu aç"
            nextStopActionLabel="Sıradaki durağa git"
            fullRouteActionLabel="Tüm rotayı aç"
          />

          <RouteMiniMapCard
            title="Mini rota önizlemesi"
            subtitle="Temsilî rota önizlemesi. Gerçek yol ve trafik için navigasyonu açın."
            stops={Array.isArray(route?.orderedStops) ? route.orderedStops : []}
            nextStopId={nextStop?.id || null}
            routeSummary={routeSummary}
          />

          <StopListCard
            title="Durak listesi"
            subtitle="İlk duraklar ve sıradaki rota akışı burada görünür."
            stops={Array.isArray(route?.orderedStops) ? route.orderedStops : []}
            nextStopId={nextStop?.id || null}
            onOpenFullRoute={openFullRoute}
          />

          <Card>
            <SectionTitle title="Seçili vardiya" />
            <Info label="Vardiya" value={`#${activeShift.id} • ${humanizeDriverUiText(route?.shift?.status || activeShift?.status || '-', 'Bilinmiyor')}`} />
            <Info label="Başlangıç" value={fmt(route?.shift?.startAt || activeShift?.startAt)} />
            <Info label="Bitiş" value={fmt(route?.shift?.endAt || activeShift?.endAt)} />
            <Info label="Araç" value={route?.vehicle?.plate || activeShift?.vehicle?.plate || (activeShift?.vehicleId ? `#${activeShift.vehicleId}` : '-')} />
            <Info label="Durak durumu" value={route?.progress?.pausedAt ? 'Duraklatıldı' : route?.progress?.completed ? 'Tamamlandı' : 'Çalışıyor'} />
            <View style={styles.actionsRow}>
              {canStart ? <PrimaryButton title="Vardiyayı başlat" onPress={onStartShift} disabled={routeOpsBusy} /> : null}
              {canPause ? <SecondaryButton title="Duraklat" onPress={onPauseShift} disabled={routeOpsBusy} /> : null}
              {canResume ? <PrimaryButton title="Devam et" onPress={onResumeShift} disabled={routeOpsBusy} /> : null}
              {canComplete ? <SecondaryButton title="Vardiyayı tamamla" onPress={onCompleteShift} disabled={routeOpsBusy} /> : null}
            </View>
          </Card>

          <Card>
            <SectionTitle title="Sıradaki durak" />
            {nextStop ? (
              <>
                <Info label="Durak" value={nextStop?.name || '-'} />
                <Info label="Sıra" value={nextStop?.order != null ? String(nextStop.order) : '-'} />
                <Info label="Yolcu" value={nextStop?.passengerCount != null ? `${nextStop.passengerCount} kişi` : '-'} />
                <Info label="Tahmini varış" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
                <Info label="Mesafe" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
                <View style={styles.actionsRow}>
                  <PrimaryButton title="Durak ulaşıldı" onPress={() => onMarkReached(nextStop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} />
                  <SecondaryButton title="Durağı atla" onPress={() => onSkipStop(nextStop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} />
                </View>
              </>
            ) : (
              <EmptyState title="Bekleyen durak yok" text="Tüm duraklar işlendi. Gerekirse vardiyayı tamamla." />
            )}
          </Card>

          <RouteVoiceSupportCard
            voiceEnabled={Boolean(voiceEnabled)}
            nextStop={nextStop}
            onToggleVoiceGuidance={onToggleVoiceGuidance}
            onSpeakNextStop={onSpeakNextStop}
            onSpeakEta={onSpeakEta}
          />

          <DriverDiagnosticsCard
            title="Gelişmiş durum"
            subtitle="Teknik rota ayrıntıları burada gizli tutulur."
            summary="Durak, vardiya ve operasyon bilgileri burada toplanır."
            items={[
              { label: 'Kalan rota süresi', value: routeSummary.remainingRouteEtaMin != null ? `${routeSummary.remainingRouteEtaMin} dk` : '-' },
              { label: 'Kalan km', value: routeSummary.remainingKm != null ? `${routeSummary.remainingKm} km` : '-' },
              { label: 'Kalan durak', value: routeSummary.remainingStops != null ? String(routeSummary.remainingStops) : '-' },
              { label: 'Kalan yolcu', value: routeSummary.remainingPassengers != null ? String(routeSummary.remainingPassengers) : '-' },
              { label: 'Son ulaşılan sıra', value: routeSummary.lastReachedOrder != null ? String(routeSummary.lastReachedOrder) : '-' },
            ]}
          />
        </>
      ) : (
        <Card>
          <EmptyState title="Rota bulunamadı" text="Seçili vardiya için rota verisi gelmedi. Yenile ve vardiya seçimini tekrar dene." />
          <View style={styles.actionsRow}>
            <PrimaryButton title="Yenile" onPress={onRefresh} />
            <SecondaryButton title="Bugüne dön" onPress={onOpenToday} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
