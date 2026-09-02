const ROLE_LABELS = Object.freeze({
  SUPER_ADMIN: "Süper yönetici",
  ROOM: "Turizm/Taşımacılık Firması",
  COMPANY: "Hizmet Alan Firma",
  DRIVER: "Sürücü",
  PERSONEL: "Personel",
  PARENT: "Veli",
  SCHOOL: "Okul",
  ORGANIZATION: "Organizasyon",
  DEFAULT: "Kullanıcı",
});

const COMPANY_KIND_LABELS = Object.freeze({
  SCHOOL: "Okul",
  ORGANIZATION: "Organizasyon",
  COMPANY: "Hizmet Alan Firma",
});

const PREVIEW_STATUS_LABELS = Object.freeze({
  NO_BUDGET: "Onaylı bütçe yok",
  NO_SERVICE_COST: "Servis maliyeti yok",
  WITHIN_BUDGET: "Bütçe dengede",
  OVER_BUDGET: "Bütçe aşıldı",
  PARTIAL_PERIOD: "Dönem kısmi",
  MIXED_CURRENCY: "Para birimi uyumsuz",
  PERIOD_MISMATCH: "Dönem uyumsuz",
  REVIEW_REQUIRED: "İnceleme gerekli",
  BLOCKED: "Kilitli",
  INCOMPLETE: "Eksik veri",
});

const PREVIEW_STATUS_TONES = Object.freeze({
  NO_BUDGET: "warm",
  NO_SERVICE_COST: "warm",
  WITHIN_BUDGET: "good",
  OVER_BUDGET: "danger",
  PARTIAL_PERIOD: "warm",
  MIXED_CURRENCY: "danger",
  PERIOD_MISMATCH: "danger",
  REVIEW_REQUIRED: "warm",
  BLOCKED: "danger",
  INCOMPLETE: "warm",
});

const BUDGET_APPROVAL_LABELS = Object.freeze({
  DRAFT: "Taslak",
  SUBMITTED: "Gönderildi",
  APPROVED: "Onaylandı",
  ACTIVE: "Aktif",
  ARCHIVED: "Arşivlendi",
  REJECTED: "Reddedildi",
});

const LIFECYCLE_LABELS = Object.freeze({
  DRAFT: "Taslak",
  SUBMITTED: "Gönderildi",
  APPROVED: "Onaylandı",
  ACTIVE: "Aktif",
  ARCHIVED: "Arşivlendi",
  REJECTED: "Reddedildi",
  APPLIED: "Uygulandı",
});

const CONFIDENCE_LABELS = Object.freeze({
  PREVIEW: "Önizleme",
  LOW: "Düşük güven",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  BLOCKED: "Kilitli",
});

const CONFIDENCE_TONES = Object.freeze({
  PREVIEW: "muted",
  LOW: "warning",
  MEDIUM: "warning",
  HIGH: "ready",
  BLOCKED: "danger",
});

const MODEL_STATUS_LABELS = Object.freeze({
  COMPLETE: "Tamamlandı",
  PARTIAL: "Kısmi",
  INCOMPLETE: "Eksik veri",
  BLOCKED: "Kilitli",
  READY: "Hazır",
});

const MODEL_STATUS_TONES = Object.freeze({
  COMPLETE: "good",
  PARTIAL: "warm",
  INCOMPLETE: "warm",
  BLOCKED: "danger",
  READY: "good",
});

const BUDGET_SOURCE_LABELS = Object.freeze({
  APPROVED_BUDGET: "Onaylı bütçe",
  APPROVED_REVISED_BUDGET: "Revize onaylı bütçe",
  DRAFT_BUDGET: "Taslak bütçe",
  MISSING: "Eksik veri",
  CURRENT_BUDGET: "Mevcut bütçe",
  BUDGET: "Bütçe",
});

const SERVICE_COST_SOURCE_LABELS = Object.freeze({
  ACTUAL_SERVICE_SPEND: "Gerçekleşen servis harcaması",
  DELIVERED_SERVICE_COST_PREVIEW: "Teslim edilmiş servis maliyeti",
  CONTRACTED_SERVICE_COST: "Sözleşmeli servis maliyeti",
  AGREEMENT_PRICE: "Sözleşme fiyatı",
  OFFER_PRICE: "Teklif fiyatı",
  DELIVERED_SHIFT_COUNT_X_PER_SHIFT_PRICE: "Vardiya bazlı servis maliyeti",
  MISSING: "Eksik veri",
});

const BASELINE_SOURCE_LABELS = Object.freeze({
  MANUAL_BASELINE_OVERRIDE: "Manuel maliyet girdisi",
  PARTIAL_MODEL: "Kısmi model",
  INCOMPLETE: "Eksik veri",
  BLOCKED: "Kilitli",
  READY: "Hazır",
});

const SERVICE_COST_TAX_BASIS_LABELS = Object.freeze({
  CONTRACT: "Sözleşme",
  AGREEMENT: "Sözleşme",
  INVOICE: "Fatura",
  PREVIEW: "Önizleme",
  CURRENT: "Güncel",
  UNKNOWN: "Bilinmiyor",
});

const VARIANCE_DIRECTION_LABELS = Object.freeze({
  UNDER_BUDGET: "Planın altında kalan tutar",
  OVER_BUDGET: "Bütçe aşımı",
  ON_BUDGET: "Tam dengede",
  UNKNOWN: "Sapma yönü bilinmiyor",
});

const SERVICE_COST_COMPONENT_LABELS = Object.freeze({
  ACTUAL_SERVICE_SPEND: "Gerçekleşen servis harcaması",
  DELIVERED_SERVICE_COST_PREVIEW: "Teslim edilmiş servis maliyeti",
  CONTRACTED_SERVICE_COST: "Sözleşmeli servis maliyeti",
  AGREEMENT_PRICE: "Sözleşme fiyatı",
  OFFER_PRICE: "Teklif fiyatı",
  EXTERNAL_PREVIEW_ADJUSTMENTS: "Harici önizleme düzeltmeleri",
});

const FINANCE_FIELD_LABELS = Object.freeze({
  budgetPlanId: "Bütçe plan kimliği",
  budgetPlanVersion: "Plan sürümü",
  budgetAmountMinor: "Bütçe tutarı",
  periodStart: "Dönem başlangıcı",
  periodEnd: "Dönem bitişi",
  budgetSource: "Bütçe kaynağı",
  budgetApprovalState: "Onay durumu",
  description: "Açıklama",
  warningThresholdBps: "Uyarı eşiği",
  currencyCode: "Para birimi",
  roomQuoteFloorDraftId: "Taslak kimliği",
  roomQuoteFloorDraftVersion: "Taslak sürümü",
  manualBaselineOperationalCostMinor: "Manuel maliyet tabanı",
  targetContributionBps: "Hedef katkı oranı",
  riskReserveBps: "Risk payı",
  quoteFloorMinor: "Önerilen minimum teklif",
  quoteFloorPerPassengerMinor: "Kişi başı teklif",
  baselineSource: "Taban kaynağı",
  calculationVersion: "Hesaplama sürümü",
  serviceDistanceKm: "Servis mesafesi",
  routeDurationMinutes: "Rota süresi",
  passengerCount: "Yolcu sayısı",
  vehicleCapacity: "Araç kapasitesi",
  fuelConsumptionLitersPer100Km: "Yakıt tüketimi",
  fuelUnitPriceMinor: "Yakıt birim fiyatı",
  driverBasePerShiftMinor: "Sürücü temel maliyeti",
  maintenancePerKmMinor: "Km başı bakım maliyeti",
  vehicleLeaseMonthlyMinor: "Aylık araç kira maliyeti",
  shiftCount: "Vardiya sayısı",
  serviceDayCount: "Hizmet günü",
  actualServiceSpendMinor: "Gerçekleşen servis harcaması",
  contractedServiceCostMinor: "Sözleşmeli servis maliyeti",
  agreementPriceMinor: "Sözleşme fiyatı",
  offerPriceMinor: "Teklif fiyatı",
  deliveredShiftCount: "Gerçekleşen vardiya",
  deliveredTripCount: "Gerçekleşen sefer",
  deliveredServiceDayCount: "Hizmet verilen gün",
  activePersonCount: "Aktif kişi sayısı",
  plannedPersonCount: "Planlı kişi sayısı",
  costPerActivePersonMinor: "Personel başı maliyet",
  costPerPlannedPersonMinor: "Planlı kişi başı maliyet",
  costPerServiceDayMinor: "Gün başı maliyet",
  costPerShiftMinor: "Vardiya başı maliyet",
  costPerTripMinor: "Sefer başı maliyet",
  currentBudgetPlan: "Mevcut bütçe planı",
  currentRoomQuoteFloorDraft: "Mevcut teklif taslağı",
});

const EXTERNAL_REFERENCE_FRESHNESS_LABELS = Object.freeze({
  FRESH: "Güncel",
  STALE: "Güncelliği sınırlı",
  EXPIRED: "Kullanılamaz",
  SOURCE_UNAVAILABLE: "Kaynak kullanılamıyor",
  FALLBACK: "Alternatif kaynak",
  UNKNOWN: "Güncellik bilinmiyor",
});

const EXTERNAL_REFERENCE_FRESHNESS_TONES = Object.freeze({
  FRESH: "good",
  STALE: "warm",
  EXPIRED: "danger",
  SOURCE_UNAVAILABLE: "danger",
  FALLBACK: "warm",
  UNKNOWN: "warm",
});

const EXTERNAL_REFERENCE_CONFIDENCE_LABELS = Object.freeze({
  HIGH: "Yüksek güven",
  MEDIUM: "Orta güven",
  LOW: "Düşük güven",
  UNKNOWN: "Güven bilinmiyor",
});

const EXTERNAL_REFERENCE_CONFIDENCE_TONES = Object.freeze({
  HIGH: "good",
  MEDIUM: "warm",
  LOW: "danger",
  UNKNOWN: "warm",
});

const EXTERNAL_REFERENCE_UNIT_LABELS = Object.freeze({
  CURRENCY: "",
  CURRENCY_PER_L: "/L",
  CURRENCY_PER_KM: "/km",
  CURRENCY_PER_MONTH: "/ay",
  CURRENCY_PER_TRIP: "/sefer",
  CURRENCY_PER_UNIT: "/birim",
  RATE: "oran",
  INDEX_POINT: "endeks puanı",
});

function normalizeToken(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

function labelFromMap(value, map, fallback) {
  const key = normalizeToken(value);
  if (key && map[key]) return map[key];
  return fallback;
}

export function roleLabel(role) {
  return labelFromMap(role, ROLE_LABELS, ROLE_LABELS.DEFAULT);
}

export function companyKindLabel(kind) {
  return labelFromMap(kind, COMPANY_KIND_LABELS, "Hizmet Alan Firma");
}

export function previewStatusLabel(status) {
  return labelFromMap(status, PREVIEW_STATUS_LABELS, "Durum bekleniyor");
}

export function previewStatusTone(status) {
  return PREVIEW_STATUS_TONES[normalizeToken(status)] || "default";
}

export function budgetApprovalStateLabel(value) {
  const key = normalizeToken(value);
  return BUDGET_APPROVAL_LABELS[key] || "Bilinmiyor";
}

export function lifecycleStateLabel(value) {
  const key = normalizeToken(value);
  return LIFECYCLE_LABELS[key] || "Bilinmiyor";
}

export function confidenceLabel(value) {
  return labelFromMap(value, CONFIDENCE_LABELS, "Bilinmiyor");
}

export function confidenceTone(value) {
  return CONFIDENCE_TONES[normalizeToken(value)] || "muted";
}

export function modelStatusLabel(value) {
  return labelFromMap(value, MODEL_STATUS_LABELS, "Bilinmiyor");
}

export function modelStatusTone(value) {
  return MODEL_STATUS_TONES[normalizeToken(value)] || "muted";
}

export function budgetSourceLabel(value) {
  return labelFromMap(value, BUDGET_SOURCE_LABELS, "Bilinmiyor");
}

export function serviceCostSourceLabel(value) {
  return labelFromMap(value, SERVICE_COST_SOURCE_LABELS, "Bilinmiyor");
}

export function baselineSourceLabel(value) {
  return labelFromMap(value, BASELINE_SOURCE_LABELS, "Bilinmiyor");
}

export function serviceCostTaxBasisLabel(value) {
  return labelFromMap(value, SERVICE_COST_TAX_BASIS_LABELS, "Bilinmiyor");
}

export function budgetVarianceDirectionLabel(value) {
  return labelFromMap(value, VARIANCE_DIRECTION_LABELS, "Sapma yönü");
}

export function serviceCostComponentLabel(value) {
  const candidate = typeof value === "object" && value !== null ? value.key || value.label : value;
  const mapped = labelFromMap(candidate, SERVICE_COST_COMPONENT_LABELS, "");
  if (mapped) return mapped;
  const fallback = typeof value === "object" && value !== null ? value.label || value.key : value;
  const text = String(fallback ?? "").trim();
  return text || "Bileşen";
}

export function financeFieldLabel(value) {
  const key = String(value ?? "").trim();
  if (!key) return "İlgili alan";
  return FINANCE_FIELD_LABELS[key] || "İlgili alan";
}

export function financeFieldLabels(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const label = financeFieldLabel(value);
    const key = normalizeToken(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function currencyCodeLabel(value) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!code) return "Para birimi yok";
  if (code === "TRY") return "₺";
  return code;
}

export function externalReferenceFreshnessLabel(value) {
  return labelFromMap(value, EXTERNAL_REFERENCE_FRESHNESS_LABELS, "Güncellik bilinmiyor");
}

export function externalReferenceFreshnessTone(value) {
  return EXTERNAL_REFERENCE_FRESHNESS_TONES[normalizeToken(value)] || "warm";
}

export function externalReferenceConfidenceLabel(value) {
  return labelFromMap(value, EXTERNAL_REFERENCE_CONFIDENCE_LABELS, "Güven bilinmiyor");
}

export function externalReferenceConfidenceTone(value) {
  return EXTERNAL_REFERENCE_CONFIDENCE_TONES[normalizeToken(value)] || "warm";
}

export function externalReferenceUnitLabel(unit, currencyCode) {
  const unitKey = normalizeToken(unit);
  const suffix = EXTERNAL_REFERENCE_UNIT_LABELS[unitKey];
  if (suffix === undefined) return "Birim belirtilmemiş";
  const currency = currencyCodeLabel(currencyCode);
  if (unitKey === "RATE" || unitKey === "INDEX_POINT") return suffix;
  return `${currency}${suffix}`;
}

function externalReferenceDecimalLabel(value) {
  const text = String(value ?? "").trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return "-";
  const [whole, fraction] = text.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${groupedWhole}${fraction ? `,${fraction}` : ""}`;
}

export function externalReferenceValueLabel(value, unit, currencyCode) {
  const amount = externalReferenceDecimalLabel(value);
  if (amount === "-") return amount;
  const unitLabel = externalReferenceUnitLabel(unit, currencyCode);
  return unitLabel && /^[₺$€£A-Z]/.test(unitLabel)
    ? `${amount} ${unitLabel}`
    : `${amount} ${unitLabel}`;
}

export function externalReferenceFallbackLabel(value) {
  const key = normalizeToken(value);
  if (key === "STALE_CACHE") return "Önceki kayıt kullanılıyor";
  if (key === "FALLBACK_PROVIDER") return "Alternatif kaynak kullanılıyor";
  if (key === "NO_SAFE_FALLBACK") return "Güvenli alternatif yok";
  return "";
}

export function scopeLabel(scope) {
  const key = normalizeToken(scope);
  if (key === "ROOM") return "Turizm/Taşımacılık Firması";
  if (key === "COMPANY") return "Hizmet Alan Firma";
  return "Yüzey";
}

export function preferredScopeTitle(scope) {
  const key = normalizeToken(scope);
  if (key === "ROOM") return "Teklif ve Kârlılık";
  if (key === "COMPANY") return "Bütçe ve Servis Maliyeti";
  return "Finansal Operasyonlar";
}

export function preferredScopeSubtitle(scope) {
  const key = normalizeToken(scope);
  if (key === "ROOM") return "Taşımacılık Firması teklif taslağı, maliyet özeti ve karar desteği.";
  if (key === "COMPANY") return "Hizmet Alan Firma bütçe yaşam döngüsü, servis maliyeti ve karar desteği.";
  return "Finansal operasyon özeti.";
}

export function normalizeFinanceVisibleText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  return text
    .replace(/\bOda\s*\/\s*şirket\s*etiketi\b/gi, "Firma rolü")
    .replace(/\bOda\s+teklifi\b/gi, "Taşımacılık Firması teklifi")
    .replace(/\bOda\s+kârlılığı\b/gi, "Taşımacılık Firması kârlılığı")
    .replace(/\bOda\s+maliyeti\b/gi, "Taşımacılık Firması maliyeti")
    .replace(/\bOda\s+önizlemesi\b/gi, "Taşımacılık Firması önizlemesi")
    .replace(/\bOda\b/gi, "Taşımacılık Firması")
    .replace(/\bŞirket\b/gi, "Hizmet Alan Firma")
    .replace(/\bRoom\b/gi, "Taşımacılık Firması")
    .replace(/\bCompany\b/gi, "Hizmet Alan Firma")
    .replace(/\bAgreement price\b/gi, "Sözleşme fiyatı")
    .replace(/\bagreement_price\b/gi, "Sözleşme fiyatı")
    .replace(/\bOffer price\b/gi, "Teklif fiyatı")
    .replace(/\boffer_price\b/gi, "Teklif fiyatı")
    .replace(/\bspend\b/gi, "harcama")
    .replace(/\bdraft_budget\b/gi, "Taslak bütçe")
    .replace(/\bmanual-baseline-override\b/gi, "Manuel maliyet girdisi kullanılıyor")
    .replace(/\bBudget lifecycle proof\b/gi, "Bütçe yaşam döngüsü kanıtı")
    .replace(/\brevised\b/gi, "revize")
    .replace(/\bquote[-_\s]*floor\b/gi, "Önerilen minimum teklif")
    .replace(/\bread[-_\s]*only\b/gi, "salt okunur")
    .replace(/\bcanonical\b|\bkanonik\b/gi, "mevcut plan")
    .replace(/\bforecast\b/gi, "öngörü")
    .replace(/\bprojection\b/gi, "öngörü")
    .replace(/\bactual\b/gi, "gerçekleşen")
    .replace(/\bprovider\b/gi, "veri sağlayıcısı")
    .replace(/\bsettlement\b/gi, "mutabakat")
    .replace(/\bstatus\b/gi, "durum")
    .replace(/\bstep[-_\s]*up\b/gi, "ek doğrulama")
    .replace(/\bReference completeness\b/gi, "Kanıt kapsamı")
    .replace(/\bAVAILABLE\b/g, "Mevcut")
    .replace(/\bUNAVAILABLE\b/g, "Mevcut değil")
    .replace(/\bINSUFFICIENT SAMPLE\b/g, "Yeterli örnek yok")
    .replace(/\bNOT AVAILABLE\b/g, "Mevcut değil")
    .replace(/\bMISSING\b/g, "Eksik bilgi")
    .replace(/\bPARTIAL\b/g, "Kısmi")
    .replace(/\bREADY\b/g, "Hazır")
    .replace(/\bNO_BUDGET\b/g, "Onaylı bütçe yok")
    .replace(/\bno_budget\b/g, "Onaylı bütçe yok")
    .replace(/\bINCOMPLETE\b/g, "Eksik veri")
    .replace(/\bLOW\b/g, "Düşük güven")
    .replace(/\blow\b/g, "Düşük güven")
    .replace(/\bunder_budget\b/gi, "Planın altında kalan tutar")
    .replace(/\bover_budget\b/gi, "Bütçe aşımı")
    .replace(/\bon_budget\b/gi, "Tam dengede")
    .replace(/\bincomplete kald[ıi]\b/gi, "tamamlanamadı")
    .replace(/\bincomplete\b/gi, "eksik veri")
    .replace(/\bmissing\b/gi, "eksik veri")
    .replace(/\bDRAFT\b/g, "Taslak")
    .replace(/\bdraft\b/g, "Taslak")
    .replace(/\bARCHIVED\b/g, "Arşivlendi")
    .replace(/\barchived\b/g, "Arşivlendi")
    .replace(/\bcontract\b/gi, "Sözleşme")
    .replace(/\bcontract_period\b/gi, "Sözleşme dönemi")
    .replace(/\bcurrent_period\b/gi, "Geçerli dönem")
    .replace(/\bpreview_period\b/gi, "Önizleme dönemi")
    .replace(/\bsnapshot\b/gi, "Hesaplama özeti")
    .replace(/\bpreview\b/gi, "Önizleme")
    .replace(/\bSnapshot\b/gi, "Hesaplama özeti")
    .replace(/\bbudgetAmountMinor\b/g, "Bütçe tutarı")
    .replace(/\bperiodStart\b/g, "Dönem başlangıcı")
    .replace(/\bperiodEnd\b/g, "Dönem bitişi")
    .replace(/\bdeliveredTripCount\b/g, "Gerçekleşen sefer")
    .replace(/\bdeliveredServiceDayCount\b/g, "Hizmet verilen gün")
    .replace(/\bactivePersonCount\b/g, "Aktif kişi sayısı")
    .replace(/\bagreementPrice\b/g, "Sözleşme fiyatı")
    .replace(/\bofferPrice\b/g, "Teklif fiyatı")
    .replace(/\bTRY\b/g, "₺");
}
