import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { openNextStopNavigation, openFullRouteNavigation, routeStats } from "../../utils/navigation";
import { nowIsoTR } from "../../utils/time";


function isReached(stop) {
  const st = String(stop?.status || stop?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || st === "SKIPPED" || Boolean(stop?.reachedAt);
}

function firstPendingStop(stops) {
  return (Array.isArray(stops) ? stops : []).find((s) => s && !isReached(s)) || null;
}

function focusStop(stop) {
  const lat = Number(stop?.lat);
  const lng = Number(stop?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

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
      if (typeof m.at === "string" && m.at.trim()) {
        const dt = new Date(m.at);
        if (!Number.isNaN(dt.getTime())) atIso = m.at;
      }
    } catch {}
    if (!atIso) atIso = nowIsoTR();
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
  const nextStop = useMemo(() => firstPendingStop(stops), [stops]);
  const stats = useMemo(() => routeStats(stops), [stops]);

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

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>Canlı rota özeti</div>
            <div className="muted">Tüm duraklar rota sırası ile, sıradaki durak highlight, canlı araç takibi</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill">Toplam: {stats.total}</span>
            <span className="pill" data-status="OK">Tamamlanan: {stats.completed}</span>
            <span className="pill" data-status="REQUESTED">Kalan: {stats.remaining}</span>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {nextStop?.name ? (
            <>
              <span className="muted">Sıradaki:</span>
              <span className="pill" data-status="NEXT">{nextStop.name}</span>
              <button type="button" onClick={() => openNextStopNavigation(nextStop, vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null)}>Sonraki Durağa Navigasyon</button>
              <button type="button" onClick={() => openFullRouteNavigation(stops, vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null)}>Tam Rotayı Dış Navigasyonda Aç</button>
            </>
          ) : (
            <span className="muted">Sıradaki durak yok.</span>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Adım adım takip</div>
          <StopTimeline stops={stops} nextStopId={nextStop?.id ?? null} compact={false} onSelect={(s) => focusStop(s)} />
        </div>
      </div>

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