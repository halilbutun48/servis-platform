import { ExternalReferenceProviderError } from "./providerRegistry.js";

const PROVIDERS = new Set([
  "KGM_TOLL",
  "OTOYOL_A5",
  "KMO_OFFICIAL",
  "YSS_ICA",
  "1915_CANAKKALE",
  "AVRASYA_TUNNEL",
]);
const FAMILIES = new Set(["TOLL", "BRIDGE", "TUNNEL"]);
const DIRECTIONS = new Set(["INBOUND", "OUTBOUND", "NORTHBOUND", "SOUTHBOUND", "EASTBOUND", "WESTBOUND"]);
const PASSAGE_BASIS = "PLANNED_ROUTE_TARIFF";
const ACTUAL_HGS_EVENT_STATUS = "SEPARATE_RECORD_REQUIRED";

function text(value, field, { required = true, max = 160 } = {}) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (required && !normalized) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", `${field} is required.`);
  if (normalized.length > max) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", `${field} is too long.`);
  return normalized;
}

function isoDate(value, field) {
  const normalized = text(value, field, { max: 40 });
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", `${field} must be a valid date.`);
  return normalized.slice(0, 10);
}

function hgsClass(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 6) {
    throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "hgsClass must be an integer from 1 to 6.");
  }
  return parsed;
}

export function normalizePassageRequest(input = {}) {
  const providerKey = text(input.providerKey || "KGM_TOLL", "providerKey", { max: 32 }).toUpperCase();
  const family = text(input.family || (providerKey === "OTOYOL_A5" ? "TOLL" : "TOLL"), "family", { max: 32 }).toUpperCase();
  if (!PROVIDERS.has(providerKey)) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "Unsupported toll provider.");
  if (!FAMILIES.has(family)) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "Unsupported toll family.");
  const direction = text(input.direction, "direction", { max: 32 }).toUpperCase();
  if (!DIRECTIONS.has(direction)) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "direction is not supported.");
  const currencyCode = text(input.currencyCode || "TRY", "currencyCode", { max: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "currencyCode must be an ISO code.");
  const normalized = {
    providerKey,
    family,
    routeId: text(input.routeId, "routeId", { max: 120 }),
    segmentId: text(input.segmentId, "segmentId", { max: 120 }),
    paidSegment: text(input.paidSegment, "paidSegment", { max: 160 }),
    entryStation: text(input.entryStation, "entryStation", { max: 160 }),
    exitStation: text(input.exitStation, "exitStation", { max: 160 }),
    direction,
    hgsClass: hgsClass(input.hgsClass),
    serviceDate: isoDate(input.serviceDate, "serviceDate"),
    tariffDate: isoDate(input.tariffDate, "tariffDate"),
    currencyCode,
  };
  if (input.routeSnapshotInputHash !== undefined && input.routeSnapshotInputHash !== null && input.routeSnapshotInputHash !== "") {
    normalized.routeSnapshotInputHash = text(input.routeSnapshotInputHash, "routeSnapshotInputHash", { max: 160 });
  }
  if (input.highwayId !== undefined && input.highwayId !== null && input.highwayId !== "") {
    const highwayId = Number(input.highwayId);
    if (!Number.isSafeInteger(highwayId) || highwayId <= 0) throw new ExternalReferenceProviderError("INVALID_PASSAGE_CONTEXT", "highwayId must be a positive integer.");
    normalized.highwayId = highwayId;
  }
  return normalized;
}

function referenceValue(reference) {
  const value = reference?.marketReference?.valueMinor ?? reference?.valueMinor;
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}

function matchesRequest(reference, request) {
  const metadata = reference?.marketReference?.sourceMetadata || reference?.sourceMetadata || {};
  return metadata.routeId === request.routeId
    && (!request.routeSnapshotInputHash || metadata.routeSnapshotInputHash === request.routeSnapshotInputHash)
    && metadata.segmentId === request.segmentId
    && metadata.paidSegment === request.paidSegment
    && metadata.entryStation === request.entryStation
    && metadata.exitStation === request.exitStation
    && metadata.direction === request.direction
    && Number(metadata.hgsClass) === request.hgsClass
    && String(metadata.serviceDate || "").slice(0, 10) === request.serviceDate
    && String(metadata.tariffRequestedDate || "").slice(0, 10) === request.tariffDate;
}

function passageRequestKey(request) {
  return [
    request.providerKey,
    request.family,
    request.routeId,
    request.routeSnapshotInputHash || "",
    request.segmentId,
    request.paidSegment,
    request.entryStation,
    request.exitStation,
    request.direction,
    request.hgsClass,
    request.serviceDate,
    request.tariffDate,
  ].join("|");
}

export function resolvePassageEvidence({ requests = [], references = [] } = {}) {
  const seen = new Set();
  const normalizedPairs = requests
    .map((item, index) => ({ request: normalizePassageRequest(item), reference: references[index] }))
    .filter(({ request }) => {
      const key = passageRequestKey(request);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const normalizedRequests = normalizedPairs.map(({ request }) => request);
  if (!normalizedRequests.length) {
    return {
      status: "NOT_PROVEN",
      totalMinor: null,
      currencyCode: "TRY",
      passageBasis: PASSAGE_BASIS,
      actualHgsEventStatus: ACTUAL_HGS_EVENT_STATUS,
      items: [],
      missingReasons: ["Rota için doğrulanmış ücretli kesim tanımı bulunamadı."],
    };
  }
  let totalMinor = 0;
  const items = [];
  const missingReasons = [];
  normalizedRequests.forEach((request, index) => {
    const reference = normalizedPairs[index].reference;
    const marketReference = reference?.marketReference || reference;
    const valueMinor = referenceValue(reference);
    const status = String(reference?.state || reference?.freshness || marketReference?.freshness || "").toUpperCase();
    const dateStatus = String(marketReference?.sourceMetadata?.tariffEffectiveDateStatus || "").toUpperCase();
    const contextStatus = String(marketReference?.sourceMetadata?.passageContextStatus || "").toUpperCase();
    const dateVerified = dateStatus === "VERIFIED" || dateStatus.startsWith("VERIFIED_");
    const proven = valueMinor !== null
      && matchesRequest(reference, request)
      && status !== "EXPIRED"
      && dateVerified
      && contextStatus === "OFFICIAL_VERIFIED"
      && String(marketReference?.currencyCode || request.currencyCode).toUpperCase() === request.currencyCode;
    if (!proven) {
      if (valueMinor === null) missingReasons.push(`${request.paidSegment}: resmi ücret alınamadı.`);
      else if (!matchesRequest(reference, request)) missingReasons.push(`${request.paidSegment}: rota/kesim bağlamı ile kaynak bağlamı eşleşmedi.`);
      else if (dateStatus !== "VERIFIED") missingReasons.push(`${request.paidSegment}: tarife geçerlilik tarihi doğrulanmadı.`);
      else if (contextStatus !== "OFFICIAL_VERIFIED") missingReasons.push(`${request.paidSegment}: resmi kaynak rota bağlamını doğrulamadı.`);
      else missingReasons.push(`${request.paidSegment}: ücret referansı güncel veya para birimi açısından doğrulanamadı.`);
      return;
    }
    totalMinor += valueMinor;
    items.push({
      providerKey: marketReference.providerKey || request.providerKey,
      family: marketReference.family || request.family,
      paidSegment: request.paidSegment,
      entryStation: request.entryStation,
      exitStation: request.exitStation,
      direction: request.direction,
      hgsClass: request.hgsClass,
      serviceDate: request.serviceDate,
      tariffDate: request.tariffDate,
      valueMinor,
      currencyCode: request.currencyCode,
      sourceName: marketReference.sourceName || null,
      sourceUrl: marketReference.sourceUrl || null,
      asOf: marketReference.asOf || null,
    });
  });
  return {
    status: missingReasons.length ? "NOT_PROVEN" : "PROVEN",
    totalMinor: missingReasons.length ? null : totalMinor,
    currencyCode: normalizedRequests[0].currencyCode,
    passageBasis: PASSAGE_BASIS,
    actualHgsEventStatus: ACTUAL_HGS_EVENT_STATUS,
    items,
    missingReasons,
  };
}
