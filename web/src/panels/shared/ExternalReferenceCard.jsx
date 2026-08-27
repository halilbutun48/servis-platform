import { useEffect, useState } from "react";
import { getApiErrorInfo } from "../../utils/apiContract";
import { getExternalCostReference } from "../../api";
import {
  externalReferenceConfidenceLabel,
  externalReferenceConfidenceTone,
  externalReferenceFallbackLabel,
  externalReferenceFreshnessLabel,
  externalReferenceFreshnessTone,
  externalReferenceValueLabel,
} from "./financialOperationsPresentation";

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

function toneStyle(tone) {
  return TONE_STYLES[tone] || TONE_STYLES.warm;
}

export default function ExternalReferenceCard({ token, canView, refreshTick = 0 }) {
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const marketReference = reference?.marketReference || null;
  const freshness = String(marketReference?.freshness || reference?.freshness || reference?.state || "UNKNOWN").toUpperCase();
  const confidence = String(marketReference?.confidence || reference?.confidence || "UNKNOWN").toUpperCase();
  const isAvailable = Boolean(marketReference?.valueDecimal) && !["EXPIRED", "SOURCE_UNAVAILABLE"].includes(freshness);
  const title = "Piyasa referansı";

  useEffect(() => {
    if (!token || !canView) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await getExternalCostReference(token, {
          family: "FUEL_DIESEL",
          unit: "CURRENCY_PER_L",
          currencyCode: "TRY",
          scopeType: "GLOBAL",
          scopeKey: "GLOBAL",
        }, { signal: controller.signal, force: false });
        if (!controller.signal.aborted) setReference(payload || null);
      } catch (requestError) {
        if (requestError?.name === "AbortError" || controller.signal.aborted) return;
        const info = getApiErrorInfo(requestError, "Piyasa referansı okunamadı.");
        setError(info.message || "Piyasa referansı okunamadı.");
        setReference(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canView, refreshTick, token]);

  if (loading) {
    return (
      <div className="card" data-testid="external-reference-card" data-reference-state="loading" style={{ marginTop: 12, ...toneStyle("warm") }}>
        <div className="panelSectionTitle">{title}</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Piyasa referansı yükleniyor.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" data-testid="external-reference-card" data-reference-state="error" style={{ marginTop: 12, ...toneStyle("warm") }}>
        <div className="panelSectionTitle">{title}</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Piyasa referansı şu anda okunamadı.</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Gerçek maliyet ve sözleşme verileri kullanılmaya devam eder.</div>
      </div>
    );
  }

  if (!isAvailable) {
    const unavailable = freshness === "EXPIRED" || freshness === "SOURCE_UNAVAILABLE";
    return (
      <div
        className="card"
        data-testid="external-reference-card"
        data-reference-state={unavailable ? "unavailable" : "no-data"}
        style={{ marginTop: 12, ...toneStyle(unavailable ? "danger" : "warm") }}
      >
        <div className="panelSectionTitle">{title}</div>
        <div data-testid={unavailable ? "external-reference-unavailable" : "external-reference-no-data"} style={{ marginTop: 8, fontWeight: 750 }}>
          {unavailable ? "Kullanılabilir bir piyasa referansı yok." : "Piyasa referansı henüz mevcut değil."}
        </div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          Uygun kaynak ve güncel veri bulunduğunda burada gösterilir.
        </div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Bu bilgi gerçek maliyetinizin veya sözleşme tutarınızın yerine geçmez.</div>
      </div>
    );
  }

  const freshnessLabel = externalReferenceFreshnessLabel(freshness);
  const fallbackLabel = externalReferenceFallbackLabel(marketReference.fallbackState);
  const freshnessTone = externalReferenceFreshnessTone(freshness);
  const confidenceTone = externalReferenceConfidenceTone(confidence);
  const visualTone = freshnessTone === "danger" || confidenceTone === "danger"
    ? "danger"
    : freshnessTone === "good" && confidenceTone === "good" ? "good" : "warm";

  return (
    <div className="card" data-testid="external-reference-card" data-reference-state="available" style={{ marginTop: 12, ...toneStyle(visualTone) }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          <div data-testid="external-reference-value" className="panelStatValue" style={{ marginTop: 8 }}>
            {externalReferenceValueLabel(marketReference.valueDecimal, marketReference.unit, marketReference.currencyCode)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span className="pill" data-reference-freshness={freshness}>{freshnessLabel}</span>
          <span className="pill" data-reference-confidence={confidence}>{externalReferenceConfidenceLabel(confidence)}</span>
        </div>
      </div>
      <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
        Kaynak: {marketReference.sourceName || "Kaynak belirtilmemiş"}
      </div>
      <div className="panelMeta" style={{ marginTop: 6 }}>
        Bu değer gerçek maliyetiniz değildir; iç maliyet ve sözleşme verileri önceliklidir.
      </div>
      {fallbackLabel ? <div className="panelMeta" style={{ marginTop: 6 }}>{fallbackLabel}.</div> : null}
      <details style={{ marginTop: 10 }}>
        <summary className="muted" style={{ cursor: "pointer" }}>Kaynak ayrıntıları</summary>
        <div className="panelMeta" style={{ marginTop: 8, display: "grid", gap: 4 }}>
          <span>Veri tarihi: {formatDate(marketReference.asOf)}</span>
          <span>Güncellik: {freshnessLabel}</span>
          <span>Güven seviyesi: {externalReferenceConfidenceLabel(confidence)}</span>
        </div>
      </details>
    </div>
  );
}
