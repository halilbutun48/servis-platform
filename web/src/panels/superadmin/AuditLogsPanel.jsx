import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { formatDateTimeTR } from "../../utils/time";
import PanelKvkkHint from "../shared/PanelKvkkHint";

function fmt(ts) {
  try {
    return formatDateTimeTR(ts);
  } catch {
    return String(ts || "");
  }
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
      const r = await api(`/api/admin/audit-logs?${qs.toString()}`);
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
              <option value="Company">Company</option>
              <option value="Room">Room</option>
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
          <div>Meta</div>
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
                {x.actorRole || "-"}
                {x.actorUserId ? ` #${x.actorUserId}` : ""}
              </div>
            </div>
            <div style={{ wordBreak: "break-word" }}>{x.action}</div>
            <div>{x.entity}</div>
            <div>{x.entityId ?? "-"}</div>
            <div className="saMeta">{x.meta ? JSON.stringify(x.meta) : ""}</div>
            <div>
              <button className="btn sm" onClick={() => copyText(x.meta ? JSON.stringify(x.meta) : "")}>
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
