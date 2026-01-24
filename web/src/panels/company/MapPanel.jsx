import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";

export default function CompanyMapPanel() {
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
      if (selectedVehicleId && !items.some((v) => v.id === selectedVehicleId)) setSelectedVehicleId(null);
      if (!selectedVehicleId && items.length) setSelectedVehicleId(items[0].id);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", load);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Company • Canlı Harita</div>
          <div className="muted">Onaylı/aktif vardiyalardaki araçlar</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <MapView
        vehicles={vehicles}
        stops={[]}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
        fitKey={`company:${vehicles.length}`}
        height="calc(100vh - 260px)"
      />
    </div>
  );
}
