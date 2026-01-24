import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function VehiclesPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [speedLimitKmh, setSpeedLimitKmh] = useState(80);
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState(""); // ISO string

  async function load() {
    setErr("");
    try {
      const r = await api("/api/vehicles", { token });
      setItems(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", load);

  async function createVehicle(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        plate: plate.trim(),
        capacity: Number(capacity),
        speedLimitKmh: Number(speedLimitKmh),
      };
      if (nextMaintenanceAt) body.nextMaintenanceAt = new Date(nextMaintenanceAt).toISOString();
      await api("/api/vehicles", { method: "POST", token, body });
      setPlate("");
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
        <h3>Vehicles</h3>
        <div className="muted">ROOM: araç ekle/listele</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Araç</h3>
        <form onSubmit={createVehicle} className="grid">
          <div className="col">
            <label className="muted">Plaka</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="34 ABC 123" />
          </div>
          <div className="col">
            <label className="muted">Kapasite</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="col">
            <label className="muted">Hız limiti (km/h)</label>
            <input type="number" value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} />
          </div>
          <div className="col">
            <label className="muted">Bakım tarihi</label>
            <input type="datetime-local" value={nextMaintenanceAt} onChange={(e) => setNextMaintenanceAt(e.target.value)} />
          </div>
          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">{busy ? "..." : "Ekle"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Liste</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Plaka</th>
              <th>Status</th>
              <th>Kapasite</th>
              <th>Limit</th>
              <th>Bakım</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{v.plate}</td>
                <td><span className="pill" data-status={v.status}>{v.status}</span></td>
                <td>{v.capacity}</td>
                <td>{v.speedLimitKmh}</td>
                <td className="muted">{v.nextMaintenanceAt ? String(v.nextMaintenanceAt) : "-"}</td>
                <td className="muted">
                  {v.gpsLast ? `${v.gpsLast.lat.toFixed(4)}, ${v.gpsLast.lng.toFixed(4)} • ${v.gpsLast.speed ?? "-"} km/h • ${String(v.gpsLast.status)}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
