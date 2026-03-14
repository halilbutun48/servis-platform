// backend/scripts/m0check.js
import http from "http";
import https from "https";
import { login as compatLogin } from "./_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

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

async function login(email, password) {
  return compatLogin(email, password);
}

function ok(msg){ console.log(`OK ${msg}`); }

async function main(){
  console.log(`API_URL = ${BASE_URL}`);

  const h = await reqJson("GET","/health");
  if(!h.ok || !h.json?.ok) throw new Error(`FAIL /health invalid -> ${h.status}\n${h.text}`);
  ok("/health");

  const users = [
    { email:"superadmin@demo.com", role:"SUPER_ADMIN" },
    { email:"room@demo.com",       role:"ROOM" },
    { email:"company@demo.com",    role:"COMPANY" },
    { email:"driver@demo.com",     role:"DRIVER" },
    { email:"personel@demo.com",   role:"PERSONEL" },
  ];

  for(const u of users){
    const token = await login(u.email, "demo123");
    const me = await reqJson("GET","/api/me",{ token });
    if(!me.ok) throw new Error(`FAIL /api/me failed for ${u.email} -> ${me.status}\n${me.text}`);
    if(me.json?.role !== u.role) throw new Error(`FAIL /api/me role mismatch for ${u.email}: got=${me.json?.role} exp=${u.role}`);

    if(u.role==="ROOM" && !me.json?.roomId) throw new Error("FAIL ROOM user missing roomId");
    if(u.role==="COMPANY" && !me.json?.companyId) throw new Error("FAIL COMPANY user missing companyId");
    ok(`login + /api/me (${u.role})`);
  }

  console.log("\nOK M0CHECK PASS");
}

main().catch((e)=>{ console.error(String(e?.stack ?? e)); process.exit(1); });

