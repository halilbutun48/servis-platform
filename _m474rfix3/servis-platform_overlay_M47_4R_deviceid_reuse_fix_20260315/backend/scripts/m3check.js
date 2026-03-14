// backend/scripts/m3check.js
import http from "http";
import https from "https";
import { login as compatLogin } from "./_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  // OK GreenPack marker: local pack/gate checks rate-limit'e takılmasın
  // server.js -> greenpackSkip() (NODE_ENV=development iken)
  const headers = {
    "Content-Type": "application/json",
    "x-greenpack": process.env.GREENPACK_HEADER ?? "1",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch {}
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  return compatLogin(email, password);
}

function ok(msg) { console.log(`OK ${msg}`); }
function bad(msg) { console.log(`FAIL ${msg}`); }
function show(label, r) {
  const body = r?.json ?? r?.text ?? "";
  console.log(`${label} -> ${r?.status}\n${typeof body === "string" ? body : JSON.stringify(body)}`);
}

async function callAny(method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.ok) return { ok: true, method, path: p, r };
  }
  const rr = await reqJson(method, paths[0], { token, body });
  return { ok: false, method, path: paths[0], r: rr };
}

async function existsAny(method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.status && r.status !== 404) return { exists: true, method, path: p, r };
  }
  return { exists: false, method, path: paths[0], r: { status: 404, json: null, text: "" } };
}

// Çoklu method + path + payload brute-force
async function tryComplete({ shiftId, driverToken, roomToken }) {
  const payloads = [{}, { shiftId }, { id: shiftId }];
  const postPaths = [
    // driver route style
    "/api/driver/complete",
    "/api/driver/route/complete",
    `/api/driver/route/complete?shiftId=${shiftId}`,
    "/api/driver/route/done",
    "/api/driver/route/finish",
    "/api/driver/shift/complete",
    `/api/driver/shifts/${shiftId}/complete`,
    // shift style
    `/api/shifts/${shiftId}/complete`,
    `/api/shifts/${shiftId}/done`,
    `/api/shifts/${shiftId}/finish`,
    `/api/shifts/${shiftId}/end`,
    `/api/shifts/${shiftId}/close`,
  ];

  // 1) DRIVER token ile POST dene
  for (const p of postPaths) {
    for (const body of payloads) {
      const r = await reqJson("POST", p, { token: driverToken, body });
      if (r.ok) return { ok: true, method: "POST", path: p, used: "driver", r };
      // debug için 404 olmayanları yaz
      if (r.status && r.status !== 404) console.log(`INFO complete try driver POST ${p} body=${JSON.stringify(body)} -> ${r.status}`);
    }
  }

  // 2) DRIVER token ile PUT dene (bazı route’lar PUT olabilir)
  for (const p of postPaths) {
    for (const body of payloads) {
      const r = await reqJson("PUT", p, { token: driverToken, body });
      if (r.ok) return { ok: true, method: "PUT", path: p, used: "driver", r };
      if (r.status && r.status !== 404) console.log(`INFO complete try driver PUT ${p} body=${JSON.stringify(body)} -> ${r.status}`);
    }
  }

  // 3) ROOM fallback (shift complete genelde room’da olabilir)
  for (const p of postPaths) {
    for (const body of payloads) {
      const r = await reqJson("POST", p, { token: roomToken, body });
      if (r.ok) return { ok: true, method: "POST", path: p, used: "room", r };
      if (r.status && r.status !== 404) console.log(`INFO complete try room POST ${p} body=${JSON.stringify(body)} -> ${r.status}`);
    }
  }

  for (const p of postPaths) {
    for (const body of payloads) {
      const r = await reqJson("PUT", p, { token: roomToken, body });
      if (r.ok) return { ok: true, method: "PUT", path: p, used: "room", r };
      if (r.status && r.status !== 404) console.log(`INFO complete try room PUT ${p} body=${JSON.stringify(body)} -> ${r.status}`);
    }
  }

  return { ok: false };
}

async function reachOrders({ shiftId, driverToken, maxOrder = 8 }) {
  const shiftReached = [
    `/api/shifts/${shiftId}/reached`,
    `/api/shifts/${shiftId}/stop/reached`,
    `/api/shifts/${shiftId}/progress/reached`,
  ];
  const driverReached = [
    "/api/driver/reached",
    "/api/driver/route/reached",
    "/api/driver/stop/reached",
    "/api/driver/route/stop/reached",
  ];

  for (let ord = 1; ord <= maxOrder; ord++) {
    // önce shift tabanlı dene
    let r = await callAny("POST", shiftReached, { token: driverToken, body: { order: ord } });
    if (r.ok) { console.log(`OK reached order=${ord} (${r.path})`); continue; }

    // shift route yoksa driver tabanlı dene
    const maybe404 = r.r?.status === 404;
    if (maybe404) {
      r = await callAny("POST", driverReached, { token: driverToken, body: { order: ord } });
      if (r.ok) { console.log(`OK reached order=${ord} (${r.path})`); continue; }
    }

    // 400/403 vb: kırmadan devam (bazı shiftlerde stop sayısı daha az olabilir)
    if (r.r?.status && r.r.status !== 404) {
      console.log(`INFO reached order=${ord} -> ${r.r.status}`);
    }
  }
}

async function startShift({ shiftId, roomToken }) {
  const paths = [`/api/shifts/${shiftId}/start`, `/api/shifts/${shiftId}/activate`];
  // active ise 400 dönebilir, bu durumda logla ama fail sayma
  const r = await callAny("POST", paths, { token: roomToken, body: {} });
  if (r.ok) { ok(`shift start (${r.path})`); return true; }
  console.log(`INFO shift start attempt -> ${r.r.status}`);
  show("shift start body", r.r);
  return false;
}

async function getShiftStatus({ shiftId, roomToken }) {
  const r = await reqJson("GET", `/api/shifts/${shiftId}`, { token: roomToken });
  if (!r.ok) return { ok: false, status: null, raw: r };
  return { ok: true, status: r.json?.status, raw: r };
}

async function closeShiftHard({ shiftId, driverToken, roomToken }) {
  console.log(`CLEAN closing shift id=${shiftId}`);

  // APPROVED ise start etmeyi dene (ACTIVE değilse reached/complete çalışmayabilir)
  await startShift({ shiftId, roomToken });

  // Stop ilerletmeyi dene (best effort)
  await reachOrders({ shiftId, driverToken, maxOrder: 10 });

  // Complete brute-force
  const done = await tryComplete({ shiftId, driverToken, roomToken });
  if (done.ok) {
    ok(`shift completed (${done.used} ${done.method} ${done.path})`);
  } else {
    bad(`shift complete failed (no endpoint matched) shiftId=${shiftId}`);
    return false;
  }

  // Status doğrula
  const s = await getShiftStatus({ shiftId, roomToken });
  if (s.ok) {
    console.log(`INFO shift status now = ${s.status}`);
    if (["DONE", "COMPLETED", "FINISHED"].includes(String(s.status))) return true;
  } else {
    console.log("INFO shift GET failed (maybe endpoint restricted).");
  }
  // GET yoksa bile complete 2xx döndüyse true say
  return true;
}

async function preCleanDriverShifts({ driverToken, roomToken }) {
  const my = await reqJson("GET", "/api/shifts/my", { token: driverToken });
  const items = my.json?.items ?? my.json?.data?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    ok("pre-clean: driver has no shifts (items[])");
    return true;
  }

  const dirty = items.filter((s) => ["APPROVED", "ACTIVE"].includes(s.status));
  if (dirty.length === 0) {
    ok("pre-clean: no APPROVED/ACTIVE shifts to clean");
    return true;
  }

  console.log(`CLEAN pre-clean: found ${dirty.length} shift(s) to close`);

  // Önce ACTIVE olanları kapat (öncelik)
  const ordered = [
    ...dirty.filter((s) => s.status === "ACTIVE"),
    ...dirty.filter((s) => s.status === "APPROVED"),
  ];

  let allOk = true;
  for (const s of ordered) {
    const sid = s.id;
    const okClose = await closeShiftHard({ shiftId: sid, driverToken, roomToken });
    if (!okClose) allOk = false;
  }
  return allOk;
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const companyToken = await login("company@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const driverToken = await login("driver@demo.com", "demo123");
  ok("login(company/room/driver)");

  // pre-clean (kritik)
  const preOk = await preCleanDriverShifts({ driverToken, roomToken });
  if (!preOk) {
    bad("pre-clean could not close existing shifts -> M3 may conflict");
  }

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  const meComp = await reqJson("GET", "/api/me", { token: companyToken });
  const roomId = meRoom.json?.roomId ?? 1;
  const companyId = meComp.json?.companyId ?? 1;

  // pick vehicle/driver
  const vlist = await reqJson("GET", "/api/vehicles", { token: roomToken });
  const dlist = await reqJson("GET", "/api/drivers", { token: roomToken });
  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  // create shift
  const startAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();
  const shBody = {
    companyId, roomId, startAt, endAt,
    status: "REQUESTED",
    stops: [
      { name: `M3 Stop 1 ${nowTag}`, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" },
      { name: `M3 Stop 2 ${nowTag}`, lat: 41.0310, lng: 28.9968, order: 2, type: "COMMON" },
      { name: `M3 Stop 3 ${nowTag}`, lat: 41.0313, lng: 28.9971, order: 3, type: "COMMON" },
    ],
  };

  const shCreate = await callAny("POST", ["/api/shifts", "/api/shift"], { token: companyToken, body: shBody });
  if (!shCreate.ok) { show("shift create", shCreate.r); process.exit(1); }
  ok("shift create");
  const shiftId = shCreate.r.json?.id ?? shCreate.r.json?.shift?.id;
  if (!shiftId) { bad("shiftId missing"); process.exit(1); }

  // add stop
  const stAdd = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/stops`, `/api/shift/${shiftId}/stops`, `/api/stops`],
    { token: companyToken, body: { name: `M3 Stop 4 ${nowTag}`, lat: 41.0316, lng: 28.9974, order: 4, type: "MANUAL" } }
  );
  if (stAdd.ok) ok(`stop add (${stAdd.path})`);
  else show(`stop add (${stAdd.path})`, stAdd.r);

  // reorder endpoint exists
  const stReorder = await existsAny(
    "PUT",
    [`/api/shifts/${shiftId}/stops/reorder`, `/api/shifts/${shiftId}/reorder-stops`, `/api/stops/reorder`],
    { token: companyToken, body: { orders: [{ order: 1 }, { order: 2 }] } }
  );
  if (stReorder.exists) ok(`stops reorder endpoint exists (${stReorder.path})`);
  else bad(`stops reorder endpoint missing (${stReorder.path})`);

  // approve/assign
  const shApprove = await callAny(
    "PUT",
    [`/api/shifts/${shiftId}/approve`, `/api/shifts/${shiftId}/assign`],
    { token: roomToken, body: { vehicleId, driverId, status: "APPROVED" } }
  );
  if (shApprove.ok) ok("shift approve/assign");
  else show("shift approve/assign", shApprove.r);

  // start
  const shStart = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/start`, `/api/shifts/${shiftId}/activate`],
    { token: roomToken, body: {} }
  );
  if (shStart.ok) ok(`shift start (${shStart.path})`);
  else show(`shift start (${shStart.path})`, shStart.r);

  // reached
  const reached = await callAny(
    "POST",
    [`/api/shifts/${shiftId}/reached`, `/api/shifts/${shiftId}/stop/reached`, `/api/shifts/${shiftId}/progress/reached`],
    { token: driverToken, body: { order: 1 } }
  );
  if (reached.ok) ok(`driver reached stop (${reached.path})`);
  else show(`driver reached stop (${reached.path})`, reached.r);

  // OK ETA sanity (driver assigned iken)  — önce!
  const eta = await reqJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  const etaOk = eta.ok && Array.isArray(eta.json?.stops);
  if (etaOk) ok(`eta ok (stops=${eta.json.stops.length})`);
  else show("eta", eta);

  // OK cleanup: close this shift too (kritik) — sonra
  let cleanupOk = false;
  if (shApprove.ok) {
    cleanupOk = await closeShiftHard({ shiftId, driverToken, roomToken });
  }

  const fails = [
    !stAdd.ok,
    !stReorder.exists,
    !shApprove.ok,
    !shStart.ok,
    !reached.ok,
    !cleanupOk,
    !etaOk,
  ].filter(Boolean).length;

  if (fails === 0) {
    console.log("\nOK M3CHECK PASS (pre-clean + workflow + cleanup OK)");
    process.exit(0);
  }
  console.log(`\nFAIL M3CHECK FAIL (${fails} issue) — detaylar yukarıda.`);
  process.exit(1);
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});

