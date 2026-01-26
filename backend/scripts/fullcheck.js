import http from "http";
import https from "https";
import { io as ioc } from "socket.io-client";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function requestJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json ?? text);
          else reject(new Error(`${method} ${path} -> ${res.statusCode}\n${text.slice(0,800)}`));
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password){
  const r = await requestJson("POST","/api/auth/login",{body:{email,password}});
  if(!r?.token) throw new Error("login token missing");
  return r.token;
}

function payloadOf(n){
  const p = n?.payloadJson ?? n?.payload ?? null;
  if(!p) return null;
  return typeof p === "string" ? JSON.parse(p) : p;
}
function countKind(items, kind){
  let c=0;
  for(const n of items??[]){
    const p=payloadOf(n);
    if(p?.kind===kind) c++;
  }
  return c;
}

async function connectWs(token, label){
  const sock = ioc(BASE_URL, { auth: { token }, transports: ["websocket"] });
  const bag = { ready:null, gps:[], vstat:[], notif:[], eta:[] };

  sock.on("ws:ready", (d)=> bag.ready=d);
  sock.on("gps:update", (d)=> bag.gps.push(d));
  sock.on("vehicle:status", (d)=> bag.vstat.push(d));
  sock.on("notif:new", (d)=> bag.notif.push(d));
  sock.on("eta:update", (d)=> bag.eta.push(d));

  const t0=Date.now();
  while(!bag.ready && Date.now()-t0<5000) await sleep(100);
  if(!bag.ready) throw new Error(`WS ready timeout: ${label}`);
  return { sock, bag };
}

async function waitFor(condFn, timeoutMs, stepMs=100){
  const t0=Date.now();
  while(Date.now()-t0<timeoutMs){
    if(condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  // 1) health
  const health = await requestJson("GET","/health");
  if(!health?.ok) throw new Error("❌ /health invalid");
  console.log("✅ /health");

  // 2) logins
  const driverToken = await login("driver@demo.com","demo123");
  const roomToken   = await login("room@demo.com","demo123");
  const companyToken= await login("company@demo.com","demo123");
  console.log("✅ login(driver/room/company)");

  // 3) WS connect
  const driverWS = await connectWs(driverToken,"driver");
  const roomWS   = await connectWs(roomToken,"room");
  const compWS   = await connectWs(companyToken,"company");
  console.log("✅ WS connect + ws:ready");

  // helper to clear bags
  const clearBags = ()=>{ driverWS.bag.gps=[]; driverWS.bag.vstat=[]; driverWS.bag.notif=[]; driverWS.bag.eta=[];
                          roomWS.bag.gps=[]; roomWS.bag.vstat=[]; roomWS.bag.notif=[]; roomWS.bag.eta=[];
                          compWS.bag.gps=[]; compWS.bag.vstat=[]; compWS.bag.notif=[]; compWS.bag.eta=[]; };

  // 4) LIVE gps -> WS + DB mapping
  clearBags();
  await requestJson("POST","/api/gps",{token:driverToken, body:{vehicleId:1, lat:41.0302, lng:28.9960, speed:20}});
  const gotDriverGps = await waitFor(()=>driverWS.bag.gps.some(x=>x.vehicleId===1), 4000);
  const gotDriverVs  = await waitFor(()=>driverWS.bag.vstat.some(x=>x.vehicleId===1), 4000);
  if(!gotDriverGps || !gotDriverVs) throw new Error("❌ WS gps:update / vehicle:status missing (driver)");

  const gotRoomAny = await waitFor(()=> roomWS.bag.gps.some(x=>x.vehicleId===1) || roomWS.bag.vstat.some(x=>x.vehicleId===1), 4000);
  const gotCompAny = await waitFor(()=> compWS.bag.gps.some(x=>x.vehicleId===1) || compWS.bag.vstat.some(x=>x.vehicleId===1), 4000);
  if(!gotRoomAny) throw new Error("❌ WS update missing (room)");
  if(!gotCompAny) throw new Error("❌ WS update missing (company)");
  console.log("✅ WS gps:update + vehicle:status (driver/room/company)");

  const v = await prisma.vehicle.findUnique({ where:{id:1}, select:{ status:true } });
  const gl= await prisma.gpsLast.findUnique({ where:{ vehicleId:1 }, select:{ status:true }});
  if(v?.status!=="ACTIVE" || gl?.status!=="OK") throw new Error(`❌ DB mapping wrong: Vehicle=${v?.status} GpsLast=${gl?.status}`);
  console.log("✅ DB mapping LIVE -> Vehicle.ACTIVE + GpsLast.OK");

  // 5) overspeed -> notif (DB + WS) for DRIVER/ROOM/COMPANY
  const d0 = await requestJson("GET","/api/notifications/my",{token:driverToken});
  const r0 = await requestJson("GET","/api/notifications/my",{token:roomToken});
  const c0 = await requestJson("GET","/api/notifications/my",{token:companyToken});
  const d0n=countKind(d0,"OVERSPEED"), r0n=countKind(r0,"OVERSPEED"), c0n=countKind(c0,"OVERSPEED");

  clearBags();
  await requestJson("POST","/api/gps",{token:driverToken, body:{vehicleId:1, lat:41.03025, lng:28.99605, speed:140}});

  await sleep(800); // notif pipeline
  const d1 = await requestJson("GET","/api/notifications/my",{token:driverToken});
  const r1 = await requestJson("GET","/api/notifications/my",{token:roomToken});
  const c1 = await requestJson("GET","/api/notifications/my",{token:companyToken});
  if(countKind(d1,"OVERSPEED")<=d0n) throw new Error("❌ OVERSPEED not created for DRIVER");
  if(countKind(r1,"OVERSPEED")<=r0n) throw new Error("❌ OVERSPEED not created for ROOM");
  if(countKind(c1,"OVERSPEED")<=c0n) throw new Error("❌ OVERSPEED not created for COMPANY");

  const wsD = await waitFor(()=>driverWS.bag.notif.length>0, 4000);
  const wsR = await waitFor(()=>roomWS.bag.notif.length>0, 4000);
  const wsC = await waitFor(()=>compWS.bag.notif.length>0, 4000);
  if(!wsD || !wsR || !wsC) throw new Error("❌ WS notif:new missing for one of (driver/room/company)");
  console.log("✅ OVERSPEED notif (DB + WS) driver/room/company");

  // 6) ETA http + eta:update ws
  clearBags();
  const eta = await requestJson("GET","/api/eta?vehicleId=1",{token:driverToken});
  if(!eta || !Array.isArray(eta.stops)) throw new Error("❌ /api/eta invalid (stops[])");
  console.log(`✅ /api/eta (stops=${eta.stops.length})`);

  // trigger ETA update by one more gps
  await requestJson("POST","/api/gps",{token:driverToken, body:{vehicleId:1, lat:41.0303, lng:28.9961, speed:25}});
  const gotEtaWs = await waitFor(()=>driverWS.bag.eta.length>0, 4000);
  if(!gotEtaWs) throw new Error("❌ WS eta:update missing (driver)");
  console.log("✅ WS eta:update (driver)");

  // 7) LIVE->STALE (force by backdating gpsLast.at) + dedupe
  const baseD = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_STALE");
  const baseR = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_STALE");
  const baseC = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_STALE");

  await prisma.gpsLast.update({ where:{vehicleId:1}, data:{ at: new Date(Date.now()-25_000) } });
  clearBags();
  // monitor tick (15s) + jitter
  await sleep(20_000);

  const dS = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_STALE");
  const rS = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_STALE");
  const cS = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_STALE");
  if(dS<=baseD || rS<=baseR || cS<=baseC) throw new Error("❌ GPS_STALE not created for all scopes");
  console.log("✅ LIVE->STALE notif created (driver/room/company)");

  // dedupe: wait one more tick, counts must not increase
  await sleep(20_000);
  const dS2 = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_STALE");
  const rS2 = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_STALE");
  const cS2 = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_STALE");
  if(dS2!==dS || rS2!==rS || cS2!==cS) throw new Error("❌ GPS_STALE dedupe failed (count increased without transition)");
  console.log("✅ GPS_STALE dedupe OK");

  // 8) STALE->OFFLINE + dedupe
  const baseDO = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_OFFLINE");
  const baseRO = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_OFFLINE");
  const baseCO = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_OFFLINE");

  await prisma.gpsLast.update({ where:{vehicleId:1}, data:{ at: new Date(Date.now()-350_000) } });
  await sleep(20_000);

  const dO = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_OFFLINE");
  const rO = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_OFFLINE");
  const cO = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_OFFLINE");
  if(dO<=baseDO || rO<=baseRO || cO<=baseCO) throw new Error("❌ GPS_OFFLINE not created for all scopes");
  console.log("✅ STALE->OFFLINE notif created (driver/room/company)");

  await sleep(20_000);
  const dO2 = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_OFFLINE");
  const rO2 = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_OFFLINE");
  const cO2 = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_OFFLINE");
  if(dO2!==dO || rO2!==rO || cO2!==cO) throw new Error("❌ GPS_OFFLINE dedupe failed");
  console.log("✅ GPS_OFFLINE dedupe OK");

  // 9) OFFLINE->LIVE recovery
  const baseDR = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_RECOVERY");
  const baseRR = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_RECOVERY");
  const baseCR = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_RECOVERY");

  await requestJson("POST","/api/gps",{token:driverToken, body:{vehicleId:1, lat:41.0304, lng:28.9962, speed:10}});
  await sleep(800);

  const dR = countKind(await requestJson("GET","/api/notifications/my",{token:driverToken}), "GPS_RECOVERY");
  const rR = countKind(await requestJson("GET","/api/notifications/my",{token:roomToken}), "GPS_RECOVERY");
  const cR = countKind(await requestJson("GET","/api/notifications/my",{token:companyToken}), "GPS_RECOVERY");
  if(dR<=baseDR || rR<=baseRR || cR<=baseCR) throw new Error("❌ GPS_RECOVERY not created for all scopes");
  console.log("✅ OFFLINE->LIVE recovery notif created (driver/room/company)");

  // close
  driverWS.sock.close(); roomWS.sock.close(); compWS.sock.close();

  console.log("\n✅ FULLCHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });
