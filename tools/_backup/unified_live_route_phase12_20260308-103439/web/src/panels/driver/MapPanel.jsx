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
    if (!token) return;
    setErr("");
    try {
      const v = await api("/api/live/vehicles", { token });
      setVehicles(Array.isArray(v) ? v : []);

      // ✅ driver için doğru endpoint
      const s = await api("/api/shifts/my", { token });
      setShifts(Array.isArray(s) ? s : (s?.items ?? []));

      const firstVeh = Array.isArray(v) && v[0] ? v[0].id : null;
      setSelectedVehicleId((x) => x ?? firstVeh);
    } catch (e) {
      setErr(String(e?.message || e));
      setShifts([]);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // gps:update => HTTP reload yok; sadece state patch
  useAutoReload("gps", (detail) => {
    const m = detail?.payload?.msg;
    if (!m || m._event !== "gps:update") return;

    const vid = Number(m.vehicleId);
    const lat = Number(m.lat);
    const lng = Number(m.lng);
    let atIso = null;
    try {
      if (m.at) {
        const dt = new Date(m.at);
        if (!Number.isNaN(dt.getTime())) atIso = dt.toISOString();
      }
    } catch {}
    const st = String(m.status || "").toUpperCase();

    if (!Number.isFinite(vid) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setVehicles((prev) =>
      (Array.isArray(prev) ? prev : []).map((v) => {
        if (Number(v?.id) !== vid) return v;
        return {
          ...v,
          gpsLast: { ...(v?.gpsLast || {}), lat, lng, at: atIso || v?.gpsLast?.at || null },
          gpsState: { ...(v?.gpsState || {}), lastUiStatus: st || v?.gpsState?.lastUiStatus || null },
        };
      })
    );
  });

  // vehicle:status gibi GPS kaynaklı spam'lerde full reload yapma
  useAutoReload("vehicles", (detail) => {
    const ev = detail?.payload?.msg?._event;
    if (ev === "vehicle:status") {
      const m = detail?.payload?.msg;
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid)) return;
      setVehicles((prev) =>
        (Array.isArray(prev) ? prev : []).map((v) => {
          if (Number(v?.id) !== vid) return v;
          return { ...v, gpsState: { ...(v?.gpsState || {}), lastUiStatus: st || v?.gpsState?.lastUiStatus || null } };
        })
      );
      return;
    }
    loadAll();
  });
  useAutoReload("shifts", loadAll);

  // fallback polling (WS koparsa)
  useEffect(() => {
    if (!token) return;
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedVehicleId]);

  const activeShift = useMemo(() => {
    return shifts.find((s) => s.status === "ACTIVE" || s.status === "APPROVED") || null;
  }, [shifts]);

  const stops = useMemo(
    () => (Array.isArray(activeShift?.stops) ? activeShift.stops : []),
    [activeShift]
  );

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Driver • Harita</div>
          <div className="muted">Seçili araç + vardiya durakları</div>
        </div>
        <button onClick={loadAll} style={{ padding: "8px 12px" }}>
          Yenile
        </button>
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