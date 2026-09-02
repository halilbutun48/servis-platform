import { useEffect, useMemo, useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import { getCostScenarioBaseline, getExternalCostReferenceLayers, postCostScenarioPreview } from "../../api";
import { humanizeUserFacingText } from "../../utils/terminology";
import { getApiErrorInfo } from "../../utils/apiContract";
import { useSession } from "../../state/session";

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
  { key: "fuelUnitPriceMinor", label: "Yakıt birim fiyatı (kuruş/L)", type: "number", placeholder: "Sistem referansından alınır", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "driverBasePerShiftMinor", label: "Sürücü sefer maliyeti (kuruş/sefer)", type: "number", placeholder: "İsteğe bağlı gerçek değer", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "maintenancePerKmMinor", label: "Bakım km maliyeti (kuruş/km)", type: "number", placeholder: "İsteğe bağlı gerçek değer", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
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

function formatMoney(value, currencyCode = "TRY") {
  if (value === null || value === undefined || value === "") return "Hesaplanamadı";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Hesaplanamadı";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(numeric / 100)}${suffix}`;
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
  const labels = {
    HIGH: "Yüksek",
    MEDIUM: "Orta",
    LOW: "Düşük",
    INSUFFICIENT: "Yetersiz kanıt",
    UNKNOWN: "Belirsiz",
    INSUFFICIENT_DATA: "Yetersiz veri",
    NOT_AVAILABLE: "Mevcut değil",
    MISSING: "Eksik bilgi",
    MISSING_INFO: "Eksik bilgi",
    USER_ACTUAL: "Kullanıcının gerçek değeri",
    PLATFORM_OBSERVED_REFERENCE: "Platform gözlem referansı",
    TECHNICAL_CLASS_REFERENCE: "Araç sınıfı referansı",
    NO_DATA: "Veri yok",
    INTERNAL_PLANNED_COST_ANCHOR: "Planlanan maliyet dayanağı",
    OPERATIONAL_COST_MODEL: "Operasyon maliyet hesabı",
    COMPARED: "Karşılaştırıldı",
    NOT_COMPARED: "Karşılaştırılamadı",
    NONE: "Yok",
  };
  return labels[raw.toUpperCase()] || humanizeUserFacingText(raw, fallback);
}

function forecastProvenanceLabel(value) {
  const labels = {
    "#3_NO_COMPARABLE_INTERNAL_ACTUAL": "Karşılaştırılabilir gerçek maliyet kanıtı yok",
    "#3_HAKEDIS_INTERNAL_ACTUAL": "Mevcut gerçek maliyet kanıtı",
  };
  return labels[String(value || "")] || readableCostText(String(value || "Kanıt kaynağı belirtilmedi").replaceAll("INTERNAL_ACTUAL", "mevcut gerçek maliyet"));
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
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <Metric title="Tahmini maliyet" value={formatMoney(variant.estimatedCost, currencyCode)} note="Önizleme sonucu" tone={tone} />
        <Metric title="Araç ihtiyacı" value={formatNumber(variant.vehicleRequirement, " araç")} note={variant.capacity?.status === "INVALID" ? "Kapasite engeli" : "Kapasite kontrolü"} tone={variant.capacity?.status === "INVALID" ? "danger" : "default"} />
        <Metric title="Mesafe" value={formatNumber(variant.distance, " km")} note="Mevcut rota ölçümü" />
        <Metric title="Süre" value={formatNumber(variant.duration, " dk")} note="Trafik tahmini değildir" />
        <Metric title="Operasyon riski" value={readableCostText(variant.operationalRisk?.riskState, "Bilinmiyor")} note={humanizeUserFacingText(variant.operationalRisk?.reasons?.join("; "), "Açıklanmış risk kanıtı bekleniyor")} tone={variant.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
      </div>
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

function VehiclePlanAlternativeCard({ item, recommended, currencyCode, onSelect }) {
  const selectedConsumption = item.fuelConsumptionReference;
  const missingOptional = (item.missingOptionalCosts || []).map((cost) => humanizeUserFacingText(cost.label)).join(", ");
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
          <span className="pill">{vehiclePlanStatusLabel(item.status)}</span>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <Metric title="Araç planı" value={formatNumber(item.requiredVehicleCount, " araç")} note="Kapasiteye göre otomatik" />
        <Metric title="Kapasite" value={formatNumber(item.capacity, " kişi/araç")} note={humanizeUserFacingText(item.capacityResolution?.selected?.sourceName, "Kaynak belirtilmedi")} />
        <Metric title="Sürücü ihtiyacı" value={formatNumber(item.driverCount, " sürücü")} note="Eşzamanlı araç başına 1 sürücü" />
        <Metric title="Tüketim" value={selectedConsumption?.valueLitersPer100Km != null ? formatNumber(selectedConsumption.valueLitersPer100Km, " L/100 km") : "Veri yok"} note={humanizeUserFacingText(selectedConsumption?.sourceName, "Onaylı sınıf referansı yok")} />
        <Metric title="Toplam yakıt" value={item.fuelRequirementLiters != null ? formatNumber(item.fuelRequirementLiters, " L") : "Hesaplanamadı"} note="Rota × tüketim × araç planı" />
        <Metric title="Tahmini maliyet" value={formatMoney(item.costMinor, currencyCode)} note={readableCostText(item.costBasis, "Maliyet kanıtı bekleniyor")} tone={item.status === "READY" ? "good" : "warm"} />
      </div>
      <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>
        Kapasite kaynağı: {humanizeUserFacingText(item.capacityResolution?.selected?.sourceName, "Onaylı referans yok")} · Güven: {confidenceLabel(item.confidence?.level)}
      </div>
      {missingOptional ? <div className="panelMeta" style={{ marginTop: 6 }}>Eksik isteğe bağlı maliyet: {missingOptional}</div> : null}
      {item.partialExplanation ? <div className="panelMeta" style={{ marginTop: 6 }}>{humanizeUserFacingText(item.partialExplanation)}</div> : null}
      <button data-testid={`scenario-select-vehicle-plan-${String(item.vehicleType || "").toLowerCase()}`} type="button" className="btn" style={{ marginTop: 12 }} onClick={() => onSelect(item)} disabled={item.status === "NO_DATA" || item.status === "BLOCKED"}>
        Bu planı karşılaştır
      </button>
    </div>
  );
}

function VehiclePlanAlternatives({ result, currencyCode, onSelect }) {
  const plan = result?.vehiclePlanAlternatives;
  if (!plan?.items?.length) return null;
  const recommendation = plan.recommendation;
  return (
    <div className="card" data-testid="scenario-vehicle-plan-alternatives" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.035)" }}>
      <div className="panelSectionTitle">Önerilen araç planı</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>Kişi sayısı, rota, kapasite ve referanslı tüketim birlikte çözülür; araç sayısını elle hesaplaman gerekmez.</div>
      {recommendation ? <div data-testid="scenario-vehicle-plan-recommendation" className="panelMeta" style={{ marginTop: 10, lineHeight: 1.5 }}><b>{humanizeUserFacingText(recommendation.label)}:</b> {humanizeUserFacingText(recommendation.reason)}</div> : <div className="panelMeta" style={{ marginTop: 10 }}>Karşılaştırılabilir kanıt yok; öneri uydurulmadı.</div>}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {plan.items.map((item) => <VehiclePlanAlternativeCard key={item.vehicleType} item={item} recommended={recommendation?.vehicleType === item.vehicleType} currencyCode={currencyCode} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

function ComparisonStatus({ title, item, money = false, currencyCode = "TRY" }) {
  if (!item) return null;
  const value = money ? formatMoney(item.varianceAmountMinor, currencyCode) : readableCostText(item.status, "Yetersiz veri");
  return <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{title}</span><b>{value}</b></div>;
}

function Field({ label, value, onChange, type = "number", placeholder = "", testId = "", readOnly = false }) {
  return (
    <label className="muted" style={{ minWidth: 0 }}>
      {label}
      <input
        data-testid={testId || `scenario-input-${label}`}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        value={displayValue(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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
      ) : <Field key={field.key} testId={`${prefix}-input-${field.key}`} label={field.label} value={values[field.key]} placeholder={field.placeholder} onChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))} type={field.type} readOnly={readOnly} />)}
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

function ResolvedAssumptions({ result, fuelReference, currencyCode }) {
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
        <div className="muted"><b>Araç tüketimi:</b> {consumptionReferenceLabel(selectedConsumption)} · Kaynak: {humanizeUserFacingText(selectedConsumption?.sourceName, "Belirtilmedi")} · Güven: {confidenceLabel(selectedConsumption?.confidence)}</div>
        <div className="panelMeta">Kaynak tarihi: {referenceDate(selectedConsumption?.sourceDate)} · Uygulanabilirlik: {humanizeUserFacingText(selectedConsumption?.applicabilityLimits, "Sınıf/alt tip kapsamı belirtilmedi.")}</div>
        <div className="muted"><b>Yakıt fiyatı:</b> {fuelPrice?.valueMinor != null ? formatMoney(fuelPrice.valueMinor, fuelPrice.currencyCode || currencyCode) + "/L" : "Veri yok; kullanıcıdan zorunlu giriş istenmiyor"}</div>
        <div className="panelMeta">{fuelPrice?.sourceName ? `Kaynak: ${humanizeUserFacingText(fuelPrice.sourceName)} · Kapsam: ${referenceScopeLabel(fuelPrice)} · Durum: ${referenceFallbackLabel(fuelPrice)} · Tarih: ${referenceDate(fuelPrice.asOf)} · Tazelik: ${readableCostText(fuelPrice.freshness, "Belirtilmedi")} · Güven: ${confidenceLabel(fuelPrice.confidence)}` : humanizeUserFacingText(external?.selectionReason, "Bölgesel referans bu kapsamda kullanılabilir değil.")}</div>
        {fuelPrice?.sourceMetadata?.fallbackPolicy ? <div className="panelMeta">Yedek referans politikası: aynı il güncel resmi referansı yoksa Türkiye geneli EPDK günlük bülteni kullanılır; İstanbul fiyatı olarak gösterilmez.</div> : null}
        {consumption?.missingData?.length ? <div className="panelMeta">Eksik / doğrulanması gereken: {consumption.missingData.map((item) => humanizeUserFacingText(item)).join(", ")}</div> : null}
        <div className="panelMeta">Öncelik: {(resolution?.vehicleConsumption?.precedence || ["USER_ACTUAL", "PLATFORM_OBSERVED_REFERENCE", "TECHNICAL_CLASS_REFERENCE", "NO_DATA"]).map((item) => readableCostText(item)).join(" → ")}</div>
      </div>
    </div>
  );
}

export default function CostScenarioWorkspacePanel({ scope = "COMPANY", embedded = false, regionName = null }) {
  const { token, me } = useSession();
  const [baseline, setBaseline] = useState(null);
  const [baselineValues, setBaselineValues] = useState({});
  const [scenarioValues, setScenarioValues] = useState({});
  const [scenarioBValues, setScenarioBValues] = useState({});
  const [baselineCost, setBaselineCost] = useState("");
  const [fuelReference, setFuelReference] = useState(null);
  const [riskValues, setRiskValues] = useState({ riskFuelUnitPriceMinor: "", riskDistanceKm: "", riskDurationMinutes: "" });
  const [stopOperations, setStopOperations] = useState([]);
  const [stopDraft, setStopDraft] = useState({ lat: "", lng: "", index: "" });
  const [routeAlternativeType, setRouteAlternativeType] = useState("");
  const [dispatchDraft, setDispatchDraft] = useState({ vehicleId: "", driverId: "", routeReference: "" });
  const [result, setResult] = useState(null);
  const [abResult, setAbResult] = useState(null);
  const [abCalculating, setAbCalculating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");

  const companyKind = String(me?.companyKind || "COMPANY").toUpperCase();
  const planningOnly = companyKind === "SCHOOL" || companyKind === "ORGANIZATION";
  const roleConfig = roleScenarioConfig(scope, companyKind);
  const configuredFields = roleFields(roleConfig);
  const primaryFields = configuredFields.filter((field) => field.key === "passengerCount");
  const advancedFields = configuredFields.filter((field) => ["ADVANCED_ASSUMPTION", "DERIVED_INPUT"].includes(field.classification) || ["vehicleType", "vehicleCount"].includes(field.key));
  const title = "Maliyet Senaryosu";
  const subtitle = roleConfig.subtitle;

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
    getCostScenarioBaseline(token, scope, {}, { signal: controller.signal, force: true })
      .then(async (payload) => {
        if (controller.signal.aborted) return;
        const next = unwrapPayload(payload);
        const inputs = next?.input || {};
        setBaseline(next);
        setBaselineValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioBValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
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
          const initialPreview = await postCostScenarioPreview({
            scope,
            baselineReferenceId: next.baselineReferenceId,
            baselineInput: inputs,
            scenarioOverrides: {
              ...(externalReference && inputs.fuelUnitPriceMinor == null ? { useExternalFuelPrice: true } : {}),
            },
            ...(externalReference ? { externalReference } : {}),
          }, { token });
          if (!controller.signal.aborted) setResult(unwrapPayload(initialPreview));
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
  }, [regionName, scope, token]);

  const baselineInput = useMemo(() => ({
    ...baselineValues,
    ...(compact(baselineCost) ? { baselineCostMinor: compact(baselineCost) } : {}),
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

  async function requestPreview(values, includeExtras = true) {
    const externalReference = externalReferenceRequestFromPayload(fuelReference);
    const overrides = scenarioOverridesFor(values, includeExtras);
    return postCostScenarioPreview({
        scope,
        baselineReferenceId: baseline.baselineReferenceId,
        baselineInput,
        scenarioOverrides: {
          ...overrides,
          ...(externalReference && baselineInput.fuelUnitPriceMinor == null ? { useExternalFuelPrice: true } : {}),
        },
        ...(externalReference ? { externalReference } : {}),
      }, { token });
  }

  async function calculate() {
    if (!baseline?.baselineReferenceId) return;
    setCalculating(true);
    setError("");
    try {
      const payload = await requestPreview(scenarioValues);
      setResult(payload?.data || payload || null);
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
    setError("");
    setCalculating(true);
    try {
      const payload = await requestPreview(nextValues);
      setResult(payload?.data || payload || null);
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
  const criticalMissing = (result?.missingData || []).filter((item) => !/sürücü|bakım/i.test(item));
  const optionalMissing = result?.costCoverage?.scenario?.missingOptionalCosts || [];
  const contextName = baseline?.companyName || baseline?.roomName || "Bağlı tenant";
  const visibleBaselineConfidence = baseline?.baselineConfidence || {
    level: baseline?.missingFields?.length ? "MEDIUM" : "HIGH",
    reason: baseline?.missingFields?.length ? "Eksik mevcut plan alanları nedeniyle güven sınırlı." : "Mevcut plan girdileri kullanılıyor.",
  };
  const content = (
    <div data-testid="cost-scenario-workspace">
      <div className="muted" style={{ lineHeight: 1.5 }}>{subtitle}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill">Önizleme</span>
        <span className="pill">{planningOnly ? "Planlama bağlamı" : roleConfig.audience}</span>
        {baseline?.regionName ? <span className="pill" data-testid="scenario-operation-region">Operasyon bölgesi: {baseline.regionName}</span> : null}
        {baseline ? <span className="pill" data-testid="scenario-baseline-confidence">Mevcut plan güveni: {confidenceLabel(visibleBaselineConfidence.level)}</span> : null}
        {resultStatus ? <span className="pill" data-status={statusTone(resultStatus).toUpperCase()}>{partialCost ? "Kısmi maliyet hesaplandı" : statusLabel(resultStatus)}</span> : null}
      </div>

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

      <div className="card" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.25)", background: "rgba(58,102,255,0.05)" }}>
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
          <ResolvedAssumptions result={result} fuelReference={fuelReference} currencyCode={currencyCode} />
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

      <VehiclePlanAlternatives result={result} currencyCode={result?.currencyCode || currencyCode} onSelect={selectVehiclePlan} />

      <details className="card" data-testid="scenario-advanced-assumptions" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Maliyet bileşenleri, risk, alternatif rota ve atama önizlemesi ayrıntıları varsayılan olarak kapalıdır.</div>
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <Field label="Senaryo için maliyet varsayımı (kuruş)" value={baselineCost} placeholder="İsteğe bağlı plan varsayımı" onChange={setBaselineCost} />
          <div className="panelMeta" style={{ marginTop: 8 }}>Bu yalnızca senaryo için kullanılan bir varsayımdır; mevcut planın gerçek veya planlanan maliyetini değiştirmez. Boş bırakılırsa sistem yalnızca tamamlanmış maliyet bileşenlerini kullanır.</div>
        </div>
        <details data-testid="scenario-advanced-fields" style={{ marginTop: 12 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Maliyet ve operasyon ayrıntıları</summary>
          <div style={{ marginTop: 10 }}><InputGrid values={scenarioValues} setValues={setScenarioValues} prefix="scenario" fields={advancedFields} /></div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Field testId="scenario-risk-fuel" label="Riskli yakıt varsayımı (kuruş/L)" value={riskValues.riskFuelUnitPriceMinor} onChange={(value) => setRiskValues((previous) => ({ ...previous, riskFuelUnitPriceMinor: value }))} />
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

      <div className="card" data-testid="scenario-current-scenario-delta" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Mevcut → Senaryo → Delta</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Mevcut plan ile geçici senaryo girdisi yan yana tutulur; fark yalnız kullanıcı değişikliği varsa görünür.</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {primaryFields.map((field) => {
            const current = baselineValues[field.key];
            const next = scenarioValues[field.key];
            const changed = displayValue(current) !== displayValue(next);
            const render = (value) => field.type === "select" ? (field.options.find(([key]) => key === value)?.[1] || "Belirtilmedi") : formatNumber(value, field.unit === "DISTANCE_KM" ? " km" : field.unit === "DURATION_MIN" ? " dk" : "");
            return <div key={field.key} className="muted" style={{ display: "grid", gridTemplateColumns: "minmax(120px,1fr) minmax(110px,1fr) minmax(110px,1fr)", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{field.label}</span><span><b>Mevcut:</b> {render(current)}</span><span><b>Senaryo:</b> {render(next)} {changed ? <em style={{ color: "#f7b267" }}>· değişti</em> : <span className="panelMeta">· delta yok</span>}</span></div>;
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
              <div className="panelSectionTitle">Kısmi maliyet hesaplandı</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 850 }}>Kısmi tahmini maliyet: {formatMoney(partialCost.estimatedCostMinor, result.currencyCode || currencyCode)}</div>
              <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>Dahil: {partialCost.included}. Dahil değil: {(partialCost.excluded || []).join(", ") || "Belirtilmemiş maliyet bileşeni yok"}.</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Gerçek toplam maliyet daha yüksek olabilir. Bu sonuç yalnızca önizlemedir.</div>
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

          <div className="card" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.04)" }}>
            <div className="panelSectionTitle">Fark / fırsat</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{humanizeUserFacingText(result.summaryText, statusLabel(resultStatus))}</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Mevcut plan tahmini maliyeti" value={formatMoney(result.baseline?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.baseline?.costBasis, "İç maliyet modeli")} />
              <Metric title="Alternatif tahmini maliyet" value={formatMoney(result.scenario?.costMinor, result.currencyCode || currencyCode)} note={readableCostText(result.scenario?.costBasis, "İç maliyet modeli")} />
              <Metric title="Tahmini tasarruf" value={formatMoney(result.savingsMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.savingsMinor != null ? "good" : "default"} />
              <Metric title="Tahmini ek maliyet" value={formatMoney(result.additionalCostMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.additionalCostMinor != null ? "danger" : "default"} />
              <Metric title="Maliyet farkı" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaPercentBps != null ? `Değişim: %${(Number(result.costDeltaPercentBps) / 100).toLocaleString("tr-TR")}` : "Karşılaştırma yapılamadı"} tone={deltaTone} />
              <Metric title="Veri güveni" value={confidenceLabel(confidence.level)} note={humanizeUserFacingText(confidence.reason, "Güven açıklaması bekleniyor")} tone={confidenceTone(confidence.level)} />
            </div>
          </div>

          <div className="card" data-testid="scenario-effect-summary" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Etkiler: Finansal · Operasyonel · Risk</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>Sonuçlar karar desteği içindir; önizleme dışında canlı bütçe, vardiya, rota, atama veya teklif değişikliği yapmaz.</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Finansal Etki" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaMinor === null ? "Karşılaştırılabilir maliyet kanıtı eksik" : "Mevcut plan → senaryo maliyet farkı"} tone={deltaTone} />
              <Metric title="Operasyonel Etki" value={result.changedDimensions?.length ? `${result.changedDimensions.length} boyut` : "Değişiklik yok"} note={(result.changedDimensions || []).map((key) => ({ passengerCount: roleConfig.passengerLabel, vehicleCount: "Araç sayısı", serviceDistanceKm: "Rota mesafesi", serviceDayCount: "Hizmet günü" }[key] || readableCostText(key))).join(", ") || "Mevcut plan korunuyor"} />
              <Metric title="Risk" value={readableCostText(result.operationalRisk?.riskState, "Açıklanmadı")} note={humanizeUserFacingText(result.operationalRisk?.reasons?.join("; "), "Açık risk kanıtı yok")} tone={result.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
            </div>
          </div>

          <div className="card" data-testid="scenario-forecast-evidence" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Dönem ve operasyon kanıtı</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Dönem sonu öngörüsü, bütçe sapması ve planlanan-gerçekleşen karşılaştırması yalnız dönem, gerçekleşen ve plan kanıtı varsa hesaplanır.</div>
            <div style={{ marginTop: 10 }}>
              <ComparisonStatus title="Dönem sonu öngörüsü" item={result.forecast} />
              <ComparisonStatus title="Bütçe sapması" item={result.budgetVariance} money currencyCode={result.currencyCode || currencyCode} />
              <ComparisonStatus title="Planlanan / gerçekleşen" item={result.plannedVsActual} />
              <ComparisonStatus title="Gecikme etkisi" item={{ status: result.timingComparison?.status === "COMPARED" ? `${formatNumber(result.timingComparison?.delayImpactMinutes, " dk")}` : "INSUFFICIENT_DATA" }} />
              <ComparisonStatus title="Operasyonel risk" item={{ status: result.operationalRisk?.riskState || "UNKNOWN" }} />
              <ComparisonStatus title="Rota alternatifi" item={result.routeAlternative} />
              <ComparisonStatus title="Atama sınırı" item={result.dispatchAlternative} />
            </div>
            {result.forecast?.equation ? <div className="panelMeta" style={{ marginTop: 10 }}>Hesaplama açıklaması: Dönem sonu öngörüsü, gerçekleşen tutar ile kalan öngörünün toplamından hesaplanır. · {forecastProvenanceLabel(result.forecast.provenance)}</div> : null}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Senaryo karşılaştırması</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {Object.entries(result.dimensions || {}).map(([key, value]) => {
                const labels = { vehicleCount: "Araç sayısı", vehicleType: "Araç tipi", vehicleCapacity: "Araç kapasitesi", passengerCount: "Yolcu sayısı", stopCount: "Durak sayısı", serviceDistanceKm: "Mesafe", totalDistanceKm: "Toplam mesafe", routeDurationMinutes: "Rota süresi", serviceDayCount: "Hizmet günü" };
                const suffix = key.includes("Distance") ? " km" : key === "routeDurationMinutes" ? " dk" : "";
                return <div key={key} className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{labels[key] || key}</span><b>{formatNumber(value?.baseline, suffix)} → {formatNumber(value?.scenario, suffix)}</b></div>;
              })}
            </div>
          </div>

          <details className="card" style={{ marginTop: 12 }}>
            <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Kanıt / detaylar</summary>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div className="muted"><b>Değişen alanlar:</b> {(result.changedDimensions || []).map((key) => ({ vehicleCount: "araç sayısı", vehicleType: "araç tipi", vehicleCapacity: "kapasite", passengerCount: "yolcu sayısı", stopCount: "durak sayısı", serviceDistanceKm: "mesafe", totalDistanceKm: "toplam mesafe", routeDurationMinutes: "rota süresi", serviceDayCount: "hizmet günü" }[key] || key)).join(", ") || "Yok"}</div>
              {result.componentBreakdown?.length ? result.componentBreakdown.map((item) => <div key={item.key} className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>{item.label}</span><b>{formatMoney(item.baselineMinor, result.currencyCode)} → {formatMoney(item.scenarioMinor, result.currencyCode)}</b></div>) : <div className="muted">Maliyet bileşeni kanıtı bekleniyor.</div>}
              {result.evidence?.length ? <details><summary className="muted" style={{ cursor: "pointer" }}>Hesaplama kanıtını aç</summary><div className="panelMeta" style={{ marginTop: 8, display: "grid", gap: 5 }}>{result.evidence.map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}</div></details> : null}
            </div>
          </details>

          <details className="card" style={{ marginTop: 12 }}>
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

  if (embedded) return <section style={{ marginTop: 14 }}><div className="card" style={{ padding: 14 }}><div className="panelSectionTitle">Maliyet Senaryosu</div>{content}</div></section>;
  return <PanelChrome title={title} subtitle={subtitle}>{content}</PanelChrome>;
}
