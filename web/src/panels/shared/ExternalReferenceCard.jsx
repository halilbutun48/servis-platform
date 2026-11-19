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
  buildRoomServiceCostEvidence,
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
    NOT_PROVEN: "Doğrulanmadı; kapalı",
    NOT_AVAILABLE: "Mevcut değil",
  };
  return labels[key] || humanizeUserFacingText(value, fallback);
}

function layerLabel(layer) {
  if (layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.unit === "CURRENCY_PER_L") return "Yakıt fiyatı referansı";
  if (layer?.layer === "SEFERPAKT_PLATFORM_REFERENCE") {
    return layer?.controlledDemoOnly ? "Kontrollü DEMO platform geçmiş anlaşma referansı" : "Platform geçmiş anlaşma referansı";
  }
  if (layer?.label) return layer.label;
  if (layer?.layer === "EXTERNAL_MARKET_REFERENCE") return "Dış piyasa referansı";
  return "Mevcut gerçek verileriniz";
}

const ROOM_SERVICE_COST_LABELS = Object.freeze({
  FUEL: "Yakıt",
  MAINTENANCE: "Bakım",
  DRIVER: "Sürücü maliyeti",
  RENT: "Araç kirası",
});

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

export default function ExternalReferenceCard({ token, canView, refreshTick = 0, scope = "ROOM", preview = null, regionName: regionNameProp = null }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const snapshot = preview?.snapshot || {};
  const regionName = regionNameProp || snapshot.regionName || preview?.regionName || null;
  const scopeKey = String(scope || "ROOM").toUpperCase();
  const roomServiceCostEvidence = buildRoomServiceCostEvidence(preview || {});
  const isRoomServiceContext = scopeKey === "ROOM"
    && Boolean(roomServiceCostEvidence.selectedShiftId || roomServiceCostEvidence.selectedAgreementId);
  const roomServiceEvidenceByCategory = new Map(
    roomServiceCostEvidence.categoryTotals.map((item) => [item.categoryKey, item]),
  );
  const roomCategoryAmount = (categoryKey) => roomServiceEvidenceByCategory.get(categoryKey)?.amountMinor ?? null;
  const roomHasEvidence = isRoomServiceContext && roomServiceCostEvidence.hasEvidence && !roomServiceCostEvidence.contextMismatch;
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
        const info = getApiErrorInfo(requestError, "Yakıt fiyatı referansı okunamadı.");
        setError(info.message || "Yakıt fiyatı referansı okunamadı.");
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
        <div className="panelSectionTitle">Yakıt fiyatı referansı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Operasyon kapsamına uygun yakıt fiyatı referansı yükleniyor.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" data-testid="external-reference-card" data-reference-state="error" style={{ marginTop: 12, ...toneStyle("warm") }}>
        <div className="panelSectionTitle">Yakıt fiyatı referansı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>Yakıt fiyatı referansı şu anda okunamadı.</div>
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
          <div className="panelSectionTitle">Yakıt fiyatı referansı</div>
          <div data-testid="external-reference-value" className="panelStatValue" style={{ marginTop: 8 }}>
          {isAvailable ? referenceValue : <span data-testid="external-reference-no-data">Yakıt fiyatı referansı henüz mevcut değil.</span>}
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
          {isRoomServiceContext ? (
            <>
              <span>Sürücü maliyeti: {roomCategoryAmount("DRIVER") != null ? `Hizmet payı mevcut · ${formatMoneyMinor(roomCategoryAmount("DRIVER"), "TRY")}` : "Hizmet payı doğrulanamıyor"}</span>
              <span>Bakım maliyeti: {roomCategoryAmount("MAINTENANCE") != null ? `Hizmet payı mevcut · ${formatMoneyMinor(roomCategoryAmount("MAINTENANCE"), "TRY")}` : "Hizmet payı doğrulanamıyor"}</span>
              <span>Araç kirası: {roomCategoryAmount("RENT") != null ? `Hizmet payı mevcut · ${formatMoneyMinor(roomCategoryAmount("RENT"), "TRY")}` : "Hizmet payı doğrulanamıyor"}</span>
            </>
          ) : (
            <>
              <span>Sürücü maliyeti: Mevcut değil</span>
              <span>Bakım maliyeti: Mevcut değil</span>
            </>
          )}
          <span>{platform?.controlledDemoOnly ? "Kontrollü DEMO platform geçmiş anlaşma referansı" : "Platform geçmiş anlaşma referansı"}: {referenceStateLabel(platform?.status || (platform?.available ? "AVAILABLE" : "NOT_PROVEN"))}</span>
          <span>{isRoomServiceContext ? "Gerçek hizmet payı" : "Gerçek maliyet"}: {isRoomServiceContext ? (roomHasEvidence ? "Kanıt mevcut" : "Doğrulama bekliyor") : referenceStateLabel(actual?.available ? "AVAILABLE" : "NOT_AVAILABLE")}</span>
        </div>
      </div>
      {isRoomServiceContext ? (
        <div data-testid="room-service-cost-evidence" className="card" style={{ marginTop: 10, padding: 12, background: "rgba(255,255,255,0.025)" }}>
          <div className="panelSectionTitle">İç maliyet kanıtı</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Seçili hizmetin doğrulanmış gider ve dağıtım payları. Piyasa referansından ve tahmini planlama maliyetinden ayrıdır.
          </div>
          {roomServiceCostEvidence.contextMismatch ? (
            <div className="panelMeta" style={{ marginTop: 8 }}>Seçili hizmetle eşleşen maliyet kaydı bulunamadı; başka bir hizmetin verisi kullanılmadı.</div>
          ) : roomServiceCostEvidence.categoryTotals.length ? (
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              {roomServiceCostEvidence.categoryTotals.map((item) => (
                <div key={item.categoryKey} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span>{ROOM_SERVICE_COST_LABELS[item.categoryKey] || item.categoryKey}</span>
                  <span className="panelMeta">{formatMoneyMinor(item.amountMinor, "TRY")} · Hizmet payı kanıtı</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="panelMeta" style={{ marginTop: 8 }}>Seçili hizmet için kanıtlanmış gider payı bulunmuyor.</div>
          )}
          {roomServiceCostEvidence.provenAmountMinor != null ? (
            <div className="panelMeta" style={{ marginTop: 10 }}>
              Kanıtlı hizmet payı: <strong>{formatMoneyMinor(roomServiceCostEvidence.provenAmountMinor, "TRY")}</strong>
            </div>
          ) : null}
          {roomServiceCostEvidence.pendingAmountMinor > 0 ? (
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Dağıtım bekleyen dönem payı: <strong>{formatMoneyMinor(roomServiceCostEvidence.pendingAmountMinor, "TRY")}</strong>. Bu nedenle kesin toplam henüz doğrulanmadı.
            </div>
          ) : null}
          {roomServiceCostEvidence.grossAmountMinor != null ? (
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Kaynak dönem toplamı: {formatMoneyMinor(roomServiceCostEvidence.grossAmountMinor, "TRY")} · Bu tutar seçili hizmetin kesin maliyeti değildir.
            </div>
          ) : null}
        </div>
      ) : null}
      {platform?.available && platform?.controlledDemoOnly ? (
        <div className="card" data-testid="platform-demo-reference-summary" style={{ marginTop: 10, padding: 14, border: "1px solid rgba(58,102,255,0.35)", background: "rgba(58,102,255,0.06)" }}>
          <div className="panelSectionTitle">{scopeKey === "COMPANY" ? "Genel kontrollü DEMO anlaşma referansı" : "İzinli DEMO SeferPakt anlaşma referansı"}</div>
          <div className="panelStatValue" style={{ marginTop: 8 }}>{formatMoneyMinor(platform.averageAmountMinor ?? platform.valueMinor, platform.currencyCode || "TRY")}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Kanıtlanan aralık: {formatBand(platform.range, platform.currencyCode || "TRY")}</div>
          <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>Yalnızca karşılaştırılabilir ve anonim DEMO ROOM anlaşmalarının toplu sonucudur. {scopeKey === "COMPANY" ? "Seçili hizmete özel emsal değildir. " : ""}ROOM özel maliyetleri, teklif alt sınırları ve kâr marjları gösterilmez. Bu canlı platform ortalaması değildir.</div>
        </div>
      ) : guidance?.observedRegional?.available ? (
        <div className="panelMeta" style={{ marginTop: 8 }}>Platform geçmiş anlaşma bandı: {formatBand(guidance.observedRegional, guidance.observedRegional.currencyCode || "TRY")}</div>
      ) : scopeKey === "ROOM" ? (
        <div className="panelMeta" style={{ marginTop: 8 }}>Platform geçmiş anlaşma bandı kapalı; onaylı politika ve bağımsız ROOM kanıtı olmadan ortalama veya aralık gösterilmez.</div>
      ) : null}
      <div className="panelMeta" style={{ marginTop: 6 }}>Yakıt fiyatı referansı gerçek maliyetinizin veya sözleşme tutarınızın yerine geçmez. Bu değer gerçek maliyetiniz değildir; iç maliyet ve sözleşme verileri önceliklidir.</div>
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
