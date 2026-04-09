export function extractCheckinToken(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return "";

  const direct = txt.match(/psv1:[A-Za-z0-9_-]+/);
  if (direct?.[0]) return direct[0];

  try {
    const parsed = JSON.parse(txt);
    const nested = parsed?.token || parsed?.qr || parsed?.value;
    if (nested) {
      const m = String(nested).match(/psv1:[A-Za-z0-9_-]+/);
      if (m?.[0]) return m[0];
    }
  } catch {
    // best effort: plain text may not be valid JSON
  }

  try {
    const u = new URL(txt);
    const q = u.searchParams.get("token") || u.searchParams.get("qr") || u.searchParams.get("value");
    if (q) {
      const m = String(q).match(/psv1:[A-Za-z0-9_-]+/);
      if (m?.[0]) return m[0];
    }
  } catch {
    // best effort: input may not be a valid URL
  }

  return txt.startsWith("psv1:") ? txt : "";
}
