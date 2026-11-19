export const ROOM_FINANCE_SECTIONS = Object.freeze([
  Object.freeze({ key: "overview", label: "Genel Durum", shortLabel: "Genel Durum" }),
  Object.freeze({ key: "expenses", label: "Giderlerim", shortLabel: "Giderlerim" }),
  Object.freeze({ key: "service-cost", label: "Servis Maliyeti", shortLabel: "Servis Maliyeti" }),
  Object.freeze({ key: "quote-profitability", label: "Teklif Değerlendir", shortLabel: "Teklif Değerlendir" }),
]);

const ROOM_FINANCE_SECTION_KEYS = new Set(ROOM_FINANCE_SECTIONS.map((section) => section.key));
const ROOM_FINANCE_VIEW_ALIASES = Object.freeze({
  "vehicle-comparison": "quote-profitability",
});

export function normalizeRoomFinanceView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const canonical = ROOM_FINANCE_VIEW_ALIASES[normalized] || normalized;
  return ROOM_FINANCE_SECTION_KEYS.has(canonical) ? canonical : "overview";
}

export function roomFinanceViewPath(view, extraParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extraParams || {})) {
    if (value === null || value === undefined || String(value).trim() === "") continue;
    params.set(key, String(value));
  }
  params.set("view", normalizeRoomFinanceView(view));
  return `/room/financial-operations?${params.toString()}`;
}
