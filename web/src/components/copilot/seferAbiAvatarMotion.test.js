import assert from "node:assert/strict";
import test from "node:test";

import {
  getSeferAbiBlinkProgress,
  getSeferAbiMotionFrame,
} from "./seferAbiAvatarMotion.js";

test("IDLE blink follows a bounded deterministic blink window", () => {
  assert.equal(getSeferAbiBlinkProgress(0), 0);
  assert.ok(getSeferAbiBlinkProgress(2_650) > 0.8);
  assert.equal(getSeferAbiBlinkProgress(3_000), 0);
  assert.equal(getSeferAbiBlinkProgress(2_650), getSeferAbiBlinkProgress(7_450));
});

test("IDLE head and face motion stays within a small portrait-safe range", () => {
  const frame = getSeferAbiMotionFrame({ state: "idle", elapsedMs: 1_234 });

  assert.ok(Math.abs(frame.head.x) <= 1);
  assert.ok(Math.abs(frame.head.y) <= 1);
  assert.ok(Math.abs(frame.head.rotate) <= 0.5);
  assert.ok(frame.head.scale >= 0.995 && frame.head.scale <= 1.005);
  assert.ok(frame.eyes.gazeX >= -1 && frame.eyes.gazeX <= 1);
  assert.ok(frame.eyes.gazeY >= -1 && frame.eyes.gazeY <= 1);
  assert.ok(frame.eyes.lid >= 0 && frame.eyes.lid <= 1);
  assert.deepEqual(frame, getSeferAbiMotionFrame({ state: "idle", elapsedMs: 1_234 }));
});

test("reduced motion freezes the portrait at a neutral frame", () => {
  const frame = getSeferAbiMotionFrame({ state: "idle", elapsedMs: 2_700, reducedMotion: true });

  assert.deepEqual(frame.head, { x: 0, y: 0, rotate: 0, scale: 1 });
  assert.deepEqual(frame.eyes, { gazeX: 0, gazeY: 0, lid: 0 });
  assert.deepEqual(frame.brows, { lift: 0, tilt: 0 });
  assert.deepEqual(frame.mouth, { open: 0, smile: 0 });
});

test("non-idle states express different intent without changing the source portrait", () => {
  const listening = getSeferAbiMotionFrame({ state: "listening", elapsedMs: 1_000 });
  const thinking = getSeferAbiMotionFrame({ state: "thinking", elapsedMs: 1_000 });
  const responding = getSeferAbiMotionFrame({ state: "responding", elapsedMs: 1_000 });
  const success = getSeferAbiMotionFrame({ state: "result-ready", elapsedMs: 1_000 });
  const warning = getSeferAbiMotionFrame({ state: "attention", elapsedMs: 1_000 });

  assert.ok(listening.eyes.gazeX > 0);
  assert.ok(thinking.eyes.gazeY < 0);
  assert.ok(responding.mouth.open > 0);
  assert.ok(success.mouth.smile > 0);
  assert.ok(warning.brows.lift < 0);
});

test("lifecycle aliases cover the approved states without claiming audio sync", () => {
  const states = ["idle", "listening", "thinking", "speaking", "success", "warning", "approval-required"];

  for (const state of states) {
    const frame = getSeferAbiMotionFrame({ state, elapsedMs: 1_000 });
    assert.equal(frame.audioSync, null);
  }

  assert.equal(getSeferAbiMotionFrame({ state: "speaking", elapsedMs: 1_000 }).state, "responding");
  assert.equal(getSeferAbiMotionFrame({ state: "success", elapsedMs: 1_000 }).state, "result-ready");
  assert.equal(getSeferAbiMotionFrame({ state: "warning", elapsedMs: 1_000 }).state, "attention");
  assert.ok(getSeferAbiMotionFrame({ state: "approval-required", elapsedMs: 1_000 }).brows.lift < 0);
});
