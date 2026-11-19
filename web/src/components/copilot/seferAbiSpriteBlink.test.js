import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SPRITE_BLINK_DEFAULT_ENABLED,
  SPRITE_BLINK_EXPERIMENT_ENABLED,
  SPRITE_BLINK_SEQUENCE,
  getSeferAbiSpriteFrame,
  getSeferAbiSpriteFrameBoundary,
  isSpriteBlinkTrialEnabled,
} from "./seferAbiSpriteBlink.js";

const avatarSource = readFileSync(new URL("./SeferAbiAvatar.jsx", import.meta.url), "utf8");

test("sprite blink defaults on for canonical DEMO and keeps a reversible static override", () => {
  assert.equal(SPRITE_BLINK_DEFAULT_ENABLED, true);
  assert.equal(SPRITE_BLINK_EXPERIMENT_ENABLED, true);
  assert.equal(isSpriteBlinkTrialEnabled({ search: "", hash: "#/room" }), true);
  assert.equal(isSpriteBlinkTrialEnabled({ search: "?seferAbiSpriteBlink=1", hash: "#/room" }), true);
  assert.equal(isSpriteBlinkTrialEnabled({ search: "?seferAbiSpriteBlink=0", hash: "#/room" }), false);
  assert.equal(isSpriteBlinkTrialEnabled({ search: "", hash: "#/room?seferAbiSpriteBlink=1" }), true);
  assert.match(avatarSource, /FACIAL_ANIMATION_VISUAL_APPROVED\s*=\s*false/);
});

test("sprite sequence is open → half-close → closed → half-open → open", () => {
  assert.deepEqual(SPRITE_BLINK_SEQUENCE.map(({ key }) => key), ["open", "halfClose", "closed", "halfOpen", "open"]);
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 0, state: "idle" }).key, "open");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_200, state: "idle" }).key, "halfClose");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_300, state: "idle" }).key, "closed");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_500, state: "idle" }).key, "halfOpen");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_600, state: "idle" }).key, "open");
});

test("sprite blink is static for non-idle, reduced-motion, and invalid timing states", () => {
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_300, state: "thinking" }).key, "open");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: 5_300, state: "idle", reducedMotion: true }).key, "open");
  assert.equal(getSeferAbiSpriteFrame({ elapsedMs: Number.NaN, state: "idle" }).key, "open");
});

test("blink timing changes between cycles and exposes the next frame boundary", () => {
  const firstBoundary = getSeferAbiSpriteFrameBoundary(0);
  const secondCycleStart = getSeferAbiSpriteFrameBoundary(5_600) + 1;
  const secondBoundary = getSeferAbiSpriteFrameBoundary(secondCycleStart);
  assert.ok(firstBoundary > 0);
  assert.ok(secondBoundary > secondCycleStart);
  assert.notEqual(secondBoundary - secondCycleStart, firstBoundary);
});

test("avatar keeps default sprite blink, reduced-motion fallback, and sprite error fallback", () => {
  assert.match(avatarSource, /isSpriteBlinkTrialEnabled/);
  assert.match(avatarSource, /data-sprite-animation=/);
  assert.match(avatarSource, /data-sprite-frame=/);
  assert.match(avatarSource, /setSpriteStatus\(\{ key: spriteLoadKey, ready: false, failed: true \}\)/);
  assert.match(avatarSource, /reducedMotion/);
  assert.match(avatarSource, /sefer-abi-sprite-blink/);
});
