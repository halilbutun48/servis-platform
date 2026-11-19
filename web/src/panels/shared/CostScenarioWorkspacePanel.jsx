import { useEffect, useMemo, useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import { getCostScenarioBaseline, getExternalCostReferenceLayers, postCostScenarioPreview } from "../../api";
import { humanizeUserFacingText } from "../../utils/terminology";
import { getApiErrorInfo } from "../../utils/apiContract";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { roomOfferScopeNote, roomOfferTitle } from "./roomOfferScopePresentation.js";
import { financeCostBasisLabel, financeScenarioComponentStatusLabel, financeUserFacingLabel, financeUserFacingText } from "./financeUserFacingLabels.js";
import { planningPreviewContext } from "./planningPreviewContext.js";
import { readCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { roomScenarioCostForSelection } from "./roomScenarioQuoteBinding.js";
import { routePassageForDisplay, routePassageLabel } from "./routePassagePresentation.js";
import { WEEKDAYS } from "../../utils/agreementUi.js";
import { scenarioVariantDecisionDisplay } from "./roomProfitabilityPresentation.js";
import { markRoomExpenseEntryContext } from "./financeFocusContext.js";
import { buildRoomQuoteCostBreakdown, quoteCostComponentSourceLabel } from "./roomQuoteCostBreakdown.js";

const INPUT_STYLE = {
  width: "100%",
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "inherit",
  padding: "10px 12px",
  outline: "none",
  boxSizing: "border-box",
};

const FIELD_CONFIG = [
  { key: "vehicleType", label: "Araç tipi", type: "select", unit: "VEHICLE_TYPE", classification: "PRIMARY_WHAT_IF_INPUT", options: [["", "Belirtilmedi"], ["MINIBUS", "Minibüs"], ["MIDIBUS", "Midibüs"], ["OTOBUS", "Otobüs"]] },
  { key: "vehicleCount", label: "Araç sayısı (adet)", type: "number", placeholder: "1", unit: "COUNT", classification: "PRIMARY_WHAT_IF_INPUT" },
  { key: "passengerCount", label: "Yolcu / öğrenci / personel sayısı (kişi)", type: "number", placeholder: "", unit: "PERSON_COUNT", classification: "PRIMARY_WHAT_IF_INPUT" },
  { key: "serviceDistanceKm", label: "Mesafe / rota varsayımı (km)", type: "number", placeholder: "", unit: "DISTANCE_KM", classification: "ADVANCED_ASSUMPTION" },
  { key: "serviceDayCount", label: "Hizmet günü (gün)", type: "number", placeholder: "1", unit: "DATE/DAY_COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "vehicleCapacity", label: "Araç kapasitesi (kişi)", type: "number", placeholder: "", unit: "PERSON_COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "stopCount", label: "Durak sayısı (durak)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "totalDistanceKm", label: "Toplam mesafe (km)", type: "number", placeholder: "", unit: "DISTANCE_KM", classification: "DERIVED_INPUT" },
  { key: "routeDurationMinutes", label: "Rota süresi (dk)", type: "number", placeholder: "", unit: "DURATION_MIN", classification: "DERIVED_INPUT" },
  { key: "shiftCount", label: "Toplam sefer (sefer)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "tripCount", label: "Toplam yolculuk (yolculuk)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "shiftStartMinutes", label: "Vardiya başlangıcı (dk)", type: "number", placeholder: "", unit: "DURATION_MIN", classification: "ADVANCED_ASSUMPTION" },
  { key: "fuelConsumptionLitersPer100Km", label: "Yakıt tüketimi (L/100 km)", type: "number", placeholder: "", unit: "FUEL_CONSUMPTION", classification: "ADVANCED_ASSUMPTION" },
  { key: "fuelUnitPriceMinor", label: "Yakıt birim fiyatı (₺/L)", type: "number", placeholder: "Sistem referansından alınır", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "driverBasePerShiftMinor", label: "Sürücü sefer maliyeti (₺/sefer)", type: "number", placeholder: "İsteğe bağlı gerçek değer", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "maintenancePerKmMinor", label: "Bakım km maliyeti (₺/km)", type: "number", placeholder: "İsteğe bağlı gerçek değer", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
];

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function roleScenarioConfig(scope, companyKind) {
  if (scope === "ROOM") return {
    role: "ROOM",
    audience: "Taşımacılık Firması",
    passengerLabel: "Yolcu sayısı (kişi)",
    distanceLabel: "Rota mesafesi (km)",
    subtitle: "Taşımacılık operasyonunda mevcut planı alternatif araç, rota ve kapasite varsayımlarıyla karşılaştırın.",
    quickPassenger: "+10 yolcu",
    quickVehicle: "+1 araç",
    quickDays: "+5 hizmet günü",
    example: "Örnek: mevcut taşıma planında araç veya rota varsayımı değiştirilir; sonuç yalnızca önizleme farkı olarak gösterilir.",
  };
  if (String(companyKind).toUpperCase() === "SCHOOL") return {
    role: "SCHOOL",
    audience: "Okul planlama",
    passengerLabel: "Öğrenci sayısı (kişi)",
    distanceLabel: "Servis rotası mesafesi (km)",
    subtitle: "Okul servis planında öğrenci, araç ve rota varsayımlarını güvenli maliyet önizlemesiyle karşılaştırın.",
    quickPassenger: "+10 öğrenci",
    quickVehicle: "+1 araç",
    quickDays: "+5 hizmet günü",
    example: "Örnek: öğrenci sayısı değişikliği, okul planlaması için tahmini etkiyi gösterir; bütçe yaşam döngüsü açılmaz.",
  };
  if (String(companyKind).toUpperCase() === "ORGANIZATION") return {
    role: "ORGANIZATION",
    audience: "Organizasyon planlama",
    passengerLabel: "Katılımcı / personel sayısı (kişi)",
    distanceLabel: "Etkinlik rotası mesafesi (km)",
    subtitle: "Etkinlik veya gezi planında katılımcı, rota ve gün varsayımlarını güvenli maliyet önizlemesiyle karşılaştırın.",
    quickPassenger: "+10 katılımcı",
    quickVehicle: "+1 araç planı",
    quickDays: "+5 hizmet günü",
    example: "Örnek: katılımcı sayısı değişikliği, etkinlik/gezi planı için tahmini etkiyi gösterir; şirket bütçesi açılmaz.",
  };
  return {
    role: "COMPANY",
    audience: "Hizmet Alan Firma",
    passengerLabel: "Yolcu / personel sayısı (kişi)",
    distanceLabel: "Servis rotası mesafesi (km)",
    subtitle: "Hizmet alım planında araç, kapasite, rota ve gün varsayımlarını mevcut planla karşılaştırın.",
    quickPassenger: "+10 kişi",
    quickVehicle: "+1 araç",
    quickDays: "+5 hizmet günü",
    example: "Örnek: hizmet günü veya araç sayısı değiştirilir; sonuç mevcut bütçeyi ya da canlı operasyonu değiştirmeyen önizleme bilgisidir.",
  };
}

function roleFields(config) {
  return FIELD_CONFIG.map((field) => ({
    ...field,
    label: field.key === "passengerCount" ? config.passengerLabel : field.key === "serviceDistanceKm" || field.key === "totalDistanceKm" ? config.distanceLabel.replace("Mesafesi", "mesafesi") : field.label,
  }));
}

function displayValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function formatMajorInput(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric / 100) : "";
}

function parseMajorInput(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return "";
  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric >= 0 ? String(Math.round(numeric * 100)) : "";
}

function minutesToTimeInput(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 1439) return "";
  return `${String(Math.floor(numeric / 60)).padStart(2, "0")}:${String(numeric % 60).padStart(2, "0")}`;
}

function timeInputToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? String(hours * 60 + minutes) : "";
}

const DEMO_STRESS_FACTOR = 1.2;

function demoRiskAssumptionsFor(input = {}, referencePayload = null) {
  const external = unwrapPayload(referencePayload)?.layers?.find((layer) => layer.layer === "EXTERNAL_MARKET_REFERENCE" && layer.available);
  const baseFuelMinor = Number(input.fuelUnitPriceMinor ?? external?.valueMinor);
  const baseDistanceKm = Number(input.totalDistanceKm ?? input.serviceDistanceKm);
  const baseDurationMinutes = Number(input.routeDurationMinutes);
  if (!Number.isFinite(baseFuelMinor) || baseFuelMinor < 0 || !Number.isFinite(baseDistanceKm) || baseDistanceKm <= 0 || !Number.isFinite(baseDurationMinutes) || baseDurationMinutes <= 0) return {};
  return {
    riskFuelUnitPriceMinor: String(Math.round(baseFuelMinor * DEMO_STRESS_FACTOR)),
    riskDistanceKm: String(Math.round(baseDistanceKm * DEMO_STRESS_FACTOR * 100) / 100),
    riskDurationMinutes: String(Math.round(baseDurationMinutes * DEMO_STRESS_FACTOR * 100) / 100),
  };
}

function formatMoney(value, currencyCode = "TRY") {
  if (value === null || value === undefined || value === "") return "Hesaplanamadı";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Hesaplanamadı";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(numeric / 100)}${suffix}`;
}

function formatEvidenceMoney(value, included, currencyCode = "TRY") {
  return included === false ? "Hesaplanamadı" : formatMoney(value, currencyCode);
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "Belirtilmedi";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Belirtilmedi";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(numeric)}${suffix}`;
}

function confidenceLabel(level) {
  return {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
    INSUFFICIENT: "Yetersiz",
  }[String(level || "").toUpperCase()] || "Bilinmiyor";
}

function confidenceTone(level) {
  const key = String(level || "").toUpperCase();
  return key === "HIGH" ? "good" : key === "INSUFFICIENT" || key === "LOW" ? "danger" : "warm";
}

function statusLabel(status) {
  return {
    READY: "Karşılaştırma hazır",
    INCOMPLETE: "Eksik veri",
    BLOCKED: "Güvenli hesap durdu",
  }[String(status || "").toUpperCase()] || "Sonuç bekleniyor";
}

function statusTone(status) {
  const key = String(status || "").toUpperCase();
  return key === "READY" ? "good" : key === "BLOCKED" ? "danger" : "warm";
}

function readableCostText(value, fallback = "Belirtilmedi") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const financeLabel = financeUserFacingLabel(raw, "");
  if (financeLabel) return financeLabel;
  const labels = {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
    INSUFFICIENT: "Yetersiz kanıt",
    UNKNOWN: "Belirsiz",
    INSUFFICIENT_DATA: "Yetersiz veri",
    INCOMPLETE: "Eksik veri",
    APPROVED: "Onaylı",
    NOT_AVAILABLE: "Mevcut değil",
    MISSING: "Eksik bilgi",
    MISSING_INFO: "Eksik bilgi",
    USER_ACTUAL: "Kullanıcının gerçek değeri",
    PLATFORM_OBSERVED_REFERENCE: "Platform gözlem referansı",
    TECHNICAL_CLASS_REFERENCE: "Araç sınıfı referansı",
    NO_DATA: "Veri yok",
    INTERNAL_PLANNED_COST_ANCHOR: "Planlanan maliyet dayanağı",
    OPERATIONAL_COST_MODEL: "Operasyon maliyet hesabı",
    OPERATIONAL_COST_MODEL_PARTIAL: "Mevcut giderler + sınırlı model",
    COMPARED: "Karşılaştırıldı",
    NOT_COMPARED: "Karşılaştırılamadı",
    "SEAM_PROVEN_DEFERRED_TO_#20": "Bu senaryoda atama önerisi sunulmaz",
    NONE: "Yok",
  };
  return labels[raw.toUpperCase()] || humanizeUserFacingText(raw, fallback);
}

function forecastProvenanceLabel(value) {
  const labels = {
    "#3_NO_COMPARABLE_INTERNAL_ACTUAL": "Karşılaştırılabilir gerçek maliyet kanıtı yok",
    "#3_HAKEDIS_INTERNAL_ACTUAL": "Mevcut gerçek maliyet kanıtı",
    "#ROOM_COST_LEDGER_ACTUAL": "Kanıtlanmış gerçekleşen gider defteri",
  };
  return labels[String(value || "")] || readableCostText(String(value || "Kanıt kaynağı belirtilmedi").replaceAll("INTERNAL_ACTUAL", "mevcut gerçek maliyet"));
}

function scenarioComponentLabel(item) {
  const raw = String(item?.labelTr || item?.label || item?.key || "").trim();
  const labels = {
    FUEL: "Yakıt gideri",
    RENT: "Araç kira gideri",
    MAINTENANCE: "Bakım gideri",
    EMPLOYER_MONTHLY_COST: "Sürücü işveren maliyeti",
    vehicle_fixed_allocated: "Dönemsel araç gideri",
    vehicle_variable: "Araç değişken gideri",
    driver_labor: "Sürücü maliyeti",
  };
  const key = String(item?.key || "").trim();
  if (labels[key]) return labels[key];
  return raw
    .replace(/^Gerçek gider\s*•\s*/u, "")
    .replace(/\bFUEL\b/u, "Yakıt")
    .replace(/\bRENT\b/u, "Araç kirası")
    .replace(/\bMAINTENANCE\b/u, "Bakım")
    .replace(/\bEMPLOYER_MONTHLY_COST\b/u, "Sürücü işveren maliyeti") || "Maliyet bileşeni";
}

function companyScenarioCostPresentation(scope, componentBreakdown) {
  if (scope !== "COMPANY") return null;
  const componentKeys = (Array.isArray(componentBreakdown) ? componentBreakdown : [])
    .filter((component) => {
      const amountMinor = Number(component?.amountMinor);
      return Number.isFinite(amountMinor) && amountMinor !== 0 && component?.includedInBaseline !== false;
    })
    .map((component) => String(component?.key || "").trim().toUpperCase())
    .filter(Boolean);
  const fuelOnly = componentKeys.length > 0 && componentKeys.every((key) => key === "FUEL");
  return {
    title: fuelOnly ? "Tahmini yakıt gideri" : "Tahmini operasyon maliyeti",
    note: "Rota, tüketim ve yakıt fiyatı varsayımlarıyla hesaplanan önizlemedir; gerçekleşmiş gider, sözleşme taahhüdü veya ödeme değildir.",
  };
}

function routeSourceLabel(source) {
  return {
    DB_ROUTE_SNAPSHOT: "Kayıtlı rota ölçümü",
    OSRM_ROUTE: "OSRM rota ölçümü",
    ROUTE_LEARNING_HAVERSINE_FALLBACK: "Kayıtlı yaklaşık rota ölçümü",
  }[String(source || "").toUpperCase()] || "Rota kanıtı belirtilmedi";
}

function Metric({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || {};
  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 12, minWidth: 0 }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
    </div>
  );
}

function VariantCard({ variant, currencyCode }) {
  if (!variant) return null;
  const tone = variant.status === "READY" ? "good" : variant.status === "BLOCKED" ? "danger" : "warm";
  return (
    <div className="card" data-testid={`scenario-variant-${String(variant.scenarioType || "").toLowerCase()}`} style={{ border: tone === "good" ? "1px solid rgba(18,183,106,0.28)" : "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div className="panelSectionTitle">{variant.label}</div>
        <span className="pill">{statusLabel(variant.status)}</span>
      </div>
      <div className="vehicle-plan-metrics" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <Metric title="Tahmini maliyet" value={formatMoney(variant.estimatedCost, currencyCode)} note={variant.costNote || "Önizleme sonucu"} tone={tone} />
        <Metric title="Araç ihtiyacı" value={formatNumber(variant.vehicleRequirement, " araç")} note={variant.capacity?.status === "INVALID" ? "Kapasite engeli" : "Kapasite kontrolü"} tone={variant.capacity?.status === "INVALID" ? "danger" : "default"} />
        <Metric title="Mesafe" value={formatNumber(variant.distance, " km")} note="Mevcut rota ölçümü" />
        <Metric title="Süre" value={formatNumber(variant.duration, " dk")} note="Trafik tahmini değildir" />
        <Metric
          title="Fark / fırsat"
          value={variant.additionalCost != null ? formatMoney(variant.additionalCost, currencyCode) : variant.savings != null ? formatMoney(variant.savings, currencyCode) : formatMoney(variant.costDelta, currencyCode)}
          note={variant.additionalCost != null ? "Açık senaryo varsayımlarıyla ek maliyet" : variant.savings != null ? "Açık senaryo varsayımlarıyla tasarruf" : variant.costDelta != null ? "Karşılaştırma farkı" : "Karşılaştırılamadı"}
          tone={variant.additionalCost != null ? "danger" : variant.savings != null ? "good" : "default"}
        />
        <Metric title="Operasyon riski" value={readableCostText(variant.operationalRisk?.riskState, "Bilinmiyor")} note={humanizeUserFacingText(variant.operationalRisk?.reasons?.join("; "), "Açıklanmış risk kanıtı bekleniyor")} tone={variant.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
      </div>
      {variant.costReconciliation ? <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Risk mutabakatı: planlama stres tabanı <b>{formatMoney(variant.costReconciliation.planningBaselineCostMinor, currencyCode)}</b> · gerçekleşen temel <b>{formatMoney(variant.costReconciliation.actualBaselineCostMinor, currencyCode)}</b> · gerçek plana fark <b>{formatMoney(variant.costReconciliation.deltaVsActualBaselineMinor, currencyCode)}</b>.
      </div> : null}
        <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>{humanizeUserFacingText(variant.rationale)}</div>
    </div>
  );
}

function vehiclePlanStatusLabel(status) {
  return {
    READY: "Karşılaştırılabilir",
    PARTIAL: "Kısmi maliyet",
    INCOMPLETE: "Eksik veri",
    BLOCKED: "Güvenli hesap durdu",
    NO_DATA: "Veri yok",
  }[String(status || "").toUpperCase()] || "Durum belirtilmedi";
}

function vehicleFleetAvailabilityText(availability) {
  if (!availability) return "Filo kanıtı yok";
  const hasCounts = availability.availabilityScope === "ROOM_FLEET"
    && Number.isSafeInteger(Number(availability.availableVehicleCount))
    && Number.isSafeInteger(Number(availability.availableDriverCount));
  if (!hasCounts) return `Filo durumu: ${financeUserFacingText(humanizeUserFacingText(availability.status, "Bilinmiyor"), "Bilinmiyor")}`;
  const requiredVehicles = Number(availability.requiredVehicleCount || 0);
  const requiredDrivers = Number(availability.requiredDriverCount || requiredVehicles);
  const status = availability.availableForPlan === false ? " · Bu plan için yeterli değil" : " · Plan için uygun";
  return `ROOM filosu: ${availability.availableVehicleCount} aktif araç · ${availability.availableDriverCount} sürücü; gereken ${requiredVehicles} araç · ${requiredDrivers} sürücü${status}`;
}

function QuoteVehicleAlternativeCompactCard({ item, recommended, currencyCode, quoteBreakdown, onSelect }) {
  const partialCost = quoteBreakdown?.partialTotalMinor ?? null;
  const totalCost = quoteBreakdown?.totalMinor ?? null;
  const missingLabels = (quoteBreakdown?.missing || []).map((cost) => cost.label).filter(Boolean);
  const routeDistance = item.routeDistanceKm ?? item.routeEvidence?.distanceKm ?? null;
  const routeText = routeDistance == null ? "Rota mesafesi bekleniyor" : formatNumber(routeDistance, " km");
  const costText = totalCost != null
    ? formatMoney(totalCost, currencyCode)
    : partialCost != null
      ? "Kısmi · " + formatMoney(partialCost, currencyCode)
      : "Hesaplanamadı";
  return (
    <article
      className="card quote-vehicle-compact-card"
      data-testid={"scenario-vehicle-alternative-" + String(item.vehicleType || "").toLowerCase()}
      data-quote-vehicle-compact="true"
      data-vehicle-type={item.vehicleType}
    >
      <div className="quote-vehicle-compact-head">
        <div>
          <div className="panelSectionTitle">{item.vehicleLabel || item.vehicleType}</div>
          <div className="panelMeta">{formatNumber(item.capacity, " kişi/araç")} · {formatNumber(item.requiredVehicleCount, " araç")} · {formatNumber(item.driverCount, " sürücü")}</div>
        </div>
        <div className="quote-vehicle-compact-badges">
          {recommended ? <span className="pill">{recommended.label}</span> : null}
          <span className="pill">{vehiclePlanStatusLabel(item.status)}</span>
        </div>
      </div>
      <div className="quote-vehicle-compact-grid">
        <div><span>Rota</span><strong>{routeText}</strong></div>
        <div><span>Kanıtlanan maliyet</span><strong>{costText}</strong></div>
      </div>
      <div className={"quote-vehicle-compact-status " + (missingLabels.length ? "quote-vehicle-compact-status--warning" : "quote-vehicle-compact-status--ready")}>
        {missingLabels.length
          ? "Eksik maliyet kanıtı: " + missingLabels.slice(0, 2).join(", ") + (missingLabels.length > 2 ? " +" + (missingLabels.length - 2) : "")
          : "Toplam maliyet için gerekli kanıtlar hazır"}
      </div>
      <button
        data-testid={"scenario-select-vehicle-plan-" + String(item.vehicleType || "").toLowerCase()}
        type="button"
        className="btn"
        onClick={() => onSelect(item)}
        disabled={item.status === "NO_DATA" || item.status === "BLOCKED"}
      >
        Bu aracı seç
      </button>
    </article>
  );
}

function VehiclePlanAlternativeCard({ scope = "ROOM", item, recommended, currencyCode, fallbackMissingOptionalCosts = [], onSelect, onOpenMissingCost, quoteEvaluation = false }) {
  const selectedConsumption = item.fuelConsumptionReference;
  const missingOptionalCosts = item.missingOptionalCosts?.length ? item.missingOptionalCosts : fallbackMissingOptionalCosts;
  const missingOptional = missingOptionalCosts.map((cost) => humanizeUserFacingText(cost.label)).join(", ");
  const componentBreakdown = Array.isArray(item.planningComponentBreakdown) && item.planningComponentBreakdown.length
    ? item.planningComponentBreakdown
    : Array.isArray(item.componentBreakdown) ? item.componentBreakdown : [];
  const comparisonCost = item.comparisonCostMinor ?? item.costMinor ?? null;
  const hasComparableCostEvidence = comparisonCost !== null && comparisonCost !== undefined;
  const hasEquivalentPlanningCost = item.planningCostMinor !== null && item.planningCostMinor !== undefined;
  const planningMissingOptional = hasEquivalentPlanningCost && item.planningCostCoverage?.status === "COMPLETE" ? "" : missingOptional;
  const actualMissingOptional = !quoteEvaluation && hasEquivalentPlanningCost && item.actualCostMinor !== null && item.actualCostMinor !== undefined ? missingOptional : "";
  const missingData = (item.missingData || []).filter(Boolean).filter((value) => !(hasEquivalentPlanningCost && item.planningCostCoverage?.status === "COMPLETE" && /sürücü|bakım/i.test(String(value))));
  const fleetUnavailable = item.availability?.availableForPlan === false;
  const companyScenarioCost = companyScenarioCostPresentation(scope, componentBreakdown);
  const fuelEvidenceReady = item.fuelRequirementLiters !== null
    && item.fuelRequirementLiters !== undefined
    && (Number(item.requiredVehicleCount || 1) <= 1 || item.routePartition?.status === "READY");
  const effectiveStatus = item.status === "READY" && (planningMissingOptional || missingData.length) ? "PARTIAL" : item.status;
  const quoteBreakdown = scope === "ROOM" && quoteEvaluation ? buildRoomQuoteCostBreakdown(item) : null;
  const actionableMissingCosts = quoteBreakdown
    ? quoteBreakdown.missing.filter((cost) => cost.key !== "fuel" || cost.component?.status === "incomplete")
    : [];
  const confidenceText = fleetUnavailable
    ? "Filo uygun değil · Bu plan yayımlanmadı"
    : effectiveStatus === "PARTIAL" || missingData.length || planningMissingOptional
    ? "Orta · Eksik maliyet kanıtı var"
    : `${confidenceLabel(item.confidence?.level)} · Operasyonel plan; net kâr değil`;
  if (quoteEvaluation) {
    return <QuoteVehicleAlternativeCompactCard item={item} recommended={recommended} currencyCode={currencyCode} quoteBreakdown={quoteBreakdown} onSelect={onSelect} />;
  }
  return (
    <div
      className="card"
      data-testid={`scenario-vehicle-alternative-${String(item.vehicleType || "").toLowerCase()}`}
      data-vehicle-type={item.vehicleType}
      style={{ border: recommended ? "1px solid rgba(18,183,106,0.45)" : "1px solid rgba(255,255,255,0.08)", background: recommended ? "rgba(18,183,106,0.05)" : "transparent" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div className="panelSectionTitle">{item.vehicleLabel || item.vehicleType}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {recommended ? <span className="pill">{recommended.label}</span> : null}
          <span className="pill">{vehiclePlanStatusLabel(effectiveStatus)}</span>
        </div>
      </div>
      <div className="vehicle-plan-metrics" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <Metric title="Araç planı" value={formatNumber(item.requiredVehicleCount, " araç")} note="Kapasiteye göre otomatik" />
        <Metric title="Kapasite" value={formatNumber(item.capacity, " kişi/araç")} note={humanizeUserFacingText(item.capacityResolution?.selected?.sourceName, "Kaynak belirtilmedi")} />
        <Metric title="Sürücü ihtiyacı" value={formatNumber(item.driverCount, " sürücü")} note="Eşzamanlı araç başına 1 sürücü" />
        <Metric title="Tüketim" value={selectedConsumption?.valueLitersPer100Km != null ? formatNumber(selectedConsumption.valueLitersPer100Km, " L/100 km") : "Veri yok"} note={humanizeUserFacingText(selectedConsumption?.sourceName, "Onaylı sınıf referansı yok")} />
        <Metric title={scope === "COMPANY" ? "Yakıt fiyatı referansı" : "Yakıt fiyatı"} value={item.fuelPriceReference?.valueMinor != null ? `${formatMoney(item.fuelPriceReference.valueMinor, currencyCode)}/L` : "Veri yok"} note={humanizeUserFacingText(item.fuelPriceReference?.sourceName, "Fiyat kaynağı bekleniyor")} />
        <Metric title="Toplam yakıt" value={fuelEvidenceReady ? formatNumber(item.fuelRequirementLiters, " L") : "Hesaplanamadı"} note={fuelEvidenceReady ? "Rota × tüketim × araç planı" : "Araç bazlı rota/tüketim kanıtı bekleniyor"} />
        {item.routePartition?.status === "READY" ? <Metric title="Rota ve yolcu dağılımı" value={formatNumber(item.routePartition.routes?.length, " ayrı rota")} note={`Toplam ${formatNumber(item.routePartition.totalDistanceKm, " km")}; ${item.routePartition.routes?.every((route) => route.passengerCount != null) ? item.routePartition.routes.map((route) => `${route.passengerCount} kişi`).join(" + ") : "yolcu dağılımı bekleniyor"}`} /> : null}
        {scope === "ROOM" && !quoteEvaluation && item.actualCostMinor !== null && item.actualCostMinor !== undefined ? <Metric title="Gerçekleşmiş gider" value={formatMoney(item.actualCostMinor, currencyCode)} note="Kanıtlanmış hizmet/araç kaydı; alternatif planlama hesabıyla doğrudan kıyaslanmaz." /> : null}
        {scope === "COMPANY" && item.actualCostMinor !== null && item.actualCostMinor !== undefined && companyScenarioCost ? <Metric title={companyScenarioCost.title} value={formatMoney(item.actualCostMinor, currencyCode)} note={companyScenarioCost.note} /> : null}
        <Metric
          title={quoteEvaluation ? "Tahmini toplam servis maliyeti" : hasEquivalentPlanningCost ? "Eşdeğer plan maliyeti" : "Tahmini maliyet"}
          value={quoteEvaluation
            ? (quoteBreakdown?.totalMinor == null ? "Hesaplanamadı" : formatMoney(quoteBreakdown.totalMinor, currencyCode))
            : hasComparableCostEvidence ? formatMoney(hasEquivalentPlanningCost ? item.planningCostMinor : comparisonCost, currencyCode) : "Hesaplanamadı"}
          note={quoteEvaluation && quoteBreakdown?.totalMinor == null
            ? "Yakıt veya kısmi maliyet kanıtı var; eksik kalemler tamamlanmadan toplam servis maliyeti sunulmaz."
            : hasEquivalentPlanningCost
            ? quoteEvaluation
              ? "Yakıt, sürücü ve bakım gibi dahil edilen planlama bileşenlerinin toplamıdır; gerçekleşmiş gider değildir."
              : "Aynı rota, dönem, yolcu ve maliyet bileşenleriyle planlama karşılaştırmasıdır; gerçekleşmiş gider değildir."
            : hasComparableCostEvidence ? readableCostText(item.costBasis, "Maliyet kanıtı bekleniyor") : "Karşılaştırılabilir maliyet kanıtı bekleniyor; tutar uydurulmadı."}
          tone={hasComparableCostEvidence && item.status === "READY" ? "good" : "warm"}
        />
      </div>
      {quoteBreakdown ? (
        <div className="card quote-cost-breakdown-card" data-testid={`quote-cost-summary-${String(item.vehicleType || "").toLowerCase()}`} style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.3)", background: "rgba(58,102,255,0.045)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div className="panelSectionTitle">Toplamın kanıtı</div>
            <strong data-testid={`quote-cost-total-${String(item.vehicleType || "").toLowerCase()}`}>{quoteBreakdown.totalMinor == null ? "Hesaplanamadı" : formatMoney(quoteBreakdown.totalMinor, currencyCode)}</strong>
          </div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>Yalnız motorun bu iş için hesapladığı planlama bileşenleri toplama dahil edilir. Eksik kalemler 0 kabul edilmez.</div>
          <details open data-testid={`quote-cost-breakdown-${String(item.vehicleType || "").toLowerCase()}`} style={{ marginTop: 9 }}>
            <summary className="panelMeta" style={{ cursor: "pointer" }}>Dahil edilen maliyet dökümü</summary>
            <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              {quoteBreakdown.included.length ? quoteBreakdown.included.map((component) => (
                <div key={component.key} className="panelMeta" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <span>
                    <b>{component.label}</b>
                    <span style={{ display: "block", marginTop: 2 }}>{quoteCostComponentSourceLabel(item.componentEvidence?.[component.key])}</span>
                    {component.key === "vehicle_variable" ? <span style={{ display: "block", marginTop: 2 }}>Mevcut motorun bakım planlama girdisi dahildir; lastik ve ayrı kilometre bazlı amortisman kanıtı yoktur.</span> : null}
                  </span>
                  <strong>{formatMoney(component.amountMinor, currencyCode)}</strong>
                </div>
              )) : <div className="panelMeta">Dahil edilmiş maliyet bileşeni yok; toplam hesaplanmadı.</div>}
            </div>
            {quoteBreakdown.missing.length ? (
              <div data-testid={`quote-cost-missing-${String(item.vehicleType || "").toLowerCase()}`} style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="panelMeta"><b>Toplama dahil olmayan / tamamlanabilir kanıtlar</b></div>
                <div style={{ display: "grid", gap: 7, marginTop: 7 }}>
                  {quoteBreakdown.missing.map((cost) => (
                    <div key={cost.key} className="panelMeta" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{cost.label} · {cost.reason}</span>
                      {cost.key === "fuel" && !cost.component ? null : <button data-testid={`quote-cost-complete-${String(item.vehicleType || "").toLowerCase()}-${cost.key}`} type="button" className="btn sm" onClick={() => onOpenMissingCost?.({ ...item, missingOptionalCosts: [...(item.missingOptionalCosts || []), cost] })}>Tamamla / Gider Ekle</button>}
                    </div>
                  ))}
                </div>
                <div className="panelMeta" data-testid={`quote-cost-adblue-status-${String(item.vehicleType || "").toLowerCase()}`} style={{ marginTop: 8 }}>AdBlue: bu teklif motorunda ayrı planlama girdisi desteklenmiyor; 0 varsayılmadı ve toplama eklenmedi.</div>
                {actionableMissingCosts.length ? <div className="panelMeta" style={{ marginTop: 6 }}>Gider formu FORECAST kapsamıyla açılır; gerçekleşmiş ACTUAL gider veya tahsilat oluşturulmaz.</div> : null}
              </div>
            ) : null}
          </details>
        </div>
      ) : null}
      <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>
        Kapasite kaynağı: {humanizeUserFacingText(item.capacityResolution?.selected?.sourceName, "Onaylı referans yok")} · Operasyonel plan güveni: {confidenceText}
      </div>
      {item.costEvidenceLabel ? <div className="panelMeta" style={{ marginTop: 6 }}>Maliyet dayanağı: {hasEquivalentPlanningCost ? (item.planningCostEvidenceLabel || "İç veriye dayalı eşdeğer planlama tahmini") : financeCostBasisLabel(item.costEvidenceLabel, humanizeUserFacingText(item.costEvidenceLabel, "Maliyet kanıtı"))}{hasEquivalentPlanningCost ? " · Eşdeğer planlama karşılaştırmasıdır; gerçekleşmiş gider değildir." : ["PLANLAMA_VARSAYIMI", "INTERNAL_DATA_PLANNING_ESTIMATE"].includes(item.costEvidenceSource) ? " · Gerçek gider veya onaylı hizmet kanıtı değildir." : ""}</div> : null}
      {item.availability ? <div className="panelMeta" style={{ marginTop: 6 }}>{vehicleFleetAvailabilityText(item.availability)}{item.availability.vehicleId != null && item.availability.availableForPlan !== false ? " · Seçili araç uygunluğu" : ""}</div> : null}
      {planningMissingOptional ? <div className="panelMeta" style={{ marginTop: 6 }}>Planlama kapsamındaki eksik maliyet: {planningMissingOptional}</div> : null}
      {item.planningProfile?.status === "NOT_APPLICABLE" ? <div className="panelMeta" style={{ marginTop: 6 }}>Kayıtlı dönem maliyeti bu teklif dönemini kapsamıyor; yeni teklif için geçerli dönem maliyet profili gerekir.</div> : null}
      {item.planningProfile?.status === "BLOCKED" ? <div className="panelMeta" style={{ marginTop: 6 }}>Araç sabit gideri kaydında birbirinin alternatifi olan sahiplik türleri birlikte bulundu; doğru kayıt seçilmeden toplam oluşturulmadı.</div> : null}
      {actualMissingOptional ? <div className="panelMeta" style={{ marginTop: 6 }}>Gerçekleşmiş gider kapsamı: {actualMissingOptional} kaydı yok; eşdeğer planlama hesabı ayrı gösterildi.</div> : null}
      {item.partialExplanation && (!hasEquivalentPlanningCost || planningMissingOptional) ? <div className="panelMeta" style={{ marginTop: 6 }}>{humanizeUserFacingText(item.partialExplanation)}</div> : null}
      <details data-testid={`scenario-vehicle-alternative-details-${String(item.vehicleType || "").toLowerCase()}`} style={{ marginTop: 10 }}>
        <summary className="panelMeta" style={{ cursor: "pointer" }}>Maliyet bileşenleri ve kanıtı</summary>
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
          {componentBreakdown.length ? componentBreakdown.map((component) => (
            <div key={component.key || component.label} className="panelMeta" style={{ display: "grid", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>{scenarioComponentLabel(component)}</span>
                <b>{financeScenarioComponentStatusLabel(component) || (component.amountMinor == null ? "Hesaplanamadı" : formatMoney(component.amountMinor, currencyCode))}</b>
              </div>
              {component.formula ? <div>Formül: {humanizeUserFacingText(component.formula)}</div> : null}
              {component.sourceFields?.length ? <div>Girdi: {component.sourceFields.join(", ")}</div> : null}
              {component.calculationEvidence?.length ? <div>Kanıt: {humanizeUserFacingText(component.calculationEvidence.join("; "))}</div> : null}
              {component.key === "driver_labor" && item.componentEvidence?.[component.key]?.rateMinor != null && item.componentEvidence?.[component.key]?.unit === "CURRENCY_PER_SHIFT_PER_VEHICLE" ? <div>Birim kanıtı: {formatMoney(item.componentEvidence[component.key].rateMinor, currencyCode)} / araç / planlı hareket · Payda: planlı hareket sayısı</div> : null}
              {item.componentEvidence?.[component.key]?.sourceRefs?.length ? <div>Kaynak kayıtları mevcut</div> : null}
              {item.componentEvidence?.[component.key]?.dataClass ? <div>Veri türü: {financeCostBasisLabel(item.componentEvidence[component.key].dataClass, humanizeUserFacingText(item.componentEvidence[component.key].dataClass, "Belirtilmedi"))}</div> : null}
            </div>
          )) : <div className="panelMeta">Bu alternatif için maliyet bileşeni kanıtı yok; tutar uydurulmadı.</div>}
          {item.routeDistanceKm != null ? <div className="panelMeta">Rota: {formatNumber(item.routeDistanceKm, " km")} · {routeSourceLabel(item.routeEvidenceSource)}</div> : <div className="panelMeta">Rota mesafesi için kanıt bekleniyor.</div>}
          {item.routePartition?.status === "READY" ? <div className="panelMeta">Araç bazında rota: {item.routePartition.routes.map((route) => `Araç ${route.vehicleIndex}: ${route.passengerCount != null ? `${route.passengerCount} kişi, ` : ""}${route.stopNames?.length ? route.stopNames.join(", ") : `${route.stopOrders.length} durak`}`).join(" · ")}. Her rota ayrı ölçüldü; aynı durak birden fazla araca planlanabilir.</div> : null}
          {item.risk?.riskState ? <div className="panelMeta">Operasyon riski: {readableCostText(item.risk.riskState)}{item.risk.reasons?.length ? ` · ${humanizeUserFacingText(item.risk.reasons.join("; "))}` : ""}</div> : null}
          {missingData.length ? <div className="panelMeta">Tamamlanması gereken kanıt: {missingData.map((value) => humanizeUserFacingText(value)).join(", ")}</div> : null}
          {scope === "ROOM" && (missingData.length || planningMissingOptional) ? <button data-testid={`scenario-missing-cost-link-${String(item.vehicleType || "").toLowerCase()}`} type="button" className="btn sm" onClick={() => onOpenMissingCost?.({ ...item, missingOptionalCosts })}>Eksik maliyet bilgisini gider formunda tamamla</button> : null}
        </div>
      </details>
      <button data-testid={`scenario-select-vehicle-plan-${String(item.vehicleType || "").toLowerCase()}`} type="button" className="btn" style={{ marginTop: 12 }} onClick={() => onSelect(item)} disabled={item.status === "NO_DATA" || item.status === "BLOCKED"}>
        Bu planı karşılaştır
      </button>
    </div>
  );
}

function VehiclePlanAlternatives({ scope = "ROOM", result, currencyCode, onSelect, onOpenMissingCost, onOpenAssignment, assignmentMissing = false, quoteEvaluation = false, selectedPlan = null, focusOfferId = null, focusShiftId = null, quoteAmountMinor = null }) {
  const plan = result?.vehiclePlanAlternatives;
  if (!plan?.items?.length) return null;
  const recommendation = plan.recommendation;
  const fallbackMissingOptionalCosts = result?.costCoverage?.scenario?.missingOptionalCosts || [];
  const selectedQuoteBreakdown = quoteEvaluation && selectedPlan ? buildRoomQuoteCostBreakdown(selectedPlan) : null;
  const selectedMissingCosts = selectedQuoteBreakdown?.missing || [];
  return (
    <div className="card" data-testid="scenario-vehicle-plan-alternatives" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.035)" }}>
      <div className="panelSectionTitle">{recommendation ? "Uygun araç planı" : "Araç alternatifleri"}</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{quoteEvaluation ? "Aynı iş için araç kapasitesi, rota ve kanıtlanmış kısmi maliyetleri karşılaştırın; ayrıntılar seçtiğiniz araçta açılır." : "Kişi sayısı, rota, kapasite ve referanslı tüketim birlikte değerlendirilir; araç sayısını elle hesaplaman gerekmez."}</div>
      {recommendation ? <div data-testid="scenario-vehicle-plan-recommendation" className="panelMeta" style={{ marginTop: 10, lineHeight: 1.5 }}><b>{humanizeUserFacingText(recommendation.label)}:</b> {humanizeUserFacingText(recommendation.reason)}</div> : <div className="panelMeta" style={{ marginTop: 10 }}>Karşılaştırılabilir kanıt yok; öneri uydurulmadı.</div>}
      {quoteEvaluation && selectedPlan ? (
        <div className="quote-selected-vehicle-summary" data-testid="quote-selected-vehicle-summary">
          <div className="quote-selected-vehicle-summary-head">
            <div>
              <div className="panelSectionTitle">Seçilen araç özeti</div>
              <div className="panelMeta">{focusOfferId ? "Teklif #" + focusOfferId : focusShiftId ? "İş #" + focusShiftId : "Seçili iş"} · {selectedPlan.vehicleLabel || selectedPlan.vehicleType}</div>
            </div>
            <strong>{quoteAmountMinor != null ? formatMoney(quoteAmountMinor, currencyCode) : "Teklif tutarı girilmedi"}</strong>
          </div>
          <div className="quote-selected-vehicle-summary-grid">
            <div><span>Mevcut tahmini maliyet</span><strong>{selectedQuoteBreakdown?.totalMinor != null ? formatMoney(selectedQuoteBreakdown.totalMinor, currencyCode) : selectedQuoteBreakdown?.partialTotalMinor != null ? "Kısmi · " + formatMoney(selectedQuoteBreakdown.partialTotalMinor, currencyCode) : "Hesaplanamadı"}</strong></div>
            <div><span>Kapasite / ihtiyaç</span><strong>{formatNumber(selectedPlan.capacity, " kişi/araç")} · {formatNumber(selectedPlan.requiredVehicleCount, " araç")} / {formatNumber(selectedPlan.driverCount, " sürücü")}</strong></div>
            <div><span>Rota</span><strong>{selectedPlan.routeDistanceKm == null ? "Belirtilmedi" : formatNumber(selectedPlan.routeDistanceKm, " km")}</strong></div>
          </div>
          <div className="quote-selected-vehicle-summary-actions">
            <span className={selectedMissingCosts.length ? "quote-vehicle-compact-status--warning" : "quote-vehicle-compact-status--ready"}>
              {selectedMissingCosts.length ? "Eksik: " + selectedMissingCosts.slice(0, 3).map((cost) => cost.label).join(", ") + (selectedMissingCosts.length > 3 ? " +" + (selectedMissingCosts.length - 3) : "") : "Maliyet kanıtı tamam"}
            </span>
            {assignmentMissing && scope === "ROOM" ? <button data-testid="quote-open-assignment" type="button" className="btn sm" onClick={onOpenAssignment}>Araç ve sürücü atamasını aç</button> : null}
            {selectedMissingCosts.length ? <button data-testid="quote-central-missing-cost" type="button" className="btn sm primary" onClick={() => onOpenMissingCost?.({ ...selectedPlan, missingOptionalCosts: selectedMissingCosts })}>Eksik maliyetleri tamamla</button> : null}
          </div>
          <details data-testid="quote-selected-vehicle-details" className="quote-selected-vehicle-details">
            <summary>Hesaplama ayrıntıları</summary>
            <div className="quote-selected-vehicle-details-body">
              {selectedQuoteBreakdown?.included?.length ? selectedQuoteBreakdown.included.map((component) => <div key={component.key}><span>{component.label}</span><strong>{formatMoney(component.amountMinor, currencyCode)}</strong></div>) : <span>Kanıtlanmış bileşen bulunmuyor.</span>}
              {selectedMissingCosts.length ? <div className="panelMeta">Toplama dahil olmayan: {selectedMissingCosts.map((cost) => cost.label).join(", ")}.</div> : null}
            </div>
          </details>
        </div>
      ) : null}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {plan.items.map((item) => <VehiclePlanAlternativeCard key={item.vehicleType} scope={scope} item={item} fallbackMissingOptionalCosts={fallbackMissingOptionalCosts} recommended={recommendation?.vehicleType === item.vehicleType} currencyCode={currencyCode} onSelect={onSelect} onOpenMissingCost={onOpenMissingCost} quoteEvaluation={quoteEvaluation} />)}
      </div>
    </div>
  );
}

function EconomicScopeCard({ scope, quoteFloor, roomProfitability, result, currencyCode, commercialOffer }) {
  if (scope !== "ROOM") return null;
  const offerMinor = roomProfitability?.currentOfferMinor ?? quoteFloor?.currentCommercialAmountMinor ?? null;
  const planningBaseMinor = quoteFloor?.quoteFloorMinor ?? null;
  const actualMinor = roomProfitability?.actualOperationalCostMinor ?? result?.baseline?.costMinor ?? null;
  const expectedProfitMinor = offerMinor !== null && planningBaseMinor !== null ? Number(offerMinor) - Number(planningBaseMinor) : null;
  const realizedDifferenceMinor = offerMinor !== null && actualMinor !== null ? Number(offerMinor) - Number(actualMinor) : null;
  const profitabilityStatus = String(roomProfitability?.profitabilityStatus || "").toUpperCase();
  const definitiveProfitMinor = profitabilityStatus === "CONFIRMED" && roomProfitability?.netRollupBlocked !== true
    ? roomProfitability?.confirmedProfitMinor
    : null;
  const risk = result?.scenarioVariants?.RISK;
  const riskProfitMinor = offerMinor !== null && risk?.status === "READY" && risk.estimatedCost !== null && risk.estimatedCost !== undefined
    ? Number(offerMinor) - Number(risk.estimatedCost)
    : null;
  if (offerMinor === null && planningBaseMinor === null && actualMinor === null) return null;
  return (
    <div className="card" data-testid="scenario-economic-scope" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.04)" }}>
      <div className="panelSectionTitle">Teklif ve kârlılık kapsamı</div>
      <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>Teklif geliri, planlama tabanı ve gerçekleşen dağıtılmış gider ayrı tutulur; tahsilat veya gerçek banka doğrulaması bu önizlemeye eklenmez.</div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <Metric title={roomOfferTitle(commercialOffer)} value={formatMoney(offerMinor, currencyCode)} note={roomOfferScopeNote(commercialOffer)} />
        <Metric title="Planlama maliyet tabanı" value={formatMoney(planningBaseMinor, currencyCode)} note={quoteFloor?.baselineSource ? `Teklif tabanı · ${financeCostBasisLabel(quoteFloor.baselineSource, "Planlama tabanı kanıtı")}` : "Planlama tabanı kanıtı"} />
        <Metric title="Dağıtılmış gerçekleşen gider" value={formatMoney(actualMinor, currencyCode)} note="ROOM gerçekleşen gider dağıtım kapsamı" />
        <Metric title="Beklenen kâr" value={formatMoney(expectedProfitMinor, currencyCode)} note="Teklif − planlama tabanı; tahmini" tone={expectedProfitMinor != null ? "good" : "warm"} />
        <Metric title="Gerçekleşmiş gider farkı" value={formatMoney(realizedDifferenceMinor, currencyCode)} note="Teklif − dağıtılmış gerçekleşen gider; tahmini" tone={realizedDifferenceMinor != null ? "good" : "warm"} />
        <Metric title="Kesin net kâr" value={definitiveProfitMinor == null ? "Doğrulanmadı" : formatMoney(definitiveProfitMinor, currencyCode)} note={definitiveProfitMinor == null ? "Muhasebe doğrulaması / kesin net kâr kanıtı yok" : "Doğrulanmış net kâr"} tone={definitiveProfitMinor == null ? "warm" : "good"} />
        {riskProfitMinor !== null ? <Metric title="Riskli senaryo kârı" value={formatMoney(riskProfitMinor, currencyCode)} note={scope === "COMPANY" ? "Açık stres senaryosuyla tahmini" : "Açık DEMO stres varsayımlarıyla tahmini"} tone="warm" /> : null}
      </div>
    </div>
  );
}

function ComparisonStatus({ title, item, money = false, currencyCode = "TRY" }) {
  if (!item) return null;
  const value = money ? formatMoney(item.varianceAmountMinor, currencyCode) : readableCostText(item.status, "Yetersiz veri");
  return <div className="muted" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span style={{ minWidth: 0 }}>{title}</span><b style={{ minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{value}</b></div>;
}

function Field({ label, value, onChange, type = "number", placeholder = "", testId = "", readOnly = false, money = false }) {
  return (
    <label className="muted" style={{ minWidth: 0 }}>
      {label}
      <input
        data-testid={testId || `scenario-input-${label}`}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        value={money ? formatMajorInput(value) : displayValue(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(money ? parseMajorInput(event.target.value) : event.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        style={INPUT_STYLE}
      />
    </label>
  );
}

function InputGrid({ values, setValues, prefix = "scenario", fields = FIELD_CONFIG, readOnly = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {fields.map((field) => field.type === "select" ? (
        <label key={field.key} className="muted" style={{ minWidth: 0 }}>
          {field.label}
          <select data-testid={`${prefix}-input-${field.key}`} value={values[field.key] || ""} onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))} style={INPUT_STYLE} disabled={readOnly}>
            {field.options.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
          </select>
        </label>
      ) : <Field key={field.key} testId={`${prefix}-input-${field.key}`} label={field.label} value={values[field.key]} placeholder={field.placeholder} onChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))} type={field.type} readOnly={readOnly} money={field.unit === "MONEY"} />)}
    </div>
  );
}

function InputSummary({ input, sourceMap = {}, config }) {
  const items = [
    ["Araç (adet)", "vehicleCount"],
    ["Kapasite (kişi)", "vehicleCapacity"],
    [config.passengerLabel, "passengerCount"],
    [config.distanceLabel, "serviceDistanceKm"],
    ["Rota süresi (dk)", "routeDurationMinutes"],
    ["Hizmet günü (gün)", "serviceDayCount"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
      {items.map(([label, field]) => {
        const evidence = sourceMap[field];
        const value = evidence?.value ?? input[field];
        const missing = evidence?.classification === "TRULY_MISSING" || value === null || value === undefined || value === "";
        const note = missing
          ? `Eksik veri: ${humanizeUserFacingText(evidence?.missingReason, "Mevcut plan alanında bulunamadı.")}`
          : evidence?.classification === "DERIVABLE_FROM_CANONICAL_DATA"
            ? "Mevcut rota verisinden türetildi"
            : "Mevcut plan girdisi";
        return <Metric key={label} title={label} value={missing ? `Eksik veri: ${humanizeUserFacingText(evidence?.label, label)}` : formatNumber(value)} note={note} tone={missing ? "warm" : "default"} />;
      })}
    </div>
  );
}

function unwrapPayload(payload) {
  return payload?.data || payload || null;
}

function externalReferenceRequestFromPayload(payload) {
  const data = unwrapPayload(payload);
  const external = data?.layers?.find((layer) => layer.layer === "EXTERNAL_MARKET_REFERENCE" && layer.available);
  if (!external || (external.valueMinor === null || external.valueMinor === undefined) && !external.valueDecimal) return null;
  return {
    providerKey: external.providerKey || undefined,
    family: "FUEL_DIESEL",
    unit: external.unit || "CURRENCY_PER_L",
    currencyCode: external.currencyCode || "TRY",
    regionCode: external.regionCode || undefined,
    scopeType: external.scopeType || data?.region?.scopeType || undefined,
    scopeKey: external.scopeKey || data?.region?.scopeKey || undefined,
  };
}

function referenceScopeLabel(reference, requestedRegionName = null) {
  if (!reference) return "Kapsam belirtilmedi";
  if (String(reference.scopeType || "").toUpperCase() === "GLOBAL" && String(reference.scopeKey || "").toUpperCase() === "TURKEY") return "Türkiye geneli";
  return reference.regionName || requestedRegionName || reference.regionCode || "Kapsam belirtilmedi";
}

function referenceFallbackLabel(reference) {
  return String(reference?.fallbackState || "NONE").toUpperCase() !== "NONE" ? "Yedek referans" : "Aynı il referansı";
}

function referenceDate(value) {
  if (!value) return "Tarih belirtilmedi";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tarih belirtilmedi" : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

function consumptionReferenceLabel(reference) {
  if (!reference || !reference.available) return "Onaylı referans yok";
  if (reference.range?.minLitersPer100Km != null && reference.range?.maxLitersPer100Km != null) {
    return `${formatNumber(reference.range.minLitersPer100Km)}–${formatNumber(reference.range.maxLitersPer100Km)} L/100 km`;
  }
  return formatNumber(reference.valueLitersPer100Km, " L/100 km");
}

function ResolvedAssumptions({ result, fuelReference, currencyCode, scope = "ROOM" }) {
  const resolution = result?.referenceResolution;
  const consumption = resolution?.vehicleConsumption?.baseline;
  const fuelPrice = resolution?.fuelPrice?.baseline;
  const selectedConsumption = consumption?.selected;
  const external = unwrapPayload(fuelReference)?.layers?.find((layer) => layer.layer === "EXTERNAL_MARKET_REFERENCE");
  return (
    <div data-testid="scenario-resolved-assumptions" className="card" style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.025)" }}>
      <div className="panelSectionTitle">Otomatik çözülen varsayımlar</div>
        <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.5 }}>SeferPakt bildiği operasyon alanlarını ve onaylı referansları kullanır; bu değerler mevcut planı değiştirmez.</div>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <div className="muted"><b>Araç tüketimi:</b> {consumptionReferenceLabel(selectedConsumption)} · Kaynak: {humanizeUserFacingText(selectedConsumption?.sourceName, "Belirtilmedi")} · Güven seviyesi: {confidenceLabel(selectedConsumption?.confidence)}</div>
        <div className="panelMeta">Kaynak tarihi: {referenceDate(selectedConsumption?.sourceDate)} · Uygulanabilirlik: {humanizeUserFacingText(selectedConsumption?.applicabilityLimits, "Sınıf/alt tip kapsamı belirtilmedi.")}</div>
        <div className="muted"><b>{scope === "COMPANY" ? "Yakıt fiyatı referansı" : "Yakıt fiyatı"}:</b> {fuelPrice?.valueMinor != null ? formatMoney(fuelPrice.valueMinor, fuelPrice.currencyCode || currencyCode) + "/L" : "Veri yok; kullanıcıdan zorunlu giriş istenmiyor"}</div>
        <div className="panelMeta">{fuelPrice?.sourceName ? `Kaynak: ${humanizeUserFacingText(fuelPrice.sourceName)} · Kapsam: ${referenceScopeLabel(fuelPrice)} · Durum: ${referenceFallbackLabel(fuelPrice)} · Tarih: ${referenceDate(fuelPrice.asOf)} · Tazelik: ${readableCostText(fuelPrice.freshness, "Belirtilmedi")} · Güven seviyesi: ${confidenceLabel(fuelPrice.confidence)}` : humanizeUserFacingText(external?.selectionReason, "Bölgesel referans bu kapsamda kullanılabilir değil.")}</div>
        {fuelPrice?.sourceMetadata?.fallbackPolicy ? <div className="panelMeta">Yedek referans politikası: aynı il güncel resmi referansı yoksa Türkiye geneli EPDK günlük bülteni kullanılır; İstanbul fiyatı olarak gösterilmez.</div> : null}
        {consumption?.missingData?.length ? <div className="panelMeta">Eksik / doğrulanması gereken: {consumption.missingData.map((item) => humanizeUserFacingText(item)).join(", ")}</div> : null}
        <div className="panelMeta">Öncelik: {(resolution?.vehicleConsumption?.precedence || ["USER_ACTUAL", "PLATFORM_OBSERVED_REFERENCE", "TECHNICAL_CLASS_REFERENCE", "NO_DATA"]).map((item) => readableCostText(item)).join(" → ")}</div>
      </div>
    </div>
  );
}

export default function CostScenarioWorkspacePanel({ scope = "COMPANY", embedded = false, regionName = null, focusAgreementId = null, focusShiftId = null, focusOfferId = null, focusVehicleId = null, quoteFloor = null, roomProfitability = null, commercialOffer = null, planningCostInputs = null, onScenarioSelectionChange = null, onOpenMissingCost = null, quoteEvaluation = false }) {
  const { token, me } = useSession();
  const [baseline, setBaseline] = useState(null);
  const [baselineValues, setBaselineValues] = useState({});
  const [scenarioValues, setScenarioValues] = useState({});
  const [scenarioBValues, setScenarioBValues] = useState({});
  const [periodSchedule, setPeriodSchedule] = useState({
    periodStart: "",
    periodEnd: "",
    weekMask: "",
    startMin: "",
    endMin: "",
    movementsPerDay: "",
    direction: "",
    pattern: "",
  });
  const [baselineCost, setBaselineCost] = useState("");
  const [fuelReference, setFuelReference] = useState(null);
  const [riskValues, setRiskValues] = useState({ riskFuelUnitPriceMinor: "", riskDistanceKm: "", riskDurationMinutes: "" });
  const [stopOperations, setStopOperations] = useState([]);
  const [stopDraft, setStopDraft] = useState({ lat: "", lng: "", index: "" });
  const [routeAlternativeType, setRouteAlternativeType] = useState("");
  const [dispatchDraft, setDispatchDraft] = useState({ vehicleId: "", driverId: "", routeReference: "" });
  const [result, setResult] = useState(null);
  const [selectedVehiclePlan, setSelectedVehiclePlan] = useState(null);
  const [abResult, setAbResult] = useState(null);
  const [abCalculating, setAbCalculating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

  const companyKind = String(me?.companyKind || "COMPANY").toUpperCase();
  const planningOnly = companyKind === "SCHOOL" || companyKind === "ORGANIZATION";
  const contractlessPlanning = scope === "ROOM" && Boolean(baseline?.contractlessPlanningDefaults);
  const roleConfig = roleScenarioConfig(scope, companyKind);
  const configuredFields = roleFields(roleConfig);
  const primaryFields = configuredFields.filter((field) => field.key === "passengerCount");
  const advancedFields = configuredFields.filter((field) => ["ADVANCED_ASSUMPTION", "DERIVED_INPUT"].includes(field.classification) || ["vehicleType", "vehicleCount"].includes(field.key));
  const title = "Maliyet Senaryosu";
  const subtitle = roleConfig.subtitle;

  function publishScenarioSelection(values, nextResult, selectedPlan = null) {
    if (!nextResult) return;
    const current = readCopilotSelection();
    const selectedScenarioCostMinor = Number(
      nextResult.contractlessPeriodPlanning?.periodPlanningCostMinor
        ?? roomScenarioCostForSelection(nextResult, selectedPlan),
    );
    const safeSelectedScenarioCostMinor = Number.isSafeInteger(selectedScenarioCostMinor)
      && selectedScenarioCostMinor >= 0
      ? selectedScenarioCostMinor
      : null;
    const publicKeys = new Set([
      "passengerCount",
      "vehicleType",
      "vehicleCount",
      "vehicleCapacity",
      "serviceDistanceKm",
      "totalDistanceKm",
      "routeDurationMinutes",
      "serviceDayCount",
      "shiftCount",
      "tripCount",
      "fuelConsumptionLitersPer100Km",
      "fuelUnitPriceMinor",
      "driverBasePerShiftMinor",
      "maintenancePerKmMinor",
    ]);
    const selectedScenarioOverrides = Object.fromEntries(
      Object.entries(values || {})
        .filter(([key, value]) => publicKeys.has(key) && value !== "" && value !== null && value !== undefined)
        .filter(([key, value]) => displayValue(baselineValues[key]) !== displayValue(value))
        .map(([key, value]) => [key, key === "vehicleType" ? String(value).toUpperCase() : Number(value)])
        .filter(([, value]) => (typeof value === "number" ? Number.isFinite(value) : Boolean(value))),
    );
    if (current?.facts) {
      setCopilotSelection({
        ...current,
        facts: {
          ...current.facts,
          selectedScenarioOverrides,
          selectedScenarioStatus: nextResult.status || null,
          selectedScenarioModelVersion: nextResult.modelVersion || null,
          selectedScenarioId: nextResult.scenarioId || null,
          selectedScenarioCostMinor: safeSelectedScenarioCostMinor,
          selectedScenarioPeriodPlanning: nextResult.periodPlanning || nextResult.contractlessPeriodPlanning || null,
        },
      });
    }
    if (typeof onScenarioSelectionChange === "function") {
      const quoteCostBreakdown = selectedPlan ? buildRoomQuoteCostBreakdown(selectedPlan) : null;
      onScenarioSelectionChange({
        scenarioId: nextResult.scenarioId,
        costMinor: roomScenarioCostForSelection(nextResult, selectedPlan),
        quoteCostMinor: quoteCostBreakdown?.totalMinor ?? null,
        quoteCostPartialMinor: quoteCostBreakdown?.partialTotalMinor ?? null,
        quoteCostComplete: Boolean(quoteCostBreakdown && quoteCostBreakdown.totalMinor !== null),
        quoteCostMissingLabels: quoteCostBreakdown?.missing.map((item) => item.label) || [],
        vehicleId: Number(selectedPlan?.availability?.vehicleId || 0) || null,
        costBasis: nextResult.scenario?.costBasis,
        status: nextResult.status,
        modelVersion: nextResult.modelVersion,
        overrides: selectedScenarioOverrides,
        periodPlanning: nextResult.periodPlanning || nextResult.contractlessPeriodPlanning || null,
      });
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setStopOperations([]);
    setStopDraft({ lat: "", lng: "", index: "" });
    setRouteAlternativeType("");
    setRiskValues({ riskFuelUnitPriceMinor: "", riskDistanceKm: "", riskDurationMinutes: "" });
    setDispatchDraft({ vehicleId: "", driverId: "", routeReference: "" });
    setPeriodSchedule({ periodStart: "", periodEnd: "", weekMask: "", startMin: "", endMin: "", movementsPerDay: "", direction: "", pattern: "" });
    getCostScenarioBaseline(token, scope, { focusAgreementId, focusShiftId, focusOfferId }, { signal: controller.signal, force: true })
      .then(async (payload) => {
        if (controller.signal.aborted) return;
        const next = unwrapPayload(payload);
        const inputs = next?.input || {};
        setBaseline(next);
        const scheduleDefaults = next?.contractlessPlanningDefaults || null;
        const defaultSchedule = scheduleDefaults ? {
          periodStart: scheduleDefaults.periodStart || "",
          periodEnd: scheduleDefaults.periodEnd || "",
          weekMask: "",
          startMin: "",
          endMin: "",
          movementsPerDay: "",
          direction: scheduleDefaults.direction || "",
          pattern: scheduleDefaults.pattern || "",
        } : { periodStart: "", periodEnd: "", weekMask: "", startMin: "", endMin: "", movementsPerDay: "", direction: "", pattern: "" };
        const persistedPlanning = readCopilotSelection()?.facts?.selectedScenarioPeriodPlanning;
        const persistedPeriodMatches = persistedPlanning
          && (!defaultSchedule.periodStart || persistedPlanning.periodStart === defaultSchedule.periodStart)
          && (!defaultSchedule.periodEnd || persistedPlanning.periodEnd === defaultSchedule.periodEnd);
        setPeriodSchedule(persistedPeriodMatches ? {
          ...defaultSchedule,
          periodStart: persistedPlanning.periodStart || defaultSchedule.periodStart,
          periodEnd: persistedPlanning.periodEnd || defaultSchedule.periodEnd,
          weekMask: persistedPlanning.weekMask == null ? defaultSchedule.weekMask : String(persistedPlanning.weekMask),
          startMin: persistedPlanning.startMin == null ? defaultSchedule.startMin : String(persistedPlanning.startMin),
          endMin: persistedPlanning.endMin == null ? defaultSchedule.endMin : String(persistedPlanning.endMin),
          movementsPerDay: persistedPlanning.movementsPerDay == null ? defaultSchedule.movementsPerDay : String(persistedPlanning.movementsPerDay),
          direction: persistedPlanning.direction || defaultSchedule.direction,
          pattern: persistedPlanning.pattern || defaultSchedule.pattern,
        } : defaultSchedule);
        setBaselineValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioBValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setRiskValues(scope === "ROOM" ? demoRiskAssumptionsFor(inputs) : {});
        setResult(null);
        setAbResult(null);
        let referencePayload = null;
        try {
          referencePayload = await getExternalCostReferenceLayers(token, {
            family: "FUEL_DIESEL",
            unit: "CURRENCY_PER_L",
            currencyCode: inputs.currencyCode || "TRY",
            scope,
            regionName: regionName || next?.regionName || undefined,
            refresh: "true",
          }, { signal: controller.signal, force: true });
        } catch (referenceError) {
          if (referenceError?.name === "AbortError" || controller.signal.aborted) return;
        }
        if (controller.signal.aborted) return;
        setFuelReference(referencePayload);
        if (!next?.baselineReferenceId) return;
        try {
          const externalReference = externalReferenceRequestFromPayload(referencePayload);
          const demoRiskAssumptions = scope === "ROOM" ? demoRiskAssumptionsFor(inputs, referencePayload) : {};
          if (Object.keys(demoRiskAssumptions).length) setRiskValues(demoRiskAssumptions);
          const initialPreview = await postCostScenarioPreview({
            scope,
            focusAgreementId,
            focusShiftId,
            focusOfferId,
            baselineReferenceId: next.baselineReferenceId,
            baselineInput: inputs,
            scenarioOverrides: {
              ...(externalReference && inputs.fuelUnitPriceMinor == null ? { useExternalFuelPrice: true } : {}),
              ...(Object.keys(demoRiskAssumptions).length ? { riskAssumptions: demoRiskAssumptions } : {}),
            },
            ...(externalReference ? { externalReference } : {}),
          }, { token });
          const initialResult = unwrapPayload(initialPreview);
          if (controller.signal.aborted) return;
          const restoredVehicleId = Number(focusVehicleId || 0);
          const restoredPlan = scope === "ROOM" && restoredVehicleId > 0
            ? initialResult?.vehiclePlanAlternatives?.items?.find((item) => Number(item?.availability?.vehicleId || 0) === restoredVehicleId)
            : null;
          if (!restoredPlan) {
            setResult(initialResult);
            return;
          }
          const restoredValues = {
            ...Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])),
            vehicleType: restoredPlan.vehicleType || "",
            vehicleCount: String(restoredPlan.requiredVehicleCount || 1),
            vehicleCapacity: String(restoredPlan.capacity || ""),
          };
          const restoredPreview = await postCostScenarioPreview({
            scope,
            focusAgreementId,
            focusShiftId,
            focusOfferId,
            baselineReferenceId: next.baselineReferenceId,
            baselineInput: inputs,
            scenarioOverrides: {
              vehicleType: restoredValues.vehicleType,
              vehicleCount: restoredValues.vehicleCount,
              vehicleCapacity: restoredValues.vehicleCapacity,
              ...(externalReference && inputs.fuelUnitPriceMinor == null ? { useExternalFuelPrice: true } : {}),
            },
            ...(externalReference ? { externalReference } : {}),
          }, { token });
          if (controller.signal.aborted) return;
          const restoredResult = unwrapPayload(restoredPreview);
          const restoredResultPlan = restoredResult?.vehiclePlanAlternatives?.items?.find((item) => Number(item?.availability?.vehicleId || 0) === restoredVehicleId) || restoredPlan;
          setScenarioValues(restoredValues);
          setResult(restoredResult);
          publishScenarioSelection(restoredValues, restoredResult, restoredResultPlan);
        } catch (previewError) {
          if (previewError?.name === "AbortError" || controller.signal.aborted) return;
          const info = getApiErrorInfo(previewError, "Senaryo başlangıç karşılaştırması hazırlanamadı.");
          setError(info.message || "Senaryo başlangıç karşılaştırması hazırlanamadı.");
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const info = getApiErrorInfo(err, "Senaryo başlangıç verisi okunamadı.");
        setError(info.message || "Senaryo başlangıç verisi okunamadı.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [focusAgreementId, focusOfferId, focusShiftId, focusVehicleId, regionName, scope, token]);

  const baselineInput = useMemo(() => ({
    ...baselineValues,
    ...(compact(baselineCost) ? { baselineCostMinor: parseMajorInput(baselineCost) } : {}),
  }), [baselineCost, baselineValues]);

  function scenarioOverridesFor(values, includeExtras = true) {
    const overrides = Object.fromEntries(Object.entries(values || {}).filter(([key, value]) => {
      if (value === "" || value === null || value === undefined) return false;
      return displayValue(baselineValues[key]) !== displayValue(value);
    }));
    if (!includeExtras) return overrides;
    return {
      ...overrides,
      ...(stopOperations.length ? { scenarioStopOperations: stopOperations } : {}),
      ...(routeAlternativeType ? { routeAlternative: { type: routeAlternativeType } } : {}),
      ...((dispatchDraft.vehicleId || dispatchDraft.driverId || dispatchDraft.routeReference) ? { dispatchAlternative: dispatchDraft } : {}),
      riskAssumptions: Object.fromEntries(Object.entries(riskValues).filter(([, value]) => compact(value))),
    };
  }

  function planningSchedulePayload() {
    if (!contractlessPlanning) return null;
    return {
      periodStart: periodSchedule.periodStart || null,
      periodEnd: periodSchedule.periodEnd || null,
      weekMask: periodSchedule.weekMask === "" ? null : Number(periodSchedule.weekMask),
      startMin: periodSchedule.startMin === "" ? null : Number(periodSchedule.startMin),
      endMin: periodSchedule.endMin === "" ? null : Number(periodSchedule.endMin),
      movementsPerDay: periodSchedule.movementsPerDay === "" ? null : Number(periodSchedule.movementsPerDay),
      direction: periodSchedule.direction || null,
      pattern: periodSchedule.pattern || null,
    };
  }

  function planningCostInputsPayload() {
    if (!planningCostInputs || typeof planningCostInputs !== "object") return {};
    // ROOM maliyeti tek kanonik gider girişinden ve operasyon kanıtından gelir.
    // Teklif senaryosu, kullanıcıya aynı gideri veya dağıtım varsayımını yeniden girdiremez.
    if (scope === "ROOM") return {};
    const allowed = [
      "manualBaselineOperationalCostMinor",
      "targetContributionBps",
      "riskReserveBps",
      "fuelUnitPriceMinor",
      "driverBasePerShiftMinor",
      "maintenancePerKmMinor",
      "tirePerKmMinor",
      "depreciationPerKmMinor",
      "cleaningPerShiftMinor",
      "vehicleWearPerKmMinor",
      "otherVehicleVariableCostMinor",
      "vehicleLeaseMonthlyMinor",
      "fixedVehicleCostMonthlyMinor",
      "explicitVehicleFixedCostAllocatedMinor",
      "insuranceMonthlyMinor",
      "taxAndLicenseMonthlyMinor",
    ];
    return Object.fromEntries(
      allowed
        .map((key) => [key, planningCostInputs[key]])
        .filter(([, value]) => value !== "" && value !== null && value !== undefined),
    );
  }

  async function requestPreview(values, includeExtras = true) {
    const externalReference = externalReferenceRequestFromPayload(fuelReference);
    const overrides = scenarioOverridesFor(values, includeExtras);
    const explicitPlanningInputs = planningCostInputsPayload();
    const hasExplicitFuelPrice = overrides.fuelUnitPriceMinor !== undefined && overrides.fuelUnitPriceMinor !== null && overrides.fuelUnitPriceMinor !== "";
    return postCostScenarioPreview({
        scope,
        focusAgreementId,
        focusShiftId,
      focusOfferId,
        baselineReferenceId: baseline.baselineReferenceId,
        baselineInput: {
          ...baselineInput,
          ...explicitPlanningInputs,
        },
        scenarioOverrides: {
          ...overrides,
          ...explicitPlanningInputs,
          ...(externalReference && baselineInput.fuelUnitPriceMinor == null && !hasExplicitFuelPrice ? { useExternalFuelPrice: true } : {}),
        },
        ...(planningSchedulePayload() ? { planningSchedule: planningSchedulePayload() } : {}),
        ...(externalReference ? { externalReference } : {}),
      }, { token });
  }

  async function calculate() {
    if (!baseline?.baselineReferenceId) return;
    setCalculating(true);
    setError("");
    setSelectedVehiclePlan(null);
    try {
      const payload = await requestPreview(scenarioValues);
      const nextResult = payload?.data || payload || null;
      setResult(nextResult);
      publishScenarioSelection(scenarioValues, nextResult);
    } catch (err) {
      const info = getApiErrorInfo(err, "Senaryo hesaplanamadı.");
      setError(info.message || "Senaryo hesaplanamadı.");
      setResult(null);
    } finally {
      setCalculating(false);
    }
  }

  async function selectVehiclePlan(item) {
    if (!item?.requiredVehicleCount || !item?.capacity) return;
    const nextValues = {
      ...scenarioValues,
      vehicleType: item.vehicleType,
      vehicleCount: String(item.requiredVehicleCount),
      vehicleCapacity: String(item.capacity),
    };
    setScenarioValues(nextValues);
    setSelectedVehiclePlan(item);
    setError("");
    setCalculating(true);
    try {
      const payload = await requestPreview(nextValues);
      const nextResult = payload?.data || payload || null;
      setResult(nextResult);
      publishScenarioSelection(nextValues, nextResult, item);
    } catch (err) {
      const info = getApiErrorInfo(err, "Araç planı karşılaştırılamadı.");
      setError(info.message || "Araç planı karşılaştırılamadı.");
    } finally {
      setCalculating(false);
    }
  }

  async function compareAB() {
    if (!baseline?.baselineReferenceId) return;
    setAbCalculating(true);
    setError("");
    try {
      const [aPayload, bPayload] = await Promise.all([
        requestPreview(scenarioValues, false),
        requestPreview(scenarioBValues, false),
      ]);
      setAbResult({
        a: aPayload?.data || aPayload || null,
        b: bPayload?.data || bPayload || null,
      });
    } catch (err) {
      const info = getApiErrorInfo(err, "A/B senaryoları karşılaştırılamadı.");
      setError(info.message || "A/B senaryoları karşılaştırılamadı.");
      setAbResult(null);
    } finally {
      setAbCalculating(false);
    }
  }

  function addScenarioStop() {
    const lat = Number(stopDraft.lat);
    const lng = Number(stopDraft.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setStopOperations((previous) => [...previous, {
      operation: "ADD",
      lat,
      lng,
      ...(stopDraft.index !== "" ? { index: Number(stopDraft.index) } : {}),
    }]);
    setStopDraft((previous) => ({ ...previous, lat: "", lng: "" }));
  }

  function removeScenarioStop() {
    const index = Number(stopDraft.index);
    if (!Number.isInteger(index) || index < 0) return;
    setStopOperations((previous) => [...previous, { operation: "REMOVE", index }]);
  }

  const currencyCode = baseline?.input?.currencyCode || "TRY";
  const resultStatus = result?.status || "";
  const confidence = result?.confidence || {};
  const deltaTone = result?.savingsMinor != null ? "good" : result?.additionalCostMinor != null ? "danger" : "warm";
  const partialCost = result?.partialCost?.status === "PARTIAL" && result?.partialCost?.estimatedCostMinor != null ? result.partialCost : null;
  const incrementalCost = result?.incrementalCost || null;
  const periodScope = result?.periodScope || null;
  const criticalMissing = (result?.missingData || []).filter((item) => !/sürücü|bakım/i.test(item));
  const optionalMissing = result?.costCoverage?.scenario?.missingOptionalCosts || [];
  const bestVariantDisplay = scenarioVariantDecisionDisplay({
    variant: result?.scenarioVariants?.BEST,
    costCoverageStatus: result?.costCoverage?.scenario?.status,
  });
  const contextName = baseline?.companyName || baseline?.roomName || "Bağlı tenant";
  const visibleBaselineConfidence = baseline?.baselineConfidence || {
    level: baseline?.missingFields?.length ? "MEDIUM" : "HIGH",
    reason: baseline?.missingFields?.length ? "Eksik mevcut plan alanları nedeniyle güven sınırlı." : "Mevcut plan girdileri kullanılıyor.",
  };
  const selectedContext = baseline?.related?.selectedContext || null;
  const previewContext = planningPreviewContext({
    explicitlySelected: Boolean(selectedContext?.explicitlySelected),
    date: selectedContext?.date,
    vehiclePlate: selectedContext?.vehiclePlate,
    driverName: selectedContext?.driverName,
  });
  const routeEvidence = baseline?.routeEvidence?.baseline || null;
  const routePassage = routePassageForDisplay({ baseline, result });
  const routePassageForUi = routePassage || {
    status: "NOT_PROVEN",
    totalMinor: null,
    passageBasis: "PLANNED_ROUTE_TARIFF",
    missingReasons: ["Rota kanıtı yükleniyor."],
  };
  function openMissingCostForm(item) {
    if (scope !== "ROOM") return;
    const params = new URLSearchParams({ view: "expenses", action: "add" });
    const ids = {
      focusAgreementId,
      focusShiftId,
      prefillVehicleId: selectedContext?.vehicleId || item?.availability?.vehicleId,
      prefillDriverId: selectedContext?.driverId || item?.availability?.driverId,
    };
    Object.entries(ids).forEach(([key, value]) => {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) params.set(key, String(id));
    });
    if (periodSchedule.periodStart) params.set("focusPeriodStart", periodSchedule.periodStart);
    if (periodSchedule.periodEnd) params.set("focusPeriodEnd", periodSchedule.periodEnd);
    params.set("focusRecordKind", "FORECAST");
    if (planningCostInputs?.quoteScenarioAmountMinor) params.set("quoteScenarioAmountMinor", String(planningCostInputs.quoteScenarioAmountMinor));
    const currentQuery = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const returnQuery = new URLSearchParams(currentQuery);
    returnQuery.set("view", "quote-profitability");
    const selectedVehicleId = Number(selectedContext?.vehicleId || item?.availability?.vehicleId || 0);
    if (Number.isSafeInteger(selectedVehicleId) && selectedVehicleId > 0) returnQuery.set("focusVehicleId", String(selectedVehicleId));
    if (planningCostInputs?.quoteScenarioAmountMinor) returnQuery.set("quoteScenarioAmountMinor", String(planningCostInputs.quoteScenarioAmountMinor));
    returnQuery.delete("action");
    returnQuery.delete("focusEntryId");
    returnQuery.delete("focusCostCategory");
    returnQuery.delete("focusField");
    returnQuery.delete("focusRecordKind");
    returnQuery.delete("prefillVehicleId");
    returnQuery.delete("prefillDriverId");
    returnQuery.delete("contextSource");
    params.set("returnTo", `/room/financial-operations?${returnQuery.toString()}`);
    const missing = (item?.missingOptionalCosts || []).map((cost) => String(cost.key || cost.label || "").toUpperCase()).join(" ");
    if (missing.includes("DRIVER") || missing.includes("EMPLOYER") || missing.includes("LABOR")) params.set("focusCostCategory", "EMPLOYER_MONTHLY_COST");
    else if (missing.includes("ROUTE_FEES") || missing.includes("TOLL") || missing.includes("HIGHWAY")) params.set("focusCostCategory", "HGS_TOLL");
    else if (missing.includes("OVERHEAD") || missing.includes("OPERATIONS")) params.set("focusCostCategory", "OPERATIONS_OVERHEAD");
    else if (missing.includes("WAITING") || missing.includes("OTHER_DIRECT") || missing.includes("OTHER_OPERATION")) params.set("focusCostCategory", "OTHER_OPERATION");
    else if (missing.includes("VEHICLE_FIXED") || missing.includes("FIXED")) params.set("focusCostCategory", "DEPRECIATION");
    else if (missing.includes("MAINTENANCE")) params.set("focusCostCategory", "MAINTENANCE");
    else if (missing.includes("ADBLUE")) params.set("focusCostCategory", "ADBLUE");
    else if (missing.includes("FUEL")) params.set("focusCostCategory", "FUEL");
    navigate(`/room/financial-operations?${markRoomExpenseEntryContext(params).toString()}`);
  }
  function openAssignmentScreen() {
    if (scope !== "ROOM" || !Number(focusShiftId || 0)) return;
    navigate(`/room/shifts?focusShiftId=${encodeURIComponent(String(focusShiftId))}`);
  }
  function riskAssumptionLabel() {
    return Object.values(riskValues).some((value) => compact(value))
      ? scope === "COMPANY"
        ? "Tam veriyle stres senaryosu: başlangıçta yakıt, rota ve süre +%20. Değerleri değiştirip yeniden hesaplayabilirsiniz."
        : "FULL_DATA DEMO stres varsayımı: başlangıçta yakıt, rota ve süre +%20. Değerleri değiştirip yeniden hesaplayabilirsiniz."
      : scope === "COMPANY"
        ? "Stres senaryosu için yakıt, rota ve süre kanıtı bekleniyor; risk sonucu uydurulmaz."
        : "DEMO stres varsayımı için yakıt, rota ve süre kanıtı bekleniyor; risk sonucu uydurulmaz.";
  }
  const periodPlanningResult = result?.contractlessPeriodPlanning || null;
  const periodPlanningMissing = Array.isArray(periodPlanningResult?.missing) ? periodPlanningResult.missing : [];
  function togglePlanningDay(bit) {
    setPeriodSchedule((previous) => {
      const nextMask = (Number(previous.weekMask || 0) ^ bit);
      return { ...previous, weekMask: nextMask ? String(nextMask) : "" };
    });
  }
  const content = (
    <div className="cost-scenario-workspace-content" data-testid="cost-scenario-workspace" data-scope={scope} data-quote-evaluation-compact={quoteEvaluation ? "true" : undefined}>
      <div className="muted" style={{ lineHeight: 1.5 }}>{subtitle}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill">Önizleme</span>
        <span className="pill">{planningOnly ? "Planlama bağlamı" : roleConfig.audience}</span>
        {baseline?.regionName ? <span className="pill" data-testid="scenario-operation-region">Operasyon bölgesi: {baseline.regionName}</span> : null}
        {baseline ? <span className="pill" data-testid="scenario-baseline-confidence">Operasyonel plan güveni: {confidenceLabel(visibleBaselineConfidence.level)} · Net kâr değil</span> : null}
        {resultStatus ? <span className="pill" data-status={statusTone(resultStatus).toUpperCase()}>{partialCost ? "Kısmi maliyet hesaplandı" : statusLabel(resultStatus)}</span> : null}
      </div>
      <div className="panelMeta" data-testid="scenario-route-passage-evidence" style={{ marginTop: 8 }}>{routePassageLabel(routePassageForUi, baseline?.input?.currencyCode || currencyCode)}</div>

      <div className="card" data-testid="scenario-service-context" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.25)", background: "rgba(58,102,255,0.04)" }}>
        <div className="panelSectionTitle">{previewContext.heading}</div>
        {selectedContext ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <div className="muted"><b>{previewContext.title}</b> · {previewContext.details} · {humanizeUserFacingText(selectedContext.status, "Durum belirtilmedi")}</div>
            <div className="muted">Araç: <b>{selectedContext.vehiclePlate || "Araç bağlantısı doğrulanmadı"}</b> · Sürücü: <b>{selectedContext.driverName || "Sürücü bağlantısı doğrulanmadı"}</b></div>
            <div className="panelMeta">{previewContext.note}</div>
            <div className="panelMeta">Rota: {routeEvidence?.distanceKm != null ? `${formatNumber(routeEvidence.distanceKm, " km")} · ${formatNumber(routeEvidence.durationMinutes, " dk")} · ${routeSourceLabel(routeEvidence.source)}` : "Mesafe ve süre kanıtı bekleniyor."}</div>
          </div>
        ) : <div className="panelMeta" style={{ marginTop: 8 }}>Hizmet bağlamı bulunamadı; araç önerisi uydurulmayacak.</div>}
      </div>

      {contractlessPlanning ? (
        <div className="card" data-testid="contractless-period-planning-form" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.4)", background: "rgba(247,144,9,0.06)" }}>
          <div className="panelSectionTitle">Dönem takvimini tamamla</div>
          <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>
            {focusShiftId ? `#${focusShiftId} kaydı` : "Seçili kayıt"} yalnız tarih aralığı ve rota içeriyor. Çalışma günleri, saat ve günlük sefer sayısı verilmeden dönem maliyeti hesaplanmaz. Aşağıdaki bilgiler yalnız teklif öncesi planlama içindir; vardiya veya gerçekleşen gider oluşturmaz.
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            <label className="muted">Başlangıç tarihi<input data-testid="period-plan-start" type="date" value={periodSchedule.periodStart} onChange={(event) => setPeriodSchedule((previous) => ({ ...previous, periodStart: event.target.value }))} style={INPUT_STYLE} /></label>
            <label className="muted">Bitiş tarihi<input data-testid="period-plan-end" type="date" value={periodSchedule.periodEnd} onChange={(event) => setPeriodSchedule((previous) => ({ ...previous, periodEnd: event.target.value }))} style={INPUT_STYLE} /></label>
            <label className="muted">Günlük başlangıç<input data-testid="period-plan-start-time" type="time" value={minutesToTimeInput(periodSchedule.startMin)} onChange={(event) => setPeriodSchedule((previous) => ({ ...previous, startMin: timeInputToMinutes(event.target.value) }))} style={INPUT_STYLE} /></label>
            <label className="muted">Günlük bitiş<input data-testid="period-plan-end-time" type="time" value={minutesToTimeInput(periodSchedule.endMin)} onChange={(event) => setPeriodSchedule((previous) => ({ ...previous, endMin: timeInputToMinutes(event.target.value) }))} style={INPUT_STYLE} /></label>
            <label className="muted">Günlük sefer sayısı<input data-testid="period-plan-movements" type="number" min="1" max="8" step="1" value={periodSchedule.movementsPerDay} onChange={(event) => setPeriodSchedule((previous) => ({ ...previous, movementsPerDay: event.target.value }))} placeholder="Örn. 1" style={INPUT_STYLE} /></label>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Çalışma günleri</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {WEEKDAYS.map((day) => <label key={day.k} className="pill" style={{ cursor: "pointer" }}><input data-testid={`period-plan-day-${day.k}`} type="checkbox" checked={(Number(periodSchedule.weekMask || 0) & day.bit) !== 0} onChange={() => togglePlanningDay(day.bit)} style={{ marginRight: 5 }} />{day.label}</label>)}
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {periodSchedule.direction ? <span className="pill">Yön: {periodSchedule.direction === "INBOUND" ? "Geliş" : periodSchedule.direction === "OUTBOUND" ? "Dönüş" : humanizeUserFacingText(periodSchedule.direction)}</span> : null}
            {periodSchedule.pattern ? <span className="pill">Hizmet biçimi: {periodSchedule.pattern === "ONE_WAY" ? "Tek yön" : humanizeUserFacingText(periodSchedule.pattern)}</span> : null}
            <span className="panelMeta" style={{ alignSelf: "center" }}>Mevcut kayıttan geldi; değiştirmek için ilgili talep akışını kullanın.</span>
          </div>
          {periodPlanningResult ? <div data-testid="period-plan-result" className="card" style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.025)" }}>
            <div className="panelSectionTitle">Dönem planı sonucu</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              <Metric title="Planlı gün" value={formatNumber(periodPlanningResult.scheduledServiceDayCount, " gün")} note="Seçilen takvim" />
              <Metric title="Planlı sefer" value={formatNumber(periodPlanningResult.plannedMovementCount, " sefer")} note="Gün × günlük sefer" />
              <Metric title="Dönem" value={periodPlanningResult.periodStart && periodPlanningResult.periodEnd ? `${periodPlanningResult.periodStart} – ${periodPlanningResult.periodEnd}` : "Belirsiz"} note={periodPlanningResult.scheduleSource === "USER_ENTERED_PLANNING" ? "Kullanıcı planı" : "Kaynak belirtilmedi"} />
              <Metric title="Dönem maliyeti" value={periodPlanningResult.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION" ? formatMoney(result?.scenario?.costMinor, result?.currencyCode || currencyCode) : "Hesaplanamadı"} note={periodPlanningResult.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION" ? "Planlama önizlemesi; gerçekleşmiş gider değil" : "Takvim veya maliyet kanıtı eksik"} tone={periodPlanningResult.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION" ? "warm" : "danger"} />
            </div>
            {Array.isArray(periodPlanningResult.scheduledServiceDates) && periodPlanningResult.scheduledServiceDates.length ? <div data-testid="period-plan-dates" className="panelMeta" style={{ marginTop: 10 }}>Planlanan günler: {periodPlanningResult.scheduledServiceDates.map((value) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(new Date(`${value}T12:00:00+03:00`))).join(", ")} · {formatNumber(periodPlanningResult.movementsPerDay || 1, " sefer/gün")}</div> : null}
            {periodPlanningMissing.length ? <div className="panelMeta" style={{ marginTop: 10 }}>Tamamlanması gereken: {periodPlanningMissing.map((item) => humanizeUserFacingText(item)).join(", ")}</div> : null}
          </div> : null}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.35)", background: "rgba(247,144,9,0.06)" }}>
        <div className="panelSectionTitle">Güvenli ana aksiyon</div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>Mevcut planı alternatif senaryoyla karşılaştır</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          {planningOnly ? "Planlama varsayımlarını test edin; normal bütçe yaşam döngüsü bu bağlamda açılmaz." : "Araç, kapasite, rota ve maliyet varsayımlarını değiştirerek karar desteği alın."}
        </div>
        <button data-testid="cost-scenario-calculate" type="button" className="btn primary" style={{ marginTop: 14 }} onClick={calculate} disabled={loading || calculating || !baseline}>
          {calculating ? "Karşılaştırılıyor..." : "Senaryoyu Karşılaştır"}
        </button>
      </div>

      {error ? <div className="card" role="alert" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.3)" }}>{error}</div> : null}

      {result ? (
        <div className="card" data-testid="scenario-result-summary" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.36)", background: "rgba(18,183,106,0.045)" }}>
          <div className="panelSectionTitle">Sonuç özeti</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{humanizeUserFacingText(result.summaryText, statusLabel(resultStatus))}</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.5 }}>
            {selectedContext ? `${previewContext.title}: ${previewContext.details}` : "Planlama hizmet bağlamı doğrulanamadı."} · {resultStatus === "READY" ? "Planlama önizlemesi" : "Sonuç doğrulaması bekleniyor"}
            {selectedContext ? ` ${previewContext.note}` : ""}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            <Metric title="Mevcut plan" value={formatMoney(result.baseline?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.baseline?.costBasis, "Maliyet kanıtı bekleniyor")} />
            <Metric title="Senaryo sonucu" value={formatMoney(result.scenario?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.scenario?.costBasis, "Maliyet kanıtı bekleniyor")} />
            <Metric title="Fark / fırsat" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaMinor == null ? "Karşılaştırılabilir sonuç yok" : result.savingsMinor != null ? "Planlama tasarrufu" : "Planlama ek maliyeti"} tone={deltaTone} />
            <Metric title="Veri güveni" value={confidenceLabel(confidence.level)} note={humanizeUserFacingText(confidence.reason, "Güven açıklaması bekleniyor")} tone={confidenceTone(confidence.level)} />
          </div>
          {result.scenarioVariants ? (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
              <Metric title="Beklenen durum" value={formatMoney(result.scenarioVariants.EXPECTED?.estimatedCost, result.currencyCode || currencyCode)} note={readableCostText(result.scenarioVariants.EXPECTED?.status, "Sonuç bekleniyor")} />
              <Metric title="En uygun plan" value={formatMoney(bestVariantDisplay.estimatedCost, result.currencyCode || currencyCode)} note={humanizeUserFacingText(bestVariantDisplay.rationale)} tone={bestVariantDisplay.tone} />
              <Metric title="Riskli senaryo" value={formatMoney(result.scenarioVariants.RISK?.estimatedCost, result.currencyCode || currencyCode)} note={humanizeUserFacingText(result.scenarioVariants.RISK?.rationale, readableCostText(result.scenarioVariants.RISK?.status, "Stres sonucu bekleniyor"))} tone="warm" />
            </div>
          ) : null}
          <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.5 }}>
            Gerekçe: {humanizeUserFacingText(result.summaryText, "Mevcut plan ile seçili planlama senaryosu karşılaştırıldı.")} Sonraki bölümlerde rota, kapasite, maliyet bileşenleri ve kanıt ayrıntıları açılabilir.
          </div>
        </div>
      ) : null}

      <div className="card" data-testid="scenario-current-plan" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.25)", background: "rgba(58,102,255,0.05)" }}>
        <div className="panelSectionTitle">Mevcut plan</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{contextName} · {baseline?.source?.label || "Plan girdisi bekleniyor"}</div>
        {baseline ? <div data-testid="scenario-baseline-summary"><InputSummary input={baselineValues} sourceMap={baseline.baselineSourceMap} config={roleConfig} /></div> : <div className="muted" style={{ marginTop: 12 }}>{loading ? "Plan verisi okunuyor..." : "Plan verisi bulunamadı."}</div>}
        {baseline?.missingFields?.length ? (
          <div data-testid="scenario-missing-fields" className="card" style={{ marginTop: 12, padding: 12, border: "1px solid rgba(247,144,9,0.3)", background: "rgba(247,144,9,0.05)" }}>
            <div className="panelSectionTitle">Eksik veri alanları</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Bu alanlar için mevcut plan verisi bulunmadı; değer uydurulmadı ve senaryo sonucu güveni buna göre gösterilir.</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {baseline.missingFields.map((field) => <span className="pill" key={field}>Eksik veri: {baseline.baselineSourceMap?.[field]?.label || field}</span>)}
            </div>
          </div>
        ) : null}
        <details data-testid="scenario-details" style={{ marginTop: 12 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Detaylar · otomatik çözülen değerler ve kaynaklar</summary>
          <ResolvedAssumptions result={result} fuelReference={fuelReference} currencyCode={currencyCode} scope={scope} />
          <div className="panelMeta" style={{ marginTop: 10 }}>Mevcut plan alanları yalnızca okunur; kullanıcı bunları yeniden girmek zorunda değildir.</div>
          <div style={{ marginTop: 10 }}><InputGrid values={baselineValues} setValues={setBaselineValues} prefix="baseline" readOnly /></div>
        </details>
      </div>

      <div className="card" data-testid="scenario-primary-inputs" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.25)" }}>
        <div className="panelSectionTitle">Sadece değiştirmek istediğin</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Mevcut plan, rota, gün, araç sayısı ve maliyet referansları otomatik alınır ve korunur. Basit bir senaryo için yalnızca kişi sayısını değiştirmen yeterlidir; veri yoksa değer uydurulmaz.</div>
        <div style={{ marginTop: 12 }}><InputGrid values={scenarioValues} setValues={setScenarioValues} prefix="scenario" fields={primaryFields} /></div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button data-testid="scenario-quick-passenger" type="button" className="btn" onClick={() => setScenarioValues((previous) => ({ ...previous, passengerCount: String(Math.max(0, Number(previous.passengerCount || baselineValues.passengerCount || 0) + 10)) }))}>{roleConfig.quickPassenger}</button>
          <span className="panelMeta" style={{ alignSelf: "center" }}>Araç sayısı ve kapasite önerilen planlardan otomatik gelir; canlı kayıt değişmez.</span>
        </div>
      </div>

      <VehiclePlanAlternatives
        scope={scope}
        result={result}
        currencyCode={result?.currencyCode || currencyCode}
        onSelect={selectVehiclePlan}
        onOpenMissingCost={onOpenMissingCost || openMissingCostForm}
        onOpenAssignment={openAssignmentScreen}
        assignmentMissing={quoteEvaluation && Boolean(focusShiftId) && (!selectedContext?.vehicleId || !selectedContext?.driverId)}
        quoteEvaluation={quoteEvaluation}
        selectedPlan={selectedVehiclePlan || (quoteEvaluation && focusVehicleId ? result?.vehiclePlanAlternatives?.items?.find((item) => Number(item?.availability?.vehicleId || 0) === Number(focusVehicleId)) : null)}
        focusOfferId={focusOfferId}
        focusShiftId={focusShiftId}
        quoteAmountMinor={planningCostInputs?.quoteScenarioAmountMinor}
      />

      {scope === "ROOM" ? (
        <div className="card" data-testid="room-auto-cost-boundary" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.3)", background: "rgba(18,183,106,0.04)" }}>
          <div className="panelSectionTitle">Otomatik maliyet dağıtımı</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            ROOM gideri yalnızca bir kez kaydedilir. Dönem, araç, sürücü, rota ve hizmet bağlantısı kanıtlı kayıtlardan otomatik okunur; bu ekranda aylık pay, kilometre anahtarı, yakıt, bakım, maaş veya muhasebe sınıflandırması elle girilmez.
          </div>
          <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Kanıt eksikse sistem varsayım uydurmaz; tahmini maliyeti ve sonucu belirsiz bırakır. Bu önizleme gerçekleşmiş gider veya kesin kâr kaydı oluşturmaz.
          </div>
        </div>
      ) : (
        <details className="card" data-testid="scenario-advanced-assumptions" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>PLANLAMA VARSAYIMI · Gelişmiş varsayımlar ve maliyet/operasyon</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Buradaki değerler yalnızca geçici karşılaştırma içindir; gerçek gider, onaylı hizmet kanıtı veya canlı atama değildir.</div>
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <Field label="Senaryo için maliyet varsayımı (₺)" value={baselineCost} placeholder="İsteğe bağlı plan varsayımı" onChange={setBaselineCost} />
          <div className="panelMeta" style={{ marginTop: 8 }}>Tutar Türk lirası olarak girilir. Bu yalnızca senaryo için kullanılan bir varsayımdır; mevcut planın gerçek veya planlanan maliyetini değiştirmez. Boş bırakılırsa sistem yalnızca tamamlanmış maliyet bileşenlerini kullanır.</div>
        </div>
        <details data-testid="scenario-advanced-fields" style={{ marginTop: 12 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Maliyet ve operasyon ayrıntıları</summary>
          <div style={{ marginTop: 10 }}><InputGrid values={scenarioValues} setValues={setScenarioValues} prefix="scenario" fields={advancedFields} /></div>
          <div data-testid="scenario-risk-demo-assumption" className="panelMeta" style={{ marginTop: 10, lineHeight: 1.5 }}>{riskAssumptionLabel()}</div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Field testId="scenario-risk-fuel" label="Riskli yakıt varsayımı (₺/L)" value={riskValues.riskFuelUnitPriceMinor} onChange={(value) => setRiskValues((previous) => ({ ...previous, riskFuelUnitPriceMinor: value }))} money />
            <Field testId="scenario-risk-distance" label="Riskli mesafe (km)" value={riskValues.riskDistanceKm} onChange={(value) => setRiskValues((previous) => ({ ...previous, riskDistanceKm: value }))} />
            <Field testId="scenario-risk-duration" label="Riskli rota süresi (dk)" value={riskValues.riskDurationMinutes} onChange={(value) => setRiskValues((previous) => ({ ...previous, riskDurationMinutes: value }))} />
            <label className="muted" style={{ minWidth: 0 }}>
              Rota alternatifi
              <select data-testid="scenario-route-alternative" value={routeAlternativeType} onChange={(event) => setRouteAlternativeType(event.target.value)} style={INPUT_STYLE}>
                <option value="">Yok</option>
                <option value="REVERSE_STOP_ORDER">Durak sırasını ters çevir (önizleme)</option>
              </select>
            </label>
          </div>
          <div className="card" data-testid="scenario-stop-operations" style={{ marginTop: 12, padding: 12 }}>
            <div className="panelSectionTitle">Durak ekle / çıkar</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Koordinatlar yalnız alternatif rota hesabında kullanılır; mevcut durak kaydı değişmez.</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              <Field testId="scenario-stop-add-lat" label="Yeni durak enlem" value={stopDraft.lat} onChange={(value) => setStopDraft((previous) => ({ ...previous, lat: value }))} />
              <Field testId="scenario-stop-add-lng" label="Yeni durak boylam" value={stopDraft.lng} onChange={(value) => setStopDraft((previous) => ({ ...previous, lng: value }))} />
              <Field testId="scenario-stop-index" label="Durak sıra no" value={stopDraft.index} onChange={(value) => setStopDraft((previous) => ({ ...previous, index: value }))} />
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button data-testid="scenario-stop-add" type="button" className="btn" onClick={addScenarioStop}>Senaryoya durak ekle</button>
              <button data-testid="scenario-stop-remove" type="button" className="btn" onClick={removeScenarioStop}>Senaryodan durak çıkar</button>
              <span className="panelMeta" style={{ alignSelf: "center" }}>{stopOperations.length ? `${stopOperations.length} önizleme durak işlemi hazır` : "Durak işlemi yok"}</span>
            </div>
          </div>
          <div className="card" data-testid="scenario-dispatch-seam" style={{ marginTop: 12, padding: 12 }}>
            <div className="panelSectionTitle">Atama alternatifi (sınır)</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Araç/sürücü önerisi oluşturulmaz ve canlı atama yapılmaz; yalnızca ilerideki atama akışına aktarılabilecek sınırlı bir önizleme hazırlanır.</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <Field testId="scenario-dispatch-vehicle" label="Araç referansı" type="text" value={dispatchDraft.vehicleId} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, vehicleId: value }))} />
              <Field testId="scenario-dispatch-driver" label="Sürücü referansı" type="text" value={dispatchDraft.driverId} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, driverId: value }))} />
              <Field testId="scenario-dispatch-route" label="Rota referansı" type="text" value={dispatchDraft.routeReference} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, routeReference: value }))} />
            </div>
          </div>
        </details>
        </details>
      )}

      <div className="card" data-testid="scenario-current-scenario-delta" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">{scope === "COMPANY" ? "Mevcut plan ve senaryo karşılaştırması" : "Mevcut → Senaryo → Delta"}</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Mevcut plan ile geçici senaryo girdisi yan yana tutulur; fark yalnız kullanıcı değişikliği varsa görünür.</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {primaryFields.map((field) => {
            const current = baselineValues[field.key];
            const next = scenarioValues[field.key];
            const changed = displayValue(current) !== displayValue(next);
            const render = (value) => field.type === "select" ? (field.options.find(([key]) => key === value)?.[1] || "Belirtilmedi") : formatNumber(value, field.unit === "DISTANCE_KM" ? " km" : field.unit === "DURATION_MIN" ? " dk" : "");
            return <div key={field.key} className="muted" style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(110px,1fr) minmax(110px,1fr)", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{field.label}</span><span><b>Mevcut:</b> {render(current)}</span><span><b>Senaryo:</b> {render(next)} {changed ? <em style={{ color: "#f7b267" }}>· değişti</em> : <span className="panelMeta">· {scope === "COMPANY" ? "fark yok" : "delta yok"}</span>}</span></div>;
          })}
        </div>
      </div>

      <details className="card" data-testid="scenario-readonly-example" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Nasıl çalışır? Örnek senaryo</summary>
        <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.55 }}><b>ÖRNEK · Gerçek operasyon veriniz değildir.</b> {roleConfig.example} Örnek anlatım mevcut planınıza yazılmaz, kalıcılaştırılmaz ve gerçek piyasa değeri gibi sunulmaz.</div>
      </details>

      <details className="card" data-testid="scenario-ab-comparison" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Mevcut / Senaryo A / Senaryo B</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>A/B taslakları yalnız bu ekranda geçicidir. Aynı karşılaştırma hizmeti iki kez çağrılır; hiçbir senaryo kaydedilmez.</div>
        <div style={{ marginTop: 12 }}><InputGrid values={scenarioBValues} setValues={setScenarioBValues} prefix="scenario-b" fields={primaryFields} /></div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button data-testid="scenario-copy-to-b" type="button" className="btn" onClick={() => setScenarioBValues({ ...scenarioValues })}>Senaryo A’yı B’ye kopyala</button>
          <button data-testid="scenario-ab-compare" type="button" className="btn primary" onClick={compareAB} disabled={abCalculating || calculating || !baseline}>{abCalculating ? "A/B karşılaştırılıyor..." : "Senaryoları karşılaştır"}</button>
        </div>
        {abResult ? <div data-testid="scenario-ab-result" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[['Mevcut', abResult.a?.baseline], ['Senaryo A', abResult.a?.scenario], ['Senaryo B', abResult.b?.scenario]].map(([label, item]) => <Metric key={label} title={label} value={formatMoney(item?.costMinor, currencyCode)} note={readableCostText(item?.costBasis, "Aynı karşılaştırma hizmeti")} />)}
        </div> : null}
      </details>

      {result ? (
        <>
          {partialCost ? (
            <div className="card" data-testid="scenario-partial-cost" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.42)", background: "rgba(18,183,106,0.06)" }}>
              <div className="panelSectionTitle">Brüt maliyet kullanılabilir; doğrulama sınırı var</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 850 }}>Kullanılabilir brüt maliyet: {formatMoney(partialCost.estimatedCostMinor, result.currencyCode || currencyCode)}</div>
              <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>Dahil: {humanizeUserFacingText(partialCost.included, "Hesaplanabilen maliyet kanıtları").replace("ledger'ı", "gider defteri")} Dahil değil: {(partialCost.excluded || []).join(", ") || "Belirtilmemiş maliyet bileşeni yok"}.</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>{humanizeUserFacingText(partialCost.warning, "Bu sonuç yalnızca önizlemedir.")}</div>
            </div>
          ) : null}
          {result.scenarioVariants ? (
            <div className="card" data-testid="scenario-variant-comparison" style={{ marginTop: 12 }}>
              <div className="panelSectionTitle">Beklenen / En uygun / Riskli durum</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Üç görünüm de aynı hesaplama ve rota kanıtını kullanır; açıkça verilmeyen risk olasılığı veya tasarruf uydurulmaz.</div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <VariantCard variant={result.scenarioVariants.EXPECTED} currencyCode={result.currencyCode || currencyCode} />
                <VariantCard variant={result.scenarioVariants.BEST} currencyCode={result.currencyCode || currencyCode} />
                <VariantCard variant={result.scenarioVariants.RISK} currencyCode={result.currencyCode || currencyCode} />
              </div>
            </div>
          ) : null}

          <EconomicScopeCard scope={scope} quoteFloor={quoteFloor} roomProfitability={roomProfitability} result={result} currencyCode={result.currencyCode || currencyCode} commercialOffer={commercialOffer} />

          <div className="card" data-testid="scenario-far-opportunity" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.04)" }}>
            <div className="panelSectionTitle">Fark / fırsat</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{humanizeUserFacingText(result.summaryText, statusLabel(resultStatus))}</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Mevcut plan maliyeti" value={formatMoney(result.baseline?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.baseline?.costBasis, "İç maliyet modeli")} />
              <Metric title="Alternatif maliyet" value={formatMoney(result.scenario?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.scenario?.costBasis, "İç maliyet modeli")} />
              <Metric title="Tahmini tasarruf" value={formatMoney(result.savingsMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.savingsMinor != null ? "good" : "default"} />
              <Metric title="Tahmini ek maliyet" value={formatMoney(result.additionalCostMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.additionalCostMinor != null ? "danger" : "default"} />
              <Metric title="Maliyet farkı" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaPercentBps != null ? `Değişim: %${(Number(result.costDeltaPercentBps) / 100).toLocaleString("tr-TR")}` : "Karşılaştırma yapılamadı"} tone={deltaTone} />
              <Metric title="Kaçınılabilir / artımsal fark" value={formatMoney(incrementalCost?.avoidableDeltaMinor, result.currencyCode || currencyCode)} note={periodScope?.status !== "COMPLETE" ? "Dönem kapsamı doğrulanmadı" : humanizeUserFacingText(incrementalCost?.reason, "Ayrı kanıt bekleniyor")} tone={incrementalCost?.avoidableDeltaMinor != null ? deltaTone : "warm"} />
              <Metric title="Veri güveni" value={confidenceLabel(confidence.level)} note={humanizeUserFacingText(confidence.reason, "Güven açıklaması bekleniyor")} tone={confidenceTone(confidence.level)} />
            </div>
          </div>

          <div className="card" data-testid="scenario-effect-summary" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Etkiler: Finansal · Operasyonel · Risk</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>Sonuçlar karar desteği içindir; önizleme dışında canlı bütçe, vardiya, rota, atama veya teklif değişikliği yapmaz.</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Finansal Etki" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaMinor === null ? "Karşılaştırılabilir maliyet kanıtı eksik" : "Mevcut plan → senaryo maliyet farkı"} tone={deltaTone} />
              <Metric title="Operasyonel Etki" value={result.changedDimensions?.length ? `${result.changedDimensions.length} boyut` : "Değişiklik yok"} note={(result.changedDimensions || []).map((key) => ({ passengerCount: roleConfig.passengerLabel, vehicleCount: "Araç sayısı", vehicleType: "Araç tipi", vehicleCapacity: "Araç kapasitesi", serviceDistanceKm: "Rota mesafesi", totalDistanceKm: "Toplam mesafe", routeDurationMinutes: "Rota süresi", serviceDayCount: "Hizmet günü" }[key] || readableCostText(key))).join(", ") || "Mevcut plan korunuyor"} />
              <Metric title="Risk" value={readableCostText(result.operationalRisk?.riskState, "Açıklanmadı")} note={humanizeUserFacingText(result.operationalRisk?.reasons?.join("; "), "Açık risk kanıtı yok")} tone={result.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
            </div>
          </div>

          {result.fuelComparison ? (
            <div className="card" data-testid="scenario-fuel-comparison" style={{ marginTop: 12 }}>
              <div className="panelSectionTitle">Yakıt karşılaştırması</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{humanizeUserFacingText(result.fuelComparison.explanation, "Yakıt hesabı kaynaklarına göre ayrıştırıldı.")}</div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <Metric title="Gerçekleşen yakıt" value={formatMoney(result.fuelComparison.actualLedgerMinor, result.currencyCode || currencyCode)} note="Kayıtlı gerçek gider; senaryoda yeniden sayılmaz" />
                <Metric title="Mevcut plan tahmini yakıtı" value={formatEvidenceMoney(result.fuelComparison.estimatedBaselineMinor, result.fuelComparison.baselineEstimateIncluded, result.currencyCode || currencyCode)} note="KM × tüketim × birim fiyat" />
                <Metric title="Senaryo tahmini yakıtı" value={formatEvidenceMoney(result.fuelComparison.scenarioEstimateMinor, result.fuelComparison.scenarioEstimateIncluded, result.currencyCode || currencyCode)} note="Açık senaryo değerleriyle önizleme" />
              </div>
            </div>
          ) : null}

          <div className="card" data-testid="scenario-forecast-evidence" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Dönem ve operasyon kanıtı</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Dönem sonu öngörüsü, bütçe sapması ve planlanan-gerçekleşen karşılaştırması yalnız dönem, gerçekleşen ve plan kanıtı varsa hesaplanır.</div>
            <div style={{ marginTop: 10 }}>
              <ComparisonStatus title="Dönem sonu öngörüsü" item={result.forecast} />
              <ComparisonStatus title="Gerçek gider dönem kapsamı" item={{ status: periodScope?.status === "COMPLETE" ? "Karşılaştırılabilir" : "Tamamlanmalı" }} />
              <ComparisonStatus title="Bütçe sapması" item={result.budgetVariance} money currencyCode={result.currencyCode || currencyCode} />
              <ComparisonStatus title="Planlanan / gerçekleşen" item={result.plannedVsActual} />
              <ComparisonStatus title="Gecikme etkisi" item={{ status: result.timingComparison?.status === "COMPARED" ? `${formatNumber(result.timingComparison?.delayImpactMinutes, " dk")}` : "INSUFFICIENT_DATA" }} />
              <ComparisonStatus title="Operasyonel risk" item={{ status: result.operationalRisk?.riskState || "UNKNOWN" }} />
              <ComparisonStatus title="Rota alternatifi" item={result.routeAlternative} />
              <ComparisonStatus title="Atama sınırı" item={result.dispatchAlternative} />
            </div>
            {result.forecast?.equation ? <div className="panelMeta" style={{ marginTop: 10 }}>Hesaplama açıklaması: Dönem sonu öngörüsü, gerçekleşen tutar ile kalan öngörünün toplamından hesaplanır. · {forecastProvenanceLabel(result.forecast.provenance)}</div> : null}
            {periodScope?.status !== "COMPLETE" ? <div data-testid="scenario-period-scope-warning" className="panelMeta" style={{ marginTop: 10 }}>Bu görünümde farklı dönemlere ait veya dönemi belirtilmemiş gerçekleşmiş giderler var. Dağıtılmış toplam farkı ve kaçınılabilir tasarruf kesinleştirilmedi.</div> : null}
          </div>

          <div className="card" data-testid="scenario-dimension-comparison" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Senaryo karşılaştırması</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {Object.entries(result.dimensions || {}).map(([key, value]) => {
                const labels = { vehicleCount: "Araç sayısı", vehicleType: "Araç tipi", vehicleCapacity: "Araç kapasitesi", passengerCount: "Yolcu sayısı", stopCount: "Durak sayısı", serviceDistanceKm: "Mesafe", totalDistanceKm: "Toplam mesafe", routeDurationMinutes: "Rota süresi", serviceDayCount: "Hizmet günü" };
                const suffix = key.includes("Distance") ? " km" : key === "routeDurationMinutes" ? " dk" : "";
                return <div key={key} className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{labels[key] || key}</span><b>{formatNumber(value?.baseline, suffix)} → {formatNumber(value?.scenario, suffix)}</b></div>;
              })}
            </div>
          </div>

          <details className="card" data-testid="scenario-proof-details" style={{ marginTop: 12 }}>
            <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Kanıt / detaylar</summary>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div className="muted"><b>Değişen alanlar:</b> {(result.changedDimensions || []).map((key) => ({ vehicleCount: "araç sayısı", vehicleType: "araç tipi", vehicleCapacity: "kapasite", passengerCount: "yolcu sayısı", stopCount: "durak sayısı", serviceDistanceKm: "mesafe", totalDistanceKm: "toplam mesafe", routeDurationMinutes: "rota süresi", serviceDayCount: "hizmet günü" }[key] || key)).join(", ") || "Yok"}</div>
              {result.componentBreakdown?.length ? result.componentBreakdown.map((item) => <div key={item.key} className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>{item.label}</span><b>{formatMoney(item.baselineMinor, result.currencyCode)} → {formatMoney(item.scenarioMinor, result.currencyCode)}</b></div>) : <div className="muted">Maliyet bileşeni kanıtı bekleniyor.</div>}
              {result.evidence?.length ? <details><summary className="muted" style={{ cursor: "pointer" }}>Hesaplama kanıtını aç</summary><div className="panelMeta" style={{ marginTop: 8, display: "grid", gap: 5 }}>{result.evidence.map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}</div></details> : null}
            </div>
          </details>

          <details className="card" data-testid="scenario-warnings-details" style={{ marginTop: 12 }}>
            <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Eksik Veri / Uyarılar</summary>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {criticalMissing.length ? <div data-testid="scenario-critical-missing"><div className="panelMeta">Kritik eksik veri</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{criticalMissing.map((item) => <span className="pill" key={item}>{humanizeUserFacingText(item)}</span>)}</div></div> : null}
              {optionalMissing.length ? <div data-testid="scenario-optional-missing"><div className="panelMeta">Opsiyonel / eksik maliyet bileşenleri</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{optionalMissing.map((item) => <span className="pill" key={item.key}>{humanizeUserFacingText(item.label)} eksik</span>)}</div></div> : null}
              {!criticalMissing.length && !optionalMissing.length && result.missingData?.length ? <div><div className="panelMeta">Eksik veri</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{result.missingData.map((item) => <span className="pill" key={item}>{humanizeUserFacingText(item)}</span>)}</div></div> : null}
              {result.warnings?.length ? <div><div className="panelMeta">Uyarılar</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{result.warnings.map((item) => <span className="pill" key={item}>{humanizeUserFacingText(item)}</span>)}</div></div> : null}
              {!result.missingData?.length && !result.warnings?.length ? <div className="muted">Ek uyarı yok.</div> : null}
            </div>
          </details>
        </>
      ) : null}

      <div className="card" style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.025)" }}>
        <div className="panelSectionTitle">Sadece önizleme</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Canlı vardiya, sözleşme, rota, araç / sürücü ataması, bütçe, hakediş, fatura veya ödeme değiştirilmez. Senaryo kaydı oluşturulmaz; aynı girdiler aynı sonuç kimliğini üretir.</div>
      </div>
    </div>
  );

  if (embedded) return <section className={`cost-scenario-workspace-shell ${scope === "ROOM" ? "cost-scenario-workspace-shell--room" : ""}`} style={{ marginTop: 12, minWidth: 0, width: "100%" }}>{content}</section>;
  return <PanelChrome title={title} subtitle={subtitle}>{content}</PanelChrome>;
}
