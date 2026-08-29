const REVIEWED_AT = "2026-08-29";
const VERSION = "SEFERPAKT-VEHICLE-CONSUMPTION-REFERENCE-V1";
const UNIT = "L_PER_100_KM";
const TECHNICAL_SOURCE = {
  sourceKind: "TECHNICAL_CLASS_REFERENCE",
  sourceName: "Kamu İhale Kurulu Kararı 2021/UH.II-2065",
  sourceUrl: "https://ekap.kik.gov.tr/EKAP/Vatandas/KurulKararGoster.aspx?KararId=1f3b68fb33ea4ee19851b5923a7523ec90bdcd52bee219b9be6424d9f3190a70&KararMetni=cf7848d477927f460e0fe86415953ca75bffaf21b349eebfe3bc7aedc148508c",
  sourceDate: "2021-11-11",
  reviewedAt: REVIEWED_AT,
  version: VERSION,
  geography: "Türkiye; resmi personel taşıma ihalesi bağlamı",
  sourceIdentity: "İSKİ Personel Taşıma Hizmeti alımı; yetkili servis belgeleriyle tevsik edilen sınıf örnekleri",
};

const TECHNICAL_REFERENCES = Object.freeze({
  MINIBUS: Object.freeze({
    vehicleClass: "MINIBUS",
    subtype: "Ford Minibüs",
    fuelType: "DIESEL",
    valueLitersPer100Km: 7.9,
    rawValueOrRange: "7,9 L/100 km",
    confidence: "MEDIUM",
    applicabilityLimits: "Ford minibüs sınıfı için resmi ihale kararında bildirilen değer; model, yük, trafik ve kullanım biçimine göre gerçek tüketim değişir.",
    corroboratingSources: ["Ford Transit Minibüs teknik broşürü; tip test değeri bireysel araç tüketimi değildir."],
  }),
  MIDIBUS: Object.freeze({
    vehicleClass: "MIDIBUS",
    subtype: "Otokar Sultan Midibüs",
    fuelType: "DIESEL",
    valueLitersPer100Km: 21,
    rawValueOrRange: "21 L/100 km",
    confidence: "MEDIUM",
    applicabilityLimits: "Otokar Sultan midibüs sınıfı için resmi ihale kararında bildirilen değer; Sultan alt modeli, yük, trafik ve kullanım biçimine göre gerçek tüketim değişir.",
    corroboratingSources: ["Otokar Sultan Comfort resmi ürün tanımı; dizel servis/personel taşıma aracı ve kapasite varyasyonları."],
  }),
  OTOBUS: Object.freeze({
    vehicleClass: "OTOBUS",
    subtype: "MAN otobüs",
    fuelType: "DIESEL",
    valueLitersPer100Km: 29,
    rawValueOrRange: "29 L/100 km",
    confidence: "LOW",
    applicabilityLimits: "MAN otobüs için resmi ihale kararında bildirilen sınıf örneği; alt tip/kapasite/görev çevrimi bilinmediğinden evrensel otobüs değeri değildir.",
    corroboratingSources: [],
  }),
});

const PRECEDENCE = Object.freeze([
  "USER_ACTUAL",
  "PLATFORM_OBSERVED_REFERENCE",
  "TECHNICAL_CLASS_REFERENCE",
  "NO_DATA",
]);

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeClass(value) {
  const normalized = compact(value).toUpperCase();
  return Object.prototype.hasOwnProperty.call(TECHNICAL_REFERENCES, normalized) ? normalized : null;
}

function normalizeFuelType(value) {
  const normalized = compact(value).toUpperCase();
  return normalized || null;
}

function positiveValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 100 ? number : null;
}

function normalizedRange(value) {
  const range = value && typeof value === "object" ? value : null;
  const min = positiveValue(range?.minLitersPer100Km ?? range?.min ?? range?.minValue);
  const max = positiveValue(range?.maxLitersPer100Km ?? range?.max ?? range?.maxValue);
  if (min === null || max === null || min > max) return null;
  return { minLitersPer100Km: min, maxLitersPer100Km: max };
}

function layerFromTechnical(vehicleClass) {
  const reference = TECHNICAL_REFERENCES[vehicleClass] || null;
  if (!reference) return {
    layer: "TECHNICAL_CLASS_REFERENCE",
    sourceKind: "TECHNICAL_CLASS_REFERENCE",
    available: false,
    vehicleClass: vehicleClass || null,
    selectionReason: "Araç sınıfı için onaylı teknik referans bulunamadı.",
  };
  return {
    ...TECHNICAL_SOURCE,
    ...reference,
    layer: "TECHNICAL_CLASS_REFERENCE",
    available: true,
    unit: UNIT,
    range: null,
    normalizedReference: reference.valueLitersPer100Km,
    selectionReason: "Sınıf için sürümlü teknik referans kullanıldı; gerçek araç tüketimi değildir.",
  };
}

function layerFromActual({ vehicleClass, fuelType, actualReference, actualValue }) {
  const reference = actualReference && typeof actualReference === "object" ? actualReference : {};
  const value = positiveValue(actualValue ?? reference.valueLitersPer100Km ?? reference.value ?? reference.normalizedReference);
  const range = normalizedRange(reference.range);
  if (value === null && !range) return {
    layer: "USER_ACTUAL",
    sourceKind: "USER_ACTUAL",
    available: false,
    vehicleClass: vehicleClass || null,
    fuelType: fuelType || reference.fuelType || null,
    unit: UNIT,
    selectionReason: "Bu araç/plan için açık kullanıcı veya yetkili actual tüketim değeri yok.",
  };
  return {
    layer: "USER_ACTUAL",
    sourceKind: "USER_ACTUAL",
    available: true,
    vehicleClass: vehicleClass || reference.vehicleClass || null,
    subtype: reference.subtype || null,
    fuelType: fuelType || reference.fuelType || null,
    valueLitersPer100Km: value,
    range,
    normalizedReference: value,
    unit: UNIT,
    sourceName: reference.sourceName || "Yetkili kullanıcı/plan actual verisi",
    sourceDate: reference.sourceDate || reference.asOf || null,
    reviewedAt: reference.reviewedAt || REVIEWED_AT,
    version: reference.version || VERSION,
    confidence: reference.confidence || "HIGH",
    geography: reference.geography || null,
    applicabilityLimits: reference.applicabilityLimits || "Yetkili actual değerin kapsamı ve ölçüm yöntemi korunmalıdır.",
    selectionReason: "Açık actual değer, referans değerlerin önünde kullanıldı.",
  };
}

function layerFromPlatform({ vehicleClass, fuelType, platformReference }) {
  const reference = platformReference && typeof platformReference === "object" ? platformReference : {};
  const referenceClass = normalizeClass(reference.vehicleClass);
  const value = positiveValue(reference.valueLitersPer100Km ?? reference.value ?? reference.normalizedReference);
  const range = normalizedRange(reference.range);
  const sampleCount = Number.isFinite(Number(reference.sampleCount)) ? Number(reference.sampleCount) : null;
  const minimumRequiredSampleCount = Number.isFinite(Number(reference.minimumRequiredSampleCount))
    ? Number(reference.minimumRequiredSampleCount)
    : 5;
  const sufficient = reference.available === true
    && (!referenceClass || !vehicleClass || referenceClass === vehicleClass)
    && sampleCount !== null
    && sampleCount >= minimumRequiredSampleCount
    && (value !== null || range);
  return {
    layer: "PLATFORM_OBSERVED_REFERENCE",
    sourceKind: "PLATFORM_OBSERVED_REFERENCE",
    available: sufficient,
    vehicleClass: vehicleClass || reference.vehicleClass || null,
    subtype: reference.subtype || null,
    fuelType: fuelType || reference.fuelType || null,
    valueLitersPer100Km: value,
    range,
    normalizedReference: value,
    unit: UNIT,
    sourceName: reference.sourceName || "SeferPakt anonimleştirilmiş gözlem referansı",
    sourceDate: reference.asOf || reference.sourceDate || null,
    reviewedAt: reference.reviewedAt || REVIEWED_AT,
    version: reference.version || "SEFERPAKT-OBSERVED-CONSUMPTION-V1",
    confidence: reference.confidence || (sufficient ? "MEDIUM" : "UNKNOWN"),
    geography: reference.geography || null,
    sampleCount,
    minimumRequiredSampleCount,
    privacy: { aggregatedOnly: true, rawTenantDataExposed: false },
    applicabilityLimits: reference.applicabilityLimits || "Yeterli anonimleştirilmiş sınıf gözlemiyle sınırlıdır.",
    selectionReason: sufficient
      ? "Yeterli gizlilik eşiğini geçen SeferPakt gözlemi kullanıldı."
      : "Gizlilik eşiğini geçen kullanılabilir SeferPakt tüketim gözlemi yok.",
  };
}

function fuelTypeCompatible(layer, fuelType) {
  if (!fuelType) return true;
  return !layer.fuelType || layer.fuelType === fuelType;
}

export function resolveVehicleConsumptionReference({
  vehicleType,
  fuelType,
  actualReference = null,
  actualValue = null,
  platformReference = null,
} = {}) {
  const vehicleClass = normalizeClass(vehicleType);
  const normalizedFuel = normalizeFuelType(fuelType);
  const actual = layerFromActual({ vehicleClass, fuelType: normalizedFuel, actualReference, actualValue });
  const platform = layerFromPlatform({ vehicleClass, fuelType: normalizedFuel, platformReference });
  const technical = layerFromTechnical(vehicleClass);
  const candidates = [actual, platform, technical].filter((layer) => fuelTypeCompatible(layer, normalizedFuel));
  const selected = candidates.find((layer) => layer.available) || {
    layer: null,
    sourceKind: "NO_DATA",
    available: false,
    vehicleClass,
    fuelType: normalizedFuel,
    unit: UNIT,
    confidence: "UNKNOWN",
    selectionReason: normalizedFuel && normalizedFuel !== "DIESEL"
      ? "Bu referans yalnız dizel sınıfı için onaylı; seçili yakıt türüyle uyumlu tüketim referansı yok."
      : "Güvenilir ve yetkili tüketim verisi yok.",
  };
  const missingData = [];
  if (!vehicleClass) missingData.push("Araç sınıfı");
  if (!normalizedFuel) missingData.push("Yakıt türü doğrulaması");
  if (!selected.available) missingData.push("Onaylı tüketim referansı");
  return {
    vehicleClass,
    fuelType: normalizedFuel,
    unit: UNIT,
    selected: { ...selected, authority: selected.sourceKind === "NO_DATA" ? "NO_DATA" : selected.sourceKind },
    layers: [actual, platform, technical],
    precedence: PRECEDENCE,
    status: selected.available ? "RESOLVED" : "NO_DATA",
    missingData,
    fuelTypeStatus: normalizedFuel ? "RESOLVED" : "UNRESOLVED",
    referenceVersion: VERSION,
  };
}

export function technicalVehicleConsumptionReference(vehicleType) {
  const vehicleClass = normalizeClass(vehicleType);
  return vehicleClass ? layerFromTechnical(vehicleClass) : null;
}

export const VEHICLE_CONSUMPTION_REFERENCE_VERSION = VERSION;
export const VEHICLE_CONSUMPTION_REFERENCE_UNIT = UNIT;
export const VEHICLE_CONSUMPTION_REFERENCE_PRECEDENCE = PRECEDENCE;
