import { prisma } from "../prisma.js";
import { rememberResponse } from "../utils/responseCache.js";
import { decorateGeoItem } from "./geoState.js";
import { sanitizeCompanyPersonelItem, sanitizeInviteItem } from "../kvkk/enforcement.js";
import { buildBoardingChangeRequestView } from "./boardingChangeRequestView.js";
import { buildRoomObservabilitySummary, buildRoomObservabilityDrivers, buildRoomObservabilityIssues } from "../ops/observabilityManifest.js";
import { buildRoomCommercialSummary, buildRoomCommercialItems } from "../ops/commercialCoreManifest.js";
import { getShiftSummary, getVehicleSummary, getDriverSummary } from "../lib/reports.js";
import { listFieldFeedbackRecords } from "../ops/fieldFeedbackLoop.js";
import { resolveNotificationOwnership, resolveRoomOwnership } from "../region/ownership.js";

const REQUEST_SHIFT_PREVIEW_INCLUDE = {
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
      },
    },
    stops: {
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        order: true,
        type: true,
        state: true,
        reachedAt: true,
        skippedAt: true,
        updatedAt: true,
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
        stop: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            order: true,
            type: true,
            state: true,
            reachedAt: true,
            skippedAt: true,
            updatedAt: true,
          },
        },
      },
    },
  },
};

const NOTIFICATION_REGION_INCLUDE = {
  company: {
    select: {
      id: true,
      regionId: true,
      district: true,
      region: { select: { id: true, name: true } },
    },
  },
  room: {
    select: {
      id: true,
      regionId: true,
      district: true,
      region: { select: { id: true, name: true } },
    },
  },
  vehicle: {
    select: {
      id: true,
      room: {
        select: {
          id: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
    },
  },
  driver: {
    select: {
      id: true,
      room: {
        select: {
          id: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
    },
  },
  shift: {
    select: {
      id: true,
      room: {
        select: {
          id: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
      company: {
        select: {
          id: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
    },
  },
};

function textOf(value) {
  return String(value ?? "").trim();
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function scopeOf(user) {
  return {
    role: user?.role ?? null,
    companyId: user?.companyId ?? null,
    roomId: user?.roomId ?? null,
    userId: user?.id ?? null,
  };
}

function stableQueryKey(query = {}) {
  const normalized = {};
  for (const key of Object.keys(query || {}).sort()) {
    const value = query[key];
    if (value == null || value === "") continue;
    normalized[key] = String(value);
  }
  return JSON.stringify(normalized);
}

function bulkCacheKey(bundle, user, query = {}) {
  return `dashboard-bulk:${String(bundle || "unknown")}:${stableQueryKey(query)}:${String(user?.role || "-")}:${Number(user?.companyId || 0)}:${Number(user?.roomId || 0)}:${Number(user?.id || 0)}`;
}

function errorInfo(error) {
  return {
    name: String(error?.name || "Error"),
    code: String(error?.code || ""),
    message: String(error?.message || error || ""),
    status: Number(error?.status || 0) || 0,
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function safeSection(name, producer, fallback) {
  try {
    const data = await producer();
    return {
      ok: true,
      name,
      ...data,
    };
  } catch (error) {
    return {
      ok: false,
      name,
      ...fallback,
      error: errorInfo(error),
    };
  }
}

async function resolveCompanyScope(user, query = {}) {
  const role = String(user?.role || "").toUpperCase();
  const rawCompanyId = role === "SUPER_ADMIN" ? (query?.companyId ?? user?.companyId ?? null) : user?.companyId ?? null;
  const companyId = Number(rawCompanyId || 0) || 0;
  if (!companyId) return null;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, kind: true, name: true },
  });
  return company;
}

async function resolveRoomScope(user, query = {}) {
  const role = String(user?.role || "").toUpperCase();
  const rawRoomId = role === "SUPER_ADMIN" ? (query?.roomId ?? user?.roomId ?? null) : user?.roomId ?? null;
  const roomId = Number(rawRoomId || 0) || 0;
  if (!roomId) return null;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      regionId: true,
      district: true,
      region: { select: { id: true, name: true } },
    },
  });
  return room;
}

async function loadCompanyPersonels(user, { kind = "PERSONEL", take = 120 } = {}) {
  const company = await resolveCompanyScope(user);
  if (!company) return [];
  const kindValue = String(kind || "").trim().toUpperCase();
  const where = { companyId: company.id };
  if (kindValue === "PERSONEL" || kindValue === "STUDENT") where.kind = kindValue;

  const items = await prisma.personel.findMany({
    where,
    take: Math.min(500, Math.max(1, Number(take || 120) || 120)),
    orderBy: [{ geoStatus: "desc" }, { id: "asc" }],
    select: {
      id: true,
      kind: true,
      fullName: true,
      phone: true,
      homeAddress: true,
      homeLat: true,
      homeLng: true,
      geoStatus: true,
      geoManualOverride: true,
      geoNote: true,
      geoUpdatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
        },
      },
    },
  });

  const businessDomain = String(company.kind || "COMPANY").toUpperCase();
  return items
    .map(decorateGeoItem)
    .map((item) => sanitizeCompanyPersonelItem(item, { businessDomain, role: user?.role }))
    .filter((item) => !kindValue || String(item?.kind || "").toUpperCase() === kindValue);
}

async function loadCompanyShifts(user, { status = ["APPROVED", "ACTIVE", "DONE"], take = 120 } = {}) {
  const company = await resolveCompanyScope(user);
  if (!company) return [];
  const statusList = Array.isArray(status) ? status : String(status || "").split(",").map((item) => String(item || "").trim()).filter(Boolean);
  const items = await prisma.shift.findMany({
    where: {
      companyId: company.id,
      status: statusList.length ? { in: statusList } : undefined,
    },
    take: Math.min(500, Math.max(1, Number(take || 120) || 120)),
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    include: {
      company: { select: { id: true, name: true, kind: true } },
      room: { select: { id: true, name: true } },
      vehicle: {
        select: {
          id: true,
          plate: true,
          gpsLast: {
            select: {
              at: true,
              lat: true,
              lng: true,
              speed: true,
              sourceLabel: true,
            },
          },
        },
      },
      driver: {
        select: {
          id: true,
          fullName: true,
        },
      },
      stops: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          lat: true,
          lng: true,
          order: true,
          state: true,
        },
      },
      people: {
        select: {
          id: true,
          personelId: true,
        },
      },
    },
  });
  return safeArray(items);
}

function buildRequestFiltersForUser(user) {
  const role = String(user?.role || "").toUpperCase();
  const where = {};
  if (role === "COMPANY") {
    where.shift = { is: { companyId: user?.companyId ?? -1 } };
  } else if (role === "ROOM") {
    where.shift = { is: { roomId: user?.roomId ?? -1 } };
  } else if (role === "SUPER_ADMIN") {
    where.shift = {};
  } else {
    where.shift = {};
  }
  return where;
}

async function loadDashboardRequests(user, { take = 200 } = {}) {
  const where = buildRequestFiltersForUser(user);
  const items = await prisma.pickupRequest.findMany({
    where,
    include: { personel: true, shift: REQUEST_SHIFT_PREVIEW_INCLUDE },
    orderBy: { id: "desc" },
    take: Math.min(500, Math.max(1, Number(take || 200) || 200)),
  });

  const ids = items.map((item) => Number(item?.id || 0)).filter((n) => Number.isFinite(n) && n > 0);
  const audits = ids.length
    ? await prisma.auditLog.findMany({
      where: {
        entity: "PickupRequest",
        entityId: { in: ids },
        action: {
          in: [
            "BOARDING_CHANGE_REQUEST_CREATE",
            "BOARDING_CHANGE_REQUEST_AUTO_ACCEPTED",
            "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT",
            "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL",
            "BOARDING_CHANGE_APPLIED",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    })
    : [];

  const auditMap = new Map();
  for (const row of audits) {
    const key = Number(row?.entityId || 0);
    if (!key) continue;
    const current = auditMap.get(key) || { decisionAudit: null, applyAudit: null };
    const action = String(row?.action || "");
    if (!current.decisionAudit && action !== "BOARDING_CHANGE_APPLIED") {
      current.decisionAudit = row;
    }
    if (!current.applyAudit && action === "BOARDING_CHANGE_APPLIED") {
      current.applyAudit = row;
    }
    auditMap.set(key, current);
  }

  return items.map((item) => buildBoardingChangeRequestView(item, auditMap.get(Number(item.id || 0)) || {}));
}

function decorateNotificationRegion(notification = {}) {
  const regionOwnership = resolveNotificationOwnership(notification, notification);
  const regionRoutingKey = regionOwnership?.regionKey ?? null;
  const { company: _company, room: _room, vehicle: _vehicle, driver: _driver, shift: _shift, ...base } = notification;

  return {
    ...base,
    regionOwnership,
    regionRoutingKey,
  };
}

async function loadDashboardNotifications(user) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "SUPER_ADMIN") {
    const items = await prisma.notification.findMany({
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  if (role === "ROOM") {
    if (!user?.roomId) return [];
    const items = await prisma.notification.findMany({
      where: { scope: "ROOM", roomId: user.roomId },
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  if (role === "COMPANY") {
    if (!user?.companyId) return [];
    const items = await prisma.notification.findMany({
      where: { companyId: user.companyId },
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  if (role === "PERSONEL") {
    const ors = [{ userId: user.id }];
    if (user.companyId) ors.push({ companyId: user.companyId });
    const items = await prisma.notification.findMany({
      where: { OR: ors },
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  if (role === "PARENT") {
    const items = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  if (role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!driver) return [];
    const items = await prisma.notification.findMany({
      where: { scope: "DRIVER", driverId: driver.id },
      orderBy: { id: "desc" },
      take: 100,
      include: NOTIFICATION_REGION_INCLUDE,
    });
    return items.map(decorateNotificationRegion);
  }

  return [];
}

async function loadSchoolParentInvites(user, { take = 120 } = {}) {
  const company = await resolveCompanyScope(user);
  if (!company || String(company.kind || "").toUpperCase() !== "SCHOOL") return [];

  const items = await prisma.parentInvite.findMany({
    where: { companyId: company.id },
    include: {
      child: { select: { id: true, fullName: true, kind: true } },
    },
    orderBy: { id: "desc" },
    take: Math.min(200, Math.max(1, Number(take || 120) || 120)),
  });

  return items.map((item) => sanitizeInviteItem({
    id: item.id,
    companyId: item.companyId,
    childPersonelId: item.childPersonelId,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    revokedAt: item.revokedAt,
    createdByUserId: item.createdByUserId ?? null,
    status: item.revokedAt ? "REVOKED" : item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now() ? "EXPIRED" : "ACTIVE",
    child: item.child ? { id: item.child.id, fullName: item.child.fullName, kind: item.child.kind } : null,
  }, { role: user?.role }));
}

function isShiftActiveForDriver(shift, nowMs) {
  const startMs = shift?.startAt ? new Date(shift.startAt).getTime() : NaN;
  const endMs = shift?.endAt ? new Date(shift.endAt).getTime() : NaN;
  const status = String(shift?.status || "").toUpperCase();
  return status === "ACTIVE" || (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && endMs >= nowMs);
}

function deriveConnectionState(user) {
  const lastSeenMs = user?.deviceLastSeenAt ? new Date(user.deviceLastSeenAt).getTime() : NaN;
  const hasBinding = Boolean(user?.deviceId || user?.deviceBoundAt || Number.isFinite(lastSeenMs));
  if (!hasBinding) return { connectionState: "OFFLINE", connectionLabel: "Bagli degil" };
  if (Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs <= 5 * 60 * 1000) {
    return { connectionState: "ONLINE", connectionLabel: "Bagli" };
  }
  return { connectionState: "OFFLINE", connectionLabel: "Bagli degil" };
}

function deriveGpsUiState(vehicle) {
  const atMs = vehicle?.gpsLast?.at ? new Date(vehicle.gpsLast.at).getTime() : NaN;
  if (!vehicle) return { gpsUiState: "IDLE", gpsLabel: "GPS pasif" };
  if (!Number.isFinite(atMs)) return { gpsUiState: "OFFLINE", gpsLabel: "GPS yok" };
  const ageMs = Date.now() - atMs;
  if (ageMs <= 90 * 1000) return { gpsUiState: "LIVE", gpsLabel: "Canli" };
  if (ageMs <= 5 * 60 * 1000) return { gpsUiState: "STALE", gpsLabel: "Eski" };
  return { gpsUiState: "OFFLINE", gpsLabel: "GPS yok" };
}

function deriveAssignmentState({ currentShift, nextShift, boundVehicle }) {
  const base = currentShift || nextShift || null;
  if (!base) return { assignmentState: "NONE", assignmentLabel: "Gorev yok" };
  if (!base.vehicleId && !boundVehicle?.id) return { assignmentState: "ASSIGNED_NO_VEHICLE", assignmentLabel: "Arac bekleniyor" };
  if (currentShift) return { assignmentState: "ACTIVE", assignmentLabel: "Aktif vardiya" };
  return { assignmentState: "ASSIGNED", assignmentLabel: "Vardiya atandi" };
}

async function loadRoomDriverSignals(user, query = {}) {
  const room = await resolveRoomScope(user, query);
  if (!room) return [];

  const roomOwnership = resolveRoomOwnership(room || { id: user.roomId, regionId: null, district: null, region: null });

  const drivers = await prisma.driver.findMany({
    where: { roomId: room.id },
    include: {
      backupDriver: true,
      user: { select: { id: true, email: true, deviceId: true, deviceBoundAt: true, deviceLastSeenAt: true, sessionVersion: true } },
    },
    orderBy: { id: "asc" },
  });

  const driverIds = drivers.map((x) => Number(x.id)).filter((x) => Number.isFinite(x));
  const [vehicles, shifts] = await Promise.all([
    prisma.vehicle.findMany({
      where: { roomId: room.id, archivedAt: null, driverId: { in: driverIds.length ? driverIds : [-1] } },
      select: {
        id: true,
        plate: true,
        capacity: true,
        status: true,
        driverId: true,
        gpsLast: { select: { at: true, lat: true, lng: true, speed: true } },
      },
    }),
    prisma.shift.findMany({
      where: {
        roomId: room.id,
        driverId: { in: driverIds.length ? driverIds : [-1] },
        status: { in: ["APPROVED", "ACTIVE"] },
        endAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        roomId: true,
        companyId: true,
        vehicleId: true,
        driverId: true,
        agreementId: true,
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  const vehicleByDriverId = new Map();
  for (const vehicle of vehicles) {
    if (vehicle?.driverId != null) vehicleByDriverId.set(Number(vehicle.driverId), vehicle);
  }

  const nowMs = Date.now();
  const shiftsByDriverId = new Map();
  for (const shift of shifts) {
    const key = Number(shift.driverId);
    if (!shiftsByDriverId.has(key)) shiftsByDriverId.set(key, []);
    shiftsByDriverId.get(key).push(shift);
  }

  return drivers.map((driver) => {
    const key = Number(driver.id);
    const boundVehicle = vehicleByDriverId.get(key) || null;
    const rows = shiftsByDriverId.get(key) || [];
    const currentShift = rows.find((shift) => isShiftActiveForDriver(shift, nowMs)) || null;
    const nextShift = rows.find((shift) => new Date(shift.startAt).getTime() > nowMs) || null;
    const connection = deriveConnectionState(driver.user);
    const assignment = deriveAssignmentState({ currentShift, nextShift, boundVehicle });
    const gps = assignment.assignmentState === "NONE"
      ? { gpsUiState: "IDLE", gpsLabel: "GPS pasif" }
      : assignment.assignmentState === "ASSIGNED"
        ? { gpsUiState: "WAITING", gpsLabel: "Bekliyor" }
        : deriveGpsUiState(boundVehicle);

    return {
      ...driver,
      regionOwnership: roomOwnership,
      boundVehicle,
      currentShift,
      nextShift,
      ops: {
        ...connection,
        ...assignment,
        ...gps,
      },
      liveState: assignment.assignmentState === "ACTIVE" ? "LIVE" : gps.gpsUiState === "STALE" ? "STALE" : gps.gpsUiState === "OFFLINE" ? "OFFLINE" : "LIVE",
      gpsReliabilityScore: gps.gpsUiState === "LIVE" ? 92 : gps.gpsUiState === "STALE" ? 63 : 28,
      permissionState: gps.gpsUiState === "OFFLINE" ? "UNKNOWN" : "GRANTED",
      sessionState: connection.connectionState === "ONLINE" ? "OK" : "REFRESH_NEEDED",
      lastGpsAt: boundVehicle?.gpsLast?.at ? new Date(boundVehicle.gpsLast.at).toISOString() : "-",
      issueSummary: connection.connectionState === "ONLINE" && assignment.assignmentState === "NONE"
        ? ""
        : connection.connectionState !== "ONLINE"
          ? "Oturum yenilenmeli veya sürücü tekrar giriş yapmalı"
          : gps.gpsUiState === "STALE"
            ? "Konum gönderimi gecikmiş görünüyor"
            : gps.gpsUiState === "OFFLINE"
              ? "Sürücünün telefon GPS'i uzun süredir veri göndermiyor"
              : "",
      driverName: driver.fullName || driver.user?.fullName || `Sürücü #${driver.id}`,
      vehiclePlate: boundVehicle?.plate || "-",
      vehicleId: boundVehicle?.id || null,
      driverId: driver.id,
    };
  });
}

async function loadSuperAdminStats() {
  const [companiesTotal, roomsTotal, vehiclesTotal, driversTotal, companies, rooms] = await Promise.all([
    prisma.company.count(),
    prisma.room.count(),
    prisma.vehicle.count(),
    prisma.driver.count(),
    prisma.company.count({ where: { status: { not: "DELETED" } } }),
    prisma.room.count({ where: { status: { not: "DELETED" } } }),
  ]);

  return {
    companies,
    rooms,
    vehicles: vehiclesTotal,
    drivers: driversTotal,
    companiesTotal,
    roomsTotal,
    vehiclesTotal,
    driversTotal,
  };
}

async function loadSuperAdminFeedback() {
  const items = await listFieldFeedbackRecords({ roleId: "ALL" });
  return safeArray(items);
}

async function buildCompanyOperationsBundle(user, query = {}) {
  const company = await resolveCompanyScope(user, query);
  if (!company) {
    const error = new Error("COMPANY_SCOPE_MISSING");
    error.status = 400;
    throw error;
  }

  const ymd = textOf(query.from) || textOf(query.to) || todayYmd();
  const reportQuery = { from: ymd, to: textOf(query.to) || ymd };

  const [personels, shifts, requests, notifications, shiftSummary] = await Promise.all([
    safeSection("personels", () => loadCompanyPersonels(user, { kind: "PERSONEL", take: 120 }), { items: [] }),
    safeSection("shifts", () => loadCompanyShifts(user, { take: 120, status: ["APPROVED", "ACTIVE", "DONE"] }), { items: [] }),
    safeSection("requests", () => loadDashboardRequests(user, { take: 200 }), { items: [] }),
    safeSection("notifications", () => loadDashboardNotifications(user), { items: [] }),
    safeSection("shiftSummary", () => getShiftSummary(reportQuery, user), { total: 0, byStatus: {}, byDirection: {}, byPattern: {}, rows: [] }),
  ]);

  return {
    bundle: "company-operations",
    generatedAt: new Date().toISOString(),
    company: {
      id: company.id,
      kind: company.kind,
      name: company.name,
    },
    personels,
    shifts: {
      ...shifts,
      items: safeArray(shifts.items),
    },
    requests: {
      ...requests,
      items: safeArray(requests.items),
    },
    notifications: {
      ...notifications,
      items: safeArray(notifications.items),
    },
    shiftSummary,
    errors: [personels, shifts, requests, notifications, shiftSummary].filter((section) => section && section.ok === false).map((section) => ({ section: section.name, error: section.error })),
  };
}

async function buildSchoolOperationsBundle(user) {
  const company = await resolveCompanyScope(user);
  if (!company) {
    const error = new Error("COMPANY_SCOPE_MISSING");
    error.status = 400;
    throw error;
  }
  if (String(company.kind || "").toUpperCase() !== "SCHOOL") {
    const error = new Error("SCHOOL_SCOPE_REQUIRED");
    error.status = 403;
    throw error;
  }

  const [students, invites, requests, notifications] = await Promise.all([
    safeSection("students", () => loadCompanyPersonels(user, { kind: "STUDENT", take: 120 }), { items: [] }),
    safeSection("invites", () => loadSchoolParentInvites(user, { take: 120 }), { items: [] }),
    safeSection("requests", () => loadDashboardRequests(user, { take: 200 }), { items: [] }),
    safeSection("notifications", () => loadDashboardNotifications(user), { items: [] }),
  ]);

  return {
    bundle: "school-operations",
    generatedAt: new Date().toISOString(),
    company: {
      id: company.id,
      kind: company.kind,
      name: company.name,
    },
    students,
    invites: {
      ...invites,
      items: safeArray(invites.items),
    },
    requests: {
      ...requests,
      items: safeArray(requests.items),
    },
    notifications: {
      ...notifications,
      items: safeArray(notifications.items),
    },
    errors: [students, invites, requests, notifications].filter((section) => section && section.ok === false).map((section) => ({ section: section.name, error: section.error })),
  };
}

async function buildRoomOperationHealthBundle(user, query = {}) {
  const room = await resolveRoomScope(user, query);
  if (!room) {
    const error = new Error("ROOM_SCOPE_MISSING");
    error.status = 400;
    throw error;
  }

  const ymd = textOf(query.from) || textOf(query.to) || todayYmd();
  const reportQuery = { from: ymd, to: textOf(query.to) || ymd };

  const [summary, drivers, issues, driverSignals, shiftSummary, vehicleSummary, driverSummary, requests] = await Promise.all([
    safeSection("summary", () => buildRoomObservabilitySummary(user), { cards: { activeDrivers: 0, riskyDevices: 0, staleOrOffline: 0, openIssues: 0 } }),
    safeSection("drivers", () => buildRoomObservabilityDrivers(user), { items: [] }),
    safeSection("issues", () => buildRoomObservabilityIssues(user), { items: [] }),
    safeSection("driverSignals", () => loadRoomDriverSignals(user, query), { items: [] }),
    safeSection("shiftSummary", () => getShiftSummary(reportQuery, user), { total: 0, byStatus: {}, byDirection: {}, byPattern: {}, rows: [] }),
    safeSection("vehicleSummary", () => getVehicleSummary(reportQuery, user), { total: 0, rows: [] }),
    safeSection("driverSummary", () => getDriverSummary(reportQuery, user), { total: 0, rows: [] }),
    safeSection("requests", () => loadDashboardRequests(user, { take: 200 }), { items: [] }),
  ]);

  return {
    bundle: "room-operation-health",
    generatedAt: new Date().toISOString(),
    room: {
      id: room.id,
      name: room.name,
    },
    summary,
    drivers: {
      ...drivers,
      items: safeArray(drivers.items),
    },
    issues: {
      ...issues,
      items: safeArray(issues.items),
    },
    roomOperations: {
      driverSignals: safeArray(driverSignals.items),
      shiftSummary,
      vehicleSummary,
      driverSummary,
      requests: safeArray(requests.items),
    },
    errors: [summary, drivers, issues, driverSignals, shiftSummary, vehicleSummary, driverSummary, requests].filter((section) => section && section.ok === false).map((section) => ({ section: section.name, error: section.error })),
  };
}

async function buildRoomCommercialFlowBundle(user, query = {}) {
  const room = await resolveRoomScope(user, query);
  if (!room) {
    const error = new Error("ROOM_SCOPE_MISSING");
    error.status = 400;
    throw error;
  }

  const [summary, items] = await Promise.all([
    safeSection("summary", () => buildRoomCommercialSummary(user), { cards: { openOffers: 0, counteredOffers: 0, acceptedOffers: 0, requestedAgreements: 0, activeAgreements: 0, approvedOrActiveShifts: 0 } }),
    safeSection("items", () => buildRoomCommercialItems(user), { items: [] }),
  ]);

  return {
    bundle: "room-commercial-flow",
    generatedAt: new Date().toISOString(),
    room: {
      id: room.id,
      name: room.name,
    },
    summary,
    items: {
      ...items,
      items: safeArray(items.items),
    },
    errors: [summary, items].filter((section) => section && section.ok === false).map((section) => ({ section: section.name, error: section.error })),
  };
}

async function buildSuperAdminOverviewBundle(user) {
  if (String(user?.role || "").toUpperCase() !== "SUPER_ADMIN") {
    const error = new Error("SUPER_ADMIN_REQUIRED");
    error.status = 403;
    throw error;
  }

  const [stats, feedbackRecords] = await Promise.all([
    safeSection("stats", loadSuperAdminStats, { companies: 0, rooms: 0, vehicles: 0, drivers: 0, companiesTotal: 0, roomsTotal: 0, vehiclesTotal: 0, driversTotal: 0 }),
    safeSection("feedbackRecords", loadSuperAdminFeedback, { items: [] }),
  ]);

  const records = safeArray(feedbackRecords.items);
  const active = records.filter((item) => !["COZULDU", "KAPANDI"].includes(String(item?.status || "").toUpperCase())).length;
  const latestAt = records[0]?.updatedAt || records[0]?.createdAt || null;

  return {
    bundle: "superadmin-overview",
    generatedAt: new Date().toISOString(),
    stats: stats.ok ? stats : { ...stats, ...stats },
    feedbackRecords: {
      ...feedbackRecords,
      items: records,
    },
    feedbackSummary: {
      total: records.length,
      active,
      latestAt,
    },
    errors: [stats, feedbackRecords].filter((section) => section && section.ok === false).map((section) => ({ section: section.name, error: section.error })),
  };
}

const BUNDLE_LOADERS = {
  "company-operations": buildCompanyOperationsBundle,
  "school-operations": buildSchoolOperationsBundle,
  "room-operation-health": buildRoomOperationHealthBundle,
  "room-commercial-flow": buildRoomCommercialFlowBundle,
  "superadmin-overview": buildSuperAdminOverviewBundle,
};

const BUNDLE_ROLES = {
  "company-operations": ["COMPANY", "SUPER_ADMIN"],
  "school-operations": ["COMPANY", "SUPER_ADMIN"],
  "room-operation-health": ["ROOM", "SUPER_ADMIN"],
  "room-commercial-flow": ["ROOM", "SUPER_ADMIN"],
  "superadmin-overview": ["SUPER_ADMIN"],
};

function assertBundleAccess(bundle, user, query = {}) {
  const allowed = BUNDLE_ROLES[bundle];
  if (!allowed) {
    const error = new Error("UNKNOWN_DASHBOARD_BUNDLE");
    error.status = 400;
    error.code = "UNKNOWN_DASHBOARD_BUNDLE";
    throw error;
  }
  const role = String(user?.role || "").toUpperCase();
  if (!allowed.includes(role)) {
    const error = new Error("DASHBOARD_BUNDLE_FORBIDDEN");
    error.status = 403;
    error.code = "DASHBOARD_BUNDLE_FORBIDDEN";
    throw error;
  }
  if ((bundle === "company-operations" || bundle === "school-operations") && !Number(user?.companyId || query?.companyId || 0)) {
    const error = new Error("COMPANY_SCOPE_MISSING");
    error.status = 400;
    error.code = "COMPANY_SCOPE_MISSING";
    throw error;
  }
  if ((bundle === "room-operation-health" || bundle === "room-commercial-flow") && !Number(user?.roomId || query?.roomId || 0)) {
    const error = new Error("ROOM_SCOPE_MISSING");
    error.status = 400;
    error.code = "ROOM_SCOPE_MISSING";
    throw error;
  }
}

export async function buildDashboardBulkBundle(bundle, user, query = {}) {
  const name = String(bundle || "").trim();
  assertBundleAccess(name, user, query);
  const loader = BUNDLE_LOADERS[name];
  if (!loader) {
    const error = new Error("UNKNOWN_DASHBOARD_BUNDLE");
    error.status = 400;
    error.code = "UNKNOWN_DASHBOARD_BUNDLE";
    throw error;
  }
  const cacheKey = bulkCacheKey(name, user, query);
  const shouldBypassCache = ["1", "true", "yes", "on"].includes(textOf(query.force).toLowerCase());
  const load = () => loader(user, query);
  if (shouldBypassCache) return load();
  return rememberResponse(cacheKey, load, {
    ttlMs: 15000,
    scope: scopeOf(user),
  });
}

export function getDashboardBulkBundleNames() {
  return Object.keys(BUNDLE_LOADERS);
}
