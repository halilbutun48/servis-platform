import test from "node:test";
import assert from "node:assert/strict";
import { parentRouter } from "./parent.js";

function routeFor(router, path) {
  return router.stack.find((layer) => layer.route?.path === path)?.route || null;
}

test("PARENT çocuk listesi canlı konum rızası olmadan veri handler'ına ulaşmaz", () => {
  const router = parentRouter();
  const childrenRoute = routeFor(router, "/children");
  const liveVehiclesRoute = routeFor(router, "/live/vehicles");

  assert.ok(childrenRoute, "children route must exist");
  assert.ok(liveVehiclesRoute, "live vehicles route must exist");
  assert.equal(childrenRoute.stack.length, 4, "children route must include auth, role, consent and handler");
  assert.equal(childrenRoute.stack[2].handle.name, "consentGateMiddleware");
  assert.equal(liveVehiclesRoute.stack[2].handle.name, "consentGateMiddleware");
});
