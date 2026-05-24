import { prisma } from "../prisma.js";
import { findNearestStop, formatBoardingChangeDecisionText } from "../routes/boardingChangeRequestOps.js";
import { haversineM } from "../routes/shifts/helpers.js";
import { previewBoardingChangeRouteImpact } from "./boardingRouteImpactPreview.js";

const BOARDING_SHIFT_INCLUDE = {
  include: {
    vehicle: {
      select: {
        id: true,
        plate: true,
        capacity: true,
      },
    },
    driver: {
      select: {
        id: true,
        fullName: true,
        name: true,
      },
    },
    stops: {
      select: {
        id: true,
        name: true,
        label: true,
        stopName: true,
        title: true,
        code: true,
        stationName: true,
        address: true,
        lat: true,
        lng: true,
        order: true,
        sortOrder: true,
        sequence: true,
        index: true,
      },
    },
    people: {
      select: {
        id: true,
        personelId: true,
        note: true,
      },
    },
    assignments: {
      select: {
        id: true,
        personelId: true,
        stopId: true,
        walkM: true,
        stop: {
          select: {
            id: true,
            name: true,
            label: true,
            stopName: true,
            title: true,
            code: true,
            stationName: true,
            address: true,
            lat: true,
            lng: true,
            order: true,
            sortOrder: true,
            sequence: true,
            index: true,
          },
        },
      },
    },
  },
};

const REQUEST_AUDIT_ACTIONS = [
  "BOARDING_CHANGE_REQUEST_CREATE",
  "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED",
  "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT",
  "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL",
];

const APPLY_ACTION = "BOARDING_CHANGE_APPLIED";

function createHttpError(status, code, message) {
  const err = new Error(message || code || "Error");
  err.status = status;
  err.code = code || null;
  return err;
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function compactText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function stopInfo(stop = null) {
  if (!stop || typeof stop !== "object") return null;
  const label = compactText(stop.name || stop.label || stop.stopName || stop.title || stop.code || stop.stationName || stop.address);
  return {
    id: toInt(stop.id) || null,
    label: label || (toInt(stop.id) > 0 ? `Durak #${toInt(stop.id)}` : null),
    name: compactText(stop.name || stop.label || stop.stopName || stop.title || ""),
    order: Number.isFinite(Number(stop.order)) ? Number(stop.order) : null,
    lat: Number.isFinite(Number(stop.lat)) ? Number(stop.lat) : null,
    lng: Number.isFinite(Number(stop.lng)) ? Number(stop.lng) : null,
  };
}

function personLabel(personel = null, personelId = null) {
  return compactText(personel?.fullName || personel?.name || personel?.label || `#${personelId || "-"}`);
}

function stopDistanceM(a = null, b = null) {
  const latA = Number(a?.lat);
  const lngA = Number(a?.lng);
  const latB = Number(b?.lat);
  const lngB = Number(b?.lng);
  if (![latA, lngA, latB, lngB].every((value) => Number.isFinite(value))) return null;
  return Math.round(haversineM(latA, lngA, latB, lngB));
}

function findStopById(stops = [], stopId = null) {
  const id = toInt(stopId);
  if (!id) return null;
  return (Array.isArray(stops) ? stops : []).find((stop) => toInt(stop?.id) === id) || null;
}

function buildApplicationBoundaryNote({ applicationState, changeType }) {
  if (applicationState === "APPLIED") {
    return "Değişiklik günlük atamaya işlendi. Sürücü rotası henüz yenilenmedi.";
  }
  if (changeType === "TEMPORARY_BOARDING_NOTE") {
    return "Bu değişiklik not olarak tutulur; rota ve sürücü refresh tetiklenmez.";
  }
  return "Bu değişiklik kabul edilmiş ve günlük atamaya işlenebilir. Bu işlem sürücü rotasını yenilemez.";
}

function buildNextBestAction({ applicationState, changeType }) {
  if (applicationState === "APPLIED") {
    return "Sürücü rotası yenilenmedi. 01C'deki route refresh adımına gerek varsa oraya geç.";
  }
  if (changeType === "TEMPORARY_BOARDING_NOTE") {
    return "Notu doğrula; rota veya atama üzerinde yazma yok.";
  }
  return "Kabul edilen değişikliği uygula; sürücü route refresh BOARDING-OPS-01C kapsamındadır.";
}

async function resolveRequestAudit(tx, requestId) {
  const audits = await tx.auditLog.findMany({
    where: {
      entity: "PickupRequest",
      entityId: requestId,
      action: { in: [...REQUEST_AUDIT_ACTIONS, APPLY_ACTION] },
    },
    orderBy: { createdAt: "desc" },
  });

  const decisionAudit = audits.find((row) => REQUEST_AUDIT_ACTIONS.includes(String(row?.action || ""))) || null;
  const applyAudit = audits.find((row) => String(row?.action || "") === APPLY_ACTION) || null;
  return { decisionAudit, applyAudit };
}

function resolveTargetStop({ request, shift, requestMeta, requestNearestStop }) {
  const requestedStopId = toInt(requestMeta?.nearestStopId ?? requestMeta?.newStopId ?? requestMeta?.targetStopId);
  if (requestedStopId) {
    const byId = findStopById(shift?.stops || [], requestedStopId);
    if (byId) return byId;
  }

  if (requestNearestStop) return requestNearestStop;

  if (Number.isFinite(Number(request?.lat)) && Number.isFinite(Number(request?.lng))) {
    const nearest = findNearestStop(Number(request.lat), Number(request.lng), shift || {});
    if (nearest?.id) {
      return findStopById(shift?.stops || [], nearest.id) || nearest;
    }
  }

  return null;
}

function resolveWalkM({ request, targetStop, requestMeta, requestNearestStop }) {
  const metaDistance = Number(requestMeta?.distanceM);
  if (Number.isFinite(metaDistance) && metaDistance >= 0) return Math.round(metaDistance);
  if (requestNearestStop?.distanceM != null) return Math.max(0, Math.round(Number(requestNearestStop.distanceM)));
  if (targetStop && Number.isFinite(Number(request?.lat)) && Number.isFinite(Number(request?.lng))) {
    const d = stopDistanceM({ lat: Number(request.lat), lng: Number(request.lng) }, targetStop);
    if (Number.isFinite(d)) return Math.max(0, d);
  }
  return 0;
}

export async function applyAcceptedBoardingChange({
  requestId,
  actor = null,
  role = "",
  scope = {},
  now = new Date(),
} = {}) {
  const id = toInt(requestId);
  if (!id) throw createHttpError(400, "BAD_REQUEST_ID", "requestId gerekli.");

  const actorRole = String(role || actor?.role || "").toUpperCase();
  const requestNow = now instanceof Date ? now : new Date(now || Date.now());
  const effectiveDate = requestNow.toISOString().slice(0, 10);

  return prisma.$transaction(async (tx) => {
    const request = await tx.pickupRequest.findUnique({
      where: { id },
      include: {
        personel: {
          select: {
            id: true,
            fullName: true,
            name: true,
            label: true,
            userId: true,
          },
        },
        shift: BOARDING_SHIFT_INCLUDE,
      },
    });

    if (!request) throw createHttpError(404, "REQUEST_NOT_FOUND", "Request not found");

    const requestStatus = String(request.status || "").toUpperCase();
    if (requestStatus !== "ACCEPTED") {
      throw createHttpError(409, "REQUEST_NOT_ACCEPTED", "Sadece kabul edilen değişiklik uygulanabilir.");
    }

    const shiftStatus = String(request.shift?.status || "").toUpperCase();
    if (!["APPROVED", "ACTIVE"].includes(shiftStatus)) {
      throw createHttpError(409, "SHIFT_NOT_APPLICABLE", `Shift not applicable (status=${shiftStatus || "-"})`);
    }

    if (actorRole === "ROOM") {
      const roomId = toInt(scope?.roomId || actor?.roomId);
      if (!roomId || roomId !== toInt(request.shift?.roomId)) {
        throw createHttpError(403, "FORBIDDEN", "Forbidden");
      }
    }

    if (actorRole === "COMPANY") {
      const companyId = toInt(scope?.companyId || actor?.companyId);
      if (!companyId || companyId !== toInt(request.shift?.companyId)) {
        throw createHttpError(403, "FORBIDDEN", "Forbidden");
      }
    }

    if (!["ROOM", "COMPANY", "SUPER_ADMIN"].includes(actorRole)) {
      throw createHttpError(403, "FORBIDDEN", "Forbidden");
    }

    const { decisionAudit, applyAudit } = await resolveRequestAudit(tx, id);
    const requestMeta = decisionAudit?.meta || applyAudit?.meta || {};
    const requestKind = String(requestMeta?.requestKind || requestMeta?.kind || requestMeta?.changeType || "DIFFERENT_STOP").trim() || "DIFFERENT_STOP";
    const requestReason = compactText(requestMeta?.requestReason || requestMeta?.reason || "");
    const decisionState = String(requestMeta?.decisionState || (requestStatus === "ACCEPTED" ? "ROOM_ACCEPTED" : "MANUAL_REVIEW")).toUpperCase();
    const decisionText = compactText(
      requestMeta?.decisionText
      || formatBoardingChangeDecisionText({
        requestKind,
        requesterRole: requestMeta?.actorRole || request.personel?.kind || "PERSONEL",
        decisionState,
      }),
    );

    const requestNearestStop = requestMeta?.nearestStopId
      ? findStopById(request.shift?.stops || [], requestMeta.nearestStopId)
      : null;
    const targetStop = resolveTargetStop({
      request,
      shift: request.shift,
      requestMeta,
      requestNearestStop,
    });

    const preview = previewBoardingChangeRouteImpact({
      shift: request.shift,
      currentStops: request.shift?.stops || [],
      passengersOrPeople: request.shift?.people || [],
      boardingChange: {
        changeType: requestKind,
        requestKind,
        personelId: request.personelId,
        personLabel: personLabel(request.personel, request.personelId),
        requestReason,
        nearestStop: requestNearestStop ? stopInfo(requestNearestStop) : null,
        lat: request.lat,
        lng: request.lng,
        oldStop: null,
        newStop: targetStop ? stopInfo(targetStop) : null,
      },
    });

    const currentAssignment = await tx.stopAssignment.findFirst({
      where: {
        shiftId: request.shiftId,
        personelId: request.personelId,
      },
      include: {
        stop: {
          select: {
            id: true,
            name: true,
            label: true,
            stopName: true,
            title: true,
            code: true,
            stationName: true,
            address: true,
            lat: true,
            lng: true,
            order: true,
            sortOrder: true,
            sequence: true,
            index: true,
          },
        },
      },
    });

    const oldStop = currentAssignment?.stop ? stopInfo(currentAssignment.stop) : null;

    const applicationState = preview.changeType === "TEMPORARY_BOARDING_NOTE" ? "NOTE_ONLY" : "APPLIED";
    const applicationText = applicationState === "NOTE_ONLY"
      ? "Not kayıt altına alındı."
      : "Değişiklik günlük atamaya işlendi.";

    let stopAssignmentEffect = {
      action: "NOOP",
      assignmentId: currentAssignment?.id ?? null,
      stopId: currentAssignment?.stopId ?? null,
      walkM: currentAssignment?.walkM ?? null,
    };
    let applied = true;
    let idempotent = false;
    const warnings = Array.isArray(preview.warnings) ? [...preview.warnings] : [];

    if (applyAudit?.meta) {
      const appliedMeta = applyAudit.meta || {};
      const appliedEffect = appliedMeta.stopAssignmentEffect || stopAssignmentEffect;
      const appliedOldStop = appliedMeta.oldStop || oldStop;
      const appliedNewStop = appliedMeta.newStop || (targetStop ? stopInfo(targetStop) : (preview.newStopLabel ? { id: null, label: preview.newStopLabel } : null));
      return {
        ok: true,
        requestId: request.id,
        applied: true,
        idempotent: true,
        changeType: appliedMeta.requestKind || preview.changeType,
        stopAssignmentEffect: appliedEffect,
        affectedPerson: appliedMeta.affectedPerson || {
          id: request.personelId,
          label: personLabel(request.personel, request.personelId),
        },
        affectedShift: appliedMeta.affectedShift || {
          id: request.shiftId,
          status: request.shift?.status || null,
          roomId: request.shift?.roomId ?? null,
          companyId: request.shift?.companyId ?? null,
          driverId: request.shift?.driverId ?? null,
        },
        effectiveDate: appliedMeta.effectiveDate || effectiveDate,
        oldStop: appliedOldStop,
        newStop: appliedNewStop,
        auditEventId: applyAudit.id,
        warnings: Array.isArray(appliedMeta.warnings) ? appliedMeta.warnings : warnings,
        nextBestAction: appliedMeta.nextBestAction || buildNextBestAction({
          applicationState: appliedMeta.applicationState || applicationState,
          changeType: preview.changeType,
        }),
        applicationBoundaryNote: appliedMeta.applicationBoundaryNote || buildApplicationBoundaryNote({
          applicationState,
          changeType: preview.changeType,
        }),
        applicationState: appliedMeta.applicationState || applicationState,
        applicationText: appliedMeta.applicationText || applicationText,
        preview: appliedMeta.routeImpactPreview || preview,
        routeImpactPreview: appliedMeta.routeImpactPreview || preview,
      };
    }

    if (preview.changeType === "NO_SERVICE_TODAY") {
      if (currentAssignment?.id) {
        await tx.stopAssignment.delete({ where: { id: currentAssignment.id } });
        stopAssignmentEffect = {
          action: "DELETE_SINGLE",
          assignmentId: currentAssignment.id,
          stopId: currentAssignment.stopId,
          walkM: currentAssignment.walkM,
        };
      } else {
        idempotent = true;
        stopAssignmentEffect = {
          action: "NOOP",
          assignmentId: null,
          stopId: null,
          walkM: null,
        };
        warnings.push("Bu kişi için zaten günlük stop assignment bulunmuyor.");
      }
    } else if (preview.changeType === "ALTERNATE_STOP_TODAY") {
      if (!targetStop?.id) {
        throw createHttpError(422, "BOARDING_TARGET_STOP_NOT_FOUND", "Yeni durak bulunamadı.");
      }
      const walkM = resolveWalkM({
        request,
        targetStop,
        requestMeta,
        requestNearestStop,
      });
      if (currentAssignment?.id && toInt(currentAssignment.stopId) === toInt(targetStop.id) && toInt(currentAssignment.walkM) === toInt(walkM)) {
        idempotent = true;
        stopAssignmentEffect = {
          action: "NOOP",
          assignmentId: currentAssignment.id,
          stopId: currentAssignment.stopId,
          walkM: currentAssignment.walkM,
        };
      } else if (currentAssignment?.id) {
        const updated = await tx.stopAssignment.update({
          where: { id: currentAssignment.id },
          data: {
            stopId: targetStop.id,
            walkM,
          },
        });
        stopAssignmentEffect = {
          action: "UPDATE_SINGLE",
          assignmentId: updated.id,
          stopId: updated.stopId,
          walkM: updated.walkM,
        };
      } else {
        const created = await tx.stopAssignment.create({
          data: {
            shiftId: request.shiftId,
            stopId: targetStop.id,
            personelId: request.personelId,
            walkM,
          },
        });
        stopAssignmentEffect = {
          action: "CREATE_SINGLE",
          assignmentId: created.id,
          stopId: created.stopId,
          walkM: created.walkM,
        };
      }
    } else {
      idempotent = true;
      applied = true;
      stopAssignmentEffect = {
        action: "NOTE_ONLY",
        assignmentId: currentAssignment?.id ?? null,
        stopId: currentAssignment?.stopId ?? null,
        walkM: currentAssignment?.walkM ?? null,
      };
    }

    const auditEvent = await tx.auditLog.create({
      data: {
        actorUserId: actor?.id || null,
        actorRole: actorRole || null,
        action: APPLY_ACTION,
        entity: "PickupRequest",
        entityId: request.id,
        meta: {
          requestId: request.id,
          requestKind,
          requestReason,
          decisionState,
          decisionText,
          applicationState,
          applicationText,
          applicationBoundaryNote: buildApplicationBoundaryNote({
            applicationState,
            changeType: preview.changeType,
          }),
          nextBestAction: buildNextBestAction({
            applicationState,
            changeType: preview.changeType,
          }),
          effectiveDate,
          applied,
          idempotent,
          stopAssignmentEffect,
          affectedPerson: {
            id: request.personelId,
            label: personLabel(request.personel, request.personelId),
          },
          affectedShift: {
            id: request.shiftId,
            status: request.shift?.status || null,
            roomId: request.shift?.roomId ?? null,
            companyId: request.shift?.companyId ?? null,
            driverId: request.shift?.driverId ?? null,
          },
          oldStop,
          newStop: targetStop ? stopInfo(targetStop) : (preview.newStopLabel ? { id: null, label: preview.newStopLabel } : null),
          routeImpactPreview: preview,
          warnings,
        },
      },
    });

    return {
      ok: true,
      requestId: request.id,
      applied,
      idempotent,
      changeType: preview.changeType,
      stopAssignmentEffect,
      affectedPerson: {
        id: request.personelId,
        label: personLabel(request.personel, request.personelId),
      },
      affectedShift: {
        id: request.shiftId,
        status: request.shift?.status || null,
        roomId: request.shift?.roomId ?? null,
        companyId: request.shift?.companyId ?? null,
        driverId: request.shift?.driverId ?? null,
      },
      effectiveDate,
      oldStop,
      newStop: targetStop ? stopInfo(targetStop) : (preview.newStopLabel ? { id: null, label: preview.newStopLabel } : null),
      auditEventId: auditEvent.id,
      warnings,
      nextBestAction: buildNextBestAction({
        applicationState,
        changeType: preview.changeType,
      }),
      applicationBoundaryNote: buildApplicationBoundaryNote({
        applicationState,
        changeType: preview.changeType,
      }),
      applicationState,
      applicationText,
      preview,
      routeImpactPreview: preview,
    };
  });
}
