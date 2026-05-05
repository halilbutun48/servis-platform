import { resolveMobileRolePremiumSurface } from '../lib/roleSurface';

function positiveInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function sortStops(stops) {
  return Array.isArray(stops)
    ? stops.slice().sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    : [];
}

function toKm(lat1, lng1, lat2, lng2) {
  const a = Number(lat1);
  const b = Number(lng1);
  const c = Number(lat2);
  const d = Number(lng2);
  if (![a, b, c, d].every((n) => Number.isFinite(n))) return null;
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);
  const h = sa * sa + Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) * sb * sb;
  const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  return Number(km.toFixed(2));
}

function etaMinutes(km, speedKmh = 30) {
  const distance = Number(km);
  const speed = Number(speedKmh || 30);
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(speed) || speed <= 0) return null;
  return Number(((distance / speed) * 60).toFixed(0));
}

function buildStopPreview(stops, gpsLast) {
  const ordered = sortStops(stops).map((stop) => {
    const remainingKm = gpsLast && typeof gpsLast.lat === 'number' && typeof gpsLast.lng === 'number'
      ? toKm(gpsLast.lat, gpsLast.lng, stop?.lat, stop?.lng)
      : null;
    const speed = typeof gpsLast?.speed === 'number' && gpsLast.speed > 1 ? gpsLast.speed : 30;
    return {
      id: stop?.id ?? null,
      name: stop?.name || 'İsimsiz durak',
      order: stop?.order ?? null,
      state: String(stop?.state || 'PENDING').toUpperCase(),
      type: stop?.type || '',
      passengerCount: stop?.passengerCount ?? stop?._count?.assignments ?? null,
      remainingKm,
      etaMin: remainingKm == null ? null : etaMinutes(remainingKm, speed),
      lat: stop?.lat ?? null,
      lng: stop?.lng ?? null,
    };
  });
  const pending = ordered.filter((stop) => stop.state === 'PENDING');
  const nextStop = pending[0] || null;
  const remainingPassengers = pending.reduce((sum, stop) => sum + Math.max(0, Number(stop.passengerCount || 0)), 0);
  const remainingKm = nextStop?.remainingKm ?? null;
  const etaMin = nextStop?.etaMin ?? null;

  return {
    ordered,
    nextStop,
    remainingStops: pending.length,
    remainingPassengers,
    remainingKm,
    etaMin,
  };
}

function pickLiveVehicle(liveVehicles, vehicleId) {
  const id = positiveInt(vehicleId);
  if (!Array.isArray(liveVehicles) || !liveVehicles.length) return null;
  if (!id) return liveVehicles[0] || null;
  return liveVehicles.find((item) => Number(item?.id || 0) === id || Number(item?.vehicleId || 0) === id) || liveVehicles[0] || null;
}

function isTimestampStale(value, thresholdMs = 90000) {
  if (!value) return false;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms > thresholdMs;
}

function gpsFreshnessText(value) {
  if (!value) return 'GPS bekleniyor';
  if (isTimestampStale(value)) return 'GPS eski';
  return 'Güncel';
}

function createPremiumStats(key, current, etaText, statusText, gpsText) {
  if (key === 'PARENT') {
    return [
      {
        label: 'Tahmini geliş',
        value: etaText,
        note: current?.secondaryText || 'Bağlı öğrenci için güncellenir.',
        tone: 'dark',
      },
      {
        label: 'Öğrenci',
        value: current?.childName || '-',
        note: current?.companyName || '-',
        tone: 'info',
      },
      {
        label: 'Araç / servis',
        value: current?.vehiclePlate || '-',
        note: gpsText,
        tone: 'success',
      },
    ];
  }

  return [
    {
      label: 'Tahmini geliş',
      value: etaText,
      note: current?.secondaryText || 'Servis güncelleniyor.',
      tone: 'dark',
    },
    {
      label: 'Biniş durağı',
      value: current?.nextStop?.name || '-',
      note: current?.remainingStops != null ? `${current.remainingStops} durak kaldı` : 'Sıradaki durak',
      tone: 'info',
    },
    {
      label: 'Araç / servis',
      value: current?.vehiclePlate || '-',
      note: current?.driverName || statusText,
      tone: 'success',
    },
  ];
}

export function buildRoleLivePremiumSurface(role, roleLive = null) {
  const key = String(role || '').trim().toUpperCase();
  const current = roleLive?.current || null;
  const surface = resolveMobileRolePremiumSurface(key);
  const etaMin = Number(current?.etaMin || 0);
  const hasEta = Number.isFinite(etaMin) && etaMin > 0;
  const etaText = hasEta ? `${etaMin} dk` : 'Servis bekleniyor';
  const gpsText = gpsFreshnessText(current?.gpsAt || '');

  let heroText = surface.heroHint || surface.subtitle || 'Servis yaklaşıyor';
  let statusText = surface.legacySubtitle || 'Canlı takip';
  let statusTone = 'info';

  if (key === 'PARENT') {
    if (current?.childStopReached) {
      heroText = 'Servise bindi';
      statusText = 'Servise bindi';
      statusTone = 'success';
    } else if (current?.primaryText && /ulaştı/i.test(current.primaryText)) {
      heroText = 'Okula ulaştı';
      statusText = 'Okula ulaştı';
      statusTone = 'success';
    } else if (hasEta) {
      heroText = `Servis ${etaMin} dk uzakta`;
      statusText = 'Yolda';
      statusTone = 'info';
    } else {
      heroText = 'Servis yaklaşıyor';
      statusText = 'Bugün aktif';
      statusTone = 'warn';
    }
  } else if (key === 'PERSONEL') {
    if (hasEta) {
      heroText = `Servisim ${etaMin} dk uzakta`;
      statusText = current?.shiftStatus === 'ACTIVE' ? 'Bugün aktif' : 'Servis izleniyor';
      statusTone = current?.shiftStatus === 'ACTIVE' ? 'success' : 'info';
    } else if (current?.shiftStatus === 'ACTIVE') {
      heroText = 'Servisim yaklaşıyor';
      statusText = 'Bugün aktif';
      statusTone = 'success';
    } else if (current?.shiftStatus === 'APPROVED') {
      heroText = 'Servisim yaklaşıyor';
      statusText = 'Hazır';
      statusTone = 'info';
    } else {
      heroText = 'Servisim yaklaşıyor';
      statusText = 'Servis izleniyor';
      statusTone = 'warn';
    }
  }

  const routeSummary = key === 'PARENT'
    ? {
        remainingRouteEtaMin: hasEta ? etaMin : null,
        remainingKm: current?.etaKm != null ? Number(current.etaKm) : current?.remainingKm ?? null,
        remainingStops: current?.remainingStopsToChild ?? current?.remainingStops ?? null,
        remainingPassengers: current?.remainingPassengers ?? null,
        lastReachedOrder: null,
        completed: false,
        paused: false,
        statusText,
      }
    : {
        remainingRouteEtaMin: hasEta ? etaMin : null,
        remainingKm: current?.remainingKm ?? null,
        remainingStops: current?.remainingStops ?? null,
        remainingPassengers: current?.remainingPassengers ?? null,
        lastReachedOrder: null,
        completed: false,
        paused: false,
        statusText,
      };

  const detailRows = key === 'PARENT'
    ? [
        { label: 'Öğrenci', value: current?.childName || '-' },
        { label: surface.serviceLabel, value: current?.vehiclePlate || '-' },
        { label: surface.boardingLabel, value: current?.nextStop?.name || '-' },
        { label: surface.gpsLabel, value: gpsText },
      ]
    : [
        { label: surface.etaLabel, value: etaText },
        { label: surface.boardingLabel, value: current?.nextStop?.name || '-' },
        { label: surface.serviceLabel, value: current?.vehiclePlate || '-' },
        { label: surface.gpsLabel, value: gpsText },
      ];

  return {
    key,
    ...surface,
    heroText,
    statusText,
    statusTone,
    gpsText,
    hasCurrent: Boolean(current),
    current,
    stats: createPremiumStats(key, current, etaText, statusText, gpsText),
    routeSummary,
    routePreviewStops: Array.isArray(current?.routePreviewStops) ? current.routePreviewStops : [],
    detailRows,
  };
}

export function buildPersonelRoleLiveState({
  shifts = [],
  liveVehicles = [],
  selectedShiftId = null,
  lastSyncAt = '',
  kvkkBlocking = false,
  netStatus = 'unknown',
} = {}) {
  const orderedShifts = Array.isArray(shifts) ? shifts.filter(Boolean) : [];
  const preferredId = positiveInt(selectedShiftId) || positiveInt(orderedShifts.find((item) => String(item?.status || '').toUpperCase() === 'ACTIVE')?.id) || positiveInt(orderedShifts[0]?.id) || null;
  const selectedShift = preferredId ? orderedShifts.find((item) => Number(item?.id || 0) === preferredId) || orderedShifts[0] || null : orderedShifts[0] || null;
  const liveVehicle = pickLiveVehicle(liveVehicles, selectedShift?.vehicle?.id || selectedShift?.vehicleId || null);
  const gpsLast = liveVehicle?.gpsLast || selectedShift?.vehicle?.gpsLast || null;
  const stopPreview = buildStopPreview(selectedShift?.stops || [], gpsLast);
  const vehiclePlate = liveVehicle?.plate || selectedShift?.vehicle?.plate || '-';
  const status = String(selectedShift?.status || '-').toUpperCase();
  const roomName = selectedShift?.room?.name || '-';
  const driverName = selectedShift?.driver?.fullName || '-';
  const freshness = String(gpsLast?.status || 'OFFLINE').toUpperCase();

  return {
    kind: 'PERSONEL',
    loading: false,
    error: '',
    blocked: Boolean(kvkkBlocking),
    lastSyncAt,
    netStatus,
    selectedShiftId: selectedShift?.id || preferredId || null,
    items: orderedShifts,
    liveVehicles: Array.isArray(liveVehicles) ? liveVehicles : [],
    current: selectedShift ? {
      shiftId: selectedShift.id,
      shiftStatus: status,
      roomName,
      driverName,
      vehiclePlate,
      nextStop: stopPreview.nextStop,
      remainingStops: stopPreview.remainingStops,
      remainingPassengers: stopPreview.remainingPassengers,
      remainingKm: stopPreview.remainingKm,
      etaMin: stopPreview.etaMin,
      gpsStatus: freshness,
      gpsAt: gpsLast?.at || '',
      routePreviewStops: stopPreview.ordered,
      primaryText: stopPreview.nextStop
        ? (stopPreview.etaMin != null
          ? `${stopPreview.nextStop.name} için yaklaşık ${stopPreview.etaMin} dk kaldı.`
          : `${stopPreview.nextStop.name} sıradaki durak.`)
        : 'Bekleyen durak yok.',
      secondaryText: stopPreview.remainingKm != null
        ? `Servis yaklaşık ${stopPreview.remainingKm} km uzakta.`
        : 'Canlı mesafe bilgisi henüz okunamadı.',
      statusText: status === 'ACTIVE'
        ? 'Servis canlı.'
        : status === 'APPROVED'
          ? 'Servis hazır.'
          : 'Servis izleniyor.',
    } : null,
    summary: {
      totalShifts: orderedShifts.length,
      activeShifts: orderedShifts.filter((item) => String(item?.status || '').toUpperCase() === 'ACTIVE').length,
      liveVehicles: Array.isArray(liveVehicles) ? liveVehicles.length : 0,
    },
    emptyTitle: 'Bugün size atanmış servis bulunmuyor.',
    emptyText: 'Canlı personel takip akışı yalnızca bağlı ve aktif servisler için görünür.',
    actionLabel: 'Bugün servisi kullanmayacağım',
  };
}

export function buildParentRoleLiveState({
  children = [],
  liveVehicles = [],
  selectedChildId = null,
  lastSyncAt = '',
  kvkkBlocking = false,
  netStatus = 'unknown',
} = {}) {
  const orderedChildren = Array.isArray(children) ? children.filter(Boolean) : [];
  const preferredId = positiveInt(selectedChildId) || positiveInt(orderedChildren[0]?.id) || null;
  const selectedChild = preferredId ? orderedChildren.find((item) => Number(item?.id || 0) === preferredId) || orderedChildren[0] || null : orderedChildren[0] || null;
  const selectedVehicle = Array.isArray(liveVehicles) && liveVehicles.length
    ? liveVehicles.find((item) => Number(item?.childId || 0) === Number(selectedChild?.id || 0)) || liveVehicles[0] || null
    : null;
  const gpsLast = selectedVehicle?.gpsLast || null;
  const stopPreview = buildStopPreview(selectedVehicle?.stops || [], gpsLast);
  const vehiclePlate = selectedVehicle?.plate || '-';
  const childName = selectedChild?.fullName || '-';
  const companyName = selectedChild?.company?.name || '-';
  const childStopReached = Boolean(selectedVehicle?.childStopReached);
  const freshness = String(gpsLast?.status || 'OFFLINE').toUpperCase();

  return {
    kind: 'PARENT',
    loading: false,
    error: '',
    blocked: Boolean(kvkkBlocking),
    lastSyncAt,
    netStatus,
    selectedChildId: selectedChild?.id || preferredId || null,
    children: orderedChildren,
    liveVehicles: Array.isArray(liveVehicles) ? liveVehicles : [],
    current: selectedChild ? {
      childId: selectedChild.id,
      childName,
      companyName,
      vehiclePlate,
      nextStop: selectedVehicle?.nextStop || stopPreview.nextStop,
      childStop: selectedVehicle?.childStop || null,
      remainingStopsToChild: selectedVehicle?.remainingStopsToChild ?? stopPreview.remainingStops,
      etaMin: selectedVehicle?.etaToChildMin ?? stopPreview.etaMin,
      etaKm: selectedVehicle?.etaToChildKm ?? stopPreview.remainingKm,
      gpsStatus: freshness,
      gpsAt: gpsLast?.at || '',
      routePreviewStops: stopPreview.ordered,
      childStopReached,
      primaryText: childStopReached
        ? 'Çocuğunuz servise bindi.'
        : stopPreview.etaMin != null
          ? `${childName} için yaklaşık ${stopPreview.etaMin} dk kaldı.`
          : `${childName} için canlı servis bekleniyor.`,
      secondaryText: stopPreview.remainingKm != null
        ? `Servis yaklaşık ${stopPreview.remainingKm} km uzakta.`
        : 'Canlı mesafe bilgisi henüz okunamadı.',
      statusText: childStopReached
        ? 'Çocuğunuz servise bindi.'
        : 'Canlı takip açık.',
    } : null,
    summary: {
      totalChildren: orderedChildren.length,
      liveVehicles: Array.isArray(liveVehicles) ? liveVehicles.length : 0,
      consentBlocked: Boolean(kvkkBlocking),
    },
    emptyTitle: 'Bugün öğrenciniz için aktif servis bulunmuyor.',
    emptyText: 'Canlı veli takip akışı yalnızca bağlı öğrenci için görünür.',
    actionLabel: 'Bugün öğrencim servise binmeyecek',
  };
}
