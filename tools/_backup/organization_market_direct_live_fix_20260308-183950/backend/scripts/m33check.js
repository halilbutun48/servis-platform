// backend/scripts/m33check.js
// M33CHECK: Plan Builder plumbing is mounted + deterministic behavior (OSRM/solver optional)

import {
  banner,
  step,
  ok,
  must,
  assertOk,
  reqJson,
  loginFirst,
} from "./_harness.js";

function isSquareMatrix(m) {
  if (!Array.isArray(m) || m.length < 2) return false;
  const n = m.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(m[i]) || m[i].length !== n) return false;
  }
  return true;
}

function hasAllIndicesOnce(order, n) {
  if (!Array.isArray(order) || order.length !== n) return false;
  const s = new Set(order);
  if (s.size !== n) return false;
  for (let i = 0; i < n; i++) if (!s.has(i)) return false;
  return true;
}

async function main() {
  banner("M33CHECK: Plan Builder API + precheck");

  const companyToken = await loginFirst("COMPANY");
  const roomToken = await loginFirst("ROOM");

  step("precheck unauth -> 401/403");
  const r0 = await reqJson("GET", "/api/plan-builder/precheck");
  must("unauth blocked", !r0.ok && (r0.status === 401 || r0.status === 403));

  step("precheck wrong role (ROOM) -> 401/403");
  const r1 = await reqJson("GET", "/api/plan-builder/precheck", { token: roomToken });
  must("room blocked", !r1.ok && (r1.status === 401 || r1.status === 403));

  step("precheck (COMPANY) -> 200");
  const pre = await reqJson("GET", "/api/plan-builder/precheck", { token: companyToken });
  assertOk(pre.ok, "precheck ok");
  must("precheck payload ok=true", pre.json?.ok === true);
  must("precheck has companyHub", typeof pre.json?.companyHub === "object");
  must("precheck has personels", typeof pre.json?.personels === "object");
  must("precheck has osrm", typeof pre.json?.osrm === "object");
  must("precheck has solver", typeof pre.json?.solver === "object");

  step("solve-vrp (deterministic; solver optional)");
  const durationsSec = [
    [0, 10, 20],
    [10, 0, 15],
    [20, 15, 0],
  ];

  const solve = await reqJson("POST", "/api/plan-builder/solve-vrp", {
    token: companyToken,
    body: { durationsSec, depotIndex: 0, returnToDepot: false, preferOrtools: true },
  });
  assertOk(solve.ok, "solve-vrp ok");
  must("solve-vrp ok=true", solve.json?.ok === true);
  must("order covers all indices", hasAllIndicesOnce(solve.json?.order, 3));
  ok("solver is ortools|heuristic", ["ortools", "heuristic"].includes(String(solve.json?.solver || "")));

  step("osrm-table (optional): must not 500, returns ok flag");
  const table = await reqJson("POST", "/api/plan-builder/osrm-table", {
    token: companyToken,
    body: {
      profile: "driving",
      points: [
        { id: 1, lat: 41.0082, lng: 28.9784 },
        { id: 2, lat: 41.0122, lng: 28.9760 },
      ],
    },
  });
  assertOk(table.ok, "osrm-table 200");
  must("osrm-table has ok boolean", typeof table.json?.ok === "boolean");
  if (table.json?.ok) {
    must("durations is square", isSquareMatrix(table.json?.durationsSec));
    must("distances is square", isSquareMatrix(table.json?.distancesM));
  } else {
    ok("osrm optional (ok=false accepted)", true);
  }

  banner("M33CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
