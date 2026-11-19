const FINANCE_USER_FACING_LABELS = Object.freeze({
  ACTUAL: "Gerçekleşen",
  BUDGET: "Bütçe",
  FORECAST: "Tahmin",
  ACCRUAL: "Tahakkuk / beklenen gider",
  PLAN: "Planlama",
  AVAILABLE: "Mevcut",
  NOT_REQUESTED: "İstenmedi",
  UNKNOWN: "Bilgi eksik",
  NOT_PROVEN: "Henüz doğrulanmadı",
  READY: "Hesaplanabilir",
  DEMO_PLANNING_ASSUMPTION: "DEMO planlama varsayımı",
  PLANLAMA_VARSAYIMI: "Planlama varsayımı",
  OPERATIONAL_COST_MODEL: "İç maliyet modeli",
  OPERATIONAL_COST_MODEL_PARTIAL: "Kısmi iç maliyet modeli",
  REVIEW: "İnceleme gerekli",
  OPEN: "Açık",
  CLOSED: "Kapalı",
  ROOM_COST_LEDGER_ACTUAL: "Gerçekleşen gider defteri",
  INTERNAL_DATA_PLANNING_ESTIMATE: "İç veriye dayalı planlama tahmini",
  DOCUMENTED_VAT: "Belgeli KDV'li işlem",
  NOT_APPLICABLE: "KDV uygulanmaz",
  DOCUMENTED_EXEMPT: "Belgeli KDV istisnası",
  VERIFIED_ZERO_RATE: "Dayanağı doğrulanmış sıfır oran",
  DEDUCTIBLE: "İndirilebilir KDV",
  NON_DEDUCTIBLE: "İndirilemeyen KDV",
  OUT_OF_SCOPE: "KDV kapsamı dışı",
  COUNT_IN_ROLLUP: "Maliyete dahil",
  EXCLUDED_FROM_ROLLUP: "Maliyete dahil değil",
  DIRECT: "Doğrudan gider",
  VEHICLE: "Araç",
  DRIVER: "Sürücü",
  SHIFT: "Vardiya",
  AGREEMENT: "Sözleşme",
  OPERATION: "Operasyon",
});

const FINANCE_FIELD_LABELS = Object.freeze({
  actual: "Gerçekleşen",
  actualCost: "Gerçekleşen maliyet",
  actualCostMinor: "Gerçekleşen maliyet",
  budget: "Bütçe",
  forecast: "Tahmin",
  accrual: "Tahakkuk / beklenen gider",
  allocation: "Maliyet dağıtımı",
  allocationId: "Dağıtım kaydı",
  allocationQuantity: "Miktar",
  allocationUnit: "Birim",
  allocationUnitRateMinor: "Birim tutarı",
  sourceRef: "Kaynak bilgisi",
  evidenceRef: "Kanıt bilgisi",
  lineage: "Giderin kaynağı ve dağıtım geçmişi",
  blocker: "Tamamlanması gereken bilgiler",
  confirmedNetProfitMinor: "Kesinleşmiş net kâr",
  estimatedAfterTaxNetProfitMinor: "Vergi sonrası tahmini kâr",
  operatingProfitMinor: "Faaliyet kârı",
  grossActualCostMinor: "Brüt gerçekleşen maliyet",
  earnedRevenueMinor: "Kazanılmış dönem geliri",
  earnedRevenueEvidence: "Kazanılmış dönem geliri",
  contractTotalMinor: "Sözleşme toplamı",
  periodStart: "Dönem başlangıcı",
  periodEnd: "Dönem bitişi",
  vehicleId: "Araç",
  driverId: "Sürücü",
  agreementId: "Sözleşme",
  shiftId: "Vardiya / sefer",
  roomId: "Taşımacılık firması",
  userId: "Kullanıcı",
  vehicleCount: "Araç sayısı",
  vehicleType: "Araç tipi",
  vehicleCapacity: "Araç kapasitesi",
  passengerCount: "Yolcu sayısı",
  stopCount: "Durak sayısı",
  serviceDistanceKm: "Rota mesafesi",
  totalDistanceKm: "Toplam mesafe",
  routeDurationMinutes: "Rota süresi",
  serviceDayCount: "Hizmet günü",
});

const FINANCE_ERROR_LABELS = Object.freeze({
  ROOM_COST_ENTRY_NOT_FOUND: "İlgili gider kaydı bulunamadı.",
  ROOM_COST_FORBIDDEN: "Bu finans kaydını görme veya değiştirme yetkiniz yok.",
  ROOM_COST_TENANT_MISMATCH: "Bu kayıt sizin taşımacılık firmanıza ait değil.",
  DENY_BEFORE_RETRIEVAL: "Bu bilgiye erişim yetkiniz bulunmuyor.",
  VALIDATION_ERROR: "Bilgileri kontrol edip tekrar deneyin.",
  INTERNAL_SERVER_ERROR: "İşlem tamamlanamadı. Lütfen daha sonra tekrar deneyin.",
});

function keyOf(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function financeUserFacingLabel(value, fallback = "Belirtilmedi") {
  const key = keyOf(value);
  if (!key) return fallback;
  return FINANCE_USER_FACING_LABELS[key] || fallback;
}

function replaceKnownFieldNames(text) {
  return text.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, (token) => {
    const key = token.trim();
    return FINANCE_FIELD_LABELS[key] || FINANCE_USER_FACING_LABELS[key.toUpperCase()] || token;
  });
}

/**
 * Visible financial text boundary. Internal enums/field names remain available
 * to the server and audit trail, but never become the user's vocabulary.
 */
export function financeUserFacingText(value, fallback = "Belirtilmedi") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (/^[[{].*[}\]]$/.test(raw) || /(?:stack trace| at [A-Za-z_$]|node_modules|HTTP\s*\d{3})/i.test(raw)) return fallback;

  let text = raw
    .replace(/\bestimatedAfterTaxNetProfitMinor\b/g, "Vergi sonrası tahmini kâr")
    .replace(/\bconfirmedNetProfitMinor\b/g, "Kesinleşmiş net kâr")
    .replace(/\bsourceRef\b/g, "Kaynak bilgisi")
    .replace(/\bvatEvidenceRef\b/g, "KDV belge bilgisi")
    .replace(/\b[A-Za-z][A-Za-z0-9_]*Id\b/g, (token) => FINANCE_FIELD_LABELS[token] || "ilgili kayıt")
    .replace(/\b[A-Za-z][A-Za-z0-9_]*ID\b/g, (token) => FINANCE_FIELD_LABELS[token] || "ilgili kayıt")
    .replace(/\bID\b/gi, "No")
    .replace(/\bAllocation\b/gi, "Maliyet dağıtımı")
    .replace(/\bLineage\b/gi, "Giderin kaynağı ve dağıtım geçmişi")
    .replace(/\bBlocker\b/gi, "Tamamlanması gereken bilgiler")
    .replace(/\bTOTP\b/gi, "Ek güvenlik doğrulaması")
    .replace(/\bSMS\b/gi, "Telefon doğrulaması")
    .replace(/\bstep[- ]?up\b/gi, "ek doğrulama")
    .replace(/\bprovider\b/gi, "doğrulama hizmeti")
    .replace(/\bNOT_PROVEN\b/g, "Henüz doğrulanmadı")
    .replace(/\bUNKNOWN\b/g, "Bilgi eksik")
    .replace(/\bACTUAL\b/g, "Gerçekleşen")
    .replace(/\bBUDGET\b/g, "Bütçe")
    .replace(/\bFORECAST\b/g, "Tahmin")
    .replace(/\bACCRUAL\b/g, "Tahakkuk / beklenen gider")
    .replace(/\bREADY\b/g, "Hesaplanabilir");

  return replaceKnownFieldNames(text)
    .replace(/\bcanonical\b|\bkanonik\b/gi, "doğrulanmış")
    .replace(/\b(?:API|JSON|debug|developer|internal)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim() || fallback;
}

export function financeUserFacingError(error, fallback = "İşlem tamamlanamadı.") {
  const raw = typeof error === "string" ? error : error?.message || error?.code || "";
  const key = keyOf(raw).replace(/\s+/g, "_");
  return FINANCE_ERROR_LABELS[key] || financeUserFacingText(raw, fallback);
}

export function financeCostBasisLabel(value, fallback = "Maliyet kanıtı belirtilmedi") {
  return financeUserFacingLabel(value, fallback);
}

export function financeComparisonStatusLabel(value, fallback = "Belirtilmedi") {
  return financeUserFacingLabel(value, fallback);
}

export function financeScenarioComponentStatusLabel(component) {
  if (!component || component.includedInBaseline === true) return null;
  const status = keyOf(component.status);
  const missingFields = Array.isArray(component.missingFields) && component.missingFields.length > 0;
  if (missingFields || status === "INCOMPLETE" || status === "BLOCKED") return "Kanıt eksik";
  return "Kapsam dışında";
}
