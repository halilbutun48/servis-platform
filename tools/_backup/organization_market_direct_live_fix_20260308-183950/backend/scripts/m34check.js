// backend/scripts/m34check.js
// M34CHECK (lightweight): Plan Builder Step-0 precheck contract + single apply flow (create market shift, people, stops) + bulk offers

import { prisma } from "../src/prisma.js";
import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function isoPlusMin(min) {
  return new Date(Date.now() + Number(min) * 60_000).toISOString();
}

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}

function mustOk(r, label) {
  if (r?.ok) {
    console.log(`✅ ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 900);
  console.error(`❌ ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}

async function ensureCompanyHub(companyToken) {
  step("set company hub (non-zero)");
  const r = await reqJson("PUT", "/api/company/hub", {
    token: companyToken,
    body: { hubLat: 41.0082, hubLng: 28.9784 },
  });
  mustOk(r, "company hub set");
  assertOk(r.json?.ok === true, "hub api ok");
}

async function ensureEnoughPersonels(companyId, min = 6) {
  const total = await prisma.personel.count({ where: { companyId } });

  if (total < min) {
    step(`create missing personels via prisma (need ${min - total})`);
    const need = min - total;
    for (let i = 0; i < need; i++) {
      await prisma.personel.create({
        data: {
          companyId,
          fullName: `M34 Personel ${rand(4)}-${i + 1}`,
          phone: `m34-${rand(8)}-${Date.now()}-${i}`,
          homeLat: 41.01,
          homeLng: 28.98,
          geoStatus: "OK",
          geoManualOverride: true,
          geoUpdatedAt: new Date(),
        },
      });
    }
  }

  // Fix blockers for Step-0: missing/0,0 -> set a valid location
  step("normalize personel locations (no null/0,0) for Step-0 blockers");
  const upd = await prisma.personel.updateMany({
    where: {
      companyId,
      OR: [{ homeLat: null }, { homeLng: null }, { homeLat: 0 }, { homeLng: 0 }],
    },
    data: {
      homeLat: 41.0115,
      homeLng: 28.982,
      geoStatus: "OK",
      geoManualOverride: true,
      geoUpdatedAt: new Date(),
    },
  });
  assertOk(typeof upd?.count === "number", "personel updateMany ran");
}

async function main() {
  banner("M34CHECK: precheck + apply + offers");

  const superToken = await loginFirst("super");
  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  step("resolve companyId + roomId via /api/me");
  const meC = await reqJson("GET", "/api/me", { token: companyToken });
  mustOk(meC, "me company");
  const companyId = Number(meC.json?.companyId);
  assertOk(Number.isFinite(companyId) && companyId > 0, "companyId present");

  const meR = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meR, "me room");
  const room1Id = Number(meR.json?.roomId);
  assertOk(Number.isFinite(room1Id) && room1Id > 0, "roomId present");

  await ensureCompanyHub(companyToken);
  await ensureEnoughPersonels(companyId, 6);

  step("plan-builder precheck contract");
  const pre = await reqJson("GET", "/api/plan-builder/precheck", { token: companyToken });
  mustOk(pre, "precheck http");
  assertOk(pre.json?.ok === true, "precheck ok");
  assertOk(pre.json?.companyHub?.ok === true, "precheck hub ok");
  assertOk(Number(pre.json?.personels?.missingLatLng ?? -1) === 0, "missingLatLng = 0");
  assertOk(Number(pre.json?.personels?.zeroLatLng ?? -1) === 0, "zeroLatLng = 0");
  assertOk(typeof pre.json?.solver?.mode === "string", "solver.mode present");

  step("create room2 (SUPER_ADMIN) for multi-room offer test");
  const room2 = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name: `M34 Room ${rand(4)}` },
  });
  mustOk(room2, "room2 create");
  const room2Id = Number(room2.json?.id);
  assertOk(Number.isFinite(room2Id) && room2Id > 0, "room2Id present");

  step("create market shift (roomId null)");
  const sh = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { startAt: isoPlusMin(60), endAt: isoPlusMin(180), status: "REQUESTED" },
  });
  mustOk(sh, "shift create");
  const shiftId = Number(sh.json?.id);
  assertOk(Number.isFinite(shiftId) && shiftId > 0, "shiftId present");
  assertOk(sh.json?.roomId == null, "market shift roomId null");

  step("attach people to shift (REPLACE)");
  const people = await prisma.personel.findMany({
    where: {
      companyId,
      homeLat: { not: null },
      homeLng: { not: null },
      geoStatus: "OK",
    },
    take: 6,
    orderBy: { id: "asc" },
  });
  assertOk(people.length >= 2, "have at least 2 OK personels");

  const items = people.map((p, i) => ({
    personelId: p.id,
    fullName: p.fullName || `M34 Personel ${i + 1}`,
    phone: p.phone || `m34p-${rand(6)}-${i}`,
    lat: Number(p.homeLat),
    lng: Number(p.homeLng),
    geoManualOverride: true,
  }));

  const putPeople = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
    token: companyToken,
    body: { items },
  });
  mustOk(putPeople, "shift people upsert");
  assertOk(putPeople.json?.ok === true, "people ok");

  step("generate stops (clusters) from people");
  const gen = await reqJson(
    "POST",
    `/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=250`,
    { token: companyToken, body: {} }
  );
  mustOk(gen, "stops generate");
  assertOk(gen.json?.ok === true, "generate ok");
  assertOk(Number(gen.json?.stopCount ?? 0) >= 1, "stopCount >= 1");
  assertOk(Number(gen.json?.assignmentCount ?? 0) >= items.length, "assignmentCount >= people");

  step("optional: reorder stops via osrm-table + solve-vrp (skip if OSRM not ok)");
  const detail = await reqJson("GET", `/api/shifts/${shiftId}`, { token: companyToken });
  mustOk(detail, "shift detail");
  const stops = Array.isArray(detail.json?.stops) ? detail.json.stops : [];
  if (stops.length >= 2) {
    const points = stops
      .map((s) => ({ id: Number(s.id), lat: Number(s.lat), lng: Number(s.lng) }))
      .filter((p) => Number.isFinite(p.id) && Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (points.length >= 2) {
      const mx = await reqJson("POST", "/api/plan-builder/osrm-table", {
        token: companyToken,
        body: { points, profile: "driving" },
      });
      mustOk(mx, "osrm-table http");
      assertOk(typeof mx.json?.ok === "boolean", "osrm-table ok flag");

      if (mx.json?.ok) {
        const pointIds = points.map((p) => p.id);
        const sv = await reqJson("POST", "/api/plan-builder/solve-vrp", {
          token: companyToken,
          body: {
            durationsSec: mx.json.durationsSec,
            distancesM: mx.json.distancesM,
            pointIds,
            depotIndex: 0,
            returnToDepot: false,
            preferOrtools: true,
          },
        });
        mustOk(sv, "solve-vrp");
        assertOk(sv.json?.ok === true, "solve ok");

        const ord = sv.json?.orderPointIds;
        if (Array.isArray(ord) && ord.length === pointIds.length) {
          const re = await reqJson("PUT", `/api/shifts/${shiftId}/stops/reorder`, {
            token: companyToken,
            body: { idsInOrder: ord },
          });
          mustOk(re, "reorder");
          assertOk(re.json?.ok === true, "reorder ok");
        }
      }
    }
  }

  step("offers list should be empty before send");
  const before = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  mustOk(before, "offers list before");
  const beforeItems = Array.isArray(before.json?.items) ? before.json.items : [];
  assertOk(beforeItems.length === 0, "offers empty before");

  step("send bulk offers to room1 + room2");
  const send = await reqJson("POST", `/api/shifts/${shiftId}/offers`, {
    token: companyToken,
    body: {
      roomIds: [room1Id, room2Id],
      amountCompany: 12345,
      noteCompany: "M34CHECK",
    },
  });
  mustOk(send, "offers created");
  assertOk(send.json?.ok === true, "offers create ok");

  step("offers list after send should be 2");
  const after = await reqJson("GET", `/api/offers/shift/${shiftId}`, { token: companyToken });
  mustOk(after, "offers list after");
  const afterItems = Array.isArray(after.json?.items) ? after.json.items : [];
  assertOk(afterItems.length === 2, "offers count = 2");

  step("room inbox contains the new offer");
  const inbox = await reqJson("GET", "/api/offers/inbox?status=OPEN,COUNTERED", { token: roomToken });
  mustOk(inbox, "room inbox");
  const inboxItems = Array.isArray(inbox.json?.items) ? inbox.json.items : [];
  const found = inboxItems.some((o) => Number(o?.shiftId) === shiftId);
  assertOk(found, "room inbox includes shift offer");

  console.log("✅ M34CHECK PASS");
}

main().catch((e) => {
  console.error("❌ M34CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});
