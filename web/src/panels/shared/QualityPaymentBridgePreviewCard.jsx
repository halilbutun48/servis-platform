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

function formatCompleteness(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "%0";
  return `%${Math.max(0, Math.min(100, Math.round(n)))}`;
}

function normalizeStatus(value, fallback = "INSUFFICIENT_DATA") {
  const status = compactText(value, fallback).toUpperCase();
  return status || fallback;
}

function statusLabel(value) {
  const status = normalizeStatus(value);
  const labels = {
    READY: "Hazır",
    MISSING_PROOF: "Kanıt eksik",
    RISKY: "Riskli",
    INSUFFICIENT_DATA: "Yetersiz veri",
    READY_FOR_REVIEW: "İncelemeye hazır",
    NEEDS_PROOF: "Kanıt gerekli",
    NEEDS_QUALITY_REVIEW: "Kalite incelemesi gerekli",
    NO_IMPACT: "Etki yok",
    PARTIAL_HOLD_RECOMMENDED: "Kısmi bekleme",
    REVIEW_REQUIRED: "İnceleme gerekli",
    REVIEWED: "İncelendi",
    NEEDS_RECHECK: "Tekrar kontrol",
    IGNORED_FOR_NOW: "Şimdilik beklemede",
    CLEAR: "Temiz",
    RISK: "Risk",
    UNKNOWN: "Bilinmiyor",
  };
  return labels[status] || status.replace(/_/g, " ");
}

function statusTone(value) {
  const status = normalizeStatus(value);
  if (["READY", "READY_FOR_REVIEW", "NO_IMPACT", "REVIEWED", "CLEAR"].includes(status)) return "ready";
  if (["MISSING_PROOF", "PARTIAL_HOLD_RECOMMENDED", "NEEDS_PROOF"].includes(status)) return "warning";
  if (["RISKY", "REVIEW_REQUIRED", "NEEDS_QUALITY_REVIEW", "NEEDS_RECHECK", "RISK"].includes(status)) return "danger";
  return "muted";
}

function ChipRow({ items = [], tone = "muted", emptyText = "-" }) {
  const chips = compactList(items, 8);
  if (!chips.length) {
    return <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {chips.map((item) => (
        <span key={item} className={`pill pill--${tone}`} title={item}>{item}</span>
      ))}
    </div>
  );
}

export default function QualityPaymentBridgePreviewCard({
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
    || "Kalite / hakediş önizlemesi",
    "Kalite / hakediş önizlemesi",
  );
  const roomName = compactText(agreement?.room?.name || agreement?.roomName || "", "");
  const companyName = compactText(agreement?.company?.name || agreement?.companyName || "", "");
  const previewOnlyNote = compactText(
    safePreview.previewOnlyNote
    || "Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.",
    "Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.",
  );
  const qualityStatus = normalizeStatus(safePreview.qualityStatus, "INSUFFICIENT_DATA");
  const settlementReadiness = normalizeStatus(safePreview.settlementReadiness, "INSUFFICIENT_DATA");
  const impact = safePreview.paymentPreviewImpact && typeof safePreview.paymentPreviewImpact === "object" ? safePreview.paymentPreviewImpact : {};
  const missingProofs = Array.isArray(safePreview.missingProofs) ? safePreview.missingProofs : [];
  const riskReasons = Array.isArray(safePreview.riskReasons) ? safePreview.riskReasons : [];
  const signals = safePreview.seferScoreSignalsPreview && typeof safePreview.seferScoreSignalsPreview === "object"
    ? safePreview.seferScoreSignalsPreview
    : {};
  const nextBestAction = compactText(
    safePreview.nextBestAction
    || "Eksik kanıt varsa önce tamamlanmalı.",
    "Eksik kanıt varsa önce tamamlanmalı.",
  );
  const evidenceSummary = compactText(safePreview.evidenceSummary || "", "");

  const signalItems = [
    signals.onTimeSignal ? `Zaman: ${statusLabel(signals.onTimeSignal)}` : "",
    signals.gpsProofSignal ? `GPS: ${statusLabel(signals.gpsProofSignal)}` : "",
    signals.completionSignal ? `Tamamlanma: ${statusLabel(signals.completionSignal)}` : "",
    signals.complaintSignal ? `Şikayet: ${statusLabel(signals.complaintSignal)}` : "",
    signals.disputeSignal ? `İtiraz: ${statusLabel(signals.disputeSignal)}` : "",
    signals.documentSignal ? `Doküman: ${statusLabel(signals.documentSignal)}` : "",
    signals.qualityReviewSignal ? `İnceleme: ${statusLabel(signals.qualityReviewSignal)}` : "",
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
            Hakediş için kalite/kanıt hazırlık önizlemesi
            {roomName ? ` • ${roomName}` : ""}
            {companyName ? ` • ${companyName}` : ""}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" data-status={safePreview.previewOnly ? "READY" : "MISSING_PROOF"}>Readonly önizleme</span>
          <span className="pill" data-status={statusTone(qualityStatus).toUpperCase()}>{statusLabel(qualityStatus)}</span>
          <span className="pill" data-status={statusTone(settlementReadiness).toUpperCase()}>{statusLabel(settlementReadiness)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kalite durumu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{statusLabel(qualityStatus)}</div>
          <div className="muted" style={{ marginTop: 4 }}>{compactText(impact.reason || "", "Bu sadece önizlemedir.")}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Kanıt tamlığı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{formatCompleteness(safePreview.proofCompleteness)}</div>
          <div className="muted" style={{ marginTop: 4 }}>Eksik kanıt varsa önce tamamlanmalı.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Hakediş önizleme etkisi</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{statusLabel(impact.status)}</div>
          <div className="muted" style={{ marginTop: 4 }}>{compactText(impact.reason || "", "Bu sadece önizlemedir.")}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Ödeme / settlement hazırlığı</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{statusLabel(settlementReadiness)}</div>
          <div className="muted" style={{ marginTop: 4 }}>{previewOnlyNote}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Eksik kanıtlar</div>
        <ChipRow
          tone={missingProofs.length ? "warning" : "muted"}
          items={missingProofs}
          emptyText="Eksik kanıt görünmüyor."
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Risk nedenleri</div>
        <ChipRow
          tone={riskReasons.length ? "danger" : "muted"}
          items={riskReasons}
          emptyText="Risk nedeni görünmüyor."
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">SeferPuanı sinyal önizlemesi</div>
        <ChipRow
          tone="muted"
          items={signalItems}
          emptyText="Sinyal önizlemesi henüz yok."
        />
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
        <div className="muted">Sıradaki doğru işlem</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{nextBestAction}</div>
      </div>

      {evidenceSummary ? (
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
          {evidenceSummary}
        </div>
      ) : null}

      <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
        {previewOnlyNote}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Tahsilat/fatura oluşturulmaz. Hakediş için kalite/kanıt hazırlık önizlemesi.
      </div>

      {error ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Önizleme yüklenemedi: {error}
        </div>
      ) : loading ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Kalite / hakediş önizlemesi yükleniyor...
        </div>
      ) : null}
    </div>
  );
}
