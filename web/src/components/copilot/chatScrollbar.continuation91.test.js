import test from "node:test";
import assert from "node:assert/strict";
import { getChatScrollbarMetrics, scrollTopFromScrollbarPointer } from "./chatScrollbar.js";

test("chat scrollbar keeps a bounded thumb and maps drag to transcript scroll", () => {
  const metrics = getChatScrollbarMetrics({ scrollTop: 0, scrollHeight: 1000, clientHeight: 400, trackHeight: 388 });
  assert.equal(metrics.maxScroll, 600);
  assert.equal(metrics.thumbOffset, 0);
  assert.ok(metrics.thumbSize >= 28 && metrics.thumbSize < 388);

  const bottom = scrollTopFromScrollbarPointer({
    pointerPosition: 388,
    trackStart: 0,
    trackHeight: 388,
    thumbSize: metrics.thumbSize,
    pointerOffset: metrics.thumbSize,
    maxScroll: metrics.maxScroll,
  });
  assert.equal(bottom, 600);
});

test("chat scrollbar clamps pointer movement and handles non-scrollable content", () => {
  const metrics = getChatScrollbarMetrics({ scrollTop: 0, scrollHeight: 300, clientHeight: 400, trackHeight: 388 });
  assert.deepEqual(metrics, { maxScroll: 0, thumbSize: 388, thumbOffset: 0, scrollRatio: 0 });
  assert.equal(scrollTopFromScrollbarPointer({ pointerPosition: -100, trackStart: 0, trackHeight: 388, thumbSize: 120, pointerOffset: 50, maxScroll: 600 }), 0);
});
