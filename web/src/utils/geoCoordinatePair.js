function finiteNonZeroCoordinate(value, maxAbs) {
  if (value == null || value === "") return false;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric !== 0 && Math.abs(numeric) <= maxAbs;
}

export function hasValidCoordinatePair(lat, lng) {
  return finiteNonZeroCoordinate(lat, 90) && finiteNonZeroCoordinate(lng, 180);
}
