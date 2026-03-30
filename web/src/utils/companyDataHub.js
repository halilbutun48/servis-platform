import { cachedGet } from "./uiDataCache";

export const COMPANY_DATA_TAKE = {
  rooms: 30,
  vehicles: 20,
  shifts: 32,
  agreements: 24,
  offers: 30,
  personels: 24,
  mapShifts: 20,
  geoNeedsReview: 10,
};

export const COMPANY_DATA_TTL = {
  rooms: 45000,
  vehicles: 30000,
  shifts: 20000,
  mapShifts: 12000,
  agreements: 20000,
  offers: 20000,
  trustQuality: 25000,
  trustQualityTemplate: 60000,
  personels: 25000,
};

function cleanParams(params = {}) {
  const out = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null) return;
    const text = String(value).trim();
    if (!text) return;
    out.set(key, text);
  });
  return out;
}

function withQuery(path, params = {}) {
  const qs = cleanParams(params).toString();
  return qs ? `${path}?${qs}` : path;
}

export function getCompanyRooms(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.rooms, ttlMs = COMPANY_DATA_TTL.rooms, delayMs = 40 } = {}) {
  return cachedGet(withQuery('/api/rooms', { q, take }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyVehicles(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.vehicles, onlyActive = true, ttlMs = COMPANY_DATA_TTL.vehicles, delayMs = 70 } = {}) {
  return cachedGet(withQuery('/api/vehicles', { q, take, onlyActive: onlyActive ? 1 : null }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyShifts(token, { signal, force = false, take = COMPANY_DATA_TAKE.shifts, status, onlyNow, ttlMs = COMPANY_DATA_TTL.shifts, delayMs = 80 } = {}) {
  return cachedGet(withQuery('/api/shifts', { take, status, onlyNow }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyMapShifts(token, { signal, force = false, ttlMs = COMPANY_DATA_TTL.mapShifts, delayMs = 70 } = {}) {
  return getCompanyShifts(token, {
    signal,
    force,
    ttlMs,
    delayMs,
    take: COMPANY_DATA_TAKE.mapShifts,
    status: 'APPROVED,ACTIVE',
    onlyNow: 1,
  });
}

export function getCompanyAgreements(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.agreements, status, ttlMs = COMPANY_DATA_TTL.agreements, delayMs = 60 } = {}) {
  return cachedGet(withQuery('/api/agreements', { q, take, status }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyOffers(token, { signal, force = false, q, take = COMPANY_DATA_TAKE.offers, status, ttlMs = COMPANY_DATA_TTL.offers, delayMs = 90 } = {}) {
  return cachedGet(withQuery('/api/offers/company', { q, take, status }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyGeoNeedsReview(token, { signal, force = false, kind = 'PERSONEL', take = COMPANY_DATA_TAKE.geoNeedsReview, ttlMs = COMPANY_DATA_TTL.personels, delayMs = 100 } = {}) {
  return cachedGet(withQuery('/api/company/personels', { geoStatus: 'NEEDS_REVIEW', kind, take }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyPersonels(token, { signal, force = false, kind, q, take = COMPANY_DATA_TAKE.personels, ttlMs = COMPANY_DATA_TTL.personels, delayMs = 100 } = {}) {
  return cachedGet(withQuery('/api/company/personels', { kind, q, take }), { token, signal, force, ttlMs, delayMs });
}

export function getCompanyTrustQualitySummary(token, { signal, force = false, ttlMs = COMPANY_DATA_TTL.trustQuality, delayMs = 60 } = {}) {
  return cachedGet('/api/trust-quality/company/summary', { token, signal, force, ttlMs, delayMs });
}

export function getCompanyTrustQualityItems(token, { signal, force = false, q, take = 40, pendingOnly = true, ttlMs = COMPANY_DATA_TTL.trustQuality, delayMs = 90 } = {}) {
  return cachedGet(withQuery('/api/trust-quality/company/items', { q, take, pendingOnly: pendingOnly ? 1 : null }), { token, signal, force, ttlMs, delayMs });
}

export function getTrustQualityTemplate(token, { signal, force = false, ttlMs = COMPANY_DATA_TTL.trustQualityTemplate, delayMs = 30 } = {}) {
  return cachedGet('/api/trust-quality/evaluation-template', { token, signal, force, ttlMs, delayMs });
}

export function getCompanyWorkflowSummary(token, { signal, force = false, ttlMs = 10000, delayMs = 40 } = {}) {
  return cachedGet("/api/company/overview/workflow-summary", { token, signal, force, ttlMs, delayMs });
}

export function getCompanyCommercialFlowSummary(token, { signal, force = false, ttlMs = 10000, delayMs = 40 } = {}) {
  return cachedGet("/api/company/overview/commercial-flow-summary", { token, signal, force, ttlMs, delayMs });
}
