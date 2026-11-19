export function displayCollectionAmount(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  return Number.isSafeInteger(Number(value)) ? Number(value) : fallback;
}
