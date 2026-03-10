// backend/scripts/m7check.js
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
} from "./_harness.js";

const nowTag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function ok(msg) {
  console.log(`OK ${msg}`);
}

function distM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat),
    lat2 = toRad(bLat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

async function listStops(shiftId, token) {
  const got = await callAny(
    "GET",
    [`/api/shifts/${shiftId}`, `/api/shifts/${shiftId}/stops`, `/api/stops?shiftId=${shiftId}`],
    { token }
  );
  if (!got.ok) return { ok: false, items: [], raw: got.r, path: got.path };

  const j = got.r.json;
  let stops = [];
  if (Array.isArray(j)) stops = j;
  else if (Array.isArray(j?.items)) stops = j.items;
  else if (Array.isArray(j?.stops)) stops = j.stops;
  else if (Array.isArray(j?.shift?.stops)) stops = j.shift.stops;
  else if (Array.isArray(j?.data?.stops)) stops = j.data.stops;

  return { ok: true, items: stops, raw: got.r, path: got.path };
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const personelToken = await login("personel@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const driverToken = await login("driver@demo.com", "demo123");
  ok("login(personel/company/room/driver)");

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
    tag: "M7",
  });
  ok(`shift ACTIVE (id=${h.shiftId})`);

  try {
    // seed requests (two clusters)
    const A = [
      { lat: 41.0309, lng: 28.9966 },
      { lat: 41.03092, lng: 28.99663 },
      { lat: 41.03088, lng: 28.99658 },
    ];
    const B = [
      { lat: 41.0316, lng: 28.9974 },
      { lat: 41.03162, lng: 28.99743 },
      { lat: 41.03158, lng: 28.99738 },
    ];

    for (const p of [...A, ...B]) {
      const r = await reqJson("POST", "/api/requests", {
        token: personelToken,
        body: { shiftId: h.shiftId, lat: p.lat, lng: p.lng },
      });
      if (!r.ok && r.status !== 409) throw new Error(`request create -> ${r.status}\n${r.text.slice(0, 200)}`);
    }
    ok("seed requests (two clusters) created/ensured");

    // suggestions
    const sug = await callAny(
      "GET",
      [
        `/api/shifts/${h.shiftId}/stop-suggestions?onlyOpen=1&radiusM=120`,
        `/api/requests/stop-suggestions?shiftId=${h.shiftId}&onlyOpen=1&radiusM=120`,
        `/api/requests/suggestions?shiftId=${h.shiftId}&onlyOpen=1&radiusM=120`,
      ],
      { token: roomToken }
    );

    if (!sug.ok) throw new Error(`suggestions endpoint failed -> ${sug.r.status}\n${sug.r.text.slice(0, 300)}`);

    const suggestions = itemsOf(sug.r);
    if (!Array.isArray(suggestions) || suggestions.length < 1) {
      throw new Error(`suggestions empty -> ${sug.path}\n${JSON.stringify(sug.r.json).slice(0, 400)}`);
    }
    ok(`suggestions ok (${sug.path}) count=${suggestions.length}`);

    const s0 = suggestions[0] ?? {};
    const sLat = Number(s0.lat ?? s0.latitude);
    const sLng = Number(s0.lng ?? s0.longitude);
    const sId = s0.id ?? s0.suggestionId ?? null;
    if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) {
      throw new Error(`suggestion lat/lng missing: ${JSON.stringify(s0).slice(0, 300)}`);
    }

    const before = await listStops(h.shiftId, roomToken);
    if (!before.ok) throw new Error(`listStops before failed -> ${before.path} (${before.raw?.status})`);
    const beforeN = before.items.length;

    const acc = await callAny(
      "POST",
      [
        `/api/shifts/${h.shiftId}/stops/from-suggestion`,
        `/api/shifts/${h.shiftId}/stops/accept-suggestion`,
        `/api/suggestions/stops/accept`,
      ],
      {
        token: roomToken,
        body: { suggestionId: sId, lat: sLat, lng: sLng, name: `M7 COMMON from requests ${nowTag}` },
      }
    );
    if (!acc.ok) throw new Error(`accept suggestion failed -> ${acc.r.status}\n${acc.r.text.slice(0, 300)}`);
    ok(`accept suggestion ok (${acc.path})`);

    const after = await listStops(h.shiftId, roomToken);
    if (!after.ok) throw new Error(`listStops after failed -> ${after.path} (${after.raw?.status})`);
    const afterN = after.items.length;
    if (afterN <= beforeN) throw new Error(`stop not added (before=${beforeN}, after=${afterN})`);

    const near = after.items.find((st) => {
      const lat = Number(st.lat ?? st.latitude);
      const lng = Number(st.lng ?? st.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      return distM(lat, lng, sLat, sLng) <= 80;
    });
    if (!near) throw new Error("created stop not found near accepted suggestion");
    ok("stop created near suggestion");

    console.log("\nOK M7CHECK PASS");
  } finally {
    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) ok(`shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`WARN cleanup failed shiftId=${h.shiftId}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});

