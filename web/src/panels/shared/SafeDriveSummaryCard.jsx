import { getSafeDriveSummary } from "../../utils/safeDriveSummary";

function toneBorder(statusTone) {
  const tone = String(statusTone || "INFO").toUpperCase();
  if (tone === "OK") return "rgba(18, 183, 106, 0.26)";
  if (tone === "WARN") return "rgba(255, 176, 123, 0.32)";
  if (tone === "CRITICAL") return "rgba(255, 123, 123, 0.34)";
  return "rgba(88,166,255,.22)";
}

function toneBackground(statusTone) {
  const tone = String(statusTone || "INFO").toUpperCase();
  if (tone === "OK") return "rgba(18, 183, 106, 0.06)";
  if (tone === "WARN") return "rgba(255, 176, 123, 0.08)";
  if (tone === "CRITICAL") return "rgba(255, 123, 123, 0.08)";
  return "rgba(255,255,255,.02)";
}

function SectionChips({ title, items = [], emptyText = "" }) {
  const chips = Array.isArray(items) ? items.slice(0, 4).filter(Boolean) : [];
  if (!chips.length) return emptyText ? <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div> : null;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted">{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {chips.map((item) => (
          <span key={item.text || `${item.label}:${item.value}`} className="pill" data-status={item.tone || "INFO"} title={item.text || `${item.label}: ${item.value}`}>
            {item.text || `${item.label}: ${item.value}`}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SafeDriveSummaryCard({
  summaryParams = null,
  className = "",
  style = {},
}) {
  const safeDrive = getSafeDriveSummary(summaryParams || {});
  const riskReasons = Array.isArray(safeDrive?.riskReasons) ? safeDrive.riskReasons : [];
  const controlNotes = Array.isArray(safeDrive?.controlNotes) ? safeDrive.controlNotes : [];
  const signals = Array.isArray(safeDrive?.signals) ? safeDrive.signals : [];

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        border: `1px solid ${toneBorder(safeDrive?.statusTone)}`,
        background: toneBackground(safeDrive?.statusTone),
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div className="panelSectionTitle">{safeDrive?.title || "Güvenli sürüş özeti"}</div>
          <div className="panelMeta" style={{ marginTop: 4 }}>{safeDrive?.summaryText || "Güvenli sürüş özeti"}</div>
        </div>
        <span className="pill" data-status={safeDrive?.statusTone || "INFO"}>
          {safeDrive?.statusText || "Yetersiz veri"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {signals.slice(0, 6).map((signal) => (
          <span
            key={signal.text || `${signal.label}:${signal.value}`}
            className="pill"
            data-status={signal.tone || "INFO"}
            title={signal.note || signal.text}
          >
            {signal.text || `${signal.label}: ${signal.value}`}
          </span>
        ))}
      </div>

      <div className="muted">Kanıt / check-in durumu</div>

      <SectionChips title="Risk nedenleri" items={riskReasons.map((item) => ({ text: item, tone: "CRITICAL" }))} emptyText="Risk sinyali görünmüyor." />
      <SectionChips title="Kontrol edilmeli notları" items={controlNotes.map((item) => ({ text: item, tone: "WARN" }))} emptyText="Kontrol notu yok." />

      <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
        <div className="muted">İnsan onayı gerekir / operasyon kontrol önerisi</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{safeDrive?.nextBestAction || "Operasyon kontrol önerisi: canlı izlemeyi sürdür, uygulama yapma."}</div>
      </div>

      <div className="muted" style={{ lineHeight: 1.45 }}>
        {safeDrive?.boundaryNote || "Readonly sınırı: sadece okur ve özetler."}
      </div>
    </div>
  );
}
