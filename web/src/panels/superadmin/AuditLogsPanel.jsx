import { useCallback, useEffect, useState } from "react";
import { formatDateTimeTR } from "../../utils/time";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { cachedGet } from "../../utils/uiDataCache";
import { roleLabelForUser } from "../../utils/labels";

function fmt(ts) {
  try {
    return formatDateTimeTR(ts);
  } catch {
    return String(ts || "");
  }
}

function summarizeAuditMeta(meta) {
  if (meta == null || meta === "") return "";
  if (typeof meta === "string") {
    const text = meta.trim();
    if (!text) return "";
    if (/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(text)) return "Sistem kanıtı hazır";
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  if (Array.isArray(meta)) return `${meta.length} öğe`;
  if (typeof meta !== "object") return String(meta);

  const entries = Object.entries(meta).filter(([key, value]) => {
    const joined = `${key} ${String(value ?? "")}`;
    return !/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(joined);
  });
  const parts = [];
  for (const [key, value] of entries) {
    if (value == null || value === "") continue;
    const rendered = typeof value === "object" ? (Array.isArray(value) ? `${value.length} öğe` : "detay") : String(value);
    parts.push(`${key}: ${rendered.length > 40 ? `${rendered.slice(0, 37)}…` : rendered}`);
    if (parts.length >= 3) break;
  }
  return parts.length ? parts.join(" • ") : "Sistem kanıtı hazır";
}

function summarizeAuditAction(action) {
  const text = String(action || "").trim();
  if (!text) return "-";
  if (/(token|hash|payload|raw|debug|stack|internal|undefined|null|\[object object\])/i.test(text)) {
    return "Güvenlik olayı";
  }
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function auditEntityLabel(entity) {
  const key = String(entity || "").toUpperCase();
  if (key === "COMPANY") return "Hizmet Alan Firma";
  if (key === "ROOM") return "Taşımacılık Firması";
  if (key === "USER") return "Kullanıcı";
  if (key === "REGION") return "Bölge";
  return entity || "-";
}

export default function AuditLogsPanel() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [actorEmail, setActorEmail] = useState("");

  function copyText(t) {
    try {
      navigator.clipboard.writeText(String(t || ""));
    } catch { /* no-op: clipboard copy is best-effort */ }
  }

  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", "250");
      if (q.trim()) qs.set("q", q.trim());
      if (entity) qs.set("entity", entity);
      if (action.trim()) qs.set("action", action.trim());
      if (actorEmail.trim()) qs.set("actorEmail", actorEmail.trim());
      const r = await cachedGet(`/api/admin/audit-logs?${qs.toString()}`, { ttlMs: 10 * 60 * 1000, delayMs: 120 });
      setItems(r.items || []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [action, actorEmail, entity, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div className="panelTitle">İşlem Kayıtları</div>
        <span className="pill" data-status="COUNT">
          {items.length} kayıt
        </span>
      </div>

      <PanelKvkkHint panelKey="auditLogs" />

      <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label className="muted">
            Arama (action/entity)
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ör: DISABLE, Region, User" />
          </label>
          <label className="muted">
            Entity
            <select value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">(hepsi)</option>
              <option value="User">User</option>
              <option value="Company">Hizmet Alan Firma</option>
              <option value="Room">Taşımacılık Firması</option>
              <option value="Region">Region</option>
            </select>
          </label>
          <label className="muted">
            Action contains
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="ör: ADMIN_USER_" />
          </label>
          <label className="muted">
            Actor email contains
            <input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} placeholder="ör: superadmin@" />
          </label>
        </div>

        <div style={{ marginTop: 12 }} className="saActions">
          <button className="btn" disabled={busy} onClick={load}>
            Yenile
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              setQ("");
              setEntity("");
              setAction("");
              setActorEmail("");
            }}
          >
            Filtre Temizle
          </button>
          <div className="muted" style={{ opacity: 0.7 }}>
            {busy ? "Yükleniyor..." : ""}
          </div>
        </div>

        {err ? <div style={{ marginTop: 10, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null}
      </div>

      <div className="saTable">
        <div
          className="saHead"
          style={{ display: "grid", gridTemplateColumns: "170px 1fr 240px 120px 120px 1fr 110px", padding: "10px 12px" }}
        >
          <div>Zaman</div>
          <div>Actor</div>
          <div>Action</div>
          <div>Entity</div>
          <div>EntityId</div>
          <div>Sistem kanıtı</div>
          <div></div>
        </div>

        {(items || []).map((x) => (
          <div
            key={x.id}
            className="saRow"
            style={{ display: "grid", gridTemplateColumns: "170px 1fr 240px 120px 120px 1fr 110px", padding: "10px 12px", alignItems: "center" }}
          >
            <div style={{ opacity: 0.85 }}>{fmt(x.createdAt)}</div>
            <div style={{ wordBreak: "break-word" }}>
              <div>{x.actorEmail || "-"}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {x.actorRole ? roleLabelForUser(x.actorRole) : "-"}
                {x.actorUserId ? ` #${x.actorUserId}` : ""}
              </div>
            </div>
            <div style={{ wordBreak: "break-word" }}>{summarizeAuditAction(x.action)}</div>
            <div>{auditEntityLabel(x.entity)}</div>
            <div>{x.entityId ?? "-"}</div>
            <div className="saMeta">{summarizeAuditMeta(x.meta)}</div>
            <div>
              <button className="btn sm" onClick={() => copyText(summarizeAuditMeta(x.meta))}>
                Kopyala
              </button>
            </div>
          </div>
        ))}

        {(!items || items.length === 0) && <div style={{ padding: 12, opacity: 0.75 }}>Kayıt yok</div>}
      </div>
    </div>
  );
}
