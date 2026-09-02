import { useEffect, useMemo, useState } from "react";
import { getApiErrorInfo } from "../../utils/apiContract";
import { getExternalCostReferenceLayers } from "../../api";
import {
  externalReferenceConfidenceLabel,
  externalReferenceConfidenceTone,
  externalReferenceFallbackLabel,
  externalReferenceFreshnessLabel,
  externalReferenceFreshnessTone,
  externalReferenceValueLabel,
} from "./financialOperationsPresentation";
import { humanizeUserFacingText } from "../../utils/terminology";

const TONE_STYLES = Object.freeze({
  good: { border: "1px solid rgba(18,183,106,0.35)", background: "rgba(18,183,106,0.04)" },
  warm: { border: "1px solid rgba(247,144,9,0.35)", background: "rgba(247,144,9,0.05)" },
  danger: { border: "1px solid rgba(240,68,56,0.35)", background: "rgba(240,68,56,0.04)" },
});

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Tarih bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return "-";
  return `${new Intl.NumberFormat("tr-TR").format(number / 100)} ${currencyCode === "TRY" ? "₺" : currencyCode}`;
}

function formatBand(band, currencyCode = "TRY") {
  if (!band || band.minMinor == null || band.maxMinor == null) return "-";
  return `${formatMoneyMinor(band.minMinor, currencyCode)} – ${formatMoneyMinor(band.maxMinor, currencyCode)}`;
}

function toneStyle(tone) {
  return TONE_STYLES[tone] || TONE_STYLES.warm;
}

function referenceStateLabel(value, fallback = "Belirtilmedi") {
  const key = String(value ?? "").trim().toUpperCase();
  const labels = {
    PARTIAL: "Kısmi kanıt",
    UNAVAILABLE: "Mevcut değil",
    AVAILABLE: "Mevcut",
    MISSING: "Eksik bilgi",
    INSUFFICIENT_SAMPLE: "Yeterli örnek yok",
    NOT_AVAILABLE: "Mevcut değil",
  };
  return labels[key] || humanizeUserFacingText(value, fallback);
}

function layerLabel(layer) {
  if (layer?.label) return layer.label;
  if (layer?.layer === "EXTERNAL_MARKET_REFERENCE") return "Dış piyasa referansı";
  if (layer?.layer === "SEFERPAKT_PLATFORM_REFERENCE") return "SeferPakt Bölgesel Referansı";
  return "Mevcut gerçek verileriniz";
}

function LayerSummary({ layer }) {
  if (!layer) return null;
  const available = Boolean(layer.available);
  return (
    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,0.025)" }}>
      <div style={{ fontWeight: 800 }}>{layerLabel(layer)}</div>
      {available ? (
        <div className="panelMeta" style={{ marginTop: 6 }}>
          {layer.valueMinor != null ? formatMoneyMinor(layer.valueMinor, layer.currencyCode || "TRY") : layer.valueDecimal || "-"}
          {layer.unit === "CURRENCY_PER_L" ? "/L" : ""}
          {layer.range ? ` · Aralık: ${formatBand(layer.range, layer.currencyCode || "TRY")}` : ""}
        </div>
      ) : (
        <div className="panelMeta" style={{ marginTop: 6 }}>{humanizeUserFacingText(layer.selectionReason, "Bu katman için kullanılabilir veri yok.")}</div>
      )}
      <div className="panelMeta" style={{ marginTop: 6 }}>
        Kapsam: {layer.regionName || layer.regionCode || "Türkiye / kapsam belirtilmedi"}
        {layer.sampleCount != null ? ` · Örnek: ${layer.sampleCount}/${layer.minimumRequiredSampleCount}` : ""}
      </div>
      {layer.layer === "EXTERNAL_MARKET_REFERENCE" ? (
        <div className="panelMeta" style={{ marginTop: 6, display: "grid", gap: 4 }}>
          <span>Kaynak türü: Resmî veri sağlayıcısı</span>
          <span>Kaynak: {humanizeUserFacingText(layer.sourceName, "Kaynak belirtilmemiş")}</span>
          <span>Tarih: {formatDate(layer.asOf)}</span>
          <span>Güncellik: {externalReferenceFreshnessLabel(layer.freshness || "UNKNOWN")}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function ExternalReferenceCard({ token, canView, refreshTick = 0, scope = "ROOM", preview = null }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const snapshot = preview?.snapshot || {};
  const regionName = snapshot.regionName || preview?.regionName || null;
  const scopeKey = String(scope || "ROOM").toUpperCase();
  const query = useMemo(() => ({
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    currencyCode: "TRY",
    scope: scopeKey,
    regionName: regionName || undefined,
    regionCode: snapshot.regionCode || undefined,
    operationalCostMinor: scopeKey === "ROOM"
      ? preview?.quoteFloor?.baselineOperationalCostMinor
      : preview?.companyServiceCost?.companyVisibleServiceSpendMinor,
    quoteFloorMinor: scopeKey === "ROOM" ? preview?.quoteFloor?.quoteFloorMinor : undefined,
    actualValueMinor: scopeKey === "COMPANY" && preview?.companyServiceCost?.serviceCostSource === "actual_service_spend"
      ? preview?.companyServiceCost?.companyVisibleServiceSpendMinor
      : undefined,
    refresh: "true",
  }), [preview, regionName, scopeKey, snapshot.regionCode]);

  useEffect(() => {
    if (!token || !canView) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getExternalCostReferenceLayers(token, query, { signal: controller.signal, force: true });
        if (!controller.signal.aborted) setPayload(result || null);
      } catch (requestError) {
        if (requestError?.name === "AbortError" || controller.signal.aborted) return;
        const info = getApiErrorInfo(requestError, "Piyasa referansı okunamadı.");
        setError(info.message || "Piyasa referansı okunamadı.");
        setPayload(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canView, query, refreshTick, token]);

  const legacyReference = payload?.marketReference || null;
  const external = payload?.layers?.find((layer) => layer.layer === "EXTERNAL_MARKET_REFERENCE")
    || (legacyReference ? {
      ...legacyReference,
      layer: "EXTERNAL_MARKET_REFERENCE",
      label: "Dış Piyasa Referansı",
      available: legacyReference.valueMinor != null || Boolean(legacyReference.valueDecimal),
      regionCode: legacyReference.regionCode || null,
      regionName: legacyReference.regionName || null,
      sourceName: legacyReference.sourceName || legacyReference.providerKey || null,
    } : null);
  const platform = payload?.layers?.find((layer) => layer.layer === "SEFERPAKT_PLATFORM_REFERENCE") || null;
  const actual = payload?.layers?.find((layer) => layer.layer === "USER_COMPANY_ROOM_ACTUAL") || null;
  const guidance = payload?.pricingGuidance || null;
  const freshness = String(external?.freshness || payload?.freshness || "UNKNOWN").toUpperCase();
  const confidence = String(external?.confidence || payload?.confidence || "UNKNOWN").toUpperCase();
  const isAvailable = Boolean(external?.available && (external.valueMinor != null || external.valueDecimal));
  const hasReferenceEvidence = Boolean(isAvailable || platform?.available || actual?.available);
  const referenceReadiness = hasReferenceEvidence ? "PARTIAL" : "UNAVAILABLE";
  const resolvedRegionName = external?.regionName || platform?.regionName || actual?.regionName || regionName || null;
  const freshnessTone = externalReferenceFreshnessTone(freshness);
  const confidenceTone = externalReferenceConfidenceTone(confidence);
  const visualTone = freshnessTone === "danger" || confidenceTone === "danger"
    ? "danger"
    : freshnessTone === "good" && confidenceTone === "good" ? "good" : "warm";

  if (loading) {
    return (
      <div className="card" data-testid="external-reference-card" data-testid-layers="loading" style={{ marginTop: 12, ...toneStyle("warm") }}>
        <div className="panelSectionTitle">Piyasa referansı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Operasyon kapsamına uygun piyasa referansı yükleniyor.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" data-testid="external-reference-card" data-reference-state="error" style={{ marginTop: 12, ...toneStyle("warm") }}>
        <div className="panelSectionTitle">Piyasa referansı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Piyasa referansı şu anda okunamadı.</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Gerçek maliyet ve sözleşme verileri kullanılmaya devam eder.</div>
      </div>
    );
  }

  const referenceValue = external?.valueMinor != null
    ? formatMoneyMinor(external.valueMinor, external.currencyCode || "TRY") + (external.unit === "CURRENCY_PER_L" ? "/L" : "")
    : external?.valueDecimal ? externalReferenceValueLabel(external.valueDecimal, external.unit, external.currencyCode) : "-";

  return (
    <div className="card" data-testid="external-reference-card" data-testid-layers="reference-layers" data-reference-state={isAvailable ? "available" : "no-data"} data-reference-completeness={referenceReadiness} style={{ marginTop: 12, ...toneStyle(visualTone) }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{hasReferenceEvidence ? "Piyasa referansı kısmen hazır" : "Piyasa referansı"}</div>
          <div data-testid="external-reference-value" className="panelStatValue" style={{ marginTop: 8 }}>
          {isAvailable ? referenceValue : <span data-testid="external-reference-no-data">Piyasa referansı henüz mevcut değil.</span>}
          </div>
          {guidance?.costBased ? <div className="panelMeta" style={{ marginTop: 8 }}>Maliyet bazlı teklif rehberi: {formatBand(guidance.costBased, guidance.costBased.currencyCode || "TRY")}</div> : null}
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span className="pill" data-reference-freshness={freshness}>{externalReferenceFreshnessLabel(freshness)}</span>
          <span className="pill" data-reference-confidence={confidence}>{externalReferenceConfidenceLabel(confidence)}</span>
        </div>
      </div>
      {isAvailable ? (
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
           Kaynak: {humanizeUserFacingText(external.sourceName, "Kaynak belirtilmemiş")} · Kapsam: {resolvedRegionName || external.regionCode || "Türkiye / kapsam belirtilmedi"}
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
          Operasyon bölgesi: {resolvedRegionName || "Türkiye / kapsam belirtilmedi"}. Bölgeye uygun resmi veri bulunduğunda burada gösterilir; İstanbul’a sessiz fallback yapılmaz.
        </div>
      )}
      <div data-testid="external-reference-completeness" className="card" style={{ marginTop: 10, padding: 10, background: "rgba(255,255,255,0.02)" }}>
        <div className="panelMeta" style={{ display: "grid", gap: 4 }}>
          <span>Kanıt kapsamı: {referenceStateLabel(referenceReadiness)}</span>
          <span>Yakıt verisi: {referenceStateLabel(isAvailable ? "AVAILABLE" : "MISSING")}</span>
          <span>Sürücü maliyeti: Mevcut değil</span>
          <span>Bakım maliyeti: Mevcut değil</span>
          <span>Platform gözlemi: {referenceStateLabel(platform?.available ? "AVAILABLE" : "INSUFFICIENT_SAMPLE")}</span>
          <span>Gerçek maliyet: {referenceStateLabel(actual?.available ? "AVAILABLE" : "NOT_AVAILABLE")}</span>
        </div>
      </div>
      {guidance?.observedRegional?.available ? (
        <div className="panelMeta" style={{ marginTop: 8 }}>Bölgesel gözlenen teklif bandı: {formatBand(guidance.observedRegional, guidance.observedRegional.currencyCode || "TRY")}</div>
      ) : scopeKey === "ROOM" ? (
        <div className="panelMeta" style={{ marginTop: 8 }}>Bölgesel gözlenen teklif bandı için henüz yeterli anonim gözlem yok.</div>
      ) : null}
      <div className="panelMeta" style={{ marginTop: 6 }}>Bu bilgi gerçek maliyetinizin veya sözleşme tutarınızın yerine geçmez. Bu değer gerçek maliyetiniz değildir; iç maliyet ve sözleşme verileri önceliklidir.</div>
      <div className="panelMeta" style={{ marginTop: 6 }}>Yalnızca salt okunur önizleme desteğidir; otomatik işlem başlatmaz.</div>
      {externalReferenceFallbackLabel(external?.fallbackState) ? <div className="panelMeta" style={{ marginTop: 6 }}>{externalReferenceFallbackLabel(external.fallbackState)}.</div> : null}
      <details data-testid="external-reference-details" style={{ marginTop: 10 }}>
        <summary className="muted" style={{ cursor: "pointer" }}>Detaylar</summary>
        <div data-testid="external-reference-layer-list" style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <LayerSummary layer={external} />
          <LayerSummary layer={platform} />
          <LayerSummary layer={actual} />
        </div>
        <div className="panelMeta" style={{ marginTop: 8, display: "grid", gap: 4 }}>
          <span>Veri tarihi: {formatDate(external?.asOf)}</span>
          <span>Güncellik: {externalReferenceFreshnessLabel(freshness)}</span>
          <span>Güven seviyesi: {externalReferenceConfidenceLabel(confidence)}</span>
          {guidance?.conflict ? <span>Uyarı: maliyet tabanı ile gözlenen bant arasında kapsam çatışması var.</span> : null}
          <span>Hesaplama ve teklif aksiyonları önizlemedir; otomatik gönderme/kabul yoktur.</span>
        </div>
      </details>
    </div>
  );
}
