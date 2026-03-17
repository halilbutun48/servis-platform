import {
  banner,
  step,
  must,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
} from "./_harness.js";
import { prisma } from "../src/prisma.js";

function iso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

async function createVehicle(roomToken, suffix, capacity = 16) {
  const plate = `M543-${suffix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity, speedLimitKmh: 90 },
  });
  must(`vehicle create ok (${plate})`, r.ok);
  const id = Number(r.json?.id || r.json?.vehicle?.id || 0);
  must(`vehicleId present (${plate})`, id > 0);
  return { id, plate, capacity };
}

async function createDriver(roomToken, suffix) {
  const fullName = `M54.3 Driver ${suffix} ${Math.random().toString(36).slice(2, 5)}`;
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone: `90555${Date.now().toString().slice(-7)}`, deviceInfo: `m54-3-${suffix}` },
  });
  must(`driver create ok (${suffix})`, r.ok);
  const id = Number(r.json?.id || r.json?.driver?.id || 0);
  must(`driverId present (${suffix})`, id > 0);
  return { id, fullName };
}

async function bindVehicle(roomToken, vehicleId, driverId) {
  const r = await reqJson("PUT", `/api/vehicles/${vehicleId}/bind-driver`, {
    token: roomToken,
    body: { driverId },
  });
  must(`bind ok vehicle=${vehicleId} driver=${driverId}`, r.ok);
}

async function createShift(companyToken, roomId, tag) {
  const r = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      roomId,
      startAt: iso(45 * 60 * 1000),
      endAt: iso(3 * 60 * 60 * 1000),
      direction: "INBOUND",
      pattern: "ONE_WAY",
      hubLat: 41.0301,
      hubLng: 28.9951,
      stops: [
        { name: `${tag} Root Stop A`, lat: 41.0480, lng: 29.0060, order: 1, type: "COMMON" },
        { name: `${tag} Root Stop B`, lat: 41.0580, lng: 29.0260, order: 2, type: "COMMON" },
      ],
    },
  });
  must(`shift create ok (${tag})`, r.ok);
  const shiftId = Number(r.json?.id || r.json?.shift?.id || 0);
  must(`shiftId present (${tag})`, shiftId > 0);
  return shiftId;
}

function buildPeopleItems(tag) {
  const items = [];
  for (let i = 0; i < 16; i += 1) {
    items.push({
      fullName: `${tag} ClusterA ${i + 1}`,
      phone: `90531${String(100000 + i).padStart(6, "0")}`,
      address: `${tag} Address A ${i + 1}`,
      lat: 41.0475 + i * 0.00012,
      lng: 29.0055 + i * 0.00012,
      geoManualOverride: true,
    });
  }
  for (let i = 0; i < 2; i += 1) {
    items.push({
      fullName: `${tag} ClusterB ${i + 1}`,
      phone: `90532${String(200000 + i).padStart(6, "0")}`,
      address: `${tag} Address B ${i + 1}`,
      lat: 41.0590 + i * 0.0002,
      lng: 29.0270 + i * 0.0002,
      geoManualOverride: true,
    });
  }
  return items;
}

async function putPeople(companyToken, shiftId, items) {
  const r = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
    token: companyToken,
    body: { items },
  });
  must("shift people upsert ok", r.ok && r.json?.ok === true);
}

async function generateStops(companyToken, shiftId) {
  const r = await reqJson("POST", `/api/shifts/${shiftId}/stops/generate?mode=REPLACE`, {
    token: companyToken,
    body: {},
  });
  must("stops generate ok", r.ok && r.json?.ok === true);
}

function sameCoord(a, b, tol = 0.00001) {
  return Math.abs(Number(a?.lat || 0) - Number(b?.lat || 0)) <= tol && Math.abs(Number(a?.lng || 0) - Number(b?.lng || 0)) <= tol;
}

async function main() {
  banner("M54.3 DISPATCH APPROVE + REPACK CHECK");

  const roomToken = await loginFirst("room");
  const companyToken = await loginFirst("company");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);

  const { roomId } = await getRoomCompanyIds(roomToken, companyToken);
  must("roomId present", Number(roomId || 0) > 0);

  step("create dedicated pool assets");
  const v1 = await createVehicle(roomToken, "A", 16);
  const v2 = await createVehicle(roomToken, "B", 16);
  const d1 = await createDriver(roomToken, "A");
  const d2 = await createDriver(roomToken, "B");
  await bindVehicle(roomToken, v1.id, d1.id);
  await bindVehicle(roomToken, v2.id, d2.id);

  step("create demand-heavy shift and generate root stops");
  const shiftId = await createShift(companyToken, roomId, "M54-3");
  const peopleItems = buildPeopleItems(`M54-3-${shiftId}`);
  await putPeople(companyToken, shiftId, peopleItems);
  await generateStops(companyToken, shiftId);

  step("load dispatch preview");
  const preview0 = await reqJson("GET", `/api/shifts/${shiftId}/dispatch-preview`, { token: roomToken });
  must("dispatch preview ok", preview0.ok && preview0.json?.ok === true);
  const suggestions0 = Array.isArray(preview0.json?.suggestions) ? preview0.json.suggestions : [];
  must("dispatch preview suggestions >= 2", suggestions0.length >= 2);
  must("preview groupKey present", String(preview0.json?.groupKey || "").length > 0);

  suggestions0.forEach((s) => {
    must(`suggestion#${s.splitIndex} vehicle present`, Number(s?.vehicleId || 0) > 0);
    must(`suggestion#${s.splitIndex} driver present`, Number(s?.driverId || 0) > 0);
    must(`suggestion#${s.splitIndex} stopCount matches`, Number(s?.stopCount || 0) === (Array.isArray(s?.stops) ? s.stops.length : 0));
    if (Number(s?.stopCount || 0) > 0) {
      must(`suggestion#${s.splitIndex} duration > 0`, Number(s?.totalDurationSec || 0) > 0);
      must(`suggestion#${s.splitIndex} distance > 0`, Number(s?.totalDistanceM || 0) > 0);
    }
  });

  step("validate override conflict checks");
  const duplicateVehicle = await reqJson("POST", `/api/shifts/${shiftId}/dispatch-preview`, {
    token: roomToken,
    body: {
      overrides: suggestions0.slice(0, 2).map((s, idx) => ({
        splitIndex: Number(s.splitIndex),
        vehicleId: idx === 0 ? Number(suggestions0[0].vehicleId) : Number(suggestions0[0].vehicleId),
        driverId: Number(s.driverId),
      })),
    },
  });
  must("duplicate vehicle rejected", duplicateVehicle.status === 409);

  const duplicateDriver = await reqJson("POST", `/api/shifts/${shiftId}/dispatch-preview`, {
    token: roomToken,
    body: {
      overrides: suggestions0.slice(0, 2).map((s, idx) => ({
        splitIndex: Number(s.splitIndex),
        vehicleId: Number(s.vehicleId),
        driverId: idx === 0 ? Number(suggestions0[0].driverId) : Number(suggestions0[0].driverId),
      })),
    },
  });
  must("duplicate driver rejected", duplicateDriver.status === 409);

  const explicitPreview = await reqJson("POST", `/api/shifts/${shiftId}/dispatch-preview`, {
    token: roomToken,
    body: {
      overrides: suggestions0.map((s) => ({
        splitIndex: Number(s.splitIndex),
        vehicleId: Number(s.vehicleId),
        driverId: Number(s.driverId),
      })),
    },
  });
  must("dispatch preview with explicit overrides ok", explicitPreview.ok && explicitPreview.json?.ok === true);
  const suggestions = Array.isArray(explicitPreview.json?.suggestions) ? explicitPreview.json.suggestions : [];
  must("explicit preview suggestions size stable", suggestions.length === suggestions0.length);

  step("approve split plan");
  const approve = await reqJson("POST", `/api/shifts/${shiftId}/auto-split-approve`, {
    token: roomToken,
    body: {
      overrides: suggestions.map((s) => ({
        splitIndex: Number(s.splitIndex),
        vehicleId: Number(s.vehicleId),
        driverId: Number(s.driverId),
      })),
    },
  });
  must("auto split approve ok", approve.ok && approve.json?.ok === true);
  must("rootStatus SPLIT", String(approve.json?.rootStatus || "") === "SPLIT");
  must("child count matches suggestions", Number(approve.json?.childCount || 0) === suggestions.length);
  must("groupKey returned on approve", String(approve.json?.groupKey || "").length > 0);

  step("validate persisted child shifts against preview plan");
  const rootShift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      stops: { orderBy: { order: "asc" } },
      people: { select: { personelId: true } },
    },
  });
  must("root shift exists in db", !!rootShift);
  must("root shift status SPLIT in db", String(rootShift?.status || "") === "SPLIT");

  const rootStopIds = new Set((rootShift?.stops || []).map((s) => Number(s.id)));
  const children = await prisma.shift.findMany({
    where: { splitRootId: shiftId },
    include: {
      stops: {
        orderBy: { order: "asc" },
        include: { assignments: { orderBy: { personelId: "asc" } } },
      },
      people: { select: { personelId: true } },
    },
    orderBy: { splitIndex: "asc" },
  });
  must("children persisted", children.length === suggestions.length);

  const seenVehicleIds = new Set();
  const seenDriverIds = new Set();
  const seenPersonelIds = new Set();
  const expectedTotalPeople = peopleItems.length;
  let countedPeople = 0;

  for (const child of children) {
    const splitIndex = Number(child.splitIndex || 0);
    const preview = suggestions.find((s) => Number(s.splitIndex || 0) === splitIndex);
    must(`preview exists for child splitIndex=${splitIndex}`, !!preview);
    must(`child#${splitIndex} status APPROVED`, String(child.status || "") === "APPROVED");
    must(`child#${splitIndex} vehicle unique`, !seenVehicleIds.has(Number(child.vehicleId || 0)));
    must(`child#${splitIndex} driver unique`, !seenDriverIds.has(Number(child.driverId || 0)));
    seenVehicleIds.add(Number(child.vehicleId || 0));
    seenDriverIds.add(Number(child.driverId || 0));

    must(`child#${splitIndex} stop count matches preview`, child.stops.length === Number(preview.stopCount || 0));
    must(`child#${splitIndex} allocated pax matches preview`, child.people.length === Number(preview.allocatedPax || 0));

    countedPeople += child.people.length;
    for (const p of child.people) {
      const pid = Number(p.personelId || 0);
      must(`child#${splitIndex} unique personel ${pid}`, !seenPersonelIds.has(pid));
      seenPersonelIds.add(pid);
    }

    child.stops.forEach((stop, idx) => {
      must(`child#${splitIndex} stop order ${idx + 1}`, Number(stop.order || 0) === idx + 1);
      must(`child#${splitIndex} stop recreated`, !rootStopIds.has(Number(stop.id || 0)));
      const previewStop = preview.stops[idx];
      must(`child#${splitIndex} preview stop exists idx=${idx + 1}`, !!previewStop);
      must(`child#${splitIndex} stop coord matches preview idx=${idx + 1}`, sameCoord(stop, previewStop));
      const assignmentCount = Array.isArray(stop.assignments) ? stop.assignments.length : 0;
      const previewAssignmentCount = Number(previewStop?.assignmentCount || 0);
      must(`child#${splitIndex} assignment count matches preview idx=${idx + 1}`, assignmentCount === previewAssignmentCount);
    });
  }

  must("all people distributed exactly once", countedPeople === expectedTotalPeople && seenPersonelIds.size === expectedTotalPeople);

  step("dedupeKey runtime bug no longer blocks approve response");
  must("approve response includes childShiftIds", Array.isArray(approve.json?.childShiftIds) && approve.json.childShiftIds.length === children.length);

  console.log("M54.3 DISPATCH APPROVE + REPACK CHECK PASS");
}

main()
  .catch((e) => {
    console.error(e?.stack || e?.message || String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
