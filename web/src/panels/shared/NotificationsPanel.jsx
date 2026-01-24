import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

function asText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function safeParseJson(v) {
  // v string ise JSON parse etmeyi dene, değilse olduğu gibi dön
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return null;
  if (!(s.startsWith("{") || s.startsWith("["))) return v; // plain string
  try {
    return JSON.parse(s);
  } catch {
    return v; // bozuk json ise string kalsın
  }
}

export default function NotificationsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  async function load() {
    if (!token) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/notifications/my", { token });
      setItems(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useAutoReload("notifications", load);

  const rows = useMemo(() => {
    return (items || []).map((n, idx) => {
      const rawPayload = n?.payloadJson ?? n?.payload ?? n;
      const parsed = safeParseJson(rawPayload);

      const payloadObj = parsed && typeof parsed === "object" ? parsed : null;

      const title =
        asText(n?.type) ||
        asText(payloadObj?.title) ||
        asText(payloadObj?.type) ||
        "-";

      const message =
        asText(payloadObj?.message) ||
        asText(n?.message) ||
        "";

      const vehicleId =
        payloadObj?.vehicleId ?? n?.vehicleId ?? "";

      const created =
        n?.createdAt ?? n?.at ?? "";

      const payloadText = payloadObj
        ? asText(payloadObj)
        : asText(parsed);

      return {
        key: n?.id ?? idx,
        id: n?.id ?? "-",
        type: asText(n?.type ?? payloadObj?.type ?? "-"),
        scope: asText(n?.scope ?? "-"),
        created: asText(created),
        title,
        message,
        vehicleId: asText(vehicleId),
        payloadText,
        payloadPretty: payloadObj ? JSON.stringify(payloadObj, null, 2) : asText(parsed),
      };
    });
  }, [items]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="topbar">
          <div>
            <h3 style={{ margin: 0 }}>Notifications</h3>
            <div className="muted">Son 100 kayıt</div>
          </div>
          <button onClick={load} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>
      </div>

      {err ? <div className="card err">Hata: {err}</div> : null}

      <div className="card">
        {rows.length === 0 ? (
          <div className="muted">Henüz bildirim yok (veya endpoint boş dönüyor).</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Created</th>
                <th>Title</th>
                <th>Message</th>
                <th>Vehicle</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.id}</td>
                  <td><b>{r.type}</b></td>
                  <td>{r.scope}</td>
                  <td className="muted">{r.created}</td>
                  <td>{r.title}</td>
                  <td className="muted" style={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.message}>
                    {r.message}
                  </td>
                  <td className="muted">{r.vehicleId}</td>
                  <td className="muted" style={{ maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <button
                      style={{ padding: "6px 10px" }}
                      onClick={() => setSelected(r)}
                      title={r.payloadText}
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected ? (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(900px, 95vw)", maxHeight: "85vh", overflow: "auto" }}
          >
            <div className="topbar" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Notification #{selected.id}</h3>
                <div className="muted">{selected.type} • {selected.scope} • {selected.created}</div>
              </div>
              <button onClick={() => setSelected(null)}>Kapat</button>
            </div>

            <div className="muted" style={{ marginBottom: 8 }}>
              <b>Title:</b> {selected.title || "-"}
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>
              <b>Message:</b> {selected.message || "-"}
            </div>

            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{selected.payloadPretty}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}