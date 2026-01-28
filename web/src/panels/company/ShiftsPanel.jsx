import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function CompanyShiftsPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [roomId, setRoomId] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api("/api/shifts", { token });
      setItems(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("shifts", load);

  async function createShift(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        roomId: Number(roomId),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      };
      await api("/api/shifts", { method: "POST", token, body });
      setStartAt("");
      setEndAt("");
      await load();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (COMPANY)</h3>
        <div className="muted">Shift request → Room approve akışını burada görürsün.</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Vardiya Talebi</h3>
        <form onSubmit={createShift} className="grid">
          <div className="col">
            <label className="muted">Room ID</label>
            <input type="number" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          </div>
          <div className="col">
            <label className="muted">Start</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div className="col">
            <label className="muted">End</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">{busy ? "..." : "Request"}</button>
          </div>
        </form>
        <div className="muted" style={{ marginTop: 8 }}>
          Not: Şimdilik Room listesi endpoint'i olmadığı için Room ID'yi manuel giriyoruz.
        </div>
      </div>

      <div className="card">
        <h3>Liste</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Room</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                <td className="muted">{s.roomId}</td>
                <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
                <td className="muted">{String(s.startAt)}</td>
                <td className="muted">{String(s.endAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
