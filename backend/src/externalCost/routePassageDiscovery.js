import {
  corridorStepText,
  findRoutePassageCorridor,
  routeStepsForPassage,
} from "./routePassageCorridorCatalog.js";

function text(value) {
  return String(value ?? "").trim();
}
function isHgsClass(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 6;
}

function routeSteps(routeDetails) {
  return routeStepsForPassage(routeDetails);
}

function missingResult(missingReasons, extra = {}) {
  return {
    status: "NOT_PROVEN",
    discoveryStatus: "UNCERTAIN_ROUTE_COVERAGE",
    corridor: null,
    request: null,
    missingReasons: [...new Set(missingReasons.filter(Boolean))],
    ...extra,
  };
}

/**
 * Discovers only a known official corridor from OSRM step evidence.
 *
 * This function deliberately does not infer tolls from vehicle type, distance,
 * or a nearby road name. A request is emitted only when the canonical route
 * context, corridor markers, direction/date, and an explicit trusted HGS class
 * are all present. The existing KGM provider remains the price authority.
 */
export function discoverAutomaticRoutePassage({ routeDetails = null, routeContext = null, hgsClass = null } = {}) {
  const steps = routeSteps(routeDetails);
  if (!steps.length) return missingResult(["OSRM yol adımları/karayolu referansı alınamadı; ücretli geçiş 0 varsayılmadı."]);

  const corridorMatch = findRoutePassageCorridor(steps);
  if (!corridorMatch) {
    return missingResult(["OSRM rotasında doğrulanmış ücretli kesim işareti bulunamadı; HGS 0 varsayılmadı."]);
  }

  const catalogCorridor = corridorMatch.corridor || corridorMatch;
  const paidIndexes = corridorMatch.indexes || [];
  const paidSegment = catalogCorridor.coverageKey;
  const entryMarkerPattern = catalogCorridor.entryMarkerPattern ? new RegExp(catalogCorridor.entryMarkerPattern) : null;
  const exitMarkerPattern = catalogCorridor.exitMarkerPattern ? new RegExp(catalogCorridor.exitMarkerPattern) : null;

  const firstPaidIndex = paidIndexes[0];
  const lastPaidIndex = paidIndexes[paidIndexes.length - 1];
  const entryMarker = steps
    .slice(Math.max(0, firstPaidIndex - 5), firstPaidIndex + 1)
    .find((step) => entryMarkerPattern?.test(corridorStepText(step)));
  const exitMarker = steps
    .slice(lastPaidIndex, Math.min(steps.length, lastPaidIndex + 6))
    .find((step) => exitMarkerPattern?.test(corridorStepText(step)));

  const missingReasons = [];
  if (!catalogCorridor.entryStation || !entryMarker) missingReasons.push("Rota koridoru bulundu ancak giriş gişesi bağlantısı OSRM adımlarında doğrulanamadı.");
  if (!catalogCorridor.exitStation || !exitMarker) missingReasons.push("Rota koridoru bulundu ancak çıkış gişesi bağlantısı OSRM adımlarında doğrulanamadı.");
  if (catalogCorridor.adapterStatus !== "SUPPORTED" || !catalogCorridor.providerKey || !catalogCorridor.highwayId) {
    missingReasons.push("Bu ücretli koridor için doğrulanmış resmi hesaplayıcı bağlantısı henüz hazır değil.");
  }
  if (!routeContext || routeContext.status !== "PROVEN") {
    missingReasons.push(...(routeContext?.missingReasons || ["Canonical rota bağlamı doğrulanamadı."]));
  }
  if (!isHgsClass(hgsClass)) {
    missingReasons.push("Araç HGS sınıfı doğrulanmadı; araç tipinden sınıf çıkarılmadı.");
  }
  if (!routeContext?.direction) missingReasons.push("Rota yönü doğrulanmadı.");
  if (!routeContext?.serviceDate) missingReasons.push("Hizmet tarihi doğrulanmadı.");

  const corridor = {
    ...catalogCorridor,
    entryEvidence: entryMarker ? { name: text(entryMarker.name), ref: text(entryMarker.ref) || null } : null,
    exitEvidence: exitMarker ? { name: text(exitMarker.name), ref: text(exitMarker.ref) || null } : null,
    routeEvidence: catalogCorridor.routeEvidence,
  };
  if (missingReasons.length) {
    return missingResult(missingReasons, {
      discoveryStatus: "PAID_CORRIDOR_DETECTED",
      corridor,
    });
  }

  const serviceDate = String(routeContext.serviceDate).slice(0, 10);
  const tariffDate = `${serviceDate.slice(0, 4)}-01-01`;
  return {
    status: "READY_TO_PRICE",
    discoveryStatus: "PAID_CORRIDOR_DETECTED",
    corridor,
    missingReasons: [],
    request: {
      providerKey: catalogCorridor.providerKey,
      family: catalogCorridor.family,
      routeId: routeContext.routeId,
      routeSnapshotInputHash: routeContext.routeSnapshotInputHash,
      segmentId: `${catalogCorridor.coverageKey}:${catalogCorridor.entryStation}-${catalogCorridor.exitStation}`,
      paidSegment,
      entryStation: catalogCorridor.entryStation,
      exitStation: catalogCorridor.exitStation,
      direction: routeContext.direction,
      hgsClass: Number(hgsClass),
      serviceDate,
      // The official provider must confirm this requested collection date.
      // A mismatch remains NOT_PROVEN; it never becomes a zero-cost fallback.
      tariffDate,
      currencyCode: "TRY",
      highwayId: catalogCorridor.highwayId,
    },
  };
}
