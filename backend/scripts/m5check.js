// backend/scripts/m5check.js
import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g,"").slice(0,14);

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
  if(!token) throw new Error(`login token missing: ${email}`);
  return token;
}

function ok(msg){ console.log(`OK ${msg}`); }
function bad(msg){ console.log(`FAIL ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const companyToken = await login("company@demo.com","demo123");
  const roomToken    = await login("room@demo.com","demo123");
  const driverToken  = await login("driver@demo.com","demo123");
  ok("login(company/room/driver)");

  const meRoom = await reqJson("GET","/api/me",{ token: roomToken });
  const roomId = meRoom.json?.roomId ?? 1;

  const vlist = await reqJson("GET","/api/vehicles",{ token: roomToken });
  const dlist = await reqJson("GET","/api/drivers",{ token: roomToken });
  const vehicleId = vlist.json?.items?.[0]?.id ?? vlist.json?.[0]?.id ?? 1;
  const driverId  = dlist.json?.items?.[0]?.id ?? dlist.json?.[0]?.id ?? 1;

  // 1) create shift with 3 stops (REQUESTED)
  const startAt = new Date(Date.now() + 10*60*1000).toISOString();
  const endAt   = new Date(Date.now() + 70*60*1000).toISOString();
  const shBody = {
    roomId, startAt, endAt,
    status: "REQUESTED",
    stops: [
      { name:`M5 Stop 1 ${nowTag}`, lat:41.0306, lng:28.9964, order:1, type:"COMMON" },
      { name:`M5 Stop 2 ${nowTag}`, lat:41.0310, lng:28.9968, order:2, type:"COMMON" },
      { name:`M5 Stop 3 ${nowTag}`, lat:41.0313, lng:28.9971, order:3, type:"COMMON" }
    ]
  };
  const shCreate = await reqJson("POST","/api/shifts",{ token: companyToken, body: shBody });
  if(!shCreate.ok) throw new Error(`shift create -> ${shCreate.status}\n${shCreate.text}`);
  ok("shift create");

  const shiftId = shCreate.json?.id;
  const baseStops = shCreate.json?.stops ?? [];
  if(!shiftId || baseStops.length < 3) throw new Error("shiftId/stops missing in create response");

  // 2) add stop 4
  const stAdd = await reqJson("POST",`/api/shifts/${shiftId}/stops`,{
    token: companyToken,
    body: { name:`M5 Stop 4 ${nowTag}`, lat:41.0316, lng:28.9974, order:4, type:"MANUAL" }
  });
  if(!stAdd.ok) throw new Error(`stop add -> ${stAdd.status}\n${stAdd.text}`);
  ok("stop add");
  const stop4Id = stAdd.json?.stop?.id;
  if(!stop4Id) throw new Error("stopId missing for added stop");

  // 3) update stop 4 name
  const stUpd = await reqJson("PUT",`/api/shifts/${shiftId}/stops/${stop4Id}`,{
    token: companyToken,
    body: { name:`M5 Stop 4 UPDATED ${nowTag}` }
  });
  if(!stUpd.ok) throw new Error(`stop update -> ${stUpd.status}\n${stUpd.text}`);
  ok("stop update");

  // 4) delete stop 4
  const stDel = await reqJson("DELETE",`/api/shifts/${shiftId}/stops/${stop4Id}`,{ token: companyToken });
  if(!stDel.ok) throw new Error(`stop delete -> ${stDel.status}\n${stDel.text}`);
  ok("stop delete");

  // 5) reorder: swap first two using idsInOrder
  const id1 = baseStops[0].id, id2 = baseStops[1].id, id3 = baseStops[2].id;
  const re = await reqJson("PUT",`/api/shifts/${shiftId}/stops/reorder`,{
    token: companyToken,
    body: { idsInOrder: [id2, id1, id3] }
  });
  if(!re.ok) throw new Error(`reorder -> ${re.status}\n${re.text}`);
  ok("stops reorder");

  // 6) approve + start
  const ap = await reqJson("PUT",`/api/shifts/${shiftId}/approve`,{
    token: roomToken,
    body: { vehicleId, driverId }
  });
  if(!ap.ok) throw new Error(`approve -> ${ap.status}\n${ap.text}`);
  ok("approve/assign");

  const st = await reqJson("POST",`/api/shifts/${shiftId}/start`,{ token: roomToken });
  if(!st.ok) throw new Error(`start -> ${st.status}\n${st.text}`);
  ok("start");

  // 7) reached order 1
  const rc = await reqJson("POST",`/api/shifts/${shiftId}/reached`,{ token: driverToken, body: { order: 1 } });
  if(!rc.ok) throw new Error(`reached -> ${rc.status}\n${rc.text}`);
  ok("driver reached");

  // 8) ETA (force this shift) -> remaining should be 2 stops
  const eta = await reqJson("GET",`/api/eta?vehicleId=${vehicleId}&shiftId=${shiftId}`,{ token: driverToken });
  if(!eta.ok) throw new Error(`eta -> ${eta.status}\n${eta.text}`);
  if(!Array.isArray(eta.json?.stops)) throw new Error("eta.stops missing");
  const n = eta.json.stops.length;
  if(n !== 2) throw new Error(`eta remaining expected 2, got ${n}`);
  ok("eta remaining=2 (after reached order=1)");

  console.log("\nOK M5CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });

