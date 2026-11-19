import test from "node:test";
import assert from "node:assert/strict";
import { httpError, normalizeError } from "./http.js";

test("assigned shift replay errors are safe Turkish user-facing messages", () => {
  const result = normalizeError(httpError(
    409,
    "SHIFT_ALREADY_ASSIGNED",
    "Bu vardiya zaten bir taşımacılık firmasına atanmış.",
  ));

  assert.equal(result.status, 409);
  assert.deepEqual(result.body.error, {
    code: "SHIFT_ALREADY_ASSIGNED",
    message: "Bu vardiya zaten bir taşımacılık firmasına atanmış.",
  });
});
