import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g,"").slice(0,14);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
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
  return r.json?.token;
}
async function callAny(method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.ok) return { ok:true, path:p, r };
  }
  const rr = await reqJson(method, paths[0], { token, body });
  return { ok:false, path:paths[0], r: rr };
}
function ok(msg){ console.log(`✅ ${msg}`); }
function bad(msg){ console.log(`❌ ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const companyToken = await login("company@demo.com","demo123");
  const roomToken    = await login("room@demo.com","demo123");
  const driverToken  = await login("driver@demo.com","demo123");
  ok("login(company/room/driver)");

  const meRoom = await reqJson("GET","/api/me",{ token: roomToken });
  const meComp = await reqJson("GET","/api/me",{ token: companyToken });
  const roomId = meRoom.json?.roomId ?? 1;
  const companyId = meComp.json?.companyId ?? 1;

  // pick vehicle/driver (from existing lists)
  const vlist = await reqJson("GET","/api/vehicles",{ token: roomToken });
  const dlist = await reqJson("GET","/api/drivers",{ token: roomToken });
  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId  = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  // 1) create shift with 3 stops
  const startAt = new Date(Date.now() + 10*60*1000).toISOString();
  const endAt   = new Date(Date.now() + 70*60*1000).toISOString();
  const shBody = {
    companyId, roomId, startAt, endAt,
    status: "REQUESTED",
    stops: [
      { name:`M3 Stop 1 ${nowTag}`, lat:41.0306, lng:28.9964, order:1, type:"COMMON" },
      { name:`M3 Stop 2 ${nowTag}`, lat:41.0310, lng:28.9968, order:2, type:"COMMON" },
      { name:`M3 Stop 3 ${nowTag}`, lat:41.0313, lng:28.9971, order:3, type:"COMMON" }
    ]
  };
  const shCreate = await callAny("POST", ["/api/shifts","/api/shift"], { token: companyToken, body: shBody });
  if(!shCreate.ok) { bad(`shift create -> ${shCreate.r.status}`); process.exit(1); }
  ok("shift create");
  const shiftId = shCreate.r.json?.id ?? shCreate.r.json?.shift?.id;
  if(!shiftId) { bad("shiftId missing"); process.exit(1); }

  // 2) stop CRUD on shift (add 4th stop)
  const stAdd = await callAny("POST",
    [`/api/shifts/${shiftId}/stops`,`/api/shift/${shiftId}/stops`,`/api/stops`],
    { token: companyToken, body: { name:`M3 Stop 4 ${nowTag}`, lat:41.0316, lng:28.9974, order:4, type:"MANUAL" } }
  );
  if(stAdd.ok) ok(`stop add (${stAdd.path})`);
  else bad(`stop add missing/failed (${stAdd.path}) -> ${stAdd.r.status}`);

  // 3) reorder stops (swap 1<->2)
  const stReorder = await callAny("PUT",
    [`/api/shifts/${shiftId}/stops/reorder`,`/api/shifts/${shiftId}/reorder-stops`,`/api/stops/reorder`],
    { token: companyToken, body: { orders: [{ order:1, name:"(noop)" },{ order:2, name:"(noop)" }] } }
  );
  // reorder format may differ; we only detect endpoint existence
  if(stReorder.ok) ok(`stops reorder endpoint exists (${stReorder.path})`);
  else bad(`stops reorder endpoint missing (${stReorder.path}) -> ${stReorder.r.status}`);

  // 4) approve/assign shift (ROOM)
  const shApprove = await callAny("PUT",
    [`/api/shifts/${shiftId}/approve`,`/api/shifts/${shiftId}/assign`],
    { token: roomToken, body: { vehicleId, driverId, status:"APPROVED" } }
  );
  if(shApprove.ok) ok("shift approve/assign");
  else bad(`shift approve/assign -> ${shApprove.r.status}`);

  // 5) start shift (APPROVED->ACTIVE)
  const shStart = await callAny("POST",
    [`/api/shifts/${shiftId}/start`,`/api/shifts/${shiftId}/activate`],
    { token: roomToken, body: {} }
  );
  if(shStart.ok) ok(`shift start (${shStart.path})`);
  else bad(`shift start missing/failed (${shStart.path}) -> ${shStart.r.status}`);

  // 6) driver reached stop (progress)
  const reached = await callAny("POST",
    [`/api/shifts/${shiftId}/reached`,`/api/shifts/${shiftId}/stop/reached`,`/api/shifts/${shiftId}/progress/reached`],
    { token: driverToken, body: { order: 1 } }
  );
  if(reached.ok) ok(`driver reached stop (${reached.path})`);
  else bad(`driver reached stop missing/failed (${reached.path}) -> ${reached.r.status}`);

  // 7) ETA should still work for driver on this vehicle (sanity)
  const eta = await reqJson("GET",`/api/eta?vehicleId=${vehicleId}`,{ token: driverToken });
  if(eta.ok && Array.isArray(eta.json?.stops)) ok(`eta ok (stops=${eta.json.stops.length})`);
  else bad(`eta fail -> ${eta.status}`);

  const fails = [
    !stAdd.ok,
    !stReorder.ok,
    !shApprove.ok,
    !shStart.ok,
    !reached.ok,
    !(eta.ok && Array.isArray(eta.json?.stops))
  ].filter(Boolean).length;

  if(fails===0){ console.log("\n✅ M3CHECK PASS (workflow endpoints present)"); process.exit(0); }
  console.log(`\n❌ M3CHECK FAIL (${fails} issue) — eksikleri tamamlayacağız.`); process.exit(1);
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
