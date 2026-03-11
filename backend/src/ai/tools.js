import { prisma } from "../prisma.js";

function trimOrNull(v) {
  const s = String(v || "").trim();
  return s || null;
}

function nonEmpty(list) {
  return (Array.isArray(list) ? list : []).filter(Boolean);
}

function diffMinutes(a, b = new Date()) {
  const av = a ? new Date(a) : null;
  if (!av || Number.isNaN(av.getTime())) return null;
  return Math.round((av.getTime() - b.getTime()) / 60000);
}

function ensureShiftScope(user, shift) {
  if (!shift) {
    const e = new Error("SHIFT_NOT_FOUND");
    e.status = 404;
    e.code = "SHIFT_NOT_FOUND";
    throw e;
  }
  if (String(user.role) === "SUPER_ADMIN") return;
  if (String(user.role) === "COMPANY") {
    if (Number(shift.companyId) !== Number(user.companyId || 0)) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      e.code = "FORBIDDEN";
      throw e;
    }
    return;
  }
  if (String(user.role) === "ROOM") {
    const roomId = Number(user.roomId || 0);
    const hasOffer = Array.isArray(shift.offers)
      ? shift.offers.some((x) => Number(x.roomId) === roomId && ["OPEN", "COUNTERED", "ACCEPTED"].includes(String(x.status || "")))
      : false;
    if (Number(shift.roomId || 0) !== roomId && !hasOffer) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      e.code = "FORBIDDEN";
      throw e;
    }
    return;
  }
  const e = new Error("FORBIDDEN");
  e.status = 403;
  e.code = "FORBIDDEN";
  throw e;
}

async function ensureVehicleScope(user, vehicle) {
  if (!vehicle) {
    const e = new Error("VEHICLE_NOT_FOUND");
    e.status = 404;
    e.code = "VEHICLE_NOT_FOUND";
    throw e;
  }
  if (String(user.role) === "SUPER_ADMIN") return;
  if (String(user.role) === "ROOM") {
    if (Number(vehicle.roomId) !== Number(user.roomId || 0)) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      e.code = "FORBIDDEN";
      throw e;
    }
    return;
  }
  if (String(user.role) === "COMPANY") {
    const linked = await prisma.shift.findFirst({
      where: { companyId: Number(user.companyId || 0), vehicleId: Number(vehicle.id) },
      select: { id: true },
    });
    if (!linked) {
      const e = new Error("FORBIDDEN");
      e.status = 403;
      e.code = "FORBIDDEN";
      throw e;
    }
    return;
  }
  const e = new Error("FORBIDDEN");
  e.status = 403;
  e.code = "FORBIDDEN";
  throw e;
}

function buildShiftFacts(shift) {
  const facts = [];
  facts.push(`Durum: ${shift.status}`);
  facts.push(`Şirket: ${shift.company?.name || "-"}`);
  facts.push(`Oda: ${shift.room?.name || (shift.roomId ? `#${shift.roomId}` : "atanmamış")}`);
  facts.push(`Araç: ${shift.vehicle?.plate || "atanmamış"}`);
  facts.push(`Sürücü: ${shift.driver?.fullName || "atanmamış"}`);
  facts.push(`Durak sayısı: ${Number(shift.stopCount || 0)}`);
  facts.push(`Personel sayısı: ${Number(shift.peopleCount || 0)}`);
  if (shift.requiredPax != null) facts.push(`Gerekli kapasite: ${shift.requiredPax}`);
  if (shift.agreementId) facts.push(`Agreement bağlı: #${shift.agreementId}`);
  if (shift.direction) facts.push(`Yön: ${shift.direction}`);
  if (shift.pattern) facts.push(`Pattern: ${shift.pattern}`);
  return facts;
}

function buildShiftRisks(shift) {
  const risks = [];
  const minToStart = diffMinutes(shift.startAt);
  if (minToStart != null && minToStart <= 60 && minToStart >= 0) {
    risks.push(`Başlangıca ${minToStart} dakika kaldı.`);
  }
  if (["APPROVED", "ACTIVE"].includes(String(shift.status || "")) && !shift.vehicle) {
    risks.push("Araç ataması yok.");
  }
  if (["APPROVED", "ACTIVE"].includes(String(shift.status || "")) && !shift.driver) {
    risks.push("Sürücü ataması yok.");
  }
  if (Number(shift.requiredPax || 0) > Number(shift.vehicle?.capacity || 0) && shift.vehicle?.capacity) {
    risks.push(`Gerekli kapasite (${shift.requiredPax}) araç kapasitesini (${shift.vehicle.capacity}) aşıyor.`);
  }
  if (shift.roomOfferDecision === "PENDING" && (shift.roomOfferAmount != null || shift.roomOfferVehicleId != null)) {
    risks.push("Room offer kararı bekliyor.");
  }
  if (shift.extendRequestedEndAt && shift.extendDecision === "PENDING") {
    risks.push("Süre uzatma talebi beklemede.");
  }
  if (shift.status === "REQUESTED" && !shift.roomId && Number(shift.openOfferCount || 0) === 0) {
    risks.push("Shift REQUESTED ama aktif oda teklifi görünmüyor.");
  }
  return risks;
}

function buildShiftBlocks(shift) {
  const blocks = [];
  if (["APPROVED", "ACTIVE"].includes(String(shift.status || "")) && !shift.vehicle) blocks.push("VEHICLE_MISSING");
  if (["APPROVED", "ACTIVE"].includes(String(shift.status || "")) && !shift.driver) blocks.push("DRIVER_MISSING");
  if (!Number(shift.stopCount || 0)) blocks.push("STOPS_MISSING");
  if (Number(shift.requiredPax || 0) > Number(shift.vehicle?.capacity || 0) && shift.vehicle?.capacity) blocks.push("CAPACITY_EXCEEDED");
  if (shift.extendRequestedEndAt && shift.extendDecision === "PENDING") blocks.push("EXTEND_PENDING");
  return blocks;
}

function buildShiftSuggestions(shift) {
  const suggestions = [];
  if (!shift.vehicle && ["REQUESTED", "APPROVED"].includes(String(shift.status || ""))) {
    suggestions.push("Uygun araç atamasını kontrol et.");
  }
  if (!shift.driver && ["APPROVED", "ACTIVE"].includes(String(shift.status || ""))) {
    suggestions.push("Sürücü atamasını veya yedek sürücüyü kontrol et.");
  }
  if (shift.roomOfferDecision === "PENDING" && (shift.roomOfferAmount != null || shift.roomOfferVehicleId != null)) {
    suggestions.push("Room offer kararını netleştir veya karşı teklif akışını kapat.");
  }
  if (Number(shift.requiredPax || 0) > Number(shift.vehicle?.capacity || 0) && shift.vehicle?.capacity) {
    suggestions.push("Kapasite için araç değişimi veya split değerlendir.");
  }
  if (!shift.stopCount) {
    suggestions.push("Durak üretimi/persist adımını kontrol et.");
  }
  return nonEmpty(suggestions);
}

function buildShiftNextChecks(shift, blocks) {
  const checks = [];
  if (blocks.includes("VEHICLE_MISSING")) checks.push("Araç atama ekranını ve uygun araç havuzunu aç.");
  if (blocks.includes("DRIVER_MISSING")) checks.push("Sürücü müsaitlik ve bind ekranını kontrol et.");
  if (blocks.includes("STOPS_MISSING")) checks.push("Durak üret/persist akışını yeniden doğrula.");
  if (blocks.includes("CAPACITY_EXCEEDED")) checks.push("Kapasite için split veya daha büyük araç değerlendir.");
  if (!checks.length) checks.push("Vardiya için öne çıkan bloklayıcı görünmüyor; canlı takip ve audit izini izle.");
  return checks;
}

function buildShiftSeverity(shift, risks, blocks) {
  if (blocks.length) return "CRITICAL";
  if (risks.length >= 2) return "WARN";
  if (shift.status === "ACTIVE") return "INFO";
  return "OK";
}

function buildShiftSummaryText(shift, risks, blocks) {
  const bits = [
    `Vardiya ${shift.status} durumda.`,
    shift.vehicle?.plate ? `Araç ${shift.vehicle.plate}.` : "Araç ataması yok.",
    shift.driver?.fullName ? `Sürücü ${shift.driver.fullName}.` : "Sürücü ataması yok.",
    `Durak ${shift.stopCount || 0}, personel ${shift.peopleCount || 0}.`,
  ];
  if (blocks.length) bits.push(`Bloklayıcı: ${blocks[0]}`);
  else if (risks.length) bits.push(`Öne çıkan risk: ${risks[0]}`);
  return bits.join(" ");
}

function buildConflictExplainText(risks, blocks) {
  if (blocks.length) {
    return `Bloklayıcı durumlar: ${blocks.join(", ")}. Bu yüzden işlem akışı riskli veya eksik görünüyor.`;
  }
  if (!risks.length) {
    return "Belirgin bir bloklayıcı çatışma görünmüyor; mevcut veri daha çok operasyon özeti veriyor.";
  }
  return `Başlıca çatışma/gerilim noktaları: ${risks.join(" ")}`;
}

function buildOpsNoteDraftText(shift, risks, suggestions, blocks) {
  const lines = [];
  lines.push(`Operasyon notu — Shift #${shift.id}`);
  lines.push(`Durum: ${shift.status}`);
  lines.push(`Şirket: ${shift.company?.name || "-"}`);
  lines.push(`Oda: ${shift.room?.name || "-"}`);
  lines.push(`Araç/Sürücü: ${shift.vehicle?.plate || "-"} / ${shift.driver?.fullName || "-"}`);
  lines.push(`Durak/Personel: ${shift.stopCount || 0} / ${shift.peopleCount || 0}`);
  if (blocks.length) lines.push(`Bloklayıcılar: ${blocks.join("; ")}`);
  if (risks.length) lines.push(`Riskler: ${risks.join("; ")}`);
  if (suggestions.length) lines.push(`Önerilen aksiyonlar: ${suggestions.join("; ")}`);
  return lines.join("\n");
}

function buildVehicleFacts(vehicle) {
  const facts = [];
  facts.push(`Araç: ${vehicle.plate}`);
  facts.push(`Oda: ${vehicle.room?.name || `#${vehicle.roomId}`}`);
  facts.push(`Durum: ${vehicle.status}`);
  facts.push(`GPS UI state: ${vehicle.gpsState?.lastUiStatus || "UNKNOWN"}`);
  facts.push(`Telematics cihaz sayısı: ${vehicle.deviceCount}`);
  facts.push(`Aktif cihaz sayısı: ${vehicle.activeDeviceCount}`);
  facts.push(`Son konum zamanı: ${vehicle.gpsLast?.at || "-"}`);
  if (vehicle.driver?.fullName) facts.push(`Varsayılan sürücü: ${vehicle.driver.fullName}`);
  if (vehicle.currentCompanyNames?.length) facts.push(`Aktif şirket bağlantısı: ${vehicle.currentCompanyNames.join(", ")}`);
  return facts;
}

function buildVehicleRisks(vehicle) {
  const risks = [];
  const lastAt = vehicle.gpsLast?.at ? new Date(vehicle.gpsLast.at) : null;
  const ageMin = lastAt && !Number.isNaN(lastAt.getTime()) ? Math.round((Date.now() - lastAt.getTime()) / 60000) : null;
  if (!vehicle.activeDeviceCount) risks.push("Aktif telematics device görünmüyor.");
  if (ageMin != null && ageMin >= 30) risks.push(`Son GPS akışı ${ageMin} dakikadır güncellenmedi.`);
  if (String(vehicle.gpsState?.lastUiStatus || "") === "STALE") risks.push("GPS UI state STALE.");
  if (vehicle.deviceCount > 0 && vehicle.activeDeviceCount === 0) risks.push("Cihaz var ama hiçbiri ACTIVE değil.");
  return risks;
}

function buildVehicleBlocks(vehicle) {
  const blocks = [];
  if (!vehicle.activeDeviceCount) blocks.push("NO_ACTIVE_DEVICE");
  if (!vehicle.gpsLast?.at) blocks.push("NO_GPS_SIGNAL");
  if (String(vehicle.gpsState?.lastUiStatus || "") === "STALE") blocks.push("GPS_STALE");
  return blocks;
}

function buildVehicleSuggestions(vehicle) {
  const suggestions = [];
  if (!vehicle.activeDeviceCount) suggestions.push("Device create/rotate ve ACTIVE durumunu kontrol et.");
  if (String(vehicle.gpsState?.lastUiStatus || "") === "STALE") suggestions.push("Son ingest zamanını ve telematics push hattını doğrula.");
  if (!vehicle.driver?.id) suggestions.push("Araç için varsayılan sürücü bağını kontrol et.");
  return nonEmpty(suggestions);
}

function buildVehicleNextChecks(vehicle, blocks) {
  const checks = [];
  if (blocks.includes("NO_ACTIVE_DEVICE")) checks.push("ROOM > Vehicles > Telematics sekmesinde ACTIVE device kontrolü yap.");
  if (blocks.includes("NO_GPS_SIGNAL")) checks.push("Direct push/vendor provider son ingest denemesini doğrula.");
  if (blocks.includes("GPS_STALE")) checks.push("gpsState, notify ve room/company canlı panelini karşılaştır.");
  if (!checks.length) checks.push("Araç için kritik bloklayıcı görünmüyor; canlı akışı izlemeye devam et.");
  return checks;
}

function buildVehicleSeverity(risks, blocks) {
  if (blocks.length) return "CRITICAL";
  if (risks.length >= 2) return "WARN";
  if (risks.length === 1) return "INFO";
  return "OK";
}

function buildVehicleSummaryText(vehicle, risks, blocks) {
  if (blocks.length) {
    return `Telematics sağlık özeti: ${vehicle.plate} için bloklayıcı durum var (${blocks[0]}).`;
  }
  return `Telematics sağlık özeti: ${vehicle.plate} için ${risks.length ? risks[0] : "kritik alarm görünmüyor."}`;
}

export async function getShiftContext(user, shiftId) {
  const shift = await prisma.shift.findUnique({
    where: { id: Number(shiftId) },
    include: {
      company: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, capacity: true, status: true } },
      driver: { select: { id: true, fullName: true, phone: true } },
      stops: { select: { id: true, order: true, state: true } },
      offers: { select: { id: true, roomId: true, status: true } },
      agreement: { select: { id: true, status: true, startDate: true, endDate: true } },
      progress: { select: { id: true, lastReachedOrder: true, startedAt: true, pausedAt: true, completedAt: true } },
      _count: { select: { people: true, assignments: true } },
      organizationPlan: { select: { id: true, stops: { select: { passengerCount: true } } } },
    },
  });
  ensureShiftScope(user, shift);

  const orgPassengerCount = Array.isArray(shift?.organizationPlan?.stops)
    ? shift.organizationPlan.stops.reduce((sum, x) => sum + Math.max(0, Number(x?.passengerCount || 0)), 0)
    : 0;
  const requiredPax = Math.max(
    Number(shift?._count?.assignments || 0),
    Number(shift?._count?.people || 0),
    Number(shift?.requiredPaxOverride || 0),
    Number(orgPassengerCount || 0),
    0
  );

  return {
    id: shift.id,
    type: "shift",
    companyId: shift.companyId,
    roomId: shift.roomId,
    vehicleId: shift.vehicleId,
    driverId: shift.driverId,
    company: shift.company,
    room: shift.room,
    vehicle: shift.vehicle,
    driver: shift.driver,
    agreementId: shift.agreementId,
    agreement: shift.agreement,
    status: shift.status,
    startAt: shift.startAt,
    endAt: shift.endAt,
    stopCount: Array.isArray(shift.stops) ? shift.stops.length : 0,
    openOfferCount: Array.isArray(shift.offers) ? shift.offers.filter((x) => ["OPEN", "COUNTERED"].includes(String(x.status || ""))).length : 0,
    offeredRoomIds: Array.isArray(shift.offers) ? shift.offers.map((x) => x.roomId) : [],
    peopleCount: Number(shift?._count?.people || 0),
    assignmentCount: Number(shift?._count?.assignments || 0),
    requiredPax,
    requiredPaxOverride: Number(shift?.requiredPaxOverride || 0),
    direction: shift.direction,
    pattern: shift.pattern,
    roomOfferDecision: shift.roomOfferDecision,
    roomOfferAmount: shift.roomOfferAmount,
    roomOfferVehicleId: shift.roomOfferVehicleId,
    companyOfferAmount: shift.companyOfferAmount,
    companyOfferVehicleId: shift.companyOfferVehicleId,
    extendRequestedEndAt: shift.extendRequestedEndAt,
    extendDecision: shift.extendDecision,
    progress: shift.progress,
  };
}

export async function getVehicleContext(user, vehicleId) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(vehicleId) },
    include: {
      room: { select: { id: true, name: true } },
      driver: { select: { id: true, fullName: true, phone: true } },
      gpsLast: true,
      gpsState: true,
      gpsDevices: { orderBy: [{ id: "desc" }] },
      shifts: {
        where: { status: { in: ["APPROVED", "ACTIVE", "REQUESTED"] } },
        orderBy: [{ startAt: "desc" }],
        take: 5,
        include: { company: { select: { id: true, name: true } }, room: { select: { id: true, name: true } } },
      },
    },
  });
  await ensureVehicleScope(user, vehicle);

  const currentCompanyNames = Array.from(new Set((vehicle.shifts || []).map((x) => trimOrNull(x.company?.name)).filter(Boolean)));

  return {
    id: vehicle.id,
    type: "vehicle",
    roomId: vehicle.roomId,
    plate: vehicle.plate,
    status: vehicle.status,
    room: vehicle.room,
    driver: vehicle.driver,
    gpsLast: vehicle.gpsLast,
    gpsState: vehicle.gpsState,
    devices: vehicle.gpsDevices || [],
    deviceCount: Array.isArray(vehicle.gpsDevices) ? vehicle.gpsDevices.length : 0,
    activeDeviceCount: Array.isArray(vehicle.gpsDevices) ? vehicle.gpsDevices.filter((x) => x.status === "ACTIVE").length : 0,
    currentShiftIds: Array.isArray(vehicle.shifts) ? vehicle.shifts.map((x) => x.id) : [],
    currentCompanyNames,
  };
}

function makeResponse({ summary, facts, risks, suggestions, noteDraft = null, severity, blocks, nextChecks, references }) {
  return {
    summary,
    facts,
    risks,
    suggestions,
    noteDraft,
    severity,
    blocks,
    nextChecks,
    references,
  };
}

export function buildCopilotPayload(intent, context) {
  if (intent === "SHIFT_SUMMARY") {
    const facts = buildShiftFacts(context);
    const risks = buildShiftRisks(context);
    const blocks = buildShiftBlocks(context);
    const suggestions = buildShiftSuggestions(context);
    const nextChecks = buildShiftNextChecks(context, blocks);
    return makeResponse({
      summary: buildShiftSummaryText(context, risks, blocks),
      facts,
      risks,
      suggestions,
      severity: buildShiftSeverity(context, risks, blocks),
      blocks,
      nextChecks,
      references: { shiftId: context.id, vehicleId: context.vehicleId || null, driverId: context.driverId || null, roomId: context.roomId || null, companyId: context.companyId || null },
    });
  }

  if (intent === "CONFLICT_EXPLAIN") {
    const facts = buildShiftFacts(context);
    const risks = buildShiftRisks(context);
    const blocks = buildShiftBlocks(context);
    const suggestions = buildShiftSuggestions(context);
    const nextChecks = buildShiftNextChecks(context, blocks);
    return makeResponse({
      summary: buildConflictExplainText(risks, blocks),
      facts,
      risks,
      suggestions,
      severity: buildShiftSeverity(context, risks, blocks),
      blocks,
      nextChecks,
      references: { shiftId: context.id, vehicleId: context.vehicleId || null, driverId: context.driverId || null, roomId: context.roomId || null, companyId: context.companyId || null },
    });
  }

  if (intent === "OPS_NOTE_DRAFT") {
    const facts = buildShiftFacts(context);
    const risks = buildShiftRisks(context);
    const blocks = buildShiftBlocks(context);
    const suggestions = buildShiftSuggestions(context);
    const nextChecks = buildShiftNextChecks(context, blocks);
    return makeResponse({
      summary: "Operasyon paylaşımı için taslak not üretildi.",
      facts,
      risks,
      suggestions,
      noteDraft: buildOpsNoteDraftText(context, risks, suggestions, blocks),
      severity: buildShiftSeverity(context, risks, blocks),
      blocks,
      nextChecks,
      references: { shiftId: context.id, vehicleId: context.vehicleId || null, driverId: context.driverId || null, roomId: context.roomId || null, companyId: context.companyId || null },
    });
  }

  if (intent === "TELEMATICS_HEALTH") {
    const facts = buildVehicleFacts(context);
    const risks = buildVehicleRisks(context);
    const blocks = buildVehicleBlocks(context);
    const suggestions = buildVehicleSuggestions(context);
    const nextChecks = buildVehicleNextChecks(context, blocks);
    return makeResponse({
      summary: buildVehicleSummaryText(context, risks, blocks),
      facts,
      risks,
      suggestions,
      severity: buildVehicleSeverity(risks, blocks),
      blocks,
      nextChecks,
      references: { vehicleId: context.id, roomId: context.roomId || null },
    });
  }

  const e = new Error("UNSUPPORTED_INTENT");
  e.status = 400;
  e.code = "UNSUPPORTED_INTENT";
  throw e;
}

