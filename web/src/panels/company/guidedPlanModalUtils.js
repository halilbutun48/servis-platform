import {
  QUICK_DURATION_PRESETS,
  addDaysISO,
  selectedFromMask,
} from "../../utils/agreementUi";
import { formatDateTimeTR, isoFromTRYmdMin, ymdTR } from "../../utils/time";

export function todayYmd() {
  return ymdTR();
}

export function toHHMM(min) {
  const m = ((Number(min) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseHHMM(s) {
  const t = String(s || "").trim();
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function ymdMinToIso(ymd, min) {
  return isoFromTRYmdMin(ymd, min);
}

export function fmtTR(iso) {
  if (!iso) return "-";
  return formatDateTimeTR(iso);
}

export function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildGuidedPlanModalResetState() {
  return {
    step: 0,
    busy: false,
    err: "",
    info: "",
    hubLat: "",
    hubLng: "",
    addr: "",
    hubLoaded: false,
    packKey: "WK_MORNING_EVENING",
    startDate: todayYmd(),
    durationKey: "1d",
    endDate: createInitialEndDate(),
    daysSel: selectedFromMask(62),
    customSlots: createDefaultCustomSlots(),
    draftNote: "",
    draftAmount: "",
    orgEstimatedPax: "",
    orgGatheringName: "",
    orgReturnType: "RETURN_TO_START",
    orgDestinations: [emptyDestination()],
    mapPickIdx: null,
    mapPickPoint: null,
    draftShiftIds: [],
    draftShifts: [],
    osrmBatch: { running: false, done: 0, total: 0 },
    osrmResById: {},
    roomQ: "",
    onlyHubRooms: false,
    selRoomIds: {},
    roomScores: {},
    offerAmount: "",
    offerNote: "",
    sentOk: false,
    offerOutcome: "idle",
    companyGeoGate: {
      blocking: false,
      ready: true,
      geoStats: { ok: 0, review: 0, failed: 0, total: 0 },
      stopSummary: null,
    },
  };
}

export function normalizePersistedGuidedPlanDraftState(source = {}) {
  const defaults = buildGuidedPlanModalResetState();
  return {
    step: Math.max(0, Math.min(3, Number(source?.step ?? defaults.step) || 0)),
    hubLat: source?.hubLat == null ? defaults.hubLat : String(source.hubLat),
    hubLng: source?.hubLng == null ? defaults.hubLng : String(source.hubLng),
    addr: source?.addr == null ? defaults.addr : String(source.addr),
    hubLoaded: Boolean(source?.hubLoaded ?? defaults.hubLoaded),
    packKey: String(source?.packKey || defaults.packKey || "WK_MORNING_EVENING"),
    startDate: String(source?.startDate || defaults.startDate || todayYmd()),
    durationKey: String(source?.durationKey || defaults.durationKey || "1d"),
    endDate: String(source?.endDate || defaults.endDate || todayYmd()),
    daysSel: source?.daysSel && typeof source.daysSel === "object" ? source.daysSel : defaults.daysSel,
    customSlots: Array.isArray(source?.customSlots) && source.customSlots.length ? source.customSlots : defaults.customSlots,
    draftNote: source?.draftNote == null ? defaults.draftNote : String(source.draftNote),
    draftAmount: source?.draftAmount == null ? defaults.draftAmount : String(source.draftAmount),
    orgEstimatedPax: source?.orgEstimatedPax == null ? defaults.orgEstimatedPax : String(source.orgEstimatedPax),
    orgGatheringName: source?.orgGatheringName == null ? defaults.orgGatheringName : String(source.orgGatheringName),
    orgReturnType: String(source?.orgReturnType || defaults.orgReturnType || "RETURN_TO_START"),
    orgDestinations: Array.isArray(source?.orgDestinations) && source.orgDestinations.length ? source.orgDestinations : defaults.orgDestinations,
    mapPickIdx: (() => {
      if (source?.mapPickIdx == null) return defaults.mapPickIdx;
      const n = Number(source.mapPickIdx);
      return Number.isFinite(n) ? n : defaults.mapPickIdx;
    })(),
    mapPickPoint: Array.isArray(source?.mapPickPoint) ? source.mapPickPoint : defaults.mapPickPoint,
    draftShiftIds: Array.isArray(source?.draftShiftIds) ? source.draftShiftIds.map((x) => Number(x)).filter(Number.isFinite) : defaults.draftShiftIds,
    draftShifts: Array.isArray(source?.draftShifts) ? source.draftShifts : defaults.draftShifts,
    osrmResById: source?.osrmResById && typeof source.osrmResById === "object" ? source.osrmResById : defaults.osrmResById,
    roomQ: source?.roomQ == null ? defaults.roomQ : String(source.roomQ),
    onlyHubRooms: Boolean(source?.onlyHubRooms ?? defaults.onlyHubRooms),
    selRoomIds: source?.selRoomIds && typeof source.selRoomIds === "object" ? source.selRoomIds : defaults.selRoomIds,
    offerAmount: source?.offerAmount == null ? defaults.offerAmount : String(source.offerAmount),
    offerNote: source?.offerNote == null ? defaults.offerNote : String(source.offerNote),
    sentOk: Boolean(source?.sentOk ?? defaults.sentOk),
    offerOutcome: String(source?.offerOutcome || defaults.offerOutcome || "idle"),
    companyGeoGate:
      source?.companyGeoGate && typeof source.companyGeoGate === "object"
        ? source.companyGeoGate
        : defaults.companyGeoGate,
  };
}

const GUIDED_PLAN_MODAL_DRAFT_STORAGE_PREFIX = "psv1:guidedPlanModalDraft:v1";

function normalizeDraftScope(value) {
  return String(value || "")
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._:-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildGuidedPlanModalPersistenceScope({ persistenceScope, launchContext, routeRefreshMode }) {
  const base = normalizeDraftScope(persistenceScope || "company-guided-flow") || "company-guided-flow";
  if (!routeRefreshMode) return `${base}:new-plan`;
  const agreementId = Number(launchContext?.agreementId || 0) || "na";
  const roomId = Number(launchContext?.roomId || 0) || "na";
  const sourceShiftId = Number(launchContext?.sourceShiftId || 0) || "na";
  return `${base}:route-refresh:${agreementId}:${roomId}:${sourceShiftId}`;
}

export function buildGuidedPlanModalDraftStorageKey({ me, persistenceScope, launchContext, routeRefreshMode }) {
  const role = normalizeDraftScope(me?.role || "unknown") || "unknown";
  const companyKind = normalizeDraftScope(me?.companyKind || "unknown") || "unknown";
  const companyId = Number(me?.companyId || me?.organizationId || me?.id || 0) || 0;
  const identity = companyId > 0 ? `company-${companyId}` : `user-${normalizeDraftScope(me?.id || "unknown") || "unknown"}`;
  const scope = buildGuidedPlanModalPersistenceScope({ persistenceScope, launchContext, routeRefreshMode });
  return `${GUIDED_PLAN_MODAL_DRAFT_STORAGE_PREFIX}:${role}:${companyKind}:${identity}:${scope}`;
}

export function readGuidedPlanModalDraftState(storageKey) {
  try {
    if (!storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed.state && typeof parsed.state === "object" ? parsed.state : null;
    if (!state) return null;
    return {
      ts: Number(parsed.ts || 0) || 0,
      state,
    };
  } catch {
    return null;
  }
}

export function writeGuidedPlanModalDraftState(storageKey, state) {
  try {
    if (!storageKey) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        ts: Date.now(),
        state,
      })
    );
  } catch {
    // ignore localStorage errors
  }
}

export function clearGuidedPlanModalDraftState(storageKey) {
  try {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
  } catch {
    // ignore localStorage errors
  }
}

export function buildGuidedPlanModalRouteRefreshPrefill({ launchContext, currentHubLat, currentHubLng }) {
  const roomId = Number(launchContext?.roomId || 0);
  const nextWeekMask = Number(launchContext?.weekMask || 62) || 62;
  const startHHMM = String(launchContext?.startHHMM || "08:00");
  const endHHMM = String(launchContext?.endHHMM || "10:00");
  const direction = String(launchContext?.direction || "INBOUND").toUpperCase();
  const pattern = String(launchContext?.pattern || "ONE_WAY").toUpperCase();
  const hubLatValue = coordNum(launchContext?.hubLat);
  const hubLngValue = coordNum(launchContext?.hubLng);
  const preferredStartDate = String(launchContext?.startDate || todayYmd());
  const currentHubLatValue = coordNum(currentHubLat);
  const currentHubLngValue = coordNum(currentHubLng);
  const hasReadyHub = (hubLatValue != null && hubLngValue != null) || (currentHubLatValue != null && currentHubLngValue != null);

  return {
    packKey: "CUSTOM",
    customSlots: [
      {
        label: "Vardiya 1",
        startHHMM,
        endHHMM,
        direction,
        pattern,
      },
    ],
    startDate: preferredStartDate,
    durationKey: String(launchContext?.durationKey || "1w"),
    daysSel: selectedFromMask(nextWeekMask),
    hubLat: hubLatValue != null ? String(hubLatValue) : null,
    hubLng: hubLngValue != null ? String(hubLngValue) : null,
    selRoomIds: roomId > 0 ? { [roomId]: true } : null,
    roomQ: launchContext?.roomName ? String(launchContext.roomName) : null,
    step: hasReadyHub ? 1 : 0,
    info: `Sözleşme #${Number(launchContext?.agreementId || 0) || "?"} için rota güncelleme hazırlığı açıldı. Plan ve kişi/durak değişikliklerini bu akışta hazırlayabilirsin.`,
  };
}

export function updateStoredPeopleKvkkFields(companyKey, shiftIds, patch) {
  try {
    const ids = Array.isArray(shiftIds) ? shiftIds : [];
    ids.forEach((sid) => {
      const key = `psv1:company:${companyKey}:shift:${sid}:people:v1`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.map((item) => ({
        ...item,
        ...(patch?.phone ? { phone: "" } : {}),
        ...(patch?.address ? { address: "" } : {}),
      }));
      localStorage.setItem(key, JSON.stringify(next));
    });
  } catch {
    // ignore
  }
}

export function collectGuidedSessionPersonIds(companyKey, shiftIds) {
  const ids = new Set();
  try {
    const list = Array.isArray(shiftIds) ? shiftIds : [];
    list.forEach((sid) => {
      const key = `psv1:company:${companyKey}:shift:${sid}:people:v1`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((item) => {
        const pid = Number(item?.personelId ?? item?.id ?? 0);
        if (Number.isFinite(pid) && pid > 0) ids.add(pid);
      });
    });
  } catch {
    // ignore
  }
  return Array.from(ids);
}

export const PACKS = [
  {
    key: "WK_MORNING",
    title: "Hafta içi • Sabah",
    desc: "07:00 → 09:00 (Toplama → Toplanma Konumu)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_EVENING",
    title: "Hafta içi • Akşam",
    desc: "17:00 → 19:00 (Toplanma Konumu → Dağıtım)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_MORNING_EVENING",
    title: "Hafta içi • Sabah + Akşam",
    desc: "2 vardiya taslağı oluşturur (07:00-09:00 + 17:00-19:00)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 7 * 60, endMin: 9 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Akşam", startMin: 17 * 60, endMin: 19 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
  {
    key: "WK_MORNING_AFTERNOON",
    title: "Hafta içi • Sabah + Öğleden sonra",
    desc: "2 vardiya taslağı oluşturur (06:00-08:00 + 15:00-17:00)",
    weekMask: 62,
    durationDays: 30,
    items: [
      { label: "Sabah", startMin: 6 * 60, endMin: 8 * 60, direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Öğleden sonra", startMin: 15 * 60, endMin: 17 * 60, direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
  {
    key: "WK_NIGHT",
    title: "Hafta içi • Gece",
    desc: "23:00 → 01:00 (geceyi aşar)",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Gece", startMin: 23 * 60, endMin: 1 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "CUSTOM",
    title: "Özel",
    desc: "Elle ayarla",
    weekMask: 62,
    durationDays: 30,
    items: [{ label: "Özel", startMin: 8 * 60, endMin: 10 * 60, direction: "INBOUND", pattern: "ONE_WAY" }],
  },
];

export function packTitleForMode(pack, organization) {
  if (!organization) return pack?.title || "";
  const map = {
    WK_MORNING: "Sabah toplama turu",
    WK_EVENING: "Akşam dönüş turu",
    WK_MORNING_EVENING: "Gidiş + dönüş",
    WK_MORNING_AFTERNOON: "Sabah + öğleden sonra turu",
    WK_NIGHT: "Gece turu",
    CUSTOM: "Özel plan",
  };
  return map[pack?.key] || pack?.title || "";
}

export function packDescForMode(pack, organization) {
  if (!organization) return pack?.desc || "";
  const map = {
    WK_MORNING: "Sabah tek tur. Toplanma konumundan çıkıp ziyaret akışını başlatır.",
    WK_EVENING: "Akşam tek tur. Dönüş ya da kapanış akışı için uygundur.",
    WK_MORNING_EVENING: "Aynı gün gidiş + dönüş için 2 taslak oluşturur.",
    WK_MORNING_AFTERNOON: "Sabah çıkış, öğleden sonra devam / dönüş için 2 taslak oluşturur.",
    WK_NIGHT: "Gece başlayan tur veya etkinlik çıkışı için uygundur.",
    CUSTOM: "Saatleri ve tur tipini elle düzenle.",
  };
  return map[pack?.key] || pack?.desc || "";
}

export function directionLabel(direction) {
  return String(direction || "").toUpperCase() === "OUTBOUND" ? "Dağıtım / dönüş" : "Toplama / gidiş";
}

export function patternLabel(pattern) {
  return String(pattern || "").toUpperCase() === "LOOP" ? "Başlangıç noktasına dön" : "Tek yön";
}

export function emptyDestination() {
  return { title: "", address: "", lat: "", lng: "", status: "idle", foundText: "" };
}

export function buildGuidedPlanFilledDestinations(orgDestinations) {
  return (Array.isArray(orgDestinations) ? orgDestinations : []).filter((d) => String(d?.title || d?.address || "").trim());
}

export function buildGuidedPlanDestinationAudit(orgDestinations) {
  const items = (Array.isArray(orgDestinations) ? orgDestinations : [])
    .map((d, idx) => {
      const label = String(d?.title || d?.address || "").trim();
      const lat = coordNum(d?.lat);
      const lng = coordNum(d?.lng);
      return {
        idx,
        label: label || `Konum ${idx + 1}`,
        lat,
        lng,
        hasCoord: hasCoord(lat, lng),
      };
    })
    .filter((x) => Boolean(x.label));

  return {
    total: items.length,
    ready: items.filter((x) => x.hasCoord).length,
    missing: items.filter((x) => !x.hasCoord),
    ok: items.length > 0 && items.every((x) => x.hasCoord),
  };
}

export function buildGuidedPlanDraftCompletion({ organization, draftShifts, draftShiftIds, orgDestinationAudit }) {
  if (!organization) return { ready: true, reasons: [], badShiftIds: [], expectedStops: 0 };

  const reasons = [];
  const expectedStops = Number(orgDestinationAudit?.total || 0);
  if (!expectedStops) reasons.push("En az 1 gidilecek konum ekle.");
  if (!orgDestinationAudit?.ok) {
    reasons.push(`Koordinatı eksik konumlar: ${(orgDestinationAudit?.missing || []).map((x) => x.label).join(", ")}`);
  }
  const badShiftIds = (Array.isArray(draftShifts) ? draftShifts : [])
    .filter((s) => {
      const validStops = (Array.isArray(s?.stops) ? s.stops : []).filter((st) => hasCoord(coordNum(st?.lat), coordNum(st?.lng)));
      return validStops.length < expectedStops;
    })
    .map((s) => Number(s.id))
    .filter(Number.isFinite);
  if ((Array.isArray(draftShiftIds) ? draftShiftIds : []).length && badShiftIds.length) {
    reasons.push(`Eksik duraklı taslak vardiya: ${badShiftIds.map((id) => `#${id}`).join(", ")}`);
  }
  return {
    ready: reasons.length === 0 && (Array.isArray(draftShiftIds) ? draftShiftIds : []).length > 0,
    reasons,
    badShiftIds,
    expectedStops,
  };
}

export function buildGuidedPlanCurrentStepItems({ pack, customSlots }) {
  if (!pack || pack.key !== "CUSTOM") return Array.isArray(pack?.items) ? pack.items : [];
  const slots = Array.isArray(customSlots) ? customSlots : [];
  if (!slots.length) return [];
  const out = [];
  for (const s of slots) {
    const sMin = parseHHMM(s?.startHHMM);
    const eMin = parseHHMM(s?.endHHMM);
    if (sMin == null || eMin == null) return [];
    out.push({
      label: String(s?.label || "").trim() || "Özel",
      startMin: sMin,
      endMin: eMin,
      direction: s?.direction || "INBOUND",
      pattern: s?.pattern || "ONE_WAY",
    });
  }
  return out;
}

export function coordNum(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function hasCoord(lat, lng) {
  return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9);
}

export function fmtCoord(v) {
  const n = coordNum(v);
  return n == null ? "" : String(n);
}

export function stepTitle(step, who, organization) {
  if (organization) {
    if (step === 0) return "1) Toplanma Konumu";
    if (step === 1) return "2) Plan paketi";
    if (step === 2) return "3) Kişi sayısı + yerler";
    if (step === 3) return "4) Ön izleme + teklif";
    return "";
  }
  if (step === 0) return "1) Şirket konumu";
  if (step === 1) return "2) Plan paketi";
  if (step === 2) return `3) ${who} + Durak`;
  if (step === 3) return "4) Ön izleme + teklif";
  return "";
}

export const GUIDED_TEMP_STORAGE_KEY = "psv1:guidedTempShiftIds:v1";

export function readGuidedTempShiftIds() {
  try {
    const raw = localStorage.getItem(GUIDED_TEMP_STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

export function writeGuidedTempShiftIds(ids) {
  try {
    const clean = Array.isArray(ids) ? ids.map((x) => Number(x)).filter(Number.isFinite) : [];
    if (!clean.length) {
      localStorage.removeItem(GUIDED_TEMP_STORAGE_KEY);
      return;
    }
    localStorage.setItem(GUIDED_TEMP_STORAGE_KEY, JSON.stringify(Array.from(new Set(clean))));
  } catch {
    // ignore local draft tracking errors
  }
}

export function clearPlanTermsForShiftIds(ids) {
  try {
    (Array.isArray(ids) ? ids : [])
      .map((x) => Number(x))
      .filter(Number.isFinite)
      .forEach((sid) => localStorage.removeItem(`psv1:planTerms:shift:${sid}:v1`));
  } catch {
    // ignore local cleanup errors
  }
}

export function createDurationOptions() {
  const guidedPresets = (QUICK_DURATION_PRESETS || []).filter((x) => String(x?.key || "") !== "1m");
  return [{ key: "1d", label: "1 gün", days: 1 }, ...guidedPresets];
}

export function createDefaultCustomSlots() {
  return [
    { label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" },
  ];
}

export function createFallbackCustomSlots() {
  return [{ label: "Vardiya 1", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" }];
}

export function createAdditionalCustomSlot(currentLength) {
  return {
    label: `Vardiya ${Number(currentLength || 0) + 1}`,
    startHHMM: "17:00",
    endHHMM: "19:00",
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
  };
}

export function createInitialEndDate() {
  return addDaysISO(todayYmd(), 0);
}
