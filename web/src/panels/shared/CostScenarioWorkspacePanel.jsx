import { useEffect, useMemo, useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import { getCostScenarioBaseline, postCostScenarioPreview } from "../../api";
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
  { key: "serviceDistanceKm", label: "Mesafe / rota varsayımı (km)", type: "number", placeholder: "", unit: "DISTANCE_KM", classification: "PRIMARY_WHAT_IF_INPUT" },
  { key: "serviceDayCount", label: "Hizmet günü (gün)", type: "number", placeholder: "1", unit: "DATE/DAY_COUNT", classification: "PRIMARY_WHAT_IF_INPUT" },
  { key: "vehicleCapacity", label: "Araç kapasitesi (kişi)", type: "number", placeholder: "", unit: "PERSON_COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "stopCount", label: "Durak sayısı (durak)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "totalDistanceKm", label: "Toplam mesafe (km)", type: "number", placeholder: "", unit: "DISTANCE_KM", classification: "DERIVED_INPUT" },
  { key: "routeDurationMinutes", label: "Rota süresi (dk)", type: "number", placeholder: "", unit: "DURATION_MIN", classification: "DERIVED_INPUT" },
  { key: "shiftCount", label: "Toplam sefer (sefer)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "tripCount", label: "Toplam yolculuk (yolculuk)", type: "number", placeholder: "", unit: "COUNT", classification: "ADVANCED_ASSUMPTION" },
  { key: "shiftStartMinutes", label: "Vardiya başlangıcı (dk)", type: "number", placeholder: "", unit: "DURATION_MIN", classification: "ADVANCED_ASSUMPTION" },
  { key: "fuelConsumptionLitersPer100Km", label: "Yakıt tüketimi (L/100 km)", type: "number", placeholder: "", unit: "FUEL_CONSUMPTION", classification: "ADVANCED_ASSUMPTION" },
  { key: "fuelUnitPriceMinor", label: "Yakıt birim fiyatı (₺)", type: "number", placeholder: "", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "driverBasePerShiftMinor", label: "Sürücü sefer maliyeti (₺)", type: "number", placeholder: "", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
  { key: "maintenancePerKmMinor", label: "Bakım km maliyeti (₺)", type: "number", placeholder: "", unit: "MONEY", classification: "ADVANCED_ASSUMPTION" },
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
    example: "Örnek: mevcut taşıma planında araç veya rota varsayımı değiştirilir; sonuç yalnızca preview farkı olarak gösterilir.",
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
    example: "Örnek: katılımcı sayısı değişikliği, etkinlik/trip planı için tahmini etkiyi gösterir; şirket bütçesi açılmaz.",
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
    example: "Örnek: hizmet günü veya araç sayısı değiştirilir; sonuç mevcut bütçeyi ya da canlı operasyonu değiştirmeyen preview sinyalidir.",
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
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(numeric)}${suffix}`;
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

function forecastProvenanceLabel(value) {
  const labels = {
    "#3_NO_COMPARABLE_INTERNAL_ACTUAL": "Karşılaştırılabilir gerçek maliyet kanıtı yok",
    "#3_HAKEDIS_INTERNAL_ACTUAL": "Kanonik gerçek maliyet kanıtı",
  };
  return labels[String(value || "")] || String(value || "Kanıt kaynağı belirtilmedi").replaceAll("INTERNAL_ACTUAL", "kanonik gerçek maliyet");
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
        <Metric title="Tahmini maliyet" value={formatMoney(variant.estimatedCost, currencyCode)} note="Preview sonucu" tone={tone} />
        <Metric title="Araç ihtiyacı" value={formatNumber(variant.vehicleRequirement, " araç")} note={variant.capacity?.status === "INVALID" ? "Kapasite engeli" : "Kapasite kontrolü"} tone={variant.capacity?.status === "INVALID" ? "danger" : "default"} />
        <Metric title="Mesafe" value={formatNumber(variant.distance, " km")} note="Kanonik rota metriği" />
        <Metric title="Süre" value={formatNumber(variant.duration, " dk")} note="Trafik tahmini değildir" />
        <Metric title="Operasyon riski" value={variant.operationalRisk?.riskState || "Bilinmiyor"} note={variant.operationalRisk?.reasons?.join("; ") || "Açıklanmış risk kanıtı bekleniyor"} tone={variant.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
      </div>
      <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.45 }}>{variant.rationale}</div>
    </div>
  );
}

function ComparisonStatus({ title, item, money = false, currencyCode = "TRY" }) {
  if (!item) return null;
  const value = money ? formatMoney(item.varianceAmountMinor, currencyCode) : item.status || "INSUFFICIENT_DATA";
  return <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}><span>{title}</span><b>{value}</b></div>;
}

function Field({ label, value, onChange, type = "number", placeholder = "", testId = "" }) {
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
        style={INPUT_STYLE}
      />
    </label>
  );
}

function InputGrid({ values, setValues, prefix = "scenario", fields = FIELD_CONFIG }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {fields.map((field) => field.type === "select" ? (
        <label key={field.key} className="muted" style={{ minWidth: 0 }}>
          {field.label}
          <select data-testid={`${prefix}-input-${field.key}`} value={values[field.key] || ""} onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))} style={INPUT_STYLE}>
            {field.options.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
          </select>
        </label>
      ) : <Field key={field.key} testId={`${prefix}-input-${field.key}`} label={field.label} value={values[field.key]} placeholder={field.placeholder} onChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))} type={field.type} />)}
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
          ? `Eksik veri: ${evidence?.missingReason || "Kanonik mevcut plan alanında bulunamadı."}`
          : evidence?.classification === "DERIVABLE_FROM_CANONICAL_DATA"
            ? "Kanonik rota verisinden türetildi"
            : "Kanonik mevcut plan girdisi";
        return <Metric key={label} title={label} value={missing ? `Eksik veri: ${evidence?.label || label}` : formatNumber(value)} note={note} tone={missing ? "warm" : "default"} />;
      })}
    </div>
  );
}

export default function CostScenarioWorkspacePanel({ scope = "COMPANY", embedded = false }) {
  const { token, me } = useSession();
  const [baseline, setBaseline] = useState(null);
  const [baselineValues, setBaselineValues] = useState({});
  const [scenarioValues, setScenarioValues] = useState({});
  const [scenarioBValues, setScenarioBValues] = useState({});
  const [baselineCost, setBaselineCost] = useState("");
  const [useExternalFuelPrice, setUseExternalFuelPrice] = useState(false);
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
  const primaryFields = configuredFields.filter((field) => field.classification === "PRIMARY_WHAT_IF_INPUT");
  const advancedFields = configuredFields.filter((field) => ["ADVANCED_ASSUMPTION", "DERIVED_INPUT"].includes(field.classification));
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
      .then((payload) => {
        if (controller.signal.aborted) return;
        const next = payload?.data || payload || null;
        const inputs = next?.input || {};
        setBaseline(next);
        setBaselineValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setScenarioBValues(Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, displayValue(value)])));
        setResult(null);
        setAbResult(null);
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
  }, [scope, token]);

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
    return postCostScenarioPreview({
        scope,
        baselineReferenceId: baseline.baselineReferenceId,
        baselineInput,
        scenarioOverrides: scenarioOverridesFor(values, includeExtras),
        ...(useExternalFuelPrice ? {
          externalReference: {
            family: "FUEL_DIESEL",
            unit: "CURRENCY_PER_L",
            currencyCode: baselineInput.currencyCode || "TRY",
            scopeType: "GLOBAL",
            scopeKey: "GLOBAL",
            regionCode: "TR",
          },
        } : {}),
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

  function adjustVehicleCount(delta) {
    setScenarioValues((previous) => {
      const current = Number(previous.vehicleCount || baselineValues.vehicleCount || 0);
      return { ...previous, vehicleCount: String(Math.max(0, Math.round(current) + delta)) };
    });
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
  const contextName = baseline?.companyName || baseline?.roomName || "Bağlı tenant";
  const visibleBaselineConfidence = baseline?.baselineConfidence || {
    level: baseline?.missingFields?.length ? "MEDIUM" : "HIGH",
    reason: baseline?.missingFields?.length ? "Eksik kanonik alanlar nedeniyle güven sınırlı." : "Kanonik baseline girdileri kullanılıyor.",
  };
  const content = (
    <div data-testid="cost-scenario-workspace">
      <div className="muted" style={{ lineHeight: 1.5 }}>{subtitle}</div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill">Önizleme</span>
        <span className="pill">{planningOnly ? "Planlama bağlamı" : roleConfig.audience}</span>
        {baseline ? <span className="pill" data-testid="scenario-baseline-confidence">Baseline güveni: {confidenceLabel(visibleBaselineConfidence.level)}</span> : null}
        {resultStatus ? <span className="pill" data-status={statusTone(resultStatus).toUpperCase()}>{statusLabel(resultStatus)}</span> : null}
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
            <div className="panelMeta" style={{ marginTop: 6 }}>Bu alanlar için kanonik veri bulunmadı; değer uydurulmadı ve senaryo sonucu güveni buna göre gösterilir.</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {baseline.missingFields.map((field) => <span className="pill" key={field}>Eksik veri: {baseline.baselineSourceMap?.[field]?.label || field}</span>)}
            </div>
          </div>
        ) : null}
        <details style={{ marginTop: 12 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Kanonik plan girdilerini incele</summary>
          <div style={{ marginTop: 10 }}><InputGrid values={baselineValues} setValues={setBaselineValues} prefix="baseline" /></div>
        </details>
      </div>

      <div className="card" data-testid="scenario-primary-inputs" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.25)" }}>
        <div className="panelSectionTitle">Senaryo varsayımları</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Değiştirmek istemediğiniz alanlar mevcut plan değerlerinden otomatik alınır. Bir alan kanonik veride yoksa değer uydurulmaz; eksikliği açıkça gösterilir.</div>
        <div style={{ marginTop: 12 }}><InputGrid values={scenarioValues} setValues={setScenarioValues} prefix="scenario" fields={primaryFields} /></div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button data-testid="scenario-vehicle-add" type="button" className="btn" onClick={() => adjustVehicleCount(1)}>+ Araç ekle</button>
          <button data-testid="scenario-vehicle-remove" type="button" className="btn" onClick={() => adjustVehicleCount(-1)}>− Araç çıkar</button>
          <button data-testid="scenario-quick-passenger" type="button" className="btn" onClick={() => setScenarioValues((previous) => ({ ...previous, passengerCount: String(Math.max(0, Number(previous.passengerCount || baselineValues.passengerCount || 0) + 10)) }))}>{roleConfig.quickPassenger}</button>
          <button data-testid="scenario-quick-vehicle" type="button" className="btn" onClick={() => adjustVehicleCount(1)}>{roleConfig.quickVehicle}</button>
          <button data-testid="scenario-quick-days" type="button" className="btn" onClick={() => setScenarioValues((previous) => ({ ...previous, serviceDayCount: String(Math.max(0, Number(previous.serviceDayCount || baselineValues.serviceDayCount || 0) + 5)) }))}>{roleConfig.quickDays}</button>
          <span className="panelMeta" style={{ alignSelf: "center" }}>Hızlı seçimler yalnızca geçici preview girdisi hazırlar; canlı kayıt değişmez.</span>
        </div>
      </div>

      <details className="card" data-testid="scenario-advanced-assumptions" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Gelişmiş varsayımlar</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Maliyet bileşenleri, risk, alternatif rota ve typed dispatch seam ayrıntıları varsayılan olarak kapalıdır.</div>
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <Field label="Senaryo için maliyet varsayımı (₺)" value={baselineCost} placeholder="İsteğe bağlı plan varsayımı" onChange={setBaselineCost} />
          <div className="panelMeta" style={{ marginTop: 8 }}>Bu yalnızca senaryo için kullanılan bir varsayımdır; mevcut planın gerçek veya kanonik planlanan maliyetini değiştirmez. Boş bırakılırsa sistem yalnızca tamamlanmış maliyet bileşenlerini kullanır.</div>
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
                <option value="REVERSE_STOP_ORDER">Durak sırasını ters çevir (preview)</option>
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
              <span className="panelMeta" style={{ alignSelf: "center" }}>{stopOperations.length ? `${stopOperations.length} preview durak işlemi hazır` : "Durak işlemi yok"}</span>
            </div>
          </div>
          <div className="card" data-testid="scenario-dispatch-seam" style={{ marginTop: 12, padding: 12 }}>
            <div className="panelSectionTitle">Atama alternatifi (sınır)</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>Araç/sürücü önerisi oluşturulmaz ve canlı atama yapılmaz; yalnızca #20 için typed preview seam.</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <Field testId="scenario-dispatch-vehicle" label="Araç referansı" type="text" value={dispatchDraft.vehicleId} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, vehicleId: value }))} />
              <Field testId="scenario-dispatch-driver" label="Sürücü referansı" type="text" value={dispatchDraft.driverId} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, driverId: value }))} />
              <Field testId="scenario-dispatch-route" label="Rota referansı" type="text" value={dispatchDraft.routeReference} onChange={(value) => setDispatchDraft((previous) => ({ ...previous, routeReference: value }))} />
            </div>
          </div>
        </details>
        <label className="muted" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14 }}>
          <input type="checkbox" checked={useExternalFuelPrice} onChange={(event) => setUseExternalFuelPrice(event.target.checked)} style={{ marginTop: 3 }} />
          <span>Piyasa referansını dene <span className="panelMeta">(varsa; güncellik ve kaynak bilgisi korunur)</span></span>
        </label>
      </details>

      <div className="card" data-testid="scenario-current-scenario-delta" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Mevcut → Senaryo → Delta</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Kanonik mevcut plan ile geçici senaryo girdisi yan yana tutulur; delta yalnız kullanıcı değişikliği varsa görünür.</div>
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
        <div className="panelMeta" style={{ marginTop: 10, lineHeight: 1.55 }}><b>ÖRNEK · Gerçek operasyon veriniz değildir.</b> {roleConfig.example} Örnek anlatım kanonik planınıza yazılmaz, kalıcılaştırılmaz ve gerçek piyasa/actual değeri gibi sunulmaz.</div>
      </details>

      <details className="card" data-testid="scenario-ab-comparison" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Mevcut / Senaryo A / Senaryo B</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>A/B taslakları yalnız bu ekranda geçicidir. Aynı #4 preview endpoint’i iki kez çağrılır; hiçbir senaryo kaydedilmez.</div>
        <div style={{ marginTop: 12 }}><InputGrid values={scenarioBValues} setValues={setScenarioBValues} prefix="scenario-b" fields={primaryFields} /></div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button data-testid="scenario-copy-to-b" type="button" className="btn" onClick={() => setScenarioBValues({ ...scenarioValues })}>Senaryo A’yı B’ye kopyala</button>
          <button data-testid="scenario-ab-compare" type="button" className="btn primary" onClick={compareAB} disabled={abCalculating || calculating || !baseline}>{abCalculating ? "A/B karşılaştırılıyor..." : "Senaryoları karşılaştır"}</button>
        </div>
        {abResult ? <div data-testid="scenario-ab-result" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[['Mevcut', abResult.a?.baseline], ['Senaryo A', abResult.a?.scenario], ['Senaryo B', abResult.b?.scenario]].map(([label, item]) => <Metric key={label} title={label} value={formatMoney(item?.costMinor, currencyCode)} note={item?.costBasis === "INTERNAL_PLANNED_COST_ANCHOR" ? "Planlanan maliyet tabanı" : "Aynı #4 preview motoru"} />)}
        </div> : null}
      </details>

      {result ? (
        <>
          {result.scenarioVariants ? (
            <div className="card" data-testid="scenario-variant-comparison" style={{ marginTop: 12 }}>
              <div className="panelSectionTitle">Beklenen / En uygun / Riskli durum</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Üç görünüm de aynı #4 hesaplama ve rota kanıtını kullanır; açıkça verilmeyen risk olasılığı veya tasarruf uydurulmaz.</div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <VariantCard variant={result.scenarioVariants.EXPECTED} currencyCode={result.currencyCode || currencyCode} />
                <VariantCard variant={result.scenarioVariants.BEST} currencyCode={result.currencyCode || currencyCode} />
                <VariantCard variant={result.scenarioVariants.RISK} currencyCode={result.currencyCode || currencyCode} />
              </div>
            </div>
          ) : null}

          <div className="card" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.28)", background: "rgba(18,183,106,0.04)" }}>
            <div className="panelSectionTitle">Fark / fırsat</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 850 }}>{result.summaryText || statusLabel(resultStatus)}</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Mevcut plan tahmini maliyeti" value={formatMoney(result.baseline?.costMinor, result.currencyCode || currencyCode)} note={result.baseline?.costBasis === "INTERNAL_PLANNED_COST_ANCHOR" ? "Planlanan maliyet tabanı" : "İç maliyet modeli"} />
              <Metric title="Alternatif tahmini maliyet" value={formatMoney(result.scenario?.costMinor, result.currencyCode || currencyCode)} note={result.scenario?.costBasis === "INTERNAL_PLANNED_COST_ANCHOR" ? "Planlanan maliyet tabanı" : "İç maliyet modeli"} />
              <Metric title="Tahmini tasarruf" value={formatMoney(result.savingsMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.savingsMinor != null ? "good" : "default"} />
              <Metric title="Tahmini ek maliyet" value={formatMoney(result.additionalCostMinor, result.currencyCode || currencyCode)} note="Karar desteği sinyali" tone={result.additionalCostMinor != null ? "danger" : "default"} />
              <Metric title="Maliyet farkı" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaPercentBps != null ? `Değişim: %${(Number(result.costDeltaPercentBps) / 100).toLocaleString("tr-TR")}` : "Karşılaştırma yapılamadı"} tone={deltaTone} />
              <Metric title="Veri güveni" value={confidenceLabel(confidence.level)} note={confidence.reason || "Güven açıklaması bekleniyor"} tone={confidenceTone(confidence.level)} />
            </div>
          </div>

          <div className="card" data-testid="scenario-effect-summary" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Etkiler: Finansal · Operasyonel · Risk</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>Sonuçlar karar desteği içindir; preview dışında canlı bütçe, vardiya, rota, atama veya teklif değişikliği yapmaz.</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Metric title="Finansal Etki" value={formatMoney(result.costDeltaMinor, result.currencyCode || currencyCode)} note={result.costDeltaMinor === null ? "Karşılaştırılabilir maliyet kanıtı eksik" : "Mevcut plan → senaryo maliyet farkı"} tone={deltaTone} />
              <Metric title="Operasyonel Etki" value={result.changedDimensions?.length ? `${result.changedDimensions.length} boyut` : "Değişiklik yok"} note={(result.changedDimensions || []).map((key) => ({ passengerCount: roleConfig.passengerLabel, vehicleCount: "Araç sayısı", serviceDistanceKm: "Rota mesafesi", serviceDayCount: "Hizmet günü" }[key] || key)).join(", ") || "Mevcut plan korunuyor"} />
              <Metric title="Risk" value={result.operationalRisk?.riskState || "Açıklanmadı"} note={result.operationalRisk?.reasons?.join("; ") || "Açık risk kanıtı yok"} tone={result.operationalRisk?.riskState === "HIGH" ? "danger" : "default"} />
            </div>
          </div>

          <div className="card" data-testid="scenario-forecast-evidence" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Dönem ve operasyon kanıtı</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Forecast, bütçe sapması ve planned-vs-actual yalnız kanonik dönem/actual/plan kanıtı varsa hesaplanır.</div>
            <div style={{ marginTop: 10 }}>
              <ComparisonStatus title="Dönem sonu forecast" item={result.forecast} />
              <ComparisonStatus title="Bütçe sapması" item={result.budgetVariance} money currencyCode={result.currencyCode || currencyCode} />
              <ComparisonStatus title="Planned-vs-actual" item={result.plannedVsActual} />
              <ComparisonStatus title="Gecikme etkisi" item={{ status: result.timingComparison?.status === "COMPARED" ? `${formatNumber(result.timingComparison?.delayImpactMinutes, " dk")}` : "INSUFFICIENT_DATA" }} />
              <ComparisonStatus title="Operasyonel risk" item={{ status: result.operationalRisk?.riskState || "UNKNOWN" }} />
              <ComparisonStatus title="Rota alternatifi" item={result.routeAlternative} />
              <ComparisonStatus title="Dispatch sınırı" item={result.dispatchAlternative} />
            </div>
            {result.forecast?.equation ? <div className="panelMeta" style={{ marginTop: 10 }}>Formül: {result.forecast.equation} · {forecastProvenanceLabel(result.forecast.provenance)}</div> : null}
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
              {result.missingData?.length ? <div><div className="panelMeta">Eksik Veri</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{result.missingData.map((item) => <span className="pill" key={item}>{item}</span>)}</div></div> : null}
              {result.warnings?.length ? <div><div className="panelMeta">Uyarılar</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{result.warnings.map((item) => <span className="pill" key={item}>{item}</span>)}</div></div> : null}
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
