const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "refreshtoken",
  "refresh-token",
  "code",
  "secret",
  "signature",
  "invitetoken",
  "invite_token",
]);

function isSensitiveQueryKey(key) {
  const normalized = String(key || "").trim().toLowerCase();
  if (!normalized) return false;
  if (SENSITIVE_QUERY_KEYS.has(normalized)) return true;
  return normalized.includes("token") || normalized.includes("secret") || normalized.includes("signature");
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function sanitizeRequestUrl(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return "";

  try {
    const parsed = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, "http://request.local");
    const pathname = parsed.pathname || "";
    const queryParts = [];

    for (const [key, value] of parsed.searchParams.entries()) {
      if (isSensitiveQueryKey(key)) {
        queryParts.push(`${key}=[REDACTED]`);
      } else {
        queryParts.push(`${key}=${encodeQueryValue(value)}`);
      }
    }

    return queryParts.length ? `${pathname}?${queryParts.join("&")}` : pathname;
  } catch {
    const [pathname] = raw.split("?");
    return pathname || raw;
  }
}
