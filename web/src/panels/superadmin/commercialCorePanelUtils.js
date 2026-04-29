export async function downloadWithToken(url, token, filenameHint) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename="([^"]+)"/i);
  const filename = m?.[1] || filenameHint || "payment_sources.csv";
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export function buildPaymentSourceQuery(filters = {}, take = 20) {
  const qs = new URLSearchParams();
  qs.set("take", String(take));
  const sourceType = String(filters?.sourceType || "").trim();
  if (sourceType && sourceType !== "ALL") qs.set("sourceType", sourceType);
  const paymentMode = String(filters?.paymentMode || "").trim();
  if (paymentMode && paymentMode !== "ALL") qs.set("paymentMode", paymentMode);
  const settlementStatus = String(filters?.settlementStatus || "").trim();
  if (settlementStatus && settlementStatus !== "ALL") qs.set("settlementStatus", settlementStatus);
  const companyId = String(filters?.companyId || "").trim();
  if (companyId) qs.set("companyId", companyId);
  const roomId = String(filters?.roomId || "").trim();
  if (roomId) qs.set("roomId", roomId);
  const q = String(filters?.q || "").trim();
  if (q) qs.set("q", q);
  const from = String(filters?.from || "").trim();
  if (from) qs.set("from", from);
  const to = String(filters?.to || "").trim();
  if (to) qs.set("to", to);
  return qs;
}
