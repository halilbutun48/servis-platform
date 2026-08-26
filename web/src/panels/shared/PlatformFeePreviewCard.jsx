function compactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}

function compactList(items = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item, "");
    if (!text) continue;
    const key = text.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function sourceTone(value) {
  const key = compactText(value, "INSUFFICIENT_LINEAGE").toUpperCase();
  if (["SEFERPAKT_NEW", "SEFERPAKT_RENEWAL"].includes(key)) return "ready";
  if (["EXISTING_IMPORTED", "MANUAL_INTERNAL", "PILOT_FREE", "LEGACY"].includes(key)) return "warning";
  return "danger";
}

function confidenceTone(value) {
  const key = compactText(value, "LOW").toUpperCase();
  if (key === "HIGH") return "ready";
  if (key === "MEDIUM") return "warning";
  return "muted";
}

function confidenceLabel(value) {
  const key = compactText(value, "LOW").toUpperCase();
  if (key === "HIGH") return "Yüksek";
  if (key === "MEDIUM") return "Orta";
  if (key === "LOW") return "Düşük";
  return key.replace(/_/g, " ");
}

function agreementSourceLabel(value) {
  const key = compactText(value, "INSUFFICIENT_LINEAGE").toUpperCase();
  const labels = {
    EXISTING_IMPORTED: "Mevcut / taşınmış kayıt",
    MANUAL_INTERNAL: "Manuel iç kayıt",
    PILOT_FREE: "Pilot ücretsiz kayıt",
    LEGACY: "Eski kayıt",
    SEFERPAKT_NEW: "SeferPakt kaynaklı yeni sözleşme",
    SEFERPAKT_RENEWAL: "SeferPakt kaynaklı yenileme",
    INSUFFICIENT_LINEAGE: "Kaynak zinciri eksik",
  };
  return labels[key] || key.replace(/_/g, " ");
}

export default function PlatformFeePreviewCard({
  agreement = null,
  preview = null,
  loading = false,
  error = "",
  className = "card",
  style = {},
}) {
  const safePreview = preview && typeof preview === "object" ? preview : {};
  const agreementLabel = compactText(
    safePreview.agreementLabel
    || (agreement?.id ? `Sözleşme #${agreement.id}` : "")
    || "Pazaryeri / platform modeli",
    "Pazaryeri / platform modeli",
  );
  const roomName = compactText(agreement?.room?.name || agreement?.roomName || "", "");
  const companyName = compactText(agreement?.company?.name || agreement?.companyName || "", "");
  const sourceLabel = compactText(
    safePreview.agreementSourceLabel
    || agreementSourceLabel(safePreview.agreementSource),
    "Kaynak zinciri eksik",
  );
  const sourceType = compactText(safePreview.agreementSource || "", "");
  const sourceConfidence = compactText(safePreview.sourceConfidence || "", "LOW");
  const licenseFeeText = compactText(safePreview.licenseFeeText || "0 TL", "0 TL");
  const amountText = compactText(safePreview.agreementAmountText || "Tutar bulunamadı", "Tutar bulunamadı");
  const rateLabel = compactText(safePreview.successShareRateLabel || "Başarı payı doğmaz", "Başarı payı doğmaz");
  const estimatedText = compactText(safePreview.estimatedSuccessShareText || "Tutar bulunamadı", "Tutar bulunamadı");
  const sourceLineage = safePreview.sourceLineage && typeof safePreview.sourceLineage === "object" ? safePreview.sourceLineage : {};
  const payableNow = Boolean(safePreview.payableNow);
  const canInvoice = Boolean(safePreview.canInvoice);
  const canCollect = Boolean(safePreview.canCollect);
  const reviewRequired = Boolean(safePreview.reviewRequired);
  const billableByMarketplacePolicy = Boolean(
    safePreview.billableByMarketplacePolicy
    || sourceLineage.billableByMarketplacePolicy
    || safePreview.sourceSignals?.billableByMarketplacePolicy
  );
  const sourceSummary = compactText(safePreview.sourceSummary || "", "Kaynak zinciri eksik");
  const lineageSummary = compactText(safePreview.lineageSummary || "", "");
  const sourceShiftId = compactText(safePreview.sourceShiftId || sourceLineage.sourceShiftId || "", "");
  const marketShiftId = compactText(safePreview.marketShiftId || sourceLineage.marketShiftId || "", "");
  const organizationPlanId = compactText(safePreview.organizationPlanId || sourceLineage.organizationPlanId || "", "");
  const selectedOfferId = compactText(safePreview.selectedOfferId || sourceLineage.selectedOfferId || "", "");
  const roomId = compactText(safePreview.roomId || sourceLineage.roomId || "", "");
  const missingSignals = compactList(
    safePreview.missingSignals
    || sourceLineage.missingSignals
    || safePreview.sourceSignals?.missingSignals
    || [],
    6,
  );
  const safeExplanation = compactText(
    safePreview.safeExplanation
    || "Sadece önizleme — tahsilat/fatura oluşturulmaz.",
    "Sadece önizleme — tahsilat/fatura oluşturulmaz.",
  );
  const reason = compactText(safePreview.reason || "", "");
  const summaryText = compactText(safePreview.summaryText || "", "");
  const seferScore = safePreview.seferScoreUsed && typeof safePreview.seferScoreUsed === "object" ? safePreview.seferScoreUsed : {};
  const scoreText = compactText(seferScore.summaryText || "", "");
  const scoreLine = compactText(
    Number.isFinite(Number(seferScore.score))
      ? `${Number(seferScore.score).toFixed(2)} / ${Number(seferScore.scoreMax || 5).toFixed(0)}`
      : scoreText,
    scoreText || "SeferPuanı yeterli değil",
  );
  const evidenceItems = compactList([
    ...(Array.isArray(safePreview.sourceEvidence) ? safePreview.sourceEvidence : []),
    sourceSummary ? `Kaynak özet: ${sourceSummary}` : "",
    lineageSummary ? `Kaynak zinciri: ${lineageSummary}` : "",
  ], 8);
  const sourceSignals = safePreview.sourceSignals && typeof safePreview.sourceSignals === "object" ? safePreview.sourceSignals : {};
  const sourceTypeVerdict = ["SEFERPAKT_NEW", "SEFERPAKT_RENEWAL"].includes(sourceType)
    ? "evet"
    : ["EXISTING_IMPORTED", "MANUAL_INTERNAL", "PILOT_FREE", "LEGACY"].includes(sourceType)
      ? "hayır"
      : "belirsiz";
  const successShareVerdict = billableByMarketplacePolicy && sourceTypeVerdict === "evet"
    ? "Önizleme evet"
    : "hayır";
  const sourceSignalItems = [
    sourceSignals.hasLineageSignal || sourceSignals.hasSupportLineageSignal ? "Kaynak vardiyası sinyali var" : "Kaynak vardiyası sinyali yok",
    sourceSignals.hasBillableLineageSignal ? "Kaynak zinciri kanıtlı" : "Kaynak zinciri uygun değil",
    Number(sourceSignals.commercialSourceCount || 0) > 0 ? `${Number(sourceSignals.commercialSourceCount)} ticari kaynak kaydı` : "",
    sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : "",
    marketShiftId ? `Pazar vardiyası #${marketShiftId}` : "",
    organizationPlanId ? `Organizasyon planı #${organizationPlanId}` : "",
    selectedOfferId ? `Seçili teklif #${selectedOfferId}` : "",
    roomId ? `Taşımacılık Firması #${roomId}` : "",
    sourceSignals.isRenewal ? "Yenileme sinyali var" : "",
    sourceSignals.isManual ? "Manuel iç kayıt" : "",
    sourceSignals.isPilot ? "Pilot ücretsiz kayıt" : "",
    sourceSignals.isImported ? "Mevcut / taşınmış kayıt" : "",
    sourceSignals.isLegacy ? "Eski kayıt" : "",
    sourceSignals.isInsufficient ? "Kaynak zinciri eksik" : "",
    missingSignals.length ? `Eksik sinyaller: ${missingSignals.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <div
      className={className}
      style={{
        border: "1px solid rgba(88,166,255,.22)",
        background: "rgba(255,255,255,.02)",
        ...style,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 900 }}>{agreementLabel}</div>
          <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>
            Lisanssız free-to-operate ticari model önizlemesi
            {roomName ? ` • ${roomName}` : ""}
            {companyName ? ` • ${companyName}` : ""}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" data-status={sourceTone(sourceType).toUpperCase()}>
            {sourceLabel}
          </span>
          <span className="pill" data-status={confidenceTone(sourceConfidence).toUpperCase()} title="Kaynak güveni">
            {confidenceLabel(sourceConfidence)}
          </span>
          <span className="pill" data-status="READY">Sadece önizleme</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Lisans ücreti</div>
          <div style={{ fontWeight: 900, marginTop: 4, fontSize: 24 }}>{licenseFeeText}</div>
          <div className="muted" style={{ marginTop: 4 }}>Lisans ücreti yoktur.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Sözleşme tutarı</div>
          <div style={{ fontWeight: 900, marginTop: 4, fontSize: 24 }}>{amountText}</div>
          <div className="muted" style={{ marginTop: 4 }}>Sadece önizleme için referans tutar.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Anlaşma kaynak durumu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{sourceLabel}</div>
          <div className="muted" style={{ marginTop: 4 }}>{sourceSummary || "Kaynak vardiyası sinyali yok"}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kaynak zinciri</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{sourceSignals.hasBillableLineageSignal ? "Başarı payı için uygun" : sourceSignals.hasLineageSignal || sourceSignals.hasSupportLineageSignal ? "Sadece destek sinyali" : "Yok"}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {lineageSummary || "Kaynak zinciri sinyali görünmüyor."}
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">SeferPuanı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{scoreLine}</div>
          <div className="muted" style={{ marginTop: 4 }}>Kalite puanı oranı etkileyebilir.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Başarı payı oranı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{rateLabel}</div>
          <div className="muted" style={{ marginTop: 4 }}>{reviewRequired ? "İnceleme gerekli." : "Sadece önizleme."}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Tahmini başarı payı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{estimatedText}</div>
          <div className="muted" style={{ marginTop: 4 }}>Şu anda ödeme başlatılabilir: {payableNow ? "Evet" : "Hayır"}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Tahsilat / fatura</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{canInvoice || canCollect ? "Açık" : "Kapalı"}</div>
          <div className="muted" style={{ marginTop: 4 }}>Sadece önizleme — tahsilat/fatura oluşturulmaz.</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Kaynak zinciri kanıtı</div>
        {evidenceItems.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {evidenceItems.map((item) => (
              <span key={item} className="pill" data-status="READY" title={item}>{item}</span>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 6 }}>Kaynak zinciri kanıtı görünmüyor.</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Kaynak sinyalleri</div>
        {sourceSignalItems.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {sourceSignalItems.map((item) => (
              <span key={item} className={`pill`} data-status={sourceTone(sourceType).toUpperCase()} title={item}>{item}</span>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 6 }}>Kaynak sinyali görünmüyor.</div>
        )}
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
        <div className="muted">Önizleme açıklaması</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{safeExplanation}</div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">SeferPakt kaynaklı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{sourceTypeVerdict}</div>
          <div className="muted" style={{ marginTop: 4 }}>Kaynak vardiyası, pazar vardiyası ve teklif zinciri okunur.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Başarı payı doğar mı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{successShareVerdict}</div>
          <div className="muted" style={{ marginTop: 4 }}>Önizleme evet/hayır sonucu.</div>
        </div>
      </div>

      {summaryText ? (
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
          {summaryText}
        </div>
      ) : null}
      {reason ? (
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          {reason}
        </div>
      ) : null}

      <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
        Mevcut sözleşmeden pay alınmaz. Kaynak vardiya zinciri kanıtlanmıyorsa başarı payı doğmaz.
      </div>

      {error ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Önizleme yüklenemedi: {error}
        </div>
      ) : loading ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Platform fee önizlemesi yükleniyor...
        </div>
      ) : null}
    </div>
  );
}
