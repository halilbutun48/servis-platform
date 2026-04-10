// web/src/panels/personel/LivePanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import StopTimeline from "../../components/StopTimeline";
import { pickNextStopByRemainingKmOrEta } from "../../components/stopTimelineUtils";
import { ageSecFromAt, uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

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

function toNum(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function gpsAtIso(v) {
  return v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.createdAt || v?.gpsLast?.updatedAt || null;
}

function gpsAgeLabel(v) {
  const age = ageSecFromAt(gpsAtIso(v));
  if (age == null) return "-";
  if (age < 60) return `${age}s`;
  if (age < 3600) return `${Math.floor(age / 60)}dk`;
  return `${Math.floor(age / 3600)}sa`;
}

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function stopCoord(stop) {
  const lat = toNum(stop?.lat ?? stop?.location?.lat);
  const lng = toNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function gpsCoord(v) {
  const lat = toNum(v?.gpsLast?.lat);
  const lng = toNum(v?.gpsLast?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function focusStop(stop) {
  const c = stopCoord(stop);
  if (!c) return;
  window.dispatchEvent(new CustomEvent("map:focus", { detail: { lat: c.lat, lng: c.lng, zoom: 17 } }));
}

function openNav(stop, originVehicle) {
  const sc = stopCoord(stop);
  if (!sc) return;

  const vc = gpsCoord(originVehicle);
  const dest = `${sc.lat},${sc.lng}`;
  const url = vc
    ? `https://www.google.com/maps/dir/?api=1&origin=${vc.lat},${vc.lng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  window.open(url, "_blank", "noopener,noreferrer");
}

function isReachedStop(s) {
  const st = String(s?.status || s?.state || "").toUpperCase();
  if (st === "REACHED" || st === "DONE" || st === "SKIPPED") return true;
  if (Boolean(s?.reachedAt) || Boolean(s?.reached)) return true;
  return false;
}

function normalizeStop(s, i) {
  const order = s?.order ?? (i + 1);
  const id = s?.id ?? `${order}`;
  const name = s?.name ?? s?.title ?? `Durak ${order}`;
  const lat = s?.lat ?? s?.location?.lat;
  const lng = s?.lng ?? s?.location?.lng;
  const statusRaw = s?.status || s?.state || (Boolean(s?.reachedAt) || Boolean(s?.reached) ? "REACHED" : "");
  const status = statusRaw ? String(statusRaw).toUpperCase() : "";
  return { ...s, id, order, name, lat, lng, status };
}

function etaQualityTone(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (["OFFLINE_GPS", "STALE_GPS", "SKIP_PRESENT", "DONE_WITH_SKIPS"].includes(q)) return "WARN";
  if (q === "DONE") return "OK";
  return "LIVE";
}

function etaQualityText(eta) {
  const q = String(eta?.routeQuality || "").toUpperCase();
  if (q === "OFFLINE_GPS") return "GPS kapalÄ± veya Ã§ok eski";
  if (q === "STALE_GPS") return "GPS gecikmeli";
  if (q === "SKIP_PRESENT") return "Atlanan durak var";
  if (q === "DONE_WITH_SKIPS") return "Rota bitti, atlanan durak var";
  if (q === "DONE") return "Rota tamamlandÄ±";
  if (q === "NO_SHIFT") return "Aktif rota yok";
  return String(eta?.progressLabel || "Rota ilerliyor");
}

function nextActionText(eta) {
  const act = String(eta?.nextAction || "").toUpperCase();
  if (act === "CONTACT_ROOM") return "Rota tamamlandÄ±; atlanan durak iÃ§in oda ile gÃ¶rÃ¼ÅŸÃ¼n.";
  if (act === "WAIT_GPS_UPDATE") return "GPS verisi gÃ¼ncellenene kadar kÄ±sa sÃ¼re bekleyin.";
  if (act === "NO_ACTIVE_ROUTE") return "Åu an aktif rota gÃ¶rÃ¼nmÃ¼yor.";
  return "";
}

function etaMinGuess(vehicle, stop) {
  if (!vehicle || !stop) return null;

  const em = toNum(stop?.etaMin);
  if (em != null) return Math.max(0, Math.round(em));

  const km = toNum(stop?.remainingKm);
  if (km != null) return Math.max(1, Math.round((km / 35) * 60));

  const vc = gpsCoord(vehicle);
  const sc = stopCoord(stop);
  if (vc && sc) {
    // rough: haversine / 35 km/h
    const km2 = haversineMeters(vc.lat, vc.lng, sc.lat, sc.lng) / 1000;
    return Math.max(1, Math.round((km2 / 35) * 60));
  }

  return null;
}

export default function PersonelLivePanel() {
  const { token } = useSession();

  const [myShift, setMyShift] = useState(null);
  const [eta, setEta] = useState(null);
  const [err, setErr] = useState("");
  const [myPos, setMyPos] = useState(null);
  const [geoErr, setGeoErr] = useState("");
  const [selectedStopId, setSelectedStopId] = useState(null);

  async function loadMyShift() {
    setErr("");
    try {
      const r = await api("/api/shifts/my", { token });
      const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
      const s = items[0] || null;
      setMyShift(s);
      return s;
    } catch (e) {
      setMyShift(null);
      setErr(String(e?.message || e));
      return null;
    }
  }

  async function loadEta(vid, shiftId) {
    if (!vid) return;
    try {
      const qs = shiftId ? "?shiftId=" + encodeURIComponent(String(shiftId)) : "";
      const r = await api("/api/eta/vehicle/" + encodeURIComponent(String(vid)) + qs, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadAll() {
    const s = await loadMyShift();
    const vid = s?.vehicleId || s?.vehicle?.id || null;
    await loadEta(vid, s?.id || null);
  }

  useEffect(() => { queueMicrotask(() => { loadAll(); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useAutoReload("shifts", loadAll);
  useAutoReload("vehicles", loadAll);
  useAutoReload("eta", loadAll);

  // Best-effort: get person's location once (for nearest-stop suggestion)
  useEffect(() => { queueMicrotask(() => { setGeoErr(""); }); if (typeof navigator === "undefined" || !navigator.geolocation) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy });
        },
        (e) => {
          queueMicrotask(() => setGeoErr(String(e?.message || e)));
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8000 }
      );
    } catch (e) {
      queueMicrotask(() => setGeoErr(String(e?.message || e)));
    }
  }, []);

  const baseVehicle = myShift?.vehicle || null;

  const vehicle = useMemo(() => {
    if (!baseVehicle) return null;

    // /api/shifts/my payload'Ä± bazen gpsLast iÃ§ermeyebilir; ETA payload'Ä±ndan Ã¶dÃ¼nÃ§ al.
    if (baseVehicle?.gpsLast?.at || baseVehicle?.gpsLast?.ts || !eta?.last) return baseVehicle;

    return {
      ...baseVehicle,
      gpsLast: {
        ...(baseVehicle.gpsLast || {}),
        lat: eta.last?.lat,
        lng: eta.last?.lng,
        at: eta.last?.at,
        speed: eta.last?.speed } };
  }, [baseVehicle, eta]);

  const vehicles = useMemo(() => (vehicle ? [vehicle] : []), [vehicle]);

  const stops = useMemo(() => {
    const baseAll = Array.isArray(myShift?.stops) ? myShift.stops : [];
    const etaStops = Array.isArray(eta?.stops) ? eta.stops : [];

    const etaById = new Map(etaStops.map((s) => [String(s?.id ?? ""), s]));
    const etaByOrder = new Map(etaStops.map((s) => [String(s?.order ?? ""), s]));

    if (baseAll.length) {
      return baseAll.map((s, i) => {
        const n = normalizeStop(s, i);
        const e = etaById.get(String(n.id)) || etaByOrder.get(String(n.order));
        if (e) {
          const km = toNum(e?.remainingKm);
          const em = toNum(e?.etaMin);
          if (km != null) n.remainingKm = km;
          if (em != null) n.etaMin = em;
        }
        return n;
      });
    }

    // fallback: ETA list (pending only)
    return etaStops.map((s, i) => normalizeStop(s, i));
  }, [eta, myShift]);

  const nextStop = useMemo(() => {
    const picked = pickNextStopByRemainingKmOrEta(stops);
    if (picked) return picked;
    return stops.find((s) => !isReachedStop(s)) || null;
  }, [stops]);
  const nextStopId = nextStop?.id ?? null;

  const reachedCount = useMemo(() => stops.filter((s) => isReachedStop(s)).length, [stops]);
  const totalStops = stops.length;
  const pct = totalStops ? Math.min(100, Math.max(0, Math.round((reachedCount / totalStops) * 100))) : 0;

  const ui = vehicle ? uiStatusFromVehicle(vehicle) : "-";
  const pillKey = pillKeyFromUi(ui);
  const nextEtaMin = useMemo(() => etaMinGuess(vehicle, nextStop), [vehicle, nextStop]);
  const remainingStopsCount = Number(eta?.remainingStopsCount || 0);
  const remainingRouteEtaMin = Number.isFinite(Number(eta?.remainingRouteEtaMin)) ? Number(eta.remainingRouteEtaMin) : null;
  const remainingRouteKm = Number.isFinite(Number(eta?.remainingRouteKm)) ? Number(eta.remainingRouteKm) : null;
  const skippedStopsCount = Number(eta?.skippedStopsCount || 0);
  const skippedStops = Array.isArray(eta?.skippedStops) ? eta.skippedStops : [];
  const routeQualityText = etaQualityText(eta);
  const routeQualityTone = etaQualityTone(eta);
  const nextActionTextValue = nextActionText(eta);

  const recommended = useMemo(() => {
    if (!myPos || !Number.isFinite(myPos.lat) || !Number.isFinite(myPos.lng)) return null;

    let candidates = stops
      .map((s) => {
        const c = stopCoord(s);
        if (!c) return null;
        const distM = haversineMeters(myPos.lat, myPos.lng, c.lat, c.lng);
        return { stop: { ...s, lat: c.lat, lng: c.lng }, distM };
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

  function fitAll() {
    try {
      window.dispatchEvent(new Event("map:fitAll"));
    } catch { /* no-op */ }
  }

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Personel â€¢ CanlÄ± Harita</div>
          <div className="muted">Sana ait durak + araÃ§ yaklaÅŸÄ±mÄ± + ETA + navigasyon</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "min(520px, calc(100vh - 420px))" }}>
        <div className="card mapAsideCard" style={{ height: "calc(var(--mapH) + 285px)" }}>
          <div className="title" style={{ fontSize: 16 }}>
            Åu anki durum
          </div>

          {myShift ? (
            <div className="col" style={{ gap: 6, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>Shift #{myShift.id}</b>
                <span className="pill" data-status={String(myShift.status || "").toUpperCase()}>
                  {String(myShift.status || "").toUpperCase()}
                </span>
              </div>

              <div className="muted">Room: {myShift.room?.name || (myShift.roomId ? `#${myShift.roomId}` : "-")}</div>

              <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span>
                  AraÃ§: {vehicle?.plate || (myShift.vehicleId ? `#${myShift.vehicleId}` : "-")}
                </span>
                {vehicle ? (
                  <>
                    <span className="pill" data-status={pillKey} title={`GPS: ${ui}`}>
                      {ui}
                    </span>
                    <span className="muted">Son GPS:</span>
                    <span className="pill">{gpsAgeLabel(vehicle)}</span>
                  </>
                ) : null}
              </div>

              <div className="muted">SÃ¼rÃ¼cÃ¼: {myShift.driver?.fullName || (myShift.driverId ? `#${myShift.driverId}` : "-")}</div>
              <div className="muted">Start: {fmtTR(myShift.startAt)} â€¢ End: {fmtTR(myShift.endAt)}</div>

              {totalStops ? (
                <>
                  <div className="muted">
                    Ä°lerleme: {pct}% (reached:{reachedCount}/{totalStops})
                    {nextStop?.name ? ` â€¢ SÄ±radaki: ${nextStop.name}` : ""}
                    {nextStop?.name && nextEtaMin != null ? ` â€¢ ETA: ${nextEtaMin}dk` : ""}{remainingStopsCount ? ` â€¢ Kalan durak: ${remainingStopsCount}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="pill" data-status={routeQualityTone}>{routeQualityText}</span>
                    {skippedStopsCount ? <span className="muted">Atlanan durak: <b>{skippedStopsCount}</b></span> : null}
                  </div>
                  {nextActionTextValue ? <div className="muted">{nextActionTextValue}</div> : null}
                </>
              ) : (
                <div className="muted">Durak bilgisi yok.</div>
              )}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              HenÃ¼z eÅŸleÅŸmiÅŸ bir servis yok.
            </div>
          )}
        </div>

        <div>
          <div className="card" data-role="personelSelected" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div className="title" style={{ fontSize: 16 }}>
                  SeÃ§ili AraÃ§
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {vehicle?.plate || "-"} â€¢ Shift #{myShift?.id || "-"} â€¢ {String(myShift?.status || "-").toUpperCase()}
                </div>
              </div>
              <button className="btn sm" onClick={fitAll}>
                TÃ¼mÃ¼nÃ¼ GÃ¶ster
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {vehicle ? (
                <>
                  <span className="muted">GPS:</span>
                  <span className="pill" data-status={pillKeyFromUi(uiStatusFromVehicle(vehicle))}>
                    {uiStatusFromVehicle(vehicle)}
                  </span>
                  <span className="muted">Son GPS:</span>
                  <span className="pill">{gpsAgeLabel(vehicle)}</span>
                </>
              ) : (
                <span className="muted">AraÃ§ yok.</span>
              )}

              {nextStop?.name ? (
                <>
                  <span className="muted">SÄ±radaki:</span>
                  <span className="pill" data-status="NEXT">{nextStop.name}</span>
                  <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openNav(nextStop, vehicle)}>
                    Navigasyon AÃ§
                  </button>
                  {nextEtaMin != null ? (
                    <span className="muted">
                      ETA: <b>{nextEtaMin}dk</b>
                    </span>
                  ) : null}
                  {toNum(nextStop?.remainingKm) != null ? (
                    <span className="muted">
                      Kalan: <b>{toNum(nextStop.remainingKm).toFixed(1)}km</b>
                    </span>
                  ) : null}
                  {remainingRouteEtaMin != null ? (
                    <span className="muted">
                      Rota ETA: <b>{remainingRouteEtaMin}dk</b>
                    </span>
                  ) : null}
                  {remainingRouteKm != null ? (
                    <span className="muted">
                      Rota km: <b>{remainingRouteKm.toFixed(1)}km</b>
                    </span>
                  ) : null}
                  <span className="pill" data-status={routeQualityTone}>{routeQualityText}</span>
                  {skippedStopsCount ? (
                    <span className="muted">
                      Atlanan: <b>{skippedStopsCount}</b>
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="muted">SÄ±radaki durak yok.</span>
              )}
            </div>

            {skippedStops.length ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Atlananlar: <b>{skippedStops.map((s) => s?.name || `Durak ${s?.order || ""}`).join(", ")}</b>
              </div>
            ) : null}

            {recommended ? (
              <div className="muted" style={{ marginTop: 8 }}>
                Ã–nerilen durak:{" "}
                <span className="pill" data-status="OK">{recommended.stop?.name || "Durak"}</span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  <b>{Math.round(recommended.distM)}m</b>
                </span>
                <button
                  className="btn sm"
                  style={{ marginLeft: 8 }}
                  onClick={() => openNav(recommended.stop, { gpsLast: { lat: myPos?.lat, lng: myPos?.lng } })}
                  title="Konumundan duraÄŸa navigasyon"
                >
                  Navigasyon AÃ§
                </button>
              </div>
            ) : null}

            {!recommended && geoErr ? <div className="muted" style={{ marginTop: 8 }}>Konum alÄ±namadÄ±: {geoErr}</div> : null}

            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Mini Timeline</div>
              <StopTimeline
                stops={stops}
                nextStopId={nextStopId}
                selectedStopId={selectedStopId}
                compact
                onSelect={(s) => {
                  setSelectedStopId(s?.id ?? null);
                  focusStop(s);
                }}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 10 }}>
            <div className="title" style={{ fontSize: 16 }}>Harita Ã–nizleme</div>
            <div className="muted" style={{ fontSize: 12 }}>SeÃ§ili araÃ§ + (varsa) duraklar</div>
          </div>

          <MapView
            vehicles={vehicles}
            stops={stops}
            selectedVehicleId={vehicle?.id ?? null}
            onSelectVehicle={() => {}}
            fitKey={`personel-live:${vehicle?.id ?? "none"}:${stops.length}:${gpsAtIso(vehicle) || ""}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}





