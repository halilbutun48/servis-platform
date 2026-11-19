import assert from "node:assert/strict";
import test from "node:test";

import {
  SEFER_ABI_EXPRESSION_FRAME_CATALOG,
  getSeferAbiExpressionFrame,
  getSeferAbiExpressionFrameIdsByRole,
} from "./seferAbiExpressionFrameCatalog.js";

test("16 candidate frames have an explicit role, quality decision, and source cell", () => {
  assert.equal(SEFER_ABI_EXPRESSION_FRAME_CATALOG.length, 16);
  const ids = new Set();
  for (const frame of SEFER_ABI_EXPRESSION_FRAME_CATALOG) {
    assert.match(frame.id, /^frame-\d{2}$/);
    assert.equal(ids.has(frame.id), false);
    ids.add(frame.id);
    assert.ok(Number.isInteger(frame.row) && frame.row >= 0 && frame.row < 4);
    assert.ok(Number.isInteger(frame.column) && frame.column >= 0 && frame.column < 4);
    assert.ok(["IDLE_CANDIDATE", "LISTENING", "THINKING", "SPEAKING_RESERVE", "SUCCESS", "WARNING", "UNUSED_CANDIDATE"].includes(frame.role));
    assert.ok(["LIVE_APPROVED", "RESERVED", "NOT_PROVEN", "REJECTED"].includes(frame.quality));
    assert.ok(String(frame.reason).trim().length > 10);
  }
});

test("speaking frames stay reserved for future audio sync and are not live enabled", () => {
  const speaking = getSeferAbiExpressionFrameIdsByRole("SPEAKING_RESERVE");
  assert.deepEqual(speaking, ["frame-09", "frame-10", "frame-11", "frame-12"]);
  speaking.forEach((id) => {
    const frame = getSeferAbiExpressionFrame(id);
    assert.equal(frame.audioSyncReady, true);
    assert.equal(frame.liveEnabled, false);
  });
});

test("live mapping excludes the approved idle blink and every unproven candidate", () => {
  const live = SEFER_ABI_EXPRESSION_FRAME_CATALOG.filter((frame) => frame.liveEnabled);
  assert.ok(live.length > 0);
  assert.ok(live.every((frame) => frame.quality === "LIVE_APPROVED"));
  assert.ok(live.every((frame) => frame.role !== "IDLE_CANDIDATE"));
  assert.ok(live.every((frame) => frame.role !== "SPEAKING_RESERVE"));
});

test("unknown frame identifiers fail closed", () => {
  assert.equal(getSeferAbiExpressionFrame("frame-99"), null);
  assert.deepEqual(getSeferAbiExpressionFrameIdsByRole("unknown"), []);
});
