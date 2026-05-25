import { prisma } from "../prisma.js";

const EFFECT_LABELS = {
  NO_SERVICE_TODAY: "Bugün binmeyecek",
  ALTERNATE_STOP_TODAY: "Bugün farklı durak",
  TEMPORARY_BOARDING_NOTE: "Operasyon notu",
};

const ROUTE_REFRESH_LABELS = {
  APPLIED: {
    NO_SERVICE_TODAY: "Günlük değişiklik rotada görünüyor",
    ALTERNATE_STOP_TODAY: "Günlük değişiklik rotada görünüyor",
    TEMPORARY_BOARDING_NOTE: "Operasyon notu görünür",
    DEFAULT: "Günlük değişiklik rotada görünüyor",
  },
  READY: {
    DEFAULT: "Rota güncellemesi bekliyor",
  },
  NOTE_ONLY: {
    DEFAULT: "Operasyon notu görünür",
  },
  NONE: {
    DEFAULT: "Rota güncellemesi yok",
  },
};

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function compactText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeRouteRefreshState(value) {
  const state = String(value || "").trim().toUpperCase();
  if (["APPLIED", "VISIBLE", "UPDATED"].includes(state)) return "APPLIED";
  if (["READY", "PENDING", "WAITING"].includes(state)) return "READY";
  if (["NOTE_ONLY", "NOTE"].includes(state)) return "NOTE_ONLY";
  return "NONE";
}

function normalizeChangeType(value) {
  const kind = String(value || "").trim().toUpperCase();
  if (["NO_SERVICE_TODAY", "ALTERNATE_STOP_TODAY", "TEMPORARY_BOARDING_NOTE"].includes(kind)) return kind;
  return "TEMPORARY_BOARDING_NOTE";
}

export function getBoardingChangeEffectLabel(changeType) {
  return EFFECT_LABELS[normalizeChangeType(changeType)] || EFFECT_LABELS.TEMPORARY_BOARDING_NOTE;
}

export function buildBoardingChangeRouteRefreshState({
  applicationState = "",
  changeType = "",
  effectiveDate = null,
  appliedAt = null,
} = {}) {
  const state = normalizeRouteRefreshState(applicationState);
  const normalizedChangeType = normalizeChangeType(changeType);

  if (state === "READY") {
    return {
      routeRefreshState: "READY",
      routeRefreshLabel: ROUTE_REFRESH_LABELS.READY.DEFAULT,
      routeRefreshNote: "Kabul edilen değişiklik uygulandığında sürücü rota ekranında görünür.",
      routeRefreshRequested: false,
      routeRefreshCompleted: false,
      routeRefreshRequired: true,
      routeRefreshUpdatedAt: appliedAt || null,
      routeRefreshEffectiveDate: effectiveDate || null,
    };
  }

  if (state === "NOTE_ONLY" || normalizedChangeType === "TEMPORARY_BOARDING_NOTE") {
    return {
      routeRefreshState: "NOTE_ONLY",
      routeRefreshLabel: ROUTE_REFRESH_LABELS.NOTE_ONLY.DEFAULT,
      routeRefreshNote: "Bu kayıt not olarak görünür; StopAssignment yazımı yok.",
      routeRefreshRequested: true,
      routeRefreshCompleted: true,
      routeRefreshRequired: false,
      routeRefreshUpdatedAt: appliedAt || null,
      routeRefreshEffectiveDate: effectiveDate || null,
    };
  }

  if (state === "APPLIED") {
    return {
      routeRefreshState: "VISIBLE",
      routeRefreshLabel: ROUTE_REFRESH_LABELS.APPLIED[normalizedChangeType] || ROUTE_REFRESH_LABELS.APPLIED.DEFAULT,
      routeRefreshNote: "Sürücü rota ekranında görünür; SMS/push yok; kalıcı rota değişmez.",
      routeRefreshRequested: true,
      routeRefreshCompleted: true,
      routeRefreshRequired: true,
      routeRefreshUpdatedAt: appliedAt || null,
      routeRefreshEffectiveDate: effectiveDate || null,
    };
  }

  return {
    routeRefreshState: "NONE",
    routeRefreshLabel: ROUTE_REFRESH_LABELS.NONE.DEFAULT,
    routeRefreshNote: "Bu vardiyada uygulanan günlük değişiklik yok.",
    routeRefreshRequested: false,
    routeRefreshCompleted: false,
    routeRefreshRequired: false,
    routeRefreshUpdatedAt: appliedAt || null,
    routeRefreshEffectiveDate: effectiveDate || null,
  };
}

function buildAppliedEffect({ request, applyAudit, requestMeta = {}, changeType = "" }) {
  if (!request || !applyAudit) return null;
  const meta = applyAudit?.meta || {};
  const normalizedChangeType = normalizeChangeType(
    meta?.routeImpactPreview?.changeType
    || meta?.changeType
    || changeType
    || requestMeta?.changeType
    || requestMeta?.requestKind
    || request?.requestKind
    || request?.kind
  );
  const routeRefresh = buildBoardingChangeRouteRefreshState({
    applicationState: meta.applicationState || "APPLIED",
    changeType: normalizedChangeType,
    effectiveDate: meta.effectiveDate || null,
    appliedAt: applyAudit.createdAt || null,
  });

  const personLabel = compactText(
    request?.personel?.fullName
    || request?.personel?.name
    || request?.personel?.label
    || `#${request?.personelId || "-"}`
  );
  const oldStopLabel = compactText(meta?.oldStop?.label || meta?.oldStop?.name || "");
  const newStopLabel = compactText(meta?.newStop?.label || meta?.newStop?.name || "");
  const stopAssignmentEffect = meta?.stopAssignmentEffect || null;

  return {
    requestId: toInt(request.id),
    shiftId: toInt(request.shiftId),
    personelId: toInt(request.personelId),
    personLabel,
    changeType: normalizedChangeType,
    effectLabel: getBoardingChangeEffectLabel(normalizedChangeType),
    oldStopLabel,
    newStopLabel,
    stopAssignmentEffect,
    applied: true,
    driverVisible: true,
    effectiveDate: meta.effectiveDate || null,
    appliedAt: applyAudit.createdAt || null,
    warnings: Array.isArray(meta.warnings) ? meta.warnings : [],
    applicationText: meta.applicationText || "",
    applicationBoundaryNote: meta.applicationBoundaryNote || "",
    nextBestAction: meta.nextBestAction || "",
    routeRefreshState: routeRefresh.routeRefreshState,
    routeRefreshLabel: routeRefresh.routeRefreshLabel,
    routeRefreshNote: routeRefresh.routeRefreshNote,
    routeRefreshRequested: routeRefresh.routeRefreshRequested,
    routeRefreshCompleted: routeRefresh.routeRefreshCompleted,
    routeRefreshRequired: routeRefresh.routeRefreshRequired,
    routeRefreshUpdatedAt: routeRefresh.routeRefreshUpdatedAt,
    routeRefreshEffectiveDate: routeRefresh.routeRefreshEffectiveDate,
    routeRefresh,
  };
}

export async function loadDriverBoardingChangeRouteEffects({
  shiftIds = [],
} = {}) {
  const ids = Array.from(new Set((Array.isArray(shiftIds) ? shiftIds : []).map((value) => toInt(value)).filter((value) => value > 0)));
  if (!ids.length) return {};

  const requests = await prisma.pickupRequest.findMany({
    where: {
      shiftId: { in: ids },
      status: "ACCEPTED",
    },
    include: {
      personel: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!requests.length) return {};

  const requestIds = requests.map((request) => toInt(request.id)).filter((value) => value > 0);
  const audits = requestIds.length
    ? await prisma.auditLog.findMany({
        where: {
          entity: "PickupRequest",
          entityId: { in: requestIds },
          action: "BOARDING_CHANGE_APPLIED",
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const auditMap = new Map();
  for (const audit of audits) {
    const key = toInt(audit?.entityId);
    if (!key || auditMap.has(key)) continue;
    auditMap.set(key, audit);
  }

  const byShiftId = {};
  for (const request of requests) {
    const applyAudit = auditMap.get(toInt(request.id)) || null;
    if (!applyAudit) continue;
    const requestMeta = applyAudit?.meta || {};
    const effect = buildAppliedEffect({
      request,
      applyAudit,
      requestMeta,
      changeType: requestMeta?.routeImpactPreview?.changeType || requestMeta?.changeType || requestMeta?.requestKind || request?.requestKind || request?.kind,
    });
    if (!effect) continue;

    const shiftKey = String(toInt(request.shiftId));
    const current = byShiftId[shiftKey] || {
      shiftId: toInt(request.shiftId),
      boardingChangeEffects: [],
      warnings: [],
      boardingChangeSummary: {
        count: 0,
        label: "Günlük değişiklik yok",
        note: "Bu vardiyada uygulanan günlük değişiklik yok.",
      },
      routeRefresh: {
        routeRefreshState: "NONE",
        routeRefreshLabel: ROUTE_REFRESH_LABELS.NONE.DEFAULT,
        routeRefreshNote: "Bu vardiyada uygulanan günlük değişiklik yok.",
        routeRefreshRequested: false,
        routeRefreshCompleted: false,
        routeRefreshRequired: false,
        routeRefreshUpdatedAt: null,
        routeRefreshEffectiveDate: null,
      },
      routeNotice: "Bu vardiyada uygulanan günlük değişiklik yok.",
    };

    current.boardingChangeEffects.push(effect);
    current.warnings.push(...effect.warnings);
    byShiftId[shiftKey] = current;
  }

  for (const item of Object.values(byShiftId)) {
    item.boardingChangeEffects.sort((a, b) => {
      const left = new Date(a?.appliedAt || 0).getTime();
      const right = new Date(b?.appliedAt || 0).getTime();
      return right - left;
    });
    const count = item.boardingChangeEffects.length;
    const hasOnlyNotes = count > 0 && item.boardingChangeEffects.every((effect) => effect.changeType === "TEMPORARY_BOARDING_NOTE");
    const latest = item.boardingChangeEffects[0] || null;
    const routeRefresh = count > 0
      ? buildBoardingChangeRouteRefreshState({
          applicationState: hasOnlyNotes ? "NOTE_ONLY" : "APPLIED",
          changeType: latest?.changeType || "TEMPORARY_BOARDING_NOTE",
          appliedAt: latest?.appliedAt || null,
          effectiveDate: latest?.effectiveDate || null,
        })
      : item.routeRefresh;

    item.boardingChangeSummary = {
      count,
      label: count === 0
        ? "Günlük değişiklik yok"
        : count === 1
          ? item.boardingChangeEffects[0].effectLabel
          : `${count} günlük değişiklik`,
      note: routeRefresh.routeRefreshNote,
      latestAppliedAt: latest?.appliedAt || null,
      latestEffectiveDate: latest?.effectiveDate || null,
    };
    item.routeRefresh = routeRefresh;
    item.routeNotice = routeRefresh.routeRefreshNote;
    item.boardingChangeEffects = item.boardingChangeEffects.map((effect) => ({
      ...effect,
      routeRefresh,
      routeNotice: routeRefresh.routeRefreshNote,
      routeRefreshLabel: effect.routeRefreshLabel || routeRefresh.routeRefreshLabel,
      routeRefreshNote: effect.routeRefreshNote || routeRefresh.routeRefreshNote,
    }));
    item.warnings = Array.from(new Set(item.warnings.filter(Boolean).map((value) => compactText(value)))).filter(Boolean);
  }

  return byShiftId;
}
