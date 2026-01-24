import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function MyRidePanel() {
  const { token } = useSession();
  const [shifts, setShifts] = useState([]);
  const [err, setErr] = useState("");
  const [eta, setEta] = useState(null);

  async function load() {
    setErr("");
    try {
      const r = await api("/api/shifts/my", { token });
      setShifts(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("shifts", load);
  useAutoReload("vehicles", load);
  useAutoReload("eta", load);

  async function loadEtaForVehicle(vehicleId) {
    setErr("");
    try {
      const r = await api(`/api/eta/vehicle/${vehicleId}`, { token });
      setEta(r);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  const active = shifts[0] || null;
  const vehicle = active?.vehicle || null;

  return (
    <div>
      <div className="card">
        <h3>My Ride</h3>
        <div className="muted">PERSONEL: atanmış vardiya/araç + ETA (yaklaşık)</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Aktif Vardiya</h3>
        {active ? (
          <div className="col">
            <div>
              <b>Shift #{active.id}</b> — <span className="pill" data-status={active.status}>{active.status}</span>
            </div>
            <div className="muted">Araç: {vehicle ? vehicle.plate : "-"}</div>
            {vehicle?.gpsLast ? (
              <div className="muted">Konum: {vehicle.gpsLast.lat}, {vehicle.gpsLast.lng} • hız {vehicle.gpsLast.speed ?? "-"}</div>
            ) : (
              <div className="muted">GPS yok</div>
            )}

            {vehicle ? (
              <button onClick={() => loadEtaForVehicle(vehicle.id)}>ETA / Duraklar</button>
            ) : null}
          </div>
        ) : (
          <div className="muted">Aktif vardiya yok.</div>
        )}
      </div>

      {eta ? (
        <div className="card">
          <h3>ETA (approx)</h3>
          <div className="muted">vehicleId: {eta.vehicleId}</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Stop</th>
                <th>Km</th>
                <th>ETA(dk)</th>
              </tr>
            </thead>
            <tbody>
              {(eta.items?.[0]?.stops || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.remainingKm}</td>
                  <td>{s.etaMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted" style={{ marginTop: 8 }}>
            Not: Bu ETA haversine + speed üzerinden yaklaşık hesap.
          </div>
        </div>
      ) : null}

      <div className="card">
        <h3>Shifts List</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Vehicle</th>
              <th>Stops</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                <td className="muted">{(s.stops || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
