import assert from "node:assert/strict";
import test from "node:test";

import { firstPinChangeErrorMessage } from "./pinChangeErrorMessage.js";

test("nested API error payload becomes a Turkish current-PIN message", () => {
  const message = firstPinChangeErrorMessage({
    payload: {
      error: {
        code: "BAD_CURRENT_PIN",
        message: "Mevcut PIN hatalı.",
      },
    },
    message: "Mevcut PIN hatalı.",
  });

  assert.equal(message, "Mevcut PIN hatalı.");
  assert.notEqual(message, "[object Object]");
});
