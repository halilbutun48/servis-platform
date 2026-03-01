// web/src/panels/personel/LivePanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline, { pickNextStopByRemainingKmOrEta } from "../../components/StopTimeline";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


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
  const [myPos, setMyPos] = useState(null);
  const [geoErr, setGeoErr] = useState("");

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
  useAutoReload("vehicles", (detail) => {
    const m = detail?.payload?.msg;
    const ev = m?._event;

    if (ev === "vehicle:status") {
      const vid = Number(m?.vehicleId);
      const st = String(m?.status || "").toUpperCase();
      if (!Number.isFinite(vid) || !st) return;

      setMyShift((prev) => {
        if (!prev) return prev;
        const curVid = Number(prev?.vehicleId || prev?.vehicle?.id || 0);
        if (!curVid || curVid != vid) return prev;
        const v = prev.vehicle ? { ...prev.vehicle } : null;
        if (!v) return prev;
        v.gpsState = { ...(v.gpsState || {}), lastUiStatus: st };
        return { ...prev, vehicle: v };
      });
      return;
    }

    loadAll();
  });
  useAutoReload("eta", loadAll);

  // Best-effort: get person's location once (for nearest-stop suggestion)
  useEffect(() => {
    setGeoErr("");
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (e) => {
          setGeoErr(String(e?.message || e));
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 }
      );
    } catch (e) {
      setGeoErr(String(e?.message || e));
    }
  }, []);


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

  const recommended = useMemo(() => {
    if (!myPos || !Number.isFinite(myPos.lat) || !Number.isFinite(myPos.lng)) return null;
    let candidates = stops
      .map((s) => {
        const lat = Number(String(s?.lat ?? s?.location?.lat ?? "").replace(",", "."));
        const lng = Number(String(s?.lng ?? s?.location?.lng ?? "").replace(",", "."));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const distM = haversineMeters(myPos.lat, myPos.lng, lat, lng);
        return { stop: { ...s, lat, lng }, distM };
      })
      .filter(Boolean);

    // Prefer pickup-like stops if present
    const pick = candidates.filter((c) => {
      const t = String(c.stop?.type ?? c.stop?.kind ?? c.stop?.stopType ?? "").toUpperCase();
      return t.includes("PICK");
    });
    if (pick.length) candidates = pick;

    candidates.sort((a, b) => a.distM - b.distM);
    const best = candidates[0];
    if (!best) return null;
    if (best.distM > 1500) return null;
    return best;
  }, [stops, myPos]);


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
        {Number.isFinite(Number(nextStop?.etaMin)) ? (
          <span className="muted" style={{ marginLeft: 8 }}>ETA: <b>~{Math.round(Number(nextStop.etaMin))}dk</b></span>
        ) : null}
        {Number.isFinite(Number(nextStop?.remainingKm)) ? (
          <span className="muted" style={{ marginLeft: 8 }}>Kalan: <b>{Number(nextStop.remainingKm).toFixed(1)}km</b></span>
        ) : null}
      </>
    ) : (
      <span className="muted">-</span>
    )}
  </div>



  {recommended ? (
    <div className="muted" style={{ marginTop: 8 }}>
      Önerilen durak:{" "}
      <span className="pill" data-status="OK">{recommended.stop?.name || "Durak"}</span>
      <span className="muted" style={{ marginLeft: 8 }}><b>{Math.round(recommended.distM)}m</b></span>
      <button
        className="btn sm"
        style={{ marginLeft: 8 }}
        onClick={() => openNav(recommended.stop, { gpsLast: { lat: myPos.lat, lng: myPos.lng } })}
        title="Konumundan durağa navigasyon"
      >
        Navigasyon Aç
      </button>
    </div>
  ) : null}

  {!recommended && geoErr ? (
    <div className="muted" style={{ marginTop: 8 }}>Konum alınamadı: {geoErr}</div>
  ) : null}
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

