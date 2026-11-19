import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRouteEvidenceReturnPath } from "./routeEvidenceReturn.js";

test("route evidence return path accepts only the ROOM financial surface", () => {
  assert.equal(
    normalizeRouteEvidenceReturnPath("/room/financial-operations?view=service-cost&focusShiftId=301"),
    "/room/financial-operations?view=service-cost&focusShiftId=301",
  );
  assert.equal(normalizeRouteEvidenceReturnPath("https://example.com/steal"), "");
  assert.equal(normalizeRouteEvidenceReturnPath("/room/shifts?focusShiftId=301"), "");
});
