import { resolveRegionScope } from "../externalCost/referenceLayers.js";

const REGION_RESOLUTION_PRECEDENCE = Object.freeze([
  "CURRENT_OPERATION_PROVINCE",
  "CURRENT_ROUTE_SERVICE_AREA",
  "ACTIVE_SHIFT_AGREEMENT_GEOGRAPHY",
  "CANONICAL_OPERATING_REGION",
  "EXPLICIT_SCENARIO_OVERRIDE",
  "CANONICAL_FALLBACK_POLICY",
]);

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function candidate({ source, sourceLabel, regionId = null, regionName = null, provinceCode = null } = {}) {
  const name = compact(regionName);
  const code = compact(provinceCode);
  if (!name && !code) return null;
  const resolved = resolveRegionScope({ provinceName: name || null, provinceCode: code || null });
  if (resolved.selection !== "EXACT_PROVINCE") return null;
  return {
    source,
    sourceLabel,
    regionId: Number(regionId || 0) || null,
    regionName: resolved.regionName || name || null,
    provinceCode: resolved.regionCode || code || null,
    scopeType: resolved.scopeType,
    scopeKey: resolved.scopeKey,
    selection: resolved.selection,
  };
}

function nestedRegion(entity, source, sourceLabel) {
  return candidate({
    source,
    sourceLabel,
    regionId: entity?.regionId ?? entity?.region?.id,
    regionName: entity?.regionName || entity?.region?.name,
    provinceCode: entity?.provinceCode || entity?.regionCode,
  });
}

/**
 * Resolves the business province already attached to the operation context.
 * Coordinates are intentionally not reverse-geocoded here: a route point is
 * not a canonical province claim unless the domain has stored that claim.
 */
export function resolveOperationRegion({ shift = null, room = null, company = null, agreement = null, explicitRegionName = null } = {}) {
  const candidates = [
    candidate({
      source: "CURRENT_OPERATION_PROVINCE",
      sourceLabel: "Mevcut operasyon ili",
      regionId: shift?.operationRegionId,
      regionName: shift?.operationRegionName,
      provinceCode: shift?.operationProvinceCode,
    }),
    candidate({
      source: "CURRENT_ROUTE_SERVICE_AREA",
      sourceLabel: "Mevcut rota / servis alanı ili",
      regionId: shift?.routeServiceAreaRegionId,
      regionName: shift?.routeServiceAreaRegionName,
      provinceCode: shift?.routeServiceAreaProvinceCode,
    }),
    nestedRegion(shift?.room, "ACTIVE_SHIFT_AGREEMENT_GEOGRAPHY", "Aktif vardiya oda coğrafyası"),
    nestedRegion(shift?.company, "ACTIVE_SHIFT_AGREEMENT_GEOGRAPHY", "Aktif vardiya şirket coğrafyası"),
    nestedRegion(agreement?.room, "ACTIVE_SHIFT_AGREEMENT_GEOGRAPHY", "Aktif sözleşme oda coğrafyası"),
    nestedRegion(agreement?.company, "ACTIVE_SHIFT_AGREEMENT_GEOGRAPHY", "Aktif sözleşme şirket coğrafyası"),
    nestedRegion(room, "CANONICAL_OPERATING_REGION", "Kanonik ROOM işletim bölgesi"),
    nestedRegion(company, "CANONICAL_OPERATING_REGION", "Kanonik COMPANY işletim bölgesi"),
    candidate({
      source: "EXPLICIT_SCENARIO_OVERRIDE",
      sourceLabel: "Açık senaryo bölge geçersiz kılması",
      regionName: explicitRegionName,
    }),
  ].filter(Boolean);

  const selected = candidates[0] || null;
  return {
    status: selected ? "RESOLVED" : "NO_DATA",
    source: selected?.source || "CANONICAL_FALLBACK_POLICY",
    sourceLabel: selected?.sourceLabel || "Kanonik bölge kanıtı bulunamadı; Türkiye geneli fallback kullanılmadı",
    regionId: selected?.regionId || null,
    regionName: selected?.regionName || null,
    provinceCode: selected?.provinceCode || null,
    scopeType: selected?.scopeType || "GLOBAL",
    scopeKey: selected?.scopeKey || "GLOBAL",
    selection: selected?.selection || "NO_GEOGRAPHY",
    precedence: REGION_RESOLUTION_PRECEDENCE,
    candidates,
    usedSilentIstanbulFallback: false,
    fabricated: false,
  };
}

export { REGION_RESOLUTION_PRECEDENCE };
