function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate a corner resize while keeping the opposite corner fixed.
 * The returned frame is always inside the viewport inset and within the
 * supplied bounds. The same geometry is used by the compact drawer with a
 * smaller viewport inset so touch resizing keeps the opposite corner fixed.
 */
export function resizeDrawerFrame({ corner, origin, delta, bounds, viewport, inset = 18 }) {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  const oppositeRight = origin.left + origin.width;
  const oppositeBottom = origin.top + origin.height;
  const availableWidth = west ? oppositeRight - inset : viewport.width - inset - origin.left;
  const availableHeight = north ? oppositeBottom - inset : viewport.height - inset - origin.top;
  const minWidth = Math.min(bounds.minWidth, Math.max(0, availableWidth));
  const minHeight = Math.min(bounds.minHeight, Math.max(0, availableHeight));
  const maxWidth = Math.min(bounds.maxWidth, Math.max(minWidth, availableWidth));
  const maxHeight = Math.min(bounds.maxHeight, Math.max(minHeight, availableHeight));
  const width = clamp(origin.width + (west ? -delta.x : delta.x), minWidth, maxWidth);
  const height = clamp(origin.height + (north ? -delta.y : delta.y), minHeight, maxHeight);

  return {
    left: Math.round(west ? oppositeRight - width : origin.left),
    top: Math.round(north ? oppositeBottom - height : origin.top),
    width: Math.round(width),
    height: Math.round(height),
  };
}
