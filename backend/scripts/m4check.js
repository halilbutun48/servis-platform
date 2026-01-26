import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
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

function itemsOf(resp){
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  if (Array.isArray(j?.data)) return j.data;
  return [];
}

async function login(email, password){
  const r = await reqJson("POST","/api/auth/login",{ body:{ email, password } });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if(!token) throw new Error(`login token missing: ${email}`);
  return token;
}

async function callAny(method, paths, { token, body } = {}) {
  for (const p of paths) {
    const r = await reqJson(method, p, { token, body });
    if (r.ok) return { ok:true, path:p, r };
  }
  const rr = await reqJson(method, paths[0], { token, body });
  return { ok:false, path:paths[0], r: rr };
}

async function waitFor(condFn, timeoutMs, stepMs=200){
  const t0=Date.now();
  while(Date.now()-t0<timeoutMs){
    if(condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

function ok(msg){ console.log(`✅ ${msg}`); }

async function getMyVehicleId(driverToken){
  const r = await reqJson("GET","/api/shifts/my",{ token: driverToken });
  if(!r.ok) return null;
  const sh = r.json?.shift ?? r.json?.item ?? r.json;
  const vid =
    sh?.vehicleId ??
    sh?.vehicle?.id ??
    sh?.activeShift?.vehicleId ??
    sh?.data?.vehicleId ??
    null;
  return vid ? Number(vid) : null;
}

async function listNotifs(token){
  const res = await callAny("GET", ["/api/notifications","/api/notifs"], { token });
  if(!res.ok) return { ok:false, items:[], raw:res.r, path:res.path };
  return { ok:true, items: itemsOf(res.r), raw:res.r, path:res.path };
}

function findType(items, type, vehicleId){
  return items.find(n =>
    (n?.type === type || n?.code === type) &&
    (!vehicleId || n?.vehicleId === vehicleId || n?.payload?.vehicleId === vehicleId)
  );
}

function countType(items, type, vehicleId){
  return items.filter(n =>
    (n?.type === type || n?.code === type) &&
    (!vehicleId || n?.vehicleId === vehicleId || n?.payload?.vehicleId === vehicleId)
  ).length;
}

async function assertNotifAllScopes(type, vehicleId, driverToken, roomToken, companyToken, label){
  let d=null, r=null, c=null;

  const okAll = await waitFor(async ()=>{
    const nd = await listNotifs(driverToken);
    const nr = await listNotifs(roomToken);
    const nc = await listNotifs(companyToken);

    d = findType(nd.items, type, vehicleId);
    r = findType(nr.items, type, vehicleId);
    c = findType(nc.items, type, vehicleId);

    return !!(d && r && c);
  }, 8000, 400);

  if(!okAll){
    throw new Error(`❌ ${label} not created for all scopes (missing: ${!d?"DRIVER ":""}${!r?"ROOM ":""}${!c?"COMPANY ":""})`);
  }
  ok(`${label} (driver/room/company)`);
}

async function postGps(driverToken, body){
  const r = await reqJson("POST","/api/gps",{ token: driverToken, body });
  if(!r.ok) throw new Error(`POST /api/gps -> ${r.status}\n${r.text.slice(0,400)}`);
}

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken  = await login("driver@demo.com","demo123");
  const roomToken    = await login("room@demo.com","demo123");
  const companyToken = await login("company@demo.com","demo123");
  ok("login(driver/room/company)");

  // driver'ın gerçek vehicleId'sini bul (flaky olmasın)
  const vehicleId = (await getMyVehicleId(driverToken)) ?? 1;

  // 1) LIVE gps (baseline)
  await postGps(driverToken, {
    vehicleId,
    lat: 41.0309, lng: 28.9966,
    speedKmh: 10, speed: 10,
    ts: new Date().toISOString()
  });

  // 2) OVERSPEED gps
  await postGps(driverToken, {
    vehicleId,
    lat: 41.0310, lng: 28.9967,
    speedKmh: 200, speed: 200,
    ts: new Date().toISOString()
  });

  await assertNotifAllScopes("OVERSPEED", vehicleId, driverToken, roomToken, companyToken, "OVERSPEED notif");

  // 3) LIVE->STALE (monitor tick bekle)
  console.log("⏳ waiting ~45s for LIVE->STALE monitor tick...");
  await sleep(45000);
  await assertNotifAllScopes("GPS_STALE", vehicleId, driverToken, roomToken, companyToken, "LIVE->STALE notif created");

  // 4) GPS_STALE dedupe (bir tick daha bekle, count artmamalı)
  const n1d = await listNotifs(driverToken);
  const staleCount1 = countType(n1d.items, "GPS_STALE", vehicleId);

  console.log("⏳ waiting ~45s for STALE dedupe tick...");
  await sleep(45000);
  const n2d = await listNotifs(driverToken);
  const staleCount2 = countType(n2d.items, "GPS_STALE", vehicleId);

  if(staleCount2 > staleCount1) throw new Error("❌ GPS_STALE dedupe FAIL (count increased)");
  ok("GPS_STALE dedupe OK");

  // 5) STALE->OFFLINE (bir tick daha)
  console.log("⏳ waiting ~45s for STALE->OFFLINE tick...");
  await sleep(45000);
  await assertNotifAllScopes("GPS_OFFLINE", vehicleId, driverToken, roomToken, companyToken, "STALE->OFFLINE notif created");

  // 6) GPS_OFFLINE dedupe
  const o1d = await listNotifs(driverToken);
  const offCount1 = countType(o1d.items, "GPS_OFFLINE", vehicleId);

  console.log("⏳ waiting ~45s for OFFLINE dedupe tick...");
  await sleep(45000);
  const o2d = await listNotifs(driverToken);
  const offCount2 = countType(o2d.items, "GPS_OFFLINE", vehicleId);

  if(offCount2 > offCount1) throw new Error("❌ GPS_OFFLINE dedupe FAIL (count increased)");
  ok("GPS_OFFLINE dedupe OK");

  // 7) OFFLINE->LIVE recovery (yeni LIVE gps at)
  await postGps(driverToken, {
    vehicleId,
    lat: 41.0312, lng: 28.9969,
    speedKmh: 20, speed: 20,
    ts: new Date().toISOString()
  });

  await assertNotifAllScopes("GPS_RECOVERY", vehicleId, driverToken, roomToken, companyToken, "OFFLINE->LIVE recovery notif created");

  console.log("\n✅ M4CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
