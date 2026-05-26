import { createAndEmitNotification } from "../notifications/service.js";
import { haversineM } from "./shifts/helpers.js";

const BOARDING_CHANGE_KIND_LABELS = {
  NO_SHOW: {
    PERSONEL: "Bugün servisi kullanmayacağım",
    PARENT: "Bugün öğrencim servise binmeyecek",
  },
  DIFFERENT_STOP: {
    PERSONEL: "Farklı duraktan bineceğim",
    PARENT: "Farklı duraktan binecek",
  },
  LATE_TO_STOP: {
    PERSONEL: "Durağa yetişemiyorum",
    PARENT: "Durağa yetişemiyor",
  },
  PICKUP_FROM_LOCATION: {
    PERSONEL: "Konumdan alınmak istiyorum",
    PARENT: "Konumdan alınmak istiyorum",
  },
  OPERATION_NOTE: {
    PERSONEL: "Operasyona not gönder",
    PARENT: "Operasyona not gönder",
  },
};

const BOARDING_CHANGE_KIND_ORDER = [
  "NO_SHOW",
  "DIFFERENT_STOP",
  "LATE_TO_STOP",
  "PICKUP_FROM_LOCATION",
  "OPERATION_NOTE",
];

const AUTO_ACCEPT_DISTANCE_M = 150;
const LATE_TO_STOP_CUTOFF_MIN = 20;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase() === "PARENT" ? "PARENT" : "PERSONEL";
}

export function normalizeBoardingChangeKind(value) {
  const raw = normalizeText(value?.kind || value);
  if (!raw) return "DIFFERENT_STOP";

  switch (raw) {
    case "no_show":
    case "no show":
    case "no service today":
    case "no service":
    case "dont_board":
    case "don't board":
    case "bugun binmeyecegim":
    case "bugun binmeyecegim talebi":
    case "bugun servisi kullanmayacagim":
    case "bugun ogrencim servise binmeyecek":
    case "cocugum bugun binmeyecek":
    case "cocugum bugun servise binmeyecek":
      return "NO_SHOW";
    case "different_stop":
    case "different stop":
    case "alternate_stop":
    case "alternate stop":
    case "alternate stop today":
    case "farkli duraktan binecegim":
    case "farkli duraktan binecek":
    case "farkli duraktan alinmak istiyorum":
    case "farklı duraktan bineceğim":
    case "farklı duraktan binecek":
    case "farklı duraktan alınmak istiyorum":
    case "baska duraktan binecegim":
    case "baska duraktan binecek":
    case "cocugum baska duraktan binecek":
    case "cocugum farkli duraktan binecek":
      return "DIFFERENT_STOP";
    case "late_to_stop":
    case "late to stop":
    case "duraga yetisemiyorum":
    case "duraga yetisemiyor":
      return "LATE_TO_STOP";
    case "pickup_from_location":
    case "pick up from location":
    case "konumdan alinmak istiyorum":
    case "farkli konumdan alinmak istiyorum":
    case "cocugum su konumdan alinsin":
    case "cocugum su konumdan alinmak istiyor":
      return "PICKUP_FROM_LOCATION";
    case "operation_note":
    case "operation note":
    case "temporary boarding note":
    case "operasyona not gonder":
    case "gecici binis notu":
    case "geçici biniş notu":
      return "OPERATION_NOTE";
    default:
      return BOARDING_CHANGE_KIND_ORDER.includes(raw.toUpperCase()) ? raw.toUpperCase() : "DIFFERENT_STOP";
  }
}

export function buildBoardingChangeRequestReason(kind, role) {
  const normalizedRole = normalizeRole(role);
  const normalizedKind = normalizeBoardingChangeKind(kind);
  return BOARDING_CHANGE_KIND_LABELS[normalizedKind]?.[normalizedRole] || BOARDING_CHANGE_KIND_LABELS.DIFFERENT_STOP[normalizedRole];
}

export function formatBoardingChangeDecisionText({
  requestKind,
  requesterRole,
  decisionState,
} = {}) {
  const label = buildBoardingChangeRequestReason(requestKind, requesterRole);
  switch (String(decisionState || "").trim().toUpperCase()) {
    case "AUTO_ACCEPTED":
      return `${label} kaydı otomatik onaylandı.`;
    case "ROOM_ACCEPTED":
      return `${label} kaydı oda tarafından onaylandı.`;
    case "ROOM_CANCELLED":
      return `${label} kaydı oda tarafından iptal edildi.`;
    case "CUTOFF_REVIEW":
      return `${label} kaydı cutoff sonrası incelemeye düştü.`;
    case "NO_SHOW":
      return `${label} bildirimi ayrı akışta tutulur.`;
    case "CANCELLED":
      return `${label} kaydı iptal edildi.`;
    case "MANUAL_REVIEW":
    default:
      return `${label} kaydı operasyona ulaştı.`;
  }
}

export function collectShiftStops(shift = {}) {
  return Array.isArray(shift?.stops)
    ? shift.stops
        .filter((stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lng)))
        .map((stop) => ({
          id: Number(stop?.id || 0) || null,
          name: String(stop?.name || "").trim() || "-",
          order: Number(stop?.order || 0) || 0,
          lat: Number(stop?.lat),
          lng: Number(stop?.lng),
        }))
        .filter((stop) => stop.id != null)
    : [];
}

export function findNearestStop(lat, lng, shift = {}) {
  const requestLat = Number(lat);
  const requestLng = Number(lng);
  if (!Number.isFinite(requestLat) || !Number.isFinite(requestLng)) return null;

  const stops = collectShiftStops(shift);
  if (!stops.length) return null;

  let nearest = null;
  for (const stop of stops) {
    const distanceM = haversineM(requestLat, requestLng, stop.lat, stop.lng);
    if (!nearest || distanceM < nearest.distanceM) {
      nearest = { ...stop, distanceM };
    }
  }
  return nearest;
}

export function evaluateBoardingChangeDecision({
  kind,
  lat,
  lng,
  shift,
  now = new Date(),
} = {}) {
  const normalizedKind = normalizeBoardingChangeKind(kind);
  const requestAt = now instanceof Date ? now : new Date(now || Date.now());
  const nearestStop = findNearestStop(lat, lng, shift);
  const minutesToStart = shift?.startAt
    ? (new Date(shift.startAt).getTime() - requestAt.getTime()) / 60000
    : null;
  const cutoffReached = Number.isFinite(minutesToStart)
    ? minutesToStart < LATE_TO_STOP_CUTOFF_MIN
    : false;
  const nearKnownStop = Boolean(nearestStop && nearestStop.distanceM <= AUTO_ACCEPT_DISTANCE_M);

  let decisionState = "MANUAL_REVIEW";
  let autoAccepted = false;
  let decisionReason = "Manuel inceleme gerekli.";

  if (normalizedKind === "NO_SHOW") {
    decisionState = "NO_SHOW";
    decisionReason = "No-show bildirimi ayrı akıştan yönetilir.";
  } else if (normalizedKind === "OPERATION_NOTE") {
    decisionState = "MANUAL_REVIEW";
    decisionReason = "Operasyon notu kayıt altına alındı.";
  } else if (normalizedKind === "LATE_TO_STOP" && cutoffReached) {
    decisionState = "CUTOFF_REVIEW";
    decisionReason = "Geç bildirim için cutoff süresi aşıldı.";
  } else if (nearKnownStop && ["DIFFERENT_STOP", "LATE_TO_STOP", "PICKUP_FROM_LOCATION"].includes(normalizedKind)) {
    decisionState = "AUTO_ACCEPTED";
    autoAccepted = true;
    decisionReason = "Kayıtlı durak yakınlığı nedeniyle otomatik onaylandı.";
  }

  return {
    kind: normalizedKind,
    requestAt: requestAt.toISOString(),
    nearestStop,
    minutesToStart,
    cutoffReached,
    autoAccepted,
    decisionState,
    decisionReason,
    lowRisk: nearKnownStop,
  };
}

function buildAudienceNotifications({
  shift,
  requesterUserId,
  decisionState,
}) {
  return [
    { scope: "ROOM", roomId: shift?.roomId ?? null, type: "BOARDING_CHANGE_REQUEST", dedupeKey: `boarding-change:${shift?.id || "x"}:room` },
    { scope: "COMPANY", companyId: shift?.companyId ?? null, type: "BOARDING_CHANGE_REQUEST", dedupeKey: `boarding-change:${shift?.id || "x"}:company` },
    { scope: "DRIVER", driverId: shift?.driverId ?? null, type: decisionState === "AUTO_ACCEPTED" ? "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED" : "BOARDING_CHANGE_REQUEST", dedupeKey: `boarding-change:${shift?.id || "x"}:driver` },
    { scope: "USER", userId: requesterUserId ?? null, type: "BOARDING_CHANGE_REQUEST", dedupeKey: `boarding-change:${shift?.id || "x"}:user:${requesterUserId || "x"}` },
  ].filter((item) => Boolean(item.scope) && (item.companyId || item.roomId || item.driverId || item.userId));
}

export async function emitBoardingChangeNotifications({
  io,
  shift,
  personel: _personel,
  requesterUserId,
  requesterRole,
  requestKind,
  requestReason,
  decisionState,
  nearestStop,
}) {
  const payload = {
    v: 1,
    title: "Biniş değişikliği",
    message:
      formatBoardingChangeDecisionText({
        requestKind,
        requesterRole,
        decisionState,
      }),
    kind: `BOARDING_CHANGE_REQUEST_${String(decisionState || "MANUAL_REVIEW").trim().toUpperCase()}`,
    requestKind,
    requestReason,
    nearestStopName: nearestStop?.name || "kayıtlı durak",
    decisionState,
  };

  const targets = buildAudienceNotifications({
    shift,
    requesterUserId,
    decisionState,
  });

  const emitted = [];
  for (const target of targets) {
    try {
      const created = await createAndEmitNotification({
        io,
        type: target.type,
        scope: target.scope,
        payload,
        companyId: target.companyId ?? null,
        roomId: target.roomId ?? null,
        driverId: target.driverId ?? null,
        userId: target.userId ?? null,
        shiftId: shift?.id ?? null,
        dedupeKey: target.dedupeKey,
      });
      emitted.push(created);
    } catch {
      // notification failure should never block request creation
    }
  }

  return emitted;
}
