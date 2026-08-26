/* eslint-disable react-refresh/only-export-components */
export function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 280px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export function fmtBps(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "%0";
  return new Intl.NumberFormat("tr-TR", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n / 10000);
}

export function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("tr-TR");
}

export function InputRow({ label, children, help }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div className="panelMeta">{label}</div>
      {children}
      {help ? <div className="panelMeta">{help}</div> : null}
    </label>
  );
}

export function stripHtmlNoise(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutTags = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return withoutTags || raw;
}

export function promptMaybe(message, fallback = "") {
  if (typeof globalThis?.prompt !== "function") return fallback;
  const value = globalThis.prompt(message, fallback);
  return value == null ? fallback : String(value);
}

