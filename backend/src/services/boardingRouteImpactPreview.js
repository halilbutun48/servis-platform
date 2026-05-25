import { etaMinutes, haversineKm } from "../geo.js";

const DEFAULT_SPEED_KMH = 30;
const COORD_EPS_KM = 0.03;

const PREVIEW_KIND_LABELS = {
  NO_SERVICE_TODAY: "Bugün servis dışı",
  ALTERNATE_STOP_TODAY: "Farklı durak",
  TEMPORARY_BOARDING_NOTE: "Geçici biniş notu",
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compactText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }
  return "";
}

function getCoordinate(value) {
  if (!value || typeof value !== "object") return null;
  const lat = toNumber(value.lat ?? value.latitude ?? value.y);
  const lng = toNumber(value.lng ?? value.lon ?? value.longitude ?? value.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function stopKey(stop) {
  if (!stop || typeof stop !== "object") return "";
  const id = toNumber(stop.id);
  if (id != null && id > 0) return `id:${id}`;
  const coord = getCoordinate(stop);
  if (coord) return `coord:${coord.lat.toFixed(5)},${coord.lng.toFixed(5)}`;
  const label = stopLabel(stop);
  return label ? `label:${label.toLocaleLowerCase("tr-TR")}` : "";
}

function stopLabel(stop) {
  if (!stop || typeof stop !== "object") return "";
  const id = toNumber(stop.id);
  const coord = getCoordinate(stop);
  return firstNonEmpty(
    stop.name,
    stop.label,
    stop.stopName,
    stop.title,
    stop.code,
    stop.stationName,
    stop.address,
    id != null && id > 0 ? `Durak #${id}` : "",
    coord ? `Durak ${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}` : "",
  );
}

function stopDistanceKm(a, b) {
  const left = getCoordinate(a);
  const right = getCoordinate(b);
  if (!left || !right) return null;
  return haversineKm(left.lat, left.lng, right.lat, right.lng);
}

function sameStop(a, b) {
  if (!a || !b) return false;
  const idA = toNumber(a.id);
  const idB = toNumber(b.id);
  if (idA != null && idB != null && idA > 0 && idB > 0 && idA === idB) return true;
  const dist = stopDistanceKm(a, b);
  return dist != null && dist <= COORD_EPS_KM;
}

function uniqueStops(stops = []) {
  const out = [];
  const seen = new Set();
  for (const stop of Array.isArray(stops) ? stops : []) {
    if (!stop || typeof stop !== "object") continue;
    const key = stopKey(stop);
    if (key && seen.has(key)) continue;
    if (out.some((item) => sameStop(item, stop))) continue;
    if (key) seen.add(key);
    out.push(stop);
  }
  return out;
}

function sortStops(stops = []) {
  return uniqueStops(stops).slice().sort((a, b) => {
    const orderA = toNumber(a?.order ?? a?.sortOrder ?? a?.sequence ?? a?.index);
    const orderB = toNumber(b?.order ?? b?.sortOrder ?? b?.sequence ?? b?.index);
    if (orderA != null && orderB != null && orderA !== orderB) return orderA - orderB;
    if (orderA != null && orderB == null) return -1;
    if (orderA == null && orderB != null) return 1;
    return stopLabel(a).localeCompare(stopLabel(b), "tr");
  });
}

function routeDistanceKm(stops = [], hub = null) {
  const coords = [];
  const hubCoord = getCoordinate(hub);
  if (hubCoord) coords.push(hubCoord);
  for (const stop of sortStops(stops)) {
    const coord = getCoordinate(stop);
    if (coord) coords.push(coord);
  }
  if (coords.length < 2) return 0;
  let km = 0;
  for (let i = 0; i + 1 < coords.length; i += 1) {
    km += haversineKm(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
  }
  return km;
}

function findRouteStopIndex(stops = [], target = null) {
  if (!target) return -1;
  const normalized = sortStops(stops);
  const directId = toNumber(target.id);
  if (directId != null && directId > 0) {
    const hitIndex = normalized.findIndex((stop) => toNumber(stop?.id) === directId);
    if (hitIndex >= 0) return hitIndex;
  }
  return normalized.findIndex((stop) => sameStop(stop, target));
}

function findAssignedStop(assignments = [], personelId = null) {
  const pid = toNumber(personelId);
  if (pid == null) return null;
  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    if (toNumber(assignment?.personelId) !== pid) continue;
    if (assignment?.stop && typeof assignment.stop === "object") return assignment.stop;
    if (assignment?.stopId != null) return {
      id: assignment.stopId,
      name: assignment?.stop?.name || assignment?.stopName || assignment?.name || "",
      lat: assignment?.stop?.lat ?? assignment?.lat ?? null,
      lng: assignment?.stop?.lng ?? assignment?.lng ?? null,
      order: assignment?.stop?.order ?? assignment?.order ?? null,
    };
  }
  return null;
}

function countAssignmentsAtStop(assignments = [], stop = null) {
  if (!stop) return 0;
  const id = toNumber(stop.id);
  if (id != null && id > 0) {
    return (Array.isArray(assignments) ? assignments : []).filter((assignment) => toNumber(assignment?.stopId) === id).length;
  }
  return 0;
}

function buildRequestedStop(boardingChange = {}) {
  const fromMeta = boardingChange?.nearestStop && typeof boardingChange.nearestStop === "object" ? boardingChange.nearestStop : null;
  const fromAlt = boardingChange?.newStop && typeof boardingChange.newStop === "object" ? boardingChange.newStop : null;
  const fromLatLng = Number.isFinite(Number(boardingChange?.lat)) && Number.isFinite(Number(boardingChange?.lng))
    ? {
      lat: Number(boardingChange.lat),
      lng: Number(boardingChange.lng),
      name: boardingChange?.stopName || boardingChange?.requestReason || "Geçici durak",
    }
    : null;
  return fromMeta || fromAlt || fromLatLng || null;
}

function normalizePreviewKind(kind) {
  const value = compactText(kind).toUpperCase();
  if (!value) return "TEMPORARY_BOARDING_NOTE";
  if (["NO_SERVICE_TODAY", "NO_SHOW", "NO_SERVICE", "NOBOARDING", "NO_BOARDING"].includes(value)) return "NO_SERVICE_TODAY";
  if (["ALTERNATE_STOP_TODAY", "DIFFERENT_STOP", "PICKUP_FROM_LOCATION", "ALT_STOP", "TEMP_STOP"].includes(value)) return "ALTERNATE_STOP_TODAY";
  if (["TEMPORARY_BOARDING_NOTE", "OPERATION_NOTE", "LATE_TO_STOP", "LATE", "NOTE"].includes(value)) return "TEMPORARY_BOARDING_NOTE";
  return value.includes("NO_SERVICE") ? "NO_SERVICE_TODAY" : value.includes("STOP") ? "ALTERNATE_STOP_TODAY" : "TEMPORARY_BOARDING_NOTE";
}

function routePreviewLabel(changeType) {
  return PREVIEW_KIND_LABELS[normalizePreviewKind(changeType)] || "Rota önizlemesi";
}

function buildPreviewStops({
  currentStops = [],
  affectedCurrentStop = null,
  requestedStop = null,
  previewKind = "TEMPORARY_BOARDING_NOTE",
  assignments = [],
}) {
  const sorted = sortStops(currentStops);
  const currentIndex = findRouteStopIndex(sorted, affectedCurrentStop);
  const requestedIndex = findRouteStopIndex(sorted, requestedStop);
  const currentStopShared = countAssignmentsAtStop(assignments, affectedCurrentStop) > 1;
  const routeStops = sorted.slice();
  const warnings = [];

  if (previewKind === "NO_SERVICE_TODAY") {
    if (currentIndex < 0 || currentStopShared) {
      if (currentIndex < 0) warnings.push("Mevcut durak bulunamadı; stop etkisi yaklaşık hesaplandı.");
      if (currentStopShared) warnings.push("Mevcut durak başka kişi(ler)le paylaşılıyor; durak sayısı değişmeyebilir.");
      return { routeStops, warnings };
    }
    routeStops.splice(currentIndex, 1);
    return { routeStops, warnings };
  }

  if (previewKind === "ALTERNATE_STOP_TODAY") {
    if (!requestedStop) {
      warnings.push("Yeni durak koordinatı bulunamadı; durak etkisi yaklaşık hesaplandı.");
      return { routeStops, warnings };
    }
    if (currentIndex >= 0 && sameStop(currentStops[currentIndex], requestedStop)) {
      return { routeStops, warnings };
    }
    if (requestedIndex >= 0) {
      if (currentIndex >= 0 && !currentStopShared) {
        routeStops.splice(currentIndex, 1);
      } else {
        warnings.push("Yeni durak zaten rota üzerinde; kişi değişikliği stop sayısını değiştirmeyebilir.");
      }
      return { routeStops, warnings };
    }
    if (currentIndex >= 0 && !currentStopShared) {
      routeStops.splice(currentIndex, 1, requestedStop);
      return { routeStops, warnings };
    }
    const insertIndex = Math.max(0, currentIndex >= 0 ? currentIndex + 1 : routeStops.length);
    routeStops.splice(insertIndex, 0, requestedStop);
    return { routeStops, warnings };
  }

  if (previewKind === "TEMPORARY_BOARDING_NOTE") {
    return { routeStops, warnings };
  }

  return { routeStops, warnings };
}

function buildReliability({ currentDistanceKm, previewDistanceKm, routeMetrics = {}, etaContext = {}, warnings = [] }) {
  const snapshotAge = toNumber(routeMetrics?.snapshotAgeMin ?? routeMetrics?.routeSnapshotAgeMin);
  const suspiciousDistance = Number.isFinite(currentDistanceKm) && currentDistanceKm > 200;
  const suspiciousDuration = Number.isFinite(routeMetrics?.currentDurationMin) && Number(routeMetrics.currentDurationMin) > 90;
  const gpsFreshness = compactText(etaContext?.gpsFreshness || etaContext?.gpsState || etaContext?.reliability || "");
  const hasFreshGps = /FRESH|LIVE|ACTIVE|CANLI|AKTIF|AKTİF/.test(gpsFreshness.toUpperCase());
  const hasValidRoute = Number.isFinite(currentDistanceKm) && Number.isFinite(previewDistanceKm);
  if (!hasValidRoute) {
    return {
      ok: false,
      displayMode: "unavailable",
      label: "ETA hesaplanamıyor",
      note: "ETA hesaplanamıyor",
      reason: "ROUTE_DATA_MISSING",
    };
  }

  if (!hasFreshGps || suspiciousDistance || suspiciousDuration || (Number.isFinite(snapshotAge) && snapshotAge > 24 * 60)) {
    return {
      ok: true,
      displayMode: "not-current",
      label: "ETA güncel değil",
      note: "ETA güncel değil",
      reason: "ETA_NOT_CURRENT",
      warnings,
    };
  }

  return {
    ok: true,
    displayMode: "exact",
    label: "Rota önizlemesi",
    note: "Rota etkisi hesaplandı",
    reason: "ROUTE_PREVIEW_READY",
    warnings,
  };
}

export function previewBoardingChangeRouteImpact({
  shift = null,
  currentStops = null,
  passengersOrPeople = null,
  boardingChange = null,
  routeMetrics = null,
  etaContext = null,
} = {}) {
  const changeType = normalizePreviewKind(boardingChange?.changeType || boardingChange?.kind || boardingChange?.requestKind);
  const currentPeople = Array.isArray(passengersOrPeople)
    ? passengersOrPeople
    : Array.isArray(shift?.people)
      ? shift.people
      : [];
  const assignments = Array.isArray(shift?.assignments) ? shift.assignments : [];
  const routeStops = Array.isArray(currentStops)
    ? currentStops
    : Array.isArray(shift?.stops)
      ? shift.stops
      : [];
  const sortedStops = sortStops(routeStops);
  const currentAssignedStop = findAssignedStop(assignments, boardingChange?.personelId ?? boardingChange?.personId ?? boardingChange?.selectedPersonId ?? boardingChange?.person?.id ?? null)
    || boardingChange?.oldStop
    || boardingChange?.currentStop
    || null;
  const requestedStop = buildRequestedStop(boardingChange || {});
  const personLabel = firstNonEmpty(
    boardingChange?.personLabel,
    boardingChange?.selectedLabel,
    boardingChange?.personel?.fullName,
    boardingChange?.personel?.name,
    boardingChange?.personel?.label,
    boardingChange?.personName,
    "Seçili kişi",
  );
  const requestedStopOnRoute = findRouteStopIndex(sortedStops, requestedStop) >= 0;
  const sameAssignedStop = Boolean(currentAssignedStop && requestedStop && sameStop(currentAssignedStop, requestedStop));
  const driverDecidableKinds = new Set(["DIFFERENT_STOP", "ALTERNATE_STOP_TODAY", "PICKUP_FROM_LOCATION"]);
  const isSameRouteDecision = requestedStopOnRoute || sameAssignedStop;
  const decisionOwnerRole = driverDecidableKinds.has(changeType) && isSameRouteDecision
    ? "DRIVER"
    : "COMPANY";
  const decisionOwnerLabel = decisionOwnerRole === "DRIVER" ? "Sürücü" : "Hizmet alan taraf";
  const decisionOwnerNote = decisionOwnerRole === "DRIVER"
    ? isSameRouteDecision
      ? "Aynı rota üzerindeki durak değişikliği sürücü tarafında karar bekliyor."
      : "Bu talep sürücü tarafında karar bekliyor."
    : "Rota değişikliği içerdiği için hizmet alan taraf karar veriyor.";
  const oldStopLabel = firstNonEmpty(stopLabel(currentAssignedStop), boardingChange?.oldStopLabel, "Mevcut durak bulunamadı");
  const newStopLabel = changeType === "NO_SERVICE_TODAY"
    ? "Bugün servis dışı"
    : firstNonEmpty(stopLabel(requestedStop), boardingChange?.newStopLabel, changeType === "TEMPORARY_BOARDING_NOTE" ? "Geçici biniş notu" : "Yeni durak bulunamadı");
  const personDelta = changeType === "NO_SERVICE_TODAY" ? -1 : 0;
  const currentPeopleCount = Number(currentPeople.length || 0);
  const previewPeopleCount = Math.max(0, currentPeopleCount + personDelta);

  const { routeStops: previewStops, warnings } = buildPreviewStops({
    currentStops: sortedStops,
    affectedCurrentStop: currentAssignedStop,
    requestedStop,
    previewKind: changeType,
    assignments,
  });

  const hub = getCoordinate({ lat: shift?.hubLat, lng: shift?.hubLng });
  const currentDistanceEstimateKm = routeDistanceKm(sortedStops, hub);
  const previewDistanceEstimateKm = routeDistanceKm(previewStops, hub);
  const routeSnapshotDistanceM = toNumber(routeMetrics?.currentDistanceM ?? routeMetrics?.distanceM ?? shift?.routeSnapshotDistanceM);
  const routeSnapshotDurationSec = toNumber(routeMetrics?.currentDurationSec ?? routeMetrics?.durationSec ?? shift?.routeSnapshotDurationSec);
  const currentDistanceKm = routeSnapshotDistanceM != null && routeSnapshotDistanceM > 0
    ? Math.max(0, routeSnapshotDistanceM / 1000)
    : currentDistanceEstimateKm;
  const previewDistanceKm = routeSnapshotDistanceM != null && routeSnapshotDistanceM > 0
    ? Math.max(0, currentDistanceKm + (previewDistanceEstimateKm - currentDistanceEstimateKm))
    : previewDistanceEstimateKm;
  const distanceDeltaKm = Number((previewDistanceKm - currentDistanceKm).toFixed(2));
  const speedKmh = Number.isFinite(Number(routeMetrics?.speedKmh))
    ? Number(routeMetrics.speedKmh)
    : Number.isFinite(Number(etaContext?.speedKmh))
      ? Number(etaContext.speedKmh)
      : DEFAULT_SPEED_KMH;
  const currentDurationMin = routeSnapshotDurationSec != null && routeSnapshotDurationSec > 0
    ? Math.max(0, Math.round(routeSnapshotDurationSec / 60))
    : Math.max(0, Math.round(etaMinutes(currentDistanceKm, speedKmh)));
  const previewDurationMin = Math.max(0, Math.round(currentDurationMin + etaMinutes(distanceDeltaKm, speedKmh)));
  const durationDeltaMin = previewDurationMin - currentDurationMin;
  const currentStopCount = sortedStops.length;
  const previewStopCount = previewStops.length;
  const stopDelta = previewStopCount - currentStopCount;
  const vehicleCapacity = toNumber(shift?.vehicle?.capacity ?? routeMetrics?.capacity ?? shift?.capacity);
  const capacityImpact = {
    capacity: vehicleCapacity,
    currentLoad: currentPeopleCount,
    previewLoad: previewPeopleCount,
    delta: previewPeopleCount - currentPeopleCount,
    availableBefore: vehicleCapacity != null ? vehicleCapacity - currentPeopleCount : null,
    availableAfter: vehicleCapacity != null ? vehicleCapacity - previewPeopleCount : null,
    status: vehicleCapacity == null
      ? "UNKNOWN"
      : previewPeopleCount > vehicleCapacity
        ? "OVER"
        : previewPeopleCount >= Math.max(0, vehicleCapacity - 1)
          ? "NEAR"
          : "OK",
  };

  if (changeType === "NO_SERVICE_TODAY") {
    warnings.push("Bu kişi bugün servis dışı sayılıyor; rota değişikliği stop etkisi paylaşılan durakta sınırlı olabilir.");
  }
  if (changeType === "ALTERNATE_STOP_TODAY" && !requestedStop) {
    warnings.push("Yeni durak koordinatı bulunamadı; km/süre etkisi yaklaşık.");
  }
  if (!routeSnapshotDistanceM) {
    warnings.push("Rota snapshot yok; km/süre durak koordinatlarına göre yaklaşık hesaplandı.");
  }
  if (!routeSnapshotDurationSec) {
    warnings.push("Süre snapshot yok; süre etkisi yaklaşık hesaplandı.");
  }
  if (Math.abs(distanceDeltaKm) > 30 || previewDurationMin > 90) {
    warnings.push("Süre çok yüksek görünüyor; kesin ETA gibi okunmamalı.");
  }

  const reliability = buildReliability({
    currentDistanceKm,
    previewDistanceKm,
    routeMetrics: {
      ...routeMetrics,
      currentDurationMin,
      snapshotAgeMin: routeMetrics?.snapshotAgeMin ?? routeMetrics?.routeSnapshotAgeMin ?? null,
    },
    etaContext,
    warnings,
  });

  const previewOnlyNote = "Bu sadece önizlemedir. Rota/atama uygulanmadı.";
  const nextBestAction = changeType === "NO_SERVICE_TODAY"
    ? "Bu kişi için günlük servis dışı önizlemesini doğrula."
    : changeType === "ALTERNATE_STOP_TODAY"
      ? "Yeni durak bilgisini doğrula ve önizlemeyi kapatmadan önce kısaca kontrol et."
      : "Notu kontrol et; rota ve atama üzerinde yazma yapılmadı.";
  const summaryLine = [
    routePreviewLabel(changeType),
    `Kişi: ${personLabel}`,
    `Eski durak: ${oldStopLabel}`,
    `Yeni/geçici durak: ${newStopLabel}`,
    `Kişi farkı: ${previewPeopleCount - currentPeopleCount}`,
    `Durak farkı: ${stopDelta}`,
    `Km farkı: ${distanceDeltaKm.toFixed(2)} km`,
    `Süre farkı: ${durationDeltaMin} dk`,
    `Kapasite: ${capacityImpact.availableAfter != null ? `${capacityImpact.availableAfter} boş` : "bilinmiyor"}`,
  ].join(" • ");

  return {
    ok: true,
    changeType,
    changeTypeLabel: routePreviewLabel(changeType),
    personLabel,
    oldStopLabel,
    newStopLabel,
    currentPeopleCount,
    previewPeopleCount,
    currentStopCount,
    previewStopCount,
    currentDistanceKm: Number(currentDistanceKm.toFixed(2)),
    previewDistanceKm: Number(previewDistanceKm.toFixed(2)),
    distanceDeltaKm,
    currentDurationMin,
    previewDurationMin,
    durationDeltaMin,
    capacityImpact,
    reliability,
    warnings: uniqueWarnings(warnings),
    nextBestAction,
    previewOnlyNote,
    summaryLine,
    selectedRecordStatus: reliability.label || "Önizleme",
    decisionOwnerRole,
    decisionOwnerLabel,
    decisionOwnerNote,
  };
}

function uniqueWarnings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = compactText(value);
    if (!text) continue;
    const key = text.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}
