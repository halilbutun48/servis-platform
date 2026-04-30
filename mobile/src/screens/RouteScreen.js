import { ScrollView, Text, View } from 'react-native';
import { listVisibleShifts, resolveVisibleShift } from '../lib/gps';
import { openFullRouteNavigation, openNextStopNavigation } from '../lib/navigation';
import DriverAvailabilityCard from './DriverAvailabilityCard';
import DriverTaskSummaryCard from './DriverTaskSummaryCard';
import { Card, EmptyState, Info, Pill, PrimaryButton, SecondaryButton, SectionTitle, ShiftChooser, TopTabs, fmt, styles } from './mobileUi';

function stopTone(stop, nextStopId) {
  const state = String(stop?.state || '').toUpperCase();
  if (state === 'REACHED') return 'ok';
  if (state === 'SKIPPED') return 'warn';
  if (Number(stop?.id || 0) && Number(stop?.id || 0) === Number(nextStopId || 0)) return 'danger';
  return 'info';
}

function stopLabel(stop, nextStopId) {
  const state = String(stop?.state || '').toUpperCase();
  if (Number(stop?.id || 0) && Number(stop?.id || 0) === Number(nextStopId || 0) && state === 'PENDING') return 'SIRADAKİ';
  return state || 'PENDING';
}

export default function RouteScreen({
  today,
  route,
  error,
  syncing,
  selectedShiftId,
  routeOpsBusy,
  routeOpsText,
  driverAvailability,
  onRefresh,
  onOpenToday,
  onOpenLive,
  onSelectShift,
  onStartShift,
  onPauseShift,
  onResumeShift,
  onCompleteShift,
  onMarkReached,
  onSkipStop,
  onReopenStop,
  onUndoStop,
  onSetDriverAvailability,
}) {
  const visibleShifts = listVisibleShifts(today);
  const activeShift = route?.shift || resolveVisibleShift(today, selectedShiftId, route);
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
      <TopTabs current="route" onToday={onOpenToday} onRoute={() => null} onLive={onOpenLive} />

      <Card>
        <Text style={styles.title}>Rota</Text>
        <Text style={styles.subtitle}>Bu ekranda seçili vardiya, sıradaki durak ve manuel operasyon adımları yönetilir.</Text>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.rowGap}>
          <Pill label={syncing ? 'Senkron oluyor' : 'Hazır'} tone={syncing ? 'warn' : 'ok'} />
          {routeOpsBusy ? <Pill label="İşlem sürüyor" tone="warn" /> : null}
          {route?.progress?.pausedAt ? <Pill label="Vardiya duraklatıldı" tone="warn" /> : null}
          {route?.progress?.completed ? <Pill label="Rota tamamlandı" tone="ok" /> : null}
        </View>
        {routeOpsText ? <Text style={styles.helper}>{routeOpsText}</Text> : null}
      </Card>

      <Card>
        <SectionTitle title="Vardiya seçimi" subtitle="Rota ve manuel işlem her zaman seçili vardiyaya çalışır." />
        {visibleShifts.length ? (
          <ShiftChooser shifts={visibleShifts} selectedShiftId={selectedShiftId || route?.shift?.id} onSelectShift={onSelectShift} />
        ) : (
          <EmptyState title="Vardiya görünmüyor" text="Bugün veya yakın zaman için atanmış vardiya yok." />
        )}
      </Card>

      <DriverAvailabilityCard
        driverAvailability={driverAvailability}
        routeOpsBusy={routeOpsBusy}
        onSetDriverAvailability={onSetDriverAvailability}
      />

      {activeShift ? (
        <DriverTaskSummaryCard
          title="Görev / rota / ETA"
          subtitle="Güncel rota, tahmini varış ve kalan iş tek kartta."
          activeShift={activeShift}
          route={route}
          routeSummary={routeSummary}
          nextStop={nextStop}
          routePreviewStops={Array.isArray(route?.orderedStops) ? route.orderedStops : []}
          routeOpsText={routeOpsText}
          routeOpsBusy={routeOpsBusy}
          onOpenRoute={openFullRoute}
          onOpenLive={onOpenLive}
          onRefresh={onRefresh}
        />
      ) : null}

      {!activeShift ? (
        <Card>
          <EmptyState title="Rota bulunamadı" text="Seçili vardiya için rota verisi gelmedi. Yenile ve vardiya seçimini tekrar dene." />
          <View style={styles.actionsRow}>
            <PrimaryButton title="Yenile" onPress={onRefresh} />
            <SecondaryButton title="Bugüne dön" onPress={onOpenToday} />
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <SectionTitle title="Seçili vardiya" />
            <Info label="Vardiya" value={`#${activeShift.id} • ${String(route?.shift?.status || activeShift?.status || '-').toUpperCase()}`} />
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
            <SectionTitle title="Rota özeti" subtitle="Kalan süre, mesafe ve durak ilerlemesi tek yerde." />
            <View style={styles.rowGap}>
              {routeSummary.completed ? <Pill label="Rota tamamlandı" tone="ok" /> : null}
              {routeSummary.paused ? <Pill label="Vardiya duraklatıldı" tone="warn" /> : null}
              <Pill label={nextStop ? 'Sıradaki durak hazır' : 'Bekleyen durak yok'} tone={nextStop ? 'info' : 'warn'} />
            </View>
            <Info label="Kalan rota süresi" value={routeSummary.remainingRouteEtaMin != null ? `${routeSummary.remainingRouteEtaMin} dk` : '-'} />
            <Info label="Kalan km" value={routeSummary.remainingKm != null ? `${routeSummary.remainingKm} km` : '-'} />
            <Info label="Kalan durak" value={routeSummary.remainingStops != null ? String(routeSummary.remainingStops) : '-'} />
            <Info label="Kalan yolcu" value={routeSummary.remainingPassengers != null ? String(routeSummary.remainingPassengers) : '-'} />
            <Info label="Son ulaşılan sıra" value={routeSummary.lastReachedOrder != null ? String(routeSummary.lastReachedOrder) : '-'} />
          </Card>

          <Card>
            <SectionTitle title="Sıradaki durak" />
            {nextStop ? (
              <>
                <Info label="Durak" value={nextStop?.name || '-'} />
                <Info label="Sıra" value={nextStop?.order != null ? String(nextStop.order) : '-'} />
                <Info label="Yolcu" value={nextStop?.passengerCount != null ? `${nextStop.passengerCount} kişi` : '-'} />
                <Info label="ETA" value={nextStop?.etaMin != null ? `${nextStop.etaMin} dk` : '-'} />
                <Info label="Mesafe" value={nextStop?.remainingKm != null ? `${nextStop.remainingKm} km` : '-'} />
                <View style={styles.actionsRow}>
                  <PrimaryButton title="Durak ulaşıldı" onPress={() => onMarkReached(nextStop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} />
                  <SecondaryButton title="Durağı atla" onPress={() => onSkipStop(nextStop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} />
                  <SecondaryButton title="Haritada aç" onPress={openMaps} disabled={!nextStop?.lat || !nextStop?.lng} />
                  <SecondaryButton title="Tam rotayı aç" onPress={openFullRoute} disabled={!pendingStops.length} />
                </View>
              </>
            ) : (
              <EmptyState title="Bekleyen durak yok" text="Tüm duraklar işlendi. Gerekirse vardiyayı tamamla." />
            )}
          </Card>

          <Card>
            <SectionTitle title="Tüm duraklar" subtitle="Geri al 2 dakikalık pencereyi dener. Yeniden aç, pencere dolsa bile durağı tekrar PENDING yapar." />
            {Array.isArray(route?.orderedStops) && route.orderedStops.length ? (
              <View style={{ gap: 10 }}>
                {route.orderedStops.map((stop) => {
                  const state = String(stop?.state || 'PENDING').toUpperCase();
                  const isPending = state === 'PENDING';
                  const isClosed = state === 'REACHED' || state === 'SKIPPED';
                  return (
                    <View key={stop.id} style={styles.stopCard}>
                      <View style={styles.stopTitleRow}>
                        <Text style={styles.stopTitle}>{stop.order ? `${stop.order}. ` : ''}{stop.name || 'İsimsiz durak'}</Text>
                        <Pill label={stopLabel(stop, nextStop?.id)} tone={stopTone(stop, nextStop?.id)} />
                      </View>
                      <Text style={styles.stopMeta}>
                        {stop.passengerCount != null ? `${stop.passengerCount} kişi` : 'Yolcu bilgisi yok'}
                        {stop.remainingKm != null ? ` • ${stop.remainingKm} km` : ''}
                        {stop.etaMin != null ? ` • ${stop.etaMin} dk` : ''}
                      </Text>
                      <Text style={styles.stopMeta}>Reached: {fmt(stop.reachedAt)} • Skipped: {fmt(stop.skippedAt)}</Text>
                      <View style={styles.actionsRow}>
                        {isPending ? <PrimaryButton title="Ulaşıldı" onPress={() => onMarkReached(stop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} /> : null}
                        {isPending ? <SecondaryButton title="Atla" onPress={() => onSkipStop(stop.id)} disabled={routeOpsBusy || !!route?.progress?.pausedAt} /> : null}
                        {isClosed ? <SecondaryButton title="Geri al" onPress={() => onUndoStop(stop.id)} disabled={routeOpsBusy} /> : null}
                        {isClosed ? <SecondaryButton title="Yeniden aç" onPress={() => onReopenStop(stop.id)} disabled={routeOpsBusy} /> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyState title="Durak listesi boş" text="Bu vardiya için durak oluşturulmamış görünüyor." />
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
