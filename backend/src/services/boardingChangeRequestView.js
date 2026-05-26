import { previewBoardingChangeRouteImpact } from "./boardingRouteImpactPreview.js";
import { buildBoardingChangeRouteRefreshState } from "./boardingChangeRouteRefresh.js";
import { formatBoardingChangeDecisionText, buildBoardingChangeRequestReason } from "../routes/boardingChangeRequestOps.js";

export const BOARDING_CHANGE_DECISION_ACTIONS = [
  "BOARDING_CHANGE_REQUEST_CREATE",
  "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED",
  "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT",
  "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL",
];

export const BOARDING_CHANGE_APPLY_ACTION = "BOARDING_CHANGE_APPLIED";

function normalizeDecisionOwnerRole(value) {
  const role = String(value || "").trim().toUpperCase();
  if (role === "DRIVER" || role === "COMPANY" || role === "ROOM") return role;
  return "";
}

function decisionOwnerLabelForRole(role) {
  const normalized = normalizeDecisionOwnerRole(role);
  if (normalized === "DRIVER") return "Sürücü";
  return "Hizmet alan taraf";
}

function decisionOwnerNoteForRole(role, { requestKind = "", requestStatus = "", routeOwnerHint = "" } = {}) {
  const normalized = normalizeDecisionOwnerRole(role);
  const kind = String(requestKind || "").toUpperCase();
  if (requestStatus === "ACCEPTED") return "Talep işlendi.";
  if (requestStatus === "CANCELLED") return "Talep kapandı.";
  if (normalized === "DRIVER") {
    return kind === "ALTERNATE_STOP_TODAY"
      ? "Aynı rota üzerindeki durak değişikliği sürücü tarafında karar bekliyor."
      : "Bu talep sürücü tarafında karar bekliyor.";
  }
  if (routeOwnerHint) return routeOwnerHint;
  return kind === "ALTERNATE_STOP_TODAY"
    ? "Rota değişikliği içerdiği için hizmet alan taraf karar veriyor."
    : "Hizmet alan taraf karar veriyor.";
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function resolvePersonLabelFromItem(item = {}) {
  return firstText(
    item?.personLabel,
    item?.personel?.personLabel,
    item?.personel?.fullName,
    item?.personel?.name,
    item?.personel?.label,
    item?.personnel?.personLabel,
    item?.personnel?.fullName,
    item?.personnel?.name,
    item?.personnel?.label,
    item?.person?.personLabel,
    item?.person?.fullName,
    item?.person?.name,
    item?.person?.label,
    item?.student?.personLabel,
    item?.student?.fullName,
    item?.student?.name,
    item?.student?.label,
    item?.employee?.personLabel,
    item?.employee?.fullName,
    item?.employee?.name,
    item?.employee?.label,
    item?.passengerName,
    item?.riderName,
    item?.fullName,
    item?.name,
    item?.label,
    `#${item?.personelId || item?.personId || item?.studentId || item?.employeeId || "-"}`,
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasUsefulCoords(lat, lng) {
  const a = toNumber(lat);
  const b = toNumber(lng);
  return a != null && b != null && !(a === 0 && b === 0);
}

export async function loadBoardingChangeRequestAuditMap(prisma, ids = []) {
  const requestIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((value) => Number(value || 0)).filter((value) => Number.isFinite(value) && value > 0)));
  if (!requestIds.length) return new Map();

  const audits = await prisma.auditLog.findMany({
    where: {
      entity: "PickupRequest",
      entityId: { in: requestIds },
      action: { in: [...BOARDING_CHANGE_DECISION_ACTIONS, BOARDING_CHANGE_APPLY_ACTION] },
    },
    orderBy: { createdAt: "desc" },
  });

  const auditMap = new Map();
  for (const row of audits) {
    const key = Number(row?.entityId || 0);
    if (!key) continue;
    const current = auditMap.get(key) || { decisionAudit: null, applyAudit: null };
    const action = String(row?.action || "");
    if (!current.decisionAudit && BOARDING_CHANGE_DECISION_ACTIONS.includes(action)) {
      current.decisionAudit = row;
    }
    if (!current.applyAudit && action === BOARDING_CHANGE_APPLY_ACTION) {
      current.applyAudit = row;
    }
    auditMap.set(key, current);
  }

  return auditMap;
}

export function buildBoardingChangeRequestView(item, bucket = {}) {
  const requestStatus = String(item?.status || "").toUpperCase();
  const meta = bucket.decisionAudit?.meta || bucket.applyAudit?.meta || {};
  const applyMeta = bucket.applyAudit?.meta || {};
  const requestKind = meta.requestKind || item?.requestKind || item?.kind || "DIFFERENT_STOP";
  const requestReason = firstText(meta.requestReason, item?.requestReason, buildBoardingChangeRequestReason(requestKind, meta.actorRole || item?.requesterRole || "PERSONEL"));
  const requestNote = firstText(meta.requestNote, item?.requestNote);
  const requestDate = firstText(meta.requestDate, item?.requestDate);
  const personLabel = resolvePersonLabelFromItem(item);
  const locationProvided = meta.locationProvided !== false;
  const resolvedLat = toNumber(meta.requestedLat ?? item?.lat);
  const resolvedLng = toNumber(meta.requestedLng ?? item?.lng);
  const requestedHasCoords = meta.hasRequestedCoords === false ? false : hasUsefulCoords(resolvedLat, resolvedLng);
  const requestedLat = requestedHasCoords ? resolvedLat : null;
  const requestedLng = requestedHasCoords ? resolvedLng : null;
  const requestedAddressText = firstText(meta.requestedAddressText, meta.requestedAddress, item?.requestedAddressText);
  const requestedLocationMode = firstText(meta.requestedLocationMode, item?.requestedLocationMode);
  const boardingChange = {
    changeType: requestKind,
    requestKind,
    personelId: item?.personelId,
    personLabel,
    requestReason,
    requestNote,
    requestDate,
    locationProvided,
    requestedLat,
    requestedLng,
    requestedAddressText,
    requestedLocationMode,
    hasRequestedCoords: requestedHasCoords,
    lat: requestedHasCoords ? requestedLat : null,
    lng: requestedHasCoords ? requestedLng : null,
    targetStop: meta.targetStop || null,
    targetStopId: meta.targetStopId ?? null,
    targetStopName: meta.targetStopName ?? null,
    targetStopLat: meta.targetStopLat ?? null,
    targetStopLng: meta.targetStopLng ?? null,
    oldStop: meta.oldStop || null,
    currentStop: meta.currentStop || null,
    newStop: meta.newStop || null,
  };
  const routeImpactPreview = previewBoardingChangeRouteImpact({
    shift: item?.shift || null,
    currentStops: item?.shift?.stops || [],
    passengersOrPeople: item?.shift?.people || [],
    boardingChange,
    routeMetrics: meta.routeMetrics || null,
    etaContext: meta.etaContext || null,
  });
  const decisionOwnerRole = normalizeDecisionOwnerRole(meta.decisionOwnerRole || routeImpactPreview?.decisionOwnerRole || (requestStatus === "OPEN" ? "COMPANY" : ""));
  const decisionOwnerLabel = meta.decisionOwnerLabel || routeImpactPreview?.decisionOwnerLabel || decisionOwnerLabelForRole(decisionOwnerRole);
  const decisionOwnerNote = meta.decisionOwnerNote || routeImpactPreview?.decisionOwnerNote || decisionOwnerNoteForRole(decisionOwnerRole, {
    requestKind,
    requestStatus,
    routeOwnerHint: routeImpactPreview?.decisionOwnerNote || "",
  });
  const decisionState = meta.decisionState || (requestStatus === "ACCEPTED" ? "AUTO_ACCEPTED" : requestStatus === "CANCELLED" ? "CANCELLED" : "MANUAL_REVIEW");
  const decisionText = meta.decisionText || formatBoardingChangeDecisionText({
    requestKind,
    requesterRole: meta.actorRole || item?.requesterRole || "PERSONEL",
    decisionState,
  });
  const applicationState = String(applyMeta.applicationState || (bucket.applyAudit ? "APPLIED" : (requestStatus === "ACCEPTED" ? "READY" : "BLOCKED"))).toUpperCase();
  const applicationText = applyMeta.applicationText || (applicationState === "APPLIED"
    ? "Değişiklik günlük atamaya işlendi."
    : applicationState === "READY"
      ? "Kabul edilen değişiklik günlük atamaya işlenebilir."
      : "Beklemede.");
  const routeRefresh = buildBoardingChangeRouteRefreshState({
    applicationState,
    changeType: routeImpactPreview?.changeType || meta.changeType || requestKind,
    effectiveDate: applyMeta.routeRefreshEffectiveDate || applyMeta.effectiveDate || null,
    appliedAt: bucket.applyAudit?.createdAt || null,
  });

  return {
    ...item,
    requestKind,
    requestReason,
    requestNote,
    requestDate,
    requestedLat,
    requestedLng,
    requestedAddressText,
    requestedLocationMode,
    decisionState,
    decisionText,
    decisionOwnerRole,
    decisionOwnerLabel,
    decisionOwnerNote,
    routeImpactPreview,
    preview: routeImpactPreview,
    summaryLine: routeImpactPreview?.summaryLine || "",
    oldStopLabel: routeImpactPreview?.oldStopLabel || "",
    newStopLabel: routeImpactPreview?.newStopLabel || "",
    boardingChangeApplicationStatus: applicationState,
    boardingChangeApplicationText: applicationText,
    boardingChangeAppliedAt: bucket.applyAudit?.createdAt || null,
    boardingChangeApplicationBoundaryNote: applyMeta.applicationBoundaryNote || (applicationState === "APPLIED"
      ? "Değişiklik günlük atamaya işlendi. Sürücü rotası henüz yenilenmedi."
      : applicationState === "READY"
        ? "Bu değişiklik kabul edilmiş ve günlük atamaya işlenebilir. Bu işlem sürücü rotasını yenilemez."
        : "Önce değişiklik kabul edilmeli."),
    boardingChangeRouteRefreshState: applyMeta.routeRefreshState || routeRefresh.routeRefreshState,
    boardingChangeRouteRefreshLabel: applyMeta.routeRefreshLabel || routeRefresh.routeRefreshLabel,
    boardingChangeRouteRefreshNote: applyMeta.routeRefreshNote || routeRefresh.routeRefreshNote,
    boardingChangeRouteRefreshRequested: applyMeta.routeRefreshRequested ?? routeRefresh.routeRefreshRequested,
    boardingChangeRouteRefreshCompleted: applyMeta.routeRefreshCompleted ?? routeRefresh.routeRefreshCompleted,
    boardingChangeRouteRefreshRequired: applyMeta.routeRefreshRequired ?? routeRefresh.routeRefreshRequired,
    boardingChangeRouteRefreshUpdatedAt: applyMeta.routeRefreshUpdatedAt || routeRefresh.routeRefreshUpdatedAt,
    boardingChangeRouteRefreshEffectiveDate: applyMeta.routeRefreshEffectiveDate || routeRefresh.routeRefreshEffectiveDate,
    targetStopId: meta.targetStopId ?? null,
    targetStopName: meta.targetStopName ?? null,
    targetStopLat: meta.targetStopLat ?? null,
    targetStopLng: meta.targetStopLng ?? null,
    locationProvided,
    locationSummary: requestedLocationMode
      ? firstText(
          requestedAddressText && requestedLocationMode === "ADDRESS" ? `Adres: ${requestedAddressText}` : "",
          requestedLocationMode === "CURRENT" && requestedLat != null && requestedLng != null ? `Konum: ${requestedLat.toFixed(5)}, ${requestedLng.toFixed(5)}` : "",
          requestedLocationMode === "MAP" && requestedLat != null && requestedLng != null ? `Harita: ${requestedLat.toFixed(5)}, ${requestedLng.toFixed(5)}` : "",
          requestedAddressText ? `Adres: ${requestedAddressText}` : "",
          requestedLat != null && requestedLng != null ? `Konum: ${requestedLat.toFixed(5)}, ${requestedLng.toFixed(5)}` : "",
        )
      : firstText(
          requestedAddressText ? `Adres: ${requestedAddressText}` : "",
          requestedLat != null && requestedLng != null ? `Konum: ${requestedLat.toFixed(5)}, ${requestedLng.toFixed(5)}` : "",
          locationProvided ? "Konum bilgisi metin olarak iletildi." : "Konum paylaşılmadı; talep açıklama üzerinden iletilecek.",
        ),
  };
}
