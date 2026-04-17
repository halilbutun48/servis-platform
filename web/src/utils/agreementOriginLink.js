const STORAGE_KEY = "company:agreementOriginByAgreementId:v1";
const MAX_ITEMS = 80;

function readMap() {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(next) {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {}));
    return true;
  } catch {
    return false;
  }
}

function pruneMap(input) {
  const entries = Object.entries(input || {}).sort((a, b) => Number(b?.[1]?.linkedAtTs || 0) - Number(a?.[1]?.linkedAtTs || 0));
  return Object.fromEntries(entries.slice(0, MAX_ITEMS));
}

function buildOrigin(prefill, agreementId) {
  const shiftId = Number(prefill?.sourceShiftId || 0);
  const aid = Number(agreementId || 0);
  if (!shiftId || !aid) return null;
  return {
    source: String(prefill?.source || "SHIFT").toUpperCase(),
    sourceShiftId: shiftId,
    sourceSummary: String(prefill?.sourceSummary || `Vardiya #${shiftId}`),
    linkedAgreementId: aid,
    linkedAt: new Date().toISOString(),
    linkedAtTs: Date.now(),
  };
}

export function linkAgreementsToOrigin(createdIds, prefill) {
  const ids = Array.isArray(createdIds) ? createdIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
  if (!ids.length || !prefill?.sourceShiftId) return false;
  const next = { ...readMap() };
  ids.forEach((agreementId) => {
    const origin = buildOrigin(prefill, agreementId);
    if (origin) next[String(agreementId)] = origin;
  });
  return writeMap(pruneMap(next));
}

export function getAgreementOrigin(agreementId) {
  const id = Number(agreementId || 0);
  if (!id) return null;
  const map = readMap();
  return map[String(id)] || null;
}

export function getAgreementOrigins(agreementIds) {
  const ids = Array.isArray(agreementIds) ? agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
  if (!ids.length) return {};
  const map = readMap();
  const next = {};
  ids.forEach((id) => {
    if (map[String(id)]) next[String(id)] = map[String(id)];
  });
  return next;
}
