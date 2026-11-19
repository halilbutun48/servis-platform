const MATERIAL_COMPONENTS = Object.freeze([
  { key: "fuel", label: "Yakıt", category: "FUEL" },
  { key: "driver_labor", label: "Sürücü / personel", category: "EMPLOYER_MONTHLY_COST" },
  { key: "vehicle_variable", label: "Bakım / araç değişken maliyeti", category: "MAINTENANCE" },
  { key: "vehicle_fixed_allocated", label: "Araç kullanım / dönem maliyeti", category: "DEPRECIATION" },
  { key: "route_fees", label: "HGS / otoyol / köprü", category: "HGS_TOLL" },
  { key: "waiting_and_overtime", label: "Bekleme / fazla süre", category: "OTHER_OPERATION" },
  { key: "operations_overhead", label: "Operasyonel genel gider", category: "OPERATIONS_OVERHEAD" },
  { key: "other_direct_cost", label: "Diğer doğrudan maliyet", category: "OTHER_OPERATION" },
]);

function finiteAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function buildRoomQuoteCostBreakdown(item = {}) {
  const components = Array.isArray(item.planningComponentBreakdown) && item.planningComponentBreakdown.length
    ? item.planningComponentBreakdown
    : Array.isArray(item.componentBreakdown) ? item.componentBreakdown : [];
  const byKey = new Map(components.map((component) => [String(component?.key || component?.componentKey || "").trim(), component]));
  const included = [];
  const missing = [];

  for (const definition of MATERIAL_COMPONENTS) {
    const component = byKey.get(definition.key) || null;
    const amountMinor = finiteAmount(component?.amountMinor);
    const includedInBaseline = component?.includedInBaseline === true && amountMinor !== null;
    if (includedInBaseline) {
      included.push({ ...definition, component, amountMinor });
      continue;
    }
    if (definition.key !== "fuel" || component?.status === "incomplete" || component?.status === "excluded" || !component) {
      missing.push({
        ...definition,
        component,
        reason: component?.status === "incomplete" ? "Hesap için gerekli girdi eksik" : "Bu teklif döneminde kanıtlanmış planlama girdisi yok",
      });
    }
  }

  const partialTotalMinor = finiteAmount(item.planningCostMinor ?? item.comparisonCostMinor ?? item.costMinor);
  return {
    // A partial motor result is useful as evidence, but it is not a total
    // quote cost. The caller can still show the included components and the
    // missing list without turning fuel-only output into a price floor.
    totalMinor: missing.length ? null : partialTotalMinor,
    partialTotalMinor,
    included,
    missing,
    adblueSupported: components.some((component) => /adblue/i.test(`${component?.key || ""} ${component?.labelTr || ""}`)),
  };
}

export function quoteCostComponentSourceLabel(componentEvidence = {}) {
  const dataClass = String(componentEvidence?.dataClass || "").toUpperCase();
  if (dataClass.includes("ACTUAL")) return "Gerçek giderden türetilen planlama kanıtı";
  if (dataClass.includes("DEMO") || dataClass.includes("PLANNING") || dataClass.includes("FORECAST")) return "Planlama varsayımı; gerçekleşmiş gider değil";
  return "Kaynak sınıfı belirtilmedi";
}

export const ROOM_QUOTE_MATERIAL_COMPONENTS = MATERIAL_COMPONENTS;
