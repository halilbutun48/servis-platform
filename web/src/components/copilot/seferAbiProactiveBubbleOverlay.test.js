import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

function cssBlock(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} CSS block must exist`);
  const end = css.indexOf("}", start);
  assert.notEqual(end, -1, `${selector} CSS block must close`);
  return css.slice(start, end);
}

test("proactive Sefer Abi bubble does not intercept guided-plan controls while its own actions remain interactive", () => {
  const bubble = cssBlock(".copilotProactiveBubble");
  const action = cssBlock(".copilotProactiveBubbleAction");
  const close = cssBlock(".copilotProactiveBubbleClose");

  assert.match(bubble, /pointer-events:\s*none\s*;/);
  assert.match(action, /pointer-events:\s*auto\s*;/);
  assert.match(close, /pointer-events:\s*auto\s*;/);
});
