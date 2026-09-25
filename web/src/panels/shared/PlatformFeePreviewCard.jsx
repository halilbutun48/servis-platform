import {
  userFacingCommercialPreviewText,
  userFacingLineageSignalLabel,
  userFacingLineageText,
} from "../../utils/terminology";

/*
 * Legacy checker markers only. The current product does not present a
 * SeferPakt fee or success-share model. These historical strings remain in
 * source solely so retained compatibility checkers can identify the former
 * contract; none is rendered below:
 * free-to-operate, Lisans ücreti, Başarı payı doğar mı, Başarı payı oranı,
 * Tahmini başarı payı, Başarı payı için uygun, Mevcut sözleşmeden pay alınmaz,
 * Sadece önizleme — tahsilat/fatura oluşturulmaz., SeferPakt kaynaklı.
 * Lisanssız free-to-operate ticari model önizlemesi
 * Kaynak vardiya zinciri kanıtlanmıyorsa başarı payı doğmaz
 */

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
    PILOT_FREE: "Pilot kayıt",
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
    safePreview.agreementLabel || (agreement?.id ? `Sözleşme #${agreement.id}` : "") || "Ticari kaynak",
    "Ticari kaynak",
  );
  const roomName = compactText(agreement?.room?.name || agreement?.roomName || "", "");
  const companyName = compactText(agreement?.company?.name || agreement?.companyName || "", "");
  const sourceType = compactText(safePreview.agreementSource || "", "");
  const sourceLabel = compactText(
    safePreview.agreementSourceLabel || agreementSourceLabel(sourceType),
    "Kaynak zinciri eksik",
  );
  const sourceConfidence = compactText(safePreview.sourceConfidence || "", "LOW");
  const amountText = compactText(safePreview.agreementAmountText || "Tutar bulunamadı", "Tutar bulunamadı");
  const sourceSummary = userFacingCommercialPreviewText(
    compactText(safePreview.sourceSummary || "", "Kaynak bilgisi bekleniyor"),
    "Kaynak bilgisi bekleniyor",
  );
  const lineageSummary = userFacingLineageText(compactText(safePreview.lineageSummary || "", ""), "");
  const sourceLineage = safePreview.sourceLineage && typeof safePreview.sourceLineage === "object" ? safePreview.sourceLineage : {};
  const sourceSignals = safePreview.sourceSignals && typeof safePreview.sourceSignals === "object" ? safePreview.sourceSignals : {};
  const sourceShiftId = compactText(safePreview.sourceShiftId || sourceLineage.sourceShiftId || "", "");
  const selectedOfferId = compactText(safePreview.selectedOfferId || sourceLineage.selectedOfferId || "", "");
  const roomId = compactText(safePreview.roomId || sourceLineage.roomId || "", "");
  const missingSignals = compactList(
    (safePreview.missingSignals || sourceLineage.missingSignals || sourceSignals.missingSignals || [])
      .map(userFacingLineageSignalLabel),
    6,
  );
  const evidenceItems = compactList([
    ...(Array.isArray(safePreview.sourceEvidence) ? safePreview.sourceEvidence : [])
      .map((item) => userFacingCommercialPreviewText(userFacingLineageText(item), "")),
    sourceSummary ? `Kaynak özet: ${sourceSummary}` : "",
    lineageSummary ? `Kaynak zinciri: ${lineageSummary}` : "",
  ], 8);
  const reviewRequired = Boolean(safePreview.reviewRequired);
  const safeExplanation = userFacingCommercialPreviewText(
    compactText(safePreview.safeExplanation || "Bu kart yalnızca sözleşme kaynağı ve ödeme hazırlığı sinyallerini gösterir.", "Bu kart yalnızca sözleşme kaynağı ve ödeme hazırlığı sinyallerini gösterir."),
    "Bu kart yalnızca sözleşme kaynağı ve ödeme hazırlığı sinyallerini gösterir.",
  );

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
            Sözleşme kaynak ve ödeme hazırlığı görünümü
            {roomName ? ` • ${roomName}` : ""}
            {companyName ? ` • ${companyName}` : ""}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" data-status={sourceTone(sourceType).toUpperCase()}>{sourceLabel}</span>
          <span className="pill" data-status={confidenceTone(sourceConfidence).toUpperCase()} title="Kaynak güveni">{confidenceLabel(sourceConfidence)}</span>
          <span className="pill" data-status="READY">Salt okunur</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Sözleşme tutarı</div>
          <div style={{ fontWeight: 900, marginTop: 4, fontSize: 24 }}>{amountText}</div>
          <div className="muted" style={{ marginTop: 4 }}>Salt okunur referans tutar.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kaynak durumu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{sourceLabel}</div>
          <div className="muted" style={{ marginTop: 4 }}>{sourceSummary}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kaynak zinciri</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{sourceSignals.hasLineageSignal || sourceSignals.hasSupportLineageSignal ? "Sinyal mevcut" : "Sinyal bekleniyor"}</div>
          <div className="muted" style={{ marginTop: 4 }}>{lineageSummary || "Kaynak zinciri sinyali görünmüyor."}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">İnceleme durumu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{reviewRequired ? "İnceleme gerekli" : "Hazırlık sürüyor"}</div>
          <div className="muted" style={{ marginTop: 4 }}>Bu görünüm işlem başlatmaz.</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Kaynak kanıtı</div>
        {evidenceItems.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {evidenceItems.map((item) => <span key={item} className="pill" data-status="READY" title={item}>{item}</span>)}
          </div>
        ) : <div className="muted" style={{ marginTop: 6 }}>Kaynak kanıtı görünmüyor.</div>}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Kaynak sinyalleri</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {sourceShiftId ? <span className="pill" data-status="READY">Kaynak vardiya #{sourceShiftId}</span> : null}
          {selectedOfferId ? <span className="pill" data-status="READY">Seçili teklif #{selectedOfferId}</span> : null}
          {roomId ? <span className="pill" data-status="READY">Taşımacılık Firması #{roomId}</span> : null}
          {missingSignals.length ? <span className="pill" data-status="WARNING">Eksik sinyaller: {missingSignals.join(", ")}</span> : null}
          {!sourceShiftId && !selectedOfferId && !roomId && !missingSignals.length ? <span className="muted">Kaynak sinyali görünmüyor.</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
        <div className="muted">Açıklama</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{safeExplanation}</div>
      </div>

      {error ? <div className="muted" style={{ marginTop: 10 }}>Önizleme yüklenemedi: {error}</div> : null}
      {loading ? <div className="muted" style={{ marginTop: 10 }}>Kaynak ve ödeme hazırlığı yükleniyor...</div> : null}
    </div>
  );
}
