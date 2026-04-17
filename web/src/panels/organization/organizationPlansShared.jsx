/* eslint-disable react-refresh/only-export-components */
import React from "react";

export const fieldLabelStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  fontSize: 12,
  color: "rgba(255,255,255,.72)",
};

export const inputStyle = {
  width: "100%",
  minWidth: 0,
};

export function minToHm(min) {
  const n = Number(min || 0);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

export function hmToMin(v, fallback = 0) {
  const m = String(v || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h < 0 || h > 23 || mm < 0 || mm > 59 ? fallback : h * 60 + mm;
}

function statusLabel(status) {
  const s = String(status || "DRAFT").toUpperCase();
  if (s === "SHIFT_PUBLISHED") return "TEKLİF/VARDİYA AÇILDI";
  if (s === "AGREEMENT_REQUESTED") return "SÖZLEŞME TALEBİ";
  return s;
}

function Pill({ children }) {
  return (
    <span
      className="pill"
      style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}
    >
      {children}
    </span>
  );
}

export function SummaryCard({ current, summary, onGoPlanning }) {
  return (
    <div className="card">
      <div className="title">Özet ve Aksiyonlar</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Yeni üretim akışı artık <b>Planlama Merkezi</b> içinden yürür. Bu ekran eski
        organization planlarını incelemek için tutulur; yeni plan açma, teklif gönderme ve
        sözleşme başlatma işlemleri Planlama Merkezi&apos;nden yapılmalıdır.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill>Durum: {statusLabel(current.status)}</Pill>
        <Pill>Lokasyon: {summary.count}</Pill>
        <Pill>Kişi: {summary.pax}</Pill>
        <Pill>
          Saat: {minToHm(current.startMin)} – {minToHm(current.endMin)}
        </Pill>
        {current.publishedShiftId ? <Pill>Vardiya #{current.publishedShiftId}</Pill> : null}
        {current.linkedAgreementId ? <Pill>Sözleşme #{current.linkedAgreementId}</Pill> : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" onClick={onGoPlanning}>
          Planlama Merkezi&apos;ne git
        </button>
      </div>
    </div>
  );
}

export function MiniMapPreview({ stops }) {
  const pts = (stops || [])
    .map((s) => ({ name: s.name || "", lat: Number(s.lat), lng: Number(s.lng) }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));

  if (!pts.length) {
    return (
      <div className="card">
        <div className="title">Mini Harita Önizleme</div>
        <div className="muted">Koordinatlı lokasyon ekleyin.</div>
      </div>
    );
  }

  const minLat = Math.min(...pts.map((p) => p.lat));
  const maxLat = Math.max(...pts.map((p) => p.lat));
  const minLng = Math.min(...pts.map((p) => p.lng));
  const maxLng = Math.max(...pts.map((p) => p.lng));

  const pad = 18;
  const w = 260;
  const h = 180;
  const latSpan = Math.max(0.0001, maxLat - minLat);
  const lngSpan = Math.max(0.0001, maxLng - minLng);

  const scaled = pts.map((p, i) => ({
    ...p,
    x: pad + ((p.lng - minLng) / lngSpan) * (w - pad * 2),
    y: h - pad - ((p.lat - minLat) / latSpan) * (h - pad * 2),
    i,
  }));

  const poly = scaled.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card">
      <div className="title">Mini Harita Önizleme</div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Lokasyon sırası çizgisel önizleme.
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          width: "100%",
          height: 180,
          display: "block",
          borderRadius: 12,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <polyline
          points={poly}
          fill="none"
          stroke="rgba(91,140,255,.8)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {scaled.map((p) => (
          <g key={p.i}>
            <circle cx={p.x} cy={p.y} r={p.i === 0 ? 6 : 5} fill={p.i === 0 ? "#5b8cff" : "rgba(255,255,255,.92)"} />
            <text x={p.x + 8} y={p.y - 8} fontSize="10" fill="rgba(255,255,255,.82)">
              {p.i + 1}
            </text>
          </g>
        ))}
      </svg>

      <div className="muted" style={{ marginTop: 8 }}>
        Başlangıç: {scaled[0]?.name || "-"} • Bitiş: {scaled.at(-1)?.name || "-"}
      </div>
    </div>
  );
}

export function PlanListItem({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: 12,
        borderRadius: 12,
        border: active ? "1px solid #5b8cff" : "1px solid rgba(255,255,255,.12)",
        background: active ? "rgba(91,140,255,.12)" : "rgba(255,255,255,.03)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title || `Plan #${item.id}`}</div>
      <div className="muted">
        {String(item.planDate || "").slice(0, 10)} • {statusLabel(item.status)}
      </div>
      <div className="muted">{(item.stops || []).length} lokasyon</div>
    </button>
  );
}

export function StopCard({
  row,
  index,
  total,
  isOpen,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDrop,
  isDragging,
}) {
  return (
    <div
      className="card"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      style={{
        padding: 12,
        overflow: "hidden",
        opacity: isDragging ? 0.65 : 1,
        border: isDragging ? "1px dashed rgba(91,140,255,.7)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: isOpen ? 12 : 0,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            textAlign: "left",
          }}
        >
          <Pill>::</Pill>
          <Pill>#{index + 1}</Pill>
          <span style={{ fontWeight: 700 }}>{row.name || `Lokasyon ${index + 1}`}</span>
          <span className="muted">{row.passengerCount || 1} kişi</span>
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => onMoveUp(index)} disabled={index === 0}>↑</button>
          <button type="button" onClick={() => onMoveDown(index)} disabled={index >= total - 1}>↓</button>
          <button type="button" onClick={() => onRemove(index)}>Sil</button>
        </div>
      </div>

      {!isOpen ? (
        <div className="muted">
          {(row.address || "Adres girilmedi")}
          {row.windowStartMin != null || row.windowEndMin != null ? (
            <>
              {" "}
              • {row.windowStartMin != null ? minToHm(row.windowStartMin) : "--:--"} - {row.windowEndMin != null ? minToHm(row.windowEndMin) : "--:--"}
            </>
          ) : null}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr)",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <label style={fieldLabelStyle}>
              İsim
              <input
                style={inputStyle}
                value={row.name || ""}
                onChange={(e) => onChange(index, { ...row, name: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Adres
              <input
                style={inputStyle}
                value={row.address || ""}
                onChange={(e) => onChange(index, { ...row, address: e.target.value })}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 100px 110px 110px 90px minmax(0,1fr)",
              gap: 10,
            }}
          >
            <label style={fieldLabelStyle}>
              Lat
              <input
                style={inputStyle}
                value={row.lat ?? ""}
                onChange={(e) => onChange(index, { ...row, lat: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Lng
              <input
                style={inputStyle}
                value={row.lng ?? ""}
                onChange={(e) => onChange(index, { ...row, lng: e.target.value })}
              />
            </label>

            <label style={fieldLabelStyle}>
              Pencere Baş.
              <input
                style={inputStyle}
                placeholder="08:30"
                value={row.windowStartMin == null ? "" : minToHm(row.windowStartMin)}
                onChange={(e) =>
                  onChange(index, {
                    ...row,
                    windowStartMin: e.target.value ? hmToMin(e.target.value, null) : null,
                  })
                }
              />
            </label>

            <label style={fieldLabelStyle}>
              Pencere Bit.
              <input
                style={inputStyle}
                placeholder="09:15"
                value={row.windowEndMin == null ? "" : minToHm(row.windowEndMin)}
                onChange={(e) =>
                  onChange(index, {
                    ...row,
                    windowEndMin: e.target.value ? hmToMin(e.target.value, null) : null,
                  })
                }
              />
            </label>

            <label style={fieldLabelStyle}>
              Kişi
              <input
                type="number"
                min="1"
                style={inputStyle}
                value={row.passengerCount ?? 1}
                onChange={(e) =>
                  onChange(index, {
                    ...row,
                    passengerCount: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </label>

            <label style={fieldLabelStyle}>
              Not
              <input
                style={inputStyle}
                value={row.note || ""}
                onChange={(e) => onChange(index, { ...row, note: e.target.value })}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
