export function getPublicBaseUrl() {
  const raw = String(import.meta.env.VITE_PUBLIC_BASE_URL || "").trim();
  if (raw) return raw.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return String(window.location.origin).replace(/\/$/, "");
  return "";
}

export function makeHashLink(pathWithHash) {
  const base = getPublicBaseUrl();
  const path = String(pathWithHash || "").trim();
  if (!base) return path;
  if (!path) return base;
  return `${base}${path.startsWith("#") ? "/" : ""}${path}`;
}
