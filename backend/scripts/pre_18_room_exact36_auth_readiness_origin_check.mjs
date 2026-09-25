/*
 * No-browser RED/GREEN contract for Exact36's trusted-local browser auth
 * readiness observation.  The browser can observe /api/me through Vite's
 * local proxy while the backend itself listens on a different local port.
 */
import assert from "node:assert/strict";

/* Deliberately model the old direct-origin configuration.  A correct
 * trusted-local predicate still accepts the canonical browser proxy origin. */
process.env.WEB_BASE_URL = "http://127.0.0.1:3000";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const expectRed = process.argv.includes("--expect-red");
const runner = await import("./pre_18_luna_full_hybrid_surface_state_completion.mjs");
const auth = await import("./lib/pre_18_authenticated_role_context.mjs");
const cases = [];
const test = (name, fn) => cases.push({ name, fn });

const proxyMe = { method: () => "GET", url: () => "http://127.0.0.1:5173/api/me" };
const directMe = { method: () => "GET", url: () => "http://127.0.0.1:3000/api/me" };

test("AUTH-ORIGIN-RED-1 actual durable predicate accepts trusted Vite-proxied /api/me", () => {
  assert.equal(runner.isCurrentMeRequest(proxyMe), true);
});

if (!expectRed) {
  test("AUTH-ORIGIN-2 canonical direct local /api/me remains recognized", () => {
    assert.equal(runner.isCurrentMeRequest(directMe), true);
  });
  test("AUTH-ORIGIN-3 proxied successful ROOM response is a complete proof", () => {
    const result = auth.evaluateTrustedLocalApiMeAuthResponse({
      method: "GET", url: proxyMe.url(), status: 200, payload: { role: "ROOM", roomId: 17 }, expectedRole: "ROOM",
    });
    assert.deepEqual([result.accepted, result.tenantScopeProven, result.authRole], [true, true, "ROOM"]);
  });
  test("AUTH-ORIGIN-4 proxy 401 remains rejected", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: proxyMe.url(), status: 401, payload: null, expectedRole: "ROOM" }).accepted, false);
  });
  test("AUTH-ORIGIN-5 wrong role remains rejected", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: proxyMe.url(), status: 200, payload: { role: "COMPANY", roomId: 17 }, expectedRole: "ROOM" }).accepted, false);
  });
  test("AUTH-ORIGIN-6 missing ROOM tenant scope remains rejected", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: proxyMe.url(), status: 200, payload: { role: "ROOM", roomId: 0 }, expectedRole: "ROOM" }).accepted, false);
  });
  test("AUTH-ORIGIN-7 public tunnel is never accepted", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: "https://packed-planes-prizes-newsletters.trycloudflare.com/api/me", status: 200, payload: { role: "ROOM", roomId: 17 }, expectedRole: "ROOM" }).accepted, false);
  });
  test("AUTH-ORIGIN-8 arbitrary localhost ports are never accepted", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: "http://127.0.0.1:5174/api/me", status: 200, payload: { role: "ROOM", roomId: 17 }, expectedRole: "ROOM" }).accepted, false);
  });
  test("AUTH-ORIGIN-9 exact /api/me path remains required", () => {
    assert.equal(auth.evaluateTrustedLocalApiMeAuthResponse({ method: "GET", url: "http://127.0.0.1:5173/api/other", status: 200, payload: { role: "ROOM", roomId: 17 }, expectedRole: "ROOM" }).accepted, false);
  });
}

let observed = 0;
let unexpectedPass = 0;
for (const item of cases) {
  try {
    await item.fn();
    if (expectRed && item.name === "AUTH-ORIGIN-RED-1 actual durable predicate accepts trusted Vite-proxied /api/me") unexpectedPass += 1;
    console.log(`PASS ${item.name}`);
  } catch (error) {
    observed += 1;
    console.log(`RED ${item.name}: ${error.message}`);
  }
}

const redSatisfied = expectRed ? observed >= 1 && unexpectedPass === 0 : observed === 0;
console.log(JSON.stringify({
  MODE: expectRed ? "PRE_CORRECTIVE_RED" : "POST_CORRECTIVE_GREEN",
  AUTH_ADAPTER_RED_TEST_COUNT: expectRed ? 1 : 0,
  AUTH_ADAPTER_RED_OBSERVED_COUNT: expectRed ? observed : 0,
  AUTH_ADAPTER_RED_UNEXPECTED_PASS_COUNT: expectRed ? unexpectedPass : 0,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - observed,
  FOCUSED_TEST_FAIL: observed,
}, null, 2));
if (!redSatisfied) process.exitCode = 1;
