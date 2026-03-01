// web/src/panels/personel/LivePanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline, { pickNextStopByRemainingKmOrEta } from "../../components/StopTimeline";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function focusStop(stop) {
  const lat = Number(String(stop?.lat ?? stop?.location?.lat ?? "").replace(",", "."));
  const lng = Number(String(stop?.lng ?? stop?.location?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat, lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const dLat = Number(String(stop?.lat ?? stop?.location?.lat ?? "").replace(",", "."));
  const dLng = Number(String(stop?.lng ?? stop?.location?.lng ?? "").replace(",", "."));
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return;

  const oLat = Number(String(originVehicle?.gpsLast?.lat ?? "").replace(",", "."));
  const oLng = Number(String(originVehicle?.gpsLast?.lng ?? "").replace(",", "."));
  const hasOrigin = Number.isFinite(oLat) && Number.isFinite(oLng);

  const dest = `${dLat},${dLng}`;
  const url = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}

export default function PersonelLivePanel() {
  const { token } = useSession();

  const [myShift, setMyShift] = useState(null);
  const [eta, setEta] = useState(null);
  const [err, setErr] = useState("");

  async function loadMyShift() {
    setErr("");
    try {
      const r = await api("/api/shifts/my", { token });
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      const s = items[0] || null;
      setMyShift(s);
      return s?.vehicleId || s?.vehicle?.id || null;
    } catch (e) {
      setMyShift(null);
      setErr(String(e?.message || e));
      return null;
    }
  }

  async function loadEta(vid) {
    if (!vid) return;
    try {
      const r = await api(`/api/eta/vehicle/${encodeURIComponent(String(vid))}`, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadAll() {
    const vid = await loadMyShift();
    await loadEta(vid);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useAutoReload("shifts", loadAll);
  useAutoReload("vehicles", loadAll);
  useAutoReload("eta", loadAll);

  const vehicle = myShift?.vehicle || null;
  const vehicles = useMemo(() => (vehicle ? [vehicle] : []), [vehicle]);

  const stops = useMemo(() => {
    const arr = Array.isArray(eta?.items?.[0]?.stops) ? eta.items[0].stops : [];
    if (arr.length) return arr.map((s, i) => ({ ...s, order: s?.order ?? (i + 1), name: s?.name ?? s?.title ?? `Durak ${i + 1}`, lat: s?.lat ?? s?.location?.lat, lng: s?.lng ?? s?.location?.lng }));
    const st2 = Array.isArray(myShift?.stops) ? myShift.stops : [];
    return st2.map((s, i) => ({ ...s, order: s?.order ?? (i + 1), name: s?.name ?? s?.title ?? `Durak ${i + 1}`, lat: s?.lat ?? s?.location?.lat, lng: s?.lng ?? s?.location?.lng }));
  }, [eta, myShift]);

  const nextStop = useMemo(() => pickNextStopByRemainingKmOrEta(stops), [stops]);
  const nextStopId = nextStop?.id ?? null;

  const ui = vehicle ? uiStatusFromVehicle(vehicle) : "-";
  const pillKey = pillKeyFromUi(ui);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Personel • Canlı Harita</div>
          <div className="muted">Sana atanmış araç + (varsa) duraklar/ETA</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(520px, calc(100vh - 420px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 250px)" }}>
          <div className="title" style={{ fontSize: 16 }}>Şu anki durum</div>

          {myShift ? (
            <div className="col" style={{ gap: 6, marginTop: 10 }}>
              <div>
                <b>Shift #{myShift.id}</b> — <span className="pill" data-status={String(myShift.status || "").toUpperCase()}>{String(myShift.status || "").toUpperCase()}</span>
              </div>
              <div className="muted">Room: {myShift.room?.name || (myShift.roomId ? `#${myShift.roomId}` : "-")}</div>
              <div className="muted">
                Araç: {vehicle?.plate || (myShift.vehicleId ? `#${myShift.vehicleId}` : "-")}{" "}
                {vehicle ? <span className="pill" data-status={pillKey} style={{ marginLeft: 8 }}>{ui}</span> : null}
              </div>
              <div className="muted">Sürücü: {myShift.driver?.fullName || (myShift.driverId ? `#${myShift.driverId}` : "-")}</div>
              <div className="muted">Start: {fmtTR(myShift.startAt)} • End: {fmtTR(myShift.endAt)}</div>

              {null}

              
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>Henüz eşleşmiş bir servis yok.</div>
          )}
        </div>

        <div>
<div className="card" data-role="personelMapHeader" style={{ marginBottom: 10 }}>
  <div className="muted">
    Sıradaki:{" "}
    {nextStop?.name ? (
      <>
        <span className="pill" data-status="NEXT">{nextStop.name}</span>
        <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, vehicle)}>Navigasyon Aç</button>
      </>
    ) : (
      <span className="muted">-</span>
    )}
  </div>

  <div style={{ marginTop: 10 }}>
    <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
    <StopTimeline stops={stops} nextStopId={nextStopId} compact onSelect={(s) => focusStop(s)} />
  </div>
</div>

          <MapView
            vehicles={vehicles}
            stops={stops}
            selectedVehicleId={vehicle?.id ?? null}
            onSelectVehicle={() => {}}
            fitKey={`personel-live:${vehicle?.id ?? "none"}:${stops.length}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}

