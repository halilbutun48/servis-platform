import { createJsonFileStore } from "../lib/jsonFileStore.js";

const store = createJsonFileStore("agreement-route-refresh-requests.json", {
  defaultValue: () => ({ lastId: 0, items: [] }),
});

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value) {
  const s = String(value || "PENDING").trim().toUpperCase();
  if (["PENDING", "COUNTERED", "ACCEPTED", "REJECTED", "CANCELLED"].includes(s)) return s;
  return "PENDING";
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const draftShiftIds = Array.from(new Set((Array.isArray(raw.draftShiftIds) ? raw.draftShiftIds : []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
  return {
    id: toInt(raw.id, 0),
    agreementId: toInt(raw.agreementId, 0),
    companyId: toInt(raw.companyId, 0),
    roomId: toInt(raw.roomId, 0),
    sourceShiftId: toInt(raw.sourceShiftId, 0),
    status: normalizeStatus(raw.status),
    draftShiftIds,
    shiftCount: toInt(raw.shiftCount, draftShiftIds.length),
    peopleCount: toInt(raw.peopleCount, 0),
    stopCount: toInt(raw.stopCount, 0),
    startDate: String(raw.startDate || "").slice(0, 10) || null,
    endDate: String(raw.endDate || "").slice(0, 10) || null,
    weekMask: toInt(raw.weekMask, 0),
    startMin: toInt(raw.startMin, 0),
    endMin: toInt(raw.endMin, 0),
    direction: String(raw.direction || "INBOUND").trim().toUpperCase(),
    pattern: String(raw.pattern || "ONE_WAY").trim().toUpperCase(),
    hubLat: raw.hubLat == null ? null : Number(raw.hubLat),
    hubLng: raw.hubLng == null ? null : Number(raw.hubLng),
    priorAgreementAmount: raw.priorAgreementAmount == null ? null : toInt(raw.priorAgreementAmount, null),
    priorAgreementNote: String(raw.priorAgreementNote || "").trim() || null,
    companyOfferAmount: raw.companyOfferAmount == null ? null : toInt(raw.companyOfferAmount, null),
    companyOfferNote: String(raw.companyOfferNote || "").trim() || null,
    initialCompanyOfferAmount: raw.initialCompanyOfferAmount == null ? toInt(raw.companyOfferAmount, null) : toInt(raw.initialCompanyOfferAmount, null),
    initialCompanyOfferNote: String((raw.initialCompanyOfferNote ?? raw.companyOfferNote ?? "")).trim() || null,
    roomCounterAmount: raw.roomCounterAmount == null ? null : toInt(raw.roomCounterAmount, null),
    roomCounterNote: String(raw.roomCounterNote || "").trim() || null,
    finalAcceptedAmount: raw.finalAcceptedAmount == null ? null : toInt(raw.finalAcceptedAmount, null),
    finalAcceptedNote: String(raw.finalAcceptedNote || "").trim() || null,
    finalAcceptedSource: String(raw.finalAcceptedSource || "").trim().toUpperCase() || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    decidedAt: raw.decidedAt || null,
  };
}

function normalizeState(state) {
  const base = state && typeof state === "object" ? state : {};
  const items = Array.isArray(base.items) ? base.items.map(normalizeItem).filter(Boolean) : [];
  const lastId = Math.max(toInt(base.lastId, 0), ...items.map((item) => Number(item.id || 0)));
  return { lastId, items };
}

export async function listAgreementRouteRefreshRequests(filters = {}) {
  const state = normalizeState(await store.readAsync());
  const agreementId = toInt(filters.agreementId, 0);
  const companyId = toInt(filters.companyId, 0);
  const roomId = toInt(filters.roomId, 0);
  const status = filters.status ? normalizeStatus(filters.status) : null;
  const items = state.items.filter((item) => {
    if (agreementId > 0 && Number(item.agreementId) !== agreementId) return false;
    if (companyId > 0 && Number(item.companyId) !== companyId) return false;
    if (roomId > 0 && Number(item.roomId) !== roomId) return false;
    if (status && String(item.status) !== status) return false;
    return true;
  });
  items.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  return items;
}

export async function getAgreementRouteRefreshRequestById(requestId) {
  const state = normalizeState(await store.readAsync());
  const id = toInt(requestId, 0);
  return state.items.find((item) => Number(item.id) === id) || null;
}

export async function getPendingAgreementRouteRefreshRequest(agreementId) {
  const items = await listAgreementRouteRefreshRequests({ agreementId, status: "PENDING" });
  return items[0] || null;
}

export async function createAgreementRouteRefreshRequest(payload) {
  const normalizedPayload = normalizeItem(payload) || {};
  const next = await store.updateAsync((current) => {
    const state = normalizeState(current);
    const createdAt = new Date().toISOString();
    const item = normalizeItem({
      ...normalizedPayload,
      id: state.lastId + 1,
      status: "PENDING",
      createdAt,
      updatedAt: createdAt,
      decidedAt: null,
    });
    state.lastId = Number(item.id);
    state.items.unshift(item);
    return state;
  });
  const state = normalizeState(next);
  return state.items[0] || null;
}

export async function updateAgreementRouteRefreshRequest({ requestId, patch = {} }) {
  const next = await store.updateAsync((current) => {
    const state = normalizeState(current);
    state.items = state.items.map((item) => {
      if (Number(item.id) !== Number(requestId)) return item;
      return normalizeItem({
        ...item,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
    });
    return state;
  });
  const state = normalizeState(next);
  return state.items.find((item) => Number(item.id) === Number(requestId)) || null;
}

export async function decideAgreementRouteRefreshRequest({ requestId, status, patch = {} }) {
  const wanted = normalizeStatus(status);
  if (!["ACCEPTED", "REJECTED", "CANCELLED"].includes(wanted)) throw new Error("invalid route refresh decision");
  const next = await store.updateAsync((current) => {
    const state = normalizeState(current);
    state.items = state.items.map((item) => {
      if (Number(item.id) !== Number(requestId)) return item;
      return normalizeItem({
        ...item,
        ...patch,
        status: wanted,
        updatedAt: new Date().toISOString(),
        decidedAt: new Date().toISOString(),
      });
    });
    return state;
  });
  const state = normalizeState(next);
  return state.items.find((item) => Number(item.id) === Number(requestId)) || null;
}
