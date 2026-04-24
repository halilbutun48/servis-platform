const REGION_OWNERSHIP_SOURCES = Object.freeze({
  EXPLICIT: "explicit",
  HOME: "home",
  PARENT: "parent",
  REGION: "region",
  DISTRICT: "district",
  UNASSIGNED: "unassigned",
});

function toPositiveInt(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toText(value) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function pickRegionCandidate(...entries) {
  for (const entry of entries) {
    if (!entry) continue;
    const regionId = toPositiveInt(entry.value);
    if (regionId != null) {
      return {
        regionId,
        source: entry.source || REGION_OWNERSHIP_SOURCES.EXPLICIT,
      };
    }
  }
  return null;
}

function buildRegionKey({ regionId, district, regionName } = {}) {
  const id = toPositiveInt(regionId);
  const zone = toText(district);
  const name = toText(regionName);
  if (id != null && zone) return `region:${id}:district:${zone}`;
  if (id != null) return `region:${id}`;
  if (name && zone) return `region:${name}:district:${zone}`;
  if (name) return `region:${name}`;
  if (zone) return `district:${zone}`;
  return null;
}

function buildOwnershipSnapshot({
  entityType,
  entityId = null,
  regionId = null,
  district = null,
  regionName = null,
  source = REGION_OWNERSHIP_SOURCES.UNASSIGNED,
} = {}) {
  const normalizedRegionId = toPositiveInt(regionId);
  const normalizedDistrict = toText(district);
  const normalizedRegionName = toText(regionName);
  return {
    entityType: toText(entityType) || "ENTITY",
    entityId: toPositiveInt(entityId),
    regionId: normalizedRegionId,
    district: normalizedDistrict,
    regionName: normalizedRegionName,
    source,
    regionKey: buildRegionKey({
      regionId: normalizedRegionId,
      district: normalizedDistrict,
      regionName: normalizedRegionName,
    }),
    hasRegion: normalizedRegionId != null || normalizedDistrict != null || normalizedRegionName != null,
  };
}

export function resolveRegionOwnership(entity = {}, options = {}) {
  const region = options.region ?? entity.region ?? null;
  const explicitRegionId = options.regionId ?? entity.regionId ?? null;
  const homeRegionId = options.homeRegionId ?? entity.homeRegionId ?? null;
  const serviceRegionId = options.serviceRegionId ?? entity.serviceRegionId ?? null;
  const parentRegionId = options.parentRegionId ?? entity.parentRegionId ?? null;
  const regionName = options.regionName ?? entity.regionName ?? region?.name ?? null;
  const district = options.district ?? entity.district ?? entity.zone ?? null;

  const candidate = pickRegionCandidate(
    { source: REGION_OWNERSHIP_SOURCES.EXPLICIT, value: serviceRegionId },
    { source: REGION_OWNERSHIP_SOURCES.HOME, value: homeRegionId },
    { source: REGION_OWNERSHIP_SOURCES.REGION, value: explicitRegionId },
    { source: REGION_OWNERSHIP_SOURCES.PARENT, value: parentRegionId },
    { source: REGION_OWNERSHIP_SOURCES.REGION, value: region?.id }
  );

  return buildOwnershipSnapshot({
    entityType: options.entityType ?? entity.entityType ?? entity.type ?? "ENTITY",
    entityId: options.entityId ?? entity.id ?? null,
    regionId: candidate?.regionId ?? null,
    district,
    regionName,
    source:
      candidate?.source ??
      (toText(district) ? REGION_OWNERSHIP_SOURCES.DISTRICT : REGION_OWNERSHIP_SOURCES.UNASSIGNED),
  });
}

export function resolveCompanyOwnership(company = {}) {
  return resolveRegionOwnership(company, { entityType: "COMPANY" });
}

export function resolveRoomOwnership(room = {}) {
  return resolveRegionOwnership(room, { entityType: "ROOM" });
}

export function resolveDriverOwnership(driver = {}, options = {}) {
  const room = options.room ?? driver.room ?? null;
  const company = options.company ?? driver.company ?? null;
  return resolveRegionOwnership(driver, {
    entityType: "DRIVER",
    regionId: driver.regionId ?? null,
    homeRegionId: room?.regionId ?? company?.regionId ?? null,
    parentRegionId: room?.regionId ?? company?.regionId ?? null,
    district: driver.district ?? room?.district ?? company?.district ?? null,
    regionName: driver.region?.name ?? room?.region?.name ?? company?.region?.name ?? null,
  });
}

export function resolveVehicleOwnership(vehicle = {}, options = {}) {
  const room = options.room ?? vehicle.room ?? null;
  const company = options.company ?? vehicle.company ?? null;
  return resolveRegionOwnership(vehicle, {
    entityType: "VEHICLE",
    regionId: vehicle.regionId ?? null,
    homeRegionId: room?.regionId ?? company?.regionId ?? null,
    parentRegionId: room?.regionId ?? company?.regionId ?? null,
    district: vehicle.district ?? room?.district ?? company?.district ?? null,
    regionName: vehicle.region?.name ?? room?.region?.name ?? company?.region?.name ?? null,
  });
}

export function resolveShiftOwnership(shift = {}, options = {}) {
  const room = options.room ?? shift.room ?? null;
  const company = options.company ?? shift.company ?? null;
  const vehicle = options.vehicle ?? shift.vehicle ?? null;
  const driver = options.driver ?? shift.driver ?? null;
  return resolveRegionOwnership(shift, {
    entityType: "SHIFT",
    regionId: shift.regionId ?? null,
    homeRegionId:
      room?.regionId ??
      company?.regionId ??
      vehicle?.room?.regionId ??
      driver?.room?.regionId ??
      null,
    parentRegionId:
      room?.regionId ??
      company?.regionId ??
      vehicle?.room?.regionId ??
      driver?.room?.regionId ??
      null,
    district: shift.district ?? room?.district ?? company?.district ?? null,
    regionName:
      shift.region?.name ??
      room?.region?.name ??
      company?.region?.name ??
      vehicle?.room?.region?.name ??
      driver?.room?.region?.name ??
      null,
  });
}

export function resolveNotificationOwnership(notification = {}, options = {}) {
  const shift = options.shift ?? notification.shift ?? null;
  const room = options.room ?? notification.room ?? null;
  const vehicle = options.vehicle ?? notification.vehicle ?? null;
  const driver = options.driver ?? notification.driver ?? null;
  const company = options.company ?? notification.company ?? null;

  if (shift) {
    return resolveShiftOwnership(shift, {
      room: room ?? shift.room ?? null,
      company: company ?? shift.company ?? null,
      vehicle: vehicle ?? shift.vehicle ?? null,
      driver: driver ?? shift.driver ?? null,
    });
  }

  if (room) {
    return resolveRoomOwnership(room);
  }

  if (vehicle) {
    return resolveVehicleOwnership(vehicle, { room, company });
  }

  if (driver) {
    return resolveDriverOwnership(driver, { room, company });
  }

  if (company) {
    return resolveCompanyOwnership(company);
  }

  return resolveRegionOwnership(notification, {
    entityType: options.entityType ?? notification.entityType ?? "NOTIFICATION",
    regionId: options.regionId ?? notification.regionId ?? null,
    district: options.district ?? notification.district ?? null,
    regionName: options.regionName ?? notification.region?.name ?? null,
  });
}

export function requireSameRegionOrThrow({ company = null, room = null, label = "WRITE" } = {}) {
  const companyOwnership = company ? resolveCompanyOwnership(company) : null;
  const roomOwnership = room ? resolveRoomOwnership(room) : null;
  const companyRegionId = companyOwnership?.regionId ?? null;
  const roomRegionId = roomOwnership?.regionId ?? null;

  if (companyRegionId != null && roomRegionId != null && Number(companyRegionId) !== Number(roomRegionId)) {
    const error = new Error("Cross-region write not allowed");
    error.status = 409;
    error.code = "CROSS_REGION_WRITE_NOT_ALLOWED";
    error.meta = {
      label,
      companyId: company?.id ?? null,
      companyRegionId,
      roomId: room?.id ?? null,
      roomRegionId,
    };
    throw error;
  }

  return { companyRegionId, roomRegionId };
}

export function buildRegionRoutingKey(input = {}) {
  return buildRegionKey(input);
}

export function buildZoneRoutingKey(input = {}) {
  return buildRegionKey({
    regionId: input?.regionId ?? null,
    district: input?.district ?? input?.zone ?? null,
    regionName: input?.regionName ?? null,
  });
}

export function resolveZoneOwnership(entity = {}, options = {}) {
  const regionOwnership = resolveRegionOwnership(entity, {
    ...options,
    entityType: options.entityType ?? entity.entityType ?? entity.type ?? "ZONE",
    district: options.district ?? entity.district ?? entity.zone ?? null,
  });
  return {
    ...regionOwnership,
    zoneKey: buildZoneRoutingKey(regionOwnership),
  };
}

export function buildShiftRegionContext(shift = {}, options = {}) {
  const regionOwnership = resolveShiftOwnership(shift, options);
  const regionRoutingKey = buildRegionRoutingKey(regionOwnership);
  const regionContext = {
    entityType: regionOwnership.entityType,
    entityId: regionOwnership.entityId,
    regionId: regionOwnership.regionId,
    district: regionOwnership.district,
    regionName: regionOwnership.regionName,
    source: regionOwnership.source,
    hasRegion: regionOwnership.hasRegion,
    routingKey: regionRoutingKey,
  };

  return {
    regionOwnership,
    regionRoutingKey,
    regionContext,
  };
}

export function decorateShiftWithRegionContext(shift = {}, options = {}) {
  if (!shift || typeof shift !== "object") return shift;
  const region = buildShiftRegionContext(shift, options);
  return {
    ...shift,
    ...region,
  };
}

export {
  REGION_OWNERSHIP_SOURCES,
  buildOwnershipSnapshot,
  buildRegionKey,
  pickRegionCandidate,
  toPositiveInt,
  toText,
};
