import assert from "node:assert/strict";
import fs from "node:fs";

const sourcePath = new URL("../src/routes/agreements.js", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const routeStart = source.indexOf('r.put("/:id/cancel"');
assert.notEqual(routeStart, -1, "agreement cancel route must remain present");

const route = source.slice(routeStart, source.indexOf("\n\n  return r;", routeStart));
assert.match(route, /action:\s*"AGREEMENT_CANCELLED"/, "cancel must create an audit action");
assert.match(route, /entity:\s*"Agreement"/, "cancel audit must identify Agreement entity");
assert.match(route, /entityId:\s*updated\.id/, "cancel audit must point at the updated agreement");
assert.match(route, /previousStatus:\s*ag\.status/, "cancel audit must retain the previous status");

console.log("m18 agreement cancel audit regression: PASS");
