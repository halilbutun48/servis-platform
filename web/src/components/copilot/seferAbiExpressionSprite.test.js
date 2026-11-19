import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SEFER_ABI_EXPRESSION_ASSETS,
  getSeferAbiExpressionAsset,
  getSeferAbiExpressionKey,
  getSeferAbiExpressionPreloadAssets,
  getSeferAbiExpressionVariant,
} from "./seferAbiExpressionSprite.js";

const avatarSource = readFileSync(new URL("./SeferAbiAvatar.jsx", import.meta.url), "utf8");

test("approved expression states resolve to distinct candidate sprite assets", () => {
  assert.equal(getSeferAbiExpressionKey("listening"), "listening");
  assert.equal(getSeferAbiExpressionKey("thinking"), "thinking");
  assert.equal(getSeferAbiExpressionKey("responding"), "speaking");
  assert.equal(getSeferAbiExpressionKey("result-ready"), "success");
  assert.equal(getSeferAbiExpressionKey("attention"), "warning");
  assert.equal(getSeferAbiExpressionKey("approval-required"), "warning");
  assert.equal(getSeferAbiExpressionKey("idle"), null);

  const assets = Object.values(SEFER_ABI_EXPRESSION_ASSETS);
  assert.equal(new Set(assets).size, assets.length);
  for (const state of ["listening", "thinking", "speaking", "success", "warning"]) {
    assert.match(getSeferAbiExpressionAsset(state), /sefer-abi-expressions/);
  }
});

test("unknown or hover states do not replace the approved idle blink", () => {
  assert.equal(getSeferAbiExpressionKey("hover-focus"), null);
  assert.equal(getSeferAbiExpressionKey("unknown"), null);
  assert.equal(getSeferAbiExpressionAsset("idle"), null);
});

test("expression preload plan covers every approved state asset", () => {
  const assets = getSeferAbiExpressionPreloadAssets();
  assert.equal(assets.length, 5);
  assert.equal(new Set(assets).size, 5);
  assert.ok(assets.every((asset) => asset.endsWith(".png")));
});

test("live expression states resolve to conservative catalog frames", () => {
  assert.deepEqual(getSeferAbiExpressionVariant("listening"), { kind: "frame", frameId: "frame-05" });
  assert.deepEqual(getSeferAbiExpressionVariant("thinking"), { kind: "frame", frameId: "frame-07" });
  assert.deepEqual(getSeferAbiExpressionVariant("result-ready"), { kind: "frame", frameId: "frame-13" });
  assert.deepEqual(getSeferAbiExpressionVariant("attention"), { kind: "frame", frameId: "frame-08" });
  assert.deepEqual(getSeferAbiExpressionVariant("approval-required"), { kind: "frame", frameId: "frame-15" });
  assert.deepEqual(getSeferAbiExpressionVariant("responding"), { kind: "asset", asset: getSeferAbiExpressionAsset("responding") });
});

test("avatar renders candidate expressions only for non-idle states and retains a static fallback", () => {
  assert.match(avatarSource, /getSeferAbiExpressionAsset/);
  assert.match(avatarSource, /expressionVisible/);
  assert.match(avatarSource, /spriteVisible/);
  assert.match(avatarSource, /seferAbiAvatar__expression/);
  assert.match(avatarSource, /setSpriteStatus\(\{ key: spriteLoadKey, ready: false, failed: true \}\)/);
});

test("expression transitions retain the current layer until the next image is painted", () => {
  assert.match(avatarSource, /visibleExpressionAsset/);
  assert.match(avatarSource, /pendingExpressionAsset/);
  assert.match(avatarSource, /handleExpressionLoad/);
  assert.match(avatarSource, /expressionTransition/);
  assert.match(avatarSource, /handleExpressionLoad\(descriptor\)/);
  assert.match(avatarSource, /renderExpressionLayer\(visibleExpressionAsset/);
  assert.match(avatarSource, /renderExpressionLayer\(pendingExpressionAsset/);
});

test("catalog frames render through the same pending/current transition layers", () => {
  assert.match(avatarSource, /getSeferAbiExpressionVariant/);
  assert.match(avatarSource, /seferAbiExpressionSpriteSetAsset/);
  assert.match(avatarSource, /getSeferAbiExpressionFrameBackgroundPosition/);
  assert.match(avatarSource, /seferAbiAvatar__expressionFrame/);
  assert.match(avatarSource, /frameId/);
});
