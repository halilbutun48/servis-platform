import React from "react";

function metaFromScore(score) {
  const count = Number(score?.evaluationCount || 0);
  const has = count > 0 && score?.averageScore != null;
  const average = has ? Number(score.averageScore || 0).toFixed(1) : null;
  return {
    has,
    count,
    average,
    tooltip: has ? `${average} / 5 • ${count} değerlendirme` : "Henüz puan yok",
    shortText: has ? `${average} ★ (${count})` : "Puan yok",
    longText: has ? `${average} / 5 • ${count} değerlendirme` : "Henüz puan yok",
  };
}

export function ProviderScoreBadge({ score, prominent = false, showLabel = false, style = null }) {
  if (!score) return null;
  const meta = metaFromScore(score);
  const has = meta.has;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: prominent ? "5px 12px" : "3px 10px",
        borderRadius: 999,
        border: has ? "1px solid rgba(18,183,106,0.45)" : "1px solid rgba(255,255,255,0.10)",
        background: has ? "rgba(18,183,106,0.14)" : "rgba(255,255,255,0.03)",
        color: has ? "#d1fadf" : "#d0d5dd",
        fontSize: prominent ? 12 : 12,
        fontWeight: 800,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        boxShadow: prominent && has ? "0 0 0 1px rgba(18,183,106,0.08) inset" : "none",
        ...style,
      }}
      title={meta.tooltip}
    >
      {showLabel ? <span style={{ opacity: 0.9 }}>Taşımacılık Firması puanı</span> : null}
      <span>{meta.shortText}</span>
    </span>
  );
}

export function ProviderScoreCard({ score, title = "Seçili Taşımacılık Firması puanı", style = null }) {
  if (!score) return null;
  const meta = metaFromScore(score);
  const has = meta.has;
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        border: has ? "1px solid rgba(18,183,106,0.35)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background: has ? "rgba(18,183,106,0.06)" : "rgba(255,255,255,0.02)",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
          <div className="muted">{meta.longText}</div>
          {has && score?.recommendRate != null ? <div className="muted" style={{ marginTop: 4 }}>Tekrar çalışma oranı: %{score.recommendRate}</div> : null}
        </div>
        <ProviderScoreBadge score={score} prominent showLabel />
      </div>
    </div>
  );
}
