function toText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

export function formatRegionOwnership(input) {
  const source = input?.regionOwnership && typeof input.regionOwnership === "object" ? input.regionOwnership : input;
  const regionName = toText(source?.regionName ?? source?.region?.name);
  const district = toText(source?.district);
  const regionId = source?.regionId != null ? toText(source.regionId) : null;

  const parts = [];
  if (regionName) parts.push(regionName);
  else if (regionId) parts.push(`#${regionId}`);
  if (district) parts.push(district);

  if (!parts.length) return "Bölge: -";
  return `Bölge: ${parts.join(" • ")}`;
}

export function hasRegionOwnership(input) {
  const source = input?.regionOwnership && typeof input.regionOwnership === "object" ? input.regionOwnership : input;
  return Boolean(
    source &&
    (toText(source.regionName) || toText(source?.region?.name) || toText(source.district) || source.regionId != null)
  );
}
