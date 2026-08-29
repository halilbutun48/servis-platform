const REVIEWED_AT = "2026-08-29";
const VERSION = "SEFERPAKT-VEHICLE-PLAN-REFERENCE-V1";
const UNIT = "PERSONS_PER_VEHICLE";

const TECHNICAL_CAPACITY_REFERENCES = Object.freeze({
  MINIBUS: Object.freeze({
    vehicleClass: "MINIBUS",
    subtype: "Ford Transit Minibüs",
    minimumCapacity: 10,
    maximumCapacity: 17,
    sourceKind: "TECHNICAL_CLASS_REFERENCE",
    sourceName: "Ford Transit Minibüs Teknik ve Donanım Özellikleri",
    sourceUrl: "https://www.ford.com.tr/getmedia/8595b24b-d82e-4e35-8df9-a5677ed8adfe/transit-minibus-2018-temmuz-teknik-brosur.pdf.aspx?ext=.pdf",
    sourceDate: "2018-07",
    reviewedAt: REVIEWED_AT,
    version: VERSION,
    confidence: "MEDIUM",
    geography: "Türkiye teknik broşürü",
    applicabilityLimits: "10+1, 14+1 ve 17+1 konfigürasyon örnekleri; sürücü koltuğu kapasite ifadesinden ayrıştırılmıştır. Model ve yerleşim doğrulanmalıdır.",
  }),
  MIDIBUS: Object.freeze({
    vehicleClass: "MIDIBUS",
    subtype: "Otokar Sultan Comfort",
    minimumCapacity: 25,
    maximumCapacity: 29,
    sourceKind: "TECHNICAL_CLASS_REFERENCE",
    sourceName: "Otokar Sultan Comfort KS62TP-21 teknik broşürü",
    sourceUrl: "https://commercial.otokar.com.tr/OtokarTicari/media/Otokar-Ticari/brosur/SULTAN-COMFORT-EURO6-KS62TP-21-onizleme.pdf",
    sourceDate: "2021 (broşür/model kimliği)",
    reviewedAt: REVIEWED_AT,
    version: VERSION,
    confidence: "MEDIUM",
    geography: "Türkiye teknik broşürü",
    applicabilityLimits: "25+1, 27+1+1 ve 29+1 yerleşim örnekleri; gerçek araç yerleşimi ve yasal kapasite doğrulanmalıdır.",
  }),
  OTOBUS: Object.freeze({
    vehicleClass: "OTOBUS",
    subtype: "MAN otobüs sınıfı",
    minimumCapacity: 44,
    maximumCapacity: 61,
    sourceKind: "TECHNICAL_CLASS_REFERENCE",
    sourceName: "MAN Lion's Coach resmi teknik araç tanımları",
    sourceUrl: "https://www.man.eu/mea/en/bus/coaches/the-man-lion_s-coach/technology-and-specifications/man-lion_s-coach-technical-data.html",
    sourceDate: "2026-08-29 (güncel resmi ürün bilgisi)",
    reviewedAt: REVIEWED_AT,
    version: VERSION,
    confidence: "LOW",
    geography: "MAN resmi ürün bilgisi",
    applicabilityLimits: "MAN otobüs örnekleri 44–61 koltuk aralığı gösterir; seçili alt tip bilinmediği için güvenli hesapta alt sınır kullanılır, evrensel kapasite değildir.",
    corroboratingSources: ["https://press.mantruckandbus.com/france/download/59a75bd2-b10f-4dd3-8d0a-ac9954dce372/man-lion039s-coach-vehicle-description-en.pdf"],
  }),
});

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeClass(value) {
  const normalized = compact(value).toUpperCase();
  return Object.prototype.hasOwnProperty.call(TECHNICAL_CAPACITY_REFERENCES, normalized) ? normalized : null;
}

function positiveCapacity(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 200 ? number : null;
}

function layer({ vehicleClass, sourceKind, source, capacity, range, authority, selectionReason }) {
  return {
    vehicleClass,
    sourceKind,
    authority,
    available: capacity !== null,
    capacity,
    range,
    unit: UNIT,
    sourceName: source?.sourceName || null,
    sourceUrl: source?.sourceUrl || null,
    sourceDate: source?.sourceDate || null,
    reviewedAt: source?.reviewedAt || REVIEWED_AT,
    version: source?.version || VERSION,
    confidence: source?.confidence || "UNKNOWN",
    geography: source?.geography || null,
    applicabilityLimits: source?.applicabilityLimits || null,
    selectionReason,
  };
}

export function resolveVehicleCapacityReference({ vehicleType, actualCapacity = null, canonicalCapacity = null } = {}) {
  const vehicleClass = normalizeClass(vehicleType);
  const actual = positiveCapacity(actualCapacity);
  const canonical = positiveCapacity(canonicalCapacity);
  const technicalSource = TECHNICAL_CAPACITY_REFERENCES[vehicleClass] || null;
  const technical = technicalSource
    ? layer({
      vehicleClass,
      sourceKind: technicalSource.sourceKind,
      source: technicalSource,
      capacity: technicalSource.minimumCapacity,
      range: { minCapacity: technicalSource.minimumCapacity, maxCapacity: technicalSource.maximumCapacity },
      authority: "TECHNICAL_CLASS_REFERENCE",
      selectionReason: "Araç alt tipi bilinmediği için kaynaklı kapasite aralığının güvenli alt sınırı kullanıldı.",
    })
    : layer({ vehicleClass, sourceKind: "NO_DATA", source: null, capacity: null, range: null, authority: "NO_DATA", selectionReason: "Araç sınıfı için onaylı kapasite referansı bulunamadı." });
  const canonicalLayer = layer({
    vehicleClass,
    sourceKind: "CANONICAL_VEHICLE_MODEL",
    source: { sourceName: "SeferPakt kanonik araç modeli", version: VERSION, confidence: "HIGH" },
    capacity: canonical,
    range: canonical === null ? null : { minCapacity: canonical, maxCapacity: canonical },
    authority: "CANONICAL_VEHICLE_MODEL",
    selectionReason: canonical === null ? "Bu sınıf için kanonik model kapasitesi yok." : "Kanonik model kapasitesi kullanıldı.",
  });
  const actualLayer = layer({
    vehicleClass,
    sourceKind: "USER_OR_VEHICLE_ACTUAL",
    source: { sourceName: "Seçili araç kapasitesi", version: "VEHICLE_RECORD" , confidence: "HIGH" },
    capacity: actual,
    range: actual === null ? null : { minCapacity: actual, maxCapacity: actual },
    authority: "USER_OR_VEHICLE_ACTUAL",
    selectionReason: actual === null ? "Seçili araç için actual kapasite yok." : "Seçili aracın gerçek kapasitesi kullanıldı.",
  });
  const selected = actualLayer.available
    ? actualLayer
    : canonicalLayer.available
      ? canonicalLayer
      : technical;
  return {
    vehicleClass,
    unit: UNIT,
    selected,
    layers: [actualLayer, canonicalLayer, technical],
    precedence: ["USER_OR_VEHICLE_ACTUAL", "CANONICAL_VEHICLE_MODEL", "TECHNICAL_CLASS_REFERENCE", "NO_DATA"],
    status: selected.available ? "RESOLVED" : "NO_DATA",
    referenceVersion: VERSION,
  };
}

export const VEHICLE_PLAN_REFERENCE_VERSION = VERSION;
export const VEHICLE_PLAN_REFERENCE_UNIT = UNIT;
