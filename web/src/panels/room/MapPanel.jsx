import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";

export default function RoomMapPanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api("/api/vehicles", { token });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);
      // keep selection valid
      if (selectedVehicleId && !items.some((v) => v.id === selectedVehicleId)) setSelectedVehicleId(null);
      if (!selectedVehicleId && items.length) setSelectedVehicleId(items[0].id);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", load);

  const selected = useMemo(() => vehicles.find((v) => v.id === selectedVehicleId) || null, [vehicles, selectedVehicleId]);
  const stops = useMemo(() => {
    // pick latest approved/active shift stops if present
    const s = selected?.shifts?.[0];
    return Array.isArray(s?.stops) ? s.stops : [];
  }, [selected]);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Room • Canlı Harita</div>
          <div className="muted">Araçlar / GPS last / (varsa) aktif vardiya durakları</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ['--mapH']: 'calc(100vh - 260px)' }}>
        <div className="card mapAsideCard">
          <div className="title" style={{ fontSize: 16 }}>Araçlar</div>
          <div className="muted" style={{ marginBottom: 10 }}>Marker'a tıkla veya listeden seç.</div>
          <div className="col mapAsideList">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={v.id === selectedVehicleId ? "navItem active" : "navItem"}
                style={{ justifyContent: "space-between" }}
              >
                <span>{v.plate}</span>
                <span className="pill" data-status={v.status}>{v.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <MapView
            vehicles={vehicles}
            stops={stops}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            fitKey={`room:${vehicles.length}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}
