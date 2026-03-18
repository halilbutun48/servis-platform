export const COMMERCIAL_CORE_STEPS = [
  { id: "demand_card", label: "Talep karti", status: "ACTIVE" },
  { id: "offer_lifecycle", label: "Teklif yasam dongusu", status: "ACTIVE" },
  { id: "counter_offer", label: "Karsi teklif", status: "PLANNED" },
  { id: "negotiation_history", label: "Pazarlik gecmisi", status: "PLANNED" },
  { id: "settlement_summary", label: "Uzlasma ozeti", status: "PLANNED" },
  { id: "contract_gate", label: "Sozlesmeye gecis kapisi", status: "PLANNED" },
];

export const COMMERCIAL_CORE_RULES = [
  "Talep karti acilmadan teklif sureci baslamaz.",
  "Teklif ve karsi teklif akisinda durum gorunurlugu korunur.",
  "Uzlasma ozeti olusmadan sozlesme baglanmaz.",
  "M62 green olmadan M63 acilmaz.",
];

export function getCommercialCoreManifest() {
  return {
    activeMilestone: "M62",
    title: "Ticari Omurga Guclendirme",
    steps: COMMERCIAL_CORE_STEPS,
    rules: COMMERCIAL_CORE_RULES,
  };
}

export function buildCommercialLifecycleTemplate() {
  return {
    activeMilestone: "M62",
    route: ["talep", "teklif", "karsi-teklif", "pazarlik-gecmisi", "uzlasma", "sozlesme"],
    summary: "Talep -> teklif -> karsi teklif -> pazarlik gecmisi -> uzlasma -> sozlesme omurgasi.",
  };
}
