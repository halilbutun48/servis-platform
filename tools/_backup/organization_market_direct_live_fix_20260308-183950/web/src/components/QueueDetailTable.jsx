import React from "react";

/**
 * M72.1 — Queue satırları: retry + lastError
 *
 * Props:
 * - items: [{ id?, type?, createdAt?, retryCount, lastError, lastTriedAt }]
 */
export default function QueueDetailTable({ items = [] }) {
  if (!items.length) return <div style={{ opacity: 0.7 }}>Kuyruk boş.</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Tip</th>
            <th style={th}>Retry</th>
            <th style={th}>Son Deneme</th>
            <th style={th}>Son Hata</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id ?? idx}>
              <td style={td}>{idx + 1}</td>
              <td style={td}>{it.type ?? "-"}</td>
              <td style={td}>{Number.isFinite(it.retryCount) ? it.retryCount : 0}</td>
              <td style={td}>{formatTs(it.lastTriedAt)}</td>
              <td style={{ ...td, maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {it.lastError ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTs(v) {
  if (!v) return "-";
  try {
    const d = typeof v === "number" ? new Date(v) : new Date(String(v));
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

const th = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "6px 8px",
  fontWeight: 600,
};

const td = {
  borderBottom: "1px solid #eee",
  padding: "6px 8px",
  verticalAlign: "top",
};
