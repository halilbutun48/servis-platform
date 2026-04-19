// backend/scripts/m23check.js
// M23CHECK: WS agreement:update event exists and reaches BOTH company & room rooms.
// (UI auto-refresh M23-A: ws.js eventName-based topic inference fix)

import { io as ioClient } from "socket.io-client";
import { banner, step, assertOk, loginFirst, reqJson, pickVehicleDriver } from "./_harness.js";
import { createAgreementSourceShift } from "./_agreement_source_shift_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

// TR-local date helper (UTC+03:00)
const TR_OFFSET_MS = 180 * 60_000;
function ymdTR(d) {
  const tr = new Date(new Date(d).getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function waitForEvent(sock, eventName, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { sock.off(eventName, onEv); } catch {}
      reject(new Error(`WS timeout waiting: ${eventName}`));
    }, timeoutMs);

    const onEv = (payload) => {
      clearTimeout(t);
      try { sock.off(eventName, onEv); } catch {}
      resolve(payload);
    };

    sock.on(eventName, onEv);
  });
}

async function connectWs(token) {
  return await new Promise((resolve, reject) => {
    const s = ioClient(BASE_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: false,
      auth: { token },
      query: { token },
    });

    const t = setTimeout(() => {
      try { s.disconnect(); } catch {}
      reject(new Error("WS connect timeout"));
    }, 6000);

    s.on("connect", () => {
      clearTimeout(t);
      resolve(s);
    });

    s.on("connect_error", (e) => {
      clearTimeout(t);
      try { s.disconnect(); } catch {}
      reject(e);
    });
  });
}

async function main() {
  banner("M23CHECK: WS agreement:update broadcast (company+room)");

  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  // roomId must match ROOM user for approve tests
  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  assertOk(!!meRoom.json?.roomId, "roomId present");
  const roomId = Number(meRoom.json.roomId);

  // connect sockets
  step("connect WS (company + room)");
  const wsCompany = await connectWs(companyToken);
  const wsRoom = await connectWs(roomToken);

  // create source shift + agreement as company for this room
  step("create source shift (company) for room -> expect agreement create to stay canonical");
  const today = new Date();
  const startDate = ymdTR(today);
  const endDate = ymdTR(new Date(today.getTime() + 30 * 86400_000));

  const src = await createAgreementSourceShift({ reqJson, token: companyToken, roomId, tag: "M23" });
  assertOk(src.shiftId > 0, "source shift created");

  step("create agreement (company) with sourceShiftId -> expect WS agreement:update for both");
  const pCompany1 = waitForEvent(wsCompany, "agreement:update");
  const pRoom1 = waitForEvent(wsRoom, "agreement:update");

  const created = await reqJson("POST", "/api/agreements", {
    token: companyToken,
    body: {
      roomId,
      sourceShiftId: src.shiftId,
      startDate,
      endDate,
      weekMask: 127,
      startMin: 8 * 60,
      endMin: 10 * 60,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      hubLat: null,
      hubLng: null,
    },
  });

  assertOk(created.ok && created.json?.id, "agreement created");
  const agreementId = Number(created.json.id);

  await Promise.all([pCompany1, pRoom1]);
  console.log("OK WS create broadcast OK (company+room)");

  // approve agreement (room) -> needs vehicleId+driverId
  step("approve agreement (room) -> expect WS agreement:update for both");
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);
  assertOk(vehicleId > 0 && driverId > 0, "vehicleId+driverId available");

  const pCompany2 = waitForEvent(wsCompany, "agreement:update");
  const pRoom2 = waitForEvent(wsRoom, "agreement:update");

  const approved = await reqJson("PUT", `/api/agreements/${agreementId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  assertOk(approved.ok, "agreement approved (room)");

  await Promise.all([pCompany2, pRoom2]);
  console.log("OK WS approve broadcast OK (company+room)");

  // cleanup: cancel (optional)
  step("cancel agreement (company) -> expect WS agreement:update for both");
  const pCompany3 = waitForEvent(wsCompany, "agreement:update");
  const pRoom3 = waitForEvent(wsRoom, "agreement:update");

  const cancelled = await reqJson("PUT", `/api/agreements/${agreementId}/cancel`, {
    token: companyToken,
    body: {},
  });
  assertOk(cancelled.ok, "agreement cancelled (company)");

  await Promise.all([pCompany3, pRoom3]);
  console.log("OK WS cancel broadcast OK (company+room)");

  try { wsCompany.disconnect(); } catch {}
  try { wsRoom.disconnect(); } catch {}

  console.log("OK M23CHECK PASS");
}

main().catch((e) => {
  console.error("FAIL M23CHECK FAIL");
  console.error(e?.stack || String(e));
  process.exit(1);
});
