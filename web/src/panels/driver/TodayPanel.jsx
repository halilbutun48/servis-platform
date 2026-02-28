import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";

function fmt(dt) {
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt ?? "-");
    return d.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return String(dt ?? "-");
  }
}

function isSameDay(a, b) {
  try {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  } catch {
    return false;
  }
}

export default function DriverTodayPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    if (!token) return;
    setErr("");
    try {
      const r = await api("/api/driver/shifts/open", { token });
      const list = Array.isArray(r?.items) ? r.items : (Array.isArray(r) ? r : []);
      setItems(list);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const now = useMemo(() => new Date(), []);
  const active = useMemo(() => items.find((x) => x.status === "ACTIVE") || null, [items]);
  const next = useMemo(() => {
    if (active) return null;
    // earliest APPROVED
    return items
      .filter((x) => x.status === "APPROVED")
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0] || null;
  }, [items, active]);

  const todayItems = useMemo(() => items.filter((x) => isSameDay(x.startAt, new Date())), [items]);
  const futureItems = useMemo(() => items.filter((x) => !isSameDay(x.startAt, new Date())), [items]);

  async function startShift(shiftId) {
    setBusyId(shiftId);
    setErr("");
    try {
      await api(`/api/driver/shifts/${shiftId}/start`, { method: "POST", token });
      navigate(`/driver/route?shift=${shiftId}`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  function openRoute(shiftId) {
    navigate(`/driver/route?shift=${shiftId}`);
  }

  function Card({ title, shift }) {
    if (!shift) return null;
    const stopsCount = Array.isArray(shift?.stops) ? shift.stops.length : 0;
    const pendingCount = Array.isArray(shift?.stops) ? shift.stops.filter((s) => s.state === "PENDING").length : 0;

    return (
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div className="title">{title}</div>
            <div className="muted">
              <b>Shift #{shift.id}</b> • {fmt(shift.startAt)} → {fmt(shift.endAt)} •{" "}
              <span className="pill" data-status={shift.status}>{shift.status}</span>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Durak: <b>{stopsCount}</b> • Kalan: <b>{pendingCount}</b> • Araç: <b>{shift?.vehicle?.plate || "-"}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {shift.status === "APPROVED" ? (
              <button type="button" disabled={busyId === shift.id} onClick={() => startShift(shift.id)} style={{ fontWeight: 900 }}>
                {busyId === shift.id ? "..." : "Göreve Başla"}
              </button>
            ) : null}
            <button type="button" onClick={() => openRoute(shift.id)}>
              Rota / Mini Harita
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h3>Driver • Bugün</h3>
        <div className="muted">En az tık: görev seç → başla → rota ekranında ilerle.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {active ? <Card title="Aktif Görev" shift={active} /> : null}
      {!active && next ? <Card title="Sıradaki Görev" shift={next} /> : null}

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Bugün ({todayItems.length})</h3>
          {todayItems.length ? (
            <table className="tbl" style={{ marginTop: 10, whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Başlangıç</th>
                  <th>Durum</th>
                  <th>Araç</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {todayItems.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>{fmt(s.startAt)}</td>
                    <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                    <td>{s?.vehicle?.plate || "-"}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.status === "APPROVED" ? (
                        <button type="button" className="btn sm" disabled={busyId === s.id} onClick={() => startShift(s.id)}>
                          Başla
                        </button>
                      ) : null}
                      <button type="button" className="btn sm" onClick={() => openRoute(s.id)}>
                        Rota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="muted">Bugün için görev yok.</div>
          )}
        </div>

        <div className="card">
          <h3>Yaklaşan ({futureItems.length})</h3>
          {futureItems.length ? (
            <table className="tbl" style={{ marginTop: 10, whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Başlangıç</th>
                  <th>Durum</th>
                  <th>Araç</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {futureItems.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td>{fmt(s.startAt)}</td>
                    <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                    <td>{s?.vehicle?.plate || "-"}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.status === "APPROVED" ? (
                        <button type="button" className="btn sm" disabled={busyId === s.id} onClick={() => startShift(s.id)}>
                          Başla
                        </button>
                      ) : null}
                      <button type="button" className="btn sm" onClick={() => openRoute(s.id)}>
                        Rota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="muted">Yaklaşan görev yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}
