import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";

export default function DriverMapPanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [err, setErr] = useState("");

  async function loadAll() {
    setErr("");
    try {
      const v = await api("/api/vehicles", { token });
      setVehicles(Array.isArray(v) ? v : []);
      const s = await api("/api/shifts", { token });
      setShifts(Array.isArray(s) ? s : []);
      const firstVeh = Array.isArray(v) && v[0] ? v[0].id : null;
      setSelectedVehicleId((x) => x ?? firstVeh);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line
  useAutoReload("vehicles", loadAll);
  useAutoReload("shifts", loadAll);

  const activeShift = useMemo(() => {
    return shifts.find((s) => s.status === "ACTIVE" || s.status === "APPROVED") || null;
  }, [shifts]);

  const stops = useMemo(() => Array.isArray(activeShift?.stops) ? activeShift.stops : [], [activeShift]);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Driver • Harita</div>
          <div className="muted">Seçili araç + vardiya durakları</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <MapView
        vehicles={vehicles}
        stops={stops}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
        fitKey={`driver:${vehicles.length}:${stops.length}`}
        height="calc(100vh - 260px)"
      />
    </div>
  );
}
