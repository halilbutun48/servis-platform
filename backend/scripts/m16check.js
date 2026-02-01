// backend/scripts/m16check.js
import {
  ok,
  must,
  reqJson,
  login,
  getRoomCompanyIds,
  pickVehicleDriver,
  ensureActiveShift,
  closeShiftHard,
  sleep,
} from "./_harness.js";

function banner(msg) {
  console.log(`\n=== ${msg} ===`);
}

function jstr(v) {
  try { return JSON.stringify(v); } catch { return String(v); }
}

async function tryMany({ method, paths, token, bodies = [undefined] }) {
  let last = null;

  for (const p of paths) {
    for (const body of bodies) {
      const r = await reqJson(method, p, { token, body });
      last = { path: p, body, r };

      if (r.ok) return last;

      // route yoksa diğer path’e geç
      if (r.status === 404) break;

      // 400/401/403 vs: aynı path’te diğer body varyantını dene (varsa)
    }
  }

  const msg =
    `expected ok\n` +
    `method=${method}\n` +
    `last.path=${last?.path}\n` +
    `last.status=${last?.r?.status}\n` +
    `last.body=${jstr(last?.r?.json ?? last?.r?.text)}\n`;

  throw new Error(msg);
}

async function main() {
  banner("M16CHECK: shift people + import + stop generate + route preview");

  const PASS = process.env.DEMO_PASS ?? process.env.SEED_PASS ?? "demo123";

  // setup token’ları (SUPER_ADMIN bazı şeylerde lazım olabilir ama shift create için COMPANY kullanacağız)
  const companyToken = await login("company@demo.com", PASS);
  const roomToken = await login("room@demo.com", PASS);
  const driverToken = await login("driver@demo.com", PASS);

  const ids = await getRoomCompanyIds(roomToken, companyToken);
  const { roomId, companyId } = ids;

  ok(`ids: companyId=${companyId} roomId=${roomId}`);

  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);
  ok(`picked: vehicleId=${vehicleId} driverId=${driverId}`);

  // ✅ SHIFT’i harness ile oluştur/approve/start et (companyId required problemini burada kesin çözüyoruz)
  const act = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M16",
  });

  const shiftId = act.shiftId;
  must("shift ACTIVE created", !!shiftId);

  // -----------------------------
  // 1) shift people import
  // -----------------------------
  banner("M16: people import");

  const uniq = String(Date.now()).slice(-6);
  const people = [
    {
      fullName: `M16 Personel A ${uniq}`,
      name: `M16 Personel A ${uniq}`,
      phone: `90530${uniq}01`,
      address: "M16 addr A",
      lat: 41.0306,
      lng: 28.9964,
    },
    {
      fullName: `M16 Personel B ${uniq}`,
      name: `M16 Personel B ${uniq}`,
      phone: `90530${uniq}02`,
      address: "M16 addr B",
      lat: 41.0313,
      lng: 28.9971,
    },
  ];

  const importPaths = [
    `/api/shifts/${shiftId}/people/import`,
    `/api/shifts/${shiftId}/people:import`,
    `/api/shifts/${shiftId}/people/bulk`,
    `/api/shifts/${shiftId}/people`,
  ];

  const importBodies = [
    { items: people },
    { people },
    people,
  ];

  const imp = await tryMany({
    method: "POST",
    paths: importPaths,
    token: companyToken,
    bodies: importBodies,
  });

  ok(`people import ok (${imp.path})`);

  // people list (opsiyonel ama doğrulama iyi)
  const listPaths = [
    `/api/shifts/${shiftId}/people`,
    `/api/shifts/${shiftId}/persons`,
  ];

  const lst = await tryMany({
    method: "GET",
    paths: listPaths,
    token: companyToken,
    bodies: [undefined],
  });

  ok(`people list ok (${lst.path})`);

  // -----------------------------
  // 2) people -> stop generate/cluster
  // -----------------------------
  banner("M16: stop generate from people");

  const genPaths = [
    `/api/shifts/${shiftId}/stops/generate`,
    `/api/shifts/${shiftId}/stops/from-people`,
    `/api/shifts/${shiftId}/stops/cluster`,
    `/api/shifts/${shiftId}/generate-stops`,
  ];

  const genBodies = [
    { radiusM: 120, minGroup: 2 },
    { radiusM: 120 },
    {},
  ];

  const gen = await tryMany({
    method: "POST",
    paths: genPaths,
    token: companyToken,
    bodies: genBodies,
  });

  ok(`stop generate ok (${gen.path})`);

  // -----------------------------
  // 3) route preview
  // -----------------------------
  banner("M16: route preview");

  const prevPaths = [
    `/api/shifts/${shiftId}/route/preview`,
    `/api/shifts/${shiftId}/route-preview`,
    `/api/shifts/${shiftId}/preview/route`,
    `/api/shifts/${shiftId}/route`,
  ];

  const prev = await tryMany({
    method: "GET",
    paths: prevPaths,
    token: companyToken,
    bodies: [undefined],
  });

  ok(`route preview ok (${prev.path})`);

  // Cleanup
  banner("M16: cleanup");
  await sleep(150);
  await closeShiftHard({ shiftId, driverToken, roomToken });
  ok(`cleanup shiftId=${shiftId}`);

  console.log("\n✅ M16CHECK PASS");
}

main().catch((e) => {
  console.error(`❌ M16CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
