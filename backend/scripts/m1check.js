import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g,"").slice(0,14);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json", "x-greenpack": process.env.GREENPACK_HEADER ?? "1" };
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
    req.on("error", (e)=> resolve({ ok:false, status:0, json:null, text:String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password){
  const r = await reqJson("POST","/api/auth/login",{ body:{ email, password } });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if (!token) throw new Error(`login token missing: ${email}`);
  return token;
}

async function callAny(label, method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.ok) return { ok:true, path:p, r };
    // 404/405 ise başka path deneyelim, diğerlerinde de deneyip raporlayacağız
  }
  // en “anlamlı” hatayı döndürmek için ilk path’i tekrar al
  const rr = await reqJson(method, paths[0], { token, body });
  return { ok:false, path:paths[0], r: rr };
}

function okLine(msg){ console.log(`OK ${msg}`); }
function badLine(msg){ console.log(`FAIL ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const superToken   = await login("superadmin@demo.com","demo123");
  const roomToken    = await login("room@demo.com","demo123");
  const companyToken = await login("company@demo.com","demo123");
  const driverToken  = await login("driver@demo.com","demo123");
  okLine("login(super/room/company/driver)");

  // IDs (M1 check için minimum)
  const meRoom = await reqJson("GET","/api/me",{ token: roomToken });
  const meComp = await reqJson("GET","/api/me",{ token: companyToken });
  const roomId = meRoom.json?.roomId ?? 1;
  const companyId = meComp.json?.companyId ?? 1;

  // 1) SUPER_ADMIN: Company CRUD (create + list)
  const companyName = `M1CHECK_CO_${nowTag}`;
  const coCreate = await callAny("company:create","POST",
    ["/api/companies","/api/company"],
    { token: superToken, body: { name: companyName } }
  );
  if (coCreate.ok) okLine(`Company create (${coCreate.path})`);
  else badLine(`Company create missing/failed (${coCreate.path}) -> ${coCreate.r.status}`);

  const coList = await callAny("company:list","GET",
    ["/api/companies","/api/company"],
    { token: superToken }
  );
  if (coList.ok) okLine(`Company list (${coList.path})`);
  else badLine(`Company list missing/failed (${coList.path}) -> ${coList.r.status}`);

  // 2) SUPER_ADMIN: Room CRUD (create + list)
  const roomName = `M1CHECK_ROOM_${nowTag}`;
  const roomCreate = await callAny("room:create","POST",
    ["/api/rooms","/api/room"],
    { token: superToken, body: { name: roomName } }
  );
  if (roomCreate.ok) okLine(`Room create (${roomCreate.path})`);
  else badLine(`Room create missing/failed (${roomCreate.path}) -> ${roomCreate.r.status}`);

  const roomList = await callAny("room:list","GET",
    ["/api/rooms","/api/room"],
    { token: superToken }
  );
  if (roomList.ok) okLine(`Room list (${roomList.path})`);
  else badLine(`Room list missing/failed (${roomList.path}) -> ${roomList.r.status}`);

  // 3) ROOM: Vehicle CRUD (create + list)
  const plate = `M1-${nowTag.slice(-6)}`;
  const vehCreate = await callAny("vehicle:create","POST",
    ["/api/vehicles","/api/vehicle"],
    { token: roomToken, body: { plate, capacity: 10, speedLimitKmh: 90 } }
  );
  if (vehCreate.ok) okLine(`Vehicle create (${vehCreate.path})`);
  else badLine(`Vehicle create missing/failed (${vehCreate.path}) -> ${vehCreate.r.status}`);

  const vehList = await callAny("vehicle:list","GET",
    ["/api/vehicles","/api/vehicle"],
    { token: roomToken }
  );
  if (vehList.ok) okLine(`Vehicle list (${vehList.path})`);
  else badLine(`Vehicle list missing/failed (${vehList.path}) -> ${vehList.r.status}`);

  const vehicleId =
    (vehCreate.ok && (vehCreate.r.json?.id ?? vehCreate.r.json?.vehicle?.id)) ||
    (vehList.ok && (vehList.r.json?.[0]?.id ?? vehList.r.json?.items?.[0]?.id)) ||
    1;

  // 4) ROOM: Driver CRUD (create + list)
  const drvCreate = await callAny("driver:create","POST",
    ["/api/drivers","/api/driver"],
    { token: roomToken, body: { fullName:`M1CHECK Driver ${nowTag}`, phone:"0000000000", deviceInfo:"seed" } }
  );
  if (drvCreate.ok) okLine(`Driver create (${drvCreate.path})`);
  else badLine(`Driver create missing/failed (${drvCreate.path}) -> ${drvCreate.r.status}`);

  const drvList = await callAny("driver:list","GET",
    ["/api/drivers","/api/driver"],
    { token: roomToken }
  );
  if (drvList.ok) okLine(`Driver list (${drvList.path})`);
  else badLine(`Driver list missing/failed (${drvList.path}) -> ${drvList.r.status}`);

  const driverId =
    (drvCreate.ok && (drvCreate.r.json?.id ?? drvCreate.r.json?.driver?.id)) ||
    (drvList.ok && (drvList.r.json?.[0]?.id ?? drvList.r.json?.items?.[0]?.id)) ||
    1;

  // 5) COMPANY: Shift request (create)
  const startAt = new Date(Date.now() + 10*60*1000).toISOString();
  const endAt   = new Date(Date.now() + 70*60*1000).toISOString();

  const shiftBody = {
    companyId, roomId,
    startAt, endAt,
    // status istek: backend enum farklıysa zaten fail edip raporlayacak
    status: "REQUESTED",
    stops: [
      { name:"Stop 1", lat:41.0306, lng:28.9964, order:1, type:"COMMON" },
      { name:"Stop 2", lat:41.0310, lng:28.9968, order:2, type:"COMMON" },
      { name:"Stop 3", lat:41.0313, lng:28.9971, order:3, type:"COMMON" }
    ]
  };

  const shCreate = await callAny("shift:create","POST",
    ["/api/shifts","/api/shift"],
    { token: companyToken, body: shiftBody }
  );
  if (shCreate.ok) okLine(`Shift create (company) (${shCreate.path})`);
  else badLine(`Shift create missing/failed (${shCreate.path}) -> ${shCreate.r.status}  (status enum/endpoint eksik olabilir)`);

  const shiftId =
    (shCreate.ok && (shCreate.r.json?.id ?? shCreate.r.json?.shift?.id)) ||
    null;

  // 6) ROOM: approve/assign shift
  let approveOk = false;
  if (shiftId) {
    const apBody = { vehicleId, driverId, status: "APPROVED" };
    const shApprove = await callAny("shift:approve","PUT",
      [`/api/shifts/${shiftId}/approve`,`/api/shifts/${shiftId}/assign`,`/api/shift/${shiftId}/approve`],
      { token: roomToken, body: apBody }
    );
    if (shApprove.ok) { okLine(`Shift approve/assign (room) (${shApprove.path})`); approveOk=true; }
    else badLine(`Shift approve/assign missing/failed (${shApprove.path}) -> ${shApprove.r.status}`);
  } else {
    badLine("Shift approve/assign skipped (shift create failed)");
  }

  // 7) DRIVER: my shift endpoint
  const myShift = await callAny("driver:myshift","GET",
    ["/api/shifts/my","/api/driver/shifts","/api/shifts/assigned"],
    { token: driverToken }
  );
  if (myShift.ok) okLine(`Driver my shift (${myShift.path})`);
  else badLine(`Driver my shift missing/failed (${myShift.path}) -> ${myShift.r.status}`);

  // summary
  const fails = [
    !coCreate.ok, !coList.ok,
    !roomCreate.ok, !roomList.ok,
    !vehCreate.ok, !vehList.ok,
    !drvCreate.ok, !drvList.ok,
    !shCreate.ok,
    shiftId ? !approveOk : true,
    !myShift.ok
  ].filter(Boolean).length;

  if (fails === 0) {
    console.log("\nOK M1CHECK PASS (CRUD + request/approve flow OK)");
    process.exit(0);
  } else {
    console.log(`\nFAIL M1CHECK FAIL (${fails} issue) — eksik endpoint/enumları implemente edeceğiz.`);
    process.exit(1);
  }
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });

