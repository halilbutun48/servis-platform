import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(new URL("./SeferAbiAvatar.jsx", import.meta.url), "utf8");

test("avatar keeps the approved PNG fallback and stable state contract", () => {
  assert.match(componentSource, /premiumAvatarAsset/);
  assert.match(componentSource, /seferAbiAvatar__fallback/);
  assert.match(componentSource, /seferAbiAvatar__canvas/);
  assert.match(componentSource, /data-sefer-abi-state=\{normalizedState\}/);
  assert.match(componentSource, /requestAnimationFrame/);
});

test("unapproved facial layers keep the original portrait visible", () => {
  assert.match(componentSource, /FACIAL_ANIMATION_VISUAL_APPROVED\s*=\s*false/);
  assert.match(componentSource, /data-facial-animation=\{FACIAL_ANIMATION_VISUAL_APPROVED \? "canvas" : "static"\}/);
  assert.match(componentSource, /seferAbiAvatar--static-portrait/);
});
