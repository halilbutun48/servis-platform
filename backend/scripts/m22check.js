// backend/scripts/m22check.js
// M22CHECK: Company Room Directory + Agreement create UX
// - Company can list/search rooms via GET /api/rooms?q=...
// - Optional filter: hasHub=1
// - Company can create agreement by selecting a room from directory

import { banner, step, assertOk, loginFirst, reqJson } from "./_harness.js";

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}

// TR-local date helper (UTC+03:00)
const TR_OFFSET_MS = 180 * 60_000;
function ymdTR(d) {
  const tr = new Date(new Date(d).getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function mustOk(r, label) {
  if (r?.ok) {
    console.log(`✅ ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 1200);
  console.error(`❌ ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}

async function main() {
  banner("M22CHECK: Room Directory + Agreement UX");

  const superToken = await loginFirst("SUPER_ADMIN");
  const companyToken = await loginFirst("company");

  // 1) SUPER_ADMIN create room + hub
  step("create room (SUPER_ADMIN)");
  const name = `M22 Room ${rand(6)}`;
  const cr = await reqJson("POST", "/api/rooms", {
    token: superToken,
    body: { name },
  });
  mustOk(cr, "room create");
  assertOk(!!cr.json?.id, "roomId present");
  const roomId = Number(cr.json.id);

  // set hub
  const hubLat = 41.0371;
  const hubLng = 28.9845;
  const hr = await reqJson("PUT", `/api/rooms/${roomId}/hub`, {
    token: superToken,
    body: { hubLat, hubLng },
  });
  mustOk(hr, "room hub update");

  // 2) COMPANY directory search
  step("company GET /api/rooms?q=...");
  const qs = new URLSearchParams();
  qs.set("q", name);
  qs.set("take", "50");
  const list = await reqJson("GET", `/api/rooms?${qs.toString()}`, { token: companyToken });
  mustOk(list, "rooms list (company)");
  const items = list.json?.items ?? [];
  assertOk(Array.isArray(items), "rooms list items[]");
  assertOk(items.some((x) => Number(x.id) === roomId), "created room found by search");

  // 3) hasHub filter
  step("company GET /api/rooms?hasHub=1");
  const qs2 = new URLSearchParams();
  qs2.set("q", name);
  qs2.set("hasHub", "1");
  qs2.set("take", "50");
  const list2 = await reqJson("GET", `/api/rooms?${qs2.toString()}`, { token: companyToken });
  mustOk(list2, "rooms list hasHub (company)");
  const items2 = list2.json?.items ?? [];
  assertOk(items2.some((x) => Number(x.id) === roomId), "created room found by hasHub filter");

  // 4) COMPANY create agreement with selected room
  step("company creates agreement using directory roomId");
  const today = new Date();
  const startDate = ymdTR(today);
  const endDate = ymdTR(new Date(today.getTime() + 30 * 86400_000));

  const a = await reqJson("POST", "/api/agreements", {
    token: companyToken,
    body: {
      roomId,
      startDate,
      endDate,
      weekMask: 127,
      startMin: 8 * 60,
      endMin: 10 * 60,
      // routing meta defaults (optional)
      direction: "INBOUND",
      pattern: "ONE_WAY",
      // hub is optional; room has hub anyway
      hubLat: null,
      hubLng: null,
    },
  });
  mustOk(a, "agreement create");
  assertOk(!!a.json?.id, "agreementId present");

  const agreementId = Number(a.json.id);

  // list should include
  const ags = await reqJson("GET", "/api/agreements?take=50", { token: companyToken });
  mustOk(ags, "agreements list");
  const aitems = ags.json?.items ?? [];
  assertOk(Array.isArray(aitems), "agreements items[]");
  assertOk(aitems.some((x) => Number(x.id) === agreementId), "created agreement in list");

  console.log("✅ M22CHECK PASS");
}

main().catch((e) => {
  console.error("❌ M22CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});
