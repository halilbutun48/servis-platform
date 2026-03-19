import { prisma } from "../prisma.js";

export const MOBILE_HEALTH_EVENT_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "PIN_CHANGED",
  "GPS_PERMISSION_CHANGED",
  "GPS_PUBLISH_SUCCESS",
  "GPS_PUBLISH_FAILURE",
  "OFFLINE_ENTERED",
  "ONLINE_RECOVERED",
  "SESSION_FAILURE",
  "KVKK_BLOCKED",
  "ISSUE_REPORTED",
];

export const M59_OBSERVABILITY_WIDGETS = [
  { key: "mobileHealth", label: "Mobil sağlık olayları" },
  { key: "deviceHealth", label: "Cihaz sağlık özeti" },
  { key: "gpsReliability", label: "GPS güven skoru" },
  { key: "issueInbox", label: "Sorun bildir" },
  { key: "shiftTimeline", label: "Vardiya olay akışı" },
];

export function getObservabilityManifest() {
  return {
    milestone: "M59",
    title: "Gözlemleme + Saha Teşhis",
    mobileHealthEventTypes: MOBILE_HEALTH_EVENT_TYPES,
    widgets: M59_OBSERVABILITY_WIDGETS,
    scope: {
      room: true,
      superAdmin: true,
      company: false,
      driver: false,
    },
  };
}

export function buildObservabilitySkeletonSummary() {
  return {
    status: "SCAFFOLD",
    gpsReliability: {
      label: "GPS güven skoru",
      bucket: "hazırlık",
      score: null,
      notes: [
        "M59 iskeleti açıldı.",
        "Gerçek telemetry toplama M59 ilerledikçe doldurulacak.",
      ],
    },
    deviceHealth: {
      label: "Cihaz sağlık özeti",
      lastSyncAt: null,
      lastGpsAt: null,
      risk: "unknown",
    },
    wording: {
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
      issueTone: "plain-tr",
    },
  };
}

function formatRelativeTime(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "az önce";
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} gün önce`;
}

function statusFromVehicle(vehicle) {
  const uiStatus = String(vehicle?.gpsState?.lastUiStatus || "").toUpperCase();
  if (uiStatus === "LIVE" || uiStatus === "STALE" || uiStatus === "OFFLINE") return uiStatus;

  const at = vehicle?.gpsLast?.at ? new Date(vehicle.gpsLast.at) : null;
  if (!at || Number.isNaN(at.getTime())) return "OFFLINE";
  const diffMin = (Date.now() - at.getTime()) / 60_000;
  if (diffMin <= 5) return "LIVE";
  if (diffMin <= 15) return "STALE";
  return "OFFLINE";
}

function reliabilityFromVehicle(vehicle, liveState) {
  const at = vehicle?.gpsLast?.at ? new Date(vehicle.gpsLast.at) : null;
  const diffMin = at && !Number.isNaN(at.getTime()) ? (Date.now() - at.getTime()) / 60_000 : null;
  let score = 40;
  if (liveState === "LIVE") score = 92;
  else if (liveState === "STALE") score = 63;
  else score = 28;

  if (typeof vehicle?.gpsLast?.speed === "number" && vehicle.gpsLast.speed > 0) score += 4;
  if (diffMin != null && diffMin > 20) score -= 10;
  return Math.max(0, Math.min(99, Math.round(score)));
}

function permissionFromVehicle(vehicle, liveState) {
  if (vehicle?.gpsLast?.at || liveState === "LIVE" || liveState === "STALE") return "GRANTED";
  return "UNKNOWN";
}

function sessionFromDriver(driver) {
  const sessions = Array.isArray(driver?.user?.refreshSessions) ? driver.user.refreshSessions : [];
  const hasActive = sessions.some((x) => !x.revokedAt && x.expiresAt && new Date(x.expiresAt).getTime() > Date.now());
  return hasActive ? "OK" : "REFRESH_NEEDED";
}

function issueSummaryFor(driverRow) {
  if (driverRow.liveState === "OFFLINE") return "Sürücünün telefon GPS'i uzun süredir veri göndermiyor";
  if (driverRow.liveState === "STALE") return "Konum gönderimi gecikmiş görünüyor";
  if (driverRow.sessionState === "REFRESH_NEEDED") return "Oturum yenilenmeli veya sürücü tekrar giriş yapmalı";
  if (driverRow.permissionState !== "GRANTED") return "Konum izni kontrol edilmeli";
  return "";
}

async function loadRoomObservabilityDrivers(user) {
  const roomId = Number(user?.roomId || 0);
  if (!roomId) return [];

  const now = new Date();

  const drivers = await prisma.driver.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          refreshSessions: {
            where: { revokedAt: null, expiresAt: { gt: now } },
            select: { id: true, expiresAt: true, revokedAt: true },
            take: 3,
          },
        },
      },
      vehicles: {
        where: { archivedAt: null },
        include: { gpsLast: true, gpsState: true },
        orderBy: { id: "asc" },
        take: 1,
      },
      shifts: {
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
        include: {
          vehicle: { include: { gpsLast: true, gpsState: true } },
        },
        orderBy: [{ status: "desc" }, { startAt: "asc" }],
        take: 1,
      },
    },
    orderBy: { id: "asc" },
  });

  return drivers.map((driver) => {
    const activeShiftVehicle = driver.shifts?.[0]?.vehicle || null;
    const boundVehicle = driver.vehicles?.[0] || null;
    const vehicle = activeShiftVehicle || boundVehicle || null;
    const liveState = statusFromVehicle(vehicle);
    const sessionState = sessionFromDriver(driver);
    const permissionState = permissionFromVehicle(vehicle, liveState);
    const gpsReliabilityScore = reliabilityFromVehicle(vehicle, liveState);
    const driverName = driver.fullName || driver.user?.fullName || `Sürücü #${driver.id}`;
    const vehiclePlate = vehicle?.plate || "-";
    const lastGpsAt = formatRelativeTime(vehicle?.gpsLast?.at);
    const issueSummary = issueSummaryFor({ liveState, sessionState, permissionState });

    return {
      id: String(driver.id),
      driverId: driver.id,
      driverName,
      vehicleId: vehicle?.id || null,
      vehiclePlate,
      liveState,
      gpsReliabilityScore,
      permissionState,
      sessionState,
      lastGpsAt,
      issueSummary,
    };
  });
}

function buildRoomIssuesFromDrivers(items) {
  const issues = [];
  const staleOrOffline = items.filter((x) => x.liveState === "STALE" || x.liveState === "OFFLINE");
  const riskySessions = items.filter((x) => x.sessionState === "REFRESH_NEEDED");
  const unknownPermission = items.filter((x) => x.permissionState !== "GRANTED");

  if (staleOrOffline.length) {
    issues.push({
      severity: staleOrOffline.some((x) => x.liveState === "OFFLINE") ? "HIGH" : "MEDIUM",
      title: "Canlılık akışı zayıf",
      detail: `${staleOrOffline.length} sürücüde stale/offline davranışı görünüyor.`,
    });
  }
  if (riskySessions.length) {
    issues.push({
      severity: "MEDIUM",
      title: "Oturum yenileme gerekli olabilir",
      detail: `${riskySessions.length} sürücüde oturum yenileme kontrolü öneriliyor.`,
    });
  }
  if (unknownPermission.length) {
    issues.push({
      severity: "LOW",
      title: "Konum izni doğrulaması gerekebilir",
      detail: `${unknownPermission.length} sürücüde konum izni kesin olarak doğrulanamadı.`,
    });
  }
  return issues;
}

export async function buildRoomObservabilitySummary(user) {
  const roomLabel = String(user?.roomName || user?.name || user?.email || "ROOM").trim() || "ROOM";
  const items = await loadRoomObservabilityDrivers(user);
  const cards = {
    activeDrivers: items.filter((x) => x.liveState === "LIVE").length,
    riskyDevices: items.filter((x) => x.sessionState === "REFRESH_NEEDED" || x.permissionState !== "GRANTED").length,
    staleOrOffline: items.filter((x) => x.liveState === "STALE" || x.liveState === "OFFLINE").length,
    openIssues: buildRoomIssuesFromDrivers(items).length,
  };

  return {
    scope: "ROOM",
    roomLabel,
    cards,
    wording: {
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
      issueTone: "plain-tr",
    },
    notes: items.length
      ? [
          "Bu ekran artık demo veri yerine room kapsamındaki gerçek sürücü ve araç verisini kullanır.",
          "GPS canlılığı araç üzerindeki son konum ve UI durum bilgisinden türetilir.",
        ]
      : ["Room kapsamı için gösterilecek sürücü veya araç bulunamadı."],
  };
}

export async function buildRoomObservabilityDrivers(user) {
  return loadRoomObservabilityDrivers(user);
}

export async function buildRoomObservabilityIssues(user) {
  const items = await loadRoomObservabilityDrivers(user);
  return buildRoomIssuesFromDrivers(items);
}
