// backend/scripts/m6check.js
import { io as ioc } from "socket.io-client";
import {
  BASE_URL,
  login,
  getRoomCompanyIds,
  pickVehicleDriver,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
  reqJson,
  callAny,
  itemsOf,
  sleep,
} from "./_harness.js";

const nowTag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function ok(msg) {
  console.log(`OK ${msg}`);
}

async function connectWs(token, label) {
  const sock = ioc(BASE_URL, { auth: { token }, transports: ["websocket"] });
  const bag = { ready: null, req: [] };

  sock.on("ws:ready", (d) => (bag.ready = d));
  sock.on("request:update", (d) => bag.req.push(d));

  const t0 = Date.now();
  while (!bag.ready && Date.now() - t0 < 5000) await sleep(100);
  if (!bag.ready) throw new Error(`WS ready timeout: ${label}`);
  return { sock, bag };
}

async function waitFor(condFn, timeoutMs, stepMs = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function fetchOpenList(token) {
  let r = await reqJson("GET", "/api/requests?onlyOpen=1", { token });
  if (!r.ok) r = await reqJson("GET", "/api/requests?status=OPEN", { token });
  return r;
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const personelToken = await login("personel@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const driverToken = await login("driver@demo.com", "demo123");
  ok("login(personel/company/room/driver)");

  // WS
  const wsP = await connectWs(personelToken, "personel");
  const wsC = await connectWs(companyToken, "company");
  const wsR = await connectWs(roomToken, "room");
  ok("WS connect + ws:ready");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  const pre = await preCleanDriverShifts({ roomToken, driverToken, driverId });
  if (pre.found) console.log(`CLEAN pre-clean: found=${pre.found} cleaned=${pre.cleaned}`);

  const h = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M6",
  });
  ok(`shift ACTIVE (id=${h.shiftId})`);

  try {
    // Negative create -> 400
    const badCreate = await reqJson("POST", "/api/requests", {
      token: personelToken,
      body: { shiftId: h.shiftId },
    });
    if (badCreate.status !== 400) throw new Error(`request validation expected 400 got ${badCreate.status}`);
    ok("request validation 400 (missing lat/lng)");

    // Create request
    wsP.bag.req = [];
    wsC.bag.req = [];
    wsR.bag.req = [];

    const rqCreate = await reqJson("POST", "/api/requests", {
      token: personelToken,
      body: { shiftId: h.shiftId, lat: 41.0309, lng: 28.9966 },
    });
    if (!rqCreate.ok) throw new Error(`request create -> ${rqCreate.status}\n${rqCreate.text.slice(0, 400)}`);
    const requestId = rqCreate.json?.id ?? rqCreate.json?.request?.id;
    if (!requestId) throw new Error("requestId missing");
    ok(`request create (id=${requestId})`);

    const wsOk = await waitFor(
      () => wsP.bag.req.length > 0 && wsC.bag.req.length > 0 && wsR.bag.req.length > 0,
      4000
    );
    if (!wsOk) throw new Error("WS request:update missing for one of (personel/company/room)");
    ok("WS request:update (create) personel/company/room");

    // Duplicate OPEN -> 409
    const dup = await reqJson("POST", "/api/requests", {
      token: personelToken,
      body: { shiftId: h.shiftId, lat: 41.0310, lng: 28.9967 },
    });
    if (dup.status !== 409) throw new Error(`duplicate expected 409 got ${dup.status}`);
    ok("duplicate OPEN blocked (409)");

    // list onlyOpen contains
    const lc = await fetchOpenList(companyToken);
    const lr = await fetchOpenList(roomToken);
    if (!lc.ok) throw new Error(`company list failed -> ${lc.status}`);
    if (!lr.ok) throw new Error(`room list failed -> ${lr.status}`);

    const inC = itemsOf(lc).some((x) => x?.id === requestId);
    const inR = itemsOf(lr).some((x) => x?.id === requestId);
    if (!inC) throw new Error("company list missing request");
    if (!inR) throw new Error("room list missing request");
    ok("list onlyOpen includes request (company+room)");

    // COMPANY cannot close -> 403
    const cClose = await reqJson("POST", `/api/requests/${requestId}/close`, {
      token: companyToken,
      body: { status: "ACCEPTED" },
    });
    if (cClose.status !== 403) throw new Error(`company close expected 403 got ${cClose.status}`);
    ok("RBAC: company close forbidden (403)");

    // Close as ROOM
    wsP.bag.req = [];
    wsC.bag.req = [];
    wsR.bag.req = [];

    const rClose = await reqJson("POST", `/api/requests/${requestId}/close`, {
      token: roomToken,
      body: { status: "ACCEPTED" },
    });
    if (!rClose.ok) throw new Error(`room close -> ${rClose.status}\n${rClose.text.slice(0, 400)}`);
    ok("room close ACCEPTED");

    const wsOk2 = await waitFor(
      () => wsP.bag.req.length > 0 && wsC.bag.req.length > 0 && wsR.bag.req.length > 0,
      4000
    );
    if (!wsOk2) throw new Error("WS request:update missing on close for one of (personel/company/room)");
    ok("WS request:update (close) personel/company/room");

    // Re-close -> 409
    const reclose = await reqJson("POST", `/api/requests/${requestId}/close`, {
      token: roomToken,
      body: { status: "ACCEPTED" },
    });
    if (reclose.status !== 409) throw new Error(`re-close expected 409 got ${reclose.status}`);
    ok("re-close blocked (409)");

    console.log("\nOK M6CHECK PASS");
  } finally {
    wsP.sock.close();
    wsC.sock.close();
    wsR.sock.close();

    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) ok(`shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`WARN cleanup failed shiftId=${h.shiftId}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});

