// backend/scripts/m8check.js
import http from "http";
import https from "https";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const nowTag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if (!token) throw new Error(`login token missing: ${email}`);
  return token;
}

function ok(msg) { console.log(`✅ ${msg}`); }

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const companyToken = await login("company@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  ok("login(company/room)");

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  const roomId = meRoom.json?.roomId ?? 1;

  // 1) create template
  const tplName = `M8 Template ${nowTag}`;
  const tplCreate = await reqJson("POST", "/api/route-templates", {
    token: roomToken,
    body: { name: tplName }
  });
  if (!tplCreate.ok) throw new Error(`template create -> ${tplCreate.status}\n${tplCreate.text}`);
  const templateId = tplCreate.json?.id;
  if (!templateId) throw new Error("templateId missing in create response");
  ok(`template create (id=${templateId})`);

  // 2) add 3 template stops
  const s1Name = `M8 TStop 1 ${nowTag}`;
  const s2Name = `M8 TStop 2 ${nowTag}`;
  const s3Name = `M8 TStop 3 ${nowTag}`;

  const s1 = await reqJson("POST", `/api/route-templates/${templateId}/stops`, {
    token: roomToken,
    body: { name: s1Name, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" }
  });
  if (!s1.ok) throw new Error(`template stop add1 -> ${s1.status}\n${s1.text}`);
  const s1Id = s1.json?.stop?.id;
  if (!s1Id) throw new Error("template stop1 id missing");

  const s2 = await reqJson("POST", `/api/route-templates/${templateId}/stops`, {
    token: roomToken,
    body: { name: s2Name, lat: 41.0310, lng: 28.9968, order: 2, type: "MANUAL" }
  });
  if (!s2.ok) throw new Error(`template stop add2 -> ${s2.status}\n${s2.text}`);
  const s2Id = s2.json?.stop?.id;
  if (!s2Id) throw new Error("template stop2 id missing");

  const s3 = await reqJson("POST", `/api/route-templates/${templateId}/stops`, {
    token: roomToken,
    body: { name: s3Name, lat: 41.0313, lng: 28.9971, order: 3, type: "COMMON" }
  });
  if (!s3.ok) throw new Error(`template stop add3 -> ${s3.status}\n${s3.text}`);
  const s3Id = s3.json?.stop?.id;
  if (!s3Id) throw new Error("template stop3 id missing");

  ok("template stops add (3)");

  // 3) reorder template stops (swap first two) using M6 contract
  const re = await reqJson("PUT", `/api/route-templates/${templateId}/stops/reorder`, {
    token: roomToken,
    body: { idsInOrder: [s2Id, s1Id, s3Id] }
  });
  if (!re.ok) throw new Error(`template reorder -> ${re.status}\n${re.text}`);
  ok("template stops reorder (idsInOrder)");

  // verify template order via DB
  const tplStops = await prisma.routeTemplateStop.findMany({
    where: { routeTemplateId: templateId },
    orderBy: { order: "asc" }
  });
  if (tplStops.length !== 3) throw new Error(`template stops expected 3, got ${tplStops.length}`);
  const tplOrderNames = tplStops.map(s => s.name);
  const expectedTplNames = [s2Name, s1Name, s3Name];
  for (let i = 0; i < expectedTplNames.length; i++) {
    if (tplOrderNames[i] !== expectedTplNames[i]) {
      throw new Error(`template order mismatch at ${i}: expected "${expectedTplNames[i]}", got "${tplOrderNames[i]}"`);
    }
  }
  ok("template order verified in DB");

  // 4) create shift (REQUESTED) with a dummy stop
  const startAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();

  const dummyName = `M8 Dummy Stop ${nowTag}`;
  const shBody = {
    roomId,
    startAt,
    endAt,
    status: "REQUESTED",
    stops: [
      { name: dummyName, lat: 41.0302, lng: 28.9961, order: 1, type: "COMMON" }
    ]
  };

  const shCreate = await reqJson("POST", "/api/shifts", { token: companyToken, body: shBody });
  if (!shCreate.ok) throw new Error(`shift create -> ${shCreate.status}\n${shCreate.text}`);
  const shiftId = shCreate.json?.id ?? shCreate.json?.shift?.id;
  if (!shiftId) throw new Error("shiftId missing in create response");
  ok(`shift create (id=${shiftId})`);

  // 5) apply template to shift (REPLACE)
  const apply = await reqJson("POST", `/api/shifts/${shiftId}/stops/from-template`, {
    token: companyToken,
    body: { templateId, mode: "REPLACE" }
  });
  if (!apply.ok) throw new Error(`apply template -> ${apply.status}\n${apply.text}`);
  ok("shift apply template (REPLACE)");

  // 6) verify shift stops in DB: 3 stops, order matches template (after reorder), dummy removed, type copied
  const shiftStops = await prisma.stop.findMany({
    where: { shiftId },
    orderBy: { order: "asc" }
  });

  if (shiftStops.length !== 3) {
    throw new Error(`shift stops expected 3 after REPLACE, got ${shiftStops.length}`);
  }

  // dummy must be gone
  if (shiftStops.some(s => s.name === dummyName)) {
    throw new Error("dummy stop still exists after REPLACE");
  }

  const shiftNames = shiftStops.map(s => s.name);
  for (let i = 0; i < expectedTplNames.length; i++) {
    if (shiftNames[i] !== expectedTplNames[i]) {
      throw new Error(`shift order mismatch at ${i}: expected "${expectedTplNames[i]}", got "${shiftNames[i]}"`);
    }
  }

  // type verify: stop2 was MANUAL, should be first now
  const firstType = shiftStops[0].type;
  if (firstType !== "MANUAL") {
    throw new Error(`type copy mismatch: expected first stop type MANUAL, got ${firstType}`);
  }

  ok("shift stops verified (order + type + dummy removed)");

  console.log("\n✅ M8CHECK PASS");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(String(e?.stack ?? e));
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});