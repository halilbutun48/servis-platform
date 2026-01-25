export function safeParseJson(input, fallback = null) {
  if (input == null) return fallback;
  if (typeof input === "object") return input; // WS'ten object gelebilir
  if (typeof input !== "string") return fallback;
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}