import test from "node:test";
import assert from "node:assert/strict";
import { resizeDrawerFrame } from "./drawerGeometry.js";

const origin = { left: 400, top: 100, width: 500, height: 500 };
const bounds = { minWidth: 320, minHeight: 360, maxWidth: 720, maxHeight: 700 };
const viewport = { width: 1200, height: 900 };

test("all four drawer corners keep the opposite corner fixed", () => {
  const cases = [
    ["nw", { x: -80, y: -60 }, { left: 900, top: 600 }],
    ["ne", { x: 80, y: -60 }, { left: 400, top: 600 }],
    ["sw", { x: -80, y: 60 }, { left: 900, top: 100 }],
    ["se", { x: 80, y: 60 }, { left: 400, top: 100 }],
  ];
  for (const [corner, delta, opposite] of cases) {
    const frame = resizeDrawerFrame({ corner, origin, delta, bounds, viewport });
    assert.deepEqual(
      { left: frame.left + (corner.includes("e") ? 0 : frame.width), top: frame.top + (corner.includes("s") ? 0 : frame.height) },
      corner === "nw" ? { left: opposite.left, top: opposite.top } : { left: opposite.left, top: opposite.top },
    );
  }
});

test("corner resize is clamped to minimum size and viewport", () => {
  const frame = resizeDrawerFrame({
    corner: "nw",
    origin,
    delta: { x: 900, y: 900 },
    bounds,
    viewport,
  });
  assert.equal(frame.width, 320);
  assert.equal(frame.height, 360);
  assert.ok(frame.left >= 18);
  assert.ok(frame.top >= 18);
  assert.ok(frame.left + frame.width <= viewport.width - 18);
  assert.ok(frame.top + frame.height <= viewport.height - 18);
});

test("compact drawer corners remain usable inside a narrow touch viewport", () => {
  const compactOrigin = { left: 10, top: 80, width: 300, height: 360 };
  const compactViewport = { width: 320, height: 700 };
  const compactBounds = { minWidth: 280, minHeight: 220, maxWidth: 300, maxHeight: 676 };
  const frame = resizeDrawerFrame({
    corner: "se",
    origin: compactOrigin,
    delta: { x: 40, y: 120 },
    bounds: compactBounds,
    viewport: compactViewport,
    inset: 10,
  });
  assert.equal(frame.left, 10);
  assert.equal(frame.top, 80);
  assert.equal(frame.width, 300);
  assert.equal(frame.height, 480);
  assert.ok(frame.left >= 10);
  assert.ok(frame.top >= 10);
  assert.ok(frame.left + frame.width <= compactViewport.width - 10);
  assert.ok(frame.top + frame.height <= compactViewport.height - 10);
});
