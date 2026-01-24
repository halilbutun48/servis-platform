import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function NotificationsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api("/api/notifications/my", { token });
      setItems(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("notifications", load);

  return (
    <div>
      <div className="card">
        <h3>Notifications</h3>
        <div className="muted">Son 100 kayıt</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Created</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td>{n.id}</td>
                <td>{n.type}</td>
                <td>{n.scope}</td>
                <td className="muted">{String(n.createdAt)}</td>
                <td className="muted" style={{ maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.payloadJson}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
