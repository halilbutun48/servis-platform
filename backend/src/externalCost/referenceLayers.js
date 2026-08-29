import { CONFIDENCE, COMPLETENESS, FRESHNESS } from "./referenceContract.js";

export const REFERENCE_LAYER = Object.freeze({
  EXTERNAL: "EXTERNAL_MARKET_REFERENCE",
  PLATFORM: "SEFERPAKT_PLATFORM_REFERENCE",
  ACTUAL: "USER_COMPANY_ROOM_ACTUAL",
});

const PROVINCE_CODES = Object.freeze({
  ADANA: "01", ADIYAMAN: "02", AFYONKARAHISAR: "03", AGRI: "04", AMASYA: "05", ANKARA: "06", ANTALYA: "07", ARTVIN: "08", AYDIN: "09", BALIKESIR: "10", BILECIK: "11", BINGOL: "12", BITLIS: "13", BOLU: "14", BURDUR: "15", BURSA: "16", CANAKKALE: "17", CANKIRI: "18", CORUM: "19", DENIZLI: "20", DIYARBAKIR: "21", EDIRNE: "22", ELAZIG: "23", ERZINCAN: "24", ERZURUM: "25", ESKISEHIR: "26", GAZIANTEP: "27", GIRESUN: "28", GUMUSHANE: "29", HAKKARI: "30", HATAY: "31", ISPARTA: "32", MERSIN: "33", ISTANBUL: "34", IZMIR: "35", KARS: "36", KASTAMONU: "37", KAYSERI: "38", KIRKLARELI: "39", KIRSEHIR: "40", KOCAELI: "41", KONYA: "42", KUTAHYA: "43", MALATYA: "44", MANISA: "45", KAHRAMANMARAS: "46", MARDIN: "47", MUGLA: "48", MUS: "49", NEVSEHIR: "50", NIGDE: "51", ORDU: "52", RIZE: "53", SAKARYA: "54", SAMSUN: "55", SIIRT: "56", SINOP: "57", SIVAS: "58", TEKIRDAG: "59", TOKAT: "60", TRABZON: "61", TUNCELI: "62", SANLIURFA: "63", USAK: "64", VAN: "65", YOZGAT: "66", ZONGULDAK: "67", AKSARAY: "68", BAYBURT: "69", KARAMAN: "70", KIRIKKALE: "71", BATMAN: "72", SIRNAK: "73", BARTIN: "74", ARDAHAN: "75", IGDIR: "76", YALOVA: "77", KARABUK: "78", KILIS: "79", OSMANIYE: "80", DUZCE: "81",
});

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function token(value) {
  return compact(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/İ/g, "I").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
}

export function provinceCodeFromName(name) {
  const value = token(name);
  return PROVINCE_CODES[value] || null;
}

export function resolveRegionScope({ provinceCode = null, provinceName = null, requestedScope = "CITY" } = {}) {
  const explicitCode = compact(provinceCode);
  if (/^\d{1,3}$/.test(explicitCode)) {
    return { scopeType: requestedScope, scopeKey: explicitCode, regionCode: explicitCode, regionName: compact(provinceName) || null, selection: "EXACT_PROVINCE" };
  }
  const derivedCode = provinceCodeFromName(provinceName);
  if (derivedCode) {
    return { scopeType: requestedScope, scopeKey: derivedCode, regionCode: derivedCode, regionName: compact(provinceName), selection: "EXACT_PROVINCE" };
  }
  return { scopeType: "GLOBAL", scopeKey: "GLOBAL", regionCode: null, regionName: null, selection: "NO_GEOGRAPHY" };
}

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function median(values) {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)));
  return sorted[index];
}

export function buildPlatformObservedReference({ observations = [], region, minSampleCount = 5, windowDays = 90, now = new Date(), family = "REGIONAL_COST_REFERENCE", unit = "CURRENCY_PER_TRIP", currencyCode = "TRY", provenanceVersion = "SEFERPAKT-OBSERVED-REFERENCE-V1" } = {}) {
  const threshold = Math.max(1, Math.trunc(Number(minSampleCount) || 1));
  const eligible = observations
    .filter((observation) => observation?.eligible !== false)
    .map((observation) => ({
      valueMinor: numeric(observation.valueMinor),
      observedAt: observation.observedAt ? new Date(observation.observedAt) : null,
      regionCode: compact(observation.regionCode),
    }))
    .filter((observation) => observation.valueMinor !== null && observation.observedAt && !Number.isNaN(observation.observedAt.getTime()));
  const values = eligible.map((observation) => observation.valueMinor).sort((a, b) => a - b);
  const regionLabel = compact(region?.regionName || region?.regionCode) || "Türkiye";
  const base = {
    layer: REFERENCE_LAYER.PLATFORM,
    dataClass: "PLATFORM_OBSERVED_REFERENCE",
    regionCode: region?.regionCode || null,
    scopeType: region?.scopeType || "GLOBAL",
    scopeKey: region?.scopeKey || "GLOBAL",
    regionName: regionLabel,
    windowDays,
    sampleCount: eligible.length,
    minimumRequiredSampleCount: threshold,
    confidence: CONFIDENCE.UNKNOWN,
    completeness: COMPLETENESS.INCOMPLETE,
    provenance: provenanceVersion,
    privacy: { aggregatedOnly: true, rawTenantDataExposed: false, governance: "eligible-consented-observation-only" },
  };
  if (eligible.length < threshold) {
    return { ...base, available: false, state: "INSUFFICIENT_SAMPLE", selectionReason: `${regionLabel} için yeterli SeferPakt gözlemi yok.` };
  }
  return {
    ...base,
    available: true,
    state: "AVAILABLE",
    valueMinor: median(values),
    range: { minMinor: quantile(values, 0.25), maxMinor: quantile(values, 0.75) },
    unit,
    currencyCode,
    family,
    confidence: eligible.length >= threshold * 2 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
    completeness: COMPLETENESS.COMPLETE,
    selectionReason: `${regionLabel} için yeterli ve anonimleştirilmiş gözlem bulundu.`
      + ` Pencere: ${windowDays} gün; hesap: medyan ve çeyrekler aralığı.`,
    asOf: new Date(now).toISOString(),
  };
}

function layerFromExternal(external, region) {
  const reference = external?.marketReference || external || null;
  const available = Boolean(reference?.valueMinor != null || reference?.valueDecimal) && ![FRESHNESS.EXPIRED, FRESHNESS.SOURCE_UNAVAILABLE].includes(String(reference?.freshness || "").toUpperCase());
  return {
    layer: REFERENCE_LAYER.EXTERNAL,
    label: "Dış Piyasa Referansı",
    available,
    valueMinor: reference?.valueMinor ?? null,
    valueDecimal: reference?.valueDecimal ?? null,
    range: reference?.range || null,
    unit: reference?.unit || null,
    currencyCode: reference?.currencyCode || null,
    providerKey: reference?.providerKey || null,
    sourceName: reference?.sourceName || null,
    sourceUrl: reference?.sourceUrl || null,
    asOf: reference?.asOf || null,
    regionCode: reference?.regionCode || region?.regionCode || null,
    freshness: reference?.freshness || FRESHNESS.UNKNOWN,
    confidence: reference?.confidence || CONFIDENCE.UNKNOWN,
    completeness: reference?.completeness || COMPLETENESS.INCOMPLETE,
    selectionReason: available ? "Resmi provider verisi, istenen kapsamda seçildi." : "Uygun resmi dış veri yok.",
    origin: "official_external_provider",
  };
}

function layerFromActual(actual) {
  const valueMinor = numeric(actual?.valueMinor);
  return {
    layer: REFERENCE_LAYER.ACTUAL,
    label: "Senin Gerçek Verilerin",
    available: valueMinor !== null,
    valueMinor,
    valueDecimal: valueMinor === null ? null : (valueMinor / 100).toFixed(2),
    unit: actual?.unit || null,
    currencyCode: actual?.currencyCode || "TRY",
    asOf: actual?.asOf || null,
    window: actual?.window || null,
    geography: actual?.geography || null,
    confidence: actual?.confidence || (valueMinor === null ? CONFIDENCE.UNKNOWN : CONFIDENCE.HIGH),
    completeness: valueMinor === null ? COMPLETENESS.INCOMPLETE : COMPLETENESS.COMPLETE,
    selectionReason: valueMinor === null ? "Bu kapsamda kullanıcıya ait gerçek değer yok." : "Aynı operasyonun açıkça sağlanan gerçek değeri önceliklendirildi.",
    origin: "user_or_tenant_actual",
  };
}

export function resolveThreeReferenceLayers({ external, platform, actual, region, family = "FUEL_DIESEL" } = {}) {
  const externalLayer = layerFromExternal(external, region);
  const platformLayer = platform || buildPlatformObservedReference({ region, family });
  const actualLayer = layerFromActual(actual);
  const selected = actualLayer.available
    ? { ...actualLayer, authority: "USER_ACTUAL" }
    : family.startsWith("FUEL_") && externalLayer.available
      ? { ...externalLayer, authority: "EXTERNAL_DYNAMIC_FUEL" }
      : platformLayer.available
        ? { ...platformLayer, authority: "PLATFORM_OBSERVED" }
        : externalLayer.available
          ? { ...externalLayer, authority: "EXTERNAL_REFERENCE" }
          : { layer: null, available: false, authority: "NO_DATA", selectionReason: "Güvenilir ve yetkili veri yok." };
  return {
    layers: [externalLayer, platformLayer, actualLayer],
    selected,
    region: region || resolveRegionScope({}),
    separation: { externalPlatformActualDistinct: true, unlabeledMergedValue: false },
  };
}

export function buildPricingGuidance({ operationalCostMinor = null, quoteFloorMinor = null, observedQuoteBand = null, currencyCode = "TRY" } = {}) {
  const cost = numeric(operationalCostMinor);
  const safeFloor = numeric(quoteFloorMinor);
  const observed = observedQuoteBand && numeric(observedQuoteBand.minMinor) !== null && numeric(observedQuoteBand.maxMinor) !== null
    ? { minMinor: numeric(observedQuoteBand.minMinor), maxMinor: numeric(observedQuoteBand.maxMinor) }
    : null;
  const costBased = safeFloor === null && cost === null
    ? null
    : { minMinor: safeFloor ?? cost, maxMinor: safeFloor ?? cost, currencyCode, label: "Maliyet bazlı teklif rehberi" };
  const conflict = costBased && observed && (observed.maxMinor < costBased.minMinor || observed.minMinor > costBased.maxMinor);
  return {
    costBased,
    observedRegional: observed ? { ...observed, currencyCode, label: "Bölgesel gözlenen teklif bandı" } : { available: false, state: "INSUFFICIENT_SAMPLE", label: "Bölgesel gözlenen teklif bandı" },
    recommendedStartingBand: costBased ? { minMinor: Math.max(costBased.minMinor, observed?.minMinor || costBased.minMinor), maxMinor: Math.max(costBased.maxMinor, observed?.maxMinor || costBased.maxMinor), currencyCode } : null,
    conflict: Boolean(conflict),
    conflictExplanation: conflict ? "Maliyet bazlı güvenli taban ile gözlenen bölgesel bandın kapsamı çakışmıyor; yapay bir ortak aralık üretilmedi." : null,
    automaticOfferAction: false,
    usesCanonicalQuoteFloor: true,
  };
}
