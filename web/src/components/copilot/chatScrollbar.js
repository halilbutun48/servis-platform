function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getChatScrollbarMetrics({ scrollTop = 0, scrollHeight = 0, clientHeight = 0, trackHeight = 0, minThumbSize = 28 } = {}) {
  const safeTrackHeight = Math.max(0, Number(trackHeight) || 0);
  const safeScrollHeight = Math.max(0, Number(scrollHeight) || 0);
  const safeClientHeight = Math.max(0, Number(clientHeight) || 0);
  const maxScroll = Math.max(0, safeScrollHeight - safeClientHeight);
  if (!safeTrackHeight || !maxScroll || !safeScrollHeight) {
    return { maxScroll, thumbSize: safeTrackHeight, thumbOffset: 0, scrollRatio: 0 };
  }
  const thumbSize = Math.min(safeTrackHeight, Math.max(minThumbSize, safeTrackHeight * safeClientHeight / safeScrollHeight));
  const travel = Math.max(0, safeTrackHeight - thumbSize);
  const scrollRatio = clamp((Number(scrollTop) || 0) / maxScroll, 0, 1);
  return { maxScroll, thumbSize, thumbOffset: travel * scrollRatio, scrollRatio };
}

export function scrollTopFromScrollbarPointer({ pointerPosition = 0, trackStart = 0, trackHeight = 0, thumbSize = 0, pointerOffset = 0, maxScroll = 0 } = {}) {
  const travel = Math.max(0, (Number(trackHeight) || 0) - (Number(thumbSize) || 0));
  if (!travel || !(Number(maxScroll) > 0)) return 0;
  const nextThumbOffset = clamp((Number(pointerPosition) || 0) - (Number(trackStart) || 0) - (Number(pointerOffset) || 0), 0, travel);
  return (nextThumbOffset / travel) * maxScroll;
}
