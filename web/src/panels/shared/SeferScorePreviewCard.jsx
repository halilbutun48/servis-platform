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

function scoreToText(score, max = 5) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(2)} / ${Number(max || 5).toFixed(0)}`;
}

function levelLabel(value) {
  const key = compactText(value, "").toUpperCase();
  const map = {
    ELITE: "Elit",
    GOOD: "İyi",
    STANDARD: "Standart",
    RISKY: "Riskli",
    CRITICAL: "Kritik",
    INSUFFICIENT_DATA: "Yetersiz veri",
  };
  return map[key] || compactText(value, "-");
}

function confidenceLabel(value) {
  const key = compactText(value, "").toUpperCase();
  const map = {
    PREVIEW: "Önizleme",
    LOW: "Düşük",
    MEDIUM: "Orta",
    HIGH: "Yüksek",
  };
  return map[key] || compactText(value, "-");
}

function statusLabel(value) {
  const key = compactText(value, "").toUpperCase();
  const map = {
    READY: "Hazır",
    NEEDS_MORE_PROOF: "Daha fazla kanıt gerekli",
    RISKY: "Riskli",
    INSUFFICIENT_DATA: "Yetersiz veri",
  };
  return map[key] || compactText(value, "-");
}

function toneForStatus(value) {
  const key = compactText(value, "").toUpperCase();
  if (key === "READY") return "ready";
  if (key === "NEEDS_MORE_PROOF") return "warning";
  if (key === "RISKY") return "danger";
  return "muted";
}

function toneForLevel(value) {
  const key = compactText(value, "").toUpperCase();
  if (key === "ELITE" || key === "GOOD") return "ready";
  if (key === "STANDARD" || key === "INSUFFICIENT_DATA") return "warning";
  if (key === "RISKY" || key === "CRITICAL") return "danger";
  return "muted";
}

function SectionList({ title, items = [], tone = "muted", emptyText = "-" }) {
  const rows = compactList(items, 8);
  return (
    <div style={{ marginTop: 12 }}>
      <div className="muted">{title}</div>
      {rows.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {rows.map((item) => (
            <span key={item} className={`pill pill--${tone}`} title={item}>{item}</span>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div>
      )}
    </div>
  );
}

function SignalBreakdownItem({ label, signal }) {
  const status = compactText(signal?.status || "", "UNKNOWN");
  const contribution = Number(signal?.contribution || 0);
  const weight = Number(signal?.weight || 0);
  const reason = compactText(signal?.reason || "", "Sinyal okunamadı.");
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>{label}</div>
        <span className="pill" data-status={toneForStatus(status).toUpperCase()}>{status}</span>
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Ağırlık: {Number.isFinite(weight) ? weight : 0} • Katkı: {Number.isFinite(contribution) ? contribution.toFixed(2) : "0.00"}
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{reason}</div>
    </div>
  );
}

export default function SeferScorePreviewCard({
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
    || "Readonly kalite puanı önizlemesi",
    "Readonly kalite puanı önizlemesi",
  );
  const supplierLabel = compactText(safePreview.supplierLabel || agreement?.company?.name || agreement?.room?.name || "", "");
  const score = Number(safePreview.score ?? NaN);
  const scoreMax = Number(safePreview.scoreMax ?? 5) || 5;
  const level = compactText(safePreview.level || "", "INSUFFICIENT_DATA");
  const confidence = compactText(safePreview.confidence || "", "PREVIEW");
  const status = compactText(safePreview.status || "", "INSUFFICIENT_DATA");
  const signalBreakdown = safePreview.signalBreakdown && typeof safePreview.signalBreakdown === "object" ? safePreview.signalBreakdown : {};
  const positiveReasons = Array.isArray(safePreview.positiveReasons) ? safePreview.positiveReasons : [];
  const riskReasons = Array.isArray(safePreview.riskReasons) ? safePreview.riskReasons : [];
  const missingSignals = Array.isArray(safePreview.missingSignals) ? safePreview.missingSignals : [];
  const nextBestAction = compactText(
    safePreview.nextBestAction
    || "Önce zamanında hizmet, GPS kanıtı, görev tamamlama, belge ve kalite sinyallerini topla.",
    "Önce zamanında hizmet, GPS kanıtı, görev tamamlama, belge ve kalite sinyallerini topla.",
  );
  const safeExplanation = compactText(
    safePreview.safeExplanation
    || "Readonly kalite puanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.",
    "Readonly kalite puanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.",
  );
  const scoreText = scoreToText(score, scoreMax);
  const confidenceTone = confidence === "HIGH" ? "ready" : confidence === "MEDIUM" ? "warning" : confidence === "LOW" ? "warning" : "muted";

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
            Readonly kalite puanı önizlemesi
            {supplierLabel ? ` • ${supplierLabel}` : ""}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" data-status={toneForStatus(status).toUpperCase()}>{statusLabel(status)}</span>
          <span className="pill" data-status={toneForLevel(level).toUpperCase()}>{levelLabel(level)}</span>
          <span className="pill" data-status={confidenceTone.toUpperCase()}>{confidenceLabel(confidence)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">SeferPuanı</div>
          <div style={{ fontWeight: 900, marginTop: 4, fontSize: 24 }}>{scoreText}</div>
          <div className="muted" style={{ marginTop: 4 }}>Readonly kalite puanı önizlemesi.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Seviye</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{levelLabel(level)}</div>
          <div className="muted" style={{ marginTop: 4 }}>Elit / İyi / Standart / Riskli / Kritik.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Güven</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{confidenceLabel(confidence)}</div>
          <div className="muted" style={{ marginTop: 4 }}>Bu sadece önizlemedir.</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
          <div className="muted">Durum</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>{statusLabel(status)}</div>
          <div className="muted" style={{ marginTop: 4 }}>Son karar yetkili kullanıcıdadır.</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="muted">Sinyal kırılımı</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 8 }}>
          <SignalBreakdownItem label="Zamanında hizmet" signal={signalBreakdown.onTimeSignal} />
          <SignalBreakdownItem label="GPS kanıtı" signal={signalBreakdown.gpsProofSignal} />
          <SignalBreakdownItem label="Görev tamamlama" signal={signalBreakdown.completionSignal} />
          <SignalBreakdownItem label="Şikâyet sinyali" signal={signalBreakdown.complaintSignal} />
          <SignalBreakdownItem label="İtiraz sinyali" signal={signalBreakdown.disputeSignal} />
          <SignalBreakdownItem label="Doküman sinyali" signal={signalBreakdown.documentSignal} />
          <SignalBreakdownItem label="Kalite incelemesi" signal={signalBreakdown.qualityReviewSignal} />
        </div>
      </div>

      <SectionList title="Güçlü sinyaller" items={positiveReasons} tone="ready" emptyText="Güçlü sinyal görünmüyor." />
      <SectionList title="Eksik sinyaller" items={missingSignals} tone="warning" emptyText="Eksik sinyal görünmüyor." />
      <SectionList title="Risk nedenleri" items={riskReasons} tone="danger" emptyText="Risk nedeni görünmüyor." />

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
        <div className="muted">Sıradaki doğru işlem</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{nextBestAction}</div>
      </div>

      <div className="muted" style={{ marginTop: 10, lineHeight: 1.45 }}>
        {safeExplanation}
      </div>

      {error ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Önizleme yüklenemedi: {error}
        </div>
      ) : loading ? (
        <div className="muted" style={{ marginTop: 10 }}>
          SeferPuanı önizlemesi yükleniyor...
        </div>
      ) : null}
    </div>
  );
}
